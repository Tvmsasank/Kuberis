import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Zap,
  TrendingUp,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  ExternalLink,
  Info,
  Clock,
  Sparkles,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
  CheckCircle2,
  Sliders,
  DollarSign,
  Building,
  Target
} from 'lucide-react';
import {
  SAVINGS_BANKS_CATALOG,
  calculateBankSlabInterest,
  simulateEmergencyFundGrowth,
  generateEmergencyProjections
} from '../utils/savingsRates';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import CustomSelect from './CustomSelect';

export default function EmergencyFundsTab({
  settings = {},
  transactions = [],
  onSaveSettings,
  isPrivacyMode = false
}) {
  const emergencyFunds = settings.emergencyFunds || [];
  const targetMonths = settings.emergencyTargetMonths || 6;

  // Modals state
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingFund, setEditingFund] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [ledgerTarget, setLedgerTarget] = useState(null);
  const [showDirectoryModal, setShowDirectoryModal] = useState(false);
  const [showQuickAdjustModal, setShowQuickAdjustModal] = useState(null);

  // Directory comparison amount
  const [compareAmount, setCompareAmount] = useState('50000');

  // Simulator selected fund or custom amount
  const [simulatorPrincipal, setSimulatorPrincipal] = useState('3000');
  const [simulatorBankId, setSimulatorBankId] = useState('slice');

  // Calculate live balances for all emergency funds
  const liveFunds = useMemo(() => {
    return emergencyFunds.map(fund => {
      const growth = simulateEmergencyFundGrowth({
        depositAmount: fund.depositAmount || 0,
        depositDate: fund.depositDate,
        bankId: fund.bankId || 'slice',
        customRate: fund.customRate,
        payoutFrequency: fund.payoutFrequency || 'daily'
      });
      const bankInfo = SAVINGS_BANKS_CATALOG.find(b => b.id === (fund.bankId || 'slice')) || SAVINGS_BANKS_CATALOG[0];
      return {
        ...fund,
        ...growth,
        bankInfo
      };
    });
  }, [emergencyFunds]);

  // Overall aggregates
  const totalPrincipal = useMemo(() => {
    return liveFunds.reduce((sum, f) => sum + (Number(f.depositAmount) || 0), 0);
  }, [liveFunds]);

  const totalCompoundedBalance = useMemo(() => {
    return liveFunds.reduce((sum, f) => sum + (Number(f.currentBalance) || 0), 0);
  }, [liveFunds]);

  const totalAccruedInterest = useMemo(() => {
    return Math.max(0, totalCompoundedBalance - totalPrincipal);
  }, [totalCompoundedBalance, totalPrincipal]);

  const totalDailyYield = useMemo(() => {
    return liveFunds.reduce((sum, f) => sum + (Number(f.dailyInterestToday) || 0), 0);
  }, [liveFunds]);

  const totalAnnualYield = useMemo(() => {
    return liveFunds.reduce((sum, f) => {
      const { annualInterest } = calculateBankSlabInterest(f.currentBalance, f.bankId, f.customRate);
      return sum + annualInterest;
    }, 0);
  }, [liveFunds]);

  // Monthly burn calculation from user's expense transactions
  const monthlyExpenseBurn = useMemo(() => {
    const expenses = (transactions || []).filter(t => t.type === 'expense');
    if (!expenses.length) return 25000; // sensible default benchmark if no transactions

    const dates = expenses.map(t => new Date(t.date).getTime()).filter(t => !isNaN(t));
    if (!dates.length) return 25000;

    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date();
    const monthsDiff = Math.max(1, (maxDate.getFullYear() - minDate.getFullYear()) * 12 + (maxDate.getMonth() - minDate.getMonth()) + 1);

    const totalExpenseAmount = expenses.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);
    const avg = Math.round(totalExpenseAmount / monthsDiff);
    return avg > 0 ? avg : 25000;
  }, [transactions]);

  // Runway metrics
  const targetReserveGoal = monthlyExpenseBurn * targetMonths;
  const runwayMonthsCovered = monthlyExpenseBurn > 0 ? (totalCompoundedBalance / monthlyExpenseBurn).toFixed(1) : '0.0';
  const runwayProgressPct = Math.min(100, Math.round((totalCompoundedBalance / Math.max(1, targetReserveGoal)) * 100));

  // Handlers for Funds CRUD
  const handleSaveFund = async (fundData) => {
    let updatedFunds;
    if (editingFund) {
      updatedFunds = emergencyFunds.map(f => f.id === editingFund.id ? { ...f, ...fundData } : f);
    } else {
      const newFund = {
        id: `ef_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        createdAt: new Date().toISOString(),
        ...fundData
      };
      updatedFunds = [...emergencyFunds, newFund];
    }

    await onSaveSettings({ emergencyFunds: updatedFunds });
    setShowAddEditModal(false);
    setEditingFund(null);
  };

  const handleDeleteFund = async (fundId) => {
    const updated = emergencyFunds.filter(f => f.id !== fundId);
    await onSaveSettings({ emergencyFunds: updated });
    setDeleteTarget(null);
  };

  const handleUpdateTargetMonths = async (months) => {
    await onSaveSettings({ emergencyTargetMonths: Number(months) });
  };

  // Quick seed Slice Bank account if user has none
  const handleQuickSeedSlice = async () => {
    const sliceFund = {
      id: `ef_slice_${Date.now()}`,
      name: 'Slice Bank Daily Savings',
      bankId: 'slice',
      depositAmount: 3000,
      depositDate: '2026-10-31',
      payoutFrequency: 'daily',
      customRate: null,
      targetGoal: 50000,
      notes: 'Initial deposit ₹3,000 on 31 Oct 2026 earning 5.50% p.a. daily compounding.'
    };
    await onSaveSettings({ emergencyFunds: [...emergencyFunds, sliceFund] });
  };

  // Format currency helper
  const formatINR = (val) => {
    if (isPrivacyMode) return '••••••';
    return '₹' + Number(val || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatINRCompact = (val) => {
    if (isPrivacyMode) return '••••';
    return '₹' + Number(val || 0).toLocaleString('en-IN', {
      maximumFractionDigits: 0
    });
  };

  return (
    <div className="emergency-funds-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(16, 185, 129, 0.10) 100%)',
          border: '1px solid rgba(124, 58, 237, 0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          padding: '24px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #7C3AED, #10B981)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 8px 24px rgba(124, 58, 237, 0.35)'
            }}
          >
            <ShieldCheck size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>
                Emergency Reserves & Liquid Accounts
              </h1>
              <span
                className="badge"
                style={{
                  background: 'rgba(124, 58, 237, 0.25)',
                  color: '#A78BFA',
                  border: '1px solid rgba(124, 58, 237, 0.4)',
                  fontSize: '11px',
                  fontWeight: '600'
                }}
              >
                ⚡ Live Compounding Auto-Sync
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              Live daily interest accrual, progressive RBI slab yields, and automatic synchronization with your Net Worth.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowDirectoryModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Building size={16} />
            <span>Bank Rates Directory</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditingFund(null);
              setShowAddEditModal(true);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={16} />
            <span>Add Emergency Fund</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px'
        }}
      >
        {/* KPI 1: Total Compounded Reserves */}
        <div className="card" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total Liquid Reserves
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>
              <ShieldCheck size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', marginTop: '10px', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
            {formatINR(totalCompoundedBalance)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '12px' }}>
            <span style={{ color: '#10B981', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '2px' }}>
              <ArrowUpRight size={14} /> +{formatINR(totalAccruedInterest)}
            </span>
            <span style={{ color: 'var(--text-muted)' }}>total interest earned</span>
          </div>
          <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
            Principal: {formatINR(totalPrincipal)} • Auto-synced to Net Worth
          </div>
        </div>

        {/* KPI 2: Today's Daily Interest Accrual */}
        <div className="card" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Today's Daily Yield
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(124, 58, 237, 0.15)', color: '#7C3AED' }}>
              <Zap size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', marginTop: '10px', color: '#A78BFA', letterSpacing: '-0.5px' }}>
            +{formatINR(totalDailyYield)} <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)' }}>/ day</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span>Credits every 24h into daily accounts (Slice)</span>
          </div>
          <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
            Compounding on daily closing balance
          </div>
        </div>

        {/* KPI 3: Runway Coverage */}
        <div className="card" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Emergency Runway
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' }}>
              <Target size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', marginTop: '10px', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
            {isPrivacyMode ? '••' : runwayMonthsCovered} <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)' }}>Months</span>
          </div>
          {/* Progress Bar */}
          <div style={{ width: '100%', height: '6px', background: 'var(--bg-glass)', borderRadius: '3px', marginTop: '10px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${runwayProgressPct}%`,
                height: '100%',
                background: runwayProgressPct >= 100 ? '#10B981' : runwayProgressPct >= 50 ? '#3B82F6' : '#F59E0B',
                transition: 'width 0.4s ease'
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <span>Target: {targetMonths} Months ({formatINRCompact(targetReserveGoal)})</span>
            <span style={{ fontWeight: '700', color: runwayProgressPct >= 100 ? '#10B981' : 'var(--text-main)' }}>
              {runwayProgressPct}%
            </span>
          </div>
        </div>

        {/* KPI 4: Annual Passive Yield */}
        <div className="card" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Projected 1-Year Passive Yield
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', marginTop: '10px', color: '#F59E0B', letterSpacing: '-0.5px' }}>
            +{formatINR(totalAnnualYield)} <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)' }}>/ year</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span>Monthly burn basis: ~{formatINRCompact(monthlyExpenseBurn)}/mo</span>
          </div>
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
            <span>Target Runway:</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[3, 6, 9, 12].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleUpdateTargetMonths(m)}
                  style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: 'none',
                    fontSize: '10px',
                    cursor: 'pointer',
                    background: targetMonths === m ? 'var(--primary)' : 'var(--bg-glass)',
                    color: targetMonths === m ? '#fff' : 'var(--text-muted)',
                    fontWeight: targetMonths === m ? '700' : '400'
                  }}
                >
                  {m}M
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Slice Bank Daily Compounding Callout Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.12) 0%, rgba(79, 70, 229, 0.08) 100%)',
          border: '1px solid rgba(124, 58, 237, 0.25)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '28px' }}>⚡</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>
                  Slice Bank Daily Interest Compounding (5.50% p.a.)
                </span>
                <span className="badge" style={{ background: '#7C3AED', color: '#fff', fontSize: '10px', fontWeight: '700' }}>
                  24h Payout
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                Unlike traditional banks that credit quarterly, Slice credits interest every morning.
                Daily percentage is <strong>~0.015068%</strong> (5.50% / 365).
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Example with ₹3,000 on 31 Oct</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#10B981' }}>
                Day 1: ₹3000.45 → Day 2: ₹3000.90
              </div>
            </div>
            {!emergencyFunds.some(f => f.bankId === 'slice') && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleQuickSeedSlice}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                + Add My ₹3,000 Slice Fund
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Emergency Funds Accounts Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Active Emergency Accounts</h2>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              All accounts below automatically credit and compound into your Dynamic Net Worth
            </p>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {liveFunds.length} {liveFunds.length === 1 ? 'account' : 'accounts'} configured
          </span>
        </div>

        {liveFunds.length === 0 ? (
          <div
            className="card"
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px'
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(124, 58, 237, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#7C3AED',
                fontSize: '28px'
              }}
            >
              🛡️
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>No Emergency Funds Added Yet</h3>
              <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-muted)', maxWidth: '460px' }}>
                Track high-yield liquid savings accounts like your Slice Bank (5.50% daily compounding) or IDFC FIRST (7.00% monthly).
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleQuickSeedSlice}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Zap size={16} />
                <span>Add ₹3,000 Slice Bank Account</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setEditingFund(null);
                  setShowAddEditModal(true);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Plus size={16} />
                <span>Add Custom Bank Account</span>
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '16px'
            }}
          >
            {liveFunds.map(fund => {
              const isSlice = fund.bankId === 'slice';
              return (
                <div
                  key={fund.id}
                  className="card"
                  style={{
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderLeft: `4px solid ${fund.bankInfo?.themeColor || '#7C3AED'}`,
                    position: 'relative'
                  }}
                >
                  <div>
                    {/* Top Row: Title + Bank Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: 'var(--bg-glass)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '20px',
                            border: '1px solid var(--border-color)'
                          }}
                        >
                          {fund.bankInfo?.logo || '🏦'}
                        </div>
                        <div>
                          <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'var(--text-main)' }}>
                            {fund.name}
                          </h3>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <span>{fund.bankInfo?.shortName || 'Bank'}</span>
                            <span>•</span>
                            <span style={{ color: fund.effectiveRate >= 5.5 ? '#10B981' : 'var(--text-muted)', fontWeight: '600' }}>
                              {fund.effectiveRate}% p.a.
                            </span>
                          </div>
                        </div>
                      </div>

                      <span
                        className="badge"
                        style={{
                          background: isSlice ? 'rgba(124, 58, 237, 0.2)' : 'rgba(59, 130, 246, 0.15)',
                          color: isSlice ? '#A78BFA' : '#60A5FA',
                          border: `1px solid ${isSlice ? 'rgba(124, 58, 237, 0.4)' : 'rgba(59, 130, 246, 0.3)'}`,
                          fontSize: '10px',
                          fontWeight: '700'
                        }}
                      >
                        {fund.payoutFrequency === 'daily' ? '⚡ Daily Payout' : fund.payoutFrequency === 'monthly' ? '📅 Monthly Payout' : '🗓️ Quarterly'}
                      </span>
                    </div>

                    {/* Balance Highlight Box */}
                    <div
                      style={{
                        margin: '16px 0',
                        padding: '14px',
                        borderRadius: '12px',
                        background: 'var(--bg-glass)',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
                        Live Compounded Balance
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '4px' }}>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)' }}>
                          {formatINR(fund.currentBalance)}
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#10B981' }}>
                          +{formatINR(fund.accruedInterest)} earned
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px', borderTop: '1px dashed var(--border-color)', paddingTop: '10px', fontSize: '11px' }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Initial Deposit:</span>
                          <div style={{ fontWeight: '600', color: 'var(--text-main)', marginTop: '2px' }}>
                            {formatINR(fund.depositAmount)}
                          </div>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Today's Accrual:</span>
                          <div style={{ fontWeight: '700', color: '#7C3AED', marginTop: '2px' }}>
                            +{formatINR(fund.dailyInterestToday)}/day
                          </div>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Deposit Date:</span>
                          <div style={{ fontWeight: '500', color: 'var(--text-main)', marginTop: '2px' }}>
                            {fund.depositDate}
                          </div>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Compounding Days:</span>
                          <div style={{ fontWeight: '600', color: 'var(--text-main)', marginTop: '2px' }}>
                            {fund.daysElapsed} days
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Notes if any */}
                    {fund.notes && (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px', fontStyle: 'italic' }}>
                        "{fund.notes}"
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1px solid var(--border-color)',
                      paddingTop: '12px',
                      marginTop: '8px'
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setLedgerTarget(fund)}
                      style={{ fontSize: '11px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      title="View day-by-day compounding statement"
                    >
                      <Calendar size={13} />
                      <span>Ledger History</span>
                    </button>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setEditingFund(fund);
                          setShowAddEditModal(true);
                        }}
                        style={{ padding: '6px', fontSize: '12px' }}
                        title="Edit Fund"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setDeleteTarget(fund)}
                        style={{ padding: '6px', fontSize: '12px', color: '#EF4444' }}
                        title="Delete Fund"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Live Interactive Compounding Simulator */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={20} style={{ color: '#F59E0B' }} />
              <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>
                Compounding Growth Simulator & Projections
              </h2>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              Forecast your emergency fund trajectory over 7 days, 30 days, 6 months, and 1 year.
            </p>
          </div>

          {/* Controls: Principal & Bank Selector */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Deposit:</span>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '8px', top: '7px', fontSize: '12px', color: 'var(--text-muted)' }}>₹</span>
                <input
                  type="number"
                  className="input"
                  style={{ width: '110px', paddingLeft: '22px', fontSize: '12px' }}
                  value={simulatorPrincipal}
                  onChange={e => setSimulatorPrincipal(e.target.value)}
                  placeholder="3000"
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Bank:</span>
              <CustomSelect
                options={SAVINGS_BANKS_CATALOG.map(b => ({
                  value: b.id,
                  label: `${b.shortName} (${b.baseRate}%)`
                }))}
                value={simulatorBankId}
                onChange={setSimulatorBankId}
                width="180px"
              />
            </div>
          </div>
        </div>

        {/* Projection Cards */}
        {(() => {
          const p = Number(simulatorPrincipal) || 3000;
          const projections = generateEmergencyProjections(p, simulatorBankId);
          return (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px'
              }}
            >
              {projections.map(proj => (
                <div
                  key={proj.label}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: 'var(--bg-glass)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>
                    {proj.label}
                  </span>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px' }}>
                    {formatINR(proj.finalBalance)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#10B981', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ArrowUpRight size={13} /> +{formatINR(proj.interestEarned)}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Avg: +{formatINR(proj.dailyAverage)}/day
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* ADD / EDIT FUND MODAL */}
      {showAddEditModal && (
        <AddEditFundModal
          fund={editingFund}
          onClose={() => {
            setShowAddEditModal(false);
            setEditingFund(null);
          }}
          onSave={handleSaveFund}
        />
      )}

      {/* DAY-BY-DAY LEDGER MODAL */}
      {ledgerTarget && (
        <DayByDayLedgerModal
          fund={ledgerTarget}
          onClose={() => setLedgerTarget(null)}
          formatINR={formatINR}
        />
      )}

      {/* OFFICIAL BANK DIRECTORY MODAL */}
      {showDirectoryModal && (
        <BankDirectoryModal
          compareAmount={compareAmount}
          onCompareAmountChange={setCompareAmount}
          onClose={() => setShowDirectoryModal(false)}
          onSelectBankForFund={(bank) => {
            setShowDirectoryModal(false);
            setEditingFund({
              name: `${bank.shortName} Savings Account`,
              bankId: bank.id,
              depositAmount: Number(compareAmount) || 10000,
              depositDate: new Date().toISOString().split('T')[0],
              payoutFrequency: bank.payoutFrequency,
              customRate: bank.id === 'custom' ? 4.0 : null
            });
            setShowAddEditModal(true);
          }}
          formatINR={formatINR}
        />
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <ConfirmDeleteModal
          isOpen={true}
          title="Remove Emergency Fund"
          message={`Are you sure you want to remove "${deleteTarget.name}"? It will be removed from your emergency reserves and Dynamic Net Worth.`}
          onConfirm={() => handleDeleteFund(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

// ==========================================
// ADD / EDIT FUND MODAL
// ==========================================
function AddEditFundModal({ fund, onClose, onSave }) {
  const [name, setName] = useState(fund?.name || 'Slice Bank Savings');
  const [bankId, setBankId] = useState(fund?.bankId || 'slice');
  const [depositAmount, setDepositAmount] = useState(fund?.depositAmount !== undefined ? String(fund.depositAmount) : '3000');
  const [depositDate, setDepositDate] = useState(fund?.depositDate || '2026-10-31');
  const [payoutFrequency, setPayoutFrequency] = useState(fund?.payoutFrequency || 'daily');
  const [customRate, setCustomRate] = useState(fund?.customRate ? String(fund.customRate) : '');
  const [targetGoal, setTargetGoal] = useState(fund?.targetGoal ? String(fund.targetGoal) : '');
  const [notes, setNotes] = useState(fund?.notes || '');

  const selectedBank = SAVINGS_BANKS_CATALOG.find(b => b.id === bankId) || SAVINGS_BANKS_CATALOG[0];

  const handleBankChange = (newBankId) => {
    setBankId(newBankId);
    const bank = SAVINGS_BANKS_CATALOG.find(b => b.id === newBankId);
    if (bank) {
      setPayoutFrequency(bank.payoutFrequency);
      if (!fund) {
        setName(`${bank.shortName} Savings`);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) return;

    onSave({
      name: name.trim() || `${selectedBank.shortName} Fund`,
      bankId,
      depositAmount: amt,
      depositDate: depositDate || new Date().toISOString().split('T')[0],
      payoutFrequency,
      customRate: customRate ? parseFloat(customRate) : null,
      targetGoal: targetGoal ? parseFloat(targetGoal) : null,
      notes: notes.trim()
    });
  };

  return (
    <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050 }}>
      <div
        className="modal-content"
        style={{
          width: '100%',
          maxWidth: '540px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '24px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🛡️</span>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>
                {fund ? 'Edit Emergency Fund' : 'Add Emergency Fund'}
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                Configure bank account and interest compounding details
              </p>
            </div>
          </div>
          <button type="button" className="btn btn-secondary" onClick={onClose} style={{ padding: '6px 10px' }}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Bank Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Select Bank / Account Type
            </label>
            <CustomSelect
              options={SAVINGS_BANKS_CATALOG.map(b => ({
                value: b.id,
                label: `${b.logo} ${b.name} (${b.badge})`
              }))}
              value={bankId}
              onChange={handleBankChange}
            />
            <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
              {selectedBank.description}
            </div>
          </div>

          {/* Account Label */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Account Name / Label
            </label>
            <input
              type="text"
              className="input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Slice Bank Daily Savings"
              required
            />
          </div>

          {/* Deposit Amount & Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Initial Deposit Amount (₹)
              </label>
              <input
                type="number"
                step="any"
                min="1"
                className="input"
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                placeholder="3000"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Deposit Date
              </label>
              <input
                type="date"
                className="input"
                value={depositDate}
                onChange={e => setDepositDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Payout & Compounding Frequency */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Payout Frequency
              </label>
              <CustomSelect
                options={[
                  { value: 'daily', label: '⚡ Daily Compounding (Slice)' },
                  { value: 'monthly', label: '📅 Monthly Payout (IDFC/RBL)' },
                  { value: 'quarterly', label: '🗓️ Quarterly (SBI/HDFC)' }
                ]}
                value={payoutFrequency}
                onChange={setPayoutFrequency}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Custom Rate % (Optional override)
              </label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={customRate}
                onChange={e => setCustomRate(e.target.value)}
                placeholder={`Default: ${selectedBank.baseRate}%`}
              />
            </div>
          </div>

          {/* Target Goal (Optional) */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Target Emergency Goal Amount (₹, Optional)
            </label>
            <input
              type="number"
              step="any"
              className="input"
              value={targetGoal}
              onChange={e => setTargetGoal(e.target.value)}
              placeholder="e.g. 50000"
            />
          </div>

          {/* Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Notes / Tags
            </label>
            <input
              type="text"
              className="input"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Kept for medical emergency / daily interest checking"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {fund ? 'Save Changes' : 'Add Emergency Fund'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// DAY-BY-DAY LEDGER MODAL
// ==========================================
function DayByDayLedgerModal({ fund, onClose, formatINR }) {
  const history = fund?.dayByDayHistory || [];

  return (
    <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050 }}>
      <div
        className="modal-content"
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '24px' }}>📜</span>
              <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>
                Compounding Ledger: {fund.name}
              </h2>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              Accrual history from {fund.depositDate} to Today ({fund.daysElapsed} days elapsed)
            </p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={onClose} style={{ padding: '6px 10px' }}>
            ✕
          </button>
        </div>

        {/* Summary Mini Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            padding: '12px',
            borderRadius: '8px',
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-color)',
            marginBottom: '16px'
          }}
        >
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Initial Principal:</span>
            <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>
              {formatINR(fund.depositAmount)}
            </div>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Accrued Interest:</span>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#10B981' }}>
              +{formatINR(fund.accruedInterest)}
            </div>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Current Compounded Balance:</span>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#7C3AED' }}>
              {formatINR(fund.currentBalance)}
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-glass)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0 }}>
                <th style={{ padding: '10px 14px' }}>Day</th>
                <th style={{ padding: '10px 14px' }}>Date</th>
                <th style={{ padding: '10px 14px' }}>Opening Balance</th>
                <th style={{ padding: '10px 14px' }}>Daily Interest Earned</th>
                <th style={{ padding: '10px 14px' }}>Cumulative Earned</th>
                <th style={{ padding: '10px 14px' }}>Closing Balance</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row, idx) => (
                <tr
                  key={idx}
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    background: idx === history.length - 1 ? 'rgba(124, 58, 237, 0.08)' : 'transparent'
                  }}
                >
                  <td style={{ padding: '8px 14px', fontWeight: '600' }}>
                    {row.day === 0 ? 'Day 0 (Deposit)' : `Day ${row.day}`}
                  </td>
                  <td style={{ padding: '8px 14px', color: 'var(--text-muted)' }}>{row.date}</td>
                  <td style={{ padding: '8px 14px' }}>{formatINR(row.openingBalance)}</td>
                  <td style={{ padding: '8px 14px', color: row.dailyInterest > 0 ? '#10B981' : 'var(--text-muted)', fontWeight: '700' }}>
                    {row.dailyInterest > 0 ? `+${formatINR(row.dailyInterest)}` : '—'}
                  </td>
                  <td style={{ padding: '8px 14px', color: '#10B981' }}>
                    {formatINR(row.cumulativeInterest)}
                  </td>
                  <td style={{ padding: '8px 14px', fontWeight: '700', color: 'var(--text-main)' }}>
                    {formatINR(row.closingBalance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close Ledger
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// BANK DIRECTORY & SLAB COMPARISON MODAL
// ==========================================
function BankDirectoryModal({ compareAmount, onCompareAmountChange, onClose, onSelectBankForFund, formatINR }) {
  const amount = Number(compareAmount) || 50000;

  return (
    <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050 }}>
      <div
        className="modal-content"
        style={{
          width: '100%',
          maxWidth: '850px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '24px' }}>🏛️</span>
              <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>
                Indian Savings Accounts Interest Directory
              </h2>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              Official savings rates and progressive tier breakdowns (Q3-Q4 FY 2026-27).
            </p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={onClose} style={{ padding: '6px 10px' }}>
            ✕
          </button>
        </div>

        {/* Live Comparison Input */}
        <div
          style={{
            padding: '16px',
            borderRadius: '12px',
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
              Compare Returns for Deposit Amount:
            </span>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '10px', top: '7px', fontSize: '12px', color: 'var(--text-muted)' }}>₹</span>
              <input
                type="number"
                className="input"
                style={{ width: '140px', paddingLeft: '24px', fontSize: '13px', fontWeight: '700' }}
                value={compareAmount}
                onChange={e => onCompareAmountChange(e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[3000, 25000, 50000, 100000, 500000].map(val => (
              <button
                key={val}
                type="button"
                className="btn btn-secondary"
                onClick={() => onCompareAmountChange(String(val))}
                style={{ padding: '4px 8px', fontSize: '11px' }}
              >
                ₹{val >= 100000 ? `${val / 100000}L` : `${val / 1000}k`}
              </button>
            ))}
          </div>
        </div>

        {/* Banks Cards / Table List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {SAVINGS_BANKS_CATALOG.filter(b => b.id !== 'custom').map(bank => {
            const { effectiveAnnualRate, annualInterest, dailyInterest, slabBreakdown } = calculateBankSlabInterest(amount, bank.id);
            const isSlice = bank.id === 'slice';

            return (
              <div
                key={bank.id}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: isSlice ? 'rgba(124, 58, 237, 0.08)' : 'var(--bg-glass)',
                  border: isSlice ? '1px solid rgba(124, 58, 237, 0.35)' : '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '24px' }}>{bank.logo}</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)' }}>
                          {bank.name}
                        </span>
                        <span
                          className="badge"
                          style={{
                            background: isSlice ? '#7C3AED' : 'rgba(59, 130, 246, 0.2)',
                            color: '#fff',
                            fontSize: '10px',
                            fontWeight: '700'
                          }}
                        >
                          {bank.badge}
                        </span>
                      </div>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {bank.headline}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: '#10B981' }}>
                        +{formatINR(annualInterest)} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>/ yr</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        +{formatINR(dailyInterest)}/day • Effective: <strong>{effectiveAnnualRate}%</strong>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => onSelectBankForFund(bank)}
                      style={{ fontSize: '11px', padding: '6px 12px' }}
                    >
                      + Select
                    </button>
                  </div>
                </div>

                {/* Slabs breakdown details */}
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.1)', padding: '8px 12px', borderRadius: '6px' }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px', color: 'var(--text-main)' }}>
                    Progressive Slabs Calculation for {formatINR(amount)}:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {slabBreakdown.map((s, idx) => (
                      <span key={idx} style={{ background: 'var(--bg-glass)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        {s.label}: {formatINR(s.amountInSlab)} @ {s.rate}% = +{formatINR(s.interest)}/yr
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close Directory
          </button>
        </div>
      </div>
    </div>
  );
}
