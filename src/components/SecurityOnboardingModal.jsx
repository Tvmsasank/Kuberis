import React from 'react';
import { ShieldCheck, KeyRound, QrCode, X, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

export default function SecurityOnboardingModal({
  isOpen,
  onClose,
  onSetupMpin,
  onSetupTwoFactor
}) {
  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      style={{
        zIndex: 10150,
        overflowY: 'auto',
        padding: '20px'
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '540px',
          width: '100%',
          padding: '30px',
          borderRadius: '24px',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(28px)',
          border: '1px solid var(--border-glass)',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <ShieldCheck size={26} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h3 style={{ fontSize: '19px', fontWeight: '900', margin: 0, color: 'var(--text-main)' }}>
                  Secure Your Account
                </h3>
                <span className="badge badge-success" style={{ fontSize: '9px', padding: '1px 6px' }}>
                  <Sparkles size={10} /> Recommended
                </span>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Protect your wealth records and sensitive financial data
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Informative Security Context */}
        <div
          style={{
            padding: '14px 16px',
            borderRadius: '14px',
            background: 'var(--bg-app)',
            border: '1px solid var(--border-color)',
            marginBottom: '20px',
            fontSize: '12.5px',
            color: 'var(--text-muted)',
            lineHeight: '1.55'
          }}
        >
          Welcome to Kuberis! To protect your personal finances against unauthorized access, we strongly suggest configuring at least one additional layer of security now:
        </div>

        {/* 2 Security Action Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {/* Card 1: 4-Digit MPIN */}
          <div
            className="card"
            style={{
              padding: '16px 18px',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  padding: '10px',
                  borderRadius: '12px',
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  flexShrink: 0
                }}
              >
                <KeyRound size={22} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>
                  4-Digit Numeric MPIN
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Swift 1-second PIN unlocking without typing passwords
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ fontWeight: '800', fontSize: '12px', padding: '8px 16px', borderRadius: '10px', whiteSpace: 'nowrap' }}
              onClick={() => {
                onClose();
                onSetupMpin();
              }}
            >
              Set Up MPIN <ArrowRight size={14} />
            </button>
          </div>

          {/* Card 2: Google Authenticator (2FA) */}
          <div
            className="card"
            style={{
              padding: '16px 18px',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  padding: '10px',
                  borderRadius: '12px',
                  background: 'var(--info-light)',
                  color: 'var(--info)',
                  flexShrink: 0
                }}
              >
                <QrCode size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>
                    Google Authenticator (2FA)
                  </span>
                  <span className="badge badge-primary" style={{ fontSize: '8.5px', padding: '1px 5px' }}>
                    Highest Security
                  </span>
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Scan QR code with Authenticator app for time-based OTPs
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ fontWeight: '800', fontSize: '12px', padding: '8px 16px', borderRadius: '10px', whiteSpace: 'nowrap' }}
              onClick={() => {
                onClose();
                onSetupTwoFactor();
              }}
            >
              Enable 2FA <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Security Guarantees & Dismiss button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />
            <span>Encrypted with AES-256 & bcrypt</span>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}
            onClick={onClose}
          >
            I'll set this up later
          </button>
        </div>
      </div>
    </div>
  );
}
