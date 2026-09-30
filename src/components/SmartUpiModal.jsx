import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  CheckCircle2,
  Copy,
  Smartphone,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Send,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

export default function SmartUpiModal({
  isOpen,
  onClose,
  onTransactionAdded,
  token,
  userEmail
}) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('instant_paste'); // 'instant_paste' | 'auto_webhook'
  const [inputText, setInputText] = useState('');
  const [parsedTx, setParsedTx] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);
  const [webhookConfig, setWebhookConfig] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setError('');
      setSuccess('');
      // Fetch user's private webhook endpoint
      fetch('/api/user/webhook-config', {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'X-User-Email': userEmail || ''
        }
      })
        .then(r => r.json())
        .then(d => {
          if (d.webhookUrl) setWebhookConfig(d);
        })
        .catch(() => {});
    }
  }, [isOpen, token, userEmail]);

  // Live Auto-parse as user types or pastes
  useEffect(() => {
    if (!inputText.trim()) {
      setParsedTx(null);
      return;
    }

    const timer = setTimeout(async () => {
      setParsing(true);
      setError('');
      try {
        const res = await fetch('/api/transactions/parse-smart-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: inputText })
        });
        const json = await res.json();
        if (res.ok && json.parsed) {
          setParsedTx(json.parsed);
        } else {
          setParsedTx(null);
        }
      } catch (err) {
        setParsedTx(null);
      } finally {
        setParsing(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [inputText]);

  const handleSaveParsed = async () => {
    if (!parsedTx) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`,
          'X-User-Email': userEmail || ''
        },
        body: JSON.stringify(parsedTx)
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save transaction');

      setSuccess(`Saved! ₹${parsedTx.amount} to ${parsedTx.merchant}`);
      setInputText('');
      setParsedTx(null);
      if (onTransactionAdded) onTransactionAdded();
      setTimeout(() => {
        setSuccess('');
        onClose();
      }, 700);
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyWebhook = () => {
    if (webhookConfig?.webhookUrl) {
      navigator.clipboard.writeText(webhookConfig.webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const SAMPLE_MESSAGES = [
    { label: 'Tea Stall (₹10)', text: 'Sent Rs.10.00 from HDFC Bank to SHARMA TEA STALL (UPI Ref: 42358912) on 19-Aug-26. Info: Chai and biscuits.' },
    { label: 'Swiggy (₹150)', text: 'Paid ₹150 to Swiggy on Google Pay for dinner' },
    { label: 'Petrol (₹500)', text: 'Paid Rs 500 to Shell Petrol Pump on PhonePe. Note: Bike Fuel' }
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '540px',
          width: '100%',
          padding: '24px',
          borderRadius: '24px',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          border: '1px solid var(--border-glass)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7)',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '12px', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#000' }}>
              <Zap size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                Smart UPI & SMS Ingestion
              </h2>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Instant auto-tracking for GPay, PhonePe, Paytm & Bank SMS
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Tab Toggle */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', background: 'rgba(0,0,0,0.25)', padding: '4px', borderRadius: '12px' }}>
          <button
            type="button"
            className="btn"
            style={{
              flex: 1,
              fontSize: '12px',
              padding: '8px',
              borderRadius: '8px',
              background: activeTab === 'instant_paste' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'instant_paste' ? '#000' : 'var(--text-muted)',
              border: 'none'
            }}
            onClick={() => setActiveTab('instant_paste')}
          >
            <Sparkles size={14} /> Instant Paste / Voice Text
          </button>
          <button
            type="button"
            className="btn"
            style={{
              flex: 1,
              fontSize: '12px',
              padding: '8px',
              borderRadius: '8px',
              background: activeTab === 'auto_webhook' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'auto_webhook' ? '#000' : 'var(--text-muted)',
              border: 'none'
            }}
            onClick={() => setActiveTab('auto_webhook')}
          >
            <Smartphone size={14} /> Real-Time Auto Webhook
          </button>
        </div>

        {/* TAB 1: INSTANT PASTE / NATURAL LANGUAGE */}
        {activeTab === 'instant_paste' && (
          <div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Paste Bank SMS, GPay/PhonePe Message, or Natural English:
              </label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="e.g. Sent Rs.10.00 from HDFC Bank to Sharma Tea Stall. Info: Chai and biscuits"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                style={{ fontSize: '13px', lineHeight: '1.4', padding: '12px' }}
                autoFocus
              />
            </div>

            {/* Quick Sample Presets */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Try sample:</span>
              {SAMPLE_MESSAGES.map(s => (
                <button
                  key={s.label}
                  type="button"
                  className="pill"
                  style={{ fontSize: '11px', padding: '3px 8px', whiteSpace: 'nowrap', cursor: 'pointer' }}
                  onClick={() => setInputText(s.text)}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Parsing State & Structured Live Preview */}
            {parsedTx && (
              <div
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.8) 100%)',
                  border: '1px solid var(--primary)',
                  marginBottom: '16px',
                  animation: 'fadeIn 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#34D399', fontWeight: '800' }}>
                      AI Auto-Extracted Details
                    </div>
                    <div style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px' }}>
                      {parsedTx.merchant}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: parsedTx.type === 'expense' ? '#EF4444' : '#10B981' }}>
                      {parsedTx.type === 'expense' ? '-' : '+'}₹{Number(parsedTx.amount).toFixed(2)}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{parsedTx.type.toUpperCase()}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Category: </span>
                    <strong style={{ color: 'var(--text-main)' }}>{parsedTx.category}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Account: </span>
                    <strong style={{ color: 'var(--text-main)' }}>{parsedTx.account}</strong>
                  </div>
                  {parsedTx.notes && (
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Note / Info: </span>
                      <strong style={{ color: 'var(--primary)' }}>{parsedTx.notes}</strong>
                    </div>
                  )}
                  {parsedTx.upiRef && (
                    <div style={{ gridColumn: 'span 2', fontSize: '11px', color: 'var(--text-muted)' }}>
                      UPI Ref: <code style={{ color: 'var(--text-main)' }}>{parsedTx.upiRef}</code>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '14px', padding: '10px', fontSize: '13px', fontWeight: '800' }}
                  onClick={handleSaveParsed}
                  disabled={saving}
                >
                  <CheckCircle2 size={16} /> {saving ? 'Saving...' : 'Confirm & Log to Transactions'}
                </button>
              </div>
            )}

            {error && (
              <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.15)', color: '#FCA5A5', border: '1px solid #EF4444', borderRadius: '12px', marginBottom: '14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={15} /> {error}
              </div>
            )}

            {success && (
              <div style={{ padding: '10px 14px', background: 'var(--success-light)', color: 'var(--success)', borderRadius: '12px', marginBottom: '14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={15} /> {success}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: AUTOMATED BACKGROUND WEBHOOK SETUP */}
        {activeTab === 'auto_webhook' && (
          <div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '16px' }}>
              Want every ₹10 payment outside to log <strong>100% automatically in the background</strong> without touching the app? Connect your private webhook:
            </p>

            {/* Webhook Endpoint Box */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Your Private Webhook URL:
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  readOnly
                  className="form-control"
                  value={webhookConfig?.webhookUrl || 'Loading webhook endpoint...'}
                  style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--primary)' }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleCopyWebhook}
                  style={{ flexShrink: 0 }}
                >
                  <Copy size={14} /> {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            {/* 3-Step Setup Guide */}
            <div style={{ padding: '16px', borderRadius: '16px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', fontSize: '12px', lineHeight: '1.6' }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: 'var(--text-main)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Smartphone size={16} style={{ color: 'var(--primary)' }} /> 1-Minute Android Auto-Sync Setup:
              </div>
              <ol style={{ paddingLeft: '18px', margin: 0, color: 'var(--text-muted)' }}>
                <li>Install <strong>MacroDroid</strong> or <strong>Tasker</strong> from Google Play Store (Free).</li>
                <li>Set Trigger: <strong>SMS Received</strong> (Select Bank/UPI senders like HDFC, SBI, ICICI, GPAY, PAYTM).</li>
                <li>Set Action: <strong>HTTP Request (POST)</strong> to your Webhook URL above.</li>
                <li>Request Body: <code>{`{ "rawText": "{sms_body}" }`}</code></li>
                <li><strong>Done!</strong> Whenever you pay ₹10 at any shop, it instantly appears in Kuberis!</li>
              </ol>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px', paddingTop: '14px', borderTop: '1px solid var(--border-color)' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
