import React, { useState, useEffect } from 'react';
import {
  Home,
  LayoutDashboard,
  CreditCard,
  TrendingUp,
  MoreHorizontal,
  RefreshCw,
  Calendar,
  PieChart,
  Target,
  FileText,
  Sliders,
  Settings,
  Calculator,
  X,
  User,
  LogOut,
  Zap
} from 'lucide-react';

const MAIN_TABS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'investments', label: 'Investments', icon: TrendingUp },
  { id: 'transactions', label: 'Transactions', icon: CreditCard }
];

const MORE_TABS = [
  { id: 'transactions', label: 'All Transactions', icon: CreditCard },
  { id: 'calculators', label: 'SIP & EPF Calculators', icon: Calculator },
  { id: 'recurring', label: 'Recurring Bills', icon: RefreshCw },
  { id: 'subscriptions', label: 'Subscriptions', icon: Calendar },
  { id: 'budgets', label: 'Budgets & Limits', icon: PieChart },
  { id: 'goals', label: 'Savings Goals', icon: Target },
  { id: 'documents', label: 'Document Inbox', icon: FileText },
  { id: 'rules', label: 'Rules & Tags', icon: Sliders },
  { id: 'settings', label: 'Settings & Security', icon: Settings }
];

export default function MobileNav({ activeTab, onSelectTab, user, onOpenProfile, onLogout, onOpenSmartPay }) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // Lock background scroll when drawer is open
  useEffect(() => {
    if (isMoreOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMoreOpen]);

  const handleTabClick = (tabId) => {
    onSelectTab(tabId);
    setIsMoreOpen(false);
  };

  const isMoreActive = MORE_TABS.some(t => t.id === activeTab);

  return (
    <>
      {/* 5-Item Clean Balanced Bottom Bar with Center Pay */}
      <nav className="mobile-nav">
        <div className="mobile-nav-inner" style={{ position: 'relative' }}>
          {/* 1. Home */}
          <button
            type="button"
            className={`mobile-nav-item ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => handleTabClick('home')}
          >
            <Home size={19} />
            <span>Home</span>
          </button>

          {/* 2. Dashboard */}
          <button
            type="button"
            className={`mobile-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleTabClick('dashboard')}
          >
            <LayoutDashboard size={19} />
            <span>Overview</span>
          </button>

          {/* 3. ⚡ Center Smart-Pay Action */}
          <button
            type="button"
            className="mobile-nav-item"
            onClick={onOpenSmartPay}
            style={{
              color: '#10B981',
              transform: 'translateY(-4px)'
            }}
            title="Scan UPI QR with Budget Shield"
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 14px rgba(16, 185, 129, 0.55)'
              }}
            >
              <Zap size={20} style={{ fill: '#000' }} />
            </div>
            <span style={{ fontSize: '10px', fontWeight: '800', marginTop: '2px', color: '#10B981' }}>Pay</span>
          </button>

          {/* 4. Investments */}
          <button
            type="button"
            className={`mobile-nav-item ${activeTab === 'investments' ? 'active' : ''}`}
            onClick={() => handleTabClick('investments')}
          >
            <TrendingUp size={19} />
            <span>Portfolio</span>
          </button>

          {/* 5. More Menu Toggle */}
          <button
            type="button"
            className={`mobile-nav-item ${isMoreActive || isMoreOpen ? 'active' : ''}`}
            onClick={() => setIsMoreOpen(!isMoreOpen)}
          >
            <MoreHorizontal size={19} />
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* "More" Slide-up Drawer Bottom Sheet */}
      {isMoreOpen && (
        <div className="modal-backdrop" onClick={() => setIsMoreOpen(false)} style={{ zIndex: 999, alignItems: 'flex-end', padding: 0 }}>
          <div
            className="mobile-more-sheet"
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              background: 'var(--bg-card)',
              backdropFilter: 'blur(30px) saturate(190%)',
              WebkitBackdropFilter: 'blur(30px) saturate(190%)',
              borderTop: '1px solid var(--border-glass)',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              padding: '24px 20px 36px 20px',
              boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.5)',
              animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {/* Drawer Header (Clean, without the top handle bar) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                All Features & Settings
              </h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setIsMoreOpen(false)}
                style={{ padding: '6px', color: 'var(--text-muted)', borderRadius: '50%' }}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Grid of Remaining Features */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
              {MORE_TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabClick(tab.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '14px',
                      borderRadius: '14px',
                      background: isActive ? 'var(--primary-light)' : 'rgba(255, 255, 255, 0.04)',
                      border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border-color)'}`,
                      color: isActive ? 'var(--primary)' : 'var(--text-main)',
                      fontSize: '13px',
                      fontWeight: '700',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Icon size={18} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* User Session Row */}
            {user && (
              <div style={{ display: 'flex', gap: '10px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                {onOpenProfile && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, fontSize: '13px', padding: '12px', borderRadius: '12px', fontWeight: '700' }}
                    onClick={() => { setIsMoreOpen(false); onOpenProfile(); }}
                  >
                    <User size={16} /> My Account
                  </button>
                )}
                {onLogout && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, fontSize: '13px', padding: '12px', borderRadius: '12px', fontWeight: '700', color: 'var(--danger)' }}
                    onClick={() => { setIsMoreOpen(false); onLogout(); }}
                  >
                    <LogOut size={16} /> Sign Out
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
