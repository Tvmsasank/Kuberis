import React, { useState } from 'react';
import { CreditCard, Plus, Check, EyeOff, Trash2, ShieldCheck } from 'lucide-react';
import { detectRecurring } from '../utils/recurringEngine';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import CustomSelect from './CustomSelect';

export default function SubscriptionsTab({
  transactions = [],
  settings = {},
  onConfirmSubscription,
  onIgnoreSuggestion,
  onAddManualSubscription,
  onDeleteSubscription
}) {
  const { subscriptions = [], dismissedPatterns = [] } = settings;

  // Run detection engine for subscription candidates
  const suggestions = detectRecurring(transactions, dismissedPatterns).filter(s => s.type === 'subscription');

  // Combined totals
  const confirmedMonthly = subscriptions.reduce((sum, s) => sum + calcMonthly(s.amount, s.cadence), 0);
  const sugMonthly = suggestions.reduce((sum, s) => sum + s.monthlyEquivalent, 0);
  const totalMonthly = confirmedMonthly + sugMonthly;
  const totalAnnual = totalMonthly * 12;

  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [serviceName, setServiceName] = useState('');
  const [amount, setAmount] = useState('');
  const [cadence, setCadence] = useState('monthly');
  const [category, setCategory] = useState('Subscriptions');
  const [nextRenewalDate, setNextRenewalDate] = useState(new Date().toISOString().split('T')[0]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!serviceName.trim() || isNaN(amt) || amt <= 0) return;

    onAddManualSubscription({
      id: `sub_${Date.now()}`,
      serviceName: serviceName.trim(),
      amount: amt,
      cadence,
      category,
      nextRenewalDate,
      active: true
    });

    setServiceName('');
    setAmount('');
    setShowAddModal(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Active Subscriptions</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Detect and track SaaS, streaming, and membership services</p>
        </div>

        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> Add Subscription
        </button>
      </div>

      {/* Subscription Totals */}
      <div className="grid-2" style={{ marginBottom: '28px' }}>
        <div className="card">
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Monthly Subscriptions Spend</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--primary)' }}>
            ₹{totalMonthly.toFixed(2)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Confirmed: ₹{confirmedMonthly.toFixed(2)} / mo • Detected: ₹{sugMonthly.toFixed(2)} / mo
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Annual Subscriptions Spend</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-main)' }}>
            ₹{totalAnnual.toFixed(2)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Total yearly recurring digital service commitment
          </div>
        </div>
      </div>

      {/* Detected Subscription Suggestions */}
      {suggestions.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={18} style={{ color: 'var(--primary)' }} />
            Detected Subscription Candidates ({suggestions.length})
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {suggestions.map(sug => (
              <div key={sug.id} className="card" style={{ borderLeft: '4px solid var(--success)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: '700' }}>{sug.merchant}</h4>
                    <span className="badge badge-success" style={{ marginTop: '4px' }}>{sug.cadence}</span>
                  </div>
                  <span className={`badge ${sug.confidence === 'High' ? 'badge-success' : 'badge-warning'}`}>
                    {sug.confidence} Confidence
                  </span>
                </div>

                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                  <div>Average charge: <strong>₹{sug.averageAmount.toFixed(2)}</strong></div>
                  <div>Next expected renewal: {sug.nextDate}</div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => onConfirmSubscription(sug)}
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

      {/* Confirmed Subscriptions List */}
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '14px' }}>
          Confirmed Subscriptions ({subscriptions.length})
        </h3>

        {subscriptions.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Service Name</th>
                  <th>Category</th>
                  <th>Cadence</th>
                  <th>Next Renewal</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map(sub => (
                  <tr key={sub.id}>
                    <td style={{ fontWeight: '600' }}>{sub.serviceName || sub.merchant}</td>
                    <td><span className="badge badge-secondary">{sub.category || 'Subscriptions'}</span></td>
                    <td style={{ textTransform: 'capitalize' }}>{sub.cadence}</td>
                    <td>{sub.nextRenewalDate || sub.nextDate || 'N/A'}</td>
                    <td style={{ textAlign: 'right', fontWeight: '700' }}>₹{Number(sub.amount).toFixed(2)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => setDeleteTarget(sub)}
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
            <div className="empty-state-icon"><ShieldCheck size={28} /></div>
            <div className="empty-state-title">No Confirmed Subscriptions</div>
            <div className="empty-state-text">
              Track active digital services by keeping detected candidates or adding a subscription.
            </div>
          </div>
        )}
      </div>

      {/* Manual Add Subscription Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h2>Add Subscription</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}><CreditCard size={18} /></button>
            </div>
            <form onSubmit={handleManualSubmit}>
              <div className="form-group">
                <label className="form-label">Service / Provider Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Netflix, ChatGPT Plus, Spotify"
                  value={serviceName}
                  onChange={e => setServiceName(e.target.value)}
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
                    placeholder="649.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Cadence</label>
                  <CustomSelect
                    value={cadence}
                    onChange={e => setCadence(e.target.value)}
                    options={[
                      { value: 'monthly', label: 'Monthly' },
                      { value: 'annual', label: 'Annual' },
                      { value: 'weekly', label: 'Weekly' }
                    ]}
                    size="md"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Next Renewal Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={nextRenewalDate}
                  onChange={e => setNextRenewalDate(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Subscription</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Subscription"
        message={`Are you sure you want to delete subscription "${deleteTarget?.serviceName || deleteTarget?.merchant}"?`}
        itemDetails={deleteTarget ? { service: deleteTarget.serviceName || deleteTarget.merchant, amount: `₹${deleteTarget.amount}`, cadence: deleteTarget.cadence } : null}
        onConfirm={() => {
          if (deleteTarget) onDeleteSubscription(deleteTarget.id);
        }}
      />
    </div>
  );
}

function calcMonthly(amount, cadence) {
  const amt = Number(amount) || 0;
  if (cadence === 'weekly') return (amt * 52) / 12;
  if (cadence === 'monthly') return amt;
  if (cadence === 'annual') return amt / 12;
  return amt;
}
