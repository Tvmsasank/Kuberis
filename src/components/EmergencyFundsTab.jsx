import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldCheck,
  Zap,
  TrendingUp,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Building,
  Target,
  X,
  Coins,
  History,
  PlusCircle,
  MinusCircle,
  FileText
} from 'lucide-react';
import {
  SAVINGS_BANKS_CATALOG,
  calculateBankSlabInterest,
  simulateEmergencyFundGrowth,
  generateEmergencyProjections,
  formatLocalDate
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
  const [depositModalTarget, setDepositModalTarget] = useState(null);

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
        deposits: Array.isArray(fund.deposits) ? fund.deposits : [],
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

  // Keep ledgerTarget in sync with liveFunds updates
  const activeLedgerFund = useMemo(() => {
    if (!ledgerTarget) return null;
    return liveFunds.find(f => f.id === ledgerTarget.id) || ledgerTarget;
  }, [ledgerTarget, liveFunds]);

  // Overall aggregates
  const totalPrincipal = useMemo(() => {
    return liveFunds.reduce((sum, f) => sum + (Number(f.netPrincipal) || 0), 0);
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
    if (!expenses.length) return 25000;

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
        deposits: [],
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
    if (ledgerTarget && ledgerTarget.id === fundId) {
      setLedgerTarget(null);
    }
  };

  // Add a new deposit or withdrawal to a fund
  const handleAddDeposit = async (fundId, depositData) => {
    const updated = emergencyFunds.map(f => {
      if (f.id === fundId) {
        const existingDeposits = Array.isArray(f.deposits) ? f.deposits : [];
        const newDep = {
          id: `dep_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          createdAt: new Date().toISOString(),
          ...depositData
        };
        return {
          ...f,
          deposits: [...existingDeposits, newDep]
        };
      }
      return f;
    });

    await onSaveSettings({ emergencyFunds: updated });
    setDepositModalTarget(null);
  };

  // Delete an individual deposit or withdrawal
  const handleDeleteDeposit = async (fundId, depositId) => {
    const updated = emergencyFunds.map(f => {
      if (f.id === fundId) {
        const existingDeposits = Array.isArray(f.deposits) ? f.deposits : [];
        return {
          ...f,
          deposits: existingDeposits.filter(d => d.id !== depositId)
        };
      }
      return f;
    });

    await onSaveSettings({ emergencyFunds: updated });
  };

  const handleUpdateTargetMonths = async (months) => {
    await onSaveSettings({ emergencyTargetMonths: Number(months) });
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
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(124, 58, 237, 0.10) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
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
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #10B981, #7C3AED)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)'
            }}
          >
            <ShieldCheck size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>
                Emergency Reserves & Liquid Accounts
              </h1>
              <span
                className="badge"
                style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#10B981',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  fontSize: '11px',
                  fontWeight: '600'
                }}
              >
                ⚡ Live Compounding Auto-Sync
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              Accurate multi-deposit tracking, official RBI slab yields, and automatic synchronization with your Net Worth.
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
            Net Principal: {formatINR(totalPrincipal)} • Auto-synced to Net Worth
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
            <span>Compounded and credited into your accounts daily</span>
          </div>
          <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
            Calculated on daily closing balances
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
                background: 'rgba(16, 185, 129, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10B981',
                fontSize: '28px'
              }}
            >
              🛡️
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>No Emergency Funds Added Yet</h3>
              <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-muted)', maxWidth: '460px' }}>
                Track high-yield liquid savings accounts, record multiple deposits anytime, and watch daily compounded returns auto-sync into your Net Worth.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
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
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDirectoryModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Building size={16} />
                <span>View Bank Rates Directory</span>
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
              const depositsCount = fund.depositsCount || 1;

              return (
                <div
                  key={fund.id}
                  className="card"
                  style={{
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderLeft: `4px solid ${fund.bankInfo?.themeColor || '#10B981'}`,
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
                          background: isSlice ? 'rgba(124, 58, 237, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                          color: isSlice ? '#A78BFA' : '#10B981',
                          border: `1px solid ${isSlice ? 'rgba(124, 58, 237, 0.4)' : 'rgba(16, 185, 129, 0.3)'}`,
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
                          <span style={{ color: 'var(--text-muted)' }}>Net Principal Deposited:</span>
                          <div style={{ fontWeight: '700', color: 'var(--text-main)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{formatINR(fund.netPrincipal)}</span>
                            {depositsCount > 1 && (
                              <span className="badge" style={{ fontSize: '9px', padding: '1px 5px', background: 'var(--primary-light)', color: 'var(--primary)' }}>
                                {depositsCount} deposits
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Today's Accrual:</span>
                          <div style={{ fontWeight: '700', color: '#10B981', marginTop: '2px' }}>
                            +{formatINR(fund.dailyInterestToday)}/day
                          </div>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Active Since:</span>
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
                      marginTop: '8px',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => setDepositModalTarget(fund)}
                        style={{ fontSize: '11px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Deposit more amount or withdraw"
                      >
                        <PlusCircle size={13} />
                        <span>Deposit / Withdraw</span>
                      </button>

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
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setEditingFund(fund);
                          setShowAddEditModal(true);
                        }}
                        style={{ padding: '6px', fontSize: '12px' }}
                        title="Edit Account Details"
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
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

          {/* Controls: Redesigned with proper spacing, form-control theme, and full-width dropdown */}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Deposit Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                Deposit:
              </label>
              <div style={{ position: 'relative', width: '130px' }}>
                <span style={{ position: 'absolute', left: '10px', top: '9px', fontSize: '13px', color: 'var(--primary)', fontWeight: '700' }}>
                  ₹
                </span>
                <input
                  type="number"
                  className="form-control"
                  style={{ paddingLeft: '24px', height: '38px', fontSize: '13px', fontWeight: '700' }}
                  value={simulatorPrincipal}
                  onChange={e => setSimulatorPrincipal(e.target.value)}
                  placeholder="3000"
                />
              </div>
            </div>

            {/* Bank Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                Bank:
              </label>
              <div style={{ width: '240px' }}>
                <CustomSelect
                  options={SAVINGS_BANKS_CATALOG.map(b => ({
                    value: b.id,
                    label: `${b.shortName} (${b.baseRate}%)`
                  }))}
                  value={simulatorBankId}
                  onChange={(e) => {
                    const selectedVal = e?.target ? e.target.value : (e?.value || e);
                    setSimulatorBankId(String(selectedVal));
                  }}
                  size="md"
                />
              </div>
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

      {/* QUICK DEPOSIT / WITHDRAW MODAL */}
      {depositModalTarget && (
        <AddTransactionModal
          fund={depositModalTarget}
          onClose={() => setDepositModalTarget(null)}
          onSave={(depositData) => handleAddDeposit(depositModalTarget.id, depositData)}
        />
      )}

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
      {activeLedgerFund && (
        <DayByDayLedgerModal
          fund={activeLedgerFund}
          onClose={() => setLedgerTarget(null)}
          onOpenDepositModal={() => setDepositModalTarget(activeLedgerFund)}
          onDeleteDeposit={(depositId) => handleDeleteDeposit(activeLedgerFund.id, depositId)}
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
              depositDate: formatLocalDate(new Date()),
              payoutFrequency: bank.payoutFrequency,
              customRate: null
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
// ADD DEPOSIT / WITHDRAWAL TRANSACTION MODAL
// ==========================================
function AddTransactionModal({ fund, onClose, onSave }) {
  const [type, setType] = useState('deposit'); // 'deposit' | 'withdrawal'
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => formatLocalDate(new Date()));
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  // Prevent background scrolling while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than ₹0.');
      return;
    }
    if (!date) {
      setError('Please select a transaction date.');
      return;
    }

    onSave({
      type,
      amount: parsedAmount,
      date,
      notes: notes.trim() || (type === 'deposit' ? 'Month-end Surplus' : 'Emergency Withdrawal')
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '28px',
          borderRadius: '24px',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          border: '1px solid var(--border-glass)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '12px', background: type === 'deposit' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: type === 'deposit' ? '#10B981' : '#EF4444' }}>
              {type === 'deposit' ? <PlusCircle size={20} /> : <MinusCircle size={20} />}
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                {type === 'deposit' ? 'Deposit Into Fund' : 'Withdraw From Fund'}
              </h2>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {fund.name}
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close" style={{ padding: '6px' }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: '12px', marginBottom: '16px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Segmented Toggle */}
          <div className="form-group">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', background: 'var(--bg-app)', padding: '5px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
              <button
                type="button"
                className="btn"
                style={{
                  padding: '9px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: '700',
                  background: type === 'deposit' ? '#10B981' : 'transparent',
                  color: type === 'deposit' ? '#FFFFFF' : 'var(--text-muted)',
                  boxShadow: type === 'deposit' ? '0 2px 10px rgba(16, 185, 129, 0.4)' : 'none',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setType('deposit')}
              >
                + Deposit Money
              </button>
              <button
                type="button"
                className="btn"
                style={{
                  padding: '9px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: '700',
                  background: type === 'withdrawal' ? '#EF4444' : 'transparent',
                  color: type === 'withdrawal' ? '#FFFFFF' : 'var(--text-muted)',
                  boxShadow: type === 'withdrawal' ? '0 2px 10px rgba(239, 68, 68, 0.4)' : 'none',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setType('withdrawal')}
              >
                - Withdraw Money
              </button>
            </div>
          </div>

          {/* Amount */}
          <div className="form-group">
            <label className="form-label">Amount (₹)</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '10px', fontSize: '13px', color: 'var(--primary)', fontWeight: '700' }}>₹</span>
              <input
                type="number"
                step="any"
                min="1"
                className="form-control"
                style={{ paddingLeft: '28px', fontSize: '15px', fontWeight: '700' }}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="3000"
                required
                autoFocus
              />
            </div>
          </div>

          {/* Date */}
          <div className="form-group">
            <label className="form-label">Transaction Date</label>
            <input
              type="date"
              className="form-control"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="form-label">Notes / Description (Optional)</label>
            <input
              type="text"
              className="form-control"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={type === 'deposit' ? 'e.g. November month-end surplus' : 'e.g. Urgent car repair'}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ background: type === 'deposit' ? '#10B981' : '#EF4444' }}>
              {type === 'deposit' ? 'Confirm Deposit' : 'Confirm Withdrawal'}
            </button>
          </div>
        </form>
      </div>
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

  // Prevent background scrolling while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const selectedBank = SAVINGS_BANKS_CATALOG.find(b => b.id === bankId) || SAVINGS_BANKS_CATALOG[0];

  const handleBankChange = (newBankId) => {
    const val = newBankId?.target ? newBankId.target.value : (newBankId?.value || newBankId);
    const bankKey = String(val);
    setBankId(bankKey);
    const bank = SAVINGS_BANKS_CATALOG.find(b => b.id === bankKey);
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
      depositDate: depositDate || formatLocalDate(new Date()),
      payoutFrequency,
      customRate: customRate ? parseFloat(customRate) : null,
      targetGoal: targetGoal ? parseFloat(targetGoal) : null,
      notes: notes.trim(),
      deposits: fund?.deposits || []
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '540px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px',
          borderRadius: '24px',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          border: '1px solid var(--border-glass)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary)' }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                {fund ? 'Edit Emergency Fund' : 'Add Emergency Fund'}
              </h2>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Configure bank account and initial deposit details
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close" style={{ padding: '6px' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Bank Selection */}
          <div className="form-group">
            <label className="form-label">
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
          <div className="form-group">
            <label className="form-label">
              Account Name / Label
            </label>
            <input
              type="text"
              className="form-control"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Slice Bank Savings"
              required
            />
          </div>

          {/* Deposit Amount & Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">
                Initial Deposit Amount (₹)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '10px', fontSize: '13px', color: 'var(--primary)', fontWeight: '700' }}>₹</span>
                <input
                  type="number"
                  step="any"
                  min="1"
                  className="form-control"
                  style={{ paddingLeft: '28px' }}
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                  placeholder="3000"
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">
                Initial Deposit Date
              </label>
              <input
                type="date"
                className="form-control"
                value={depositDate}
                onChange={e => setDepositDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Payout & Compounding Frequency */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">
                Payout Frequency
              </label>
              <CustomSelect
                options={[
                  { value: 'daily', label: '⚡ Daily Compounding (Slice)' },
                  { value: 'monthly', label: '📅 Monthly Payout (IDFC/RBL)' },
                  { value: 'quarterly', label: '🗓️ Quarterly (SBI/HDFC)' }
                ]}
                value={payoutFrequency}
                onChange={(e) => {
                  const val = e?.target ? e.target.value : (e?.value || e);
                  setPayoutFrequency(String(val));
                }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                Custom Rate % (Optional override)
              </label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                value={customRate}
                onChange={e => setCustomRate(e.target.value)}
                placeholder={`Default: ${selectedBank.baseRate}%`}
              />
            </div>
          </div>

          {/* Target Goal (Optional) */}
          <div className="form-group">
            <label className="form-label">
              Target Emergency Goal Amount (₹, Optional)
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '10px', fontSize: '13px', color: 'var(--primary)', fontWeight: '700' }}>₹</span>
              <input
                type="number"
                step="any"
                className="form-control"
                style={{ paddingLeft: '28px' }}
                value={targetGoal}
                onChange={e => setTargetGoal(e.target.value)}
                placeholder="e.g. 50000"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="form-label">
              Notes / Description
            </label>
            <input
              type="text"
              className="form-control"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Primary liquid reserve for medical / urgent expenses"
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
// DAY-BY-DAY LEDGER & TRANSACTIONS MODAL
// ==========================================
function DayByDayLedgerModal({ fund, onClose, onOpenDepositModal, onDeleteDeposit, formatINR }) {
  const history = fund?.dayByDayHistory || [];
  const allEvents = fund?.allEvents || [];
  const [activeTab, setActiveTab] = useState('statement'); // 'statement' | 'transactions'

  // Prevent background scrolling while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '820px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '28px',
          borderRadius: '24px',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          border: '1px solid var(--border-glass)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '24px' }}>📜</span>
              <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                Compounding Ledger: {fund.name}
              </h2>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              Accrual history from {fund.depositDate} to Today ({fund.daysElapsed} days elapsed)
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onOpenDepositModal}
              style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <PlusCircle size={14} />
              <span>+ Deposit / Withdraw</span>
            </button>
            <button className="modal-close" onClick={onClose} aria-label="Close" style={{ padding: '6px' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Summary Mini Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            padding: '14px',
            borderRadius: '14px',
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-color)',
            marginBottom: '16px'
          }}
        >
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Net Principal Deposited:</span>
            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px' }}>
              {formatINR(fund.netPrincipal || fund.depositAmount)}
            </div>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Accrued Interest:</span>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#10B981', marginTop: '2px' }}>
              +{formatINR(fund.accruedInterest)}
            </div>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Current Compounded Balance:</span>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#7C3AED', marginTop: '2px' }}>
              {formatINR(fund.currentBalance)}
            </div>
          </div>
        </div>

        {/* View Switcher: Statement vs Transactions */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
          <button
            type="button"
            className="btn"
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '700',
              background: activeTab === 'statement' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'statement' ? '#FFFFFF' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onClick={() => setActiveTab('statement')}
          >
            <History size={14} />
            <span>Day-by-Day Compounding Statement</span>
          </button>
          <button
            type="button"
            className="btn"
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '700',
              background: activeTab === 'transactions' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'transactions' ? '#FFFFFF' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onClick={() => setActiveTab('transactions')}
          >
            <FileText size={14} />
            <span>Deposits & Withdrawals Log ({allEvents.length})</span>
          </button>
        </div>

        {/* Tab 1: Day-by-Day Statement */}
        {activeTab === 'statement' && (
          <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-glass)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0 }}>
                  <th style={{ padding: '10px 14px' }}>Day</th>
                  <th style={{ padding: '10px 14px' }}>Date</th>
                  <th style={{ padding: '10px 14px' }}>Events / Deposits</th>
                  <th style={{ padding: '10px 14px' }}>Opening Balance</th>
                  <th style={{ padding: '10px 14px' }}>Interest Credited</th>
                  <th style={{ padding: '10px 14px' }}>Cumulative Earned</th>
                  <th style={{ padding: '10px 14px' }}>Closing Settled Balance</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row, idx) => {
                  const hasEvents = row.events && row.events.length > 0;
                  const isLast = idx === history.length - 1;

                  return (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        background: hasEvents
                          ? 'rgba(16, 185, 129, 0.05)'
                          : isLast
                          ? 'rgba(124, 58, 237, 0.06)'
                          : 'transparent'
                      }}
                    >
                      <td style={{ padding: '8px 14px', fontWeight: '600' }}>
                        {row.day === 0 ? 'Day 0' : `Day ${row.day}`}
                        {isLast && (
                          <span
                            className="badge"
                            style={{
                              marginLeft: '6px',
                              fontSize: '9.5px',
                              padding: '1px 5px',
                              background: 'rgba(124, 58, 237, 0.2)',
                              color: '#A78BFA'
                            }}
                          >
                            Today
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {row.date}
                      </td>
                      <td style={{ padding: '8px 14px' }}>
                        {hasEvents ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {row.events.map((evt, eIdx) => (
                              <span
                                key={eIdx}
                                className="badge"
                                style={{
                                  background: evt.type === 'deposit' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                  color: evt.type === 'deposit' ? '#10B981' : '#EF4444',
                                  fontSize: '10.5px',
                                  fontWeight: '700',
                                  padding: '2px 6px',
                                  width: 'fit-content'
                                }}
                              >
                                {evt.type === 'deposit' ? `+${formatINR(evt.amount)}` : `-${formatINR(evt.amount)}`}
                                {evt.notes ? ` (${evt.notes})` : ''}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '8px 14px' }}>
                        {formatINR(row.openingBalance)}
                      </td>
                      <td style={{ padding: '8px 14px', color: row.dailyInterest > 0 ? '#10B981' : 'var(--text-muted)', fontWeight: '700' }}>
                        {row.dailyInterest > 0 ? `+${formatINR(row.dailyInterest)}` : '—'}
                      </td>
                      <td style={{ padding: '8px 14px', color: '#10B981', fontWeight: '600' }}>
                        {formatINR(row.cumulativeInterest)}
                      </td>
                      <td style={{ padding: '8px 14px', fontWeight: '700', color: 'var(--text-main)' }}>
                        {formatINR(row.closingBalance)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Transactions Log (Deposits & Withdrawals) */}
        {activeTab === 'transactions' && (
          <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-glass)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0 }}>
                  <th style={{ padding: '10px 14px' }}>Date</th>
                  <th style={{ padding: '10px 14px' }}>Type</th>
                  <th style={{ padding: '10px 14px' }}>Amount</th>
                  <th style={{ padding: '10px 14px' }}>Notes / Description</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {allEvents.map((evt, idx) => (
                  <tr key={evt.id || idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: '600', color: 'var(--text-main)' }}>
                      {evt.date}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span
                        className="badge"
                        style={{
                          background: evt.type === 'deposit' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: evt.type === 'deposit' ? '#10B981' : '#EF4444',
                          fontWeight: '700',
                          fontSize: '11px'
                        }}
                      >
                        {evt.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: '700', color: evt.type === 'deposit' ? '#10B981' : '#EF4444', fontSize: '13px' }}>
                      {evt.type === 'deposit' ? `+${formatINR(evt.amount)}` : `-${formatINR(evt.amount)}`}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>
                      {evt.notes || '—'}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      {!evt.isInitial ? (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => onDeleteDeposit(evt.id)}
                          style={{ padding: '4px 8px', fontSize: '11px', color: '#EF4444' }}
                          title="Delete this deposit entry"
                        >
                          <Trash2 size={13} />
                        </button>
                      ) : (
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Base Deposit</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            ⚡ <strong>T+1 Banking Schedule:</strong> Interest earned on each day's closing balance is credited into your account the following morning.
          </span>
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

  // Prevent background scrolling while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '850px',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '28px',
          borderRadius: '24px',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          border: '1px solid var(--border-glass)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '24px' }}>🏛️</span>
              <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                Indian Savings Accounts Interest Directory
              </h2>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              Official savings rates and progressive tier breakdowns (Q3-Q4 FY 2026-27).
            </p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close" style={{ padding: '6px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Live Comparison Input with Kuberis Theme & Clean Placeholders */}
        <div
          style={{
            padding: '16px',
            borderRadius: '16px',
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '18px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
              Compare Returns for Deposit Amount:
            </span>
            <div style={{ position: 'relative', width: '150px' }}>
              <span style={{ position: 'absolute', left: '12px', top: '10px', fontSize: '13px', color: 'var(--primary)', fontWeight: '700' }}>
                ₹
              </span>
              <input
                type="number"
                className="form-control"
                style={{ paddingLeft: '28px', fontSize: '14px', fontWeight: '700', height: '38px' }}
                value={compareAmount}
                onChange={e => onCompareAmountChange(e.target.value)}
                placeholder="50000"
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[3000, 25000, 50000, 100000, 500000].map(val => (
              <button
                key={val}
                type="button"
                className="btn btn-secondary"
                onClick={() => onCompareAmountChange(String(val))}
                style={{
                  padding: '5px 10px',
                  fontSize: '11px',
                  fontWeight: compareAmount === String(val) ? '700' : '500',
                  background: compareAmount === String(val) ? 'var(--primary-light)' : 'var(--bg-app)',
                  color: compareAmount === String(val) ? 'var(--primary)' : 'var(--text-muted)',
                  border: compareAmount === String(val) ? '1px solid var(--primary)' : '1px solid var(--border-color)'
                }}
              >
                ₹{val >= 100000 ? `${val / 100000}L` : `${val / 1000}k`}
              </button>
            ))}
          </div>
        </div>

        {/* Banks Cards List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
          {SAVINGS_BANKS_CATALOG.map(bank => {
            const { effectiveAnnualRate, annualInterest, dailyInterest, slabBreakdown } = calculateBankSlabInterest(amount, bank.id);
            const isSlice = bank.id === 'slice';

            return (
              <div
                key={bank.id}
                style={{
                  padding: '16px',
                  borderRadius: '14px',
                  background: 'var(--bg-glass)',
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
                      style={{ fontSize: '11px', padding: '6px 14px' }}
                    >
                      + Select
                    </button>
                  </div>
                </div>

                {/* Slabs breakdown details */}
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '8px' }}>
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
