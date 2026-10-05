import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Search, Plus, Check, Landmark, Coins, ShieldCheck, Building2 } from 'lucide-react';
import CustomSelect from './CustomSelect';

const INVESTMENT_TYPES = [
  { value: 'stock', label: 'Equity Stock (NSE / BSE)', icon: TrendingUp },
  { value: 'mutual_fund', label: 'Mutual Fund (AMFI NAV)', icon: Landmark },
  { value: 'crypto', label: 'Cryptocurrency (Coins & Tokens)', icon: Coins },
  { value: 'gold', label: 'Gold & Precious Metals', icon: Coins },
  { value: 'fd', label: 'Fixed Deposit / Bond', icon: ShieldCheck },
  { value: 'other', label: 'Other Asset / Real Estate', icon: Building2 },
];

const POPULAR_SUGGESTIONS = [
  { name: 'Canara Bank (NSE)', symbol: 'CANBK.NS', type: 'stock', defaultPrice: 131.70 },
  { name: 'Reliance (NSE)', symbol: 'RELIANCE.NS', type: 'stock', defaultPrice: 2950 },
  { name: 'BSE Ltd (Exchange)', symbol: 'BSE.NS', type: 'stock', defaultPrice: 2850 },
  { name: 'Delta Corp (BSE)', symbol: 'DELTA.BO', type: 'stock', defaultPrice: 118.50 },
  { name: 'Tata Motors (Commercial)', symbol: 'TMCV.NS', type: 'stock', defaultPrice: 468.90 },
  { name: 'Tata Motors (Passenger)', symbol: 'TMPV.NS', type: 'stock', defaultPrice: 330.20 },
  { name: 'Infosys Ltd', symbol: 'INFY.NS', type: 'stock', defaultPrice: 1820 },
  { name: 'HDFC Bank Ltd', symbol: 'HDFCBANK.NS', type: 'stock', defaultPrice: 1650 },
  { name: 'Bitcoin (BTC)', symbol: 'BTC-INR', type: 'crypto', defaultPrice: 6071000 },
  { name: 'Ethereum (ETH)', symbol: 'ETH-INR', type: 'crypto', defaultPrice: 181700 },
  { name: 'Parag Parikh Flexi Cap Direct Fund', symbol: '122639', type: 'mutual_fund', defaultPrice: 92.83 },
  { name: 'Nippon India Multi Asset Direct Fund', symbol: '148457', type: 'mutual_fund', defaultPrice: 27.22 },
  { name: 'Sovereign Gold Bond (SGB)', symbol: 'SGB', type: 'gold', defaultPrice: 7250 }
];

export default function AddInvestmentModal({
  isOpen,
  onClose,
  onSave,
  editInvestment = null
}) {
  if (!isOpen) return null;

  const isEditing = !!editInvestment;

  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [type, setType] = useState('stock');
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editInvestment) {
      setName(editInvestment.name || '');
      setSymbol(editInvestment.symbol || '');
      setType(editInvestment.type || 'stock');
      setQuantity(editInvestment.quantity ? String(editInvestment.quantity) : '1');
      setBuyPrice(editInvestment.buyPrice ? String(editInvestment.buyPrice) : '');
      setCurrentPrice(editInvestment.currentPrice ? String(editInvestment.currentPrice) : '');
      setNotes(editInvestment.notes || '');
    } else {
      setName('');
      setSymbol('');
      setType('stock');
      setQuantity('1');
      setBuyPrice('');
      setCurrentPrice('');
      setNotes('');
    }
    setError('');
  }, [editInvestment, isOpen]);

  const handleSelectSuggestion = (sug) => {
    setName(sug.name);
    setSymbol(sug.symbol);
    setType(sug.type);
    if (!buyPrice) setBuyPrice(String(sug.defaultPrice));
    if (!currentPrice) setCurrentPrice(String(sug.defaultPrice));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter asset or company name.');
      return;
    }

    const qty = Math.abs(parseFloat(quantity));
    if (isNaN(qty) || qty <= 0) {
      setError('Please enter a valid quantity or units held.');
      return;
    }

    const buy = Math.abs(parseFloat(buyPrice));
    if (isNaN(buy) || buy < 0) {
      setError('Please enter buy price per unit.');
      return;
    }

    const cur = currentPrice ? Math.abs(parseFloat(currentPrice)) : buy;

    setSaving(true);
    try {
      await onSave({
        ...(isEditing ? { id: editInvestment.id } : {}),
        name: name.trim(),
        symbol: symbol.trim(),
        type,
        quantity: qty,
        buyPrice: buy,
        currentPrice: cur,
        notes: notes.trim()
      });
      setSaving(false);
      onClose();
    } catch (err) {
      setSaving(false);
      setError(err.message || 'Failed to save investment holding');
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', width: '100%', boxSizing: 'border-box' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={20} style={{ color: 'var(--primary)' }} />
            <h2>{isEditing ? 'Edit Investment Holding' : 'Add Investment Holding'}</h2>
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

        <form onSubmit={handleSubmit}>
          {/* Quick Preset Selector */}
          {!isEditing && (
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Quick Select Popular Assets</label>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px', scrollbarWidth: 'thin' }}>
                {POPULAR_SUGGESTIONS.map(s => (
                  <button
                    key={s.symbol}
                    type="button"
                    className="pill"
                    style={{
                      fontSize: '11px',
                      whiteSpace: 'nowrap',
                      background: symbol === s.symbol ? 'var(--primary-light)' : 'var(--bg-app)',
                      borderColor: symbol === s.symbol ? 'var(--primary)' : 'var(--border-color)',
                      color: symbol === s.symbol ? 'var(--primary)' : 'var(--text-muted)'
                    }}
                    onClick={() => handleSelectSuggestion(s)}
                  >
                    {s.name.split(' ')[0]} ({s.symbol})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Asset Type */}
          <div className="form-group">
            <label className="form-label">Asset Category</label>
            <CustomSelect
              value={type}
              onChange={e => setType(e.target.value)}
              options={INVESTMENT_TYPES}
              size="md"
            />
          </div>

          {/* Name & Ticker */}
          <div className="settings-grid-2">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Asset Name</label>
              <input
                type="text"
                placeholder={type === 'crypto' ? 'e.g. Bitcoin, Ethereum' : 'e.g. Reliance, Parag Parikh Flexi Cap'}
                className="form-control"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Ticker Symbol / Code</label>
              <input
                type="text"
                placeholder={type === 'crypto' ? 'e.g. BTC, ETH, SOL' : 'e.g. RELIANCE.NS, DELTA.BO, BSE:500325, 122639'}
                className="form-control"
                value={symbol}
                onChange={e => setSymbol(e.target.value)}
              />
            </div>
          </div>

          {/* Quantity & Buy Price */}
          <div className="settings-grid-2" style={{ marginTop: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Units / Quantity Held</label>
              <input
                type="number"
                step="any"
                placeholder={type === 'crypto' ? 'e.g. 0.05 or 100' : 'e.g. 10'}
                className="form-control"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Avg Buy Price per Unit (₹)</label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 1500"
                className="form-control"
                value={buyPrice}
                onChange={e => setBuyPrice(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Current Manual Price (Optional Override) */}
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label">Current Market Price (Optional Manual Override)</label>
            <input
              type="number"
              step="any"
              placeholder="Leave blank to auto-fetch live price via NSE / AMFI / Coin Tickers"
              className="form-control"
              value={currentPrice}
              onChange={e => setCurrentPrice(e.target.value)}
            />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              💡 Live market prices and mutual fund NAVs automatically refresh every 3 seconds!
            </span>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="form-label">Portfolio Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Long-term holding, Zerodha / Groww / Binance Account"
              className="form-control"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : isEditing ? 'Update Holding' : 'Add Holding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
