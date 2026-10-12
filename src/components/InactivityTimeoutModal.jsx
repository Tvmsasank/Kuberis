import React from 'react';
import { ShieldAlert, Clock, LogOut, CheckCircle } from 'lucide-react';

export default function InactivityTimeoutModal({
  isOpen,
  countdownSeconds,
  onStayLoggedIn,
  onLogoutNow
}) {
  if (!isOpen) return null;

  // Format seconds into MM:SS
  const mins = Math.floor(countdownSeconds / 60);
  const secs = countdownSeconds % 60;
  const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const isUrgent = countdownSeconds <= 20;

  return (
    <div
      className="modal-backdrop"
      style={{
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(10px)',
        background: 'rgba(0, 0, 0, 0.75)',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '440px',
          width: '92%',
          background: 'var(--bg-card, #0B192C)',
          border: isUrgent ? '1.5px solid #EF4444' : '1.5px solid #F59E0B',
          borderRadius: '20px',
          padding: '28px 24px',
          boxShadow: isUrgent
            ? '0 25px 60px rgba(239, 68, 68, 0.35), 0 0 30px rgba(239, 68, 68, 0.2)'
            : '0 25px 60px rgba(245, 158, 11, 0.3), 0 0 30px rgba(245, 158, 11, 0.15)',
          textAlign: 'center',
          animation: 'scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          boxSizing: 'border-box'
        }}
      >
        {/* Glowing Security Badge */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: isUrgent ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            border: isUrgent ? '2px solid rgba(239, 68, 68, 0.4)' : '2px solid rgba(245, 158, 11, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            boxShadow: isUrgent ? '0 0 20px rgba(239, 68, 68, 0.4)' : '0 0 20px rgba(245, 158, 11, 0.3)'
          }}
        >
          <ShieldAlert size={32} style={{ color: isUrgent ? '#EF4444' : '#F59E0B' }} />
        </div>

        {/* Heading */}
        <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '900', color: 'var(--text-main, #FFFFFF)' }}>
          Session Inactivity Warning
        </h3>

        {/* Context description */}
        <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-muted, #94A3B8)', lineHeight: '1.5' }}>
          You have been idle for 9 minutes. To safeguard your financial data, your session will automatically log out in:
        </p>

        {/* Live Countdown Display */}
        <div
          style={{
            background: isUrgent ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
            border: isUrgent ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '16px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px'
          }}
        >
          <Clock size={24} style={{ color: isUrgent ? '#EF4444' : '#F59E0B' }} />
          <div style={{ textAlign: 'left' }}>
            <div
              style={{
                fontSize: '28px',
                fontWeight: '900',
                fontFamily: 'monospace',
                color: isUrgent ? '#EF4444' : '#F59E0B',
                letterSpacing: '2px',
                lineHeight: 1
              }}
            >
              {formattedTime}
            </div>
            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '600' }}>
              Seconds remaining before auto-logout
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onStayLoggedIn}
            style={{
              flex: 1.2,
              padding: '12px 18px',
              fontSize: '13.5px',
              fontWeight: '800',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)'
            }}
          >
            <CheckCircle size={16} />
            <span>Stay Logged In</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={onLogoutNow}
            style={{
              flex: 1,
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: '700',
              borderRadius: '12px',
              color: '#EF4444',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              background: 'rgba(239, 68, 68, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <LogOut size={15} />
            <span>Logout Now</span>
          </button>
        </div>
      </div>
    </div>
  );
}
