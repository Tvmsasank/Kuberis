import React, { useState, useEffect, useCallback } from 'react';
import { X, Lock, Mail, User, CheckCircle2, AlertCircle, Fingerprint, KeyRound, Shield, Delete, RefreshCw } from 'lucide-react';
import { authenticateWithBiometrics, isBiometricsAvailable } from '../utils/biometrics';

export default function AuthModal({
  isOpen,
  onClose,
  initialMode = 'login', // 'login' | 'register'
  onLoginSuccess,
  onOpenForgotPassword,
  onOpenMpinModal
}) {
  if (!isOpen) return null;

  const rememberedEmail = localStorage.getItem('kuberis_remembered_email') || localStorage.getItem('wealthpulse_remembered_email') || localStorage.getItem('ledgerly_remembered_email') || '';
  const hasMpin = localStorage.getItem('kuberis_has_mpin') === 'true' || localStorage.getItem('wealthpulse_has_mpin') === 'true' || localStorage.getItem('ledgerly_has_mpin') === 'true';
  const hasBiometrics = localStorage.getItem('kuberis_has_biometrics') === 'true' || localStorage.getItem('wealthpulse_has_biometrics') === 'true' || localStorage.getItem('ledgerly_has_biometrics') === 'true';

  const getInitialAuthMethod = () => {
    if (initialMode === 'register') return 'register';
    if (hasBiometrics && rememberedEmail) return 'biometrics';
    if (hasMpin && rememberedEmail) return 'mpin';
    return 'password';
  };

  const [authMethod, setAuthMethod] = useState(getInitialAuthMethod);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(() => initialMode === 'register' ? '' : rememberedEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [mpin, setMpin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [emailHasMpin, setEmailHasMpin] = useState(false);
  const [emailHasBiometrics, setEmailHasBiometrics] = useState(false);
  const [pendingSessionOverride, setPendingSessionOverride] = useState(null);

  useEffect(() => {
    const savedEmail = localStorage.getItem('kuberis_remembered_email') || localStorage.getItem('wealthpulse_remembered_email') || localStorage.getItem('ledgerly_remembered_email') || '';
    setMpin('');
    setError('');
    setSuccess('');

    isBiometricsAvailable().then(setBiometricSupported);

    if (initialMode === 'register') {
      setAuthMethod('register');
      setEmail('');
      setName('');
      setPassword('');
      setConfirmPassword('');
      return;
    }

    setEmail(savedEmail);

    if (savedEmail) {
      fetch('/api/auth/check-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: savedEmail })
      })
        .then(res => res.json())
        .then(data => {
          if (data.hasMpin) {
            localStorage.setItem('wealthpulse_has_mpin', 'true');
            setEmailHasMpin(true);
            setAuthMethod('mpin');
          } else if (data.hasBiometrics) {
            setEmailHasBiometrics(true);
            setAuthMethod('password');
          } else {
            setAuthMethod('password');
          }
        })
        .catch(() => {
          if (hasMpin) setAuthMethod('mpin');
          else setAuthMethod('password');
        });
    } else {
      setAuthMethod('password');
    }
  }, [initialMode, isOpen]);

  // Dynamically check if typed email has MPIN or Biometrics set
  const handleEmailChange = (val) => {
    setEmail(val);
    setEmailHasMpin(false);
    setEmailHasBiometrics(false);
    if (val && val.includes('@')) {
      fetch('/api/auth/check-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: val.trim() })
      })
        .then(res => res.json())
        .then(data => {
          if (data.hasMpin) setEmailHasMpin(true);
          if (data.hasBiometrics) setEmailHasBiometrics(true);
        })
        .catch(() => { });
    }
  };

  const handleKeyPress = useCallback((digit) => {
    if (loading || authMethod !== 'mpin') return;
    if (mpin.length < 4) {
      const nextMpin = mpin + digit;
      setMpin(nextMpin);
      if (nextMpin.length === 4) {
        handleVerifyMpin(nextMpin);
      }
    }
  }, [mpin, loading, authMethod]);

  const handleDeleteMpin = useCallback(() => {
    if (loading || authMethod !== 'mpin') return;
    setMpin(prev => prev.slice(0, -1));
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
      const targetEmail = email || rememberedEmail;
      const res = await fetch('/api/auth/mpin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        if (json.locked || res.status === 423) {
          throw new Error(json.error || 'Account locked: 3 incorrect MPIN attempts. An unlock link has been sent to your Gmail inbox.');
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

      localStorage.setItem('wealthpulse_remembered_email', targetEmail);
      localStorage.setItem('wealthpulse_has_mpin', 'true');

      if (json.require2FA) {
        setTotpTempToken(json.tempToken);
        setAuthMethod('2fa_challenge');
        setSuccess('Google Authenticator 2FA verification required');
        return;
      }

      setSuccess('MPIN Verified! Logging in...');
      setTimeout(() => {
        onLoginSuccess(json.user, json.token, true);
        onClose();
      }, 400);
    } catch (err) {
      setError(err.message || 'MPIN verification failed');
      setMpin('');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotMpin = async () => {
    const targetEmail = (email || rememberedEmail || '').trim();
    if (!targetEmail) {
      setError('Please enter your account email to receive an MPIN reset link');
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
      setSuccess(`MPIN reset authorized for ${targetEmail}! Check your Gmail inbox or click below to reset right now.`);
    } catch (err) {
      setError(err.message || 'Failed to send MPIN reset link');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async (emailToUse) => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const targetEmail = emailToUse || email || rememberedEmail;
      const result = await authenticateWithBiometrics(targetEmail);
      setSuccess('Face ID / Biometric Verified! Unlocking...');
      setTimeout(() => {
        onLoginSuccess(result.user, result.token, true);
        onClose();
      }, 400);
    } catch (err) {
      setError(err.message || 'Biometric scan failed');
    } finally {
      setLoading(false);
    }
  };

  const [totpTempToken, setTotpTempToken] = useState('');
  const [totpCode, setTotpCode] = useState('');

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Sign in failed');

      if (json.activeSessionExists) {
        setPendingSessionOverride({
          type: 'password',
          payload: { email: email.trim(), password }
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
        localStorage.setItem('wealthpulse_remembered_email', email.trim());
      }

      setSuccess('Sign in successful!');
      setTimeout(() => {
        onLoginSuccess(json.user, json.token, rememberMe);
        onClose();
      }, 400);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSessionOverride = async () => {
    if (!pendingSessionOverride) return;
    setLoading(true);
    setError('');
    const { type, payload } = pendingSessionOverride;
    setPendingSessionOverride(null);

    try {
      const endpoint = type === 'mpin' ? '/api/auth/mpin/verify' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      setSuccess('Signed in successfully! Previous session closed.');
      setTimeout(() => {
        onLoginSuccess(json.user, json.token, true);
        onClose();
      }, 400);
    } catch (err) {
      setError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorLoginSubmit = async (e) => {
    e.preventDefault();
    if (!totpCode || !totpCode.trim()) {
      setError('Please enter your 6-digit Google Authenticator code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/2fa/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken: totpTempToken, code: totpCode.trim() })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '2FA verification failed');

      if (rememberMe) {
        localStorage.setItem('wealthpulse_remembered_email', email.trim());
      }

      setSuccess('2FA Verified! Signing in...');
      setTimeout(() => {
        onLoginSuccess(json.user, json.token, rememberMe);
        onClose();
      }, 400);
    } catch (err) {
      setError(err.message || '2FA verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Registration failed');

      localStorage.setItem('wealthpulse_remembered_email', email.trim());
      setSuccess('Account created successfully!');
      setTimeout(() => {
        onLoginSuccess(json.user, json.token, true);
        onClose();
      }, 400);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchAccount = () => {
    localStorage.removeItem('kuberis_remembered_email');
    localStorage.removeItem('wealthpulse_remembered_email');
    localStorage.removeItem('ledgerly_remembered_email');
    setEmail('');
    setMpin('');
    setEmailHasMpin(false);
    setAuthMethod('password');
  };

  const getInitials = (emailStr) => {
    if (!emailStr) return 'U';
    const namePart = emailStr.split('@')[0];
    return namePart.substring(0, 2).toUpperCase();
  };

  return (
    <div className="modal-backdrop">
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '520px',
          width: '100%',
          padding: '28px',
          borderRadius: '24px',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          border: '1px solid var(--border-glass)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)'
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary)' }}>
              <Lock size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                {authMethod === 'register' ? 'Create WealthPulse Account' : 'Sign In to WealthPulse'}
              </h2>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {authMethod === 'mpin' ? 'Enter 4-Digit MPIN to unlock' : 'Secure financial dashboard access'}
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close" style={{ padding: '6px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Toggle for Register / Sign In */}
        {authMethod !== 'register' && !rememberedEmail && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', background: 'var(--bg-app)', padding: '5px', borderRadius: '14px', marginBottom: '20px', border: '1px solid var(--border-color)' }}>
            <button
              type="button"
              className="btn"
              style={{
                padding: '8px',
                borderRadius: '10px',
                background: authMethod !== 'register' ? 'var(--primary)' : 'transparent',
                color: authMethod !== 'register' ? '#000000' : 'var(--text-muted)',
                fontSize: '13px',
                fontWeight: '700'
              }}
              onClick={() => { setAuthMethod('password'); setError(''); }}
            >
              Sign In
            </button>
            <button
              type="button"
              className="btn"
              style={{
                padding: '8px',
                borderRadius: '10px',
                background: authMethod === 'register' ? 'var(--primary)' : 'transparent',
                color: authMethod === 'register' ? '#000000' : 'var(--text-muted)',
                fontSize: '13px',
                fontWeight: '700'
              }}
              onClick={() => { setAuthMethod('register'); setError(''); }}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Remembered User Card */}
        {rememberedEmail && authMethod !== 'register' && (
          <div
            style={{
              padding: '16px 18px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(10, 25, 47, 0.8) 100%)',
              border: '1px solid var(--border-glass)',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary) 0%, #059669 100%)',
                  color: '#000000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '900',
                  fontSize: '14px',
                  flexShrink: 0
                }}
              >
                {getInitials(rememberedEmail)}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={rememberedEmail}>
                  {rememberedEmail}
                </div>
                <div style={{ fontSize: '10px', color: '#34D399', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                  <CheckCircle2 size={11} /> Remembered
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{
                fontSize: '11px',
                fontWeight: '700',
                padding: '6px 10px',
                flexShrink: 0,
                gap: '4px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                whiteSpace: 'nowrap'
              }}
              onClick={handleSwitchAccount}
              title="Switch Account"
            >
              <RefreshCw size={11} /> Switch
            </button>
          </div>
        )}

        {error && (
          <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.15)', color: '#FCA5A5', border: '1px solid #EF4444', borderRadius: '12px', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {success && (
          <div style={{ padding: '10px 14px', background: 'var(--success-light)', color: 'var(--success)', borderRadius: '12px', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} /> {success}
          </div>
        )}

        {/* MODE 1: 4-DIGIT MPIN VIEW */}
        {authMethod === 'mpin' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Type or tap your 4-digit Security MPIN
            </p>

            {/* Tactile 4-Dot Indicator */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
              {[0, 1, 2, 3].map(index => {
                const isFilled = mpin.length > index;
                return (
                  <div
                    key={index}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: isFilled ? 'var(--primary)' : 'transparent',
                      border: isFilled ? '2px solid var(--primary)' : '2px solid var(--border-color)',
                      boxShadow: isFilled ? '0 0 12px var(--primary-glow)' : 'none',
                      transition: 'all 0.25s var(--ease-spring)',
                      transform: isFilled ? 'scale(1.15)' : 'scale(1)'
                    }}
                  />
                );
              })}
            </div>

            {/* Number Pad Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', maxWidth: '280px', margin: '0 auto 20px auto' }}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button
                  key={num}
                  type="button"
                  className="btn btn-secondary"
                  style={{
                    height: '52px',
                    fontSize: '20px',
                    fontWeight: '700',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onClick={() => handleKeyPress(num)}
                  disabled={loading}
                >
                  {num}
                </button>
              ))}
              <div />
              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  height: '52px',
                  fontSize: '20px',
                  fontWeight: '700',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onClick={() => handleKeyPress('0')}
                disabled={loading}
              >
                0
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                style={{
                  height: '52px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)'
                }}
                onClick={handleDeleteMpin}
                disabled={loading}
                title="Backspace"
              >
                <Delete size={22} />
              </button>
            </div>

            {/* Bottom Actions Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', borderTop: '1px solid var(--border-color)', fontSize: '12px', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--primary)', gap: '4px', padding: '6px 6px', fontSize: '11.5px' }}
                onClick={() => handleBiometricLogin(rememberedEmail)}
              >
                <Fingerprint size={15} /> Face ID
              </button>

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ color: '#F87171', gap: '4px', padding: '6px 6px', fontSize: '11.5px' }}
                onClick={() => {
                  setError('');
                  setSuccess('');
                  setAuthMethod('forgot_mpin');
                }}
                disabled={loading}
              >
                <KeyRound size={13} /> Reset MPIN
              </button>

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--text-muted)', gap: '4px', padding: '6px 6px', fontSize: '11.5px', marginLeft: 'auto' }}
                onClick={() => setAuthMethod('password')}
              >
                <Lock size={13} /> Password
              </button>
            </div>
          </div>
        )}

        {/* MODE 2: STANDARD EMAIL + PASSWORD LOGIN */}
        {authMethod === 'password' && (
          <form onSubmit={handlePasswordLogin}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  className="form-control"
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => handleEmailChange(e.target.value)}
                  required
                />
              </div>

              {(emailHasMpin || emailHasBiometrics || biometricSupported) && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  {emailHasMpin && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ flex: 1, fontSize: '11.5px', padding: '7px', color: 'var(--primary)', borderColor: 'var(--primary)', gap: '4px' }}
                      onClick={() => setAuthMethod('mpin')}
                    >
                      <KeyRound size={13} /> 4-Digit MPIN
                    </button>
                  )}
                  {(emailHasBiometrics || biometricSupported) && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ flex: 1, fontSize: '11.5px', padding: '7px', color: '#38BDF8', borderColor: '#38BDF8', gap: '4px' }}
                      onClick={() => handleBiometricLogin(email || rememberedEmail)}
                    >
                      <Fingerprint size={13} /> Face ID / Passkey
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', fontSize: '13px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  style={{ accentColor: 'var(--primary)' }}
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ padding: 0, color: 'var(--primary)' }}
                onClick={() => {
                  onClose();
                  onOpenForgotPassword();
                }}
              >
                Forgot Password?
              </button>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: '15px' }} disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
              New to WealthPulse?{' '}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ padding: 0, color: 'var(--primary)', fontWeight: '700' }}
                onClick={() => {
                  setAuthMethod('register');
                  setEmail('');
                  setName('');
                  setPassword('');
                  setConfirmPassword('');
                  setError('');
                }}
              >
                Create Account
              </button>
            </div>
          </form>
        )}

        {/* MODE 3: CREATE ACCOUNT */}
        {authMethod === 'register' && (
          <form onSubmit={handleRegisterSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. John Doe"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-control"
                placeholder="name@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: '15px' }} disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
              Already have an account?{' '}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ padding: 0, color: 'var(--primary)', fontWeight: '700' }}
                onClick={() => {
                  const savedEmail = localStorage.getItem('kuberis_remembered_email') || localStorage.getItem('wealthpulse_remembered_email') || localStorage.getItem('ledgerly_remembered_email') || '';
                  setEmail(savedEmail);
                  setAuthMethod('password');
                  setError('');
                }}
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {/* MODE 4: FORGOT 4-DIGIT MPIN */}
        {authMethod === 'forgot_mpin' && (
          <form onSubmit={async (e) => { e.preventDefault(); await handleForgotMpin(); }}>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.5' }}>
              Enter your registered account email to receive a secure link to reset your 4-digit MPIN.
            </p>

            <div className="form-group">
              <label className="form-label">Registered Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  className="form-control"
                  style={{ paddingLeft: '36px' }}
                  placeholder="name@example.com"
                  value={email || rememberedEmail}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '15px', marginTop: '8px' }}
              disabled={loading}
            >
              {loading ? 'Sending Email Link...' : 'Send 4-Digit MPIN Reset Link →'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', fontSize: '13px' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--primary)', padding: 0, fontWeight: '600' }}
                onClick={() => {
                  setError('');
                  setSuccess('');
                  setAuthMethod('mpin');
                }}
              >
                ← Back to MPIN Keypad
              </button>

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--text-muted)', padding: 0 }}
                onClick={() => {
                  setError('');
                  setSuccess('');
                  setAuthMethod('password');
                }}
              >
                Password Login
              </button>
            </div>
          </form>
        )}

        {/* MODE 5: 2FA GOOGLE AUTHENTICATOR CHALLENGE */}
        {authMethod === '2fa_challenge' && (
          <form onSubmit={handleTwoFactorLoginSubmit}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                <Shield size={28} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                Two-Factor Verification
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.4' }}>
                Open <strong>Google Authenticator</strong> on your phone and enter the 6-digit code for <strong>{email}</strong>
              </p>
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>
                6-Digit Authenticator Code (or Recovery Code)
              </label>
              <input
                type="text"
                autoFocus
                className="form-control"
                placeholder="e.g. 582910"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                style={{
                  fontSize: '22px',
                  fontWeight: '900',
                  letterSpacing: '6px',
                  textAlign: 'center',
                  padding: '12px',
                  color: 'var(--primary)'
                }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !totpCode.trim()}
              style={{ width: '100%', padding: '12px', fontSize: '15px', fontWeight: '800', marginBottom: '14px' }}
            >
              {loading ? 'Verifying 2FA Code...' : 'Verify & Sign In'}
            </button>

            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '12px', color: 'var(--text-muted)' }}
                onClick={() => {
                  setError('');
                  setSuccess('');
                  setAuthMethod('password');
                }}
              >
                ← Back to Password Sign In
              </button>
            </div>
          </form>
        )}

        {/* HDFC-Style Another Login Detected Modal */}
        {pendingSessionOverride && (
          <div className="modal-backdrop" style={{ zIndex: 1100 }}>
            <div className="modal-content" style={{ maxWidth: '440px', textAlign: 'center', padding: '32px 24px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px auto', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                <Shield size={32} />
              </div>

              <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '12px' }}>
                Another Login Detected
              </h3>

              <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '24px' }}>
                Looks like you're already logged in with another device. Please close the other session to continue here.
              </p>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', fontWeight: '700' }}
                  onClick={() => {
                    setPendingSessionOverride(null);
                    setError('Sign in cancelled. Your existing session remains active.');
                    setLoading(false);
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', fontWeight: '800' }}
                  onClick={handleConfirmSessionOverride}
                >
                  Okay
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
