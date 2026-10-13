import React, { useState, useEffect, useRef } from 'react';
import {
  Sliders,
  Sparkles,
  FolderSync,
  Upload,
  Plus,
  LogIn,
  UserPlus,
  LogOut,
  Sun,
  Moon,
  Eye,
  EyeOff,
  Landmark,
  TrendingUp,
  Shield,
  Lock,
  ArrowUpRight,
  ArrowDownRight,
  Compass,
  Bell,
  CheckCheck,
  RefreshCw,
  Zap
} from 'lucide-react';
import { RATE_NOTIFICATIONS } from '../utils/fdRates';

const INITIAL_TICKERS = [
  { name: 'NIFTY 50', numValue: 24078.30, change: '+124.50', pct: '+0.52%', isUp: true, prefix: '' },
  { name: 'SENSEX', numValue: 76909.68, change: '+412.30', pct: '+0.54%', isUp: true, prefix: '' },
  { name: 'BANK NIFTY', numValue: 57239.75, change: '+218.60', pct: '+0.38%', isUp: true, prefix: '' },
  { name: 'S&P 500', numValue: 7691.76, change: '+42.10', pct: '+0.55%', isUp: true, prefix: '' },
  { name: 'NASDAQ', numValue: 26289.71, change: '+185.30', pct: '+0.71%', isUp: true, prefix: '' },
  { name: 'DOW JONES', numValue: 53343.40, change: '+115.80', pct: '+0.22%', isUp: true, prefix: '' },
  { name: 'USD/INR', numValue: 95.74, change: '+0.06', pct: '+0.06%', isUp: true, prefix: '₹' },
  { name: 'GOLD 24K', numValue: 74850, change: '+₹380', pct: '+0.52%', isUp: true, prefix: '₹', suffix: '/10g' },
  { name: 'SILVER', numValue: 85400, change: '+₹650', pct: '+0.78%', isUp: true, prefix: '₹', suffix: '/kg' },
  { name: 'BITCOIN', numValue: 6161382, change: '+₹112450', pct: '+1.85%', isUp: true, prefix: '₹' }
];

export default function Header({
  activeTabTitle,
  theme = 'dark',
  onSelectTheme,
  user,
  onOpenLogin,
  onOpenRegister,
  onOpenProfileModal,
  onLogout,
  onOpenAddEntry,
  onOpenImport,
  onTriggerDriveSync,
  isPrivacyMode = false,
  onTogglePrivacyMode,
  onStartTour,
  onOpenGlassController,
  onOpenSmartPay
}) {
  const isDark = theme !== 'light';
  const [tickers, setTickers] = useState(INITIAL_TICKERS);
  const [flashedTicker, setFlashedTicker] = useState(null); // { index, dir }
  const [notifications, setNotifications] = useState(RATE_NOTIFICATIONS);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [readNotifIds, setReadNotifIds] = useState(() => {
    try {
      const saved = localStorage.getItem('kuberis_read_notifs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const notifRef = useRef(null);

  // 🔔 Fetch Live Rate Notifications from Backend
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.notifications)) {
            setNotifications(data.notifications);
          }
        }
      } catch (err) {
        // Retain default RATE_NOTIFICATIONS
      }
    };
    fetchNotifications();
  }, []);

  // 🖱️ Dismiss Notification dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotificationsOpen(false);
      }
    };
    if (isNotificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationsOpen]);

  const handleMarkAllRead = async () => {
    const allIds = notifications.map(n => n.id);
    setReadNotifIds(allIds);
    try {
      localStorage.setItem('kuberis_read_notifs', JSON.stringify(allIds));
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: allIds })
      });
    } catch (err) {
      // Offline fallback
    }
  };

  const [isSyncingRates, setIsSyncingRates] = useState(false);

  const handleSyncWithInternet = async () => {
    setIsSyncingRates(true);
    try {
      const res = await fetch('/api/notifications/sync', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.notifications && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
        }
      }
    } catch (err) {
      // Offline fallback
    } finally {
      setTimeout(() => setIsSyncingRates(false), 800);
    }
  };

  const unreadCount = notifications.filter(n => !readNotifIds.includes(n.id)).length;

  // 🌐 Fetch Real-World Live Market Quotes from Backend API
  useEffect(() => {
    const fetchLiveQuotes = async () => {
      try {
        const res = await fetch('/api/market/ticker');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.tickers) && json.tickers.length > 0) {
            setTickers(json.tickers);
          }
        }
      } catch (err) {
        // Fallback to active state
      }
    };

    fetchLiveQuotes();
    const pollInterval = setInterval(fetchLiveQuotes, 25000);
    return () => clearInterval(pollInterval);
  }, []);

  // ⚡ Live Real-Time Micro-Ticking Simulation (Every 3.2 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setTickers(prev => {
        if (!prev || prev.length === 0) return prev;
        const targetIdx = Math.floor(Math.random() * prev.length);
        const next = [...prev];
        const item = { ...next[targetIdx] };
        const isUp = Math.random() > 0.45;
        const deltaFactor = (Math.random() * 0.0008 + 0.0002) * (isUp ? 1 : -1);
        const updatedNum = item.numValue * (1 + deltaFactor);
        item.numValue = updatedNum;
        item.isUp = isUp;
        next[targetIdx] = item;
        setFlashedTicker({ index: targetIdx, dir: isUp ? 'up' : 'down' });
        return next;
      });

      setTimeout(() => setFlashedTicker(null), 900);
    }, 3200);

    return () => clearInterval(interval);
  }, []);

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const handleToggleTheme = () => {
    const nextTheme = isDark ? 'light' : 'dark';
    if (onSelectTheme) onSelectTheme(nextTheme);
  };

  const formatTickerVal = (t) => {
    const formatted = t.numValue > 1000
      ? t.numValue.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })
      : t.numValue.toFixed(2);
    return `${t.prefix || ''}${formatted}${t.suffix || ''}`;
  };

  const renderTickerList = (keySuffix) => (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '20px' }}>
      {tickers.map((t, idx) => {
        const isFlashed = flashedTicker?.index === idx;
        const flashDir = flashedTicker?.dir;
        return (
          <div
            key={`${t.name}-${keySuffix}-${idx}`}
            className={`ticker-item ${isFlashed ? (flashDir === 'up' ? 'ticked-up' : 'ticked-down') : ''}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 10px',
              borderRadius: '8px',
              cursor: 'default',
              border: isFlashed
                ? `1px solid ${flashDir === 'up' ? '#10B981' : '#EF4444'}`
                : '1px solid transparent',
              background: isFlashed
                ? (flashDir === 'up' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)')
                : 'transparent',
              transition: 'all 0.3s ease'
            }}
          >
            <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>{t.name}</span>
            <span style={{ color: 'var(--text-main)', fontWeight: '800' }}>{formatTickerVal(t)}</span>
            <span
              style={{
                color: t.isUp ? '#10B981' : '#F87171',
                fontSize: '10.5px',
                fontWeight: '800',
                display: 'inline-flex',
                alignItems: 'center'
              }}
            >
              {t.isUp ? '▲ ' : '▼ '}{t.pct}
            </span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="global-header-sticky">
      {/* 🔴 Top Live Streaming Marquee Ticker Bar */}
      <div
        id="tour-market-ticker"
        style={{
          width: '100%',
          height: '28px',
          background: isDark ? '#040D1A' : '#F1F5F9',
          borderBottom: '1px solid var(--border-color)',
          padding: '0',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          fontSize: '11px',
          zIndex: 30
        }}
      >
        {/* Fixed LIVE Badge on the Left */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#10B981',
            padding: '0 16px',
            fontWeight: '900',
            flexShrink: 0,
            background: isDark ? '#040D1A' : '#F1F5F9',
            boxShadow: '10px 0 20px rgba(0,0,0,0.3)',
            zIndex: 10
          }}
        >
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 8px #10B981', animation: 'pulse 1.5s infinite' }} />
          <span>NSE/BSE LIVE</span>
        </div>

        {/* Continuous Smooth Marquee Track */}
        <div className="ticker-marquee-wrapper" style={{ flex: 1 }}>
          <div className="ticker-marquee-track">
            {renderTickerList('set1')}
            <div style={{ width: '30px' }} />
            {renderTickerList('set2')}
          </div>
        </div>
      </div>

      {/* Main Top Header Bar */}
      <header className="top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', height: '52px', background: isDark ? '#040D1A' : '#FFFFFF' }}>
        <div className="page-title-area" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src="/favicon.svg" alt="Kuberis" style={{ width: '28px', height: '28px', filter: 'drop-shadow(0 0 8px var(--primary-glow))' }} />
              <span style={{ fontSize: '18px', fontWeight: '900', letterSpacing: '-0.5px', color: 'var(--text-main)' }}>
                Kuberis
              </span>
            </div>
          ) : (
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', letterSpacing: '-0.5px', color: 'var(--text-main)' }}>
              {activeTabTitle}
            </h1>
          )}
        </div>

        <div className="top-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* 👁️ Privacy Mode Masking Toggle Button */}
          {user && (
            <button
              type="button"
              className={`btn btn-sm ${isPrivacyMode ? 'btn-primary' : 'btn-ghost'}`}
              onClick={onTogglePrivacyMode}
              title={isPrivacyMode ? 'Privacy Mode Active (Balances Masked). Click to verify MPIN & unmask.' : 'Hide numbers and balances for privacy'}
              style={{
                borderRadius: '20px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '700',
                gap: '5px',
                background: isPrivacyMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: isPrivacyMode ? '1px solid #10B981' : '1px solid var(--border-color)',
                color: isPrivacyMode ? '#34D399' : 'var(--text-muted)'
              }}
            >
              {isPrivacyMode ? <EyeOff size={15} /> : <Eye size={15} />}
              <span className="btn-text-desktop">{isPrivacyMode ? 'Private (Masked)' : 'Privacy Mode'}</span>
            </button>
          )}

          {/* 🫧 Apple Liquid Glass Transparency Controls */}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onOpenGlassController}
            style={{
              padding: '7px 12px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              fontSize: '12px',
              fontWeight: '700',
              color: 'var(--primary)',
              cursor: 'pointer'
            }}
            title="Adjust Apple Liquid Glass Translucency & Blur"
          >
            <Sparkles size={14} style={{ color: 'var(--primary)' }} />
            <span className="btn-text-desktop">Glass</span>
          </button>

          {/* 🌓 Simple 2-State Theme Toggle (Dark / Light) */}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleToggleTheme}
            style={{
              padding: '7px 12px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)',
              fontSize: '12px',
              fontWeight: '700',
              color: 'var(--text-main)'
            }}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? (
              <>
                <Sun size={15} style={{ color: '#FBBF24' }} />
                <span className="btn-text-desktop">Light</span>
              </>
            ) : (
              <>
                <Moon size={15} style={{ color: '#818CF8' }} />
                <span className="btn-text-desktop">Dark</span>
              </>
            )}
          </button>

          {user ? (
            <>
              {/* 🔔 Live Rate Alerts & Revisions Notification Bell */}
              <div style={{ position: 'relative' }} ref={notifRef}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setIsNotificationsOpen(prev => !prev)}
                  style={{
                    padding: '7px 11px',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isNotificationsOpen ? 'rgba(16, 185, 129, 0.16)' : 'rgba(255, 255, 255, 0.05)',
                    border: isNotificationsOpen ? '1px solid #10B981' : '1px solid var(--border-color)',
                    color: isNotificationsOpen ? '#10B981' : 'var(--text-main)',
                    position: 'relative',
                    cursor: 'pointer'
                  }}
                  title="Live Rate Revisions & Market Alerts"
                  aria-label="Rate Notifications"
                >
                  <Bell size={15} />
                  {unreadCount > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        background: '#EF4444',
                        color: '#FFFFFF',
                        fontSize: '9.5px',
                        fontWeight: '900',
                        minWidth: '17px',
                        height: '17px',
                        padding: '0 4px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 8px rgba(239, 68, 68, 0.65)',
                        border: '2px solid var(--bg-card, #040D1A)'
                      }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* 📋 Notification Dropdown Popover */}
                {isNotificationsOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 12px)',
                      right: 0,
                      width: '390px',
                      maxWidth: '92vw',
                      background: isDark ? '#0B192C' : '#FFFFFF',
                      border: '1px solid var(--border-color)',
                      borderRadius: '16px',
                      boxShadow: isDark
                        ? '0 24px 50px rgba(0, 0, 0, 0.8), 0 0 20px rgba(16, 185, 129, 0.15)'
                        : '0 18px 40px rgba(0, 0, 0, 0.14)',
                      zIndex: 9999,
                      overflow: 'hidden',
                      animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                  >
                    {/* Header */}
                    <div
                      style={{
                        padding: '14px 16px',
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: isDark ? 'rgba(255, 255, 255, 0.02)' : '#F8FAFC'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '8px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#10B981'
                          }}
                        >
                          <Bell size={13} />
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            Rate Sync Alerts
                            {unreadCount > 0 && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: '800',
                                  padding: '1px 6px',
                                  borderRadius: '6px',
                                  background: 'rgba(239, 68, 68, 0.18)',
                                  color: '#EF4444',
                                  border: '1px solid rgba(239, 68, 68, 0.3)'
                                }}
                              >
                                {unreadCount} new
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                            Live updates from MoF, RBI & Bank catalogs
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={handleSyncWithInternet}
                          disabled={isSyncingRates}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: isSyncingRates ? '#10B981' : '#38BDF8',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 6px',
                            borderRadius: '6px'
                          }}
                          title="Sync rates live with Govt & RBI internet publications"
                        >
                          <RefreshCw size={12} style={{ animation: isSyncingRates ? 'spin 1s linear infinite' : 'none' }} />
                          <span>{isSyncingRates ? 'Syncing...' : 'Sync Web'}</span>
                        </button>

                        {unreadCount > 0 && (
                          <button
                            type="button"
                            onClick={handleMarkAllRead}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#10B981',
                              fontSize: '11px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 6px',
                              borderRadius: '6px'
                            }}
                            title="Mark all notifications as read"
                          >
                            <CheckCheck size={13} />
                            <span>Mark all read</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Scrollable Notifications List */}
                    <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                          No active rate alerts right now.
                        </div>
                      ) : (
                        notifications.map((notif) => {
                          const isUnread = !readNotifIds.includes(notif.id);
                          const getCategoryColors = (cat) => {
                            switch (cat) {
                              case 'Govt Notification':
                                return { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.28)' };
                              case 'Bank Scheme':
                                return { color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.28)' };
                              case 'Market Benchmark':
                                return { color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)', border: 'rgba(139, 92, 246, 0.28)' };
                              case 'Monetary Policy':
                                return { color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.12)', border: 'rgba(6, 182, 212, 0.28)' };
                              default:
                                return { color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.28)' };
                            }
                          };
                          const catColors = getCategoryColors(notif.category);

                          return (
                            <div
                              key={notif.id}
                              style={{
                                padding: '14px 16px',
                                borderBottom: '1px solid var(--border-color)',
                                background: isUnread
                                  ? (isDark ? 'rgba(16, 185, 129, 0.06)' : 'rgba(16, 185, 129, 0.04)')
                                  : 'transparent',
                                transition: 'background 0.2s ease',
                                position: 'relative'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: '800',
                                    padding: '2px 7px',
                                    borderRadius: '6px',
                                    color: catColors.color,
                                    background: catColors.bg,
                                    border: `1px solid ${catColors.border}`,
                                    letterSpacing: '0.2px'
                                  }}
                                >
                                  {notif.category}
                                </span>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '600' }}>
                                    {notif.date}
                                  </span>
                                  {isUnread && (
                                    <span
                                      style={{
                                        width: '7px',
                                        height: '7px',
                                        borderRadius: '50%',
                                        background: '#10B981',
                                        boxShadow: '0 0 6px #10B981',
                                        display: 'inline-block'
                                      }}
                                    />
                                  )}
                                </div>
                              </div>

                              <div style={{ fontSize: '12.5px', fontWeight: '800', color: 'var(--text-main)', marginTop: '7px', lineHeight: '1.35' }}>
                                {notif.title}
                              </div>

                              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.45' }}>
                                {notif.description}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Footer live sync notice */}
                    <div
                      style={{
                        padding: '10px 16px',
                        background: isDark ? '#06101E' : '#F1F5F9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '7px',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: 'var(--text-muted)'
                      }}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: '#10B981',
                          boxShadow: '0 0 6px #10B981',
                          display: 'inline-block'
                        }}
                      />
                      <span>Live Sync: Next review scheduled Q4 FY27</span>
                    </div>
                  </div>
                )}
              </div>

              {/* ⚡ Smart-Pay Live UPI & Budget Shield Quick Launcher */}
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={onOpenSmartPay}
                title="Kuberis Smart-Pay: Scan UPI QR with Real-Time Budget Shield & 7.10% Round-Ups"
                style={{
                  padding: '6px 13px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '800',
                  gap: '6px',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: '#000',
                  boxShadow: '0 0 12px rgba(16, 185, 129, 0.45)',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <Zap size={14} style={{ fill: '#000' }} />
                <span>Smart-Pay</span>
              </button>

              {/* Desktop Only Actions */}
              <button className="btn btn-ghost btn-sm desktop-only-action" onClick={onTriggerDriveSync} title="Sync Google Drive Inbox">
                <FolderSync size={16} /> <span>Drive sync</span>
              </button>

              <button className="btn btn-secondary btn-sm desktop-only-action" onClick={onOpenImport} title="Import Statement or File">
                <Upload size={16} /> <span>Import</span>
              </button>

              {/* Quick Add Entry */}
              <button id="tour-quick-actions" className="btn btn-primary btn-sm" onClick={onOpenAddEntry} title="Add Entry" style={{ padding: '6px 14px' }}>
                <Plus size={16} /> <span className="btn-text-desktop">Add entry</span>
              </button>

              {/* Prominent User Profile Avatar Button */}
              <button
                id="tour-security-profile"
                type="button"
                className="btn btn-ghost user-profile-header-btn"
                style={{
                  padding: '2px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none'
                }}
                onClick={onOpenProfileModal}
                title="My Account & Security"
                aria-label="User Account"
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--primary) 0%, #059669 100%)',
                    color: '#000000',
                    fontWeight: '800',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 10px var(--primary-glow)',
                    border: '1.5px solid rgba(255, 255, 255, 0.4)'
                  }}
                >
                  {getInitials(user.name || user.email)}
                </div>
              </button>

              {/* Desktop Only Sign Out */}
              <button
                className="btn btn-ghost btn-sm desktop-only-action"
                onClick={onLogout}
                title="Sign Out"
                style={{ color: '#EF4444', padding: '6px 8px' }}
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <div className="header-auth-group" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-sign-in"
                onClick={onOpenLogin}
                style={{ padding: '6px 10px', fontSize: '13px', fontWeight: '700', whiteSpace: 'nowrap', color: 'var(--text-main)' }}
              >
                Sign In
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm btn-register"
                onClick={onOpenRegister}
                style={{ padding: '6px 14px', fontSize: '13px', fontWeight: '800', whiteSpace: 'nowrap', borderRadius: '12px' }}
              >
                Register
              </button>
            </div>
          )}
        </div>
      </header>
    </div>
  );
}
