import React, { useState } from 'react';
import { Wallet, Settings, FolderSync, AlertTriangle, RefreshCw, Plus, Trash2, CheckCircle2, Download, ExternalLink, Link2 } from 'lucide-react';

export default function SettingsTab({
  settings = {},
  categories = [],
  accounts = [],
  tags = [],
  onSaveNetWorth,
  onSaveCategories,
  onSaveAccounts,
  onRestoreIgnoredSuggestions,
  onOpenConfirmWipe
}) {
  const { netWorthConfigured = false } = settings;
  const [assetsInput, setAssetsInput] = useState(
    netWorthConfigured && settings.assets !== undefined ? settings.assets : ''
  );
  const [liabilitiesInput, setLiabilitiesInput] = useState(
    netWorthConfigured && settings.liabilities !== undefined ? settings.liabilities : ''
  );
  const [netWorthMessage, setNetWorthMessage] = useState('');

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
  const dismissedCount = (settings.dismissedPatterns || []).length;

  const hasEnteredValues = assetsInput !== '' || liabilitiesInput !== '';
  const calculatedPreview = (parseFloat(assetsInput) || 0) - (parseFloat(liabilitiesInput) || 0);

  const handleNetWorthSubmit = async (e) => {
    e.preventDefault();
    if (assetsInput === '' && liabilitiesInput === '') {
      setNetWorthMessage('Please enter assets or liabilities amount');
      return;
    }
    const assets = parseFloat(assetsInput) || 0;
    const liabilities = parseFloat(liabilitiesInput) || 0;

    await onSaveNetWorth({
      assets,
      liabilities,
      netWorthConfigured: true
    });

    setNetWorthMessage('Net worth configuration saved successfully!');
    setTimeout(() => setNetWorthMessage(''), 4000);
  };

  const handleDriveFolderSubmit = async (e) => {
    e.preventDefault();
    await onSaveNetWorth({
      driveFolder: {
        name: driveNameInput.trim() || 'WealthPulse Financial Inbox',
        url: driveUrlInput.trim() || 'https://drive.google.com/drive/my-drive'
      }
    });
    setDriveMessage('Custom Google Drive Folder link saved successfully!');
    setTimeout(() => setDriveMessage(''), 4000);
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

      {/* 1. Net Worth Setup */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{ padding: '8px', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 'var(--radius-md)' }}>
            <Wallet size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Net Worth Setup</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Net Worth is calculated as total assets minus total liabilities (not monthly cash flow).
            </p>
          </div>
        </div>

        {netWorthMessage && (
          <div style={{ padding: '10px 14px', background: 'var(--success-light)', color: 'var(--success)', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '13px' }}>
            {netWorthMessage}
          </div>
        )}

        <form onSubmit={handleNetWorthSubmit}>
          <div className="settings-grid-3">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Total Assets (₹)</label>
              <input
                type="number"
                step="1"
                placeholder="e.g. 500000"
                className="form-control"
                value={assetsInput}
                onChange={e => setAssetsInput(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Total Liabilities (₹)</label>
              <input
                type="number"
                step="1"
                placeholder="e.g. 100000"
                className="form-control"
                value={liabilitiesInput}
                onChange={e => setLiabilitiesInput(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Calculated Net Worth Preview</label>
              <div style={{ padding: '10px 14px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '18px', fontWeight: '700', color: hasEnteredValues ? (calculatedPreview >= 0 ? 'var(--success)' : 'var(--warning)') : 'var(--warning)', minHeight: '44px', display: 'flex', alignItems: 'center' }}>
                {hasEnteredValues
                  ? `₹${calculatedPreview.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                  : 'Not set'}
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '16px' }}>
            Save Net Worth Configuration
          </button>
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
          <div style={{ padding: '10px 14px', background: 'var(--success-light)', color: 'var(--success)', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={16} /> {driveMessage}
          </div>
        )}

        <form onSubmit={handleDriveFolderSubmit} style={{ marginBottom: '20px', padding: '16px', background: 'var(--bg-app)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '12px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Link2 size={16} style={{ color: 'var(--primary)' }} /> Configure Your Google Drive Folder Link
          </h4>

          <div className="settings-grid-2">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '12px' }}>Folder Name</label>
              <input
                type="text"
                placeholder="e.g. My Financial Inbox"
                className="form-control"
                style={{ fontSize: '13px' }}
                value={driveNameInput}
                onChange={e => setDriveNameInput(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '12px' }}>Google Drive Folder Link / URL</label>
              <input
                type="url"
                placeholder="https://drive.google.com/drive/folders/your-folder-id"
                className="form-control"
                style={{ fontSize: '13px' }}
                value={driveUrlInput}
                onChange={e => setDriveUrlInput(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-secondary btn-sm" style={{ fontSize: '12px', marginTop: '12px' }}>
            Save Drive Folder Link
          </button>
        </form>

        <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }} className="settings-grid-2">
          <div>Folder Name: <strong>{driveFolder.name}</strong></div>
          <div>Schedule: <strong>{driveSync.schedule} ({driveSync.timezone})</strong></div>
          <div>Last Synced: <strong>{driveSync.lastSyncedAt ? new Date(driveSync.lastSyncedAt).toLocaleString() : 'Never'}</strong></div>
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

      {/* 4. Restore Ignored Suggestions */}
      {dismissedCount > 0 && (
        <div className="card" style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700' }}>Ignored Suggestions ({dismissedCount})</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                You have ignored {dismissedCount} auto-detected recurring or subscription pattern suggestions.
              </p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={onRestoreIgnoredSuggestions}>
              <RefreshCw size={14} /> Restore All Suggestions
            </button>
          </div>
        </div>
      )}

      {/* 5. Danger Zone: Wipe All Data */}
      <div className="card" style={{ border: '1px solid var(--danger-light)', background: 'rgba(239, 68, 68, 0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', color: 'var(--danger)' }}>
          <AlertTriangle size={20} />
          <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Danger Zone</h3>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Permanently delete all financial transactions, rules, tags, and settings for your account. This action cannot be undone.
        </p>

        <button className="btn btn-danger btn-sm" onClick={onOpenConfirmWipe}>
          <Trash2 size={14} /> Erase All Account Data
        </button>
      </div>
    </div>
  );
}
