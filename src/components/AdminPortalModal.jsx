import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  Activity,
  Lock,
  Unlock,
  KeyRound,
  LogOut,
  RefreshCw,
  Search,
  AlertTriangle,
  Send,
  EyeOff,
  X,
  Smartphone,
  Globe,
  Clock,
  CheckCircle2,
  Sliders,
  UserX,
  UserCheck
} from 'lucide-react';

export default function AdminPortalModal({
  isOpen,
  onClose,
  token,
  currentUser,
  onUserRoleUpdated
}) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('users'); // 'users', 'audit', 'settings'
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'suspended', 'locked'
  const [actionMessage, setActionMessage] = useState({ text: '', type: 'info' });
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Admin secret key manual unlock state
  const [adminKeyInput, setAdminKeyInput] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(
    currentUser?.role === 'super_admin' || false
  );
  const [keyVerifying, setKeyVerifying] = useState(false);

  const showNotification = (text, type = 'info') => {
    setActionMessage({ text, type });
    setTimeout(() => {
      setActionMessage({ text: '', type: 'info' });
    }, 4000);
  };

  const getHeaders = () => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const storedKey = localStorage.getItem('kuberis_admin_key');
    if (storedKey) headers['X-Admin-Key'] = storedKey;
    return headers;
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats', { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (e) {
      console.warn('Failed to fetch admin stats:', e.message);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      } else if (res.status === 403) {
        setIsSuperAdmin(false);
      }
    } catch (e) {
      console.warn('Failed to fetch users:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/audit-logs?limit=100', { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (e) {
      console.warn('Failed to fetch admin audit logs:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const reloadData = () => {
    fetchStats();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'audit') fetchAuditLogs();
  };

  useEffect(() => {
    if (isOpen) {
      fetchStats();
      fetchUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'audit') fetchAuditLogs();
  }, [activeTab]);

  // Handle Admin Key verification
  const handleVerifyKey = async (e) => {
    e?.preventDefault();
    if (!adminKeyInput.trim()) return;
    setKeyVerifying(true);
    try {
      const res = await fetch('/api/admin/verify-key', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ adminKey: adminKeyInput.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('kuberis_admin_key', adminKeyInput.trim());
        setIsSuperAdmin(true);
        showNotification('Super Admin privileges confirmed! Platform commands unlocked.', 'success');
        if (onUserRoleUpdated) onUserRoleUpdated('super_admin');
        fetchStats();
        fetchUsers();
      } else {
        showNotification(data.error || 'Invalid Admin Key', 'danger');
      }
    } catch (err) {
      showNotification('Verification request failed', 'danger');
    } finally {
      setKeyVerifying(false);
    }
  };

  // Admin Actions on users
  const handleSuspendToggle = async (user) => {
    const isSuspending = !user.isSuspended;
    const confirmPrompt = isSuspending
      ? `Are you sure you want to SUSPEND ${user.email}? Their active session will be terminated instantly.`
      : `Reactivate account for ${user.email}?`;
    if (!window.confirm(confirmPrompt)) return;

    setActionLoadingId(user.id);
    try {
      const res = await fetch('/api/admin/users/suspend', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          targetUserId: user.id,
          suspend: isSuspending,
          reason: isSuspending ? 'Administrative hold by Super Admin' : null
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(`User ${user.email} ${isSuspending ? 'suspended' : 'reactivated'} successfully.`, 'success');
        fetchUsers();
        fetchStats();
      } else {
        showNotification(data.error || 'Failed to update user status', 'danger');
      }
    } catch (e) {
      showNotification('Network error executing suspension', 'danger');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnlockUser = async (user) => {
    if (!window.confirm(`Unlock MPIN attempts and reset lock status for ${user.email}?`)) return;

    setActionLoadingId(user.id);
    try {
      const res = await fetch('/api/admin/users/unlock', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ targetUserId: user.id })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(`Account ${user.email} unlocked successfully.`, 'success');
        fetchUsers();
        fetchStats();
      } else {
        showNotification(data.error || 'Failed to unlock user', 'danger');
      }
    } catch (e) {
      showNotification('Network error executing unlock', 'danger');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleTerminateSessions = async (user) => {
    if (!window.confirm(`Terminate all active devices and revoke refresh tokens for ${user.email}?`)) return;

    setActionLoadingId(user.id);
    try {
      const res = await fetch('/api/admin/users/terminate-sessions', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ targetUserId: user.id })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(`All active sessions terminated for ${user.email}.`, 'success');
        fetchUsers();
        fetchStats();
      } else {
        showNotification(data.error || 'Failed to terminate sessions', 'danger');
      }
    } catch (e) {
      showNotification('Network error terminating sessions', 'danger');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleTriggerReset = async (user, resetType) => {
    const label = resetType === 'mpin' ? 'MPIN' : 'Password';
    if (!window.confirm(`Dispatch direct ${label} reset link to ${user.email}?`)) return;

    setActionLoadingId(user.id);
    try {
      const res = await fetch('/api/admin/users/trigger-reset', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ targetUserId: user.id, resetType })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(data.message, 'success');
      } else {
        showNotification(data.error || `Failed to dispatch ${label} reset`, 'danger');
      }
    } catch (e) {
      showNotification('Network error triggering reset', 'danger');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'active') return !u.isSuspended && !u.isLocked;
    if (statusFilter === 'suspended') return !!u.isSuspended;
    if (statusFilter === 'locked') return !!u.isLocked;
    return true;
  });

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ padding: '16px', zIndex: 9999 }}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '920px',
          width: '100%',
          padding: '24px',
          borderRadius: '24px',
          background: 'var(--bg-card, #0a1120)',
          backdropFilter: 'blur(32px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 28px 70px rgba(0, 0, 0, 0.85)',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)' }}>
              <ShieldAlert size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '19px', fontWeight: '800', margin: 0, color: 'var(--text-main, #FFFFFF)' }}>
                  Super Admin Command Center
                </h2>
                <span style={{ fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.18)', color: '#F87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  Phase 2 Security
                </span>
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted, #94A3B8)', marginTop: '2px' }}>
                Tenant Governance, Session Interception & Zero-Knowledge Security Control
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={reloadData}
              disabled={loading}
              style={{ fontSize: '11px', padding: '6px 10px', gap: '5px' }}
              title="Refresh Data"
            >
              <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh
            </button>
            <button className="modal-close" onClick={onClose} aria-label="Close" style={{ padding: '6px' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Zero-Knowledge Privacy Architecture Guarantee Banner */}
        <div style={{ padding: '10px 14px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(14, 165, 233, 0.08) 100%)', border: '1px solid rgba(16, 185, 129, 0.25)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <EyeOff size={18} style={{ color: 'var(--primary, #10B981)', flexShrink: 0 }} />
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted, #CBD5E1)', lineHeight: '1.45' }}>
            <strong style={{ color: 'var(--text-main, #FFFFFF)' }}>Zero-Knowledge Privacy Active:</strong> Super Admins can manage account status, unlock lockouts, and terminate rogue sessions. However, <strong>no customer financial data</strong> (balances, bank statements, transaction values, or net worth) is ever queryable or visible in this console.
          </div>
        </div>

        {/* Alert Notification Toast */}
        {actionMessage.text && (
          <div style={{ padding: '8px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', background: actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : actionMessage.type === 'danger' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.15)', color: actionMessage.type === 'success' ? '#34D399' : actionMessage.type === 'danger' ? '#F87171' : '#38BDF8', border: `1px solid ${actionMessage.type === 'success' ? '#059669' : actionMessage.type === 'danger' ? '#DC2626' : '#0284C7'}` }}>
            {actionMessage.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            {actionMessage.text}
          </div>
        )}

        {/* Stat Cards Ribbon */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '14px' }}>
            <div style={{ padding: '10px 12px', borderRadius: '12px', background: 'var(--bg-app, #030814)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted, #94A3B8)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Users size={11} /> Total Users
              </div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#FFFFFF', marginTop: '3px' }}>{stats.totalUsers}</div>
            </div>
            <div style={{ padding: '10px 12px', borderRadius: '12px', background: 'var(--bg-app, #030814)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted, #94A3B8)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Activity size={11} style={{ color: '#10B981' }} /> Active Sessions
              </div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#10B981', marginTop: '3px' }}>{stats.activeSessions}</div>
            </div>
            <div style={{ padding: '10px 12px', borderRadius: '12px', background: 'var(--bg-app, #030814)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted, #94A3B8)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={11} style={{ color: '#38BDF8' }} /> 2FA Adoption
              </div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#38BDF8', marginTop: '3px' }}>{stats.twoFactorAdoptionRate}%</div>
            </div>
            <div style={{ padding: '10px 12px', borderRadius: '12px', background: 'var(--bg-app, #030814)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted, #94A3B8)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <KeyRound size={11} style={{ color: '#F59E0B' }} /> MPIN Adoption
              </div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#F59E0B', marginTop: '3px' }}>{stats.mpinAdoptionRate}%</div>
            </div>
            <div style={{ padding: '10px 12px', borderRadius: '12px', background: 'var(--bg-app, #030814)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted, #94A3B8)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <UserX size={11} style={{ color: '#EF4444' }} /> Suspended / Locked
              </div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: stats.suspendedCount + stats.lockedCount > 0 ? '#EF4444' : '#94A3B8', marginTop: '3px' }}>
                {stats.suspendedCount + stats.lockedCount}
              </div>
            </div>
          </div>
        )}

        {/* Tab Controls & Filter Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'users' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('users')}
              style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '10px', gap: '5px' }}
            >
              <Users size={13} /> Tenant Directory ({filteredUsers.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'audit' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('audit')}
              style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '10px', gap: '5px' }}
            >
              <Activity size={13} /> Platform Audit Trail
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'settings' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('settings')}
              style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '10px', gap: '5px' }}
            >
              <Sliders size={13} /> Admin Key Access
            </button>
          </div>

          {activeTab === 'users' && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1, minWidth: '260px', justifyContent: 'flex-end' }}>
              <div style={{ position: 'relative', width: '200px' }}>
                <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search user / email..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px 6px 30px', fontSize: '11.5px', borderRadius: '8px', background: 'var(--bg-app, #030814)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#FFFFFF' }}
                />
              </div>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{ padding: '6px 10px', fontSize: '11.5px', borderRadius: '8px', background: 'var(--bg-app, #030814)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#FFFFFF' }}
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="suspended">Suspended Only</option>
                <option value="locked">Locked Only</option>
              </select>
            </div>
          )}
        </div>

        {/* Tab 1: Tenant Users Directory */}
        {activeTab === 'users' && (
          <div style={{ flex: 1, overflowY: 'auto', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', background: 'rgba(3, 8, 20, 0.6)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: 'var(--text-muted, #94A3B8)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '12px 14px' }}>User / Identity</th>
                  <th style={{ padding: '12px 14px' }}>Security Status</th>
                  <th style={{ padding: '12px 14px' }}>Active Session</th>
                  <th style={{ padding: '12px 14px' }}>Account State</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Admin Governance Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      {loading ? 'Loading user registry...' : 'No users match your criteria'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(userItem => {
                    const isBusy = actionLoadingId === userItem.id;
                    const isSuspended = !!userItem.isSuspended;
                    const isLocked = !!userItem.isLocked;

                    return (
                      <tr
                        key={userItem.id}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          background: isSuspended ? 'rgba(239, 68, 68, 0.04)' : 'transparent',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        {/* User Identity */}
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: '700', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {userItem.name}
                            {userItem.role === 'super_admin' && (
                              <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.2)', color: '#F87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                ADMIN
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted, #94A3B8)' }}>{userItem.email}</div>
                          <div style={{ fontSize: '9.5px', color: 'rgba(148, 163, 184, 0.6)', marginTop: '2px', fontFamily: 'monospace' }}>
                            ID: {userItem.id}
                          </div>
                        </td>

                        {/* Security Features */}
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '9.5px', padding: '2px 6px', borderRadius: '4px', background: userItem.twoFactorEnabled ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.04)', color: userItem.twoFactorEnabled ? '#38BDF8' : '#64748B' }}>
                              2FA: {userItem.twoFactorEnabled ? 'ON' : 'OFF'}
                            </span>
                            <span style={{ fontSize: '9.5px', padding: '2px 6px', borderRadius: '4px', background: userItem.hasMpin ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.04)', color: userItem.hasMpin ? '#F59E0B' : '#64748B' }}>
                              MPIN: {userItem.hasMpin ? 'SET' : 'NONE'}
                            </span>
                            <span style={{ fontSize: '9.5px', padding: '2px 6px', borderRadius: '4px', background: userItem.hasPasskey ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.04)', color: userItem.hasPasskey ? '#A855F7' : '#64748B' }}>
                              BIO: {userItem.hasPasskey ? 'ACTIVE' : 'NO'}
                            </span>
                          </div>
                          {userItem.failedMpinAttempts > 0 && (
                            <div style={{ fontSize: '10px', color: '#F87171', marginTop: '4px', fontWeight: '600' }}>
                              ⚠️ {userItem.failedMpinAttempts} incorrect MPIN attempts
                            </div>
                          )}
                        </td>

                        {/* Active Session Status */}
                        <td style={{ padding: '12px 14px' }}>
                          {userItem.activeSession ? (
                            <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#34D399', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '700' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span> Live Session
                            </span>
                          ) : (
                            <span style={{ fontSize: '10px', color: '#64748B' }}>Disconnected</span>
                          )}
                        </td>

                        {/* Account State */}
                        <td style={{ padding: '12px 14px' }}>
                          {isSuspended ? (
                            <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.15)', color: '#F87171', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: '700' }}>
                              Suspended
                            </span>
                          ) : isLocked ? (
                            <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', border: '1px solid rgba(245, 158, 11, 0.3)', fontWeight: '700' }}>
                              Locked (MPIN)
                            </span>
                          ) : (
                            <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.12)', color: '#34D399', fontWeight: '700' }}>
                              Operational
                            </span>
                          )}
                        </td>

                        {/* Governance Action Buttons */}
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            {/* Suspend / Reactivate */}
                            <button
                              type="button"
                              className={`btn btn-sm ${isSuspended ? 'btn-primary' : 'btn-secondary'}`}
                              onClick={() => handleSuspendToggle(userItem)}
                              disabled={isBusy}
                              style={{ fontSize: '10.5px', padding: '4px 8px', borderRadius: '6px' }}
                              title={isSuspended ? 'Reactivate Account' : 'Suspend Account'}
                            >
                              {isSuspended ? <UserCheck size={12} /> : <UserX size={12} />}
                              {isSuspended ? 'Reactivate' : 'Suspend'}
                            </button>

                            {/* Unlock MPIN Lockout */}
                            {(isLocked || userItem.failedMpinAttempts > 0) && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleUnlockUser(userItem)}
                                disabled={isBusy}
                                style={{ fontSize: '10.5px', padding: '4px 8px', borderRadius: '6px', color: '#F59E0B' }}
                                title="Reset Failed Attempts and Unlock Account"
                              >
                                <Unlock size={12} /> Unlock
                              </button>
                            )}

                            {/* Terminate Sessions */}
                            {userItem.activeSession && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleTerminateSessions(userItem)}
                                disabled={isBusy}
                                style={{ fontSize: '10.5px', padding: '4px 8px', borderRadius: '6px', color: '#F87171' }}
                                title="Terminate All Active Sessions"
                              >
                                <LogOut size={12} /> Kill Session
                              </button>
                            )}

                            {/* Dispatch Password Reset */}
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleTriggerReset(userItem, 'password')}
                              disabled={isBusy}
                              style={{ fontSize: '10.5px', padding: '4px 7px', borderRadius: '6px', color: 'var(--text-muted)' }}
                              title="Send Password Reset Email"
                            >
                              <Lock size={12} /> Reset Pwd
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Platform Security Audit Trail */}
        {activeTab === 'audit' && (
          <div style={{ flex: 1, overflowY: 'auto', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', background: 'rgba(3, 8, 20, 0.6)', padding: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {auditLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  {loading ? 'Fetching audit records...' : 'No platform audit events recorded'}
                </div>
              ) : (
                auditLogs.map(log => {
                  const isBlocked = log.status === 'BLOCKED' || log.status === 'FAILURE';
                  const dateStr = new Date(log.created_at).toLocaleString('en-IN', {
                    dateStyle: 'short',
                    timeStyle: 'medium'
                  });

                  return (
                    <div
                      key={log.id}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: isBlocked ? 'rgba(239, 68, 68, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                        border: `1px solid ${isBlocked ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.06)'}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: isBlocked ? '#EF4444' : '#10B981',
                            flexShrink: 0
                          }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '12px', fontWeight: '700', color: '#FFFFFF' }}>
                              {log.event_type}
                            </span>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              User: {log.user_id}
                            </span>
                            {log.device_name && (
                              <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.1)', color: '#38BDF8', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <Smartphone size={8} /> {log.device_name}
                              </span>
                            )}
                            {log.location && (
                              <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '4px', background: 'rgba(168, 85, 247, 0.1)', color: '#A855F7', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <Globe size={8} /> {log.location}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Clock size={9} /> {dateStr}
                            <span>• IP: {log.ip_address || '127.0.0.1'}</span>
                          </div>
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: '800',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: isBlocked ? 'rgba(239, 68, 68, 0.18)' : 'rgba(16, 185, 129, 0.18)',
                          color: isBlocked ? '#F87171' : '#34D399',
                          flexShrink: 0
                        }}
                      >
                        {log.status}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Super Admin Access Settings */}
        {activeTab === 'settings' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', background: 'rgba(3, 8, 20, 0.6)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#FFFFFF', marginBottom: '8px' }}>
              Super Admin Key Authentication & Elevation
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '16px' }}>
              Enter the platform master secret key to authenticate or promote the current signed-in account to <code>super_admin</code> status. This key is governed by server environment configuration (<code>ADMIN_SECRET_KEY</code>).
            </p>

            <form onSubmit={handleVerifyKey} style={{ maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-main)' }}>
                Master Admin Secret Key:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Enter ADMIN_SECRET_KEY..."
                  value={adminKeyInput}
                  onChange={e => setAdminKeyInput(e.target.value)}
                  style={{ fontSize: '12px', padding: '8px 12px', flex: 1 }}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={keyVerifying || !adminKeyInput.trim()}
                  style={{ fontSize: '12px', padding: '8px 16px' }}
                >
                  {keyVerifying ? 'Verifying...' : 'Authorize'}
                </button>
              </div>
            </form>

            <div style={{ marginTop: '24px', padding: '14px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <h4 style={{ fontSize: '12px', fontWeight: '700', color: '#FFFFFF', margin: '0 0 6px 0' }}>
                Default Super Admin Email Routing
              </h4>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: 0 }}>
                Accounts registered with emails defined in <code>SUPER_ADMIN_EMAILS</code> (or default <code>admin@kuberis.com</code>) automatically receive elevated administrative governance rights upon sign-in.
              </p>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-end', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '14px', marginTop: '14px' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} style={{ fontSize: '12px', padding: '6px 16px' }}>
            Close Command Center
          </button>
        </div>
      </div>
    </div>
  );
}
