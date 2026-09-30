import React, { useState } from 'react';
import { X } from 'lucide-react';
import CustomSelect from './CustomSelect';

export default function BudgetModal({ isOpen, onClose, categories = [], initialBudget, onSave }) {
  if (!isOpen) return null;

  const [category, setCategory] = useState(initialBudget?.category || categories[0] || 'Groceries');
  const [limit, setLimit] = useState(initialBudget?.limit || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsedLimit = parseFloat(limit);
    if (isNaN(parsedLimit) || parsedLimit <= 0) return;

    setSaving(true);
    await onSave({
      id: initialBudget?.id || `bgt_${Date.now()}`,
      category,
      limit: parsedLimit,
      active: true
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
        <div className="modal-header">
          <h2>{initialBudget ? 'Adjust Budget' : 'Create Monthly Budget'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Category</label>
            <CustomSelect
              value={category}
              onChange={e => setCategory(e.target.value)}
              options={categories}
              disabled={!!initialBudget}
              size="md"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Monthly Limit (₹)</label>
            <input
              type="number"
              step="1"
              placeholder="e.g. 15000"
              className="form-control"
              value={limit}
              onChange={e => setLimit(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Budget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
