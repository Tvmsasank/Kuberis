import React, { useState } from 'react';
import { X, Lock, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function ChangePasswordModal({
  isOpen,
  onClose,
  token,
  onSuccessLogout
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (currentPassword === newPassword) {
      setError('New password cannot be the same as your current password');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');

      setSuccess('Password updated successfully! Signing out to refresh session...');
      setTimeout(() => {
        onClose();
        if (onSuccessLogout) {
          onSuccessLogout();
        }
      }, 1200);
    } catch (err) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 10200 }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'var(--primary-light)', color: 'var(--primary)' }}>
              <Lock size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>Change Account Password</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Enter your current password and your new credentials.
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid #EF4444', color: '#FCA5A5', fontSize: '12.5px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid #10B981', color: '#6EE7B7', fontSize: '12.5px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>Current Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showCurrent ? 'text' : 'password'}
                className="form-control"
                placeholder="Enter existing password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                autoFocus
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowCurrent(!showCurrent)}
                style={{ position: 'absolute', right: '8px', top: '8px', padding: '4px', color: 'var(--text-muted)' }}
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>New Password (min. 6 characters)</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNew ? 'text' : 'password'}
                className="form-control"
                placeholder="Enter new strong password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                minLength={6}
                required
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowNew(!showNew)}
                style={{ position: 'absolute', right: '8px', top: '8px', padding: '4px', color: 'var(--text-muted)' }}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>Confirm New Password</label>
            <input
              type={showNew ? 'text' : 'password'}
              className="form-control"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.5' }}>
            🔒 Changing your password will sign out your current session and open the sign-in modal so you can log back in securely.
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1.5, fontWeight: '800' }} disabled={loading}>
              {loading ? 'Updating Password...' : 'Update Password →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
