import React, { useState, useEffect, useCallback } from 'react';
import { X, KeyRound, CheckCircle2, AlertCircle, Delete, Lock } from 'lucide-react';

export default function MpinModal({
  isOpen,
  onClose,
  mode = 'verify', // 'verify' | 'set' | 'change' | 'reset_token'
  email = '',
  token = '',
  resetMpinToken = '',
  onSuccess
}) {
  if (!isOpen) return null;

  // Stages for change mode: 'verify_current' -> 'enter_new' -> 'confirm_new'
  const isResetTokenMode = mode === 'reset_token' || !!resetMpinToken;
  const [stage, setStage] = useState(() => (mode === 'change' ? 'verify_current' : 'enter_pin'));
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setPin('');
    setNewPin('');
    setConfirmPin('');
    setStage(mode === 'change' ? 'verify_current' : 'enter_pin');
    setError('');
    setSuccess('');
  }, [isOpen, mode, resetMpinToken]);

  const activeDigits = stage === 'confirm_new' ? confirmPin : (stage === 'enter_new' ? newPin : pin);

  const handleKeyPress = useCallback((numStr) => {
    if (loading) return;
    setError('');

    if (stage === 'verify_current') {
      if (pin.length < 4) {
        const next = pin + numStr;
        setPin(next);
        if (next.length === 4) handleVerifyCurrentForChange(next);
      }
    } else if (stage === 'enter_pin') {
      if (pin.length < 4) {
        const next = pin + numStr;
        setPin(next);
        if (next.length === 4) {
          if (mode === 'verify' && !isResetTokenMode) {
            handleVerifyMpin(next);
          } else {
            setNewPin(next);
            setStage('confirm_new');
          }
        }
      }
    } else if (stage === 'enter_new') {
      if (newPin.length < 4) {
        const next = newPin + numStr;
        setNewPin(next);
        if (next.length === 4) {
          setStage('confirm_new');
        }
      }
    } else if (stage === 'confirm_new') {
      if (confirmPin.length < 4) {
        const next = confirmPin + numStr;
        setConfirmPin(next);
        if (next.length === 4) handleFinishSetMpin(newPin || pin, next);
      }
    }
  }, [loading, stage, pin, newPin, confirmPin, mode, isResetTokenMode]);

  const handleDelete = useCallback(() => {
    if (loading) return;
    setError('');
    if (stage === 'confirm_new') {
      setConfirmPin(prev => prev.slice(0, -1));
    } else if (stage === 'enter_new') {
      setNewPin(prev => prev.slice(0, -1));
    } else {
      setPin(prev => prev.slice(0, -1));
    }
  }, [loading, stage]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyPress, handleDelete, onClose]);

  const handleVerifyCurrentForChange = async (currentPin) => {
    setLoading(true);
    try {
      const targetEmail = email || localStorage.getItem('kuberis_remembered_email') || localStorage.getItem('wealthpulse_remembered_email') || localStorage.getItem('ledgerly_remembered_email');
      const res = await fetch('/api/auth/mpin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, mpin: currentPin })
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Current 4-Digit MPIN is incorrect');
      }

      setSuccess('Current MPIN Verified! Enter your new MPIN.');
      setTimeout(() => {
        setSuccess('');
        setStage('enter_new');
        setLoading(false);
      }, 600);
    } catch (err) {
      setError(err.message || 'Verification failed');
      setPin('');
      setLoading(false);
    }
  };

  const handleVerifyMpin = async (completedPin) => {
    setLoading(true);
    try {
      const targetEmail = email || localStorage.getItem('kuberis_remembered_email') || localStorage.getItem('wealthpulse_remembered_email') || localStorage.getItem('ledgerly_remembered_email');
      if (!targetEmail) {
        throw new Error('Please enter your account email address first');
      }

      const res = await fetch('/api/auth/mpin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, mpin: completedPin })
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Invalid 4-Digit MPIN');

      setSuccess('MPIN Verified!');
      setTimeout(() => {
        if (onSuccess) onSuccess(json.user, json.token);
        onClose();
      }, 400);
    } catch (err) {
      setError(err.message || 'Verification failed');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishSetMpin = async (firstPin, secondPin) => {
    if (firstPin !== secondPin) {
      setError('MPINs do not match. Try again.');
      setNewPin('');
      setConfirmPin('');
      setStage(mode === 'change' ? 'enter_new' : 'enter_pin');
      return;
    }

    setLoading(true);

    try {
      if (isResetTokenMode && resetMpinToken) {
        // Reset MPIN via token from email link
        const res = await fetch('/api/auth/reset-mpin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resetMpinToken, newMpin: secondPin })
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Failed to reset MPIN');

        localStorage.setItem('kuberis_has_mpin', 'true');
        setSuccess('4-Digit MPIN Reset Successfully! Please Sign In.');
        setTimeout(() => {
          onClose();
        }, 1000);
        return;
      }

      const targetEmail = (email || localStorage.getItem('kuberis_remembered_email') || localStorage.getItem('wealthpulse_remembered_email') || localStorage.getItem('ledgerly_remembered_email') || '').trim();
      const activeToken = token || localStorage.getItem('kuberis_token') || localStorage.getItem('wealthpulse_token') || sessionStorage.getItem('kuberis_token') || sessionStorage.getItem('wealthpulse_token') || localStorage.getItem('ledgerly_token') || '';

      const res = await fetch('/api/auth/mpin/set', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`,
          'X-User-Email': targetEmail
        },
        body: JSON.stringify({ mpin: secondPin, email: targetEmail })
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to set MPIN');

      localStorage.setItem('kuberis_has_mpin', 'true');
      setSuccess(mode === 'change' ? '4-Digit MPIN Changed Successfully!' : '4-Digit Security MPIN Set Successfully!');
      setTimeout(() => {
        if (onSuccess) onSuccess(json.user, activeToken);
        onClose();
      }, 800);
    } catch (err) {
      setError(err.message || 'Failed to set MPIN');
      setNewPin('');
      setConfirmPin('');
      setStage(mode === 'change' ? 'enter_new' : 'enter_pin');
    } finally {
      setLoading(false);
    }
  };

  const getHeaderTitle = () => {
    if (isResetTokenMode) return 'Reset 4-Digit Security MPIN';
    if (mode === 'verify') return '4-Digit MPIN Authentication';
    if (stage === 'verify_current') return 'Verify Current 4-Digit MPIN';
    if (stage === 'confirm_new') return 'Confirm New 4-Digit MPIN';
    if (stage === 'enter_new') return 'Enter New 4-Digit MPIN';
    return 'Set 4-Digit Security MPIN';
  };

  const getSubtitle = () => {
    if (isResetTokenMode) {
      if (stage === 'confirm_new') return 'Re-type your new 4-digit PIN to confirm reset';
      return 'Enter a new 4-digit security PIN for your account';
    }
    if (mode === 'verify') return `Type or tap your 4-digit MPIN for ${email || 'your account'}`;
    if (stage === 'verify_current') return 'Type your existing 4-digit MPIN to authorize change';
    if (stage === 'enter_new') return 'Type your new 4-digit security PIN';
    if (stage === 'confirm_new') return 'Re-type your new 4-digit PIN to confirm';
    return 'Type or tap a 4-digit PIN using keyboard or keypad';
  };

  return (
    <div className="modal-backdrop">
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '420px',
          width: '100%',
          padding: '24px',
          borderRadius: '24px',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          border: '1px solid var(--border-glass)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)',
          textAlign: 'center'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ padding: '6px', borderRadius: '10px', background: 'var(--primary-light)', color: 'var(--primary)' }}>
              <KeyRound size={18} />
            </div>
            <h2 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
              {getHeaderTitle()}
            </h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          {getSubtitle()}
        </p>

        {error && (
          <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.15)', color: '#FCA5A5', border: '1px solid #EF4444', borderRadius: '12px', marginBottom: '14px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {success && (
          <div style={{ padding: '8px 12px', background: 'var(--success-light)', color: 'var(--success)', borderRadius: '12px', marginBottom: '14px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <CheckCircle2 size={15} /> {success}
          </div>
        )}

        {/* Tactile 4-Dot PIN Indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '20px' }}>
          {[0, 1, 2, 3].map(index => {
            const isFilled = activeDigits.length > index;
            return (
              <div
                key={index}
                style={{
                  width: '18px',
                  height: '18px',
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', maxWidth: '280px', margin: '0 auto 12px auto' }}>
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
            onClick={handleDelete}
            disabled={loading}
            title="Backspace (Delete)"
          >
            <Delete size={22} />
          </button>
        </div>
      </div>
    </div>
  );
}
