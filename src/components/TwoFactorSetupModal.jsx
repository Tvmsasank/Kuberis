import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ShieldCheck,
  QrCode,
  KeyRound,
  CheckCircle2,
  Copy,
  Download,
  AlertTriangle,
  Lock,
  Smartphone,
  Sparkles
} from 'lucide-react';

export default function TwoFactorSetupModal({
  isOpen,
  onClose,
  token,
  user,
  onUpdateUser
}) {
  const [step, setStep] = useState(1); // 1: QR & Secret, 2: Verification, 3: Success & Recovery Codes, 4: Disable Confirmation
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedRecovery, setCopiedRecovery] = useState(false);

  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      document.body.style.overflow = 'hidden';
      setError('');
      setSuccessMsg('');
      setVerificationCode('');
      setCopiedSecret(false);
      setCopiedRecovery(false);

      if (user?.twoFactorEnabled) {
        setStep(4); // Open in Disable Mode
      } else {
        setStep(1);
        fetchTwoFactorSetup();
      }
    } else if (!isOpen) {
      document.body.style.overflow = '';
    }
    prevIsOpenRef.current = isOpen;

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, user?.twoFactorEnabled]);

  const fetchTwoFactorSetup = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initialize 2FA setup');

      setQrCodeUrl(data.qrCodeUrl);
      setSecretKey(data.secretKey);
    } catch (err) {
      setError(err.message || 'Failed to load 2FA setup');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndEnable = async (e) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.trim().length !== 6) {
      setError('Please enter a valid 6-digit code from Google Authenticator');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/2fa/verify-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code: verificationCode.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      setRecoveryCodes(data.recoveryCodes || []);
      setStep(3); // Move to recovery codes step
      if (data.user && onUpdateUser) {
        onUpdateUser(data.user);
      }
    } catch (err) {
      setError(err.message || 'Failed to verify 2FA code');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableTwoFactor = async () => {
    if (!verificationCode || !verificationCode.trim()) {
      setError('Please enter your 6-digit authenticator code or emergency recovery code to disable 2FA');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code: verificationCode.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to disable 2FA');

      if (data.user && onUpdateUser) {
        onUpdateUser(data.user);
      }
      setSuccessMsg('Google Authenticator 2FA disabled successfully');
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setError(err.message || 'Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'secret') {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else {
      setCopiedRecovery(true);
      setTimeout(() => setCopiedRecovery(false), 2000);
    }
  };

  const downloadRecoveryCodes = () => {
    const text = `WealthPulse Emergency Recovery Backup Codes:\n==========================================\nAccount: ${user?.email}\nGenerated: ${new Date().toLocaleString('en-IN')}\n\n${recoveryCodes.join('\n')}\n\nKeep these codes in a secure location. Each code can only be used once if you lose your mobile device.`;
    const element = document.createElement('a');
    const file = new Blob([text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `WealthPulse-Recovery-Codes-${user?.email?.split('@')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(10px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '520px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px',
          borderRadius: '24px',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(28px)',
          border: '1px solid var(--border-glass)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', borderRadius: '12px' }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Google Authenticator 2FA
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                AWS-Grade Two-Factor Authentication (TOTP)
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444', borderRadius: '12px', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        {successMsg && (
          <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10B981', borderRadius: '12px', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} /> {successMsg}
          </div>
        )}

        {/* STEP 1: Scan QR Code & Secret Key */}
        {step === 1 && (
          <div>
            <div style={{ padding: '12px 16px', borderRadius: '14px', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', marginBottom: '20px', fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              📱 Open <strong>Google Authenticator</strong> (or Microsoft Authenticator/Authy) on your phone and tap <strong>"+"</strong> to scan the QR code below.
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
                <div className="spin" style={{ display: 'inline-block', marginBottom: '8px' }}><QrCode size={32} /></div>
                <div>Generating 2FA Secret & QR Code...</div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                  {qrCodeUrl ? (
                    <div style={{ padding: '12px', background: '#FFFFFF', borderRadius: '16px', border: '2px solid var(--border-glass)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                      <img src={qrCodeUrl} alt="Google Authenticator QR Code" style={{ width: '180px', height: '180px', display: 'block' }} />
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Failed to load QR code.</div>
                  )}
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>
                    Can't scan the QR code? Enter Secret Key manually:
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      readOnly
                      className="form-control"
                      value={secretKey}
                      style={{ fontFamily: 'monospace', fontWeight: '800', letterSpacing: '1px', fontSize: '13px', background: 'rgba(0,0,0,0.3)' }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => copyToClipboard(secretKey, 'secret')}
                      style={{ padding: '8px 12px', height: '40px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      {copiedSecret ? <CheckCircle2 size={16} style={{ color: '#10B981' }} /> : <Copy size={16} />}
                      {copiedSecret ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  onClick={() => setStep(2)}
                >
                  <Smartphone size={18} /> Next: Enter 6-Digit Code
                </button>
              </>
            )}
          </div>
        )}

        {/* STEP 2: Verify 6-digit Code */}
        {step === 2 && (
          <form onSubmit={handleVerifyAndEnable}>
            <div style={{ padding: '12px 16px', borderRadius: '14px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', marginBottom: '20px', fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              🔑 Enter the rolling <strong>6-digit code</strong> generated by your Google Authenticator app for <strong>Kuberis ({user?.email})</strong>.
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>
                6-Digit Authenticator Code
              </label>
              <input
                type="text"
                maxLength={6}
                autoFocus
                className="form-control"
                placeholder="e.g. 582910"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                style={{
                  fontSize: '24px',
                  fontWeight: '900',
                  letterSpacing: '8px',
                  textAlign: 'center',
                  padding: '12px',
                  color: 'var(--primary)'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1, padding: '12px', borderRadius: '12px', fontWeight: '700' }}
                onClick={() => setStep(1)}
              >
                Back
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || verificationCode.length !== 6}
                style={{ flex: 2, padding: '12px', borderRadius: '12px', fontWeight: '800' }}
              >
                {loading ? 'Activating...' : 'Verify & Enable 2FA'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Success & Emergency Recovery Codes */}
        {step === 3 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                Google Authenticator 2FA Activated!
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Your account is now secured with AWS-grade Time-based One-Time Passwords.
              </p>
            </div>

            <div style={{ padding: '16px', borderRadius: '16px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <AlertTriangle size={16} /> Save Emergency Recovery Backup Codes
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
                If you lose your phone or access to Google Authenticator, each code below can be used once to log in:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'rgba(0,0,0,0.4)', padding: '12px', borderRadius: '12px', fontFamily: 'monospace', fontWeight: '800', fontSize: '14px', color: '#F8FAFC', textAlign: 'center', marginBottom: '12px' }}>
                {recoveryCodes.map((code, idx) => (
                  <div key={idx} style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                    {code}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1, fontSize: '12px', fontWeight: '700' }}
                  onClick={() => copyToClipboard(recoveryCodes.join(', '), 'recovery')}
                >
                  {copiedRecovery ? <CheckCircle2 size={14} style={{ color: '#10B981' }} /> : <Copy size={14} />}
                  {copiedRecovery ? 'Copied All' : 'Copy Codes'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1, fontSize: '12px', fontWeight: '700' }}
                  onClick={downloadRecoveryCodes}
                >
                  <Download size={14} /> Download .TXT
                </button>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', borderRadius: '12px', fontWeight: '800' }}
              onClick={onClose}
            >
              Done & Finish
            </button>
          </div>
        )}

        {/* STEP 4: Disable 2FA Confirmation */}
        {step === 4 && (
          <div>
            <div style={{ padding: '16px', borderRadius: '16px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <ShieldCheck size={18} /> Disable Google Authenticator 2FA?
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.5' }}>
                Disabling 2FA will lower your account security. To confirm, enter a current 6-digit code from Google Authenticator or an emergency recovery code below.
              </p>
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>
                6-Digit Code or Recovery Code
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 582910 or 8392-1049"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                style={{ fontSize: '16px', fontWeight: '800', textAlign: 'center', padding: '10px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1, padding: '12px', borderRadius: '12px', fontWeight: '700' }}
                onClick={onClose}
              >
                Keep 2FA On
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={loading || !verificationCode.trim()}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', fontWeight: '800', opacity: (!verificationCode.trim() || loading) ? 0.5 : 1 }}
                onClick={handleDisableTwoFactor}
              >
                {loading ? 'Disabling...' : 'Confirm Disable'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
