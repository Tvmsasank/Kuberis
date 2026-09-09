import React, { useState } from 'react';
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
  Layers,
  Search,
  RefreshCw,
  Smartphone,
  FolderSync,
  Fingerprint,
  KeyRound,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Target,
  BarChart3,
  Globe2,
  FileSpreadsheet
} from 'lucide-react';

export default function LandingPage({
  onOpenLogin,
  onOpenRegister,
  theme
}) {
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const FAQS = [
    {
      q: 'What is Kuberis and how does it work?',
      a: 'Kuberis is an all-in-one personal finance and investment operating system built for India. It unifies live stock market tracking (NSE/BSE), AMFI mutual fund NAVs, multi-bank UPI cash flow, automated budgets, and goal planning in ₹ (INR).'
    },
    {
      q: 'How does Kuberis track live stock and mutual fund prices?',
      a: 'Kuberis connects directly to live Yahoo Finance market APIs for Indian equities (e.g. RELIANCE, TCS, INFY) and official AMFI India APIs for daily mutual fund NAVs, calculating your live unrealized gains and portfolio net worth automatically.'
    },
    {
      q: 'Is my financial data secure and private?',
      a: 'Yes, 100%. All passwords are encrypted using salted 10-round Bcrypt hashing, fast logins use official W3C WebAuthn hardware passkeys (Face ID / Touch ID), sessions use cryptographically signed JWT tokens, and all data is isolated per user in Supabase PostgreSQL.'
    },
    {
      q: 'Can I log in using Face ID, Fingerprint, or a 4-Digit MPIN?',
      a: 'Yes! Kuberis supports passwordless biometric logins via your phone/laptop sensor (Touch ID, Face ID, Windows Hello) and a fast numeric 4-digit MPIN for 1-second unlocking.'
    },
    {
      q: 'Does it support Google Drive cloud backup?',
      a: 'Yes! Kuberis includes native Google Drive inbox integration. Simply upload PDF bank statements or receipts to your dedicated Google Drive folder, and Kuberis synchronizes them securely.'
    },
    {
      q: 'Is Kuberis free to use?',
      a: 'Yes! All core features including stock portfolios, mutual fund NAV trackers, UPI SMS logging, budget envelopes, and biometric passkeys are 100% free.'
    }
  ];

  return (
    <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '0 16px 60px 16px' }}>
      {/* 🚀 HERO SECTION */}
      <section style={{ textAlign: 'center', padding: '40px 0 50px 0', position: 'relative' }}>
        {/* Top Innovation Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(56, 189, 248, 0.15) 100%)',
            border: '1px solid var(--border-glass)',
            color: 'var(--primary)',
            fontSize: '13px',
            fontWeight: '800',
            marginBottom: '24px',
            boxShadow: '0 4px 20px var(--primary-glow)'
          }}
        >
          <Sparkles size={16} /> The Next-Gen Financial OS Built for India 🇮🇳
        </div>

        {/* Hero Headline */}
        <h1
          style={{
            fontSize: 'clamp(28px, 5.5vw, 54px)',
            fontWeight: '900',
            lineHeight: '1.18',
            letterSpacing: '-1px',
            marginBottom: '20px',
            color: 'var(--text-main)',
            maxWidth: '920px',
            margin: '0 auto 20px auto'
          }}
        >
          Master Your Stocks, Mutual Funds & Cash Flow in{' '}
          <span style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #38BDF8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Real-Time ₹ (INR)
          </span>
        </h1>

        {/* Sub-Headline */}
        <p
          style={{
            fontSize: 'clamp(14px, 2.2vw, 18px)',
            color: 'var(--text-muted)',
            lineHeight: '1.6',
            maxWidth: '720px',
            margin: '0 auto 32px auto'
          }}
        >
          Unified wealth tracker with <strong>live NSE/BSE stock quotes</strong>, <strong>AMFI NAVs</strong>, <strong>smart UPI SMS categorization</strong>, and <strong>Touch/Face ID passkeys</strong> — cloud-synced with Google Drive.
        </p>

        {/* Call to Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '48px' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onOpenRegister}
            style={{
              padding: '14px 32px',
              fontSize: '16px',
              fontWeight: '800',
              borderRadius: '16px',
              boxShadow: '0 8px 30px var(--primary-glow)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Zap size={18} /> Create Free Account <ArrowRight size={18} />
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={onOpenLogin}
            style={{
              padding: '14px 28px',
              fontSize: '16px',
              fontWeight: '700',
              borderRadius: '16px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Lock size={18} /> Sign In to Dashboard
          </button>
        </div>

        {/* 📊 LIVE INTERACTIVE GLASS DASHBOARD PREVIEW CARD */}
        <div
          className="card"
          style={{
            padding: '24px',
            borderRadius: '24px',
            background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.08) 0%, rgba(10, 25, 47, 0.9) 100%)',
            border: '1px solid var(--border-glass)',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            maxWidth: '940px',
            margin: '0 auto',
            textAlign: 'left'
          }}
        >
          {/* Mock Dashboard Top Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 10px #10B981' }} />
              <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>Live Portfolio Feed • ₹ (INR)</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', fontWeight: '700' }}>
                🟢 NSE Market Open
              </span>
              <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', fontWeight: '700' }}>
                🌾 AMFI Updated
              </span>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            <div style={{ padding: '14px', borderRadius: '16px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>Total Portfolio Net Worth</div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-main)', marginTop: '4px' }}>₹14,82,450.00</div>
              <div style={{ fontSize: '11px', color: '#10B981', fontWeight: '700', marginTop: '2px' }}>+₹24,800.00 (+1.7%) Today</div>
            </div>

            <div style={{ padding: '14px', borderRadius: '16px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>Monthly Savings Velocity</div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#38BDF8', marginTop: '4px' }}>₹68,200.00</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>64% Savings Rate</div>
            </div>

            <div style={{ padding: '14px', borderRadius: '16px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>Fast Hardware Security</div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#FBBF24', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Fingerprint size={20} /> Face ID / MPIN
              </div>
              <div style={{ fontSize: '11px', color: '#10B981', marginTop: '2px' }}>✓ W3C Passkeys Active</div>
            </div>
          </div>

          {/* Live Market Tickers Chips (No scrollbar, clean flex wrap) */}
          <div className="no-scrollbar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-start', alignItems: 'center' }}>
            <div style={{ padding: '8px 12px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', fontSize: '12px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong>RELIANCE.NS</strong> <span style={{ color: '#10B981' }}>₹2,980.40 (+1.4%)</span>
            </div>
            <div style={{ padding: '8px 12px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', fontSize: '12px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong>TCS.NS</strong> <span style={{ color: '#10B981' }}>₹4,195.00 (+0.8%)</span>
            </div>
            <div style={{ padding: '8px 12px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', fontSize: '12px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong>HDFCBANK.NS</strong> <span style={{ color: '#10B981' }}>₹1,642.50 (+0.5%)</span>
            </div>
            <div style={{ padding: '8px 12px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', fontSize: '12px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong>Parag Parikh Flexi Cap</strong> <span style={{ color: '#38BDF8' }}>NAV: ₹78.42</span>
            </div>
          </div>
        </div>
      </section>

      {/* 🌟 6 CORE CAPABILITY PILLARS ("WHAT WE CAN & WILL DO") */}
      <section style={{ margin: '60px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 36px)', fontWeight: '900', color: 'var(--text-main)' }}>
            Everything You Need to Scale Your Net Worth
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginTop: '8px', maxWidth: '600px', margin: '8px auto 0 auto' }}>
            Built specifically for Indian retail investors, salaried professionals, and wealth builders.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* Pillar 1 */}
          <div className="card" style={{ padding: '28px', borderRadius: '20px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
              <TrendingUp size={24} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>Live Indian Stock Tracking</h3>
            <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              Real-time NSE & BSE stock quotes via Yahoo Finance. Automatic live calculation of invested capital, current market value, day's P&L, and total unrealized gains.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="card" style={{ padding: '28px', borderRadius: '20px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(56, 189, 248, 0.16)', color: '#38BDF8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
              <Building2 size={24} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>10,000+ AMFI Mutual Funds</h3>
            <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              Direct integration with AMFI India APIs. Type any fund name (Nippon, SBI, Mirae, Quant) to pull daily official NAVs and track your SIP growth down to 4 decimals.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="card" style={{ padding: '28px', borderRadius: '20px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(245, 158, 11, 0.16)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
              <Zap size={24} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>Sub-Millisecond UPI Parser</h3>
            <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              AI Indian bank SMS cleaner with 120+ merchant dictionary (Swiggy, Zepto, Zomato, Shell). Ingests raw SMS strings and webhooks into structured ledger rows in 0.1s.
            </p>
          </div>

          {/* Pillar 4 */}
          <div className="card" style={{ padding: '28px', borderRadius: '20px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(168, 85, 247, 0.16)', color: '#A855F7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
              <Fingerprint size={24} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>Face ID & 4-Digit MPIN</h3>
            <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              Say goodbye to typing passwords every time. Authenticate in 1 second using your device's biometric sensor (W3C WebAuthn Passkeys) or tactile 4-digit numeric MPIN.
            </p>
          </div>

          {/* Pillar 5 */}
          <div className="card" style={{ padding: '28px', borderRadius: '20px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(236, 72, 153, 0.16)', color: '#EC4899', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
              <Target size={24} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>Goals & Budget Envelopes</h3>
            <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              Set milestone financial targets (Emergency Fund, House Down Payment, Car) and assign dynamic monthly category budgets with real-time spend progress indicators.
            </p>
          </div>

          {/* Pillar 6 */}
          <div className="card" style={{ padding: '28px', borderRadius: '20px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(20, 184, 166, 0.16)', color: '#14B8A6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
              <FolderSync size={24} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>Google Drive Cloud Sync</h3>
            <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              Automated daily backup and statement ingestion from your private Google Drive folder ("Kuberis Financial Inbox") combined with Supabase PostgreSQL cloud persistence.
            </p>
          </div>
        </div>
      </section>

      {/* 🔄 3-STEP "HOW IT WORKS" PROCESS */}
      <section style={{ margin: '60px 0', padding: '40px 24px', borderRadius: '24px', background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(10, 25, 47, 0.6) 100%)', border: '1px solid var(--border-color)' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h2 style={{ fontSize: 'clamp(20px, 3vw, 32px)', fontWeight: '900' }}>Get Started in 3 Simple Steps</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '6px' }}>No complicated setup. Live portfolio tracking in under 60 seconds.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
          <div style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--primary)', color: '#000', fontWeight: '900', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px auto' }}>
              1
            </div>
            <h4 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '6px' }}>Create Your Account</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>Sign up in seconds and set up 1-click Face ID or 4-digit MPIN for instant device access.</p>
          </div>

          <div style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--primary)', color: '#000', fontWeight: '900', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px auto' }}>
              2
            </div>
            <h4 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '6px' }}>Add Holdings & Expenses</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>Add your stock tickers, mutual fund SIPs, and paste bank SMS alerts or CSV statements.</p>
          </div>

          <div style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--primary)', color: '#000', fontWeight: '900', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px auto' }}>
              3
            </div>
            <h4 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '6px' }}>Watch Your Wealth Grow</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>Track live real-time market gains, savings velocity, and progress toward your financial goals!</p>
          </div>
        </div>
      </section>

      {/* 🛡️ SECURITY & PRIVACY GUARANTEE */}
      <section style={{ margin: '60px 0', textAlign: 'center' }}>
        <div style={{ maxWidth: '780px', margin: '0 auto', padding: '36px 24px', borderRadius: '24px', background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.06) 0%, rgba(15, 23, 42, 0.7) 100%)', border: '1px solid var(--border-glass)' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
            <ShieldCheck size={32} />
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '10px' }}>
            Bank-Grade Security by Architecture
          </h2>

          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '24px' }}>
            Your privacy is our priority. Kuberis operates on a non-custodial architecture — we never store your netbanking passwords or debit card PINs. All data is encrypted and isolated per user in Supabase PostgreSQL.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={15} style={{ color: '#10B981' }} /> Bcrypt Password Hashing
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={15} style={{ color: '#10B981' }} /> W3C WebAuthn Passkeys
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={15} style={{ color: '#10B981' }} /> PostgreSQL Isolation
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={15} style={{ color: '#10B981' }} /> 1-Click CSV/PDF Export
            </div>
          </div>
        </div>
      </section>

      {/* ❓ INTERACTIVE FAQ SECTION */}
      <section style={{ margin: '60px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: 'clamp(20px, 3vw, 32px)', fontWeight: '900' }}>Frequently Asked Questions</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '6px' }}>Have questions? We've got answers.</p>
        </div>

        <div style={{ maxWidth: '780px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {FAQS.map((faq, idx) => (
            <div
              key={idx}
              className="card"
              style={{
                borderRadius: '16px',
                border: openFaqIndex === idx ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                overflow: 'hidden',
                transition: 'all 0.2s ease'
              }}
            >
              <button
                type="button"
                onClick={() => toggleFaq(idx)}
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-main)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontWeight: '700',
                  fontSize: '14px',
                  gap: '12px'
                }}
              >
                <span>{faq.q}</span>
                {openFaqIndex === idx ? <ChevronUp size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} /> : <ChevronDown size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
              </button>

              {openFaqIndex === idx && (
                <div style={{ padding: '0 20px 16px 20px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 🚀 FINAL CALL TO ACTION BANNER */}
      <section
        style={{
          marginTop: '60px',
          padding: '48px 24px',
          borderRadius: '28px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(56, 189, 248, 0.1) 100%)',
          border: '1px solid var(--border-glass)',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
        }}
      >
        <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: '900', marginBottom: '12px' }}>
          Ready to Take Full Control of Your Financial Pulse?
        </h2>
        <p style={{ fontSize: '15px', color: 'var(--text-muted)', maxWidth: '580px', margin: '0 auto 28px auto', lineHeight: '1.6' }}>
          Join smart investors across India tracking stocks, mutual funds, and daily cash flow in one unified dashboard.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onOpenRegister}
          style={{
            padding: '14px 36px',
            fontSize: '16px',
            fontWeight: '800',
            borderRadius: '16px',
            boxShadow: '0 8px 30px var(--primary-glow)'
          }}
        >
          Create Your Free Account Now →
        </button>
      </section>

      {/* 📄 FOOTER */}
      <footer style={{ marginTop: '60px', paddingTop: '24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/favicon.svg" alt="Kuberis" style={{ width: '22px', height: '22px' }} />
          <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>Kuberis Financial OS</span> • Built with React & Node.js
        </div>
        <div>
          © {new Date().getFullYear()} Kuberis. All rights reserved. Real-time Indian Financial Intelligence.
        </div>
      </footer>
    </div>
  );
}
