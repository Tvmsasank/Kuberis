import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

export default function ConfirmWipeModal({ isOpen, onClose, onConfirmWipe }) {
  if (!isOpen) return null;

  const [confirmInput, setConfirmInput] = useState('');
  const [wiping, setWiping] = useState(false);
  const [error, setError] = useState('');

  const handleWipe = async () => {
    if (confirmInput !== 'DELETE') return;
    setError('');
    setWiping(true);

    try {
      await onConfirmWipe();
      setWiping(false);
      onClose();
    } catch (err) {
      setWiping(false);
      setError(err.message || 'Failed to erase data');
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--danger)' }}>
            <AlertTriangle size={24} />
            <h2 style={{ fontSize: '18px', color: 'var(--danger)' }}>Erase All Kuberis Data</h2>
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

        <div style={{ fontSize: '14px', color: 'var(--text-main)', marginBottom: '16px', lineHeight: '1.5' }}>
          <p style={{ marginBottom: '10px' }}>
            This action will permanently delete all <strong>transactions, stored document bytes in R2, budgets, goals, rules, custom tags, and settings</strong>.
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            <strong>Note:</strong> Original Google Drive files will remain safe in your Drive folder, but the site will set a reset timestamp to avoid re-importing old files.
          </p>
        </div>

        <div className="form-group">
          <label className="form-label" style={{ color: 'var(--danger)' }}>
            To confirm, type <strong>DELETE</strong> below:
          </label>
          <input
            type="text"
            placeholder="Type DELETE"
            className="form-control"
            value={confirmInput}
            onChange={e => setConfirmInput(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={wiping}>
            Cancel
          </button>
          <button
            className="btn btn-danger"
            onClick={handleWipe}
            disabled={confirmInput !== 'DELETE' || wiping}
          >
            {wiping ? 'Erasing Data...' : 'Permanently Erase All Data'}
          </button>
        </div>
      </div>
    </div>
  );
}
