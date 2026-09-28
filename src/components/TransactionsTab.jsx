import React, { useState } from 'react';
import { Search, Filter, Plus, FileText, Trash2, Tag, ChevronDown, Edit3, Zap, Sparkles, Landmark } from 'lucide-react';
import ConfirmDeleteTxModal from './ConfirmDeleteTxModal';

export default function TransactionsTab({
  transactions = [],
  categories = [],
  accounts = [],
  allTags = [],
  selectedPeriod,
  onPeriodChange,
  onUpdateCategory,
  onUpdateTags,
  onDeleteTransaction,
  onOpenAddEntry,
  onOpenEditEntry,
  onOpenTagModal,
  onOpenSmartUpi,
  onOpenAaModal
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [deleteTargetTx, setDeleteTargetTx] = useState(null);

  // Filter transactions by period, search, account, and category
  const filtered = filterTransactions(transactions, selectedPeriod, searchQuery, selectedAccount, selectedCategory);

  const handleRemoveTag = (tx, tagToRemove) => {
    const currentTags = parseTags(tx.tags);
    const newTags = currentTags.filter(t => t !== tagToRemove);
    onUpdateTags(tx.id, newTags);
  };

  const handleConfirmDelete = () => {
    if (deleteTargetTx) {
      onDeleteTransaction(deleteTargetTx.id);
      setDeleteTargetTx(null);
    }
  };

  return (
    <div>
      {/* Top Controls Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '800' }}>Transactions</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Search, filter, and real-time bank sync</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', maxWidth: '100%' }}>
          <div className="period-selector">
            {[
              { id: 'all-time', label: 'All time' },
              { id: 'this-month', label: 'This month' },
              { id: 'last-month', label: 'Last month' },
              { id: 'last-3-months', label: 'Last 3 months' },
              { id: 'last-6-months', label: 'Last 6 months' },
              { id: 'this-year', label: 'This year' }
            ].map(p => (
              <button
                key={p.id}
                className={`period-btn ${selectedPeriod === p.id ? 'active' : ''}`}
                onClick={() => onPeriodChange(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            className="btn btn-secondary"
            disabled
            style={{
              fontSize: '13px',
              gap: '6px',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              background: 'rgba(255, 255, 255, 0.04)',
              opacity: 0.5,
              cursor: 'not-allowed'
            }}
            title="Bank Sync (Coming Soon)"
          >
            <Landmark size={15} /> <span>Bank Sync (AA)</span>
          </button>

          <button
            className="btn btn-secondary"
            disabled
            style={{
              fontSize: '13px',
              gap: '6px',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              background: 'rgba(255, 255, 255, 0.04)',
              opacity: 0.5,
              cursor: 'not-allowed'
            }}
            title="Smart UPI / SMS (Coming Soon)"
          >
            <Zap size={15} /> <span>Smart UPI / SMS</span>
          </button>

          <button className="btn btn-primary" onClick={onOpenAddEntry} style={{ fontSize: '13px' }}>
            <Plus size={16} /> Add Entry
          </button>
        </div>
      </div>

      {/* Smart UPI & Bank Sync Banner Bar (Coming Soon) */}
      <div
        style={{
          padding: '12px 16px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(10, 25, 47, 0.5) 100%)',
          border: '1px solid var(--border-glass)',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          opacity: 0.8
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-muted)' }}>
            <Sparkles size={16} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
              Bank & UPI Auto-Tracking <span style={{ fontSize: '10px', padding: '2px 6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '6px', color: 'var(--text-muted)', marginLeft: '6px' }}>Upcoming</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Official RBI Account Aggregator & Smart UPI SMS automation engine
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled
            style={{ fontSize: '11px', padding: '6px 10px', borderRadius: '8px', gap: '4px', opacity: 0.5, cursor: 'not-allowed' }}
            title="Coming Soon"
          >
            <Landmark size={13} /> Link Bank Account →
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled
            style={{ fontSize: '11px', padding: '6px 10px', borderRadius: '8px', gap: '4px', opacity: 0.5, cursor: 'not-allowed' }}
            title="Coming Soon"
          >
            <Zap size={13} /> Paste SMS
          </button>
        </div>
      </div>

      {/* Filter Controls Card */}
      <div className="card" style={{ marginBottom: '20px', padding: '14px' }}>
        <div className="transaction-filter-grid">
          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search merchant, category, or tag..."
              className="form-control"
              style={{ paddingLeft: '36px' }}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Account Filter */}
          <select className="form-control" value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}>
            <option value="">All Accounts</option>
            {accounts.map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          {/* Category Filter */}
          <select className="form-control" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Transactions Output */}
      {filtered.length > 0 ? (
        <>
          {/* Desktop Table View */}
          <div className="table-container desktop-table-view card-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ borderTopLeftRadius: '16px' }}>Date & Merchant</th>
                  <th>Category (Inline edit)</th>
                  <th>Account</th>
                  <th>Tags</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'center', borderTopRightRadius: '16px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(tx => {
                  const txTags = parseTags(tx.tags);
                  return (
                    <tr key={tx.id}>
                      {/* Merchant & Date */}
                      <td>
                        <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {tx.merchant}
                          {tx.receipt === 1 && (
                            <span title="Receipt Attached" style={{ color: 'var(--primary)', display: 'inline-flex' }}>
                              <FileText size={14} />
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{tx.date} • <span style={{ textTransform: 'capitalize' }}>{tx.source || 'Manual'}</span></div>
                      </td>

                      {/* Inline Category Editor Dropdown */}
                      <td>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <select
                            className="form-control"
                            style={{
                              padding: '4px 24px 4px 10px',
                              minHeight: '32px',
                              fontSize: '13px',
                              fontWeight: '500',
                              borderRadius: 'var(--radius-sm)',
                              background: tx.category === 'Needs review' ? 'var(--warning-light)' : 'var(--bg-app)',
                              borderColor: tx.category === 'Needs review' ? 'var(--warning)' : 'var(--border-color)',
                              color: tx.category === 'Needs review' ? 'var(--warning)' : 'var(--text-main)'
                            }}
                            value={tx.category}
                            onChange={e => onUpdateCategory(tx.id, e.target.value)}
                          >
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </td>

                      {/* Account */}
                      <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        {tx.account}
                      </td>

                      {/* Inline Tag Pills + Add Tag Button */}
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px' }}>
                          {txTags.map(tag => (
                            <span
                              key={tag}
                              className="pill"
                              style={{ cursor: 'pointer', padding: '2px 8px', fontSize: '11px' }}
                              title="Click to remove tag"
                              onClick={() => handleRemoveTag(tx, tag)}
                            >
                              {tag} ×
                            </span>
                          ))}
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '2px 6px', minHeight: '26px', fontSize: '12px' }}
                            title="Add tag"
                            onClick={() => onOpenTagModal(tx)}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </td>

                      {/* Amount */}
                      <td style={{ textAlign: 'right', fontWeight: '700', fontSize: '15px', color: tx.type === 'income' ? 'var(--success)' : 'var(--text-main)' }}>
                        {tx.type === 'income' ? '+' : '-'}₹{Math.abs(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Actions: Edit Pencil & Delete Trash Icons */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '6px', color: 'var(--primary)' }}
                            title="Edit Full Entry"
                            onClick={() => onOpenEditEntry && onOpenEditEntry(tx)}
                          >
                            <Edit3 size={16} />
                          </button>

                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '6px', color: 'var(--danger)' }}
                            title="Delete Transaction"
                            onClick={() => setDeleteTargetTx(tx)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Transaction Cards View */}
          <div className="mobile-cards-view">
            {filtered.map(tx => {
              const txTags = parseTags(tx.tags);
              return (
                <div key={tx.id} className="card" style={{ padding: '14px', marginBottom: '10px' }}>
                  {/* Top Row: Merchant + Amount + Edit + Delete */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ minWidth: 0, flex: 1, paddingRight: '8px' }}>
                      <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <span>{tx.merchant}</span>
                        {tx.receipt === 1 && <FileText size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {tx.date} • <span style={{ textTransform: 'capitalize' }}>{tx.source}</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <div style={{ fontWeight: '800', fontSize: '16px', color: tx.type === 'income' ? 'var(--success)' : 'var(--text-main)' }}>
                        {tx.type === 'income' ? '+' : '-'}₹{Math.abs(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>

                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--primary)', padding: '4px' }}
                        title="Edit Entry"
                        onClick={() => onOpenEditEntry && onOpenEditEntry(tx)}
                      >
                        <Edit3 size={16} />
                      </button>

                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--danger)', padding: '4px' }}
                        title="Delete Entry"
                        onClick={() => setDeleteTargetTx(tx)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Middle Row: Category Select + Account Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                    <select
                      className="form-control"
                      style={{
                        padding: '4px 10px',
                        minHeight: '32px',
                        fontSize: '12px',
                        fontWeight: '600',
                        borderRadius: 'var(--radius-sm)',
                        flex: 1,
                        background: tx.category === 'Needs review' ? 'var(--warning-light)' : 'var(--bg-app)',
                        borderColor: tx.category === 'Needs review' ? 'var(--warning)' : 'var(--border-color)',
                        color: tx.category === 'Needs review' ? 'var(--warning)' : 'var(--text-main)'
                      }}
                      value={tx.category}
                      onChange={e => onUpdateCategory(tx.id, e.target.value)}
                    >
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <span className="badge badge-secondary" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                      {tx.account}
                    </span>
                  </div>

                  {/* Bottom Row: Tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px' }}>
                    {txTags.map(tag => (
                      <span key={tag} className="pill" style={{ cursor: 'pointer', padding: '2px 8px', fontSize: '11px' }} onClick={() => handleRemoveTag(tx, tag)}>
                        {tag} ×
                      </span>
                    ))}
                    <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', minHeight: '24px', fontSize: '11px' }} onClick={() => onOpenTagModal(tx)}>
                      <Plus size={12} /> Tag
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="card empty-state" style={{ padding: '48px 20px' }}>
          <div className="empty-state-icon"><Filter size={32} /></div>
          <div className="empty-state-title">No transactions found</div>
          <div className="empty-state-text">No records match your selected filters or period.</div>
          <button className="btn btn-primary btn-sm" onClick={onOpenAddEntry}>
            <Plus size={14} /> Add Transaction
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteTxModal
        isOpen={!!deleteTargetTx}
        onClose={() => setDeleteTargetTx(null)}
        onConfirm={handleConfirmDelete}
        transaction={deleteTargetTx}
      />
    </div>
  );
}

// Helpers
function parseTags(tagsVal) {
  if (!tagsVal) return [];
  if (Array.isArray(tagsVal)) return tagsVal;
  try {
    const parsed = JSON.parse(tagsVal);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function filterTransactions(transactions, period, searchQuery, account, category) {
  const now = new Date();
  const lowerSearch = searchQuery.toLowerCase().trim();

  // Deterministic 3-Tier Sort: Primary Date Desc, Secondary Created Timestamp Desc, Tertiary ID Desc
  const sortedInput = [...transactions].sort((a, b) => {
    const dateDiff = new Date(b.date || 0) - new Date(a.date || 0);
    if (dateDiff !== 0) return dateDiff;

    const createdA = new Date(a.createdAt || 0).getTime();
    const createdB = new Date(b.createdAt || 0).getTime();
    if (createdB !== createdA) return createdB - createdA;

    return String(b.id).localeCompare(String(a.id));
  });

  return sortedInput.filter(tx => {
    const txDate = new Date(tx.date);

    // Period filter
    if (period === 'this-month') {
      if (txDate.getMonth() !== now.getMonth() || txDate.getFullYear() !== now.getFullYear()) return false;
    } else if (period === 'last-month') {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      if (txDate.getMonth() !== lm.getMonth() || txDate.getFullYear() !== lm.getFullYear()) return false;
    } else if (period === 'last-3-months') {
      const l3m = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      if (txDate < l3m) return false;
    } else if (period === 'last-6-months') {
      const l6m = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      if (txDate < l6m) return false;
    } else if (period === 'this-year') {
      if (txDate.getFullYear() !== now.getFullYear()) return false;
    }

    // Account filter
    if (account && tx.account !== account) return false;

    // Category filter
    if (category && tx.category !== category) return false;

    // Search query (Merchant, Category, Tags)
    if (lowerSearch) {
      const tagsStr = parseTags(tx.tags).join(' ').toLowerCase();
      const matchMerchant = (tx.merchant || '').toLowerCase().includes(lowerSearch);
      const matchCategory = (tx.category || '').toLowerCase().includes(lowerSearch);
      const matchTags = tagsStr.includes(lowerSearch);
      if (!matchMerchant && !matchCategory && !matchTags) return false;
    }

    return true;
  });
}
