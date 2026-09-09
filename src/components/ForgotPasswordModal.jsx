import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, CheckCircle2, AlertCircle, KeyRound, ArrowRight } from 'lucide-react';

export default function ForgotPasswordModal({ isOpen, onClose, onOpenLogin, onLogout, initialToken = '' }) {
  if (!isOpen) return null;

  // If opened via email link (?resetToken=...), go directly to password entry
  const [step, setStep] = useState(initialToken ? 2 : 1);
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState(''); // 'checking' | 'found' | 'not_found' | ''
  const [resetToken, setResetToken] = useState(initialToken);
  const [emailSent, setEmailSent] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (initialToken) {
      setResetToken(initialToken);
      setStep(2);
      // Immediately log out active session on reset token activation for security
      if (onLogout) onLogout();
    }
  }, [initialToken]);

  const handleEmailChange = (val) => {
    setEmail(val);
    setError('');
    const clean = val.trim();
    if (clean.includes('@') && clean.includes('.')) {
      setEmailStatus('checking');
      fetch('/api/auth/check-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clean })
      })
        .then(res => res.json())
        .then(data => {
          if (data.exists) {
            setEmailStatus('found');
          } else {
            setEmailStatus('not_found');
          }
        })
        .catch(() => setEmailStatus(''));
    } else {
      setEmailStatus('');
    }
  };

  const handleRequestLink = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (emailStatus === 'not_found') {
      setError('No account found with this email address. Please enter the email associated with your WealthPulse account.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Request failed');

      setResetToken(json.resetToken);
      setEmailSent(true);
      setSuccessMessage(`Password reset link sent to ${email.trim()}! Please check your Gmail inbox.`);
    } catch (err) {
      setError(err.message || 'Failed to send password reset link');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken: resetToken.trim(), newPassword })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Reset failed');

      // Security: Invalidate all active sessions immediately
      if (onLogout) onLogout();

      setSuccessMessage('Password reset successfully! Opening Sign In...');
      setTimeout(() => {
        onClose();
        onOpenLogin();
      }, 1200);
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <KeyRound size={20} style={{ color: 'var(--primary)' }} />
            <h2 style={{ fontSize: '18px' }}>
              {step === 1 ? 'Forgot Password' : 'Set New Password'}
            </h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.15)', color: '#FCA5A5', border: '1px solid #EF4444', borderRadius: '12px', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {successMessage && (
          <div style={{ padding: '12px 16px', background: 'var(--success-light)', color: 'var(--success)', borderRadius: '12px', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} /> {successMessage}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestLink}>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.5' }}>
              Enter your registered account email address. We will send a secure password reset link to your email inbox.
            </p>

            <div className="form-group">
              <label className="form-label">Account Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  placeholder="name@example.com"
                  className="form-control"
                  style={{
                    paddingLeft: '36px',
                    borderColor: emailStatus === 'found' ? '#10B981' : (emailStatus === 'not_found' ? '#EF4444' : undefined)
                  }}
                  value={email}
                  onChange={e => handleEmailChange(e.target.value)}
                  required
                />
              </div>

              {emailStatus === 'found' && (
                <div style={{ fontSize: '12px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '6px', fontWeight: '600' }}>
                  <CheckCircle2 size={13} /> Account found. Ready to receive reset link.
                </div>
              )}

              {emailStatus === 'not_found' && (
                <div style={{ fontSize: '12px', color: '#F87171', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '6px', fontWeight: '600' }}>
                  <AlertCircle size={13} /> No account linked with this email. Enter the email associated with your WealthPulse account.
                </div>
              )}

              {emailStatus === 'checking' && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Verifying account...
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }} disabled={loading}>
              {loading ? 'Sending Email Link...' : 'Send Password Reset Link'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword}>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Enter your new password below to reset your account credentials.
            </p>

            <div className="form-group">
              <label className="form-label">New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  placeholder="Minimum 6 characters"
                  className="form-control"
                  style={{ paddingLeft: '36px' }}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  placeholder="Re-enter new password"
                  className="form-control"
                  style={{ paddingLeft: '36px' }}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }} disabled={loading}>
              {loading ? 'Saving Password...' : 'Save New Password & Sign In'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
