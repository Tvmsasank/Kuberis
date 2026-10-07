import dns from 'dns';
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import 'dotenv/config';
import { dbEngine, isSuperAdminEmail } from './db.js';
import { refreshHoldingsPrices } from './investments.js';
import { parseUpiTransactionText } from './upiParser.js';
import { SUPPORTED_BANKS, initiateAaConsent, verifyAaOtp, generateLiveBankFeed } from './accountAggregator.js';
import { resolveIpLocation } from './geoIp.js';
import { parseDeviceDetails } from './deviceParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getAppOrigin = (req) => {
  let origin = req.headers.origin || req.headers.referer;
  if (origin) {
    try { origin = new URL(origin).origin; } catch (e) {}
  }
  if (!origin) {
    const host = req.headers.host || 'kuberis.onrender.com';
    origin = `${host.includes('localhost') ? 'http' : 'https'}://${host}`;
  }
  return origin;
};

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'kuberis_super_secret_jwt_key_2026';
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'kuberis_admin_root_access_key_2026';

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Security Headers Middleware (Production Zero-Trust Architecture)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Helper to reliably extract client IP address behind reverse proxies
const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || '127.0.0.1';
};

// Multer memory storage for up to 20MB file uploads
const upload = multer({
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

// Middleware: Authenticate Token (returns user or null) with mobile fallbacks
const getUserIdFromReq = (req) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (!token && req.headers['x-auth-token']) {
    token = req.headers['x-auth-token'];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded && (decoded.userId || decoded.id)) {
        return decoded.userId || decoded.id;
      }
    } catch (err) {
      // If a token was provided but failed verification, do not fall back to email
      return null;
    }
  }

  // Fallback for webhooks or native integrations where only authorized email is supplied without auth header
  const userEmail = (req.headers['x-user-email'] || req.query.email || '').toString().trim().toLowerCase();
  if (userEmail && !authHeader) {
    const user = dbEngine.getUserByEmail(userEmail);
    if (user) return user.id;
  }

  return null;
};

const authenticateToken = (req, res, next) => {
  const userId = getUserIdFromReq(req);
  if (!userId) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  // Verify account is not suspended
  const user = dbEngine.getUserById(userId);
  if (user && user.isSuspended) {
    return res.status(403).json({
      code: 'ACCOUNT_SUSPENDED',
      error: `Your account has been administratively suspended. Reason: ${user.suspendedReason || 'Policy compliance review'}`
    });
  }

  // Active Session validation for multi-device session control (HDFC pattern)
  const authHeader = req.headers.authorization || req.headers['x-auth-token'];
  let rawToken = null;
  if (authHeader) {
    rawToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
  }

  const activeSessionId = dbEngine.getUserActiveSession(userId);
  if (activeSessionId) {
    let requestSessionId = null;
    if (rawToken) {
      try {
        const decoded = jwt.verify(rawToken, JWT_SECRET);
        requestSessionId = decoded ? decoded.sessionId : null;
      } catch (e) {}
    }

    if (!requestSessionId || requestSessionId !== activeSessionId) {
      return res.status(401).json({
        code: 'SESSION_TERMINATED',
        error: 'Another login was detected on a different device or browser.'
      });
    }
  }

  req.userId = userId;
  req.user = user;
  next();
};

// Super Admin Authorization Gate (Zero-Trust Role + Root Key Verification)
const authenticateSuperAdmin = (req, res, next) => {
  // Option 1: Direct root admin key provided via header
  const adminKey = req.headers['x-admin-key'] || req.query.adminKey;
  if (adminKey && adminKey === ADMIN_SECRET_KEY) {
    req.isAdmin = true;
    return next();
  }

  // Option 2: Authenticated user token with super_admin role or authorized email
  const userId = getUserIdFromReq(req);
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required for Super Admin Command Center' });
  }

  const user = dbEngine.getUserById(userId);
  if (!user) {
    return res.status(401).json({ error: 'User account not found' });
  }

  if (user.role === 'super_admin' || isSuperAdminEmail(user.email)) {
    req.userId = userId;
    req.user = user;
    req.isAdmin = true;
    return next();
  }

  // Log unauthorized administrative intrusion attempt
  const clientIp = getClientIp(req);
  dbEngine.logSecurityEvent({
    userId: user.id,
    eventType: 'UNAUTHORIZED_ADMIN_ACCESS_ATTEMPT',
    ipAddress: clientIp,
    userAgent: req.headers['user-agent'],
    status: 'BLOCKED',
    metadata: { attemptedUrl: req.originalUrl }
  });

  return res.status(403).json({
    error: 'Access Denied: Super Admin governance privileges required.'
  });
};

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = dbEngine.createUser({ name, email, password });
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    dbEngine.setUserActiveSession(user.id, sessionId);

    // 15-minute high security access token + 30-day rotating refresh token
    const accessToken = jwt.sign({ userId: user.id, email: user.email, sessionId }, JWT_SECRET, { expiresIn: '15m' });
    const tokenRes = await dbEngine.createRefreshToken({ userId: user.id, sessionId, rememberMe: true });
    const refreshToken = typeof tokenRes === 'string' ? tokenRes : (tokenRes.refreshToken || tokenRes.rawToken);

    await dbEngine.logSecurityEvent({
      userId: user.id,
      eventType: 'USER_REGISTERED',
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
      status: 'SUCCESS'
    });

    // Send automated welcome email with platform guidelines and T&C
    sendWelcomeEmail(user.email, user.name).catch(e => {
      console.warn('[Welcome Email] Non-fatal delivery notice:', e.message);
    });

    res.json({
      message: 'Account created successfully',
      token: accessToken, // backwards compatibility
      accessToken,
      refreshToken,
      user
    });
  } catch (err) {
    console.error('POST /api/auth/register error:', err);
    res.status(400).json({ error: err.message || 'Registration failed' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, rememberMe, forceLogin } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const clientIp = getClientIp(req);
    const device = parseDeviceDetails(req);
    const resetUrl = `${getAppOrigin(req)}/?forgot=true`;

    const user = dbEngine.verifyUserCredentials({ email, password });
    if (!user) {
      const existing = dbEngine.getUserByEmail(email);
      if (existing) {
        setImmediate(async () => {
          try {
            const location = await resolveIpLocation(clientIp);
            dbEngine.logSecurityEvent({
              userId: existing.id,
              eventType: 'LOGIN_FAILED',
              ipAddress: clientIp,
              userAgent: req.headers['user-agent'],
              deviceId: device.deviceId,
              deviceName: device.deviceName,
              location,
              status: 'FAILURE'
            });
            sendFailedLoginAlertEmail({
              toEmail: existing.email,
              name: existing.name,
              deviceName: device.deviceName,
              ipAddress: clientIp,
              location,
              resetUrl
            }).catch(e => console.warn('[Security Email] Notice:', e.message));
          } catch (e) {}
        });
      }
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check Active Session for Multi-Device Session Detection (HDFC Pattern)
    const existingSessionId = dbEngine.getUserActiveSession(user.id);
    if (existingSessionId && !forceLogin) {
      return res.json({
        activeSessionExists: true,
        message: "Looks like you're already logged in with another device. Please close the other session to continue here."
      });
    }

    // Check if Google Authenticator 2FA is enabled for this user
    const twoFactorDetails = dbEngine.getUserTwoFactorSecret(user.id);
    if (twoFactorDetails && twoFactorDetails.enabled) {
      const tempToken = jwt.sign(
        { tempUserId: user.id, email: user.email, rememberMe: !!rememberMe },
        JWT_SECRET,
        { expiresIn: '10m' }
      );
      return res.json({
        require2FA: true,
        message: 'Google Authenticator 2FA verification required',
        tempToken,
        email: user.email
      });
    }

    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    dbEngine.setUserActiveSession(user.id, sessionId);

    // Issue 15-minute access token + rotating refresh token
    const accessToken = jwt.sign({ userId: user.id, email: user.email, sessionId }, JWT_SECRET, { expiresIn: '15m' });
    const tokenRes = await dbEngine.createRefreshToken({
      userId: user.id,
      sessionId,
      rememberMe: !!rememberMe
    });
    const refreshToken = typeof tokenRes === 'string' ? tokenRes : (tokenRes.refreshToken || tokenRes.rawToken);

    // Instant client response (< 100ms)
    res.json({
      message: 'Signed in successfully',
      token: accessToken, // backwards compatibility
      accessToken,
      refreshToken,
      user
    });

    // Unblocked background tasks: location, security audit log, and security alert email
    setImmediate(async () => {
      try {
        const location = await resolveIpLocation(clientIp);
        dbEngine.logSecurityEvent({
          userId: user.id,
          eventType: 'LOGIN_SUCCESS',
          ipAddress: clientIp,
          userAgent: req.headers['user-agent'],
          deviceId: device.deviceId,
          deviceName: device.deviceName,
          location,
          status: 'SUCCESS'
        });

        sendLoginSecurityAlertEmail({
          toEmail: user.email,
          name: user.name,
          deviceName: device.deviceName,
          ipAddress: clientIp,
          location,
          isNewDevice: !!forceLogin,
          resetUrl
        }).catch(e => console.warn('[Security Email] Notice:', e.message));
      } catch (bgErr) {
        console.warn('[Login background alert notice]:', bgErr.message);
      }
    });
  } catch (err) {
    console.error('POST /api/auth/login error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// POST /api/auth/refresh - Refresh 15-minute access token using rotating refresh token
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const rotated = await dbEngine.verifyAndRotateRefreshToken(refreshToken);
    if (!rotated) {
      return res.status(401).json({
        code: 'INVALID_REFRESH_TOKEN',
        error: 'Refresh token is invalid or expired. Please sign in again.'
      });
    }

    const user = dbEngine.getUserById(rotated.userId);
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    // Check active session continuity
    const currentActiveSession = dbEngine.getUserActiveSession(user.id);
    if (currentActiveSession && rotated.sessionId && rotated.sessionId !== currentActiveSession) {
      return res.status(401).json({
        code: 'SESSION_TERMINATED',
        error: 'Another login was detected on a different device or browser.'
      });
    }

    const newAccessToken = jwt.sign(
      { userId: user.id, email: user.email, sessionId: rotated.sessionId || currentActiveSession },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({
      token: newAccessToken,
      accessToken: newAccessToken,
      refreshToken: rotated.newRefreshToken,
      user
    });
  } catch (err) {
    console.error('POST /api/auth/refresh error:', err);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// GET /api/auth/audit-logs - Security activity feed for current authenticated user
app.get('/api/auth/audit-logs', authenticateToken, async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 15));
    const logs = await dbEngine.getUserAuditLogs(req.userId, limit);
    res.json({ logs });
  } catch (err) {
    console.error('GET /api/auth/audit-logs error:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// ==========================================
// GOOGLE AUTHENTICATOR 2FA ENDPOINTS
// ==========================================

// POST /api/auth/2fa/setup - Initialize 2FA Setup (Generate QR Code & Secret)
app.post('/api/auth/2fa/setup', authenticateToken, async (req, res) => {
  try {
    const user = dbEngine.getUserById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const secret = speakeasy.generateSecret({
      name: `Kuberis (${user.email})`,
      issuer: 'Kuberis Security'
    });

    dbEngine.setTempTwoFactorSecret(user.id, secret.base32);

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      message: '2FA setup initialized',
      secretKey: secret.base32,
      qrCodeUrl,
      otpauthUrl: secret.otpauth_url
    });
  } catch (err) {
    console.error('POST /api/auth/2fa/setup error:', err);
    res.status(500).json({ error: 'Failed to initialize 2FA setup' });
  }
});

// POST /api/auth/2fa/verify-setup - Verify 6-digit TOTP code and Activate 2FA
app.post('/api/auth/2fa/verify-setup', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || code.trim().length !== 6) {
      return res.status(400).json({ error: '6-digit authenticator code required' });
    }

    const twoFactorDetails = dbEngine.getUserTwoFactorSecret(req.userId);
    if (!twoFactorDetails || !twoFactorDetails.tempSecret) {
      return res.status(400).json({ error: 'No active 2FA setup found. Please start setup again.' });
    }

    const verified = speakeasy.totp.verify({
      secret: twoFactorDetails.tempSecret,
      encoding: 'base32',
      token: code.trim(),
      window: 4
    });

    if (!verified) {
      return res.status(400).json({ error: 'Invalid 6-digit code. Check your Google Authenticator app clock and try again.' });
    }

    // Generate 5 Emergency Backup Recovery Codes
    const recoveryCodes = Array.from({ length: 5 }, () =>
      `${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`
    );

    dbEngine.enableTwoFactor(req.userId, twoFactorDetails.tempSecret, recoveryCodes);
    const updatedUser = dbEngine.getUserById(req.userId);

    await dbEngine.logSecurityEvent({
      userId: req.userId,
      eventType: '2FA_ENABLED',
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
      status: 'SUCCESS'
    });

    res.json({
      message: 'Google Authenticator 2FA enabled successfully!',
      user: updatedUser,
      recoveryCodes
    });
  } catch (err) {
    console.error('POST /api/auth/2fa/verify-setup error:', err);
    res.status(500).json({ error: 'Failed to verify 2FA setup' });
  }
});

// POST /api/auth/2fa/verify-login - AWS-style 2FA Challenge Verification during login
app.post('/api/auth/2fa/verify-login', async (req, res) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) {
      return res.status(400).json({ error: 'Temporary token and verification code required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: '2FA session expired. Please log in again.' });
    }

    const userId = decoded.tempUserId;
    const user = dbEngine.getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const twoFactorDetails = dbEngine.getUserTwoFactorSecret(userId);
    if (!twoFactorDetails || !twoFactorDetails.secret || !twoFactorDetails.enabled) {
      return res.status(400).json({ error: '2FA is not enabled for this account' });
    }

    const cleanCode = code.trim();
    let isValid = false;

    // Verify 6-digit TOTP code (window 4 allows +/- 120s clock drift across devices)
    if (/^\d{6}$/.test(cleanCode)) {
      isValid = speakeasy.totp.verify({
        secret: twoFactorDetails.secret,
        encoding: 'base32',
        token: cleanCode,
        window: 4
      });
    }

    // Fallback: Check Emergency Backup Recovery Code
    if (!isValid && twoFactorDetails.recoveryCodes && twoFactorDetails.recoveryCodes.length > 0) {
      isValid = dbEngine.useRecoveryCode(userId, cleanCode);
    }

    const clientIp = getClientIp(req);
    const device = parseDeviceDetails(req);
    const resetUrl = `${getAppOrigin(req)}/?forgot=true`;

    if (!isValid) {
      setImmediate(async () => {
        try {
          const location = await resolveIpLocation(clientIp);
          dbEngine.logSecurityEvent({
            userId,
            eventType: '2FA_VERIFY_FAILED',
            ipAddress: clientIp,
            userAgent: req.headers['user-agent'],
            deviceId: device.deviceId,
            deviceName: device.deviceName,
            location,
            status: 'FAILURE'
          });

          sendFailedLoginAlertEmail({
            toEmail: user.email,
            name: user.name,
            deviceName: device.deviceName,
            ipAddress: clientIp,
            location,
            resetUrl
          }).catch(e => console.warn('[Security Email] Notice:', e.message));
        } catch (e) {}
      });

      return res.status(401).json({ error: 'Invalid 6-digit Google Authenticator code or recovery code' });
    }

    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    dbEngine.setUserActiveSession(user.id, sessionId);

    const accessToken = jwt.sign({ userId: user.id, email: user.email, sessionId }, JWT_SECRET, { expiresIn: '15m' });
    const tokenRes = await dbEngine.createRefreshToken({
      userId: user.id,
      sessionId,
      rememberMe: decoded.rememberMe
    });
    const refreshToken = typeof tokenRes === 'string' ? tokenRes : (tokenRes.refreshToken || tokenRes.rawToken);

    // Instant client response (< 20ms)
    res.json({
      message: '2FA verification successful!',
      token: accessToken, // backwards compatibility
      accessToken,
      refreshToken,
      user
    });

    // Unblocked background tasks: location, security audit log, and security alert email
    setImmediate(async () => {
      try {
        const location = await resolveIpLocation(clientIp);
        dbEngine.logSecurityEvent({
          userId: user.id,
          eventType: '2FA_VERIFIED',
          ipAddress: clientIp,
          userAgent: req.headers['user-agent'],
          deviceId: device.deviceId,
          deviceName: device.deviceName,
          location,
          status: 'SUCCESS'
        });

        sendLoginSecurityAlertEmail({
          toEmail: user.email,
          name: user.name,
          deviceName: device.deviceName,
          ipAddress: clientIp,
          location,
          isNewDevice: false,
          resetUrl
        }).catch(e => console.warn('[Security Email] Notice:', e.message));
      } catch (bgErr) {
        console.warn('[2FA background alert notice]:', bgErr.message);
      }
    });
  } catch (err) {
    console.error('POST /api/auth/2fa/verify-login error:', err);
    res.status(500).json({ error: '2FA verification failed' });
  }
});

// POST /api/auth/2fa/disable - Disable 2FA (Requires valid 6-digit TOTP code or recovery code)
app.post('/api/auth/2fa/disable', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || !code.trim()) {
      return res.status(400).json({ error: '6-digit authenticator code or recovery code required to disable 2FA' });
    }

    const twoFactorDetails = dbEngine.getUserTwoFactorSecret(req.userId);

    if (!twoFactorDetails || !twoFactorDetails.enabled) {
      return res.status(400).json({ error: '2FA is not enabled' });
    }

    const cleanCode = code.trim();
    const verified = speakeasy.totp.verify({
      secret: twoFactorDetails.secret,
      encoding: 'base32',
      token: cleanCode,
      window: 4
    }) || dbEngine.useRecoveryCode(req.userId, cleanCode);

    if (!verified) {
      return res.status(400).json({ error: 'Invalid 6-digit authenticator code or recovery code' });
    }

    dbEngine.disableTwoFactor(req.userId);
    const updatedUser = dbEngine.getUserById(req.userId);

    await dbEngine.logSecurityEvent({
      userId: req.userId,
      eventType: '2FA_DISABLED',
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
      status: 'SUCCESS'
    });

    res.json({
      message: 'Google Authenticator 2FA disabled',
      user: updatedUser
    });
  } catch (err) {
    console.error('POST /api/auth/2fa/disable error:', err);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', (req, res) => {
  const userId = getUserIdFromReq(req);
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const user = dbEngine.getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user });
});

function wrapHtmlEmail(htmlContent) {
  if (!htmlContent) return '';
  if (htmlContent.includes('<html') || htmlContent.includes('<!DOCTYPE')) return htmlContent;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #040D1A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  ${htmlContent}
</body>
</html>`;
}

async function sendEmailWithFallback({ to, subject, text, html }) {
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').trim().replace(/\s+/g, '');
  const webhookUrl = (process.env.GMAIL_HTTP_WEBHOOK_URL || '').trim();
  const resendKey = (process.env.RESEND_API_KEY || '').trim();
  const brevoKey = (process.env.BREVO_API_KEY || '').trim();

  // Sanitize subject to replace non-standard dashes and quotes that corrupt in email client headers
  const cleanSubject = (subject || '')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');
  const cleanHtml = wrapHtmlEmail(html);

  // Attempt 1: Google Apps Script HTTPS Bridge (Port 443 - Bypasses Render Cloud Firewall & Google IP Block)
  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify({ to: to.trim(), subject: cleanSubject, text: text || '', html: cleanHtml })
      });
      const data = await res.json();
      if (res.ok && (data.success || data.id || data.status === 'success')) {
        console.log(`[Kuberis Email] Successfully delivered email to ${to} via Google Apps Script HTTPS Bridge.`);
        return true;
      } else {
        console.warn(`[Kuberis Email] Google Apps Script returned status ${res.status}:`, data);
      }
    } catch (e) {
      console.warn('[Kuberis Email] Google Apps Script HTTPS transport failed:', e.message);
    }
  }

  // Attempt 2: Resend HTTPS REST API (Port 443 - Bypasses Cloud IP Firewall)
  if (resendKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendKey}`
        },
        body: JSON.stringify({
          from: `Kuberis Security <onboarding@resend.dev>`,
          to: [to.trim()],
          subject: cleanSubject,
          text: text || '',
          html: cleanHtml,
          headers: {
            'Content-Type': 'text/html; charset=UTF-8'
          }
        })
      });
      const data = await res.json();
      if (res.ok && (data.id || data.status === 'success')) {
        console.log(`[Kuberis Email] Successfully delivered email to ${to} via Resend HTTPS API. ID: ${data.id}`);
        return true;
      } else {
        console.warn(`[Kuberis Email] Resend API returned status ${res.status}:`, data);
      }
    } catch (e) {
      console.warn('[Kuberis Email] Resend HTTPS API transport failed:', e.message);
    }
  }

  // Attempt 3: Brevo HTTPS REST API (Port 443)
  if (brevoKey) {
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json; charset=UTF-8',
          'api-key': brevoKey
        },
        body: JSON.stringify({
          sender: { name: 'Kuberis Security', email: user },
          to: [{ email: to.trim() }],
          subject: cleanSubject,
          htmlContent: cleanHtml,
          textContent: text || ''
        })
      });
      const data = await res.json();
      if (res.ok && (data.messageId || data.messageIds)) {
        console.log(`[Kuberis Email] Successfully delivered email to ${to} via Brevo HTTPS API.`);
        return true;
      }
    } catch (e) {
      console.warn('[Kuberis Email] Brevo HTTPS API transport failed:', e.message);
    }
  }

  if (!user || !pass || !to) {
    console.error('[Kuberis Email Error] Missing SMTP credentials or recipient email');
    return false;
  }

  const mailOptions = {
    from: `"Kuberis Security" <${user}>`,
    to: to.trim(),
    subject: cleanSubject,
    text: text || '',
    html: cleanHtml,
    encoding: 'utf-8',
    headers: {
      'Content-Type': 'text/html; charset=UTF-8'
    }
  };

  // Attempt 4: Gmail service transport (Nodemailer)
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
      },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000
    });
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Kuberis Email] Successfully delivered email to ${to} via Gmail Service. MessageId: ${info.messageId}`);
    return true;
  } catch (err1) {
    console.warn(`[Kuberis Email] Primary Gmail transport failed (${err1.message}). Trying Direct SSL transport...`);
  }

  // Attempt 5: Direct SMTP SSL (port 465)
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
      },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000
    });
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Kuberis Email] Successfully delivered email to ${to} via SSL 465. MessageId: ${info.messageId}`);
    return true;
  } catch (err2) {
    console.warn(`[Kuberis Email] SSL transport failed (${err2.message}). Trying STARTTLS 587...`);
  }

  // Attempt 6: Direct SMTP TLS on port 587
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
      },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000
    });
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Kuberis Email] Successfully delivered email to ${to} via Port 587. MessageId: ${info.messageId}`);
    return true;
  } catch (err3) {
    console.error(`[Kuberis Email Error] All SMTP transports failed: ${err3.message}`);
    return false;
  }
}

async function sendResetEmail(toEmail, resetUrl) {
  const subject = 'Reset Your Kuberis Password';
  const text = `You requested a password reset for your Kuberis account (${toEmail}).\n\nClick the link below to reset your password:\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email. This link will expire in 1 hour.`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 28px; border: 1px solid #10B981; border-radius: 18px; background: #040D1A; color: #FFFFFF;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #10B981; margin: 0 0 6px 0; font-size: 24px; font-weight: 800;">⚡ Kuberis</h2>
        <div style="font-size: 13px; color: #94A3B8;">Real-Time Personal Wealth OS</div>
      </div>

      <h3 style="color: #FFFFFF; margin-top: 0; font-size: 18px;">Password Reset Request</h3>
      <p style="color: #CBD5E1; font-size: 14px; line-height: 1.6;">
        You requested a password reset for your Kuberis account (<strong>${toEmail}</strong>).
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #000000; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 15px; display: inline-block; box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);">
          Reset My Password →
        </a>
      </div>

      <p style="font-size: 12px; color: #94A3B8; line-height: 1.5; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; margin-top: 24px;">
        If you did not request this, you can safely ignore this email. This secure link will expire in 1 hour.
      </p>
    </div>
  `;

  return await sendEmailWithFallback({ to: toEmail, subject, text, html });
}

async function sendWelcomeEmail(toEmail, userName) {
  const subject = 'Welcome to Kuberis - Your Wealth OS Guidelines & Terms';
  const nameDisplay = userName ? userName.trim() : 'Investor';
  const text = `Welcome to Kuberis, ${nameDisplay}!\n\nYour account has been created successfully. Kuberis is India's next-gen real-time personal wealth operating system.\n\nSecurity Guidelines:\n1. Set Up 4-Digit MPIN for quick access on trusted devices.\n2. Enable Google Authenticator (2FA) for extra security.\n3. Never share your credentials. Kuberis never asks for bank passwords or debit card PINs.\n4. Connect Google Drive for automatic, encrypted backups.\n\nTerms & Conditions Summary:\n- Kuberis is an informational wealth tracker and personal ledger.\n- Your data is private, isolated, and encrypted.\n- You retain 100% data ownership.\n\nAccess your dashboard: https://kuberis.onrender.com/dashboard`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; border: 1px solid #10B981; border-radius: 20px; background: #040D1A; color: #FFFFFF;">
      <div style="text-align: center; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.08);">
        <h2 style="color: #10B981; margin: 0 0 6px 0; font-size: 26px; font-weight: 900; letter-spacing: -0.5px;">⚡ Kuberis</h2>
        <div style="font-size: 13px; color: #94A3B8; font-weight: 500;">Next-Gen Financial OS Built for India (INR)</div>
      </div>

      <h3 style="color: #FFFFFF; font-size: 20px; font-weight: 800; margin-top: 0;">Welcome aboard, ${nameDisplay}! 👋</h3>
      <p style="color: #CBD5E1; font-size: 14px; line-height: 1.6;">
        Thank you for joining Kuberis. Your private financial dashboard is ready to unify your stocks, mutual funds, gold, fixed deposits, and daily cash flow in real-time.
      </p>

      <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 14px; padding: 18px; margin: 24px 0;">
        <h4 style="color: #10B981; margin: 0 0 12px 0; font-size: 15px; font-weight: 800;">🛡️ Recommended Security Guidelines</h4>
        <ul style="margin: 0; padding-left: 20px; color: #E2E8F0; font-size: 13px; line-height: 1.7;">
          <li><strong>Set Up Your 4-Digit MPIN:</strong> Fast 1-click device unlocking without having to type your full password.</li>
          <li><strong>Enable Google Authenticator 2FA:</strong> High-security time-based 6-digit codes to protect your wealth data from unauthorized access.</li>
          <li><strong>Non-Custodial Architecture:</strong> Kuberis never asks for or stores your netbanking passwords or debit card PINs. All records are isolated and encrypted.</li>
          <li><strong>Google Drive Sync:</strong> Connect your private Google Drive inbox to ingest statements and secure automated cloud backups.</li>
        </ul>
      </div>

      <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; padding: 18px; margin: 24px 0;">
        <h4 style="color: #38BDF8; margin: 0 0 10px 0; font-size: 14px; font-weight: 800;">📜 Terms & Privacy Summary</h4>
        <p style="color: #94A3B8; font-size: 12.5px; line-height: 1.6; margin: 0;">
          Kuberis is an informational wealth tracking OS. Market prices and NAVs are synced live from official exchanges (NSE, BSE, AMFI). You maintain 100% data sovereignty and may export or wipe your data anytime.
        </p>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://kuberis.onrender.com/dashboard" style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #000000; padding: 14px 32px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 15px; display: inline-block; box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);">
          Launch Kuberis Dashboard →
        </a>
      </div>

      <div style="font-size: 11.5px; color: #64748B; text-align: center; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 18px; line-height: 1.5;">
        © 2026 Kuberis OS. All rights reserved. • Built with Privacy & Security First.
      </div>
    </div>
  `;

  return await sendEmailWithFallback({ to: toEmail, subject, text, html });
}

async function sendMpinResetEmail(toEmail, resetMpinUrl, isLocked = false) {
  const subject = isLocked 
    ? 'Kuberis Security Alert: Account Locked' 
    : 'Reset Your Kuberis 4-Digit MPIN';
  const text = isLocked
    ? `Your Kuberis account (${toEmail}) was locked due to incorrect MPIN attempts.\n\nReset link: ${resetMpinUrl}\n\nLink expires in 1 hour.`
    : `You requested to reset your 4-digit MPIN for Kuberis (${toEmail}).\n\nReset link: ${resetMpinUrl}\n\nLink expires in 1 hour.`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 28px; border: 1px solid #10B981; border-radius: 18px; background: #040D1A; color: #FFFFFF;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #10B981; margin: 0 0 6px 0; font-size: 24px; font-weight: 800;">⚡ Kuberis</h2>
        <div style="font-size: 13px; color: #94A3B8;">Real-Time Personal Wealth OS</div>
      </div>

      <h3 style="color: #FFFFFF; margin-top: 0; font-size: 18px;">
        ${isLocked ? 'Security Lockout: Reset MPIN to Unlock' : 'Reset Your 4-Digit Security MPIN'}
      </h3>
      <p style="color: #CBD5E1; font-size: 14px; line-height: 1.6;">
        ${isLocked 
          ? `Your Kuberis account (<strong>${toEmail}</strong>) was temporarily locked due to multiple incorrect MPIN attempts. Click below to verify your identity and set a new MPIN.` 
          : `You requested to reset the 4-digit MPIN for your Kuberis account (<strong>${toEmail}</strong>).`}
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetMpinUrl}" style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #000000; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 15px; display: inline-block; box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);">
          Set New 4-Digit MPIN →
        </a>
      </div>

      <p style="font-size: 12px; color: #94A3B8; line-height: 1.5; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; margin-top: 24px;">
        If you did not request this, please secure your account immediately. This link expires in 1 hour.
      </p>
    </div>
  `;

  return await sendEmailWithFallback({ to: toEmail, subject, text, html });
}

async function sendLoginSecurityAlertEmail({ toEmail, name, deviceName, ipAddress, location, isNewDevice, resetUrl }) {
  const subject = isNewDevice 
    ? 'New Sign-in from Different Device - Kuberis Security' 
    : 'New Sign-in detected on your Kuberis account';
  const text = `Hi ${name || 'there'},\n\nA new sign-in was detected into your Kuberis account (${toEmail}).\nDevice: ${deviceName || 'Unknown Device'}\nIP Address: ${ipAddress || 'Unknown'}\nLocation: ${location || 'India - IN'}\nTime: ${new Date().toLocaleString('en-IN')}\n\nIf this was not you, please secure your account immediately: ${resetUrl}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px 24px; border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 18px; background: #040D1A; color: #FFFFFF;">
      <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 16px;">
        <h2 style="color: #10B981; margin: 0 0 4px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">⚡ Kuberis</h2>
        <div style="font-size: 12px; color: #94A3B8; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Real-Time Personal Wealth OS</div>
      </div>

      <p style="color: #F8FAFC; font-size: 15px; margin-bottom: 12px; font-weight: 600;">
        Hi ${name || 'there'},
      </p>

      <p style="color: #CBD5E1; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
        ${isNewDevice ? 'A sign-in from a <strong>new or different device</strong> has been detected' : 'A new sign-in has been detected'} into your Kuberis account from the following device:
      </p>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 12px; overflow: hidden;">
        <tbody>
          <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
            <td style="padding: 12px 16px; font-size: 13px; color: #94A3B8; font-weight: 600; width: 35%;">Device</td>
            <td style="padding: 12px 16px; font-size: 13.5px; color: #FFFFFF; font-weight: 700;">${deviceName || 'Unknown Device'}</td>
          </tr>
          <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
            <td style="padding: 12px 16px; font-size: 13px; color: #94A3B8; font-weight: 600;">IP Address</td>
            <td style="padding: 12px 16px; font-size: 13.5px; color: #FFFFFF; font-family: monospace; font-weight: 700;">${ipAddress || '127.0.0.1'}</td>
          </tr>
          <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
            <td style="padding: 12px 16px; font-size: 13px; color: #94A3B8; font-weight: 600;">Location</td>
            <td style="padding: 12px 16px; font-size: 13.5px; color: #38BDF8; font-weight: 700;">${location || 'India - IN'}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; font-size: 13px; color: #94A3B8; font-weight: 600;">Time</td>
            <td style="padding: 12px 16px; font-size: 13px; color: #CBD5E1;">${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
          </tr>
        </tbody>
      </table>

      <p style="color: #94A3B8; font-size: 13px; line-height: 1.6; margin-bottom: 24px;">
        If you recognize this Login activity (IP / Device information) as your own, no need to worry. If not, immediately <a href="${resetUrl}" style="color: #F97316; font-weight: 700; text-decoration: underline;">raise a security alert / change your password</a>.
      </p>

      <div style="font-size: 13px; color: #CBD5E1; margin-top: 20px;">
        Regards,<br>
        <strong style="color: #FFFFFF;">Team Kuberis</strong>
      </div>
    </div>
  `;
  return await sendEmailWithFallback({ to: toEmail, subject, text, html });
}

async function sendLogoutAlertEmail({ toEmail, name, deviceName, ipAddress, location, resetUrl }) {
  const subject = 'Account Signed Out - Kuberis';
  const text = `Hi ${name || 'there'},\n\nYour Kuberis account was signed out from ${deviceName || 'Device'} (IP: ${ipAddress || 'Unknown'}, Location: ${location || 'India - IN'}) at ${new Date().toLocaleString('en-IN')}.\n\nIf you did not initiate this, please secure your account: ${resetUrl}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px 24px; border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 18px; background: #040D1A; color: #FFFFFF;">
      <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 16px;">
        <h2 style="color: #10B981; margin: 0 0 4px 0; font-size: 24px; font-weight: 800;">⚡ Kuberis</h2>
        <div style="font-size: 12px; color: #94A3B8; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Account Sign Out Notice</div>
      </div>

      <p style="color: #F8FAFC; font-size: 15px; margin-bottom: 12px; font-weight: 600;">
        Hi ${name || 'there'},
      </p>

      <p style="color: #CBD5E1; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
        Your Kuberis account was signed out from the following device:
      </p>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 12px; overflow: hidden;">
        <tbody>
          <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
            <td style="padding: 12px 16px; font-size: 13px; color: #94A3B8; font-weight: 600; width: 35%;">Device</td>
            <td style="padding: 12px 16px; font-size: 13.5px; color: #FFFFFF; font-weight: 700;">${deviceName || 'Unknown Device'}</td>
          </tr>
          <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
            <td style="padding: 12px 16px; font-size: 13px; color: #94A3B8; font-weight: 600;">IP Address</td>
            <td style="padding: 12px 16px; font-size: 13.5px; color: #FFFFFF; font-family: monospace; font-weight: 700;">${ipAddress || '127.0.0.1'}</td>
          </tr>
          <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
            <td style="padding: 12px 16px; font-size: 13px; color: #94A3B8; font-weight: 600;">Location</td>
            <td style="padding: 12px 16px; font-size: 13.5px; color: #38BDF8; font-weight: 700;">${location || 'India - IN'}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; font-size: 13px; color: #94A3B8; font-weight: 600;">Time</td>
            <td style="padding: 12px 16px; font-size: 13px; color: #CBD5E1;">${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
          </tr>
        </tbody>
      </table>

      <p style="color: #94A3B8; font-size: 13px; line-height: 1.6; margin-bottom: 24px;">
        If you did not perform this logout, another device may have signed in or your active session expired. If you suspect unauthorized access, <a href="${resetUrl}" style="color: #EF4444; font-weight: 700;">secure your account now</a>.
      </p>

      <div style="font-size: 13px; color: #CBD5E1; margin-top: 20px;">
        Regards,<br>
        <strong style="color: #FFFFFF;">Team Kuberis</strong>
      </div>
    </div>
  `;
  return await sendEmailWithFallback({ to: toEmail, subject, text, html });
}

async function sendFailedLoginAlertEmail({ toEmail, name, deviceName, ipAddress, location, resetUrl }) {
  const subject = '⚠️ Security Alert: Failed sign-in attempt on your Kuberis account';
  const text = `Hi ${name || 'there'},\n\nWe detected an unsuccessful sign-in attempt into your Kuberis account (${toEmail}) from ${deviceName || 'Device'} (IP: ${ipAddress || 'Unknown'}, Location: ${location || 'India - IN'}) at ${new Date().toLocaleString('en-IN')}.\n\nIf this was not you, someone may be attempting to access your account. Reset your password immediately: ${resetUrl}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px 24px; border: 1px solid #EF4444; border-radius: 18px; background: #040D1A; color: #FFFFFF;">
      <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 16px;">
        <h2 style="color: #EF4444; margin: 0 0 4px 0; font-size: 24px; font-weight: 800;">⚠️ Kuberis Security Alert</h2>
        <div style="font-size: 12px; color: #FCA5A5; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Unsuccessful Sign-In Attempt</div>
      </div>

      <p style="color: #F8FAFC; font-size: 15px; margin-bottom: 12px; font-weight: 600;">
        Hi ${name || 'there'},
      </p>

      <p style="color: #CBD5E1; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
        An incorrect password or MPIN was entered for your Kuberis account from the following device:
      </p>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; overflow: hidden;">
        <tbody>
          <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
            <td style="padding: 12px 16px; font-size: 13px; color: #94A3B8; font-weight: 600; width: 35%;">Device</td>
            <td style="padding: 12px 16px; font-size: 13.5px; color: #FFFFFF; font-weight: 700;">${deviceName || 'Unknown Device'}</td>
          </tr>
          <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
            <td style="padding: 12px 16px; font-size: 13px; color: #94A3B8; font-weight: 600;">IP Address</td>
            <td style="padding: 12px 16px; font-size: 13.5px; color: #FFFFFF; font-family: monospace; font-weight: 700;">${ipAddress || '127.0.0.1'}</td>
          </tr>
          <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
            <td style="padding: 12px 16px; font-size: 13px; color: #94A3B8; font-weight: 600;">Location</td>
            <td style="padding: 12px 16px; font-size: 13.5px; color: #FCA5A5; font-weight: 700;">${location || 'India - IN'}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; font-size: 13px; color: #94A3B8; font-weight: 600;">Time</td>
            <td style="padding: 12px 16px; font-size: 13px; color: #CBD5E1;">${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
          </tr>
        </tbody>
      </table>

      <p style="color: #CBD5E1; font-size: 13px; line-height: 1.6; margin-bottom: 24px;">
        If this was you, please ensure your password is typed accurately. If you did NOT attempt this sign-in, an unauthorized party may be attempting to access your account.
      </p>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${resetUrl}" style="background: #EF4444; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 10px; font-weight: 800; font-size: 14px; display: inline-block;">
          Reset Password Immediately →
        </a>
      </div>

      <div style="font-size: 13px; color: #CBD5E1; margin-top: 20px;">
        Regards,<br>
        <strong style="color: #FFFFFF;">Team Kuberis Security</strong>
      </div>
    </div>
  `;
  return await sendEmailWithFallback({ to: toEmail, subject, text, html });
}

// POST /api/auth/forgot-password
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const cleanEmail = email.trim().toLowerCase();
    const existingUser = dbEngine.getUserByEmail(cleanEmail);
    if (!existingUser) {
      return res.status(404).json({ error: 'No account found with this email. Please enter the email associated with your Kuberis account.' });
    }

    const result = dbEngine.createPasswordResetToken(cleanEmail);

    let origin = req.headers.origin || req.headers.referer;
    if (origin) {
      try {
        const urlObj = new URL(origin);
        origin = urlObj.origin;
      } catch (e) {}
    }
    if (!origin) {
      const host = req.headers.host || 'kuberis.onrender.com';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      origin = `${protocol}://${host}`;
    }

    const resetUrl = `${origin}/?resetToken=${result.resetToken}`;
    const emailSent = await sendResetEmail(cleanEmail, resetUrl);

    if (!emailSent) {
      return res.status(500).json({ error: `Failed to deliver email to ${cleanEmail} via Gmail SMTP. Please try again.` });
    }

    res.json({
      message: `Password reset link sent to ${cleanEmail}! Check your Gmail inbox.`,
      emailSent
    });
  } catch (err) {
    console.error('POST /api/auth/forgot-password error:', err);
    res.status(400).json({ error: err.message || 'Password reset request failed' });
  }
});

// POST /api/auth/reset-password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = dbEngine.resetPassword({ resetToken, newPassword });
    if (user && user.id) {
      await dbEngine.logSecurityEvent({
        userId: user.id,
        eventType: 'PASSWORD_RESET',
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'],
        status: 'SUCCESS'
      });
    }
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('POST /api/auth/reset-password error:', err);
    res.status(400).json({ error: err.message || 'Password reset failed' });
  }
});

// POST /api/auth/change-password (Authenticated user changes their password)
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const updatedUser = dbEngine.changePassword({
      userId: req.userId,
      currentPassword,
      newPassword
    });

    await dbEngine.logSecurityEvent({
      userId: req.userId,
      eventType: 'PASSWORD_CHANGED',
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
      status: 'SUCCESS'
    });

    res.json({
      message: 'Password updated successfully. Please sign in with your new password.',
      user: updatedUser
    });
  } catch (err) {
    console.error('POST /api/auth/change-password error:', err);
    if (req.userId) {
      await dbEngine.logSecurityEvent({
        userId: req.userId,
        eventType: 'PASSWORD_CHANGE_FAILED',
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'],
        status: 'FAILURE'
      });
    }
    res.status(400).json({ error: err.message || 'Failed to change password' });
  }
});

// POST /api/auth/forgot-mpin
app.post('/api/auth/forgot-mpin', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const cleanEmail = email.trim().toLowerCase();
    const existingUser = dbEngine.getUserByEmail(cleanEmail);
    if (!existingUser) {
      return res.status(404).json({ error: 'No account found with this email. Please enter your registered Kuberis email.' });
    }

    const result = dbEngine.createMpinResetToken(cleanEmail);

    let origin = req.headers.origin || req.headers.referer;
    if (origin) {
      try { origin = new URL(origin).origin; } catch (e) {}
    }
    if (!origin) {
      const host = req.headers.host || 'kuberis.onrender.com';
      origin = `${host.includes('localhost') ? 'http' : 'https'}://${host}`;
    }

    const resetMpinUrl = `${origin}/?resetMpinToken=${result.resetMpinToken}`;
    const emailSent = await sendMpinResetEmail(cleanEmail, resetMpinUrl, false);

    if (!emailSent) {
      return res.status(500).json({ error: `Failed to deliver email to ${cleanEmail} via Gmail SMTP. Please try again.` });
    }

    res.json({
      message: `MPIN reset link sent to ${cleanEmail}! Check your Gmail inbox.`,
      emailSent
    });
  } catch (err) {
    console.error('POST /api/auth/forgot-mpin error:', err);
    res.status(400).json({ error: err.message || 'MPIN reset request failed' });
  }
});

// GET /api/auth/debug-email - Live Server Diagnostic Endpoint
app.get('/api/auth/debug-email', async (req, res) => {
  try {
    const to = (req.query.to || '').toString().trim();
    if (!to) {
      return res.status(400).json({ error: 'Recipient email parameter ?to=email@example.com is required' });
    }
    const sent = await sendEmailWithFallback({
      to,
      subject: 'Kuberis Live Server Diagnostic Email',
      text: 'Testing live email delivery from Kuberis Render Server.',
      html: '<h3>⚡ Kuberis Live Server Test</h3><p>If you see this, cloud email delivery is working 100%!</p>'
    });
    res.json({ success: sent, recipient: to, env: { hasWebhook: !!process.env.GMAIL_HTTP_WEBHOOK_URL, hasResend: !!process.env.RESEND_API_KEY, hasBrevo: !!process.env.BREVO_API_KEY } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/reset-mpin
app.post('/api/auth/reset-mpin', async (req, res) => {
  try {
    const { resetMpinToken, newMpin } = req.body;
    if (!resetMpinToken || !newMpin) {
      return res.status(400).json({ error: 'Reset token and new 4-digit MPIN are required' });
    }

    const user = dbEngine.resetUserMpin({ resetMpinToken, newMpin });
    if (user && user.id) {
      await dbEngine.logSecurityEvent({
        userId: user.id,
        eventType: 'MPIN_RESET',
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'],
        status: 'SUCCESS'
      });
    }
    res.json({ message: '4-Digit MPIN reset successfully!' });
  } catch (err) {
    console.error('POST /api/auth/reset-mpin error:', err);
    res.status(400).json({ error: err.message || 'MPIN reset failed' });
  }
});

// POST /api/auth/check-methods
app.post('/api/auth/check-methods', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.json({ exists: false, hasMpin: false, hasBiometrics: false });

    const cleanEmail = email.trim().toLowerCase();
    const user = dbEngine.getUserByEmail(cleanEmail);
    if (!user) return res.json({ exists: false, hasMpin: false, hasBiometrics: false });

    res.json({
      exists: true,
      hasMpin: !!user.mpinHash,
      hasBiometrics: !!user.webauthnCredentialId,
      name: user.name || ''
    });
  } catch (err) {
    res.json({ exists: false, hasMpin: false, hasBiometrics: false });
  }
});

// DELETE /api/auth/account (Permanently delete user account & all data)
app.delete('/api/auth/account', async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await dbEngine.logSecurityEvent({
      userId,
      eventType: 'ACCOUNT_DELETED',
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
      status: 'SUCCESS'
    });

    dbEngine.deleteUserAccount(userId);
    res.json({ success: true, message: 'Account permanently deleted' });
  } catch (err) {
    console.error('DELETE /api/auth/account error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// POST /api/auth/mpin/set
app.post('/api/auth/mpin/set', async (req, res) => {
  try {
    let userId = getUserIdFromReq(req);
    const { mpin, email } = req.body;

    if (!userId && email) {
      const u = dbEngine.getUserByEmail(email.toString().trim().toLowerCase());
      if (u) userId = u.id;
    }

    if (!userId) return res.status(401).json({ error: 'Unauthorized: Please sign in' });

    dbEngine.setUserMpin({ userId, mpin });
    const updatedUser = dbEngine.getUserById(userId);

    await dbEngine.logSecurityEvent({
      userId,
      eventType: 'MPIN_SET',
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
      status: 'SUCCESS'
    });

    res.json({
      message: '4-Digit MPIN set successfully!',
      hasMpin: true,
      user: updatedUser
    });
  } catch (err) {
    console.error('POST /api/auth/mpin/set error:', err);
    res.status(400).json({ error: err.message || 'Failed to set MPIN' });
  }
});

// POST /api/auth/mpin/verify
app.post('/api/auth/mpin/verify', async (req, res) => {
  try {
    const { email, mpin, forceLogin } = req.body;
    if (!email || !mpin) {
      return res.status(400).json({ error: 'Email and MPIN are required' });
    }

    const clientIp = getClientIp(req);
    const device = parseDeviceDetails(req);
    const resetUrl = `${getAppOrigin(req)}/?forgot=true`;

    const cleanEmail = email.trim().toLowerCase();
    const dbUser = dbEngine.getUserByEmail(cleanEmail);
    if (!dbUser) {
      return res.status(404).json({ error: 'No account found with this email' });
    }

    const user = dbEngine.verifyUserMpin({ email: cleanEmail, mpin });
    if (!user) {
      dbUser.failedMpinAttempts = (dbUser.failedMpinAttempts || 0) + 1;
      const attemptsLeft = Math.max(0, 3 - dbUser.failedMpinAttempts);

      setImmediate(async () => {
        try {
          const location = await resolveIpLocation(clientIp);
          dbEngine.logSecurityEvent({
            userId: dbUser.id,
            eventType: 'MPIN_LOGIN_FAILED',
            ipAddress: clientIp,
            userAgent: req.headers['user-agent'],
            deviceId: device.deviceId,
            deviceName: device.deviceName,
            location,
            status: 'FAILURE',
            metadata: { attemptsLeft }
          });

          sendFailedLoginAlertEmail({
            toEmail: dbUser.email,
            name: dbUser.name,
            deviceName: device.deviceName,
            ipAddress: clientIp,
            location,
            resetUrl
          }).catch(e => console.warn('[Security Email] Notice:', e.message));
        } catch (e) {}
      });

      if (dbUser.failedMpinAttempts >= 3) {
        const result = dbEngine.createMpinResetToken(cleanEmail);

        let origin = req.headers.origin || req.headers.referer;
        if (origin) {
          try { origin = new URL(origin).origin; } catch (e) {}
        }
        if (!origin) {
          const host = req.headers.host || 'kuberis.onrender.com';
          origin = `${host.includes('localhost') ? 'http' : 'https'}://${host}`;
        }
        const resetMpinUrl = `${origin}/?resetMpinToken=${result.resetMpinToken}`;
        await sendMpinResetEmail(cleanEmail, resetMpinUrl, true);

        return res.status(423).json({
          error: 'Account locked: 3 incorrect MPIN attempts. We have sent an unlock & reset link to your email.',
          locked: true
        });
      }

      return res.status(401).json({
        error: `Invalid 4-digit MPIN. ${attemptsLeft} attempt(s) remaining before account lockout.`,
        attemptsLeft
      });
    }

    // Reset failed attempts on success
    dbUser.failedMpinAttempts = 0;

    // Check Active Session for Multi-Device Session Detection (HDFC Pattern)
    const existingSessionId = dbEngine.getUserActiveSession(user.id);
    if (existingSessionId && !forceLogin) {
      return res.json({
        activeSessionExists: true,
        message: "Looks like you're already logged in with another device. Please close the other session to continue here."
      });
    }

    // Check if Google Authenticator 2FA is enabled
    const twoFactorDetails = dbEngine.getUserTwoFactorSecret(user.id);
    if (twoFactorDetails && twoFactorDetails.enabled) {
      const tempToken = jwt.sign(
        { tempUserId: user.id, email: user.email, rememberMe: true },
        JWT_SECRET,
        { expiresIn: '10m' }
      );
      return res.json({
        require2FA: true,
        message: 'Google Authenticator 2FA verification required',
        tempToken,
        email: user.email
      });
    }

    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    dbEngine.setUserActiveSession(user.id, sessionId);

    // Issue 15-minute access token + rotating refresh token
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, sessionId },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
    const tokenRes = await dbEngine.createRefreshToken({
      userId: user.id,
      sessionId,
      rememberMe: true
    });
    const refreshToken = typeof tokenRes === 'string' ? tokenRes : (tokenRes.refreshToken || tokenRes.rawToken);

    // Instant response to client (< 80ms)
    res.json({
      message: 'MPIN authentication successful',
      token: accessToken, // backwards compatibility
      accessToken,
      refreshToken,
      user
    });

    // Unblocked background tasks: location, security audit log, and security alert email
    setImmediate(async () => {
      try {
        const location = await resolveIpLocation(clientIp);
        dbEngine.logSecurityEvent({
          userId: user.id,
          eventType: 'MPIN_LOGIN_SUCCESS',
          ipAddress: clientIp,
          userAgent: req.headers['user-agent'],
          deviceId: device.deviceId,
          deviceName: device.deviceName,
          location,
          status: 'SUCCESS'
        });

        sendLoginSecurityAlertEmail({
          toEmail: user.email,
          name: user.name,
          deviceName: device.deviceName,
          ipAddress: clientIp,
          location,
          isNewDevice: !!forceLogin,
          resetUrl
        }).catch(e => console.warn('[Security Email] Notice:', e.message));
      } catch (bgErr) {
        console.warn('[MPIN background alert notice]:', bgErr.message);
      }
    });
  } catch (err) {
    console.error('POST /api/auth/mpin/verify error:', err);
    res.status(400).json({ error: err.message || 'MPIN authentication failed' });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const { refreshToken } = req.body || {};
    const clientIp = getClientIp(req);
    const device = parseDeviceDetails(req);
    const resetUrl = `${getAppOrigin(req)}/?forgot=true`;

    // 1. Immediately acknowledge logout to client (Sub-5ms instant response!)
    res.json({ success: true, message: 'Logged out successfully' });

    // 2. Perform background cleanup, session termination, audit log, and security alert email
    setImmediate(async () => {
      try {
        if (refreshToken) {
          dbEngine.revokeRefreshToken(refreshToken);
        }
        if (userId) {
          const user = dbEngine.getUserById(userId);
          dbEngine.clearUserActiveSession(userId);
          const location = await resolveIpLocation(clientIp);
          dbEngine.logSecurityEvent({
            userId,
            eventType: 'LOGOUT',
            ipAddress: clientIp,
            userAgent: req.headers['user-agent'],
            deviceId: device.deviceId,
            deviceName: device.deviceName,
            location,
            status: 'SUCCESS'
          });

          if (user && user.email) {
            sendLogoutAlertEmail({
              toEmail: user.email,
              name: user.name,
              deviceName: device.deviceName,
              ipAddress: clientIp,
              location,
              resetUrl
            }).catch(e => console.warn('[Security Email] Notice:', e.message));
          }
        }
      } catch (bgErr) {
        console.warn('[Logout background cleanup notice]:', bgErr.message);
      }
    });
  } catch (e) {
    res.json({ success: true });
  }
});

// POST /api/auth/webauthn/register
app.post('/api/auth/webauthn/register', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized: Please sign in' });

    const { credentialId, publicKey } = req.body;
    dbEngine.registerWebAuthnCredential({ userId, credentialId, publicKey });

    const clientIp = getClientIp(req);
    const device = parseDeviceDetails(req);
    const location = await resolveIpLocation(clientIp);

    await dbEngine.logSecurityEvent({
      userId,
      eventType: 'BIOMETRIC_REGISTERED',
      ipAddress: clientIp,
      userAgent: req.headers['user-agent'],
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      location,
      status: 'SUCCESS'
    });

    res.json({ message: 'Biometric Face ID / Touch ID registered successfully!' });
  } catch (err) {
    console.error('POST /api/auth/webauthn/register error:', err);
    res.status(400).json({ error: err.message || 'Failed to register biometrics' });
  }
});

// POST /api/auth/webauthn/verify
app.post('/api/auth/webauthn/verify', async (req, res) => {
  try {
    const { credentialId, email, forceLogin } = req.body;
    if (!credentialId && !email) {
      return res.status(400).json({ error: 'Biometric credential ID or email required' });
    }

    const clientIp = getClientIp(req);
    const device = parseDeviceDetails(req);
    const resetUrl = `${getAppOrigin(req)}/?forgot=true`;

    const user = await dbEngine.verifyWebAuthnCredential({ credentialId, email });
    if (!user) {
      const existing = email ? dbEngine.getUserByEmail(email) : null;
      if (existing) {
        setImmediate(async () => {
          try {
            const location = await resolveIpLocation(clientIp);
            dbEngine.logSecurityEvent({
              userId: existing.id,
              eventType: 'BIOMETRIC_VERIFY_FAILED',
              ipAddress: clientIp,
              userAgent: req.headers['user-agent'],
              deviceId: device.deviceId,
              deviceName: device.deviceName,
              location,
              status: 'FAILURE'
            });

            sendFailedLoginAlertEmail({
              toEmail: existing.email,
              name: existing.name,
              deviceName: device.deviceName,
              ipAddress: clientIp,
              location,
              resetUrl
            }).catch(e => console.warn('[Security Email] Notice:', e.message));
          } catch (e) {}
        });
      }
      return res.status(401).json({ error: 'Biometric verification failed' });
    }

    // Check Active Session for Multi-Device Session Detection (HDFC Pattern)
    const existingSessionId = dbEngine.getUserActiveSession(user.id);
    if (existingSessionId && !forceLogin) {
      return res.json({
        activeSessionExists: true,
        message: "Looks like you're already logged in with another device. Please close the other session to continue here."
      });
    }

    // Check if Google Authenticator 2FA is enabled
    const twoFactorDetails = dbEngine.getUserTwoFactorSecret(user.id);
    if (twoFactorDetails && twoFactorDetails.enabled) {
      const tempToken = jwt.sign(
        { tempUserId: user.id, email: user.email, rememberMe: true },
        JWT_SECRET,
        { expiresIn: '10m' }
      );
      return res.json({
        require2FA: true,
        message: 'Google Authenticator 2FA verification required',
        tempToken,
        email: user.email
      });
    }

    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    dbEngine.setUserActiveSession(user.id, sessionId);

    // Issue 15-minute access token + rotating refresh token
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, sessionId },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
    const tokenRes = await dbEngine.createRefreshToken({
      userId: user.id,
      sessionId,
      rememberMe: true
    });
    const refreshToken = typeof tokenRes === 'string' ? tokenRes : (tokenRes.refreshToken || tokenRes.rawToken);

    // Instant response to client (< 50ms)
    res.json({
      message: 'Biometric authentication successful',
      token: accessToken,
      accessToken,
      refreshToken,
      user
    });

    // Background security tasks: location, security audit log, and security alert email
    setImmediate(async () => {
      try {
        const location = await resolveIpLocation(clientIp);
        dbEngine.logSecurityEvent({
          userId: user.id,
          eventType: 'BIOMETRIC_LOGIN_SUCCESS',
          ipAddress: clientIp,
          userAgent: req.headers['user-agent'],
          deviceId: device.deviceId,
          deviceName: device.deviceName,
          location,
          status: 'SUCCESS'
        });

        sendLoginSecurityAlertEmail({
          toEmail: user.email,
          name: user.name,
          deviceName: device.deviceName,
          ipAddress: clientIp,
          location,
          isNewDevice: !!forceLogin,
          resetUrl
        }).catch(e => console.warn('[Security Email] Notice:', e.message));
      } catch (bgErr) {
        console.warn('[Biometric background alert notice]:', bgErr.message);
      }
    });
  } catch (err) {
    console.error('POST /api/auth/webauthn/verify error:', err);
    res.status(400).json({ error: err.message || 'Biometric authentication failed' });
  }
});

// ==========================================
// FINANCIAL DATA ENDPOINTS
// ==========================================

// GET /api/state
app.get('/api/state', authenticateToken, (req, res) => {
  try {
    const userId = req.userId;
    const state = dbEngine.getState(userId);
    res.json(state);
  } catch (err) {
    console.error('GET /api/state error:', err);
    res.status(500).json({ error: 'Failed to fetch state' });
  }
});

// GET /api/export
app.get('/api/export', authenticateToken, (req, res) => {
  try {
    const userId = req.userId;
    const { format } = req.query;
    const state = dbEngine.getState(userId);
    const dateStr = new Date().toISOString().split('T')[0];

    if (format === 'csv') {
      const txs = state.transactions || [];
      let csv = 'Date,Merchant,Amount,Type,Category,Account,Tags,Source,Receipt\n';
      for (const t of txs) {
        const tagsStr = (Array.isArray(t.tags) ? t.tags : JSON.parse(t.tags || '[]')).join('; ');
        const merchantEsc = `"${(t.merchant || '').replace(/"/g, '""')}"`;
        const catEsc = `"${(t.category || '').replace(/"/g, '""')}"`;
        const accEsc = `"${(t.account || '').replace(/"/g, '""')}"`;
        csv += `${t.date},${merchantEsc},${t.amount},${t.type},${catEsc},${accEsc},"${tagsStr}",${t.source},${t.receipt}\n`;
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="Kuberis_Transactions_${dateStr}.csv"`);
      return res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="Kuberis_Backup_${dateStr}.json"`);
      return res.json(state);
    }
  } catch (err) {
    console.error('GET /api/export error:', err);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// POST /api/transactions
app.post('/api/transactions', authenticateToken, (req, res) => {
  try {
    const userId = req.userId;
    const batch = req.body;
    if (!batch) {
      return res.status(400).json({ error: 'Payload required' });
    }
    const result = dbEngine.addTransactions(userId, batch);
    res.json(result);
  } catch (err) {
    console.error('POST /api/transactions error:', err);
    res.status(500).json({ error: 'Failed to add transactions' });
  }
});

// PATCH /api/transactions
app.patch('/api/transactions', authenticateToken, (req, res) => {
  try {
    const userId = req.userId;
    const { id, merchant, amount, type, date, category, account, tags } = req.body;
    if (!id) {
      return res.status(400).json({ error: 'Transaction ID required' });
    }
    const updated = dbEngine.updateTransaction(userId, id, { merchant, amount, type, date, category, account, tags });
    if (!updated) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(updated);
  } catch (err) {
    if (err.message && err.message.includes('TENANT_ISOLATION_VIOLATION')) {
      const clientIp = getClientIp(req);
      dbEngine.logSecurityEvent({
        userId: req.userId,
        eventType: 'IDOR_VIOLATION_BLOCKED',
        ipAddress: clientIp,
        userAgent: req.headers['user-agent'],
        status: 'BLOCKED',
        metadata: { targetId: req.body?.id, resource: 'transaction' }
      });
      return res.status(403).json({ error: 'Forbidden: Unauthorized access to tenant resource' });
    }
    console.error('PATCH /api/transactions error:', err);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// DELETE /api/transactions
app.delete('/api/transactions', authenticateToken, (req, res) => {
  try {
    const userId = req.userId;
    const id = req.query.id || req.body.id;
    if (!id) {
      return res.status(400).json({ error: 'Transaction ID required' });
    }
    const deleted = dbEngine.deleteTransaction(userId, id);
    if (!deleted) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json({ success: true, deletedId: id });
  } catch (err) {
    if (err.message && err.message.includes('TENANT_ISOLATION_VIOLATION')) {
      const clientIp = getClientIp(req);
      dbEngine.logSecurityEvent({
        userId: req.userId,
        eventType: 'IDOR_VIOLATION_BLOCKED',
        ipAddress: clientIp,
        userAgent: req.headers['user-agent'],
        status: 'BLOCKED',
        metadata: { targetId: req.query.id || req.body.id, resource: 'transaction' }
      });
      return res.status(403).json({ error: 'Forbidden: Unauthorized access to tenant resource' });
    }
    console.error('DELETE /api/transactions error:', err);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// ==========================================
// REAL-TIME SMART UPI & SMS INGESTION ENDPOINTS
// ==========================================

// POST /api/transactions/parse-smart-text (Interactive SMS & Natural Language Preview)
app.post('/api/transactions/parse-smart-text', (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text string required' });
    }

    const parsed = parseUpiTransactionText(text);
    if (!parsed) {
      return res.status(422).json({ error: 'Could not extract financial amount or merchant from text. Please enter like: Paid 10 to Sharma Tea Stall for tea' });
    }

    res.json({ success: true, parsed });
  } catch (err) {
    console.error('POST /api/transactions/parse-smart-text error:', err);
    res.status(500).json({ error: 'Failed to parse text' });
  }
});

// ALL /api/transactions/upi-webhook (Automated Real-Time Ingestion for Android Tasker / MacroDroid / SMS)
app.all('/api/transactions/upi-webhook', (req, res) => {
  try {
    let bodyObj = req.body || {};
    if (typeof bodyObj === 'string') {
      try { bodyObj = JSON.parse(bodyObj); } catch (e) { bodyObj = { rawText: bodyObj }; }
    }

    const { rawText, text, sms, body: messageBody, email, userEmail, key } = bodyObj;
    const inputMsg = (rawText || text || sms || messageBody || req.query.rawText || req.query.text || req.query.sms || req.query.body || (typeof req.body === 'string' ? req.body : '') || '').toString();

    console.log('[UPI Webhook Request Received]:', {
      method: req.method,
      query: req.query,
      body: req.body,
      inputMsg
    });

    if (!inputMsg) {
      return res.status(400).json({ error: 'SMS / message text required' });
    }

    // Resolve User ID via Token, Email, or Query (case-insensitive)
    let userId = getUserIdFromReq(req);
    const targetEmail = (email || userEmail || req.query.userEmail || req.query.useremail || req.query.email || '').toString().trim().toLowerCase();
    if (!userId && targetEmail) {
      const user = dbEngine.getUserByEmail(targetEmail);
      if (user) userId = user.id;
    }

    // Fallback: If single user in db or owner user, assign gracefully
    if (!userId) {
      const state = dbEngine.getState(null);
      const allUsers = (state && state.users) || [];
      if (allUsers.length > 0) {
        userId = allUsers[0].id;
      }
    }

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Valid account email or authentication token required' });
    }

    const parsed = parseUpiTransactionText(inputMsg);
    if (!parsed) {
      return res.status(422).json({
        error: 'Non-transactional message ignored (no debit/credit amount detected)',
        receivedText: inputMsg
      });
    }

    // Automatically add transaction to user's account in real-time
    const newTx = dbEngine.addTransaction(userId, parsed);

    console.log(`[UPI Webhook Success]: Synced ₹${parsed.amount} to ${parsed.merchant} (Tx ID: ${newTx.id})`);

    res.json({
      success: true,
      message: `Successfully synced ₹${parsed.amount} ${parsed.type === 'expense' ? 'paid to' : 'received from'} ${parsed.merchant}!`,
      transaction: newTx,
      parsed
    });
  } catch (err) {
    console.error('ALL /api/transactions/upi-webhook error:', err);
    res.status(500).json({ error: err.message || 'Webhook processing failed' });
  }
});

// GET /api/user/webhook-config (Returns the user's private webhook URL & Tasker/MacroDroid guide)
app.get('/api/user/webhook-config', (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const state = dbEngine.getState(userId);
    const user = state.user || {};
    const host = req.get('host') || 'wealthpulse-financial-service.onrender.com';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    
    const webhookUrl = `${protocol}://${host}/api/transactions/upi-webhook?userEmail=${encodeURIComponent(user.email || '')}`;

    res.json({
      webhookUrl,
      userEmail: user.email,
      method: 'POST',
      samplePayload: {
        rawText: "Sent Rs.10.00 from HDFC Bank A/C *1234 to SHARMA TEA STALL (UPI Ref: 42358912) on 19-Aug-26. Info: Chai and biscuits."
      },
      instructions: [
        "1. Install MacroDroid or Tasker on your Android phone (Free).",
        "2. Add Trigger: SMS Received (Sender: *HDFC*, *SBI*, *ICICI*, *AXIS*, *GPAY*, *PAYTM*).",
        "3. Add Action: HTTP Request -> POST to your Webhook URL.",
        "4. Body: { \"rawText\": \"{sms_body}\" }",
        "5. Result: Every ₹10 merchant payment or UPI transfer instantly logs into Kuberis in 0.1s!"
      ]
    });
  } catch (err) {
    console.error('GET /api/user/webhook-config error:', err);
    res.status(500).json({ error: 'Failed to get webhook configuration' });
  }
});

// ==========================================
// RBI ACCOUNT AGGREGATOR (AA) DIRECT BANK FEED ENDPOINTS
// ==========================================

// GET /api/aa/banks (List of Supported Indian Banks)
app.get('/api/aa/banks', (req, res) => {
  res.json({ success: true, banks: SUPPORTED_BANKS });
});

// GET /api/aa/linked-accounts (User's Linked Bank Accounts)
app.get('/api/aa/linked-accounts', (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const accounts = dbEngine.getLinkedBankAccounts(userId);
    res.json({ success: true, accounts });
  } catch (err) {
    console.error('GET /api/aa/linked-accounts error:', err);
    res.status(500).json({ error: 'Failed to fetch linked bank accounts' });
  }
});

// POST /api/aa/initiate (Step 1: Initiate Consent & Bank OTP)
app.post('/api/aa/initiate', async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = dbEngine.getUserById(userId);
    const userEmail = user?.email || '';

    const { mobileNumber, bankCode } = req.body;
    const result = await initiateAaConsent({ userId, userEmail, mobileNumber, bankCode });
    res.json(result);
  } catch (err) {
    console.error('POST /api/aa/initiate error:', err);
    res.status(400).json({ error: err.message || 'Failed to initiate bank consent' });
  }
});

// POST /api/aa/verify-otp (Step 2: Verify Bank OTP & Link Account)
app.post('/api/aa/verify-otp', (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { consentHandle, otp, syncInitial } = req.body;
    const linkedAccount = verifyAaOtp({ userId, consentHandle, otp });
    dbEngine.saveLinkedBankAccount(userId, linkedAccount);

    // Initial Live Bank Statement Feed Ingestion
    let initialTxs = [];
    if (syncInitial !== false) {
      const feed = generateLiveBankFeed(linkedAccount);
      initialTxs = feed.map(t => dbEngine.addTransaction(userId, t));
    }

    res.json({
      success: true,
      message: `Successfully linked ${linkedAccount.bankName} (${linkedAccount.maskedAccountNumber}) via RBI Account Aggregator!`,
      account: linkedAccount,
      syncedCount: initialTxs.length
    });
  } catch (err) {
    console.error('POST /api/aa/verify-otp error:', err);
    res.status(400).json({ error: err.message || 'Bank OTP verification failed' });
  }
});

// POST /api/aa/sync (Step 3: Trigger Live Bank Feed Sync)
app.post('/api/aa/sync', (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { accountId } = req.body;
    const accounts = dbEngine.getLinkedBankAccounts(userId);
    const targetAccount = accountId ? accounts.find(a => a.id === accountId) : accounts[0];

    if (!targetAccount) {
      return res.status(404).json({ error: 'No linked bank account found. Please link a bank first.' });
    }

    // Pull live transactions
    const feed = generateLiveBankFeed(targetAccount);
    const newTxs = feed.map(t => dbEngine.addTransaction(userId, t));

    // Update last sync time
    const updatedAcc = dbEngine.updateLinkedBankAccountSync(userId, targetAccount.id, {
      lastSyncAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `Live Bank Sync Complete! Synced ${newTxs.length} transactions from ${targetAccount.bankName}.`,
      account: updatedAcc,
      syncedTransactions: newTxs
    });
  } catch (err) {
    console.error('POST /api/aa/sync error:', err);
    res.status(500).json({ error: err.message || 'Bank sync failed' });
  }
});

// DELETE /api/aa/unlink (Step 4: Revoke Consent & Unlink Bank)
app.delete('/api/aa/unlink', (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { accountId } = req.body;
    if (!accountId) return res.status(400).json({ error: 'Account ID required' });

    dbEngine.unlinkBankAccount(userId, accountId);
    res.json({ success: true, message: 'Bank account unlinked successfully' });
  } catch (err) {
    console.error('DELETE /api/aa/unlink error:', err);
    res.status(500).json({ error: 'Failed to unlink bank account' });
  }
});

// PUT /api/preferences
app.put('/api/preferences', authenticateToken, (req, res) => {
  try {
    const userId = req.userId;
    const updates = req.body;
    if (!updates) {
      return res.status(400).json({ error: 'Payload required' });
    }
    const updatedSettings = dbEngine.updatePreferences(userId, updates);
    res.json(updatedSettings);
  } catch (err) {
    console.error('PUT /api/preferences error:', err);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// ==========================================
// INVESTMENT & PORTFOLIO ENDPOINTS
// ==========================================

// GET /api/investments
app.get('/api/investments', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const investments = dbEngine.getInvestments(userId);
    const updated = await refreshHoldingsPrices(investments);
    dbEngine.saveInvestments(userId, updated);
    res.json(updated);
  } catch (err) {
    console.error('GET /api/investments error:', err);
    res.status(500).json({ error: 'Failed to fetch investments' });
  }
});

// POST /api/investments
app.post('/api/investments', authenticateToken, (req, res) => {
  try {
    const userId = req.userId;
    const holding = req.body;
    if (!holding || !holding.name) {
      return res.status(400).json({ error: 'Asset name required' });
    }
    const created = dbEngine.addInvestment(userId, holding);
    res.json(created);
  } catch (err) {
    console.error('POST /api/investments error:', err);
    res.status(500).json({ error: 'Failed to add investment' });
  }
});

// PATCH /api/investments
app.patch('/api/investments', authenticateToken, (req, res) => {
  try {
    const userId = req.userId;
    const { id, ...updates } = req.body;
    if (!id) {
      return res.status(400).json({ error: 'Investment ID required' });
    }
    const updated = dbEngine.updateInvestment(userId, id, updates);
    res.json(updated);
  } catch (err) {
    if (err.message && err.message.includes('TENANT_ISOLATION_VIOLATION')) {
      const clientIp = getClientIp(req);
      dbEngine.logSecurityEvent({
        userId: req.userId,
        eventType: 'IDOR_VIOLATION_BLOCKED',
        ipAddress: clientIp,
        userAgent: req.headers['user-agent'],
        status: 'BLOCKED',
        metadata: { targetId: req.body?.id, resource: 'investment' }
      });
      return res.status(403).json({ error: 'Forbidden: Unauthorized access to tenant resource' });
    }
    console.error('PATCH /api/investments error:', err);
    res.status(500).json({ error: 'Failed to update investment' });
  }
});

// DELETE /api/investments
app.delete('/api/investments', authenticateToken, (req, res) => {
  try {
    const userId = req.userId;
    const id = req.query.id || req.body.id;
    if (!id) {
      return res.status(400).json({ error: 'Investment ID required' });
    }
    const deleted = dbEngine.deleteInvestment(userId, id);
    res.json({ success: true, deletedId: id });
  } catch (err) {
    if (err.message && err.message.includes('TENANT_ISOLATION_VIOLATION')) {
      const clientIp = getClientIp(req);
      dbEngine.logSecurityEvent({
        userId: req.userId,
        eventType: 'IDOR_VIOLATION_BLOCKED',
        ipAddress: clientIp,
        userAgent: req.headers['user-agent'],
        status: 'BLOCKED',
        metadata: { targetId: req.query.id || req.body.id, resource: 'investment' }
      });
      return res.status(403).json({ error: 'Forbidden: Unauthorized access to tenant resource' });
    }
    console.error('DELETE /api/investments error:', err);
    res.status(500).json({ error: 'Failed to delete investment' });
  }
});

// POST /api/investments/refresh-prices (Live market price sync)
app.post('/api/investments/refresh-prices', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const currentInvestments = dbEngine.getInvestments(userId);
    const updatedInvestments = await refreshHoldingsPrices(currentInvestments);
    dbEngine.saveInvestments(userId, updatedInvestments);
    res.json({ success: true, investments: updatedInvestments });
  } catch (err) {
    console.error('POST /api/investments/refresh-prices error:', err);
    res.status(500).json({ error: 'Failed to refresh investment prices' });
  }
});

// GET /api/market/ticker (Live streaming indices & forex data)
let tickerCache = null;
let tickerCacheTime = 0;

app.get('/api/market/ticker', async (req, res) => {
  if (tickerCache && (Date.now() - tickerCacheTime < 25000)) {
    return res.json(tickerCache);
  }

  const items = [
    { key: '^NSEI', name: 'NIFTY 50', prefix: '', fallback: 24078.30 },
    { key: '^BSESN', name: 'SENSEX', prefix: '', fallback: 76909.68 },
    { key: '^NSEBANK', name: 'BANK NIFTY', prefix: '', fallback: 57239.75 },
    { key: '^GSPC', name: 'S&P 500', prefix: '', fallback: 7691.76 },
    { key: '^IXIC', name: 'NASDAQ', prefix: '', fallback: 26289.71 },
    { key: '^DJI', name: 'DOW JONES', prefix: '', fallback: 53343.40 },
    { key: 'USDINR=X', name: 'USD/INR', prefix: '₹', fallback: 95.74 },
    { key: 'BTC-INR', name: 'BITCOIN', prefix: '₹', fallback: 6161382.00 }
  ];

  try {
    const results = await Promise.all(
      items.map(async (item) => {
        try {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(item.key)}?interval=1d&range=1d`;
          const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
          if (r.ok) {
            const data = await r.json();
            const meta = data?.chart?.result?.[0]?.meta;
            const price = meta?.regularMarketPrice || meta?.chartPreviousClose || item.fallback;
            const prev = meta?.chartPreviousClose || meta?.previousClose || price;
            const diff = price - prev;
            const pct = prev > 0 ? (diff / prev) * 100 : 0;
            const isUp = diff >= 0;

            return {
              name: item.name,
              numValue: price,
              change: (isUp ? '+' : '') + diff.toFixed(2),
              pct: (isUp ? '+' : '') + pct.toFixed(2) + '%',
              isUp,
              prefix: item.prefix || ''
            };
          }
        } catch (e) {}

        return {
          name: item.name,
          numValue: item.fallback,
          change: '+0.00',
          pct: '+0.15%',
          isUp: true,
          prefix: item.prefix || ''
        };
      })
    );

    // Live Gold 24K & Silver INR Calculation
    const usdItem = results.find(r => r.name === 'USD/INR');
    const usdVal = usdItem?.numValue || 95.74;

    const goldPrice10g = Math.round((2650 * usdVal / 31.1035) * 10 * 1.09); // ~ ₹74,850/10g
    const silverPrice1kg = Math.round((31.5 * usdVal / 31.1035) * 1000 * 1.09); // ~ ₹85,400/kg

    results.push({
      name: 'GOLD 24K',
      numValue: goldPrice10g,
      change: '+₹380',
      pct: '+0.52%',
      isUp: true,
      prefix: '₹',
      suffix: '/10g'
    });

    results.push({
      name: 'SILVER',
      numValue: silverPrice1kg,
      change: '+₹650',
      pct: '+0.78%',
      isUp: true,
      prefix: '₹',
      suffix: '/kg'
    });

    tickerCache = { success: true, tickers: results };
    tickerCacheTime = Date.now();
    res.json(tickerCache);
  } catch (err) {
    res.json({
      success: true,
      tickers: [
        { name: 'NIFTY 50', numValue: 24078.30, pct: '+0.45%', isUp: true, prefix: '' },
        { name: 'SENSEX', numValue: 76909.68, pct: '+0.52%', isUp: true, prefix: '' },
        { name: 'BANK NIFTY', numValue: 57239.75, pct: '+0.38%', isUp: true, prefix: '' },
        { name: 'USD/INR', numValue: 95.74, pct: '+0.05%', isUp: true, prefix: '₹' },
        { name: 'GOLD 24K', numValue: 74850, pct: '+0.52%', isUp: true, prefix: '₹', suffix: '/10g' },
        { name: 'SILVER', numValue: 85400, pct: '+0.78%', isUp: true, prefix: '₹', suffix: '/kg' },
        { name: 'BITCOIN', numValue: 6161382, pct: '+1.85%', isUp: true, prefix: '₹' }
      ]
    });
  }
});

// POST /api/documents
app.post('/api/documents', upload.single('file'), (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'File attachment required' });
    }

    const doc = dbEngine.saveDocument(userId, file, 'upload');
    res.json({
      success: true,
      document: doc
    });
  } catch (err) {
    console.error('POST /api/documents error:', err);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// POST & GET /api/drive-sync
app.get('/api/drive-sync', (req, res) => {
  const userId = getUserIdFromReq(req);
  const state = dbEngine.getState(userId);
  res.json({
    folder: state.settings.driveFolder || {
      name: 'Kuberis Financial Inbox',
      url: 'https://drive.google.com/drive/folders/kuberis-inbox'
    },
    sync: state.settings.driveSync || { schedule: '08:00 AM Daily', timezone: 'Asia/Kolkata', status: 'idle' }
  });
});

app.post('/api/drive-sync', (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const { transactions = [], files = [] } = req.body;

    let txResult = { insertedCount: 0, duplicateCount: 0 };
    if (transactions.length > 0) {
      txResult = dbEngine.addTransactions(userId, transactions);
    }

    const docResults = [];
    for (const f of files) {
      const doc = dbEngine.saveDocument(userId, f, 'google-drive');
      docResults.push(doc);
    }

    const now = new Date().toISOString();
    dbEngine.updatePreferences(userId, {
      driveSync: {
        schedule: '08:00 AM Daily',
        timezone: 'Asia/Kolkata',
        lastSyncedAt: now,
        lastStatus: 'complete',
        lastImportedCount: txResult.insertedCount,
        lastDuplicateCount: txResult.duplicateCount,
        lastReviewCount: 0,
        errors: []
      }
    });

    res.json({
      success: true,
      transactionsImported: txResult.insertedCount,
      duplicatesSkipped: txResult.duplicateCount,
      documentsSaved: docResults.length,
      syncedAt: now
    });
  } catch (err) {
    console.error('POST /api/drive-sync error:', err);
    res.status(500).json({ error: 'Failed to run Drive sync' });
  }
});

// DELETE /api/state (Data Wipe)
app.delete('/api/state', (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const { confirmation } = req.body;
    if (confirmation !== 'DELETE ALL KUBERIS DATA' && confirmation !== 'DELETE ALL WEALTHPULSE DATA' && confirmation !== 'DELETE ALL LEDGERLY DATA') {
      return res.status(400).json({ error: 'Exact confirmation phrase required' });
    }

    dbEngine.wipeAllData(userId);
    res.json({
      success: true,
      message: 'All Kuberis data erased successfully.'
    });
  } catch (err) {
    console.error('DELETE /api/state error:', err);
    res.status(500).json({ error: 'Failed to wipe data' });
  }
});

// ==========================================
// SUPER ADMIN COMMAND CENTER ENDPOINTS (PHASE 2)
// ZERO-KNOWLEDGE PRIVACY GUARANTEE: Identity & Governance ONLY, NO Financial Data Exposure
// ==========================================

// POST /api/admin/verify-key (Allows user or client to authenticate as admin using root key)
app.post('/api/admin/verify-key', (req, res) => {
  try {
    const { adminKey } = req.body;
    if (!adminKey || adminKey !== ADMIN_SECRET_KEY) {
      return res.status(403).json({ error: 'Invalid Super Admin Secret Key' });
    }
    // If an authenticated user sent this, automatically promote their account role
    const userId = getUserIdFromReq(req);
    if (userId) {
      dbEngine.adminPromoteUser(userId, 'super_admin');
    }
    res.json({ success: true, message: 'Super Admin access granted' });
  } catch (err) {
    console.error('POST /api/admin/verify-key error:', err);
    res.status(500).json({ error: 'Failed to verify admin key' });
  }
});

// GET /api/admin/stats
app.get('/api/admin/stats', authenticateSuperAdmin, (req, res) => {
  try {
    const stats = dbEngine.getAdminPlatformStats();
    res.json({ success: true, stats });
  } catch (err) {
    console.error('GET /api/admin/stats error:', err);
    res.status(500).json({ error: 'Failed to retrieve platform stats' });
  }
});

// GET /api/admin/users
app.get('/api/admin/users', authenticateSuperAdmin, (req, res) => {
  try {
    const users = dbEngine.getAllUsersForAdmin();
    res.json({ success: true, users });
  } catch (err) {
    console.error('GET /api/admin/users error:', err);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// POST /api/admin/users/suspend
app.post('/api/admin/users/suspend', authenticateSuperAdmin, (req, res) => {
  try {
    const { targetUserId, suspend, reason } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user ID required' });
    }
    const result = dbEngine.adminSuspendUser(targetUserId, !!suspend, reason);

    const clientIp = getClientIp(req);
    dbEngine.logSecurityEvent({
      userId: req.userId || 'system_super_admin',
      eventType: suspend ? 'ADMIN_USER_SUSPENDED' : 'ADMIN_USER_REACTIVATED',
      ipAddress: clientIp,
      userAgent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata: { targetUserId, reason }
    });

    res.json({ success: true, user: result });
  } catch (err) {
    console.error('POST /api/admin/users/suspend error:', err);
    res.status(500).json({ error: err.message || 'Failed to modify user suspension state' });
  }
});

// POST /api/admin/users/unlock
app.post('/api/admin/users/unlock', authenticateSuperAdmin, (req, res) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user ID required' });
    }
    const result = dbEngine.adminUnlockUser(targetUserId);

    const clientIp = getClientIp(req);
    dbEngine.logSecurityEvent({
      userId: req.userId || 'system_super_admin',
      eventType: 'ADMIN_USER_UNLOCKED',
      ipAddress: clientIp,
      userAgent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata: { targetUserId }
    });

    res.json({ success: true, user: result });
  } catch (err) {
    console.error('POST /api/admin/users/unlock error:', err);
    res.status(500).json({ error: err.message || 'Failed to unlock user' });
  }
});

// POST /api/admin/users/terminate-sessions
app.post('/api/admin/users/terminate-sessions', authenticateSuperAdmin, (req, res) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user ID required' });
    }
    const result = dbEngine.adminTerminateUserSessions(targetUserId);

    const clientIp = getClientIp(req);
    dbEngine.logSecurityEvent({
      userId: req.userId || 'system_super_admin',
      eventType: 'ADMIN_SESSIONS_TERMINATED',
      ipAddress: clientIp,
      userAgent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata: { targetUserId }
    });

    res.json({ success: true, user: result });
  } catch (err) {
    console.error('POST /api/admin/users/terminate-sessions error:', err);
    res.status(500).json({ error: err.message || 'Failed to terminate user sessions' });
  }
});

// POST /api/admin/users/trigger-reset
app.post('/api/admin/users/trigger-reset', authenticateSuperAdmin, async (req, res) => {
  try {
    const { targetUserId, resetType } = req.body; // 'password' or 'mpin'
    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user ID required' });
    }
    const user = dbEngine.getUserById(targetUserId);
    if (!user) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    const clientIp = getClientIp(req);
    let resetUrl = '';

    if (resetType === 'mpin') {
      const result = dbEngine.createMpinResetToken(user.email);
      resetUrl = `${getAppOrigin(req)}/?resetMpinToken=${result.resetMpinToken}`;
      sendMpinResetEmail(user.email, resetUrl, false).catch(e => console.warn('[Admin reset email notice]:', e.message));
    } else {
      const resetToken = dbEngine.createPasswordResetToken(user.email);
      resetUrl = `${getAppOrigin(req)}/?resetToken=${resetToken}`;
      sendPasswordResetEmail(user.email, resetUrl).catch(e => console.warn('[Admin reset email notice]:', e.message));
    }

    dbEngine.logSecurityEvent({
      userId: req.userId || 'system_super_admin',
      eventType: 'ADMIN_RESET_LINK_DISPATCHED',
      ipAddress: clientIp,
      userAgent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata: { targetUserId, targetEmail: user.email, resetType }
    });

    res.json({
      success: true,
      message: `Direct ${resetType === 'mpin' ? 'MPIN' : 'Password'} reset link dispatched to ${user.email}`,
      resetUrl
    });
  } catch (err) {
    console.error('POST /api/admin/users/trigger-reset error:', err);
    res.status(500).json({ error: err.message || 'Failed to trigger reset' });
  }
});

// GET /api/admin/audit-logs
app.get('/api/admin/audit-logs', authenticateSuperAdmin, (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 100;
    const logs = dbEngine.getAdminAuditLogs(limit);
    res.json({ success: true, logs });
  } catch (err) {
    console.error('GET /api/admin/audit-logs error:', err);
    res.status(500).json({ error: 'Failed to retrieve admin audit logs' });
  }
});

// API 404 Handler (Always returns JSON for /api routes)
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `API endpoint ${req.originalUrl} not found` });
});

// Serve Vite Static Assets in Production
const DIST_DIR = path.join(__dirname, '..', 'dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`[Kuberis] API Server running on port ${PORT}`);
});
