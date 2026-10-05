import React, { useState } from 'react';
import { X, PieChart as PieIcon, TrendingUp, TrendingDown, Layers, Award, Sparkles, CheckCircle2 } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend } from 'recharts';

const PALETTE = ['#10B981', '#38BDF8', '#818CF8', '#FBBF24', '#F472B6', '#34D399', '#A78BFA', '#F87171'];

export default function AssetAllocationModal({
  isOpen,
  onClose,
  investments = [],
  initialSection = 'allocation',
  formatInr,
  isPrivacyMode = false
}) {
  const [activeSection, setActiveSection] = useState(initialSection || 'allocation');

  if (!isOpen) return null;

  const safeInvestments = Array.isArray(investments) ? investments : [];
  const totalValuation = safeInvestments.reduce((sum, i) => sum + (Number(i.currentValuation) || 0), 0);
  const totalCost = safeInvestments.reduce((sum, i) => sum + ((Number(i.buyPrice) || 0) * (Number(i.quantity) || 1)), 0);
  const totalPnL = totalValuation - totalCost;
  const totalPnLPct = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

  // 1. Asset Class Breakdown
  const typeMap = {};
  const typeCount = {};
  for (const i of safeInvestments) {
    const t = i.type || 'other';
    const label =
      t === 'stock' ? 'Indian Stocks' :
      t === 'us_stock' ? 'US Stocks' :
      t === 'mutual_fund' ? 'Mutual Funds' :
      t === 'gold' ? 'Gold & SGB' :
      t === 'crypto' ? 'Cryptocurrency' : 'Fixed Deposits / Bonds';
    const val = Number(i.currentValuation) || 0;
    typeMap[label] = (typeMap[label] || 0) + val;
    typeCount[label] = (typeCount[label] || 0) + 1;
  }

  const assetClassData = Object.keys(typeMap).map((label, idx) => {
    const val = Math.round(typeMap[label]);
    const pct = totalValuation > 0 ? ((val / totalValuation) * 100) : 0;
    return {
      name: label,
      value: val,
      pct: pct.toFixed(1),
      count: typeCount[label] || 0,
      color: PALETTE[idx % PALETTE.length]
    };
  }).filter(d => d.value > 0).sort((a, b) => b.value - a.value);

  // 2. Holdings Breakdown (Top holdings)
  const sortedHoldings = [...safeInvestments].sort((a, b) => (Number(b.currentValuation) || 0) - (Number(a.currentValuation) || 0));
  const holdingsData = sortedHoldings.slice(0, 6).map((h, idx) => {
    const val = Math.round(Number(h.currentValuation) || 0);
    const pct = totalValuation > 0 ? ((val / totalValuation) * 100) : 0;
    return {
      name: h.name || h.symbol || 'Asset',
      value: val,
      pct: pct.toFixed(1),
      symbol: h.symbol || '',
      color: PALETTE[idx % PALETTE.length]
    };
  });
  if (sortedHoldings.length > 6) {
    const othersVal = sortedHoldings.slice(6).reduce((sum, h) => sum + (Number(h.currentValuation) || 0), 0);
    if (othersVal > 0) {
      holdingsData.push({
        name: `Others (${sortedHoldings.length - 6} assets)`,
        value: Math.round(othersVal),
        pct: (totalValuation > 0 ? ((othersVal / totalValuation) * 100) : 0).toFixed(1),
        symbol: 'Multiple',
        color: '#94A3B8'
      });
    }
  }

  // 3. Day's P&L Movement
  let gainersCount = 0;
  let gainersSum = 0;
  let losersCount = 0;
  let losersSum = 0;
  for (const i of safeInvestments) {
    const ltp = Number(i.currentPrice || i.buyPrice || 0);
    const prev = Number(i.previousClose || ltp);
    const qty = Number(i.quantity || 1);
    const dayRupees = (i.dayRupees !== undefined && !isNaN(Number(i.dayRupees))) ? Number(i.dayRupees) : ((ltp - prev) * qty);
    if (dayRupees > 0) {
      gainersCount++;
      gainersSum += dayRupees;
    } else if (dayRupees < 0) {
      losersCount++;
      losersSum += Math.abs(dayRupees);
    }
  }
  const dayMovementData = [
    { name: `Gainers (${gainersCount})`, value: Math.round(gainersSum), count: gainersCount, color: '#10B981' },
    { name: `Losers (${losersCount})`, value: Math.round(losersSum), count: losersCount, color: '#EF4444' }
  ].filter(d => d.value > 0);

  // 4. Unrealized P&L
  let profitCount = 0;
  let profitSum = 0;
  let lossCount = 0;
  let lossSum = 0;
  for (const i of safeInvestments) {
    const cost = (Number(i.buyPrice) || 0) * (Number(i.quantity) || 1);
    const val = Number(i.currentValuation) || 0;
    const pnl = val - cost;
    if (pnl >= 0) {
      profitCount++;
      profitSum += pnl;
    } else {
      lossCount++;
      lossSum += Math.abs(pnl);
    }
  }
  const pnlBreakdownData = [
    { name: `In Profit (${profitCount})`, value: Math.round(profitSum), count: profitCount, color: '#10B981' },
    { name: `In Loss (${lossCount})`, value: Math.round(lossSum), count: lossCount, color: '#EF4444' }
  ].filter(d => d.value > 0);

  // Current active data set
  const currentChartData =
    activeSection === 'allocation' ? assetClassData :
    activeSection === 'holdings' ? holdingsData :
    activeSection === 'day' ? dayMovementData : pnlBreakdownData;

  return (
    <div
      className="modal-backdrop"
      style={{
        zIndex: 10100,
        overflowY: 'auto',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '740px',
          width: '100%',
          padding: '28px',
          borderRadius: '24px',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(28px)',
          border: '1px solid var(--border-glass)',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px var(--primary-glow)'
              }}
            >
              <PieIcon size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)', margin: 0, letterSpacing: '-0.3px' }}>
                Asset Allocation & Breakdown
              </h2>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Visual allocation, holding weights & real-time performance distribution
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Quick Summary Pill Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '10px',
            marginBottom: '20px',
            padding: '12px 14px',
            borderRadius: '16px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-color)'
          }}
        >
          <div>
            <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Portfolio</div>
            <div style={{ fontSize: '16px', fontWeight: '900', color: '#38BDF8', marginTop: '2px' }}>{formatInr(totalValuation)}</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Invested Cost</div>
            <div style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-main)', marginTop: '2px' }}>{formatInr(totalCost)}</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Net Return</div>
            <div style={{ fontSize: '16px', fontWeight: '900', color: totalPnL >= 0 ? '#10B981' : '#F87171', marginTop: '2px' }}>
              {totalPnL >= 0 ? '+' : ''}{formatInr(totalPnL)} ({totalPnLPct >= 0 ? '+' : ''}{totalPnLPct.toFixed(1)}%)
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Holdings</div>
            <div style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-main)', marginTop: '2px' }}>{safeInvestments.length} Assets</div>
          </div>
        </div>

        {/* Section Tabs Switcher */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '4px',
            borderRadius: '12px',
            marginBottom: '22px',
            overflowX: 'auto'
          }}
        >
          {[
            { id: 'allocation', label: 'Asset Classes', icon: Layers },
            { id: 'holdings', label: 'Holdings Distribution', icon: Award },
            { id: 'day', label: "Day's Movement", icon: TrendingUp },
            { id: 'pnl', label: 'Profit & Loss', icon: Sparkles }
          ].map(tab => {
            const TabIcon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-ghost'}`}
                style={{
                  fontSize: '11.5px',
                  padding: '7px 12px',
                  borderRadius: '9px',
                  fontWeight: '800',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  flex: '1 1 auto',
                  justifyContent: 'center'
                }}
                onClick={() => setActiveSection(tab.id)}
              >
                <TabIcon size={14} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Main Content Grid: Chart on Left, List on Right */}
        {currentChartData.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No investment holdings found in this view. Add an investment to view real-time breakdown.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px',
              alignItems: 'center'
            }}
          >
            {/* Interactive Pie / Donut Chart */}
            <div style={{ width: '100%', height: '240px', position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={currentChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                  >
                    {currentChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || PALETTE[index % PALETTE.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(val) => [isPrivacyMode ? '₹••••••••' : `₹${Number(val).toLocaleString('en-IN')}`, 'Amount']}
                    contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none'
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  {activeSection === 'allocation' ? 'Asset Types' : activeSection === 'holdings' ? 'Top Holdings' : activeSection === 'day' ? 'Day P&L' : 'P&L Split'}
                </span>
                <span style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-main)', marginTop: '2px' }}>
                  {currentChartData.length} Items
                </span>
              </div>
            </div>

            {/* Itemized Legend & Breakdown Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px', overflowY: 'auto', paddingRight: '4px' }}>
              {currentChartData.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: item.color || PALETTE[idx % PALETTE.length],
                        flexShrink: 0
                      }}
                    />
                    <div style={{ overflow: 'hidden' }}>
                      <div
                        style={{
                          fontSize: '12.5px',
                          fontWeight: '800',
                          color: 'var(--text-main)',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          maxWidth: '170px'
                        }}
                        title={item.name}
                      >
                        {item.name}
                      </div>
                      {item.count !== undefined && (
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                          {item.count} {item.count === 1 ? 'holding' : 'holdings'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '12.5px', fontWeight: '900', color: 'var(--text-main)' }}>
                      {formatInr(item.value)}
                    </div>
                    {item.pct && (
                      <div style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--primary)' }}>
                        {item.pct}%
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onClose}
            style={{ borderRadius: '12px', padding: '8px 20px', fontWeight: '800' }}
          >
            Close Breakdown
          </button>
        </div>
      </div>
    </div>
  );
}
