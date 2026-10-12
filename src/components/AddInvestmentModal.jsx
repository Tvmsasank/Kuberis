import React, { useState, useEffect, useMemo } from 'react';
import { X, TrendingUp, Landmark, Coins, ShieldCheck, Building2, Calendar, Percent, Sparkles, User } from 'lucide-react';
import CustomSelect from './CustomSelect';
import { FD_INSTITUTIONS, matchFdRate, calculateFdAccrued } from '../utils/fdRates';

const INVESTMENT_TYPES = [
  { value: 'stock', label: 'Equity Stock (NSE / BSE)', icon: TrendingUp },
  { value: 'mutual_fund', label: 'Mutual Fund (AMFI NAV)', icon: Landmark },
  { value: 'crypto', label: 'Cryptocurrency (Coins & Tokens)', icon: Coins },
  { value: 'gold', label: 'Gold & Precious Metals', icon: Coins },
  { value: 'fd', label: 'Fixed Deposit (Bank / Post Office / SFB)', icon: ShieldCheck },
  { value: 'other', label: 'Other Asset / Real Estate', icon: Building2 },
];

const POPULAR_SUGGESTIONS = [
  { name: 'Canara Bank (NSE)', symbol: 'CANBK.NS', type: 'stock', defaultPrice: 131.70 },
  { name: 'Reliance (NSE)', symbol: 'RELIANCE.NS', type: 'stock', defaultPrice: 2950 },
  { name: 'BSE Ltd (Exchange)', symbol: 'BSE.NS', type: 'stock', defaultPrice: 2850 },
  { name: 'Delta Corp (BSE)', symbol: 'DELTA.BO', type: 'stock', defaultPrice: 118.50 },
  { name: 'Tata Motors (Commercial)', symbol: 'TMCV.NS', type: 'stock', defaultPrice: 468.90 },
  { name: 'Tata Motors (Passenger)', symbol: 'TMPV.NS', type: 'stock', defaultPrice: 330.20 },
  { name: 'Infosys Ltd', symbol: 'INFY.NS', type: 'stock', defaultPrice: 1820 },
  { name: 'HDFC Bank Ltd', symbol: 'HDFCBANK.NS', type: 'stock', defaultPrice: 1650 },
  { name: 'Bitcoin (BTC)', symbol: 'BTC-INR', type: 'crypto', defaultPrice: 6071000 },
  { name: 'Ethereum (ETH)', symbol: 'ETH-INR', type: 'crypto', defaultPrice: 181700 },
  { name: 'Parag Parikh Flexi Cap Direct Fund', symbol: '122639', type: 'mutual_fund', defaultPrice: 92.83 },
  { name: 'Nippon India Multi Asset Direct Fund', symbol: '148457', type: 'mutual_fund', defaultPrice: 27.22 },
  { name: 'Sovereign Gold Bond (SGB)', symbol: 'SGB', type: 'gold', defaultPrice: 7250 }
];

const FD_PRESETS = [
  { label: 'SBI Amrit Kalash (400D @ 7.10%)', inst: 'sbi', y: 0, m: 0, d: 400, scheme: 'SBI Amrit Kalash' },
  { label: 'SBI Amrit Vrishti (444D @ 7.25%)', inst: 'sbi', y: 0, m: 0, d: 444, scheme: 'SBI Amrit Vrishti' },
  { label: 'Post Office 1Y TD (6.90%)', inst: 'post_office', y: 1, m: 0, d: 0, scheme: '1-Year Time Deposit (TD)' },
  { label: 'Post Office 5Y TD (7.50%)', inst: 'post_office', y: 5, m: 0, d: 0, scheme: '5-Year Time Deposit (80C Tax Saver)' },
  { label: 'Senior Citizen SCSS (8.20%)', inst: 'post_office', y: 5, m: 0, d: 0, scheme: 'Senior Citizen Savings Scheme (SCSS)', isSenior: true },
  { label: 'Unity SFB Special (1001D @ 9.00%)', inst: 'unity_sfb', y: 0, m: 0, d: 1001, scheme: 'Unity 1001 Days Super Scheme' },
  { label: 'HDFC 18M-2Y (7.10%)', inst: 'hdfc', y: 1, m: 6, d: 0, scheme: 'HDFC Regular FD' },
  { label: 'Suryoday SFB 2Y (8.60%)', inst: 'suryoday_sfb', y: 2, m: 0, d: 0, scheme: 'Suryoday 2Y High Yield' }
];

const COMPOUNDING_OPTIONS = [
  { value: 'quarterly', label: 'Quarterly Compounding (Standard Indian Banking)' },
  { value: 'monthly', label: 'Monthly Compounding' },
  { value: 'half_yearly', label: 'Half-Yearly Compounding' },
  { value: 'annually', label: 'Annual Compounding' },
  { value: 'simple', label: 'Simple Interest (Non-Cumulative / Payout)' },
];

export default function AddInvestmentModal({
  isOpen,
  onClose,
  onSave,
  editInvestment = null
}) {
  if (!isOpen) return null;

  const isEditing = !!editInvestment;

  // General Investment State
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [type, setType] = useState('stock');
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Fixed Deposit Dedicated State
  const [fdInstitution, setFdInstitution] = useState('sbi');
  const [fdScheme, setFdScheme] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('100000');
  const [tenureYears, setTenureYears] = useState('1');
  const [tenureMonths, setTenureMonths] = useState('0');
  const [tenureDays, setTenureDays] = useState('0');
  const [interestRate, setInterestRate] = useState('6.80');
  const [isSeniorCitizen, setIsSeniorCitizen] = useState(false);
  const [compoundingFrequency, setCompoundingFrequency] = useState('quarterly');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isRateManuallyEdited, setIsRateManuallyEdited] = useState(false);

  // Institution select options
  const institutionOptions = useMemo(() => {
    return FD_INSTITUTIONS.map(inst => ({
      value: inst.id,
      label: `${inst.logo} ${inst.name}`
    }));
  }, []);

  // Compute total days from permutations
  const computedTotalDays = useMemo(() => {
    const y = Math.max(0, parseInt(tenureYears) || 0);
    const m = Math.max(0, parseInt(tenureMonths) || 0);
    const d = Math.max(0, parseInt(tenureDays) || 0);
    return (y * 365) + (m * 30) + d;
  }, [tenureYears, tenureMonths, tenureDays]);

  // Auto-match rate from directory when institution, tenure or senior status changes
  useEffect(() => {
    if (type !== 'fd') return;
    const match = matchFdRate(fdInstitution, Math.max(1, computedTotalDays), isSeniorCitizen);
    if (!isRateManuallyEdited) {
      setInterestRate(String(match.rate));
    }
    if (!fdScheme || fdScheme === 'Regular Fixed Deposit' || match.isSpecial) {
      setFdScheme(match.schemeName || `${match.institutionName} Fixed Deposit`);
    }
  }, [fdInstitution, computedTotalDays, isSeniorCitizen, type]);

  // Live returns & maturity calculation
  const fdCalculation = useMemo(() => {
    if (type !== 'fd') return null;
    return calculateFdAccrued({
      principal: principalAmount,
      annualRate: interestRate,
      startDate,
      tenureDays: Math.max(1, computedTotalDays),
      frequency: compoundingFrequency
    });
  }, [type, principalAmount, interestRate, startDate, computedTotalDays, compoundingFrequency]);

  useEffect(() => {
    if (editInvestment) {
      setType(editInvestment.type || 'stock');
      setNotes(editInvestment.notes || '');

      if (editInvestment.type === 'fd') {
        setFdInstitution(editInvestment.institutionId || 'sbi');
        setFdScheme(editInvestment.schemeName || editInvestment.name || 'Fixed Deposit');
        setAccountHolder(editInvestment.accountHolder || '');
        setPrincipalAmount(String(editInvestment.principal || editInvestment.buyPrice || '100000'));
        setTenureYears(String(editInvestment.tenureYears ?? 1));
        setTenureMonths(String(editInvestment.tenureMonths ?? 0));
        setTenureDays(String(editInvestment.tenureDays ? (editInvestment.tenureDays % 365) : 0));
        setInterestRate(String(editInvestment.interestRate || '7.00'));
        setIsSeniorCitizen(Boolean(editInvestment.isSeniorCitizen));
        setCompoundingFrequency(editInvestment.compoundingFrequency || 'quarterly');
        setStartDate(editInvestment.startDate || new Date().toISOString().split('T')[0]);
        setIsRateManuallyEdited(true);
      } else {
        setName(editInvestment.name || '');
        setSymbol(editInvestment.symbol || '');
        setQuantity(editInvestment.quantity ? String(editInvestment.quantity) : '1');
        setBuyPrice(editInvestment.buyPrice ? String(editInvestment.buyPrice) : '');
        setCurrentPrice(editInvestment.currentPrice ? String(editInvestment.currentPrice) : '');
      }
    } else {
      setName('');
      setSymbol('');
      setType('stock');
      setQuantity('1');
      setBuyPrice('');
      setCurrentPrice('');
      setNotes('');
      setFdInstitution('sbi');
      setFdScheme('SBI 1-Year Fixed Deposit');
      setAccountHolder('');
      setPrincipalAmount('100000');
      setTenureYears('1');
      setTenureMonths('0');
      setTenureDays('0');
      setInterestRate('6.80');
      setIsSeniorCitizen(false);
      setCompoundingFrequency('quarterly');
      setStartDate(new Date().toISOString().split('T')[0]);
      setIsRateManuallyEdited(false);
    }
    setError('');
  }, [editInvestment, isOpen]);

  const handleSelectSuggestion = (sug) => {
    setName(sug.name);
    setSymbol(sug.symbol);
    setType(sug.type);
    if (!buyPrice) setBuyPrice(String(sug.defaultPrice));
    if (!currentPrice) setCurrentPrice(String(sug.defaultPrice));
  };

  const handleApplyFdPreset = (preset) => {
    setFdInstitution(preset.inst);
    setTenureYears(String(preset.y));
    setTenureMonths(String(preset.m));
    setTenureDays(String(preset.d));
    setFdScheme(preset.scheme);
    if (preset.isSenior !== undefined) {
      setIsSeniorCitizen(preset.isSenior);
    }
    setIsRateManuallyEdited(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (type === 'fd') {
      const principal = Math.abs(parseFloat(principalAmount));
      if (isNaN(principal) || principal <= 0) {
        setError('Please enter a valid deposit principal amount.');
        return;
      }
      if (computedTotalDays <= 0) {
        setError('Tenure must be at least 1 day.');
        return;
      }
      const rate = Math.abs(parseFloat(interestRate));
      if (isNaN(rate) || rate <= 0) {
        setError('Please enter a valid annual interest rate percentage.');
        return;
      }

      const inst = FD_INSTITUTIONS.find(i => i.id === fdInstitution) || FD_INSTITUTIONS[0];
      const finalScheme = fdScheme.trim() || `${inst.shortName} Fixed Deposit`;
      const finalHolder = accountHolder.trim() || 'Primary Account Holder';

      setSaving(true);
      try {
        await onSave({
          ...(isEditing ? { id: editInvestment.id } : {}),
          name: finalScheme,
          symbol: inst.shortName || 'FD',
          type: 'fd',
          institutionId: fdInstitution,
          institutionName: inst.name,
          schemeName: finalScheme,
          accountHolder: finalHolder,
          principal,
          buyPrice: principal,
          quantity: 1,
          currentPrice: fdCalculation?.accruedValuation || principal,
          currentValuation: fdCalculation?.accruedValuation || principal,
          tenureYears: Math.max(0, parseInt(tenureYears) || 0),
          tenureMonths: Math.max(0, parseInt(tenureMonths) || 0),
          tenureDays: computedTotalDays,
          interestRate: rate,
          isSeniorCitizen: Boolean(isSeniorCitizen),
          compoundingFrequency,
          startDate,
          maturityDate: fdCalculation?.maturityDate,
          maturityAmount: fdCalculation?.maturityAmount || principal,
          totalInterest: fdCalculation?.totalInterest || 0,
          notes: notes.trim()
        });
        setSaving(false);
        onClose();
      } catch (err) {
        setSaving(false);
        setError(err.message || 'Failed to save Fixed Deposit holding');
      }
      return;
    }

    // Standard Asset Validation (Stocks, MFs, Crypto, Gold)
    if (!name.trim()) {
      setError('Please enter asset or company name.');
      return;
    }

    const qty = Math.abs(parseFloat(quantity));
    if (isNaN(qty) || qty <= 0) {
      setError('Please enter a valid quantity or units held.');
      return;
    }

    const buy = Math.abs(parseFloat(buyPrice));
    if (isNaN(buy) || buy < 0) {
      setError('Please enter buy price per unit.');
      return;
    }

    const cur = currentPrice ? Math.abs(parseFloat(currentPrice)) : buy;

    setSaving(true);
    try {
      await onSave({
        ...(isEditing ? { id: editInvestment.id } : {}),
        name: name.trim(),
        symbol: symbol.trim(),
        type,
        quantity: qty,
        buyPrice: buy,
        currentPrice: cur,
        notes: notes.trim()
      });
      setSaving(false);
      onClose();
    } catch (err) {
      setSaving(false);
      setError(err.message || 'Failed to save investment holding');
    }
  };

  return (
    <div className="modal-backdrop">
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: type === 'fd' ? '580px' : '520px', width: '100%', boxSizing: 'border-box' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {type === 'fd' ? (
              <ShieldCheck size={20} style={{ color: '#10B981' }} />
            ) : (
              <TrendingUp size={20} style={{ color: 'var(--primary)' }} />
            )}
            <h2>{isEditing ? (type === 'fd' ? 'Edit Fixed Deposit' : 'Edit Investment Holding') : (type === 'fd' ? 'Add Fixed Deposit (FD)' : 'Add Investment Holding')}</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Asset Category Selector */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ fontWeight: '700' }}>Investment Category</label>
            <CustomSelect
              value={type}
              onChange={e => setType(e.target.value)}
              options={INVESTMENT_TYPES}
              size="md"
            />
          </div>

          {/* ========================================================= */}
          {/* FIXED DEPOSIT SPECIFIC FORM FIELDS                        */}
          {/* ========================================================= */}
          {type === 'fd' ? (
            <>
              {/* Quick FD Scheme Presets */}
              {!isEditing && (
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    ⚡ Popular Indian Bank & Govt Schemes
                  </label>
                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px', scrollbarWidth: 'thin' }}>
                    {FD_PRESETS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="pill"
                        style={{
                          fontSize: '11px',
                          whiteSpace: 'nowrap',
                          background: fdScheme === p.scheme ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-app)',
                          borderColor: fdScheme === p.scheme ? '#10B981' : 'var(--border-color)',
                          color: fdScheme === p.scheme ? '#10B981' : 'var(--text-muted)',
                          fontWeight: fdScheme === p.scheme ? '700' : '500'
                        }}
                        onClick={() => handleApplyFdPreset(p)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Institution / Bank & Account Holder */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Issuing Bank / Institution</label>
                  <CustomSelect
                    value={fdInstitution}
                    onChange={e => {
                      setFdInstitution(e.target.value);
                      setIsRateManuallyEdited(false);
                    }}
                    options={institutionOptions}
                    size="md"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Account Holder Name</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="e.g. Self, Spouse, Joint"
                      className="form-control"
                      value={accountHolder}
                      onChange={e => setAccountHolder(e.target.value)}
                      required
                    />
                    <User size={15} style={{ position: 'absolute', right: '12px', top: '12px', color: 'var(--text-muted)' }} />
                  </div>
                </div>
              </div>

              {/* Scheme / Deposit Name */}
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Deposit / Scheme Name</label>
                <input
                  type="text"
                  placeholder="e.g. SBI Amrit Kalash 400 Days, Post Office 5-Year TD"
                  className="form-control"
                  value={fdScheme}
                  onChange={e => setFdScheme(e.target.value)}
                  required
                />
              </div>

              {/* Principal Amount & Booking Date */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Principal Deposit (₹)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 100000"
                    className="form-control"
                    value={principalAmount}
                    onChange={e => setPrincipalAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Deposit / Booking Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Tenure Permutations: Years, Months, Days */}
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    Tenure Duration (Permutations)
                  </label>
                  <span style={{ fontSize: '11px', color: '#10B981', fontWeight: '700' }}>
                    Total: {computedTotalDays} Days ({((computedTotalDays) / 365).toFixed(2)} Yrs)
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Years</label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      className="form-control"
                      value={tenureYears}
                      onChange={e => setTenureYears(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Months</label>
                    <input
                      type="number"
                      min="0"
                      max="11"
                      className="form-control"
                      value={tenureMonths}
                      onChange={e => setTenureMonths(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Days</label>
                    <input
                      type="number"
                      min="0"
                      max="365"
                      className="form-control"
                      value={tenureDays}
                      onChange={e => setTenureDays(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Quick Tenure Pills */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {[
                    { label: '400 Days', y: 0, m: 0, d: 400 },
                    { label: '444 Days', y: 0, m: 0, d: 444 },
                    { label: '1 Year', y: 1, m: 0, d: 0 },
                    { label: '2 Years', y: 2, m: 0, d: 0 },
                    { label: '3 Years', y: 3, m: 0, d: 0 },
                    { label: '5 Years', y: 5, m: 0, d: 0 },
                    { label: '1001 Days', y: 0, m: 0, d: 1001 }
                  ].map((pill, i) => (
                    <button
                      key={i}
                      type="button"
                      className="pill"
                      style={{ fontSize: '11px', padding: '3px 8px' }}
                      onClick={() => {
                        setTenureYears(String(pill.y));
                        setTenureMonths(String(pill.m));
                        setTenureDays(String(pill.d));
                        setIsRateManuallyEdited(false);
                      }}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interest Rate & Senior Citizen Booster */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label" style={{ marginBottom: '4px' }}>Interest Rate (% p.a.)</label>
                    {!isRateManuallyEdited && (
                      <span style={{ fontSize: '10px', color: '#10B981', fontWeight: '700' }}>
                        ● Live Auto-Matched
                      </span>
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 7.10"
                      className="form-control"
                      value={interestRate}
                      onChange={e => {
                        setInterestRate(e.target.value);
                        setIsRateManuallyEdited(true);
                      }}
                      required
                    />
                    <Percent size={14} style={{ position: 'absolute', right: '12px', top: '12px', color: 'var(--text-muted)' }} />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ marginBottom: '4px' }}>Compounding Frequency</label>
                  <CustomSelect
                    value={compoundingFrequency}
                    onChange={e => setCompoundingFrequency(e.target.value)}
                    options={COMPOUNDING_OPTIONS}
                    size="md"
                  />
                </div>
              </div>

              {/* Senior Citizen Checkbox Toggle */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                  borderRadius: '12px',
                  marginBottom: '16px',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setIsSeniorCitizen(!isSeniorCitizen);
                  setIsRateManuallyEdited(false);
                }}
              >
                <input
                  type="checkbox"
                  id="seniorToggle"
                  checked={isSeniorCitizen}
                  onChange={e => {
                    setIsSeniorCitizen(e.target.checked);
                    setIsRateManuallyEdited(false);
                  }}
                  style={{ width: '16px', height: '16px', accentColor: '#38BDF8', cursor: 'pointer' }}
                />
                <label htmlFor="seniorToggle" style={{ fontSize: '12.5px', color: 'var(--text-main)', cursor: 'pointer', margin: 0, flex: 1 }}>
                  Senior Citizen Beneficiary (+0.50% to +0.75% Premium Yield)
                </label>
                <Sparkles size={16} style={{ color: '#38BDF8' }} />
              </div>

              {/* 🎯 Real-Time Return Calculation Card */}
              {fdCalculation && (
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(56, 189, 248, 0.08) 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    marginBottom: '16px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#10B981', fontWeight: '800' }}>
                      Maturity & Return Projection
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Maturity Date: <strong style={{ color: 'var(--text-main)' }}>{fdCalculation.maturityDate}</strong>
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Maturity Amount</div>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: '#10B981' }}>
                        ₹{Number(fdCalculation.maturityAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Interest</div>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: '#38BDF8' }}>
                        +₹{Number(fdCalculation.totalInterest).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Accrued Value (Today)</div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>
                        ₹{Number(fdCalculation.accruedValuation).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <span style={{ fontSize: '10px', color: '#10B981' }}>
                        (+₹{Number(fdCalculation.accruedInterest).toLocaleString('en-IN')})
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* ========================================================= */
            /* STANDARD ASSET FIELDS (EQUITY / MF / CRYPTO / GOLD)       */
            /* ========================================================= */
            <>
              {/* Quick Preset Selector for Stocks/Crypto */}
              {!isEditing && (
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Quick Select Popular Assets</label>
                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px', scrollbarWidth: 'thin' }}>
                    {POPULAR_SUGGESTIONS.map(s => (
                      <button
                        key={s.symbol}
                        type="button"
                        className="pill"
                        style={{
                          fontSize: '11px',
                          whiteSpace: 'nowrap',
                          background: symbol === s.symbol ? 'var(--primary-light)' : 'var(--bg-app)',
                          borderColor: symbol === s.symbol ? 'var(--primary)' : 'var(--border-color)',
                          color: symbol === s.symbol ? 'var(--primary)' : 'var(--text-muted)'
                        }}
                        onClick={() => handleSelectSuggestion(s)}
                      >
                        {s.name.split(' ')[0]} ({s.symbol})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Name & Ticker */}
              <div className="settings-grid-2">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Asset Name</label>
                  <input
                    type="text"
                    placeholder={type === 'crypto' ? 'e.g. Bitcoin, Ethereum' : 'e.g. Reliance, Parag Parikh Flexi Cap'}
                    className="form-control"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Ticker Symbol / Code</label>
                  <input
                    type="text"
                    placeholder={type === 'crypto' ? 'e.g. BTC, ETH, SOL' : 'e.g. RELIANCE.NS, DELTA.BO, BSE:500325, 122639'}
                    className="form-control"
                    value={symbol}
                    onChange={e => setSymbol(e.target.value)}
                  />
                </div>
              </div>

              {/* Quantity & Buy Price */}
              <div className="settings-grid-2" style={{ marginTop: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Units / Quantity Held</label>
                  <input
                    type="number"
                    step="any"
                    placeholder={type === 'crypto' ? 'e.g. 0.05 or 100' : 'e.g. 10'}
                    className="form-control"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Avg Buy Price per Unit (₹)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 1500"
                    className="form-control"
                    value={buyPrice}
                    onChange={e => setBuyPrice(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Current Manual Price (Optional Override) */}
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label">Current Market Price (Optional Manual Override)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="Leave blank to auto-fetch live price via NSE / AMFI / Coin Tickers"
                  className="form-control"
                  value={currentPrice}
                  onChange={e => setCurrentPrice(e.target.value)}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  💡 Live market prices and mutual fund NAVs automatically refresh every 3 seconds!
                </span>
              </div>
            </>
          )}

          {/* Notes (Common) */}
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label">Portfolio Notes (Optional)</label>
            <input
              type="text"
              placeholder={type === 'fd' ? 'e.g. Certificate No. 492048, Nominee: Spouse, Auto-renewal: OFF' : 'e.g. Long-term holding, Zerodha / Groww / Binance'}
              className="form-control"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : isEditing ? (type === 'fd' ? 'Update Fixed Deposit' : 'Update Holding') : (type === 'fd' ? 'Add Fixed Deposit' : 'Add Holding')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

