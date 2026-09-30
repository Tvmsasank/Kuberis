import React, { useState } from 'react';
import { RefreshCw, Check, EyeOff, Plus, Trash2, Calendar, Sparkles } from 'lucide-react';
import { detectRecurring } from '../utils/recurringEngine';
import ConfirmDeleteModal from './ConfirmDeleteModal';

export default function RecurringTab({
  transactions = [],
  settings = {},
  onConfirmRecurring,
  onIgnoreSuggestion,
  onAddManualRecurring,
  onDeleteRecurring
}) {
  const { recurring = [], dismissedPatterns = [] } = settings;

  // Run detection engine on expense transactions
  const suggestions = detectRecurring(transactions, dismissedPatterns).filter(s => s.type === 'recurring');

  // Combined totals (confirmed + suggestions)
  const confirmedMonthly = recurring.reduce((sum, r) => sum + calcMonthly(r.amount, r.cadence), 0);
  const sugMonthly = suggestions.reduce((sum, s) => sum + s.monthlyEquivalent, 0);
  const totalMonthly = confirmedMonthly + sugMonthly;
  const totalAnnual = totalMonthly * 12;

  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [newMerchant, setNewMerchant] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCadence, setNewCadence] = useState('monthly');
  const [newCategory, setNewCategory] = useState('Utilities');
  const [nextDate, setNextDate] = useState(new Date().toISOString().split('T')[0]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const amt = parseFloat(newAmount);
    if (!newMerchant.trim() || isNaN(amt) || amt <= 0) return;

    onAddManualRecurring({
      id: `rec_${Date.now()}`,
      merchant: newMerchant.trim(),
      amount: amt,
      cadence: newCadence,
      category: newCategory,
      nextDate,
      active: true
    });

    setNewMerchant('');
    setNewAmount('');
    setShowAddModal(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Recurring Bills & Expenses</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Automated cadence detection and recurring bill tracking</p>
        </div>

        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> Add Recurring Payment
        </button>
      </div>

      {/* Active Detection Banner */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #7C6EE6 0%, #4F46E5 100%)', color: 'white', marginBottom: '24px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <Sparkles size={22} style={{ color: '#FDE047' }} />
          <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Active Recurring Detection Engine</h3>
        </div>
        <p style={{ fontSize: '13px', opacity: 0.9 }}>
          Kuberis automatically normalizes merchants, evaluates interval windows (weekly to annual), and suggests recurring bills without false positives.
        </p>
      </div>

      {/* Combined Commitment Summary Cards */}
      <div className="grid-2" style={{ marginBottom: '28px' }}>
        <div className="card">
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Estimated Monthly Commitment</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--primary)' }}>
            ₹{totalMonthly.toFixed(2)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Confirmed: ₹{confirmedMonthly.toFixed(2)} / mo • Detected: ₹{sugMonthly.toFixed(2)} / mo
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Estimated Annual Commitment</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-main)' }}>
            ₹{totalAnnual.toFixed(2)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Extrapolated 12-month recurring obligation
          </div>
        </div>
      </div>

      {/* Detected Suggestions Panel */}
      {suggestions.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RefreshCw size={18} style={{ color: 'var(--primary)' }} />
            Detected Suggestions ({suggestions.length})
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {suggestions.map(sug => (
              <div key={sug.id} className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: '700' }}>{sug.merchant}</h4>
                    <span className="badge badge-info" style={{ marginTop: '4px' }}>{sug.cadence}</span>
                  </div>
                  <span className={`badge ${sug.confidence === 'High' ? 'badge-success' : 'badge-warning'}`}>
                    {sug.confidence} Confidence
                  </span>
                </div>

                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                  <div>Avg amount: <strong>₹{sug.averageAmount.toFixed(2)}</strong></div>
                  <div>Monthly equiv: <strong>₹{sug.monthlyEquivalent.toFixed(2)}</strong></div>
                  <div>Occurrences: {sug.occurrenceCount} • Next: {sug.nextDate}</div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => onConfirmRecurring(sug)}
                  >
                    <Check size={14} /> Keep
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => onIgnoreSuggestion(sug.patternKey)}
                  >
                    <EyeOff size={14} /> Ignore
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmed Recurring Payment List */}
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '14px' }}>
          Confirmed Recurring Payments ({recurring.length})
        </h3>

        {recurring.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Merchant / Service</th>
                  <th>Category</th>
                  <th>Cadence</th>
                  <th>Next Date</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recurring.map(rec => (
                  <tr key={rec.id}>
                    <td style={{ fontWeight: '600' }}>{rec.merchant}</td>
                    <td><span className="badge badge-secondary">{rec.category}</span></td>
                    <td style={{ textTransform: 'capitalize' }}>{rec.cadence}</td>
                    <td>{rec.nextDate || 'N/A'}</td>
                    <td style={{ textAlign: 'right', fontWeight: '700' }}>₹{Number(rec.amount).toFixed(2)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => setDeleteTarget(rec)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon"><Calendar size={28} /></div>
            <div className="empty-state-title">No Confirmed Recurring Payments</div>
            <div className="empty-state-text">
              Keep a detected suggestion above or manually add a recurring expense.
            </div>
          </div>
        )}
      </div>

      {/* Manual Add Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h2>Add Recurring Payment</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}><RefreshCw size={18} /></button>
            </div>
            <form onSubmit={handleManualSubmit}>
              <div className="form-group">
                <label className="form-label">Merchant / Payee Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Electricity Bill, Rent"
                  value={newMerchant}
                  onChange={e => setNewMerchant(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="1500.00"
                    value={newAmount}
                    onChange={e => setNewAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Cadence</label>
                  <select className="form-control" value={newCadence} onChange={e => setNewCadence(e.target.value)}>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Next Expected Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={nextDate}
                  onChange={e => setNextDate(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Recurring Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Recurring Payment"
        message={`Are you sure you want to delete recurring payment "${deleteTarget?.merchant}"?`}
        itemDetails={deleteTarget ? { merchant: deleteTarget.merchant, amount: `₹${deleteTarget.amount}`, cadence: deleteTarget.cadence } : null}
        onConfirm={() => {
          if (deleteTarget) onDeleteRecurring(deleteTarget.id);
        }}
      />
    </div>
  );
}

function calcMonthly(amount, cadence) {
  const amt = Number(amount) || 0;
  if (cadence === 'weekly') return (amt * 52) / 12;
  if (cadence === 'biweekly') return (amt * 26) / 12;
  if (cadence === 'monthly') return amt;
  if (cadence === 'quarterly') return amt / 3;
  if (cadence === 'annual') return amt / 12;
  return amt;
}
