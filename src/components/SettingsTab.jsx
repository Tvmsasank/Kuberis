import React, { useState, useEffect } from 'react';
import { Wallet, Settings, FolderSync, AlertTriangle, RefreshCw, Plus, Trash2, CheckCircle2, Download, ExternalLink, Link2, Sparkles, TrendingUp, CreditCard, PieChart } from 'lucide-react';
import { calculateDynamicNetWorth } from '../utils/netWorth';

export default function SettingsTab({
  settings = {},
  investments = [],
  categories = [],
  accounts = [],
  tags = [],
  isPrivacyMode = false,
  onSaveNetWorth,
  onSaveCategories,
  onSaveAccounts,
  onRestoreIgnoredSuggestions,
  onOpenConfirmWipe,
  onOpenNetWorthModal
}) {
  const formatInr = (val) =>
    isPrivacyMode
      ? '₹••••••••'
      : '₹' +
        Number(val || 0).toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });

  const {
    liveInvestmentsValuation,
    additionalAssetsTotal,
    totalAssets,
    totalLiabilities,
    netWorth
  } = calculateDynamicNetWorth(investments, settings);

  const [assetsInput, setAssetsInput] = useState('');
  const [liabilitiesInput, setLiabilitiesInput] = useState('');
  const [netWorthMessage, setNetWorthMessage] = useState('');

  // Update inputs when settings change
  useEffect(() => {
    setAssetsInput(additionalAssetsTotal > 0 ? String(additionalAssetsTotal) : '');
    setLiabilitiesInput(totalLiabilities > 0 ? String(totalLiabilities) : '');
  }, [additionalAssetsTotal, totalLiabilities]);

  const [newCatInput, setNewCatInput] = useState('');
  const [newAccInput, setNewAccInput] = useState('');
  const [catAccMessage, setCatAccMessage] = useState('');

  const driveFolder = settings.driveFolder || {
    name: 'WealthPulse Financial Inbox',
    url: 'https://drive.google.com/drive/my-drive'
  };
  const [driveNameInput, setDriveNameInput] = useState(driveFolder.name || 'WealthPulse Financial Inbox');
  const [driveUrlInput, setDriveUrlInput] = useState(driveFolder.url || 'https://drive.google.com/drive/my-drive');
  const [driveMessage, setDriveMessage] = useState('');

  const driveSync = settings.driveSync || {
    schedule: '08:00 AM Daily',
    timezone: 'Asia/Kolkata',
    lastSyncedAt: null,
    lastStatus: 'idle'
  };

  const manualAssetsVal = assetsInput !== '' ? parseFloat(assetsInput) || 0 : additionalAssetsTotal;
  const manualLiabilitiesVal = liabilitiesInput !== '' ? parseFloat(liabilitiesInput) || 0 : totalLiabilities;
  const calculatedAssets = liveInvestmentsValuation + manualAssetsVal;
  const calculatedPreview = calculatedAssets - manualLiabilitiesVal;

  const handleNetWorthSubmit = async (e) => {
    e.preventDefault();

    const newManualAssets = assetsInput !== '' ? Math.max(0, parseFloat(assetsInput) || 0) : 0;
    const newManualLiabilities = liabilitiesInput !== '' ? Math.max(0, parseFloat(liabilitiesInput) || 0) : 0;

    let updatedCustomAssets = Array.isArray(settings.customAssetsList) ? [...settings.customAssetsList] : [];
    if (newManualAssets === 0) {
      updatedCustomAssets = [];
    } else if (updatedCustomAssets.length === 0 && newManualAssets > 0) {
      updatedCustomAssets = [{ id: 'general-asset-1', name: 'General Additional Asset', value: newManualAssets }];
    } else if (updatedCustomAssets.length === 1 && newManualAssets > 0) {
      updatedCustomAssets = [{ ...updatedCustomAssets[0], value: newManualAssets }];
    }

    let updatedCustomLiabilities = Array.isArray(settings.customLiabilitiesList) ? [...settings.customLiabilitiesList] : [];
    if (newManualLiabilities === 0) {
      updatedCustomLiabilities = [];
    } else if (updatedCustomLiabilities.length === 0 && newManualLiabilities > 0) {
      updatedCustomLiabilities = [{ id: 'general-liability-1', name: 'General Liability / Debt', value: newManualLiabilities }];
    } else if (updatedCustomLiabilities.length === 1 && newManualLiabilities > 0) {
      updatedCustomLiabilities = [{ ...updatedCustomLiabilities[0], value: newManualLiabilities }];
    }

    onSaveNetWorth({
      manualAssets: newManualAssets,
      customAssetsList: updatedCustomAssets,
      manualLiabilities: newManualLiabilities,
      customLiabilitiesList: updatedCustomLiabilities,
      assets: liveInvestmentsValuation + newManualAssets,
      liabilities: newManualLiabilities,
      netWorthConfigured: true
    });

    setNetWorthMessage('Dynamic Net Worth configuration saved!');
    setTimeout(() => setNetWorthMessage(''), 3000);
  };

  const handleDriveFolderSubmit = (e) => {
    e.preventDefault();
    onSaveNetWorth({
      driveFolder: {
        name: driveNameInput.trim() || 'WealthPulse Financial Inbox',
        url: driveUrlInput.trim() || 'https://drive.google.com/drive/my-drive'
      }
    });
    setDriveMessage('Google Drive folder saved!');
    setTimeout(() => setDriveMessage(''), 3000);
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newCatInput.trim()) return;
    const catName = newCatInput.trim();
    if (categories.includes(catName)) {
      setCatAccMessage('Category already exists');
      return;
    }
    onSaveCategories([...categories, catName]);
    setNewCatInput('');
    setCatAccMessage('Category added successfully');
    setTimeout(() => setCatAccMessage(''), 3000);
  };

  const handleDeleteCategory = (cat) => {
    if (categories.length <= 1) {
      setCatAccMessage('Must keep at least one category');
      return;
    }
    onSaveCategories(categories.filter(c => c !== cat));
    setCatAccMessage('');
  };

  const handleAddAccount = (e) => {
    e.preventDefault();
    if (!newAccInput.trim()) return;
    const accName = newAccInput.trim();
    if (accounts.includes(accName)) {
      setCatAccMessage('Account already exists');
      return;
    }
    onSaveAccounts([...accounts, accName]);
    setNewAccInput('');
    setCatAccMessage('Account added successfully');
    setTimeout(() => setCatAccMessage(''), 3000);
  };

  const handleDeleteAccount = (acc) => {
    if (accounts.length <= 1) {
      setCatAccMessage('Must keep at least one account');
      return;
    }
    onSaveAccounts(accounts.filter(a => a !== acc));
    setCatAccMessage('');
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Settings & System Configuration</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Configure net worth totals, accounts, categories, and sync behavior</p>
      </div>

      {/* 1. Dynamic Net Worth Setup */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 'var(--radius-md)' }}>
              <Wallet size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Dynamic Net Worth Setup <span className="badge badge-success" style={{ fontSize: '9px', padding: '1px 6px' }}>Auto Live</span>
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Net Worth is calculated live as Total Assets (Investments + Extra Assets) minus Total Liabilities.
              </p>
            </div>
          </div>

          {onOpenNetWorthModal && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ borderRadius: '10px', fontSize: '12px', fontWeight: '700', gap: '6px' }}
              onClick={onOpenNetWorthModal}
            >
              <PieChart size={15} style={{ color: 'var(--primary)' }} /> View Itemized Breakdown
            </button>
          )}
        </div>

        {netWorthMessage && (
          <div style={{ padding: '10px 14px', background: 'var(--success-light)', color: 'var(--success)', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '13px' }}>
            {netWorthMessage}
          </div>
        )}

        {/* Informative Note Box */}
        <div style={{ padding: '12px 16px', borderRadius: '14px', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', marginBottom: '20px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
          💡 <strong>Dynamic Net Worth Auto-Calculation:</strong> Your Net Worth includes your live stock & mutual fund investments (<strong>{formatInr(liveInvestmentsValuation)}</strong>) which update live every 3 seconds. You can add additional manual assets (real estate, vehicles) or debts below.
        </div>

        <form onSubmit={handleNetWorthSubmit}>
          <div className="settings-grid-5" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>
                1. Live Investments Portfolio (Auto)
              </label>
              <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)', fontSize: '15px', fontWeight: '800', color: '#10B981', minHeight: '44px', display: 'flex', alignItems: 'center' }}>
                {formatInr(liveInvestmentsValuation)}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>
                2. Additional Manual Assets (₹)
              </label>
              <input
                type={isPrivacyMode ? 'password' : 'number'}
                step="1"
                placeholder={isPrivacyMode ? '••••••••' : 'e.g. Real Estate, Vehicles...'}
                className="form-control"
                value={assetsInput}
                onChange={e => setAssetsInput(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: '700', color: '#38BDF8' }}>
                3. Total Assets (Combined)
              </label>
              <div style={{ padding: '10px 14px', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: 'var(--radius-md)', fontSize: '15px', fontWeight: '800', color: '#38BDF8', minHeight: '44px', display: 'flex', alignItems: 'center' }}>
                {formatInr(calculatedAssets)}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>
                4. Total Liabilities & Debts (₹)
              </label>
              <input
                type={isPrivacyMode ? 'password' : 'number'}
                step="1"
                placeholder={isPrivacyMode ? '••••••••' : 'e.g. Home Loan, Credit Cards...'}
                className="form-control"
                value={liabilitiesInput}
                onChange={e => setLiabilitiesInput(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>
                5. Calculated Dynamic Net Worth
              </label>
              <div style={{ padding: '10px 14px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '16px', fontWeight: '900', color: calculatedPreview >= 0 ? 'var(--primary)' : 'var(--danger)', minHeight: '44px', display: 'flex', alignItems: 'center' }}>
                {formatInr(calculatedPreview)}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button type="submit" className="btn btn-primary">
              Save Net Worth Configuration
            </button>
            {onOpenNetWorthModal && (
              <button type="button" className="btn btn-secondary" onClick={onOpenNetWorthModal}>
                Open Detailed Breakdown & Itemized List
              </button>
            )}
          </div>
        </form>
      </div>

      {/* 2. Google Drive Sync & Backup */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FolderSync size={20} style={{ color: 'var(--success)' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Google Drive Sync & Backup</h3>
          </div>
          <a href={driveFolder.url || 'https://drive.google.com/drive/my-drive'} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ color: 'var(--primary)' }}>
            Open Drive Folder <ExternalLink size={14} />
          </a>
        </div>

        {driveMessage && (
          <div style={{ padding: '10px 14px', background: 'var(--success-light)', color: 'var(--success)', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '13px' }}>
            {driveMessage}
          </div>
        )}

        <form onSubmit={handleDriveFolderSubmit} style={{ marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Folder Name</label>
              <input
                type="text"
                className="form-control"
                value={driveNameInput}
                onChange={e => setDriveNameInput(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Folder Web URL</label>
              <input
                type="url"
                className="form-control"
                value={driveUrlInput}
                onChange={e => setDriveUrlInput(e.target.value)}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-secondary btn-sm">Save Drive Folder Link</button>
        </form>

        <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: 'var(--text-muted)', flexWrap: 'wrap', marginBottom: '16px' }}>
          <div>Folder Name: <strong>{driveFolder.name}</strong></div>
          <div>Schedule: <strong>{driveSync.schedule} ({driveSync.timezone})</strong></div>
          <div>Last Synced: <strong>{driveSync.lastSyncedAt ? new Date(driveSync.lastSyncedAt).toLocaleString('en-IN') : 'Never'}</strong></div>
          <div>Sync Status: <strong style={{ color: 'var(--success)' }}>{driveSync.lastStatus}</strong></div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Export Data for Google Drive Backup</h4>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
            Download your current transactions or full database backup to save directly into your <strong>{driveFolder.name}</strong> Drive folder.
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <a href="/api/export?format=csv" download className="btn btn-secondary btn-sm">
              <Download size={14} /> Download CSV Transactions
            </a>
            <a href="/api/export?format=json" download className="btn btn-secondary btn-sm">
              <Download size={14} /> Download Full Database JSON
            </a>
          </div>
        </div>
      </div>

      {/* 3. Managed Categories & Accounts */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Categories & Accounts Management</h3>

        {catAccMessage && (
          <div style={{ padding: '10px 14px', background: 'var(--info-light)', color: 'var(--info)', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '13px' }}>
            {catAccMessage}
          </div>
        )}

        <div className="settings-manage-grid">
          {/* Categories Manager */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Categories ({categories.length})</h4>
            <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="New Category Name..."
                className="form-control"
                style={{ flex: 1 }}
                value={newCatInput}
                onChange={e => setNewCatInput(e.target.value)}
              />
              <button type="submit" className="btn btn-secondary" style={{ flexShrink: 0 }}>
                <Plus size={16} /> Add
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto', paddingRight: '6px' }}>
              {categories.map(cat => (
                <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-app)', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
                  <span>{cat}</span>
                  <button className="btn btn-ghost btn-sm" style={{ padding: '4px', color: 'var(--danger)' }} onClick={() => handleDeleteCategory(cat)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Accounts Manager */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Accounts ({accounts.length})</h4>
            <form onSubmit={handleAddAccount} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="New Account Name..."
                className="form-control"
                style={{ flex: 1 }}
                value={newAccInput}
                onChange={e => setNewAccInput(e.target.value)}
              />
              <button type="submit" className="btn btn-secondary" style={{ flexShrink: 0 }}>
                <Plus size={16} /> Add
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto', paddingRight: '6px' }}>
              {accounts.map(acc => (
                <div key={acc} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-app)', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
                  <span>{acc}</span>
                  <button className="btn btn-ghost btn-sm" style={{ padding: '4px', color: 'var(--danger)' }} onClick={() => handleDeleteAccount(acc)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Danger Zone */}
      <div className="card" style={{ borderColor: 'var(--danger-light)', background: 'rgba(239, 68, 68, 0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <AlertTriangle size={20} style={{ color: 'var(--danger)' }} />
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--danger)' }}>Danger Zone</h3>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Permanently delete all financial transactions, rules, tags, and settings for your account. This action cannot be undone.
        </p>

        <button
          type="button"
          className="btn btn-danger"
          onClick={onOpenConfirmWipe}
        >
          Erase All Account Data
        </button>
      </div>
    </div>
  );
}
