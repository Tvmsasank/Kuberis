import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, ArrowLeft, X, Check, Eye, TrendingUp, ShieldCheck, Compass, Zap } from 'lucide-react';

const TOUR_STEPS = [
  {
    targetId: 'tour-market-ticker',
    title: 'Live Indian Market Ticker',
    badge: 'Live Streaming',
    description: 'Track real-time quotes for SENSEX, NIFTY 50, Bank Nifty, Gold 24K, and USD/INR updated streaming live across the header.',
    icon: TrendingUp,
    position: 'bottom'
  },
  {
    targetId: 'tour-net-worth',
    title: 'Dynamic Consolidated Net Worth',
    badge: 'Real-Time Calculation',
    description: 'Your real-time wealth automatically calculated from live stock prices, AMFI NAVs, manual assets, and outstanding liabilities.',
    icon: Sparkles,
    position: 'bottom'
  },
  {
    targetId: 'tour-nav-tabs',
    title: 'Unified Wealth Navigation',
    badge: '6 Core Hubs',
    description: 'Seamlessly switch between your Dashboard, Investments portfolio, Transactions, Subscriptions, Budgets, and Settings.',
    icon: Compass,
    position: 'right'
  },
  {
    targetId: 'tour-investments',
    title: 'NSE, BSE & AMFI Investments',
    badge: 'Live Stock & MF Tracking',
    description: 'Monitor your Indian & US stocks, 10,000+ mutual fund NAVs, crypto, and gold with day P&L and interactive performance curves.',
    icon: Zap,
    position: 'bottom'
  },
  {
    targetId: 'tour-quick-actions',
    title: 'Quick Add & Smart UPI Parser',
    badge: 'Instant Logging',
    description: 'Log new income and expenses, or paste raw bank SMS messages for sub-millisecond AI auto-categorization.',
    icon: Sparkles,
    position: 'bottom'
  },
  {
    targetId: 'tour-security-profile',
    title: 'Fast Hardware Security & 2FA',
    badge: 'Non-Custodial',
    description: 'Activate your 4-digit numeric MPIN, biometric Face ID, and Google Authenticator 2FA to keep your wealth data 100% private.',
    icon: ShieldCheck,
    position: 'bottom'
  }
];

export default function AppTour({
  isOpen,
  onClose,
  onNavigateTab
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);

  const step = TOUR_STEPS[currentStep] || TOUR_STEPS[0];
  const StepIcon = step.icon;

  const updateTargetPosition = () => {
    if (!step?.targetId) return;
    const el = document.getElementById(step.targetId);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
        right: rect.right
      });
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      setTargetRect(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // If the step needs a specific tab open
      if (step.targetId === 'tour-investments' && onNavigateTab) {
        onNavigateTab('investments');
      } else if (step.targetId === 'tour-net-worth' && onNavigateTab) {
        onNavigateTab('dashboard');
      }

      const timer = setTimeout(updateTargetPosition, 200);
      window.addEventListener('resize', updateTargetPosition);
      window.addEventListener('scroll', updateTargetPosition, true);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', updateTargetPosition);
        window.removeEventListener('scroll', updateTargetPosition, true);
      };
    }
  }, [isOpen, currentStep]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('kuberis_tour_completed', 'true');
    setCurrentStep(0);
    onClose();
  };

  // Card Positioning logic
  let cardStyle = {
    position: 'fixed',
    zIndex: 10500,
    width: '380px',
    maxWidth: 'calc(100vw - 32px)',
    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
  };

  if (targetRect) {
    if (step.position === 'bottom') {
      const topPos = Math.min(window.innerHeight - 300, targetRect.bottom + 16);
      const leftPos = Math.max(16, Math.min(window.innerWidth - 396, targetRect.left + (targetRect.width / 2) - 190));
      cardStyle.top = `${topPos}px`;
      cardStyle.left = `${leftPos}px`;
    } else if (step.position === 'right') {
      const topPos = Math.max(80, Math.min(window.innerHeight - 300, targetRect.top));
      const leftPos = Math.min(window.innerWidth - 396, targetRect.right + 16);
      cardStyle.top = `${topPos}px`;
      cardStyle.left = `${leftPos}px`;
    } else {
      cardStyle.top = '50%';
      cardStyle.left = '50%';
      cardStyle.transform = 'translate(-50%, -50%)';
    }
  } else {
    cardStyle.bottom = '32px';
    cardStyle.right = '32px';
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10400, pointerEvents: 'auto' }}>
      {/* Dimmed Overlay with cutout focus */}
      <div
        onClick={handleComplete}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(3px)',
          transition: 'all 0.3s ease'
        }}
      />

      {/* Target Element Spotlight Halo Box */}
      {targetRect && (
        <div
          style={{
            position: 'fixed',
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            borderRadius: '14px',
            border: '2px solid var(--primary)',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55), 0 0 25px var(--primary-glow)',
            zIndex: 10450,
            pointerEvents: 'none',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Pulsing indicator dot */}
          <div
            style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: 'var(--primary)',
              boxShadow: '0 0 12px var(--primary)',
              animation: 'pulse 1.5s infinite'
            }}
          />
        </div>
      )}

      {/* Floating Tour Guidance Card with Arrow Pointer */}
      <div
        className="card"
        style={{
          ...cardStyle,
          padding: '24px',
          borderRadius: '20px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-glass)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 30px var(--primary-glow)',
          backdropFilter: 'blur(24px)'
        }}
      >
        {/* Step indicator header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ padding: '6px', borderRadius: '10px', background: 'var(--primary-light)', color: 'var(--primary)' }}>
              <StepIcon size={18} />
            </div>
            <span className="badge badge-success" style={{ fontSize: '9.5px', padding: '2px 8px' }}>
              {step.badge}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>
              {currentStep + 1} of {TOUR_STEPS.length}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleComplete}
              style={{ padding: '4px', color: 'var(--text-muted)' }}
              title="End Tour"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Step Title & Description */}
        <h3 style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-main)', margin: '0 0 8px 0' }}>
          {step.title}
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.55', margin: '0 0 20px 0' }}>
          {step.description}
        </p>

        {/* Navigation Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}
            onClick={handleComplete}
          >
            End Tour
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            {currentStep > 0 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '12px', fontWeight: '700', borderRadius: '10px', padding: '6px 14px', gap: '4px' }}
                onClick={handlePrev}
              >
                <ArrowLeft size={14} /> Back
              </button>
            )}

            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ fontSize: '12px', fontWeight: '800', borderRadius: '10px', padding: '6px 16px', gap: '6px' }}
              onClick={handleNext}
            >
              {currentStep < TOUR_STEPS.length - 1 ? (
                <>Next <ArrowRight size={14} /></>
              ) : (
                <>Finish Tour <Check size={14} /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
