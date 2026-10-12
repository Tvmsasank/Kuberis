import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  TrendingUp,
  Landmark,
  Coins,
  ShieldCheck,
  Building2,
  Calendar,
  Percent,
  Sparkles,
  User,
  Info,
  CheckCircle2,
  Award
} from 'lucide-react';
import CustomSelect from './CustomSelect';
import {
  FD_INSTITUTIONS,
  getBankTenures,
  getBankRules,
  matchFdRate,
  calculateFdAccrued
} from '../utils/fdRates';

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

const PRINCIPAL_PRESETS = [25000, 50000, 100000, 200000, 500000, 1000000];

const COMPOUNDING_OPTIONS = [
  { value: 'quarterly', label: 'Quarterly Compounding (Standard Indian Banking)' },
  { value: 'monthly', label: 'Monthly Compounding' },
  { value: 'half_yearly', label: 'Half-Yearly Compounding' },
  { value: 'annually', label: 'Annual Compounding (Post Office Payout)' },
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
  const [fdInstitution, setFdInstitution] = useState('post_office');
  const [fdScheme, setFdScheme] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('100000');
  const [tenureYears, setTenureYears] = useState('1');
  const [tenureMonths, setTenureMonths] = useState('0');
  const [tenureDays, setTenureDays] = useState('0');
  const [selectedTenureLabel, setSelectedTenureLabel] = useState('');
  const [interestRate, setInterestRate] = useState('6.90');
  const [isSeniorCitizen, setIsSeniorCitizen] = useState(false);
  const [compoundingFrequency, setCompoundingFrequency] = useState('annually');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isRateManuallyEdited, setIsRateManuallyEdited] = useState(false);
  const [showCustomTenure, setShowCustomTenure] = useState(false);

  // Institution object, tenures & rules
  const selectedBank = useMemo(() => {
    return FD_INSTITUTIONS.find(i => i.id === fdInstitution) || FD_INSTITUTIONS[0];
  }, [fdInstitution]);

  const bankOfficialTenures = useMemo(() => {
    return getBankTenures(fdInstitution);
  }, [fdInstitution]);

  const bankRules = useMemo(() => {
    return getBankRules(fdInstitution);
  }, [fdInstitution]);

  // Institution options for CustomSelect with search
  const institutionOptions = useMemo(() => {
    return FD_INSTITUTIONS.map(inst => ({
      value: inst.id,
      label: `${inst.logo} ${inst.name}`,
      subtitle: inst.category === 'govt' ? 'Govt of India' : inst.category === 'public' ? 'Public Sector Bank' : inst.category === 'sfb' ? 'Small Finance Bank (High Yield)' : 'Private Scheduled Bank'
    }));
  }, []);

  // Compute total days from permutations
  const computedTotalDays = useMemo(() => {
    const y = Math.max(0, parseInt(tenureYears) || 0);
    const m = Math.max(0, parseInt(tenureMonths) || 0);
    const d = Math.max(0, parseInt(tenureDays) || 0);
    return (y * 365) + (m * 30) + d;
  }, [tenureYears, tenureMonths, tenureDays]);

  // Handle bank switch: auto-select bank's primary official tenure & rules
  const handleBankChange = (newBankId) => {
    setFdInstitution(newBankId);
    setIsRateManuallyEdited(false);
    setShowCustomTenure(false);

    const newBank = FD_INSTITUTIONS.find(i => i.id === newBankId) || FD_INSTITUTIONS[0];
    const rules = newBank.rules || {};
    if (rules.compoundingFrequency) {
      setCompoundingFrequency(rules.compoundingFrequency);
    }

    const tenures = newBank.officialTenures || [];
    if (tenures.length > 0) {
      const first = tenures[0];
      setSelectedTenureLabel(first.label);
      setTenureYears(String(first.years));
      setTenureMonths(String(first.months));
      setTenureDays(String(first.days));
      setInterestRate(String(isSeniorCitizen ? first.seniorRate : first.regularRate));
      setFdScheme(first.schemeName || `${newBank.shortName} Fixed Deposit`);
    } else {
      setSelectedTenureLabel('');
      setTenureYears('1');
      setTenureMonths('0');
      setTenureDays('0');
      setInterestRate('7.00');
      setFdScheme(`${newBank.shortName} Fixed Deposit`);
    }
  };

  // Handle selecting an official tenure card
  const handleSelectTenureCard = (tenure) => {
    setSelectedTenureLabel(tenure.label);
    setTenureYears(String(tenure.years));
    setTenureMonths(String(tenure.months));
    setTenureDays(String(tenure.days));
    setShowCustomTenure(false);
    setIsRateManuallyEdited(false);

    const rate = isSeniorCitizen ? tenure.seniorRate : tenure.regularRate;
    setInterestRate(String(rate));
    setFdScheme(tenure.schemeName || `${selectedBank.shortName} ${tenure.label}`);
  };

  // Auto-sync rate when senior citizen toggle changes
  useEffect(() => {
    if (type !== 'fd' || isRateManuallyEdited) return;
    const match = matchFdRate(fdInstitution, Math.max(1, computedTotalDays), isSeniorCitizen);
    setInterestRate(String(match.rate));
  }, [isSeniorCitizen, fdInstitution, computedTotalDays, type, isRateManuallyEdited]);

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

  // Initial populate for Edit or Add
  useEffect(() => {
    if (editInvestment) {
      setType(editInvestment.type || 'stock');
      setNotes(editInvestment.notes || '');

      if (editInvestment.type === 'fd') {
        const instId = editInvestment.institutionId || 'post_office';
        setFdInstitution(instId);
        setFdScheme(editInvestment.schemeName || editInvestment.name || 'Fixed Deposit');
        setAccountHolder(editInvestment.accountHolder || '');
        setPrincipalAmount(String(editInvestment.principal || editInvestment.buyPrice || '100000'));
        setTenureYears(String(editInvestment.tenureYears ?? 1));
        setTenureMonths(String(editInvestment.tenureMonths ?? 0));
        setTenureDays(String(editInvestment.tenureDays ? (editInvestment.tenureDays % 365) : 0));
        setInterestRate(String(editInvestment.interestRate || '6.90'));
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
      // Default FD initial state: India Post 1-Year Time Deposit
      setFdInstitution('post_office');
      setFdScheme('Post Office 1-Year Time Deposit (POTD)');
      setAccountHolder('');
      setPrincipalAmount('100000');
      setTenureYears('1');
      setTenureMonths('0');
      setTenureDays('0');
      setSelectedTenureLabel('1 Year (6.90%)');
      setInterestRate('6.90');
      setIsSeniorCitizen(false);
      setCompoundingFrequency('annually');
      setStartDate(new Date().toISOString().split('T')[0]);
      setIsRateManuallyEdited(false);
      setShowCustomTenure(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (type === 'fd') {
      const principal = Math.abs(parseFloat(principalAmount));
      if (isNaN(principal) || principal <= 0) {
        setError('Please enter a valid deposit principal amount.');
        return;
      }
      if (bankRules.minDeposit && principal < bankRules.minDeposit) {
        setError(`Minimum deposit for ${selectedBank.name} is ₹${bankRules.minDeposit.toLocaleString('en-IN')}.`);
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

      const finalScheme = fdScheme.trim() || `${selectedBank.shortName} Fixed Deposit`;
      const finalHolder = accountHolder.trim() || 'Primary Account Holder';

      setSaving(true);
      try {
        await onSave({
          ...(isEditing ? { id: editInvestment.id } : {}),
          name: finalScheme,
          symbol: selectedBank.shortName || 'FD',
          type: 'fd',
          institutionId: fdInstitution,
          institutionName: selectedBank.name,
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
        style={{
          maxWidth: type === 'fd' ? '880px' : '520px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          padding: '24px',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div className="modal-header" style={{ marginBottom: '16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {type === 'fd' ? (
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={20} style={{ color: '#10B981' }} />
              </div>
            ) : (
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={20} style={{ color: 'var(--primary)' }} />
              </div>
            )}
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
                {isEditing ? (type === 'fd' ? 'Edit Fixed Deposit' : 'Edit Investment Holding') : (type === 'fd' ? 'Add Fixed Deposit (FD / Govt Scheme)' : 'Add Investment Holding')}
              </h2>
              {type === 'fd' && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Authoritative Q3 FY 2026-27 Indian Banking & Post Office Rates Directory
                </div>
              )}
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '14px', fontSize: '13px', flexShrink: 0 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {/* Scrollable Form Body */}
          <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
            {/* Category Selector */}
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontWeight: '700', fontSize: '12px' }}>Investment Category</label>
              <CustomSelect
                value={type}
                onChange={e => setType(e.target.value)}
                options={INVESTMENT_TYPES}
                size="md"
                searchable={false}
              />
            </div>

            {/* ========================================================================= */}
            {/* 🏦 FIXED DEPOSIT: HORIZONTAL 2-COLUMN SPLIT LAYOUT                        */}
            {/* ========================================================================= */}
            {type === 'fd' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', alignItems: 'start' }}>
                {/* ⬅️ LEFT COLUMN: DEPOSIT DETAILS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Bank / Institution Selector with In-Dropdown Search */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>Issuing Bank / Institution</label>
                      <span style={{ fontSize: '10px', color: '#10B981', fontWeight: '700' }}>Searchable</span>
                    </div>
                    <CustomSelect
                      value={fdInstitution}
                      onChange={e => handleBankChange(e.target.value)}
                      options={institutionOptions}
                      size="md"
                      searchable={true}
                    />
                  </div>

                  {/* Scheme / Deposit Name */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ marginBottom: '4px' }}>Deposit / Scheme Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Post Office 1-Year Time Deposit (POTD)"
                      className="form-control"
                      value={fdScheme}
                      onChange={e => setFdScheme(e.target.value)}
                      required
                    />
                  </div>

                  {/* Account Holder Name */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ marginBottom: '4px' }}>Account Holder Name</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="e.g. Arjun Sharma, Joint, Self"
                        className="form-control"
                        value={accountHolder}
                        onChange={e => setAccountHolder(e.target.value)}
                        required
                      />
                      <User size={15} style={{ position: 'absolute', right: '12px', top: '12px', color: 'var(--text-muted)' }} />
                    </div>
                  </div>

                  {/* Principal Amount & Quick Presets */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>Principal Deposit (₹)</label>
                      {bankRules.minDeposit && (
                        <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                          Min: ₹{bankRules.minDeposit.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 100000"
                      className="form-control"
                      value={principalAmount}
                      onChange={e => setPrincipalAmount(e.target.value)}
                      required
                    />
                    {/* Amount Quick Pills */}
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '6px' }}>
                      {PRINCIPAL_PRESETS.map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          className="pill"
                          style={{
                            fontSize: '10.5px',
                            padding: '3px 8px',
                            background: String(principalAmount) === String(amt) ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-app)',
                            borderColor: String(principalAmount) === String(amt) ? '#10B981' : 'var(--border-color)',
                            color: String(principalAmount) === String(amt) ? '#10B981' : 'var(--text-muted)'
                          }}
                          onClick={() => setPrincipalAmount(String(amt))}
                        >
                          ₹{amt >= 100000 ? `${amt / 100000}L` : `${amt / 1000}K`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Booking Date */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ marginBottom: '4px' }}>Booking / Deposit Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      required
                    />
                  </div>

                  {/* Compounding Frequency */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ marginBottom: '4px' }}>Compounding Frequency</label>
                    <CustomSelect
                      value={compoundingFrequency}
                      onChange={e => setCompoundingFrequency(e.target.value)}
                      options={COMPOUNDING_OPTIONS}
                      size="md"
                      searchable={false}
                    />
                  </div>

                  {/* Portfolio Notes */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ marginBottom: '4px' }}>Notes / Certificate No. (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Receipt No. 849204, Auto-renewal: OFF"
                      className="form-control"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                    />
                  </div>
                </div>

                {/* ➡️ RIGHT COLUMN: DYNAMIC BANK TENURES & RETURNS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Dynamic Official Bank Tenures */}
                  <div
                    style={{
                      padding: '14px',
                      borderRadius: '16px',
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{selectedBank.logo}</span>
                          <span>{selectedBank.shortName} Official Slabs & Rates</span>
                        </div>
                        {bankRules.seniorNote && (
                          <div style={{ fontSize: '10.5px', color: '#38BDF8', marginTop: '2px' }}>
                            ⓘ {bankRules.seniorNote}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: '#10B981', fontWeight: '700' }}>
                        {computedTotalDays} Days ({((computedTotalDays) / 365).toFixed(2)} Y)
                      </span>
                    </div>

                    {/* Official Tenure Cards Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', marginBottom: '10px' }}>
                      {bankOfficialTenures.map((t, idx) => {
                        const isSelected = selectedTenureLabel === t.label;
                        const rate = isSeniorCitizen ? t.seniorRate : t.regularRate;

                        return (
                          <div
                            key={idx}
                            onClick={() => handleSelectTenureCard(t)}
                            style={{
                              padding: '10px 12px',
                              borderRadius: '12px',
                              cursor: 'pointer',
                              border: isSelected ? '1.5px solid #10B981' : '1px solid var(--border-color)',
                              background: isSelected
                                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.16) 0%, rgba(56, 189, 248, 0.08) 100%)'
                                : 'var(--bg-card)',
                              boxShadow: isSelected ? '0 4px 16px rgba(16, 185, 129, 0.18)' : 'none',
                              transition: 'all 0.15s ease',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px' }}>
                              <span style={{ fontSize: '12px', fontWeight: '800', color: isSelected ? '#10B981' : 'var(--text-main)' }}>
                                {t.label.split('(')[0].trim()}
                              </span>
                              {isSelected && <CheckCircle2 size={13} style={{ color: '#10B981', flexShrink: 0 }} />}
                            </div>

                            <div style={{ marginTop: '6px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '14px', fontWeight: '800', color: isSelected ? '#10B981' : '#38BDF8' }}>
                                {rate.toFixed(2)}%
                              </span>
                              {t.badge && (
                                <span style={{ fontSize: '9.5px', padding: '1px 5px', borderRadius: '4px', background: isSelected ? 'rgba(16, 185, 129, 0.25)' : 'rgba(56, 189, 248, 0.15)', color: isSelected ? '#10B981' : '#38BDF8', fontWeight: '700' }}>
                                  {t.badge.split(' ')[0]}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Custom Tenure Toggle (Only for banks that allow non-standard tenures) */}
                    {!selectedBank.strictTenuresOnly && (
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => setShowCustomTenure(!showCustomTenure)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: showCustomTenure ? 'var(--primary)' : 'var(--text-muted)',
                              fontSize: '11px',
                              cursor: 'pointer',
                              padding: 0,
                              fontWeight: '600'
                            }}
                          >
                            {showCustomTenure ? '▲ Hide Custom Days' : '▼ Custom Tenure Permutation (Days/Months)'}
                          </button>
                        </div>

                        {showCustomTenure && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '8px' }}>
                            <div>
                              <label style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'block' }}>Years</label>
                              <input
                                type="number"
                                min="0"
                                max="30"
                                className="form-control"
                                value={tenureYears}
                                onChange={e => {
                                  setTenureYears(e.target.value);
                                  setSelectedTenureLabel('');
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'block' }}>Months</label>
                              <input
                                type="number"
                                min="0"
                                max="11"
                                className="form-control"
                                value={tenureMonths}
                                onChange={e => {
                                  setTenureMonths(e.target.value);
                                  setSelectedTenureLabel('');
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'block' }}>Days</label>
                              <input
                                type="number"
                                min="0"
                                max="365"
                                className="form-control"
                                value={tenureDays}
                                onChange={e => {
                                  setTenureDays(e.target.value);
                                  setSelectedTenureLabel('');
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Senior Citizen Toggle */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: isSeniorCitizen ? 'rgba(56, 189, 248, 0.14)' : 'var(--bg-app)',
                      border: isSeniorCitizen ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid var(--border-color)',
                      cursor: bankRules.isSeniorRatesSame ? 'default' : 'pointer'
                    }}
                    onClick={() => {
                      if (!bankRules.isSeniorRatesSame) setIsSeniorCitizen(!isSeniorCitizen);
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        id="seniorCitizenToggle"
                        checked={isSeniorCitizen}
                        disabled={bankRules.isSeniorRatesSame}
                        onChange={e => setIsSeniorCitizen(e.target.checked)}
                        style={{ accentColor: '#38BDF8', width: '15px', height: '15px', cursor: bankRules.isSeniorRatesSame ? 'default' : 'pointer' }}
                      />
                      <label htmlFor="seniorCitizenToggle" style={{ fontSize: '11.5px', color: 'var(--text-main)', cursor: bankRules.isSeniorRatesSame ? 'default' : 'pointer', margin: 0, fontWeight: '700' }}>
                        {bankRules.isSeniorRatesSame
                          ? 'Senior Citizen (General & Senior Rates Identical on TD; Opt SCSS for 8.20%)'
                          : `Senior Citizen (+${(bankRules.seniorAdditionalRate || 0.5).toFixed(2)}% Extra Yield)`}
                      </label>
                    </div>
                    {!bankRules.isSeniorRatesSame && (
                      <span style={{ fontSize: '11px', color: '#38BDF8', fontWeight: '800' }}>
                        +{bankRules.seniorAdditionalRate || 0.5}%
                      </span>
                    )}
                  </div>

                  {/* Annual Interest Rate with Prominent Label */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label className="form-label" style={{ margin: 0, fontSize: '12px', fontWeight: '700' }}>
                        Annual Interest Rate (% p.a.)
                      </label>
                      <span style={{ fontSize: '10.5px', color: isRateManuallyEdited ? '#F59E0B' : '#10B981', fontWeight: '700' }}>
                        {isRateManuallyEdited ? '● Custom Override' : '● Official Bank Rate'}
                      </span>
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
                        style={{ paddingRight: '32px', fontSize: '13.5px', fontWeight: '800' }}
                        required
                      />
                      <Percent size={14} style={{ position: 'absolute', right: '12px', top: '12px', color: 'var(--text-muted)' }} />
                    </div>
                  </div>

                  {/* 🎯 Real-Time Return Projection Card */}
                  {fdCalculation && (
                    <div
                      style={{
                        padding: '14px 16px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(56, 189, 248, 0.08) 100%)',
                        border: '1px solid rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#10B981', fontWeight: '800' }}>
                          Maturity & Yield Projection
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Maturity: <strong style={{ color: 'var(--text-main)' }}>{fdCalculation.maturityDate}</strong>
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        <div>
                          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Maturity Amount</div>
                          <div style={{ fontSize: '15.5px', fontWeight: '800', color: '#10B981' }}>
                            ₹{Number(fdCalculation.maturityAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Total Interest</div>
                          <div style={{ fontSize: '15.5px', fontWeight: '800', color: '#38BDF8' }}>
                            +₹{Number(fdCalculation.totalInterest).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Accrued Today</div>
                          <div style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-main)' }}>
                            ₹{Number(fdCalculation.accruedValuation).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                          <span style={{ fontSize: '9.5px', color: '#10B981', fontWeight: '700' }}>
                            (+₹{Number(fdCalculation.accruedInterest).toLocaleString('en-IN')})
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* ========================================================================= */
              /* STANDARD ASSET FIELDS (EQUITY / MF / CRYPTO / GOLD)                       */
              /* ========================================================================= */
              <>
                {!isEditing && (
                  <div className="form-group" style={{ marginBottom: '14px' }}>
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

                <div className="settings-grid-2" style={{ marginTop: '14px' }}>
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

                <div className="form-group" style={{ marginTop: '14px' }}>
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

                <div className="form-group" style={{ marginTop: '14px' }}>
                  <label className="form-label">Portfolio Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Long-term holding, Zerodha / Groww / Binance"
                    className="form-control"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          {/* Modal Footer Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid var(--border-color)', marginTop: '14px', flexShrink: 0 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : isEditing ? (type === 'fd' ? 'Update Fixed Deposit' : 'Update Holding') : (type === 'fd' ? 'Book Fixed Deposit' : 'Add Holding')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
