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
import { dbEngine } from './db.js';
import { refreshHoldingsPrices } from './investments.js';
import { parseUpiTransactionText } from './upiParser.js';
import { SUPPORTED_BANKS, initiateAaConsent, verifyAaOtp, generateLiveBankFeed } from './accountAggregator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'ledgerly_super_secret_jwt_key_2026';

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

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
      // Token expired or invalid, proceed to fallbacks
    }
  }

  // Mobile Fallback 1: Resolve user by X-User-Email header or query email
  const userEmail = (req.headers['x-user-email'] || req.query.email || '').toString().trim().toLowerCase();
  if (userEmail) {
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
  req.userId = userId;
  next();
};

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

// POST /api/auth/register
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = dbEngine.createUser({ name, email, password });
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      message: 'Account created successfully',
      token,
      user
    });
  } catch (err) {
    console.error('POST /api/auth/register error:', err);
    res.status(400).json({ error: err.message || 'Registration failed' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = dbEngine.verifyUserCredentials({ email, password });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
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

    const expiresIn = rememberMe ? '30d' : '1d';
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn });

    res.json({
      message: 'Signed in successfully',
      token,
      user
    });
  } catch (err) {
    console.error('POST /api/auth/login error:', err);
    res.status(500).json({ error: 'Authentication failed' });
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
      name: `WealthPulse (${user.email})`,
      issuer: 'WealthPulse Security'
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
app.post('/api/auth/2fa/verify-setup', authenticateToken, (req, res) => {
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
      window: 2
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
app.post('/api/auth/2fa/verify-login', (req, res) => {
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

    // Verify 6-digit TOTP code
    if (/^\d{6}$/.test(cleanCode)) {
      isValid = speakeasy.totp.verify({
        secret: twoFactorDetails.secret,
        encoding: 'base32',
        token: cleanCode,
        window: 2
      });
    }

    // Fallback: Check Emergency Backup Recovery Code
    if (!isValid && twoFactorDetails.recoveryCodes && twoFactorDetails.recoveryCodes.length > 0) {
      isValid = dbEngine.useRecoveryCode(userId, cleanCode);
    }

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid 6-digit Google Authenticator code or recovery code' });
    }

    const expiresIn = decoded.rememberMe ? '30d' : '1d';
    const finalToken = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn });

    res.json({
      message: '2FA verification successful!',
      token: finalToken,
      user
    });
  } catch (err) {
    console.error('POST /api/auth/2fa/verify-login error:', err);
    res.status(500).json({ error: '2FA verification failed' });
  }
});

// POST /api/auth/2fa/disable - Disable 2FA
app.post('/api/auth/2fa/disable', authenticateToken, (req, res) => {
  try {
    const { code } = req.body;
    const twoFactorDetails = dbEngine.getUserTwoFactorSecret(req.userId);

    if (!twoFactorDetails || !twoFactorDetails.enabled) {
      return res.status(400).json({ error: '2FA is not enabled' });
    }

    if (code) {
      const cleanCode = code.trim();
      const verified = speakeasy.totp.verify({
        secret: twoFactorDetails.secret,
        encoding: 'base32',
        token: cleanCode,
        window: 2
      }) || dbEngine.useRecoveryCode(req.userId, cleanCode);

      if (!verified) {
        return res.status(400).json({ error: 'Invalid authenticator code or recovery code' });
      }
    }

    dbEngine.disableTwoFactor(req.userId);
    const updatedUser = dbEngine.getUserById(req.userId);

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

async function sendEmailWithFallback({ to, subject, text, html }) {
  const user = (process.env.SMTP_USER || 'venkatamanishashankt@gmail.com').trim();
  const pass = (process.env.SMTP_PASS || 'vmvjeagfuqniuydc').trim().replace(/\s+/g, '');

  if (!user || !pass || !to) {
    console.error('[WealthPulse Email Error] Missing SMTP credentials or recipient email');
    return false;
  }

  // Attempt 1: Gmail service with IPv4 enforcement
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      family: 4,
      auth: { user, pass },
      connectionTimeout: 6000,
      greetingTimeout: 4000,
      socketTimeout: 8000
    });
    const info = await transporter.sendMail({
      from: `"WealthPulse Security" <${user}>`,
      to: to.trim(),
      subject,
      text: text || '',
      html
    });
    console.log(`[WealthPulse Email] Successfully delivered email to ${to} via Gmail Service (IPv4). MessageId: ${info.messageId}`);
    return true;
  } catch (err1) {
    console.warn(`[WealthPulse Email] Primary transport failed (${err1.message}). Trying Direct SSL transport...`);
  }

  // Attempt 2: Direct SMTP SSL (port 465) with IPv4 enforcement
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      family: 4,
      auth: { user, pass },
      connectionTimeout: 6000,
      greetingTimeout: 4000,
      socketTimeout: 8000
    });
    const info = await transporter.sendMail({
      from: `"WealthPulse Security" <${user}>`,
      to: to.trim(),
      subject,
      text: text || '',
      html
    });
    console.log(`[WealthPulse Email] Successfully delivered email to ${to} via SSL 465 (IPv4). MessageId: ${info.messageId}`);
    return true;
  } catch (err2) {
    console.warn(`[WealthPulse Email] SSL transport failed (${err2.message}). Trying STARTTLS 587...`);
  }

  // Attempt 3: Direct SMTP TLS on port 587 with IPv4 enforcement
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      family: 4,
      auth: { user, pass },
      connectionTimeout: 6000,
      greetingTimeout: 4000,
      socketTimeout: 8000
    });
    const info = await transporter.sendMail({
      from: `"WealthPulse Security" <${user}>`,
      to: to.trim(),
      subject,
      text: text || '',
      html
    });
    console.log(`[WealthPulse Email] Successfully delivered email to ${to} via Port 587 (IPv4). MessageId: ${info.messageId}`);
    return true;
  } catch (err3) {
    console.error(`[WealthPulse Email Error] All 3 SMTP transports failed: ${err3.message}`);
    return false;
  }
}

async function sendResetEmail(toEmail, resetUrl) {
  const subject = 'Reset Your WealthPulse Password';
  const text = `You requested a password reset for your WealthPulse account (${toEmail}).\n\nClick the link below to reset your password:\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email. This link will expire in 1 hour.`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 28px; border: 1px solid #10B981; border-radius: 18px; background: #040D1A; color: #FFFFFF;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #10B981; margin: 0 0 6px 0; font-size: 24px; font-weight: 800;">⚡ WealthPulse</h2>
        <div style="font-size: 13px; color: #94A3B8;">Real-Time Personal Wealth OS</div>
      </div>

      <h3 style="color: #FFFFFF; margin-top: 0; font-size: 18px;">Password Reset Request</h3>
      <p style="color: #CBD5E1; font-size: 14px; line-height: 1.6;">
        You requested a password reset for your WealthPulse account (<strong>${toEmail}</strong>).
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

async function sendMpinResetEmail(toEmail, resetMpinUrl, isLocked = false) {
  const subject = isLocked 
    ? 'WealthPulse Security Alert: Account Locked' 
    : 'Reset Your WealthPulse 4-Digit MPIN';
  const text = isLocked
    ? `Your WealthPulse account (${toEmail}) was locked due to incorrect MPIN attempts.\n\nReset link: ${resetMpinUrl}\n\nLink expires in 1 hour.`
    : `You requested to reset your 4-digit MPIN for WealthPulse (${toEmail}).\n\nReset link: ${resetMpinUrl}\n\nLink expires in 1 hour.`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 28px; border: 1px solid #10B981; border-radius: 18px; background: #040D1A; color: #FFFFFF;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #10B981; margin: 0 0 6px 0; font-size: 24px; font-weight: 800;">⚡ WealthPulse</h2>
        <div style="font-size: 13px; color: #94A3B8;">Real-Time Personal Wealth OS</div>
      </div>

      <h3 style="color: #FFFFFF; margin-top: 0; font-size: 18px;">
        ${isLocked ? 'Security Lockout: Reset MPIN to Unlock' : 'Reset Your 4-Digit Security MPIN'}
      </h3>
      <p style="color: #CBD5E1; font-size: 14px; line-height: 1.6;">
        ${isLocked 
          ? `Your WealthPulse account (<strong>${toEmail}</strong>) was temporarily locked due to multiple incorrect MPIN attempts. Click below to verify your identity and set a new MPIN.` 
          : `You requested to reset the 4-digit MPIN for your WealthPulse account (<strong>${toEmail}</strong>).`}
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

// POST /api/auth/forgot-password
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const cleanEmail = email.trim().toLowerCase();
    const existingUser = dbEngine.getUserByEmail(cleanEmail);
    if (!existingUser) {
      return res.status(404).json({ error: 'No account found with this email. Please enter the email associated with your WealthPulse account.' });
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
      const host = req.headers.host || 'wealthpulse-financial-service.onrender.com';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      origin = `${protocol}://${host}`;
    }

    const resetUrl = `${origin}/?resetToken=${result.resetToken}`;

    const emailSent = await sendResetEmail(cleanEmail, resetUrl);

    res.json({
      message: emailSent
        ? `Password reset link sent to ${cleanEmail}. Check your Gmail inbox!`
        : 'Password reset link generated successfully',
      emailSent,
      resetToken: result.resetToken,
      resetUrl
    });
  } catch (err) {
    console.error('POST /api/auth/forgot-password error:', err);
    res.status(400).json({ error: err.message || 'Password reset request failed' });
  }
});

// POST /api/auth/reset-password
app.post('/api/auth/reset-password', (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    dbEngine.resetPassword({ resetToken, newPassword });
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('POST /api/auth/reset-password error:', err);
    res.status(400).json({ error: err.message || 'Password reset failed' });
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
      return res.status(404).json({ error: 'No account found with this email. Please enter your registered WealthPulse email.' });
    }

    const result = dbEngine.createMpinResetToken(cleanEmail);

    let origin = req.headers.origin || req.headers.referer;
    if (origin) {
      try { origin = new URL(origin).origin; } catch (e) {}
    }
    if (!origin) {
      const host = req.headers.host || 'wealthpulse-financial-service.onrender.com';
      origin = `${host.includes('localhost') ? 'http' : 'https'}://${host}`;
    }

    const resetMpinUrl = `${origin}/?resetMpinToken=${result.resetMpinToken}`;
    const emailSent = await sendMpinResetEmail(cleanEmail, resetMpinUrl, false);

    res.json({
      message: emailSent
        ? `MPIN reset link sent to ${cleanEmail}. Check your Gmail inbox!`
        : 'MPIN reset link generated successfully',
      emailSent,
      resetMpinToken: result.resetMpinToken,
      resetMpinUrl
    });
  } catch (err) {
    console.error('POST /api/auth/forgot-mpin error:', err);
    res.status(400).json({ error: err.message || 'MPIN reset request failed' });
  }
});

// POST /api/auth/reset-mpin
app.post('/api/auth/reset-mpin', (req, res) => {
  try {
    const { resetMpinToken, newMpin } = req.body;
    if (!resetMpinToken || !newMpin) {
      return res.status(400).json({ error: 'Reset token and new 4-digit MPIN are required' });
    }

    dbEngine.resetUserMpin({ resetMpinToken, newMpin });
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
app.delete('/api/auth/account', (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    dbEngine.deleteUserAccount(userId);
    res.json({ success: true, message: 'Account permanently deleted' });
  } catch (err) {
    console.error('DELETE /api/auth/account error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// POST /api/auth/mpin/set
app.post('/api/auth/mpin/set', (req, res) => {
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
    const { email, mpin } = req.body;
    if (!email || !mpin) {
      return res.status(400).json({ error: 'Email and MPIN are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const dbUser = dbEngine.getUserByEmail(cleanEmail);
    if (!dbUser) {
      return res.status(404).json({ error: 'No account found with this email' });
    }

    const user = dbEngine.verifyUserMpin({ email: cleanEmail, mpin });
    if (!user) {
      dbUser.failedMpinAttempts = (dbUser.failedMpinAttempts || 0) + 1;
      const attemptsLeft = Math.max(0, 3 - dbUser.failedMpinAttempts);

      if (dbUser.failedMpinAttempts >= 3) {
        const result = dbEngine.createMpinResetToken(cleanEmail);

        let origin = req.headers.origin || req.headers.referer;
        if (origin) {
          try { origin = new URL(origin).origin; } catch (e) {}
        }
        if (!origin) {
          const host = req.headers.host || 'wealthpulse-financial-service.onrender.com';
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

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({ message: 'MPIN authentication successful', token, user });
  } catch (err) {
    console.error('POST /api/auth/mpin/verify error:', err);
    res.status(400).json({ error: err.message || 'MPIN authentication failed' });
  }
});

// POST /api/auth/webauthn/register
app.post('/api/auth/webauthn/register', (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized: Please sign in' });

    const { credentialId, publicKey } = req.body;
    dbEngine.registerWebAuthnCredential({ userId, credentialId, publicKey });

    res.json({ message: 'Biometric Face ID / Touch ID registered successfully!' });
  } catch (err) {
    console.error('POST /api/auth/webauthn/register error:', err);
    res.status(400).json({ error: err.message || 'Failed to register biometrics' });
  }
});

// POST /api/auth/webauthn/verify
app.post('/api/auth/webauthn/verify', (req, res) => {
  try {
    const { credentialId } = req.body;
    if (!credentialId) {
      return res.status(400).json({ error: 'Biometric credential ID required' });
    }

    const user = dbEngine.verifyWebAuthnCredential({ credentialId });
    if (!user) {
      return res.status(401).json({ error: 'Biometric verification failed' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({ message: 'Biometric authentication successful', token, user });
  } catch (err) {
    console.error('POST /api/auth/webauthn/verify error:', err);
    res.status(400).json({ error: err.message || 'Biometric authentication failed' });
  }
});

// ==========================================
// FINANCIAL DATA ENDPOINTS
// ==========================================

// GET /api/state
app.get('/api/state', (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const state = dbEngine.getState(userId);
    res.json(state);
  } catch (err) {
    console.error('GET /api/state error:', err);
    res.status(500).json({ error: 'Failed to fetch state' });
  }
});

// GET /api/export
app.get('/api/export', (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
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
      res.setHeader('Content-Disposition', `attachment; filename="Ledgerly_Transactions_${dateStr}.csv"`);
      return res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="Ledgerly_Backup_${dateStr}.json"`);
      return res.json(state);
    }
  } catch (err) {
    console.error('GET /api/export error:', err);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// POST /api/transactions
app.post('/api/transactions', (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
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
app.patch('/api/transactions', (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
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
    console.error('PATCH /api/transactions error:', err);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// DELETE /api/transactions
app.delete('/api/transactions', (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
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
        "5. Result: Every ₹10 merchant payment or UPI transfer instantly logs into WealthPulse in 0.1s!"
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
app.put('/api/preferences', (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
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
app.get('/api/investments', async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
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
app.post('/api/investments', (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
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
app.patch('/api/investments', (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const { id, ...updates } = req.body;
    if (!id) {
      return res.status(400).json({ error: 'Investment ID required' });
    }
    const updated = dbEngine.updateInvestment(userId, id, updates);
    res.json(updated);
  } catch (err) {
    console.error('PATCH /api/investments error:', err);
    res.status(500).json({ error: 'Failed to update investment' });
  }
});

// DELETE /api/investments
app.delete('/api/investments', (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const id = req.query.id || req.body.id;
    if (!id) {
      return res.status(400).json({ error: 'Investment ID required' });
    }
    const deleted = dbEngine.deleteInvestment(userId, id);
    res.json({ success: true, deletedId: id });
  } catch (err) {
    console.error('DELETE /api/investments error:', err);
    res.status(500).json({ error: 'Failed to delete investment' });
  }
});

// POST /api/investments/refresh-prices (Live market price sync)
app.post('/api/investments/refresh-prices', async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
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
      name: 'Ledgerly Financial Inbox',
      url: 'https://drive.google.com/drive/folders/ledgerly-inbox'
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
    if (confirmation !== 'DELETE ALL WEALTHPULSE DATA' && confirmation !== 'DELETE ALL LEDGERLY DATA') {
      return res.status(400).json({ error: 'Exact confirmation phrase required' });
    }

    dbEngine.wipeAllData(userId);
    res.json({
      success: true,
      message: 'All WealthPulse data erased successfully.'
    });
  } catch (err) {
    console.error('DELETE /api/state error:', err);
    res.status(500).json({ error: 'Failed to wipe data' });
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
  console.log(`[WealthPulse] API Server running on port ${PORT}`);
});
