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
  HelpCircle
} from 'lucide-react';
import { calculateDynamicNetWorth } from '../utils/netWorth';

export default function NetWorthModal({
  isOpen,
  onClose,
  investments = [],
  settings = {},
  onSaveSettings,
  isPrivacyMode = false
}) {
  // Prevent background page scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const mask = (val) => (isPrivacyMode ? '₹••••••••' : val);
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

  // Breakdown per asset class
  const safeInvestments = Array.isArray(investments) ? investments : [];
  const stockVal = safeInvestments.filter(i => i.type === 'stock').reduce((s, i) => s + (Number(i.currentValuation) || 0), 0);
  const usStockVal = safeInvestments.filter(i => i.type === 'us_stock').reduce((s, i) => s + (Number(i.currentValuation) || 0), 0);
  const cryptoVal = safeInvestments.filter(i => i.type === 'crypto').reduce((s, i) => s + (Number(i.currentValuation) || 0), 0);
  const mfVal = safeInvestments.filter(i => i.type === 'mutual_fund').reduce((s, i) => s + (Number(i.currentValuation) || 0), 0);
  const goldVal = safeInvestments.filter(i => i.type === 'gold').reduce((s, i) => s + (Number(i.currentValuation) || 0), 0);
  const fdVal = safeInvestments.filter(i => i.type === 'fd' || i.type === 'other').reduce((s, i) => s + (Number(i.currentValuation) || 0), 0);

  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetVal, setNewAssetVal] = useState('');
  const [newLiabilityName, setNewLiabilityName] = useState('');
  const [newLiabilityVal, setNewLiabilityVal] = useState('');

  const [saveMsg, setSaveMsg] = useState('');

  // Handlers for Custom Assets with Instant Auto-Sync
  const handleAddAsset = (e) => {
    e.preventDefault();
    if (!newAssetName.trim() || !newAssetVal || Number(newAssetVal) <= 0) return;
    const item = { id: Date.now().toString(), name: newAssetName.trim(), value: Number(newAssetVal) };
    const updatedAssets = [...customAssetsList, item];
    const updatedAssetsTotal = updatedAssets.reduce((s, a) => s + Number(a.value || 0), 0);

    onSaveSettings({
      ...settings,
      customAssetsList: updatedAssets,
      manualAssets: updatedAssetsTotal, // Keep manualAssets in 100% sync
      assets: liveInvestmentsValuation + updatedAssetsTotal,
      netWorthConfigured: true
    });

    setNewAssetName('');
    setNewAssetVal('');
    setSaveMsg('Asset added & synced live!');
    setTimeout(() => setSaveMsg(''), 2500);
  };

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

  const handleClearGeneralManualAsset = () => {
    onSaveSettings({
      ...settings,
      manualAssets: 0,
      customAssetsList: [],
      assets: liveInvestmentsValuation,
      netWorthConfigured: true
    });
    setSaveMsg('Manual asset cleared!');
    setTimeout(() => setSaveMsg(''), 2500);
  };

  // Handlers for Custom Liabilities with Instant Auto-Sync
  const handleAddLiability = (e) => {
    e.preventDefault();
    if (!newLiabilityName.trim() || !newLiabilityVal || Number(newLiabilityVal) <= 0) return;
    const item = { id: Date.now().toString(), name: newLiabilityName.trim(), value: Number(newLiabilityVal) };
    const updatedLiabilities = [...customLiabilitiesList, item];
    const updatedLiabilitiesTotal = updatedLiabilities.reduce((s, l) => s + Number(l.value || 0), 0);

    onSaveSettings({
      ...settings,
      customLiabilitiesList: updatedLiabilities,
      manualLiabilities: updatedLiabilitiesTotal, // Keep manualLiabilities in 100% sync
      liabilities: updatedLiabilitiesTotal,
      netWorthConfigured: true
    });

    setNewLiabilityName('');
    setNewLiabilityVal('');
    setSaveMsg('Liability added & synced live!');
    setTimeout(() => setSaveMsg(''), 2500);
  };

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

  const handleClearGeneralManualLiability = () => {
    onSaveSettings({
      ...settings,
      manualLiabilities: 0,
      customLiabilitiesList: [],
      liabilities: 0,
      netWorthConfigured: true
    });
    setSaveMsg('Manual liability cleared!');
    setTimeout(() => setSaveMsg(''), 2500);
  };

  const handleSaveAll = () => {
    onSaveSettings({
      ...settings,
      customAssetsList: customAssetsList,
      manualAssets: additionalAssetsTotal,
      customLiabilitiesList: customLiabilitiesList,
      manualLiabilities: totalLiabilities,
      assets: liveInvestmentsValuation + additionalAssetsTotal,
      liabilities: totalLiabilities,
      netWorthConfigured: true
    });
    setSaveMsg('Net worth breakdown configuration saved!');
    setTimeout(() => setSaveMsg(''), 3000);
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflow: 'hidden'
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '740px',
          width: '100%',
          maxHeight: '85vh',
          overflowY: 'auto',
          padding: '24px',
          borderRadius: '24px',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(28px)',
          border: '1px solid var(--border-glass)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '22px', fontWeight: '900', margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wallet size={24} style={{ color: 'var(--primary)' }} /> Dynamic Net Worth Breakdown
              </h2>
              <span className="badge badge-success" style={{ fontSize: '10px', padding: '2px 8px' }}>
                <Sparkles size={11} /> Live Auto-Calculated
              </span>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Calculated automatically from live stocks, mutual funds, crypto, gold, and manual assets minus debts.
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
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          <div>
            <div style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)' }}>
              Calculated Total Net Worth
            </div>
            <div style={{ fontSize: 'clamp(28px, 4vw, 36px)', fontWeight: '900', color: netWorth >= 0 ? 'var(--primary)' : 'var(--danger)', marginTop: '4px' }}>
              {formatInr(netWorth)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Total Assets ({formatInr(totalAssets)}) minus Liabilities ({formatInr(totalLiabilities)})
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Total Assets: <strong style={{ color: 'var(--text-main)' }}>{formatInr(totalAssets)}</strong>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Total Liabilities: <strong style={{ color: 'var(--danger)' }}>-{formatInr(totalLiabilities)}</strong>
            </div>
          </div>
        </div>

        {/* Explanatory Banner */}
        <div style={{ padding: '12px 16px', borderRadius: '14px', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', marginBottom: '24px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
          💡 <strong>How Net Worth is calculated dynamically:</strong> Your stock & mutual fund investments ({formatInr(liveInvestmentsValuation)}) update live every 3 seconds as market quotes change. Any additional real estate or loans added below automatically sync into your total Net Worth.
        </div>

        {/* Section 1: ASSETS BREAKDOWN */}
        <div style={{ marginBottom: '28px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '14px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} style={{ color: 'var(--primary)' }} /> 1. Assets Breakdown ({formatInr(totalAssets)})
          </h3>

          {/* Itemized Assets Table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            {/* Live Portfolio Valuation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '14px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📈 Live Investments Portfolio <span className="badge badge-success" style={{ fontSize: '9px', padding: '1px 5px' }}>Auto Live</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Indian Stocks ({formatInr(stockVal)}) • MFs ({formatInr(mfVal)}) • US/Crypto ({formatInr(usStockVal + cryptoVal)}) • Gold ({formatInr(goldVal)}) • FDs ({formatInr(fdVal)})
                </div>
              </div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#10B981' }}>
                {formatInr(liveInvestmentsValuation)}
              </div>
            </div>

            {/* Custom Additional Assets List */}
            {customAssetsList.map((asset) => (
              <div key={asset.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Home size={15} style={{ color: '#38BDF8' }} />
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>{asset.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>{formatInr(asset.value)}</span>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleDeleteAsset(asset.id)} style={{ padding: '4px', color: 'var(--danger)' }} title="Delete Asset">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}

            {/* Fallback Display if General Manual Asset entered outside */}
            {customAssetsList.length === 0 && manualAssets > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Home size={15} style={{ color: '#38BDF8' }} />
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>General Additional Asset (Manual Input)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>{formatInr(manualAssets)}</span>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={handleClearGeneralManualAsset} style={{ padding: '4px', color: 'var(--danger)' }} title="Clear Manual Asset">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Form to Add Custom Asset (e.g. Property, Vehicle) */}
          <form onSubmit={handleAddAsset} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Apartment / Real Estate, Physical Gold..."
              value={newAssetName}
              onChange={(e) => setNewAssetName(e.target.value)}
              style={{ flex: 2, minWidth: '180px', fontSize: '12px', height: '36px' }}
            />
            <input
              type="number"
              className="form-control"
              placeholder="Value in ₹"
              value={newAssetVal}
              onChange={(e) => setNewAssetVal(e.target.value)}
              style={{ flex: 1, minWidth: '120px', fontSize: '12px', height: '36px' }}
            />
            <button type="submit" className="btn btn-secondary btn-sm" style={{ height: '36px', padding: '0 14px', fontSize: '12px', fontWeight: '700' }}>
              <Plus size={15} /> Add Asset
            </button>
          </form>
        </div>

        {/* Section 2: LIABILITIES BREAKDOWN */}
        <div style={{ marginBottom: '28px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '14px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={18} style={{ color: 'var(--danger)' }} /> 2. Liabilities & Debts Breakdown (-{formatInr(totalLiabilities)})
          </h3>

          {/* Custom Liabilities List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            {customLiabilitiesList.length === 0 && manualLiabilities === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
                No active loans or credit liabilities added. Add any home loan, car loan, or credit card debt below.
              </div>
            ) : (
              <>
                {customLiabilitiesList.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>{item.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--danger)' }}>-{formatInr(item.value)}</span>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleDeleteLiability(item.id)} style={{ padding: '4px', color: 'var(--danger)' }} title="Delete Liability">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}

                {customLiabilitiesList.length === 0 && manualLiabilities > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>General Liability / Debt (Manual Input)</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--danger)' }}>-{formatInr(manualLiabilities)}</span>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={handleClearGeneralManualLiability} style={{ padding: '4px', color: 'var(--danger)' }} title="Clear Manual Liability">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Form to Add Custom Liability */}
          <form onSubmit={handleAddLiability} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. HDFC Home Loan, Credit Card Balance..."
              value={newLiabilityName}
              onChange={(e) => setNewLiabilityName(e.target.value)}
              style={{ flex: 2, minWidth: '180px', fontSize: '12px', height: '36px' }}
            />
            <input
              type="number"
              className="form-control"
              placeholder="Debt Amount in ₹"
              value={newLiabilityVal}
              onChange={(e) => setNewLiabilityVal(e.target.value)}
              style={{ flex: 1, minWidth: '120px', fontSize: '12px', height: '36px' }}
            />
            <button type="submit" className="btn btn-secondary btn-sm" style={{ height: '36px', padding: '0 14px', fontSize: '12px', fontWeight: '700', color: 'var(--danger)' }}>
              <Plus size={15} /> Add Liability
            </button>
          </form>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
          <button
            type="button"
            className="btn btn-primary"
            style={{ flex: 1, padding: '12px', borderRadius: '12px', fontWeight: '800' }}
            onClick={handleSaveAll}
          >
            Save Net Worth Configuration
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '12px 20px', borderRadius: '12px', fontWeight: '700' }}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
