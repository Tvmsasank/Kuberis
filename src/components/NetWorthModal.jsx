import React, { useState, useEffect } from 'react';
import {
  X,
  Wallet,
  TrendingUp,
  Landmark,
  Plus,
  Trash2,
  PieChart,
  ShieldCheck,
  Building2,
  Sparkles,
  CreditCard,
  Home,
  CheckCircle2,
  HelpCircle,
  Edit2,
  FileText,
  Check,
  Car,
  Coins,
  ArrowUpRight,
  AlertCircle,
  Info,
  StickyNote,
  RotateCcw
} from 'lucide-react';
import { calculateDynamicNetWorth } from '../utils/netWorth';
import CustomSelect from './CustomSelect';

const ASSET_CATEGORIES = [
  { value: 'real_estate', label: 'Real Estate / Property', icon: Building2 },
  { value: 'vehicle', label: 'Vehicles / Automobiles', icon: Car },
  { value: 'cash_bank', label: 'Cash & Bank Balances', icon: Landmark },
  { value: 'gold_jewelry', label: 'Physical Gold / Jewelry', icon: Coins },
  { value: 'retirement', label: 'EPF / PPF / NPS / PF', icon: ShieldCheck },
  { value: 'business', label: 'Business / Private Equity', icon: TrendingUp },
  { value: 'receivable', label: 'Loan Given / Receivable', icon: ArrowUpRight },
  { value: 'other_asset', label: 'Other Asset', icon: Wallet },
];

const LIABILITY_CATEGORIES = [
  { value: 'home_loan', label: 'Home Loan / Mortgage', icon: Home },
  { value: 'car_loan', label: 'Vehicle / Auto Loan', icon: Car },
  { value: 'personal_loan', label: 'Personal Loan', icon: CreditCard },
  { value: 'education_loan', label: 'Education Loan', icon: Landmark },
  { value: 'credit_card', label: 'Credit Card Outstanding', icon: CreditCard },
  { value: 'borrowed_personal', label: 'Borrowed from Family / Friend', icon: Wallet },
  { value: 'business_debt', label: 'Business Debt / Overdraft', icon: AlertCircle },
  { value: 'other_liability', label: 'Other Debt / Liability', icon: CreditCard },
];

export default function NetWorthModal({
  isOpen,
  onClose,
  investments = [],
  settings = {},
  onSaveSettings,
  isPrivacyMode = false
}) {
  // New Asset Form State
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetCategory, setNewAssetCategory] = useState('real_estate');
  const [newAssetVal, setNewAssetVal] = useState('');
  const [newAssetDesc, setNewAssetDesc] = useState('');

  // New Liability Form State
  const [newLiabilityName, setNewLiabilityName] = useState('');
  const [newLiabilityCategory, setNewLiabilityCategory] = useState('home_loan');
  const [newLiabilityVal, setNewLiabilityVal] = useState('');
  const [newLiabilityDesc, setNewLiabilityDesc] = useState('');

  // Editing state for an existing item
  const [editingItem, setEditingItem] = useState(null); // { type: 'asset' | 'liability', id, name, category, value, description }

  const [saveMsg, setSaveMsg] = useState('');

  // Prevent background page scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setEditingItem(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const formatInr = (num) =>
    isPrivacyMode
      ? '₹••••••••'
      : '₹' +
        Number(num || 0).toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });

  // Calculate dynamic metrics using unified helper
  const {
    liveInvestmentsValuation,
    manualAssets,
    customAssetsList,
    customAssetsTotal,
    additionalAssetsTotal,
    totalAssets,
    manualLiabilities,
    customLiabilitiesList,
    customLiabilitiesTotal,
    totalLiabilities,
    netWorth
  } = calculateDynamicNetWorth(investments, settings);

  // Breakdown per investment asset class
  const safeInvestments = Array.isArray(investments) ? investments : [];
  const stockVal = safeInvestments.filter(i => i.type === 'stock').reduce((s, i) => s + (Number(i.currentValuation) || 0), 0);
  const usStockVal = safeInvestments.filter(i => i.type === 'us_stock').reduce((s, i) => s + (Number(i.currentValuation) || 0), 0);
  const cryptoVal = safeInvestments.filter(i => i.type === 'crypto').reduce((s, i) => s + (Number(i.currentValuation) || 0), 0);
  const mfVal = safeInvestments.filter(i => i.type === 'mutual_fund').reduce((s, i) => s + (Number(i.currentValuation) || 0), 0);
  const goldVal = safeInvestments.filter(i => i.type === 'gold').reduce((s, i) => s + (Number(i.currentValuation) || 0), 0);
  const fdVal = safeInvestments.filter(i => i.type === 'fd' || i.type === 'other').reduce((s, i) => s + (Number(i.currentValuation) || 0), 0);

  // 1. ADD ASSET HANDLER
  const handleAddAsset = (e) => {
    e.preventDefault();
    if (!newAssetName.trim() || !newAssetVal || Number(newAssetVal) <= 0) return;
    const item = {
      id: 'asset_' + Date.now().toString(),
      name: newAssetName.trim(),
      category: newAssetCategory,
      description: newAssetDesc.trim(),
      value: Number(newAssetVal),
      createdAt: new Date().toISOString()
    };
    const updatedAssets = [...customAssetsList, item];
    const updatedAssetsTotal = updatedAssets.reduce((s, a) => s + Number(a.value || 0), 0);

    onSaveSettings({
      ...settings,
      customAssetsList: updatedAssets,
      manualAssets: updatedAssetsTotal,
      assets: liveInvestmentsValuation + updatedAssetsTotal,
      netWorthConfigured: true
    });

    setNewAssetName('');
    setNewAssetVal('');
    setNewAssetDesc('');
    setSaveMsg('Asset with notes saved & synced live!');
    setTimeout(() => setSaveMsg(''), 2500);
  };

  // 2. DELETE ASSET HANDLER
  const handleDeleteAsset = (id) => {
    const updatedAssets = customAssetsList.filter(a => a.id !== id);
    const updatedAssetsTotal = updatedAssets.reduce((s, a) => s + Number(a.value || 0), 0);

    onSaveSettings({
      ...settings,
      customAssetsList: updatedAssets,
      manualAssets: updatedAssetsTotal,
      assets: liveInvestmentsValuation + updatedAssetsTotal,
      netWorthConfigured: true
    });
    setSaveMsg('Asset removed!');
    setTimeout(() => setSaveMsg(''), 2500);
  };

  // 3. ADD LIABILITY HANDLER
  const handleAddLiability = (e) => {
    e.preventDefault();
    if (!newLiabilityName.trim() || !newLiabilityVal || Number(newLiabilityVal) <= 0) return;
    const item = {
      id: 'liab_' + Date.now().toString(),
      name: newLiabilityName.trim(),
      category: newLiabilityCategory,
      description: newLiabilityDesc.trim(),
      value: Number(newLiabilityVal),
      createdAt: new Date().toISOString()
    };
    const updatedLiabilities = [...customLiabilitiesList, item];
    const updatedLiabilitiesTotal = updatedLiabilities.reduce((s, l) => s + Number(l.value || 0), 0);

    onSaveSettings({
      ...settings,
      customLiabilitiesList: updatedLiabilities,
      manualLiabilities: updatedLiabilitiesTotal,
      liabilities: updatedLiabilitiesTotal,
      netWorthConfigured: true
    });

    setNewLiabilityName('');
    setNewLiabilityVal('');
    setNewLiabilityDesc('');
    setSaveMsg('Liability with notes saved & synced live!');
    setTimeout(() => setSaveMsg(''), 2500);
  };

  // 4. DELETE LIABILITY HANDLER
  const handleDeleteLiability = (id) => {
    const updatedLiabilities = customLiabilitiesList.filter(l => l.id !== id);
    const updatedLiabilitiesTotal = updatedLiabilities.reduce((s, l) => s + Number(l.value || 0), 0);

    onSaveSettings({
      ...settings,
      customLiabilitiesList: updatedLiabilities,
      manualLiabilities: updatedLiabilitiesTotal,
      liabilities: updatedLiabilitiesTotal,
      netWorthConfigured: true
    });
    setSaveMsg('Liability removed!');
    setTimeout(() => setSaveMsg(''), 2500);
  };

  // 5. INLINE EDIT HANDLER (SAVE)
  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingItem) return;
    const numVal = Number(editingItem.value);
    if (!editingItem.name.trim() || isNaN(numVal) || numVal <= 0) return;

    if (editingItem.type === 'asset') {
      const updated = customAssetsList.map(a =>
        a.id === editingItem.id
          ? {
              ...a,
              name: editingItem.name.trim(),
              category: editingItem.category,
              description: (editingItem.description || '').trim(),
              value: numVal,
              updatedAt: new Date().toISOString()
            }
          : a
      );
      const updatedTotal = updated.reduce((s, a) => s + Number(a.value || 0), 0);
      onSaveSettings({
        ...settings,
        customAssetsList: updated,
        manualAssets: updatedTotal,
        assets: liveInvestmentsValuation + updatedTotal,
        netWorthConfigured: true
      });
      setSaveMsg('Asset updated successfully!');
    } else {
      const updated = customLiabilitiesList.map(l =>
        l.id === editingItem.id
          ? {
              ...l,
              name: editingItem.name.trim(),
              category: editingItem.category,
              description: (editingItem.description || '').trim(),
              value: numVal,
              updatedAt: new Date().toISOString()
            }
          : l
      );
      const updatedTotal = updated.reduce((s, l) => s + Number(l.value || 0), 0);
      onSaveSettings({
        ...settings,
        customLiabilitiesList: updated,
        manualLiabilities: updatedTotal,
        liabilities: updatedTotal,
        netWorthConfigured: true
      });
      setSaveMsg('Liability updated successfully!');
    }

    setEditingItem(null);
    setTimeout(() => setSaveMsg(''), 2500);
  };

  // 6. CONVERT FLAT BALANCES TO ITEMIZED ITEMS (FOR CLEAN MIGRATION)
  const handleConvertFlatAsset = () => {
    if (manualAssets <= 0) return;
    const item = {
      id: 'asset_' + Date.now().toString(),
      name: 'General Manual Asset Balance',
      category: 'other_asset',
      description: 'Carried over from general manual assets setting. Click edit to add specific details.',
      value: manualAssets,
      createdAt: new Date().toISOString()
    };
    const updated = [...customAssetsList, item];
    onSaveSettings({
      ...settings,
      customAssetsList: updated,
      manualAssets: manualAssets,
      assets: liveInvestmentsValuation + manualAssets,
      netWorthConfigured: true
    });
    setSaveMsg('Converted to itemized asset with description!');
    setTimeout(() => setSaveMsg(''), 2500);
  };

  const handleConvertFlatLiability = () => {
    if (manualLiabilities <= 0) return;
    const item = {
      id: 'liab_' + Date.now().toString(),
      name: 'General Manual Debt Balance',
      category: 'other_liability',
      description: 'Carried over from general liabilities setting. Click edit to add loan details or EMI notes.',
      value: manualLiabilities,
      createdAt: new Date().toISOString()
    };
    const updated = [...customLiabilitiesList, item];
    onSaveSettings({
      ...settings,
      customLiabilitiesList: updated,
      manualLiabilities: manualLiabilities,
      liabilities: manualLiabilities,
      netWorthConfigured: true
    });
    setSaveMsg('Converted to itemized liability with description!');
    setTimeout(() => setSaveMsg(''), 2500);
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        zIndex: 10000,
        overflowY: 'auto',
        padding: '24px 16px'
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '820px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px',
          borderRadius: '24px',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(28px)',
          border: '1px solid var(--border-glass)',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '22px', fontWeight: '900', margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wallet size={24} style={{ color: 'var(--primary)' }} /> Dynamic Net Worth & Itemized Breakdown
              </h2>
              <span className="badge badge-success" style={{ fontSize: '10px', padding: '2px 8px' }}>
                <Sparkles size={11} /> Live Auto-Calculated
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '6px 0 0 0', lineHeight: '1.4' }}>
              Detailed itemized inventory of what you own (+) and what you owe (-). Add descriptions, loan terms, and notes to every entry.
            </p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {saveMsg && (
          <div style={{ padding: '10px 14px', background: 'var(--success-light)', color: 'var(--success)', borderRadius: '12px', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={16} /> {saveMsg}
          </div>
        )}

        {/* Total Net Worth Hero Card */}
        <div
          style={{
            padding: '20px 24px',
            borderRadius: '20px',
            background: 'var(--hero-bg)',
            border: 'var(--hero-border)',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)' }}>
              Calculated Total Net Worth
            </div>
            <div style={{ fontSize: 'clamp(28px, 4vw, 36px)', fontWeight: '900', color: netWorth >= 0 ? 'var(--primary)' : 'var(--danger)', marginTop: '4px' }}>
              {formatInr(netWorth)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Formula: <strong>Total Assets ({formatInr(totalAssets)})</strong> − <strong>Total Liabilities ({formatInr(totalLiabilities)})</strong>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'right' }}>
            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Total Assets: <strong style={{ color: 'var(--success)', fontSize: '14px' }}>+{formatInr(totalAssets)}</strong>
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Total Liabilities: <strong style={{ color: 'var(--danger)', fontSize: '14px' }}>−{formatInr(totalLiabilities)}</strong>
            </div>
          </div>
        </div>

        {/* Dynamic Net Worth Explanation Box */}
        <div style={{ padding: '14px 18px', borderRadius: '16px', background: 'var(--info-light)', border: '1px solid rgba(2, 132, 199, 0.25)', marginBottom: '24px', fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.55' }}>
          <div style={{ fontWeight: '800', color: 'var(--text-main)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Info size={15} style={{ color: 'var(--info)' }} /> Why this exists & How it works:
          </div>
          <div>
            • <strong>1. Live Investments Portfolio (Auto):</strong> 100% automatically calculated live from your stocks, mutual funds, crypto, gold, and FDs in the Investments tab. It syncs in real-time as market prices update.
          </div>
          <div>
            • <strong>+ Assets (What You Own):</strong> Everything that adds value to your wealth (real estate, vehicles, cash in bank, jewelry, loans given).
          </div>
          <div>
            • <strong>− Liabilities (What You Owe):</strong> Outstanding debts (home loans, car loans, education loans, credit card balances).
          </div>
          <div>
            • <strong>Itemized Notes & Descriptions:</strong> Stored safely here so your main Settings page stays clean while you have clear notes on <em>why</em> each asset or loan was recorded.
          </div>
        </div>

        {/* INLINE EDIT MODAL / DRAWER IF EDITING */}
        {editingItem && (
          <div style={{ padding: '18px', borderRadius: '16px', background: 'var(--bg-app)', border: '2px solid var(--primary)', marginBottom: '24px', animation: 'fadeIn 0.2s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Edit2 size={15} style={{ color: 'var(--primary)' }} /> Edit {editingItem.type === 'asset' ? 'Asset' : 'Liability'} Details
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setEditingItem(null)}
                style={{ padding: '4px', color: 'var(--text-muted)' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '11px', fontWeight: '700' }}>Name / Title</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '11px', fontWeight: '700' }}>Category</label>
                  <CustomSelect
                    value={editingItem.category}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                    options={editingItem.type === 'asset' ? ASSET_CATEGORIES : LIABILITY_CATEGORIES}
                    size="md"
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '11px', fontWeight: '700' }}>Value (₹)</label>
                  <input
                    type="number"
                    step="any"
                    className="form-control"
                    value={editingItem.value}
                    onChange={(e) => setEditingItem({ ...editingItem, value: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: '700' }}>
                  Description / Purpose / Notes (e.g. Bank name, EMI details, interest rate, locker number)
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. SBI branch, 8.5% interest, EMI ₹35,000/mo, 15 yrs remaining"
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingItem(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: '800' }}>
                  <Check size={14} /> Save Changes
                </button>
              </div>
            </form>
          </div>
        )}

        {/* =========================================
            SECTION 1: ASSETS BREAKDOWN (+)
            ========================================= */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} style={{ color: 'var(--success)' }} /> 1. Assets Breakdown (What You Own)
            </h3>
            <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--success)' }}>
              +{formatInr(totalAssets)}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            {/* Live Portfolio Valuation Card (Auto) */}
            <div style={{ padding: '14px 18px', borderRadius: '16px', background: 'var(--success-light)', border: '1px solid var(--border-glass)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📈 Live Investments Portfolio <span className="badge badge-success" style={{ fontSize: '9px', padding: '1px 6px' }}>Auto Live (3s Sync)</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Indian Stocks ({formatInr(stockVal)}) • Mutual Funds ({formatInr(mfVal)}) • US/Crypto ({formatInr(usStockVal + cryptoVal)}) • Gold ({formatInr(goldVal)}) • FDs ({formatInr(fdVal)})
                  </div>
                </div>
                <div style={{ fontSize: '16px', fontWeight: '900', color: 'var(--success)' }}>
                  {formatInr(liveInvestmentsValuation)}
                </div>
              </div>
            </div>

            {/* Notice if unitemized manual asset balance exists */}
            {customAssetsList.length === 0 && manualAssets > 0 && (
              <div style={{ padding: '12px 16px', borderRadius: '14px', background: 'var(--warning-light)', border: '1px solid rgba(217, 119, 6, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--warning)' }}>
                    Unitemized Manual Asset Balance: {formatInr(manualAssets)}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    Convert this generic balance into an itemized asset to add descriptions and notes.
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '11px', fontWeight: '700', color: 'var(--warning)', borderColor: 'var(--warning)' }}
                  onClick={handleConvertFlatAsset}
                >
                  <Plus size={13} /> Itemize Balance
                </button>
              </div>
            )}

            {/* Custom Itemized Assets List */}
            {customAssetsList.map((asset) => {
              const catObj = ASSET_CATEGORIES.find(c => c.value === asset.category) || ASSET_CATEGORIES[7];
              const CatIcon = catObj.icon;
              return (
                <div
                  key={asset.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '14px',
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ padding: '6px', borderRadius: '8px', background: 'var(--info-light)', color: 'var(--info)' }}>
                        <CatIcon size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {asset.name}
                          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: '600' }}>
                            {catObj.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--success)' }}>
                        +{formatInr(asset.value)}
                      </span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '4px', color: 'var(--text-muted)' }}
                        onClick={() => setEditingItem({ type: 'asset', ...asset })}
                        title="Edit Item & Description"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '4px', color: 'var(--danger)' }}
                        onClick={() => handleDeleteAsset(asset.id)}
                        title="Delete Item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Description / Notes Display */}
                  {asset.description ? (
                    <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', fontSize: '12px', color: 'var(--text-main)', display: 'flex', alignItems: 'flex-start', gap: '8px', lineHeight: '1.45' }}>
                      <StickyNote size={14} style={{ color: 'var(--info)', marginTop: '2px', flexShrink: 0 }} />
                      <span style={{ color: 'var(--text-muted)' }}>{asset.description}</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: '34px' }}>
                      No description added. Click edit to add notes.
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Form to Add Itemized Asset with Description */}
          <div style={{ padding: '16px', borderRadius: '16px', background: 'var(--bg-app)', border: '1px dashed var(--border-color)' }}>
            <div style={{ fontSize: '12.5px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={15} style={{ color: 'var(--primary)' }} /> Add Itemized Asset (Real Estate, Vehicle, Cash, etc.)
            </div>
            <form onSubmit={handleAddAsset}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Asset Name (e.g. 3BHK Apartment, Cash in Locker)"
                  value={newAssetName}
                  onChange={(e) => setNewAssetName(e.target.value)}
                  style={{ fontSize: '12.5px' }}
                  required
                />
                <CustomSelect
                  value={newAssetCategory}
                  onChange={(e) => setNewAssetCategory(e.target.value)}
                  options={ASSET_CATEGORIES}
                  size="md"
                />
                <input
                  type="number"
                  step="any"
                  className="form-control"
                  placeholder="Asset Value (₹)"
                  value={newAssetVal}
                  onChange={(e) => setNewAssetVal(e.target.value)}
                  style={{ fontSize: '12.5px' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Description / Purpose / Notes (e.g. Registered in 2023, market value estimate, locker key #42)..."
                  value={newAssetDesc}
                  onChange={(e) => setNewAssetDesc(e.target.value)}
                  style={{ flex: 1, minWidth: '220px', fontSize: '12.5px' }}
                />
                <button type="submit" className="btn btn-secondary btn-sm" style={{ fontWeight: '800', padding: '0 16px', height: '40px' }}>
                  <Plus size={15} /> Add Asset
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* =========================================
            SECTION 2: LIABILITIES BREAKDOWN (−)
            ========================================= */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={18} style={{ color: 'var(--danger)' }} /> 2. Liabilities & Debts (What You Owe)
            </h3>
            <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--danger)' }}>
              −{formatInr(totalLiabilities)}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            {/* Notice if unitemized manual debt balance exists */}
            {customLiabilitiesList.length === 0 && manualLiabilities > 0 && (
              <div style={{ padding: '12px 16px', borderRadius: '14px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--danger)' }}>
                    Unitemized Manual Debt Balance: {formatInr(manualLiabilities)}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    Convert this generic debt into an itemized liability to add loan terms, EMI, and lender notes.
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '11px', fontWeight: '700', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                  onClick={handleConvertFlatLiability}
                >
                  <Plus size={13} /> Itemize Balance
                </button>
              </div>
            )}

            {customLiabilitiesList.length === 0 && manualLiabilities === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', borderRadius: '14px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                🎉 No active debts or loans recorded. Add your home loans, car loans, or credit cards below to track liabilities.
              </div>
            ) : (
              customLiabilitiesList.map((liability) => {
                const catObj = LIABILITY_CATEGORIES.find(c => c.value === liability.category) || LIABILITY_CATEGORIES[7];
                const CatIcon = catObj.icon;
                return (
                  <div
                    key={liability.id}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '14px',
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ padding: '6px', borderRadius: '8px', background: 'var(--danger-light)', color: 'var(--danger)' }}>
                          <CatIcon size={16} />
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {liability.name}
                            <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', background: 'var(--danger-light)', color: 'var(--danger)', fontWeight: '600' }}>
                              {catObj.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--danger)' }}>
                          −{formatInr(liability.value)}
                        </span>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '4px', color: 'var(--text-muted)' }}
                          onClick={() => setEditingItem({ type: 'liability', ...liability })}
                          title="Edit Item & Description"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '4px', color: 'var(--danger)' }}
                          onClick={() => handleDeleteLiability(liability.id)}
                          title="Delete Item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Description / Notes Display */}
                    {liability.description ? (
                      <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', fontSize: '12px', color: 'var(--text-main)', display: 'flex', alignItems: 'flex-start', gap: '8px', lineHeight: '1.45' }}>
                        <StickyNote size={14} style={{ color: 'var(--danger)', marginTop: '2px', flexShrink: 0 }} />
                        <span style={{ color: 'var(--text-muted)' }}>{liability.description}</span>
                      </div>
                    ) : (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: '34px' }}>
                        No description added. Click edit to add loan terms or notes.
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Form to Add Itemized Liability with Description */}
          <div style={{ padding: '16px', borderRadius: '16px', background: 'var(--bg-app)', border: '1px dashed rgba(220, 38, 38, 0.3)' }}>
            <div style={{ fontSize: '12.5px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={15} style={{ color: 'var(--danger)' }} /> Add Itemized Liability (Home Loan, Car Loan, Card Balance, etc.)
            </div>
            <form onSubmit={handleAddLiability}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Liability Name (e.g. SBI Home Loan, ICICI Car Loan)"
                  value={newLiabilityName}
                  onChange={(e) => setNewLiabilityName(e.target.value)}
                  style={{ fontSize: '12.5px' }}
                  required
                />
                <CustomSelect
                  value={newLiabilityCategory}
                  onChange={(e) => setNewLiabilityCategory(e.target.value)}
                  options={LIABILITY_CATEGORIES}
                  size="md"
                />
                <input
                  type="number"
                  step="any"
                  className="form-control"
                  placeholder="Debt Amount (₹)"
                  value={newLiabilityVal}
                  onChange={(e) => setNewLiabilityVal(e.target.value)}
                  style={{ fontSize: '12.5px' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Description / Terms / Notes (e.g. 8.5% floating rate, EMI ₹42k on 10th, 180 months remaining)..."
                  value={newLiabilityDesc}
                  onChange={(e) => setNewLiabilityDesc(e.target.value)}
                  style={{ flex: 1, minWidth: '220px', fontSize: '12.5px' }}
                />
                <button type="submit" className="btn btn-secondary btn-sm" style={{ fontWeight: '800', padding: '0 16px', height: '40px', color: 'var(--danger)' }}>
                  <Plus size={15} /> Add Liability
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', gap: '12px', paddingTop: '18px', borderTop: '1px solid var(--border-color)', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: '12px 24px', borderRadius: '12px', fontWeight: '800' }}
            onClick={onClose}
          >
            Done & Close Breakdown
          </button>
        </div>
      </div>
    </div>
  );
}
