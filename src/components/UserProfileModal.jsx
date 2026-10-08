import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Mail,
  ShieldCheck,
  Lock,
  Wallet,
  LogOut,
  KeyRound,
  CheckCircle2,
  Fingerprint,
  ShieldAlert,
  Sparkles,
  Receipt,
  Trash2,
  AlertTriangle,
  ChevronRight,
  Compass,
  History,
  Clock,
  RefreshCw,
  Smartphone,
  Globe
} from 'lucide-react';
import { registerBiometricPasskey } from '../utils/biometrics';
import { calculateDynamicNetWorth } from '../utils/netWorth';

export default function UserProfileModal({
  isOpen,
  onClose,
  user,
  token,
  settings = {},
  investments = [],
  transactionCount = 0,
  onLogout,
  onOpenForgotPassword,
  onOpenChangePassword,
  onOpenMpinModal,
  onOpenTwoFactorModal,
  onStartTour,
  onOpenAdminPortal,
  theme
}) {
  const isLight =
    theme === 'light' ||
    (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light');

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [bioMessage, setBioMessage] = useState('');
  const [bioError, setBioError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);

  const loadAuditLogs = async () => {
    if (!token) return;
    setLoadingAuditLogs(true);
    try {
      const res = await fetch('/api/auth/audit-logs?limit=8', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Auth-Token': token
        }
      });
      const data = await res.json();
      if (data && Array.isArray(data.logs)) {
        setAuditLogs(data.logs);
      }
    } catch (err) {
      console.warn('Failed to load audit logs:', err);
    } finally {
      setLoadingAuditLogs(false);
    }
  };

  useEffect(() => {
    if (isOpen && token) {
      loadAuditLogs();
    }
  }, [isOpen, token]);

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const handleLogoutAnimated = () => {
    setIsLoggingOut(true);
    onLogout();
    onClose();
    setIsLoggingOut(false);
  };

  const handleEnableBiometrics = async () => {
    setBioMessage('');
    setBioError('');
    try {
      await registerBiometricPasskey(user, token);
      setBioMessage('Face ID / Touch ID Biometrics Enabled!');
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('timed out') || msg.includes('cancelled') || msg.includes('not allowed')) {
        setBioError('Passkey prompt closed. You can also use 4-Digit MPIN for quick access.');
      } else {
        setBioError(msg || 'Failed to enable biometrics');
      }
    }
  };

  const handleDeleteAccountPermanent = async () => {
    if (deleteConfirmText.trim() !== 'DELETE MY ACCOUNT PERMANENTLY') {
      setDeleteError('Please type exact confirmation phrase: DELETE MY ACCOUNT PERMANENTLY');
      return;
    }

    setDeletingAccount(true);
    setDeleteError('');
    try {
      const res = await fetch('/api/auth/account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to delete account');
      }

      localStorage.removeItem('kuberis_token');
      localStorage.removeItem('kuberis_user');
      localStorage.removeItem('kuberis_remembered_email');
      localStorage.removeItem('kuberis_has_mpin');
      localStorage.removeItem('wealthpulse_token');
      localStorage.removeItem('wealthpulse_user');
      localStorage.removeItem('wealthpulse_remembered_email');
      localStorage.removeItem('wealthpulse_has_mpin');
      localStorage.removeItem('ledgerly_token');
      localStorage.removeItem('ledgerly_user');
      localStorage.removeItem('ledgerly_remembered_email');
      localStorage.removeItem('ledgerly_has_mpin');

      onLogout();
      onClose();
    } catch (err) {
      setDeleteError(err.message || 'Account deletion failed');
    } finally {
      setDeletingAccount(false);
    }
  };

  const { netWorth } = calculateDynamicNetWorth(investments, settings);

  // Dynamic colors
  const textHeading = isLight ? '#0F172A' : '#FFFFFF';
  const textSub = isLight ? '#64748B' : '#94A3B8';
  const cardItemBg = isLight ? 'rgba(241, 245, 249, 0.85)' : 'rgba(5, 15, 30, 0.7)';
  const cardItemBorder = isLight ? '1px solid rgba(203, 213, 225, 0.85)' : '1px solid rgba(255, 255, 255, 0.08)';

  return (
    <AnimatePresence>
      {isOpen && user && (
        <motion.div
          className="kuberis-profile-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={onClose}
        >
          <motion.div
            className="kuberis-profile-card"
            initial={{ scale: 0.94, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 15 }}
            transition={{ type: 'spring', stiffness: 280, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Specular Light Beam */}
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
                zIndex: 30
              }}
            />

            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 28px',
                borderBottom: isLight ? '1px solid rgba(203, 213, 225, 0.6)' : '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '14px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#10B981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h2
                    style={{
                      fontSize: '19px',
                      fontWeight: '800',
                      color: textHeading,
                      margin: 0,
                      letterSpacing: '-0.3px'
                    }}
                  >
                    User Profile & Security Cockpit
                  </h2>
                  <div style={{ fontSize: '12px', color: textSub, marginTop: '2px' }}>
                    Institutional-grade identity, credentials & audit logging
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.06)',
                  border: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: textSub,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Expansive 2-Column Dashboard Body */}
            <div className="kuberis-profile-body">
              {/* LEFT COLUMN: IDENTITY & FAST AUTHENTICATION ENGINE */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* User Identity Liquid Glass Banner */}
                <div
                  style={{
                    padding: '16px 18px',
                    borderRadius: '18px',
                    background: isLight
                      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(241, 245, 249, 0.95) 100%)'
                      : 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(10, 25, 47, 0.9) 100%)',
                    border: isLight ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(16, 185, 129, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px'
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      color: '#000000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '900',
                      fontSize: '18px',
                      boxShadow: '0 4px 15px rgba(16, 185, 129, 0.35)',
                      flexShrink: 0
                    }}
                  >
                    {getInitials(user.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '800', color: textHeading, margin: 0 }}>
                        {user.name}
                      </h3>
                      {user.role === 'super_admin' ? (
                        <span
                          style={{
                            fontSize: '9.5px',
                            fontWeight: '800',
                            padding: '2px 7px',
                            borderRadius: '6px',
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: '#F87171',
                            border: '1px solid rgba(239, 68, 68, 0.35)',
                            letterSpacing: '0.5px'
                          }}
                        >
                          SUPER ADMIN
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '9.5px',
                            fontWeight: '800',
                            padding: '2px 7px',
                            borderRadius: '6px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: isLight ? '#059669' : '#34D399',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            letterSpacing: '0.5px'
                          }}
                        >
                          MEMBER
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: textSub,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        marginTop: '3px'
                      }}
                    >
                      <Mail size={12} /> {user.email}
                    </div>
                  </div>
                </div>

                {/* Fast Authentication Options */}
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      letterSpacing: '0.8px',
                      color: textSub,
                      marginBottom: '10px'
                    }}
                  >
                    Authentication & Credentials
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Passkeys / FaceID Card */}
                    <div
                      style={{
                        padding: '14px 16px',
                        borderRadius: '16px',
                        background: cardItemBg,
                        border: cardItemBorder,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            padding: '10px',
                            background: 'rgba(56, 189, 248, 0.15)',
                            color: '#38BDF8',
                            borderRadius: '12px'
                          }}
                        >
                          <Fingerprint size={20} />
                        </div>
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: '700', color: textHeading }}>
                            Face ID / Biometrics
                          </div>
                          <div style={{ fontSize: '11.5px', color: textSub }}>Touch ID & Device Passkeys</div>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ borderRadius: '10px', fontSize: '11.5px', fontWeight: '700', padding: '7px 14px' }}
                        onClick={handleEnableBiometrics}
                      >
                        Enable Passkey
                      </motion.button>
                    </div>

                    {bioMessage && (
                      <div style={{ fontSize: '11.5px', color: '#10B981', padding: '0 4px' }}>
                        ✓ {bioMessage}
                      </div>
                    )}
                    {bioError && (
                      <div style={{ fontSize: '11.5px', color: '#F87171', padding: '0 4px' }}>
                        {bioError}
                      </div>
                    )}

                    {/* Google Authenticator 2FA Card */}
                    <div
                      style={{
                        padding: '14px 16px',
                        borderRadius: '16px',
                        background: cardItemBg,
                        border: cardItemBorder,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            padding: '10px',
                            background: user?.twoFactorEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: user?.twoFactorEnabled ? '#10B981' : '#F59E0B',
                            borderRadius: '12px'
                          }}
                        >
                          <ShieldCheck size={20} />
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: '13.5px',
                              fontWeight: '700',
                              color: textHeading,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            Google Authenticator 2FA
                            <span
                              style={{
                                fontSize: '9.5px',
                                padding: '1px 6px',
                                borderRadius: '6px',
                                fontWeight: '800',
                                background: user?.twoFactorEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                color: user?.twoFactorEnabled ? (isLight ? '#059669' : '#34D399') : '#F59E0B'
                              }}
                            >
                              {user?.twoFactorEnabled ? 'Active 🟢' : 'Disabled 🔴'}
                            </span>
                          </div>
                          <div style={{ fontSize: '11.5px', color: textSub }}>AWS-style 6-Digit rolling TOTP</div>
                        </div>
                      </div>
                      {onOpenTwoFactorModal && (
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          type="button"
                          className={`btn ${user?.twoFactorEnabled ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                          style={{ borderRadius: '10px', fontSize: '11.5px', fontWeight: '700', padding: '7px 14px' }}
                          onClick={onOpenTwoFactorModal}
                        >
                          {user?.twoFactorEnabled ? 'Manage 2FA' : 'Enable 2FA'}
                        </motion.button>
                      )}
                    </div>

                    {/* 4-Digit MPIN Security Card */}
                    <div
                      style={{
                        padding: '14px 16px',
                        borderRadius: '16px',
                        background: cardItemBg,
                        border: cardItemBorder,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            padding: '10px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#10B981',
                            borderRadius: '12px'
                          }}
                        >
                          <KeyRound size={20} />
                        </div>
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: '700', color: textHeading }}>
                            4-Digit MPIN
                          </div>
                          <div
                            style={{
                              fontSize: '11.5px',
                              color: user?.hasMpin ? (isLight ? '#059669' : '#34D399') : '#F59E0B',
                              fontWeight: '600'
                            }}
                          >
                            {user?.hasMpin ? '✓ MPIN Active' : 'MPIN Not Configured'}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ borderRadius: '10px', fontSize: '11.5px', fontWeight: '700', padding: '7px 12px' }}
                          onClick={() => {
                            onClose();
                            onOpenMpinModal(user?.hasMpin ? 'change' : 'set');
                          }}
                        >
                          {user?.hasMpin ? 'Change' : 'Set MPIN'}
                        </motion.button>
                        {user?.hasMpin && (
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            type="button"
                            className="btn btn-sm"
                            style={{
                              fontSize: '11.5px',
                              fontWeight: '700',
                              padding: '7px 12px',
                              color: '#EF4444',
                              borderRadius: '10px',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              background: 'rgba(239, 68, 68, 0.08)'
                            }}
                            onClick={() => {
                              onClose();
                              onOpenMpinModal('set');
                            }}
                          >
                            Reset
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Action Buttons */}
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    paddingTop: '6px'
                  }}
                >
                  {onStartTour && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        onClose();
                        onStartTour();
                      }}
                      style={{ fontSize: '11.5px', padding: '7px 12px', gap: '5px' }}
                      title="Interactive Walkthrough Tour"
                    >
                      <Compass size={13} style={{ color: '#10B981' }} /> Tour
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      onClose();
                      if (onOpenChangePassword) {
                        onOpenChangePassword();
                      } else if (onOpenForgotPassword) {
                        onOpenForgotPassword();
                      }
                    }}
                    style={{ fontSize: '11.5px', padding: '7px 12px', gap: '5px' }}
                    title="Change Account Password"
                  >
                    <Lock size={13} /> Change Password
                  </button>

                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    style={{ color: '#EF4444', fontSize: '11.5px', padding: '7px 10px', gap: '4px' }}
                  >
                    <Trash2 size={13} /> Delete Account
                  </button>

                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={handleLogoutAnimated}
                    style={{ fontSize: '11.5px', padding: '7px 14px', marginLeft: 'auto', gap: '5px' }}
                  >
                    <LogOut size={13} /> Sign Out
                  </button>
                </div>
              </div>

              {/* RIGHT COLUMN: LIVE WEALTH PULSE & ZERO-TRUST AUDIT STREAM */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Financial Portfolio Summary */}
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      letterSpacing: '0.8px',
                      color: textSub,
                      marginBottom: '10px'
                    }}
                  >
                    Financial Portfolio Summary
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    <div
                      style={{
                        padding: '14px 16px',
                        borderRadius: '16px',
                        background: cardItemBg,
                        border: cardItemBorder
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11.5px',
                          color: textSub,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Wallet size={14} style={{ color: '#10B981' }} /> Net Worth
                        <span
                          style={{
                            fontSize: '8.5px',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: isLight ? '#059669' : '#34D399',
                            fontWeight: '800'
                          }}
                        >
                          Live
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '19px',
                          fontWeight: '900',
                          color: netWorth >= 0 ? (isLight ? '#059669' : '#10B981') : '#EF4444',
                          marginTop: '6px'
                        }}
                      >
                        ₹{netWorth.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '14px 16px',
                        borderRadius: '16px',
                        background: cardItemBg,
                        border: cardItemBorder
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11.5px',
                          color: textSub,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Receipt size={14} style={{ color: '#38BDF8' }} /> Transactions
                      </div>
                      <div
                        style={{
                          fontSize: '19px',
                          fontWeight: '900',
                          color: textHeading,
                          marginTop: '6px'
                        }}
                      >
                        {transactionCount}{' '}
                        <span style={{ fontSize: '12px', fontWeight: '600', color: textSub }}>entries</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Security Activity Audit Log Card */}
                <div
                  style={{
                    padding: '16px 18px',
                    borderRadius: '18px',
                    background: cardItemBg,
                    border: cardItemBorder,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '12px'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '7px',
                        fontSize: '13.5px',
                        fontWeight: '800',
                        color: textHeading
                      }}
                    >
                      <History size={15} style={{ color: '#10B981' }} /> Recent Security Activity
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={loadAuditLogs}
                        disabled={loadingAuditLogs}
                        title="Refresh audit activity logs"
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '2px 6px',
                          cursor: 'pointer',
                          color: textSub,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '10.5px',
                          borderRadius: '6px'
                        }}
                      >
                        <RefreshCw size={11} className={loadingAuditLogs ? 'animate-spin' : ''} />
                        <span>{loadingAuditLogs ? 'Refreshing...' : 'Refresh'}</span>
                      </button>
                      <span
                        style={{
                          fontSize: '10px',
                          color: textSub,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <ShieldCheck size={11} style={{ color: '#10B981' }} /> Zero-Trust
                      </span>
                    </div>
                  </div>

                  {loadingAuditLogs ? (
                    <div
                      style={{
                        padding: '24px',
                        textAlign: 'center',
                        fontSize: '12px',
                        color: textSub,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <RefreshCw size={14} className="animate-spin" /> Loading security audit records...
                    </div>
                  ) : auditLogs.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', fontSize: '12px', color: textSub }}>
                      No recent security events recorded yet.
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '7px',
                        maxHeight: '230px',
                        overflowY: 'auto',
                        paddingRight: '2px'
                      }}
                    >
                      {auditLogs.map((log) => {
                        const isSuccess = log.status === 'SUCCESS';
                        const eventName = (log.eventType || log.event_type || '')
                          .replace(/_/g, ' ')
                          .toLowerCase()
                          .replace(/\b\w/g, (c) => c.toUpperCase());
                        const timestamp = log.createdAt || log.created_at;
                        const formattedDate = timestamp
                          ? new Date(timestamp).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : '';
                        const device = log.deviceName || log.device_name || '';
                        const location = log.location || '';
                        const ip = log.ipAddress || log.ip_address || '';

                        return (
                          <div
                            key={log.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              borderRadius: '10px',
                              background: isLight ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.25)',
                              border: isLight ? '1px solid rgba(226, 232, 240, 0.8)' : '1px solid rgba(255, 255, 255, 0.05)',
                              fontSize: '11px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  background: isSuccess ? '#10B981' : '#EF4444',
                                  flexShrink: 0
                                }}
                              />
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: '700', color: textHeading, whiteSpace: 'nowrap' }}>
                                    {eventName}
                                  </span>
                                  {device && (
                                    <span
                                      style={{
                                        fontSize: '9.5px',
                                        padding: '1px 5px',
                                        borderRadius: '4px',
                                        background: 'rgba(56, 189, 248, 0.1)',
                                        color: '#38BDF8',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px'
                                      }}
                                    >
                                      <Smartphone size={8} /> {device}
                                    </span>
                                  )}
                                  {location && (
                                    <span
                                      style={{
                                        fontSize: '9.5px',
                                        padding: '1px 5px',
                                        borderRadius: '4px',
                                        background: 'rgba(168, 85, 247, 0.1)',
                                        color: '#A855F7',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px'
                                      }}
                                    >
                                      <Globe size={8} /> {location}
                                    </span>
                                  )}
                                </div>
                                <span
                                  style={{
                                    fontSize: '10px',
                                    color: textSub,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <Clock size={9} /> {formattedDate}
                                  {ip && <span>• {ip}</span>}
                                </span>
                              </div>
                            </div>
                            <span
                              style={{
                                fontSize: '9.5px',
                                fontWeight: '800',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: isSuccess ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                color: isSuccess ? (isLight ? '#059669' : '#10B981') : '#EF4444',
                                flexShrink: 0
                              }}
                            >
                              {log.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Account Deletion Confirmation Box */}
                {showDeleteConfirm && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{
                      padding: '14px',
                      borderRadius: '14px',
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid #EF4444'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#EF4444',
                        fontWeight: '800',
                        fontSize: '12.5px',
                        marginBottom: '4px'
                      }}
                    >
                      <AlertTriangle size={15} /> Permanently Delete Account?
                    </div>
                    <p style={{ fontSize: '11.5px', color: textSub, lineHeight: '1.4', marginBottom: '10px' }}>
                      This will permanently delete your account (<strong>{user.email}</strong>) and all records. This
                      action cannot be undone.
                    </p>

                    <div style={{ marginBottom: '10px' }}>
                      <label
                        style={{
                          fontSize: '10.5px',
                          color: '#EF4444',
                          fontWeight: '700',
                          display: 'block',
                          marginBottom: '4px'
                        }}
                      >
                        Type <code>DELETE MY ACCOUNT PERMANENTLY</code>:
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="DELETE MY ACCOUNT PERMANENTLY"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        style={{ borderColor: '#EF4444', fontSize: '11.5px', padding: '7px 10px' }}
                      />
                    </div>

                    {deleteError && (
                      <div style={{ fontSize: '11.5px', color: '#EF4444', marginBottom: '8px' }}>
                        {deleteError}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={deletingAccount}
                        style={{ fontSize: '11.5px', padding: '5px 10px' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={handleDeleteAccountPermanent}
                        disabled={deletingAccount}
                        style={{ fontSize: '11.5px', padding: '5px 12px' }}
                      >
                        {deletingAccount ? 'Deleting...' : 'Confirm Deletion'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
