import React, { useState } from 'react';
import { CreditCard, Plus, Check, EyeOff, Trash2, ShieldCheck, Bell, Mail, AlertTriangle, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { detectRecurring } from '../utils/recurringEngine';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import CustomSelect from './CustomSelect';

export default function SubscriptionsTab({
  transactions = [],
  settings = {},
  onConfirmSubscription,
  onIgnoreSuggestion,
  onAddManualSubscription,
  onDeleteSubscription,
  token,
  user
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
  const [testingAlerts, setTestingAlerts] = useState(false);
  const [alertFeedback, setAlertFeedback] = useState('');

  // Calculate days left for any renewal date
  const getDaysLeft = (dateStr) => {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return null;
    const renewal = new Date(year, month - 1, day);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = Math.round((renewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // Trigger manual reminder scan & test
  const handleTriggerEmailScan = async () => {
    setTestingAlerts(true);
    setAlertFeedback('');
    try {
      const activeToken = token || localStorage.getItem('kuberis_token') || sessionStorage.getItem('kuberis_token');
      const res = await fetch('/api/subscriptions/trigger-reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': activeToken ? `Bearer ${activeToken}` : ''
        }
      });
      const data = await res.json();
      if (res.ok) {
        setAlertFeedback(
          data.result?.dispatchedCount > 0 
            ? `Dispatched ${data.result.dispatchedCount} renewal reminder email(s) to ${user?.email || 'your email'}!`
            : `All subscriptions are healthy. Any subscription within 2 days of renewal will receive automated emails!`
        );
      } else {
        setAlertFeedback(data.error || 'Failed to check reminders');
      }
    } catch (e) {
      setAlertFeedback('Network error testing renewal reminders.');
    } finally {
      setTestingAlerts(false);
      setTimeout(() => setAlertFeedback(''), 6000);
    }
  };

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
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Detect and track SaaS, streaming, and membership services with automated alerts</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            className="btn btn-secondary"
            onClick={handleTriggerEmailScan}
            disabled={testingAlerts}
            title="Scan upcoming renewals and send email alerts for services renewing within 2 days"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            {testingAlerts ? (
              <span className="spinner-border spinner-border-sm" role="status" style={{ width: 14, height: 14, borderWidth: 2 }} />
            ) : (
              <Mail size={16} style={{ color: '#38bdf8' }} />
            )}
            {testingAlerts ? 'Checking Alerts...' : 'Test Renewal Alerts'}
          </button>

          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Add Subscription
          </button>
        </div>
      </div>

      {/* Proactive 2-Day Prior Email Reminder Banner */}
      <div style={{
        background: 'rgba(56, 189, 248, 0.08)',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: '14px',
        padding: '14px 18px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px'
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'rgba(56, 189, 248, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#38bdf8',
          flexShrink: 0
        }}>
          <Bell size={18} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: '700', fontSize: '13.5px', color: 'var(--text-main)' }}>
              ⚡ Automated 2-Day Prior Email Reminders
            </span>
            <span className="badge badge-success" style={{ fontSize: '10px', padding: '2px 8px' }}>
              Active
            </span>
          </div>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: '1.5' }}>
            Kuberis automatically scans your subscriptions and dispatches an email alert to <strong>{user?.email || 'your registered email'}</strong> starting <strong>2 days before</strong> any renewal or expiry date, including a reminder to ignore if already paid.
          </p>
          {alertFeedback && (
            <div style={{
              marginTop: '10px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: alertFeedback.includes('Dispatched') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
              border: alertFeedback.includes('Dispatched') ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(56, 189, 248, 0.3)',
              color: alertFeedback.includes('Dispatched') ? '#10b981' : '#38bdf8',
              fontSize: '12px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <CheckCircle2 size={14} />
              {alertFeedback}
            </div>
          )}
        </div>
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
                {subscriptions.map(sub => {
                  const renewalDate = sub.nextRenewalDate || sub.nextDate;
                  const daysLeft = getDaysLeft(renewalDate);
                  return (
                    <tr key={sub.id}>
                      <td style={{ fontWeight: '600' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CreditCard size={15} style={{ color: 'var(--primary)' }} />
                          {sub.serviceName || sub.merchant}
                        </div>
                      </td>
                      <td><span className="badge badge-secondary">{sub.category || 'Subscriptions'}</span></td>
                      <td style={{ textTransform: 'capitalize' }}>{sub.cadence}</td>
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span>{renewalDate || 'N/A'}</span>
                          {daysLeft !== null && (
                            daysLeft < 0 ? (
                              <span className="badge badge-secondary" style={{ fontSize: '10.5px' }}>Past Due</span>
                            ) : daysLeft === 0 ? (
                              <span className="badge badge-danger" style={{ fontSize: '10.5px', display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                <AlertTriangle size={11} /> Renews Today
                              </span>
                            ) : daysLeft === 1 ? (
                              <span className="badge badge-warning" style={{ fontSize: '10.5px', display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                                <Clock size={11} /> Renews Tomorrow
                              </span>
                            ) : daysLeft === 2 ? (
                              <span className="badge" style={{ fontSize: '10.5px', display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(234, 179, 8, 0.15)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                                <Mail size={11} /> Renews in 2 Days (Alert Active)
                              </span>
                            ) : (
                              <span className="badge badge-secondary" style={{ fontSize: '10.5px' }}>
                                In {daysLeft} days
                              </span>
                            )
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '700' }}>₹{Number(sub.amount).toFixed(2)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => setDeleteTarget(sub)}
                          title="Delete Subscription"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
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
                <label className="form-label">Next Renewal / Expiry Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={nextRenewalDate}
                  onChange={e => setNextRenewalDate(e.target.value)}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  💡 Kuberis will automatically email you 2 days prior to this renewal date.
                </span>
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
