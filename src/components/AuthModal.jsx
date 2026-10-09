import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Lock,
  Mail,
  User,
  CheckCircle2,
  AlertCircle,
  Fingerprint,
  KeyRound,
  Shield,
  Delete,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  Smartphone,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { authenticateWithBiometrics, isBiometricsAvailable } from '../utils/biometrics';
import { getDeviceHeaders } from '../utils/deviceInfo';

export default function AuthModal({
  isOpen,
  onClose,
  initialMode = 'login', // 'login' | 'register'
  onLoginSuccess,
  onOpenForgotPassword,
  onOpenMpinModal,
  theme
}) {
  const isLight =
    theme === 'light' ||
    (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light');

  const rememberedEmail =
    (typeof localStorage !== 'undefined' &&
      (localStorage.getItem('kuberis_remembered_email') ||
        localStorage.getItem('wealthpulse_remembered_email') ||
        localStorage.getItem('ledgerly_remembered_email'))) ||
    '';

  const hasStoredMpin =
    typeof localStorage !== 'undefined' &&
    (localStorage.getItem('kuberis_has_mpin') === 'true' ||
      localStorage.getItem('wealthpulse_has_mpin') === 'true' ||
      localStorage.getItem('ledgerly_has_mpin') === 'true');

  const [authMethod, setAuthMethod] = useState(() => (initialMode === 'register' ? 'register' : 'password'));

  // Separate State for Sign In vs Register
  const [signInEmail, setSignInEmail] = useState(rememberedEmail);
  const [signInPassword, setSignInPassword] = useState('');

  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');

  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [mpin, setMpin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorShakeKey, setErrorShakeKey] = useState(0);
  const [success, setSuccess] = useState('');
  const [biometricSupported, setBiometricSupported] = useState(false);

  // Strict MPIN status verification from database
  const [emailHasMpin, setEmailHasMpin] = useState(false);
  const [emailHasBiometrics, setEmailHasBiometrics] = useState(false);

  const [isAccountSuspended, setIsAccountSuspended] = useState(false);
  const [suspendedReason, setSuspendedReason] = useState('');
  const [pendingSessionOverride, setPendingSessionOverride] = useState(null);
  const [totpTempToken, setTotpTempToken] = useState('');
  const [totpCode, setTotpCode] = useState('');

  // Responsive screen detection
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false));

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const triggerError = (msg) => {
    setError(msg);
    setErrorShakeKey((prev) => prev + 1);
  };

  // Check auth methods for given email
  const checkEmailAuthMethods = useCallback((targetEmail) => {
    if (!targetEmail || !targetEmail.includes('@')) {
      setEmailHasMpin(false);
      setEmailHasBiometrics(false);
      return;
    }
    fetch('/api/auth/check-methods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: targetEmail.trim() })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.isSuspended) {
          setIsAccountSuspended(true);
          setSuspendedReason(data.suspendedReason || 'Policy compliance review');
          triggerError(`Account Suspended: ${data.suspendedReason || 'Contact platform administration.'}`);
          return;
        }
        if (data.hasMpin) {
          setEmailHasMpin(true);
          localStorage.setItem('kuberis_has_mpin', 'true');
        } else {
          setEmailHasMpin(false);
        }
        if (data.hasBiometrics) {
          setEmailHasBiometrics(true);
        } else {
          setEmailHasBiometrics(false);
        }
      })
      .catch(() => {
        if (hasStoredMpin) setEmailHasMpin(true);
      });
  }, [hasStoredMpin]);

  // Synchronize when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setMpin('');
    setError('');
    setSuccess('');
    setIsAccountSuspended(false);
    setSuspendedReason('');
    setPendingSessionOverride(null);
    setTotpCode('');

    isBiometricsAvailable().then(setBiometricSupported);

    if (initialMode === 'register') {
      setAuthMethod('register');
      setRegisterName('');
      setRegisterEmail('');
      setRegisterPassword('');
      setRegisterConfirmPassword('');
    } else {
      setAuthMethod('password');
      const savedEmail =
        localStorage.getItem('kuberis_remembered_email') ||
        localStorage.getItem('wealthpulse_remembered_email') ||
        localStorage.getItem('ledgerly_remembered_email') ||
        '';
      setSignInEmail(savedEmail);
      if (savedEmail) {
        checkEmailAuthMethods(savedEmail);
      }
    }
  }, [initialMode, isOpen, checkEmailAuthMethods]);

  const handleSignInEmailChange = (val) => {
    setSignInEmail(val);
    setEmailHasMpin(false);
    setEmailHasBiometrics(false);
    setIsAccountSuspended(false);
    setSuspendedReason('');
    if (val && val.includes('@')) {
      checkEmailAuthMethods(val);
    }
  };

  const handleClearRemembered = () => {
    localStorage.removeItem('kuberis_remembered_email');
    localStorage.removeItem('wealthpulse_remembered_email');
    localStorage.removeItem('ledgerly_remembered_email');
    localStorage.removeItem('kuberis_has_mpin');
    localStorage.removeItem('kuberis_has_biometrics');
    setSignInEmail('');
    setSignInPassword('');
    setMpin('');
    setEmailHasMpin(false);
    setEmailHasBiometrics(false);
    setAuthMethod('password');
  };

  const getInitials = (em) => {
    if (!em) return 'U';
    const clean = em.split('@')[0];
    return clean.slice(0, 2).toUpperCase();
  };

  // MPIN Keypad handlers
  const handleKeyPress = useCallback(
    (digit) => {
      if (loading || isAccountSuspended || authMethod !== 'mpin') return;
      if (mpin.length < 4) {
        const nextMpin = mpin + digit;
        setMpin(nextMpin);
        if (nextMpin.length === 4) {
          handleVerifyMpin(nextMpin);
        }
      }
    },
    [mpin, loading, authMethod, isAccountSuspended]
  );

  const handleDeleteMpin = useCallback(() => {
    if (loading || authMethod !== 'mpin') return;
    setMpin((prev) => prev.slice(0, -1));
  }, [loading, authMethod]);

  useEffect(() => {
    if (!isOpen || authMethod !== 'mpin') return;
    const handleKeyDown = (e) => {
      const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteMpin();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, authMethod, handleKeyPress, handleDeleteMpin]);

  const handleVerifyMpin = async (completedMpin) => {
    setLoading(true);
    setError('');
    try {
      const targetEmail = (signInEmail || rememberedEmail || '').trim();
      if (!targetEmail) {
        throw new Error('Please enter your email address first.');
      }
      const res = await fetch('/api/auth/mpin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getDeviceHeaders() },
        body: JSON.stringify({ email: targetEmail, mpin: completedMpin })
      });

      const responseText = await res.text();
      let json = {};
      try {
        json = JSON.parse(responseText);
      } catch (e) {
        throw new Error('API server connection lost.');
      }

      if (!res.ok) {
        if (json.code === 'ACCOUNT_SUSPENDED' || res.status === 403) {
          setIsAccountSuspended(true);
          setSuspendedReason(json.error || 'Your account has been administratively suspended.');
          throw new Error(json.error || 'Account suspended. Contact administrator.');
        }
        if (json.locked || res.status === 423) {
          throw new Error(
            json.error || 'Account locked: 3 incorrect MPIN attempts. An unlock link has been sent to your Gmail inbox.'
          );
        }
        throw new Error(json.error || 'Invalid 4-Digit MPIN');
      }

      if (json.activeSessionExists) {
        setPendingSessionOverride({
          type: 'mpin',
          payload: { email: targetEmail, mpin: completedMpin }
        });
        return;
      }

      localStorage.setItem('kuberis_remembered_email', targetEmail);
      localStorage.setItem('kuberis_has_mpin', 'true');

      if (json.require2FA) {
        setTotpTempToken(json.tempToken);
        setAuthMethod('2fa_challenge');
        setSuccess('Google Authenticator 2FA verification required');
        return;
      }

      setSuccess('MPIN Verified! Unlocking vault...');
      setTimeout(() => {
        onLoginSuccess(json.user, json.token, true, { refreshToken: json.refreshToken });
        onClose();
      }, 400);
    } catch (err) {
      triggerError(err.message || 'MPIN verification failed');
      setMpin('');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotMpin = async () => {
    const targetEmail = (signInEmail || rememberedEmail || '').trim();
    if (!targetEmail) {
      triggerError('Please enter your account email to receive an MPIN reset link');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/auth/forgot-mpin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to send MPIN reset link');

      setTotpTempToken(json.resetMpinToken || '');
      setSuccess(`MPIN reset authorized for ${targetEmail}! Check your inbox to reset.`);
    } catch (err) {
      triggerError(err.message || 'Failed to send MPIN reset link');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async (emailToUse) => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const targetEmail = emailToUse || signInEmail || rememberedEmail;
      const result = await authenticateWithBiometrics(targetEmail);

      if (result.activeSessionExists) {
        setPendingSessionOverride({
          type: 'biometric',
          payload: { email: targetEmail, credentialId: result.credentialId }
        });
        return;
      }

      if (result.require2FA) {
        setTotpTempToken(result.tempToken);
        setAuthMethod('2fa_challenge');
        setSuccess('Google Authenticator 2FA verification required');
        return;
      }

      if (!result.token || !result.user) {
        throw new Error(result.message || 'Biometric verification did not return a valid session.');
      }

      if (targetEmail) {
        localStorage.setItem('kuberis_remembered_email', targetEmail.trim());
      }
      localStorage.setItem('kuberis_has_biometrics', 'true');

      setSuccess('Touch ID / Biometric Verified! Unlocking...');
      setTimeout(() => {
        onLoginSuccess(result.user, result.token, true, { refreshToken: result.refreshToken });
        onClose();
      }, 400);
    } catch (err) {
      triggerError(err.message || 'Biometric scan cancelled or failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getDeviceHeaders() },
        body: JSON.stringify({ email: signInEmail.trim(), password: signInPassword })
      });

      const json = await res.json();
      if (!res.ok) {
        if (json.code === 'ACCOUNT_SUSPENDED' || res.status === 403) {
          setIsAccountSuspended(true);
          setSuspendedReason(json.error || 'Your account has been administratively suspended.');
        }
        throw new Error(json.error || 'Sign in failed');
      }

      if (json.activeSessionExists) {
        setPendingSessionOverride({
          type: 'password',
          payload: { email: signInEmail.trim(), password: signInPassword }
        });
        return;
      }

      if (json.require2FA) {
        setTotpTempToken(json.tempToken);
        setAuthMethod('2fa_challenge');
        setSuccess('Google Authenticator 2FA verification required');
        return;
      }

      if (rememberMe) {
        localStorage.setItem('kuberis_remembered_email', signInEmail.trim());
      }

      setSuccess('Sign in verified! Unlocking dashboard...');
      setTimeout(() => {
        onLoginSuccess(json.user, json.token, rememberMe, { refreshToken: json.refreshToken });
        onClose();
      }, 400);
    } catch (err) {
      triggerError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');
    if (!registerName.trim()) {
      triggerError('Please enter your full name');
      return;
    }
    if (!registerEmail.trim() || !registerEmail.includes('@')) {
      triggerError('Please enter a valid email address');
      return;
    }
    if (registerPassword !== registerConfirmPassword) {
      triggerError('Passwords do not match');
      return;
    }
    if (registerPassword.length < 6) {
      triggerError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getDeviceHeaders() },
        body: JSON.stringify({
          name: registerName.trim(),
          email: registerEmail.trim(),
          password: registerPassword
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Registration failed');

      localStorage.setItem('kuberis_remembered_email', registerEmail.trim());
      setSuccess('Account created successfully! Preparing dashboard...');
      setTimeout(() => {
        onLoginSuccess(json.user, json.token, true, { isNewRegistration: true, refreshToken: json.refreshToken });
        onClose();
      }, 400);
    } catch (err) {
      triggerError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const triggerTwoFactorLogin = async (codeToVerify) => {
    if (!codeToVerify || !codeToVerify.trim()) return;
    setLoading(true);
    setError('');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch('/api/auth/2fa/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getDeviceHeaders() },
        body: JSON.stringify({ tempToken: totpTempToken, code: codeToVerify.trim() }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Invalid 6-digit code. Please try again.');

      const emailToRemember = signInEmail.trim() || rememberedEmail;
      if (rememberMe && emailToRemember) {
        localStorage.setItem('kuberis_remembered_email', emailToRemember);
      }

      setSuccess('2FA Verified! Signing in...');
      setTimeout(() => {
        onLoginSuccess(json.user, json.token, rememberMe, { refreshToken: json.refreshToken });
        onClose();
      }, 400);
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        triggerError('Verification timed out. Please check your internet connection.');
      } else {
        triggerError(err.message || 'Invalid 6-digit code. Please check Google Authenticator.');
      }
      setTotpCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleTotpCodeChange = (raw) => {
    const clean = raw.replace(/\D/g, '').slice(0, 6);
    setTotpCode(clean);
    setError('');
    if (clean.length === 6) {
      triggerTwoFactorLogin(clean);
    }
  };

  const handleConfirmSessionOverride = async () => {
    if (!pendingSessionOverride) return;
    setLoading(true);
    setError('');
    const { type, payload } = pendingSessionOverride;
    setPendingSessionOverride(null);

    try {
      const endpoint = type === 'mpin'
        ? '/api/auth/mpin/verify'
        : type === 'biometric'
          ? '/api/auth/webauthn/verify'
          : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getDeviceHeaders() },
        body: JSON.stringify({ ...payload, forceLogin: true })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Sign in failed');

      if (json.require2FA) {
        setTotpTempToken(json.tempToken);
        setAuthMethod('2fa_challenge');
        setSuccess('Google Authenticator 2FA verification required');
        return;
      }

      localStorage.setItem('kuberis_remembered_email', payload.email);
      if (type === 'mpin') localStorage.setItem('kuberis_has_mpin', 'true');
      if (type === 'biometric') localStorage.setItem('kuberis_has_biometrics', 'true');

      setSuccess('Signed in successfully! Previous session terminated.');
      setTimeout(() => {
        onLoginSuccess(json.user, json.token, true, { refreshToken: json.refreshToken });
        onClose();
      }, 400);
    } catch (err) {
      triggerError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const isRegisterMode = authMethod === 'register';
  const isSpecialMode = authMethod === 'mpin' || authMethod === '2fa_challenge' || authMethod === 'biometrics';

  // Apple Liquid Glass dynamic color tokens
  const cardBg = isLight
    ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.94) 0%, rgba(248, 250, 252, 0.98) 100%)'
    : 'linear-gradient(135deg, rgba(8, 20, 36, 0.95) 0%, rgba(3, 10, 20, 0.98) 100%)';
  const cardBorder = isLight ? 'rgba(16, 185, 129, 0.35)' : 'rgba(16, 185, 129, 0.22)';
  const textHeading = isLight ? '#0F172A' : '#FFFFFF';
  const textSub = isLight ? '#64748B' : '#94A3B8';
  const closeBtnBg = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.06)';
  const closeBtnHoverBg = isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.12)';
  const closeBtnColor = isLight ? '#475569' : '#94A3B8';
  const dividerColor = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="kuberis-auth-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24 }}
          onClick={onClose}
        >
          {/* Main Fluid Animated Apple Liquid Glass Modal Box */}
          <motion.div
            key={`card-shake-${errorShakeKey}`}
            className="kuberis-auth-card"
            initial={{ scale: 0.94, opacity: 0, y: 15 }}
            animate={{
              scale: 1,
              opacity: 1,
              y: 0,
              x: error ? [-10, 10, -6, 6, -3, 3, 0] : 0
            }}
            exit={{ scale: 0.94, opacity: 0, y: 15 }}
            transition={{
              type: 'spring',
              stiffness: 280,
              damping: 25,
              x: { duration: 0.45, ease: 'easeInOut' }
            }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: isLight ? 'rgba(255, 255, 255, 0.94)' : 'rgba(8, 20, 36, 0.88)',
              backdropFilter: 'blur(28px) saturate(190%)',
              WebkitBackdropFilter: 'blur(28px) saturate(190%)',
              borderColor: error ? 'rgba(239, 68, 68, 0.45)' : cardBorder,
              boxShadow: error
                ? isLight
                  ? '0 30px 90px -20px rgba(239, 68, 68, 0.25), 0 0 40px rgba(239, 68, 68, 0.15)'
                  : '0 25px 80px -15px rgba(0, 0, 0, 0.8), 0 0 50px -10px rgba(239, 68, 68, 0.25)'
                : isLight
                ? '0 30px 90px -20px rgba(15, 23, 42, 0.12), 0 0 45px -10px rgba(16, 185, 129, 0.15)'
                : '0 25px 80px -15px rgba(0, 0, 0, 0.8), 0 0 50px -10px rgba(16, 185, 129, 0.15)'
            }}
          >
            {/* Top Glowing Ambient Light Beam */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '60%',
                height: '1.5px',
                background: 'linear-gradient(90deg, transparent 0%, #10B981 50%, transparent 100%)',
                boxShadow: '0 0 20px #10B981',
                zIndex: 10,
                pointerEvents: 'none'
              }}
            />

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: closeBtnBg,
                border: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.1)',
                color: closeBtnColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 40,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = isLight ? '#0F172A' : '#FFFFFF';
                e.currentTarget.style.background = closeBtnHoverBg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = closeBtnColor;
                e.currentTarget.style.background = closeBtnBg;
              }}
            >
              <X size={18} />
            </button>

            {/* MOBILE SEGMENTED SWITCHER */}
            {isMobile && !isSpecialMode && (
              <div style={{ padding: '20px 20px 0 20px', zIndex: 10 }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    padding: '4px',
                    borderRadius: '16px',
                    background: isLight ? 'rgba(226, 232, 240, 0.85)' : 'rgba(5, 15, 30, 0.8)',
                    border: isLight ? '1px solid rgba(203, 213, 225, 0.8)' : '1px solid rgba(255, 255, 255, 0.08)',
                    position: 'relative'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('password');
                      setError('');
                    }}
                    style={{
                      position: 'relative',
                      padding: '10px 16px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: '700',
                      border: 'none',
                      background: 'transparent',
                      color: !isRegisterMode ? '#FFFFFF' : isLight ? '#64748B' : '#94A3B8',
                      cursor: 'pointer',
                      zIndex: 2,
                      transition: 'color 0.2s ease'
                    }}
                  >
                    {!isRegisterMode && (
                      <motion.div
                        layoutId="mobileActiveTab"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                          boxShadow: '0 4px 15px rgba(16, 185, 129, 0.35)',
                          zIndex: -1
                        }}
                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      />
                    )}
                    Sign In
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('register');
                      setError('');
                    }}
                    style={{
                      position: 'relative',
                      padding: '10px 16px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: '700',
                      border: 'none',
                      background: 'transparent',
                      color: isRegisterMode ? '#FFFFFF' : isLight ? '#64748B' : '#94A3B8',
                      cursor: 'pointer',
                      zIndex: 2,
                      transition: 'color 0.2s ease'
                    }}
                  >
                    {isRegisterMode && (
                      <motion.div
                        layoutId="mobileActiveTab"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                          boxShadow: '0 4px 15px rgba(16, 185, 129, 0.35)',
                          zIndex: -1
                        }}
                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      />
                    )}
                    Create Account
                  </button>
                </div>
              </div>
            )}

            {/* SPECIAL SECURITY SUB-VIEWS */}
            {isSpecialMode || isAccountSuspended || pendingSessionOverride ? (
              <div
                style={{
                  flex: 1,
                  padding: '36px 32px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}
              >
                {/* Account Suspended Alert */}
                {isAccountSuspended && (
                  <div style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#EF4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px auto'
                      }}
                    >
                      <AlertTriangle size={32} />
                    </div>
                    <h3 style={{ fontSize: '20px', fontWeight: '800', color: textHeading, marginBottom: '8px' }}>
                      Account Administratively Suspended
                    </h3>
                    <p
                      style={{
                        fontSize: '13px',
                        color: textSub,
                        lineHeight: '1.6',
                        maxWidth: '420px',
                        margin: '0 auto 24px auto'
                      }}
                    >
                      {suspendedReason ||
                        'Your access to the Kuberis Platform has been locked by a Security Administrator. Please contact platform administration.'}
                    </p>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={onClose}
                      style={{ padding: '10px 24px', borderRadius: '12px', fontWeight: '700' }}
                    >
                      Acknowledge & Close
                    </button>
                  </div>
                )}

                {/* Active Session Conflict Prompt */}
                {!isAccountSuspended && pendingSessionOverride && (
                  <div style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        color: '#F59E0B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px auto'
                      }}
                    >
                      <Smartphone size={32} />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: textHeading, marginBottom: '8px' }}>
                      Active Session Detected on Another Device
                    </h3>
                    <p
                      style={{
                        fontSize: '13px',
                        color: textSub,
                        lineHeight: '1.5',
                        maxWidth: '420px',
                        margin: '0 auto 24px auto'
                      }}
                    >
                      Another browser or device currently has an open session for{' '}
                      <strong>{pendingSessionOverride.payload.email}</strong>. To safeguard your financial data,
                      signing in here will instantly terminate the other session.
                    </p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="btn btn-primary"
                        onClick={handleConfirmSessionOverride}
                        disabled={loading}
                        style={{ padding: '10px 24px', borderRadius: '12px', fontWeight: '700' }}
                      >
                        {loading ? 'Terminating & Logging In...' : 'Terminate Other & Sign In'}
                      </motion.button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setPendingSessionOverride(null)}
                        style={{ padding: '10px 20px', borderRadius: '12px' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* 2FA Google Authenticator Challenge */}
                {!isAccountSuspended && !pendingSessionOverride && authMethod === '2fa_challenge' && (
                  <div style={{ maxWidth: '440px', margin: '0 auto', textAlign: 'center', width: '100%' }}>
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '22px',
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.3) 100%)',
                        border: '1.5px solid rgba(16, 185, 129, 0.4)',
                        color: '#10B981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px auto',
                        boxShadow: '0 8px 24px rgba(16, 185, 129, 0.25)'
                      }}
                    >
                      <Shield size={32} />
                    </motion.div>
                    <h3
                      style={{
                        fontSize: '21px',
                        fontWeight: '800',
                        color: textHeading,
                        letterSpacing: '-0.3px',
                        marginBottom: '6px'
                      }}
                    >
                      Two-Factor Authentication
                    </h3>
                    <p style={{ fontSize: '13px', color: textSub, marginBottom: '20px', lineHeight: '1.5' }}>
                      Enter the 6-digit verification code from Google Authenticator on your phone for{' '}
                      <span
                        style={{
                          fontWeight: '700',
                          color: isLight ? '#059669' : '#34D399',
                          wordBreak: 'break-all'
                        }}
                      >
                        {signInEmail || rememberedEmail}
                      </span>
                    </p>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '12px',
                          background: 'rgba(239, 68, 68, 0.14)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#F87171',
                          fontSize: '12px',
                          marginBottom: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <AlertCircle size={15} style={{ flexShrink: 0 }} />
                        <span>{error}</span>
                      </motion.div>
                    )}

                    {/* Wide 6-Digit Container with Zero Wrap */}
                    <div style={{ position: 'relative', width: '100%', maxWidth: '280px', margin: '0 auto 24px auto' }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoFocus
                        maxLength={6}
                        value={totpCode}
                        onChange={(e) => handleTotpCodeChange(e.target.value)}
                        placeholder="000000"
                        style={{
                          width: '100%',
                          fontSize: '30px',
                          fontWeight: '800',
                          letterSpacing: '12px',
                          textAlign: 'center',
                          padding: '12px 16px',
                          borderRadius: '18px',
                          border: isLight ? '1.5px solid rgba(5, 150, 105, 0.4)' : '1.5px solid rgba(16, 185, 129, 0.4)',
                          background: isLight ? 'rgba(241, 245, 249, 0.85)' : 'rgba(5, 15, 30, 0.85)',
                          color: isLight ? '#059669' : '#10B981',
                          outline: 'none',
                          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                          fontFamily: 'monospace',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '14px' }}>
                      <button
                        type="button"
                        onClick={() => setAuthMethod('password')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: textSub,
                          fontSize: '12.5px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <ArrowLeft size={14} /> Back to password login
                      </button>
                    </div>
                  </div>
                )}

                {/* 4-Digit MPIN Keypad Mode */}
                {!isAccountSuspended && !pendingSessionOverride && authMethod === 'mpin' && (
                  <div style={{ maxWidth: '380px', margin: '0 auto', textAlign: 'center', width: '100%' }}>
                    <div
                      style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '18px',
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(5, 150, 105, 0.25) 100%)',
                        border: '1.5px solid rgba(16, 185, 129, 0.35)',
                        color: '#10B981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px auto'
                      }}
                    >
                      <KeyRound size={28} />
                    </div>
                    <h3 style={{ fontSize: '19px', fontWeight: '800', color: textHeading, marginBottom: '4px' }}>
                      Enter 4-Digit MPIN
                    </h3>
                    <p style={{ fontSize: '12px', color: textSub, marginBottom: '16px' }}>
                      Fast device unlock for <strong>{signInEmail || rememberedEmail}</strong>
                    </p>

                    {error && (
                      <div
                        style={{
                          padding: '8px 12px',
                          borderRadius: '10px',
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#F87171',
                          fontSize: '11.5px',
                          marginBottom: '14px'
                        }}
                      >
                        {error}
                      </div>
                    )}

                    {/* 4-Digit Pin Dots Indicator */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginBottom: '24px' }}>
                      {[0, 1, 2, 3].map((i) => (
                        <motion.div
                          key={i}
                          animate={{
                            scale: i < mpin.length ? 1.25 : 1,
                            backgroundColor:
                              i < mpin.length
                                ? '#10B981'
                                : isLight
                                ? 'rgba(0, 0, 0, 0.15)'
                                : 'rgba(255, 255, 255, 0.15)'
                          }}
                          style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            border:
                              i < mpin.length
                                ? '2px solid #34D399'
                                : isLight
                                ? '1px solid rgba(0, 0, 0, 0.2)'
                                : '1px solid rgba(255, 255, 255, 0.2)'
                          }}
                        />
                      ))}
                    </div>

                    {/* Number Pad Grid */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '10px',
                        maxWidth: '280px',
                        margin: '0 auto 16px auto'
                      }}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <motion.button
                          key={num}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => handleKeyPress(String(num))}
                          style={{
                            height: '52px',
                            borderRadius: '14px',
                            background: isLight ? 'rgba(241, 245, 249, 0.9)' : 'rgba(255, 255, 255, 0.05)',
                            border: isLight ? '1px solid rgba(203, 213, 225, 0.8)' : '1px solid rgba(255, 255, 255, 0.08)',
                            color: textHeading,
                            fontSize: '18px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          {num}
                        </motion.button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setMpin('')}
                        style={{
                          height: '52px',
                          borderRadius: '14px',
                          background: 'transparent',
                          border: 'none',
                          color: textSub,
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Clear
                      </button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={() => handleKeyPress('0')}
                        style={{
                          height: '52px',
                          borderRadius: '14px',
                          background: isLight ? 'rgba(241, 245, 249, 0.9)' : 'rgba(255, 255, 255, 0.05)',
                          border: isLight ? '1px solid rgba(203, 213, 225, 0.8)' : '1px solid rgba(255, 255, 255, 0.08)',
                          color: textHeading,
                          fontSize: '18px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        0
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={handleDeleteMpin}
                        style={{
                          height: '52px',
                          borderRadius: '14px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          color: '#EF4444',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <Delete size={18} />
                      </motion.button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '12px' }}>
                      <button
                        type="button"
                        onClick={() => setAuthMethod('password')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: isLight ? '#059669' : '#10B981',
                          cursor: 'pointer',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <ArrowLeft size={13} /> Use Password
                      </button>
                      <button
                        type="button"
                        onClick={handleForgotMpin}
                        style={{ background: 'none', border: 'none', color: textSub, cursor: 'pointer' }}
                      >
                        Forgot MPIN?
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* DUAL-COLUMN DESKTOP SPLIT-SCREEN & MOBILE FORMS */
              <>
                {/* COLUMN 1: SIGN IN VIEWPORT (LEFT HALF) */}
                <div
                  style={{
                    width: isMobile ? '100%' : '50%',
                    display: isMobile && isRegisterMode ? 'none' : 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    padding: isMobile ? '24px 24px 32px 24px' : '44px 40px',
                    pointerEvents: !isMobile && isRegisterMode ? 'none' : 'auto',
                    opacity: !isMobile && isRegisterMode ? 0 : 1,
                    visibility: !isMobile && isRegisterMode ? 'hidden' : 'visible',
                    transition: 'opacity 0.25s ease, visibility 0.25s ease',
                    zIndex: 5
                  }}
                >
                  <div style={{ marginBottom: '22px' }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        color: isLight ? '#059669' : '#10B981',
                        fontSize: '10.5px',
                        fontWeight: '800',
                        letterSpacing: '0.8px',
                        textTransform: 'uppercase',
                        marginBottom: '10px'
                      }}
                    >
                      <Sparkles size={12} /> Kuberis Financial OS
                    </div>
                    <h2
                      style={{
                        fontSize: '24px',
                        fontWeight: '800',
                        color: textHeading,
                        letterSpacing: '-0.5px',
                        margin: 0
                      }}
                    >
                      Sign In to Your Vault
                    </h2>
                    <p style={{ fontSize: '12.5px', color: textSub, marginTop: '6px', marginBottom: 0 }}>
                      Real-time net worth tracking with institutional-grade security.
                    </p>
                  </div>

                  {/* Remembered User Badge */}
                  {rememberedEmail && (
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: isLight ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                        border: isLight ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(16, 185, 129, 0.2)',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: '#10B981',
                            color: '#000000',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '800',
                            fontSize: '11px',
                            flexShrink: 0
                          }}
                        >
                          {getInitials(rememberedEmail)}
                        </div>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            color: textHeading,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {rememberedEmail}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearRemembered}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: textSub,
                          fontSize: '11px',
                          cursor: 'pointer',
                          padding: '2px 6px'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = textSub)}
                      >
                        Switch
                      </button>
                    </div>
                  )}

                  {/* Feedback Alerts */}
                  {error && !isRegisterMode && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: 'rgba(239, 68, 68, 0.14)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#EF4444',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '16px'
                      }}
                    >
                      <AlertCircle size={15} style={{ flexShrink: 0 }} />
                      <span>{error}</span>
                    </motion.div>
                  )}

                  {success && !isRegisterMode && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: isLight ? '#059669' : '#34D399',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '16px'
                      }}
                    >
                      <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
                      <span>{success}</span>
                    </motion.div>
                  )}

                  {/* Sign In Form */}
                  <form onSubmit={handlePasswordLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label
                        style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          color: textSub,
                          display: 'block',
                          marginBottom: '6px'
                        }}
                      >
                        Email Address
                      </label>
                      <div className="kuberis-input-container">
                        <Mail size={16} style={{ position: 'absolute', left: '14px', color: '#64748B' }} />
                        <input
                          type="email"
                          required
                          placeholder="you@domain.com"
                          value={signInEmail}
                          onChange={(e) => handleSignInEmailChange(e.target.value)}
                          autoComplete="email"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          color: textSub,
                          display: 'block',
                          marginBottom: '6px'
                        }}
                      >
                        Account Password
                      </label>
                      <div className="kuberis-input-container">
                        <Lock size={16} style={{ position: 'absolute', left: '14px', color: '#64748B' }} />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          placeholder="••••••••••••"
                          value={signInPassword}
                          onChange={(e) => setSignInPassword(e.target.value)}
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            background: 'none',
                            border: 'none',
                            color: '#64748B',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '12px'
                      }}
                    >
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: textSub }}>
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          style={{ accentColor: '#10B981', cursor: 'pointer' }}
                        />
                        Remember me
                      </label>
                      <button
                        type="button"
                        onClick={onOpenForgotPassword}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: isLight ? '#059669' : '#10B981',
                          cursor: 'pointer',
                          fontWeight: '600',
                          padding: 0
                        }}
                      >
                        Forgot password?
                      </button>
                    </div>

                    {/* Primary Submit Button */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={loading}
                      className="btn btn-primary"
                      style={{
                        padding: '13px',
                        borderRadius: '14px',
                        fontWeight: '800',
                        fontSize: '13.5px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        marginTop: '4px',
                        cursor: loading ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {loading ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" /> Unlocking Vault...
                        </>
                      ) : (
                        <>
                          Sign In to Dashboard <ArrowRight size={16} />
                        </>
                      )}
                    </motion.button>

                    {/* Alternate Fast Auth Divider */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0 2px 0' }}>
                      <div style={{ flex: 1, height: '1px', background: dividerColor }} />
                      <span
                        style={{
                          fontSize: '11px',
                          color: textSub,
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}
                      >
                        Instant Access
                      </span>
                      <div style={{ flex: 1, height: '1px', background: dividerColor }} />
                    </div>

                    {/* Touch ID / Face ID Biometric Button */}
                    <motion.div
                      whileHover={{ scale: 1.015 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => handleBiometricLogin()}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        padding: '11px 16px',
                        borderRadius: '14px',
                        background: isLight
                          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(241, 245, 249, 0.9) 100%)'
                          : 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 15, 30, 0.8) 100%)',
                        border: isLight ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(16, 185, 129, 0.3)',
                        cursor: 'pointer',
                        overflow: 'hidden'
                      }}
                    >
                      <div className="kuberis-passkey-aura" />
                      <Fingerprint size={18} style={{ color: '#10B981', flexShrink: 0, position: 'relative', zIndex: 1 }} />
                      <span
                        style={{
                          fontSize: '12.5px',
                          fontWeight: '700',
                          color: textHeading,
                          position: 'relative',
                          zIndex: 1
                        }}
                      >
                        Use Touch ID / Face ID Passkey
                      </span>
                    </motion.div>

                    {/* 4-Digit MPIN Button - ONLY IF REGISTERED IN DB */}
                    {emailHasMpin && (
                      <motion.button
                        whileHover={{ scale: 1.015 }}
                        whileTap={{ scale: 0.985 }}
                        type="button"
                        onClick={() => setAuthMethod('mpin')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          padding: '10px 16px',
                          borderRadius: '14px',
                          background: isLight ? 'rgba(241, 245, 249, 0.9)' : 'rgba(255, 255, 255, 0.04)',
                          border: isLight ? '1px solid rgba(203, 213, 225, 0.8)' : '1px solid rgba(255, 255, 255, 0.08)',
                          color: textSub,
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        <KeyRound size={15} style={{ color: '#F59E0B' }} />
                        Unlock with 4-Digit MPIN Keypad
                      </motion.button>
                    )}
                  </form>
                </div>

                {/* COLUMN 2: REGISTRATION VIEWPORT (RIGHT HALF) */}
                <div
                  style={{
                    width: isMobile ? '100%' : '50%',
                    display: isMobile && !isRegisterMode ? 'none' : 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    padding: isMobile ? '24px 24px 32px 24px' : '44px 40px',
                    pointerEvents: !isMobile && !isRegisterMode ? 'none' : 'auto',
                    opacity: !isMobile && !isRegisterMode ? 0 : 1,
                    visibility: !isMobile && !isRegisterMode ? 'hidden' : 'visible',
                    transition: 'opacity 0.25s ease, visibility 0.25s ease',
                    zIndex: 5
                  }}
                >
                  <div style={{ marginBottom: '18px' }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        color: isLight ? '#059669' : '#10B981',
                        fontSize: '10.5px',
                        fontWeight: '800',
                        letterSpacing: '0.8px',
                        textTransform: 'uppercase',
                        marginBottom: '10px'
                      }}
                    >
                      <ShieldCheck size={12} /> Zero-Knowledge Security
                    </div>
                    <h2
                      style={{
                        fontSize: '24px',
                        fontWeight: '800',
                        color: textHeading,
                        letterSpacing: '-0.5px',
                        margin: 0
                      }}
                    >
                      Create Your Account
                    </h2>
                    <p style={{ fontSize: '12.5px', color: textSub, marginTop: '6px', marginBottom: 0 }}>
                      Join sovereign wealth builders scaling multi-asset portfolios.
                    </p>
                  </div>

                  {/* Feedback Alerts */}
                  {error && isRegisterMode && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: 'rgba(239, 68, 68, 0.14)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#EF4444',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '14px'
                      }}
                    >
                      <AlertCircle size={15} style={{ flexShrink: 0 }} />
                      <span>{error}</span>
                    </motion.div>
                  )}

                  {success && isRegisterMode && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: isLight ? '#059669' : '#34D399',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '14px'
                      }}
                    >
                      <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
                      <span>{success}</span>
                    </motion.div>
                  )}

                  {/* Register Form */}
                  <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label
                        style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          color: textSub,
                          display: 'block',
                          marginBottom: '5px'
                        }}
                      >
                        Full Name
                      </label>
                      <div className="kuberis-input-container">
                        <User size={16} style={{ position: 'absolute', left: '14px', color: '#64748B' }} />
                        <input
                          type="text"
                          required
                          placeholder="Alex Morgan"
                          value={registerName}
                          onChange={(e) => setRegisterName(e.target.value)}
                          autoComplete="name"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          color: textSub,
                          display: 'block',
                          marginBottom: '5px'
                        }}
                      >
                        Email Address
                      </label>
                      <div className="kuberis-input-container">
                        <Mail size={16} style={{ position: 'absolute', left: '14px', color: '#64748B' }} />
                        <input
                          type="email"
                          required
                          placeholder="alex@domain.com"
                          value={registerEmail}
                          onChange={(e) => setRegisterEmail(e.target.value)}
                          autoComplete="email"
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label
                          style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            color: textSub,
                            display: 'block',
                            marginBottom: '5px'
                          }}
                        >
                          Password
                        </label>
                        <div className="kuberis-input-container">
                          <Lock size={15} style={{ position: 'absolute', left: '12px', color: '#64748B' }} />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            placeholder="Min 6 chars"
                            value={registerPassword}
                            onChange={(e) => setRegisterPassword(e.target.value)}
                            autoComplete="new-password"
                            style={{ paddingLeft: '34px', paddingRight: '32px' }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                              position: 'absolute',
                              right: '8px',
                              background: 'none',
                              border: 'none',
                              color: '#64748B',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex'
                            }}
                          >
                            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label
                          style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            color: textSub,
                            display: 'block',
                            marginBottom: '5px'
                          }}
                        >
                          Confirm
                        </label>
                        <div className="kuberis-input-container">
                          <Lock size={15} style={{ position: 'absolute', left: '12px', color: '#64748B' }} />
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            required
                            placeholder="Repeat"
                            value={registerConfirmPassword}
                            onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                            autoComplete="new-password"
                            style={{ paddingLeft: '34px', paddingRight: '32px' }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            style={{
                              position: 'absolute',
                              right: '8px',
                              background: 'none',
                              border: 'none',
                              color: '#64748B',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex'
                            }}
                          >
                            {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Trust Privacy Notice */}
                    <div
                      style={{
                        padding: '8px 12px',
                        borderRadius: '10px',
                        background: isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.03)',
                        border: isLight ? '1px solid rgba(0, 0, 0, 0.06)' : '1px solid rgba(255, 255, 255, 0.06)',
                        fontSize: '11px',
                        color: textSub,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        margin: '2px 0'
                      }}
                    >
                      <Shield size={14} style={{ color: '#10B981', flexShrink: 0 }} />
                      <span>Client-side privacy. Your balances & secrets are never shared.</span>
                    </div>

                    {/* Primary Submit Button */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={loading}
                      className="btn btn-primary"
                      style={{
                        padding: '13px',
                        borderRadius: '14px',
                        fontWeight: '800',
                        fontSize: '13.5px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        marginTop: '4px',
                        cursor: loading ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {loading ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" /> Provisioning Vault...
                        </>
                      ) : (
                        <>
                          Create Free Account <ArrowRight size={16} />
                        </>
                      )}
                    </motion.button>
                  </form>
                </div>

                {/* THE SLIDING BRAND PANEL ("THE SHIFTER") */}
                {!isMobile && (
                  <motion.div
                    initial={false}
                    animate={{
                      x: isRegisterMode ? '0%' : '100%'
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 220,
                      damping: 26,
                      mass: 0.9
                    }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: 0,
                      width: '50%',
                      background: isLight
                        ? 'linear-gradient(145deg, #047857 0%, #059669 45%, #10B981 100%)'
                        : 'radial-gradient(circle at 50% 20%, rgba(16, 185, 129, 0.28) 0%, #041E16 50%, #020612 100%)',
                      backgroundColor: isLight ? '#059669' : '#020612',
                      borderLeft: isRegisterMode ? 'none' : '1px solid rgba(16, 185, 129, 0.3)',
                      borderRight: isRegisterMode ? '1px solid rgba(16, 185, 129, 0.3)' : 'none',
                      boxShadow: isLight
                        ? '0 0 60px rgba(5, 150, 105, 0.35), inset 0 0 40px rgba(255, 255, 255, 0.15)'
                        : '0 0 60px rgba(0, 0, 0, 0.8), inset 0 0 40px rgba(16, 185, 129, 0.12)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      padding: '48px',
                      textAlign: 'center',
                      zIndex: 20,
                      overflow: 'hidden'
                    }}
                  >
                    {/* Internal specular ambient glowing ring */}
                    <div
                      style={{
                        position: 'absolute',
                        width: '320px',
                        height: '320px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(255, 255, 255, 0.18) 0%, transparent 70%)',
                        top: '12%',
                        pointerEvents: 'none'
                      }}
                    />

                    {/* Brand Insignia Icon */}
                    <motion.div
                      key={isRegisterMode ? 'icon-register' : 'icon-login'}
                      initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
                      animate={{ scale: 1, opacity: 1, rotate: 0 }}
                      transition={{ duration: 0.35 }}
                      style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '24px',
                        background: isLight
                          ? 'rgba(255, 255, 255, 0.18)'
                          : 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(6, 78, 59, 0.4) 100%)',
                        border: isLight ? '1.5px solid rgba(255, 255, 255, 0.4)' : '1.5px solid rgba(52, 211, 153, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF',
                        marginBottom: '24px',
                        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.25)'
                      }}
                    >
                      {isRegisterMode ? <KeyRound size={34} /> : <ShieldCheck size={36} />}
                    </motion.div>

                    {/* Dynamic Shifter Messaging */}
                    <AnimatePresence mode="wait">
                      {isRegisterMode ? (
                        <motion.div
                          key="panel-msg-register"
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -15 }}
                          transition={{ duration: 0.25 }}
                          style={{ maxWidth: '340px' }}
                        >
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: '800',
                              color: '#A7F3D0',
                              letterSpacing: '1px',
                              textTransform: 'uppercase'
                            }}
                          >
                            MEMBER ACCESS
                          </span>
                          <h3
                            style={{
                              fontSize: '25px',
                              fontWeight: '800',
                              color: '#FFFFFF',
                              letterSpacing: '-0.5px',
                              marginTop: '8px',
                              marginBottom: '10px'
                            }}
                          >
                            Already an Architect?
                          </h3>
                          <p style={{ fontSize: '13px', color: '#D1FAE5', lineHeight: '1.6', marginBottom: '28px' }}>
                            Your investment ledger and net worth analytics are ready. Return to your command center.
                          </p>

                          {/* ArrowLeft: Points left on Sign In Instead */}
                          <motion.button
                            whileHover={{ scale: 1.04, boxShadow: '0 0 25px rgba(255, 255, 255, 0.35)' }}
                            whileTap={{ scale: 0.96 }}
                            type="button"
                            onClick={() => {
                              setAuthMethod('password');
                              setError('');
                            }}
                            style={{
                              padding: '12px 32px',
                              borderRadius: '16px',
                              background: 'rgba(255, 255, 255, 0.18)',
                              border: '1.5px solid rgba(255, 255, 255, 0.4)',
                              color: '#FFFFFF',
                              fontSize: '13.5px',
                              fontWeight: '800',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              backdropFilter: 'blur(8px)'
                            }}
                          >
                            <ArrowLeft size={16} /> Sign In Instead
                          </motion.button>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="panel-msg-login"
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -15 }}
                          transition={{ duration: 0.25 }}
                          style={{ maxWidth: '340px' }}
                        >
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: '800',
                              color: '#A7F3D0',
                              letterSpacing: '1px',
                              textTransform: 'uppercase'
                            }}
                          >
                            BEGIN YOUR JOURNEY
                          </span>
                          <h3
                            style={{
                              fontSize: '25px',
                              fontWeight: '800',
                              color: '#FFFFFF',
                              letterSpacing: '-0.5px',
                              marginTop: '8px',
                              marginBottom: '10px'
                            }}
                          >
                            New to Kuberis?
                          </h3>
                          <p style={{ fontSize: '13px', color: '#D1FAE5', lineHeight: '1.6', marginBottom: '28px' }}>
                            Scale your net worth with real-time asset tracking, bank sync, and zero-knowledge privacy.
                          </p>

                          <motion.button
                            whileHover={{ scale: 1.04, boxShadow: '0 0 25px rgba(255, 255, 255, 0.35)' }}
                            whileTap={{ scale: 0.96 }}
                            type="button"
                            onClick={() => {
                              setAuthMethod('register');
                              setError('');
                            }}
                            style={{
                              padding: '12px 32px',
                              borderRadius: '16px',
                              background: 'rgba(255, 255, 255, 0.18)',
                              border: '1.5px solid rgba(255, 255, 255, 0.4)',
                              color: '#FFFFFF',
                              fontSize: '13.5px',
                              fontWeight: '800',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              backdropFilter: 'blur(8px)'
                            }}
                          >
                            Create Free Account <ArrowRight size={16} />
                          </motion.button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Trust Footer Pills */}
                    <div style={{ position: 'absolute', bottom: '24px', display: 'flex', gap: '8px', opacity: 0.85 }}>
                      <span style={{ fontSize: '10.5px', color: '#D1FAE5' }}>AES-256 Cloud Encryption</span>
                      <span style={{ fontSize: '10.5px', color: '#D1FAE5' }}>•</span>
                      <span style={{ fontSize: '10.5px', color: '#D1FAE5' }}>100% Sovereign Data</span>
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
