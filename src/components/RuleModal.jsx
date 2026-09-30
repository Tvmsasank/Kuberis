import React, { useState } from 'react';
import { X } from 'lucide-react';
import CustomSelect from './CustomSelect';

export default function RuleModal({ isOpen, onClose, categories = [], tags = [], onSave }) {
  if (!isOpen) return null;

  const [whenText, setWhenText] = useState('');
  const [thenCategory, setThenCategory] = useState(categories[0] || 'Groceries');
  const [thenTag, setThenTag] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!whenText.trim()) return;

    setSaving(true);
    const thenText = thenCategory + (thenTag ? ` & Tag: ${thenTag}` : '');
    await onSave({
      whenText: whenText.trim(),
      thenText,
      thenCategory,
      thenTag,
      enabled: 1
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <h2>Create Categorization Rule</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">When Merchant or Description contains:</label>
            <input
              type="text"
              placeholder="e.g. Starbuck, Uber, Netflix"
              className="form-control"
              value={whenText}
              onChange={e => setWhenText(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Then set Category to:</label>
            <CustomSelect
              value={thenCategory}
              onChange={e => setThenCategory(e.target.value)}
              options={categories}
              size="md"
            />
          </div>

          <div className="form-group">
            <label className="form-label">And apply Tag (Optional):</label>
            <CustomSelect
              value={thenTag}
              onChange={e => setThenTag(e.target.value)}
              options={[{ value: '', label: '-- No Tag --' }, ...tags.map(t => ({ value: t, label: t }))]}
              size="md"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
