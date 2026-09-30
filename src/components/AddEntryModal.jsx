import React, { useState, useEffect } from 'react';
import { X, Plus, Upload, Edit3, Check, Tag } from 'lucide-react';
import CustomSelect from './CustomSelect';

export default function AddEntryModal({
  isOpen,
  onClose,
  onSave,
  editTransaction = null,
  categories = [],
  accounts = [],
  tags = []
}) {
  if (!isOpen) return null;

  const isEditing = !!editTransaction;

  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState(categories[0] || 'Needs review');
  const [account, setAccount] = useState(accounts[0] || 'Main Checking');
  const [selectedTags, setSelectedTags] = useState([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [hasReceipt, setHasReceipt] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editTransaction) {
      setType(editTransaction.type || 'expense');
      setAmount(editTransaction.amount ? String(editTransaction.amount) : '');
      setMerchant(editTransaction.merchant || '');
      setDate(editTransaction.date || new Date().toISOString().split('T')[0]);
      setCategory(editTransaction.category || categories[0] || 'Needs review');
      setAccount(editTransaction.account || accounts[0] || 'Main Checking');
      setSelectedTags(parseTags(editTransaction.tags));
      setHasReceipt(editTransaction.receipt === 1);
    } else {
      setType('expense');
      setAmount('');
      setMerchant('');
      setDate(new Date().toISOString().split('T')[0]);
      setCategory(categories[0] || 'Needs review');
      setAccount(accounts[0] || 'Main Checking');
      setSelectedTags([]);
      setHasReceipt(false);
    }
    setError('');
  }, [editTransaction, isOpen]);

  const parseTags = (rawTags) => {
    if (!rawTags) return [];
    if (Array.isArray(rawTags)) return rawTags;
    if (typeof rawTags === 'string') {
      try {
        const parsed = JSON.parse(rawTags);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return rawTags.split(',').map(t => t.trim()).filter(Boolean);
      }
    }
    return [];
  };

  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    const tag = newTagInput.trim();
    if (!selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
    }
    setNewTagInput('');
  };

  const handleToggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanAmountStr = String(amount || '').replace(/,/g, '.').trim();
    const parsedAmount = Math.abs(parseFloat(cleanAmountStr));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }
    if (!merchant.trim()) {
      setError('Please enter a merchant or source name.');
      return;
    }

    let finalTags = [...selectedTags];
    if (newTagInput.trim() && !finalTags.includes(newTagInput.trim())) {
      finalTags.push(newTagInput.trim());
    }

    setSaving(true);
    try {
      await onSave({
        ...(isEditing ? { id: editTransaction.id } : {}),
        type,
        amount: parsedAmount,
        merchant: merchant.trim(),
        date,
        category,
        account,
        tags: finalTags,
        receiptFile
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save entry. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '540px',
          width: '100%',
          padding: '28px',
          borderRadius: '24px',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          border: '1px solid var(--border-glass)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary)' }}>
              {isEditing ? <Edit3 size={20} /> : <Plus size={20} />}
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                {isEditing ? 'Edit Financial Entry' : 'Add Financial Entry'}
              </h2>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Record transaction details & attach receipts
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

        <form onSubmit={handleSubmit}>
          {/* Segmented Expense / Income Toggle */}
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
                  background: type === 'expense' ? 'var(--warning)' : 'transparent',
                  color: type === 'expense' ? '#000000' : 'var(--text-muted)',
                  boxShadow: type === 'expense' ? '0 2px 10px rgba(245, 158, 11, 0.4)' : 'none',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setType('expense')}
              >
                Expense
              </button>
              <button
                type="button"
                className="btn"
                style={{
                  padding: '9px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: '700',
                  background: type === 'income' ? 'var(--primary)' : 'transparent',
                  color: type === 'income' ? '#000000' : 'var(--text-muted)',
                  boxShadow: type === 'income' ? '0 2px 10px var(--primary-glow)' : 'none',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setType('income')}
              >
                Income
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                className="form-control"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                className="form-control"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Merchant / Source</label>
            <input
              type="text"
              placeholder="e.g. Swiggy, Employer Paycheck, D-Mart"
              className="form-control"
              value={merchant}
              onChange={e => setMerchant(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <CustomSelect
                value={category}
                onChange={e => setCategory(e.target.value)}
                options={categories}
                size="md"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Account</label>
              <CustomSelect
                value={account}
                onChange={e => setAccount(e.target.value)}
                options={accounts.length > 0 ? accounts : ['Main Checking']}
                size="md"
              />
            </div>
          </div>

          {/* Tags Section */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Tag size={13} style={{ color: 'var(--primary)' }} /> Select or Type Tags
            </label>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              {tags.map(t => {
                const isSelected = selectedTags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    className={`tag-pill ${isSelected ? 'active' : ''}`}
                    onClick={() => handleToggleTag(t)}
                  >
                    {isSelected && <Check size={12} />}
                    <span>{t}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Add custom tag..."
                className="form-control"
                value={newTagInput}
                onChange={e => setNewTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <button type="button" className="btn btn-secondary" onClick={handleAddTag} style={{ flexShrink: 0, padding: '0 16px' }}>
                <Plus size={16} /> Add
              </button>
            </div>
          </div>

          {/* Optional Receipt Checkbox */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-main)' }}>
              <input
                type="checkbox"
                checked={hasReceipt}
                onChange={e => setHasReceipt(e.target.checked)}
                style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
              />
              <span>Attach Receipt or Invoice Document</span>
            </label>

            {hasReceipt && (
              <div style={{ marginTop: '12px', padding: '16px', border: '1px dashed var(--border-glass)', borderRadius: '14px', background: 'var(--bg-app)' }}>
                <input
                  type="file"
                  accept="image/*,.pdf,.csv"
                  onChange={e => setReceiptFile(e.target.files[0] || null)}
                  style={{ display: 'block', width: '100%', fontSize: '13px', color: 'var(--text-muted)' }}
                />
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '18px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving} style={{ padding: '9px 18px' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '9px 24px' }}>
              {saving ? 'Saving...' : isEditing ? 'Update Entry' : 'Save Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
