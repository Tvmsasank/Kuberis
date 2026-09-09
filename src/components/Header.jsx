import React, { useState, useEffect } from 'react';
import {
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
  ArrowDownRight
} from 'lucide-react';

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
  onTogglePrivacyMode
}) {
  const isDark = theme !== 'light';
  const [tickers, setTickers] = useState(INITIAL_TICKERS);
  const [flashedTicker, setFlashedTicker] = useState(null); // { index, dir }

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
    <div style={{ width: '100%' }}>
      {/* 🔴 Top Live Streaming Marquee Ticker Bar */}
      <div
        style={{
          width: '100%',
          background: isDark ? 'rgba(3, 10, 22, 0.95)' : '#F1F5F9',
          borderBottom: '1px solid var(--border-color)',
          padding: '5px 0',
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
            background: isDark ? 'rgba(3, 10, 22, 0.98)' : '#F1F5F9',
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
      <header className="top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px' }}>
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
              {/* Desktop Only Actions */}
              <button className="btn btn-ghost btn-sm desktop-only-action" onClick={onTriggerDriveSync} title="Sync Google Drive Inbox">
                <FolderSync size={16} /> <span>Drive sync</span>
              </button>

              <button className="btn btn-secondary btn-sm desktop-only-action" onClick={onOpenImport} title="Import Statement or File">
                <Upload size={16} /> <span>Import</span>
              </button>

              {/* Quick Add Entry */}
              <button className="btn btn-primary btn-sm" onClick={onOpenAddEntry} title="Add Entry" style={{ padding: '6px 14px' }}>
                <Plus size={16} /> <span className="btn-text-desktop">Add entry</span>
              </button>

              {/* Prominent User Profile Avatar Button */}
              <button
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
