import React from 'react';
import {
  TrendingUp,
  Shield,
  Activity,
  Zap,
  Lock,
  ArrowRight,
  Sparkles,
  PieChart,
  CheckCircle2,
  Building2,
  Briefcase,
  Layers,
  Search,
  RefreshCw
} from 'lucide-react';

export default function HomeTab({ onNavigateTab, onOpenRegister, user }) {
  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* 🚀 Hero Section */}
      <div
        className="card"
        style={{
          padding: '48px 36px',
          marginBottom: '32px',
          background: 'var(--hero-bg)',
          border: 'var(--hero-border)',
          borderRadius: 'var(--radius-xl)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '20px',
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            fontSize: '13px',
            fontWeight: '800',
            marginBottom: '20px',
            border: '1px solid var(--border-glass)'
          }}
        >
          <Sparkles size={16} /> Next-Gen Personal Wealth & Live Market Intelligence
        </div>

        <h1 style={{ fontSize: '38px', fontWeight: '900', lineHeight: '1.2', marginBottom: '16px', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
          Master Your Wealth with <span style={{ color: 'var(--primary)', textShadow: '0 0 20px var(--primary-glow)' }}>Real-Time Precision</span>
        </h1>

        <p style={{ fontSize: '16px', color: 'var(--text-muted)', maxWidth: '720px', margin: '0 auto 32px auto', lineHeight: '1.6' }}>
          Kuberis tracks live NSE/BSE stock prices and AMFI mutual fund NAVs every 3 seconds, automates bank statement imports, calculates accurate net worth, and secures your wealth in <strong>₹ (INR)</strong>.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {user ? (
            <button className="btn btn-primary" onClick={() => onNavigateTab('dashboard')} style={{ fontSize: '15px', padding: '12px 28px' }}>
              Open My Dashboard <ArrowRight size={18} />
            </button>
          ) : (
            <button className="btn btn-primary" onClick={onOpenRegister} style={{ fontSize: '15px', padding: '12px 28px' }}>
              Get Started Free <ArrowRight size={18} />
            </button>
          )}

          <button className="btn btn-secondary" onClick={() => onNavigateTab('investments')} style={{ fontSize: '15px', padding: '12px 24px' }}>
            <TrendingUp size={18} /> Explore Live Investments
          </button>
        </div>
      </div>

      {/* 💡 Feature Cards Grid */}
      <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Zap style={{ color: 'var(--primary)' }} /> Why Kuberis?
      </h2>

      <div className="grid-3" style={{ marginBottom: '36px' }}>
        {/* Feature 1 */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <Activity size={24} />
          </div>
          <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '8px' }}>Live 3-Second Market Feed</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Connects to NSE & AMFI APIs down to 4 decimal places. Live trading prices tick automatically on your screen without manual refresh.
          </p>
        </div>

        {/* Feature 2 */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'rgba(56, 189, 248, 0.16)', color: '#38BDF8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <PieChart size={24} />
          </div>
          <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '8px' }}>Accurate Net Worth Engine</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Calculates Total Assets minus Liabilities precisely. Categorizes stock portfolios, mutual funds, gold, and bank savings seamlessly.
          </p>
        </div>

        {/* Feature 3 */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.16)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <Lock size={24} />
          </div>
          <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '8px' }}>Bank-Grade Biometric Security</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Protects your account with Face ID / Fingerprint passkeys, 4-digit MPIN security, and multi-tenant user isolation.
          </p>
        </div>
      </div>

      {/* 📖 How To Use Guide */}
      <div className="card" style={{ padding: '32px', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle2 style={{ color: 'var(--primary)' }} /> How To Use Kuberis in 3 Easy Steps
        </h2>

        <div className="grid-3" style={{ gap: '20px' }}>
          {/* Step 1 */}
          <div style={{ background: 'var(--bg-app)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Step 01
            </div>
            <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>Set Your Net Worth Base</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Go to <strong>Settings</strong> and enter your total bank assets and liabilities. This initializes your core wealth baseline.
            </p>
          </div>

          {/* Step 2 */}
          <div style={{ background: 'var(--bg-app)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Step 02
            </div>
            <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>Add Live Stock & MF Holdings</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Click <strong>Investments → Add Asset</strong>. Enter NSE stock tickers (e.g. <code>CANBK.NS</code>, <code>RELIANCE.NS</code>) or Mutual Fund names.
            </p>
          </div>

          {/* Step 3 */}
          <div style={{ background: 'var(--bg-app)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Step 03
            </div>
            <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>Track Live Wealth Ticks 24/7</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Watch your unrealized gains & losses update live on your screen in vibrant green (<code>+₹XX.XX</code>) or crimson red!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
