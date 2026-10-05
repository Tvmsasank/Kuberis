import React, { useState } from 'react';
import {
  X,
  PieChart as PieIcon,
  TrendingUp,
  TrendingDown,
  Layers,
  Award,
  Sparkles,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts';

const PALETTE = [
  '#10B981', '#38BDF8', '#818CF8', '#FBBF24', '#F472B6',
  '#34D399', '#A78BFA', '#F87171', '#60A5FA', '#F59E0B',
  '#4ADE80', '#2DD4BF', '#C084FC', '#FB7185'
];

const CATEGORY_LABELS = {
  all: 'All Holdings',
  stock: 'Indian Stocks',
  us_stock: 'US Stocks',
  mutual_fund: 'Mutual Funds',
  gold: 'Gold & SGB',
  crypto: 'Cryptocurrency',
  fd: 'Fixed Deposits'
};

export default function AssetAllocationModal({
  isOpen,
  onClose,
  categoryFilter = 'all',
  onSelectCategory,
  investments = [],
  allInvestments = [],
  initialSection = 'allocation',
  formatInr,
  isPrivacyMode = false
}) {
  const [activeSection, setActiveSection] = useState(initialSection || 'allocation');
  const [activeCategory, setActiveCategory] = useState(categoryFilter || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dayFilter, setDayFilter] = useState('all'); // 'all' | 'gainers' | 'losers'
  const [pnlFilter, setPnlFilter] = useState('all'); // 'all' | 'profit' | 'loss'

  // Sync internal category state when prop changes
  React.useEffect(() => {
    if (categoryFilter) {
      setActiveCategory(categoryFilter);
    }
  }, [categoryFilter]);

  // Sync active section when initialSection changes
  React.useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);

  if (!isOpen) return null;

  const fullList = Array.isArray(allInvestments) && allInvestments.length > 0 ? allInvestments : investments;

  // Filter scoped to currently active category tab inside modal
  const scopedInvestments = fullList.filter(item => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'stock') return item.type === 'stock';
    if (activeCategory === 'us_stock') return item.type === 'us_stock';
    if (activeCategory === 'mutual_fund') return item.type === 'mutual_fund';
    if (activeCategory === 'gold') return item.type === 'gold';
    if (activeCategory === 'crypto') return item.type === 'crypto';
    if (activeCategory === 'fd') return item.type === 'fd' || item.type === 'other';
    return true;
  });

  const categoryName = CATEGORY_LABELS[activeCategory] || 'Holdings';

  // Category counts across full portfolio
  const countAll = fullList.length;
  const countStock = fullList.filter(i => i.type === 'stock').length;
  const countUs = fullList.filter(i => i.type === 'us_stock').length;
  const countMf = fullList.filter(i => i.type === 'mutual_fund').length;
  const countGold = fullList.filter(i => i.type === 'gold').length;
  const countCrypto = fullList.filter(i => i.type === 'crypto').length;
  const countFd = fullList.filter(i => i.type === 'fd' || i.type === 'other').length;

  // Summary Metrics of scoped investments
  const totalValuation = scopedInvestments.reduce((sum, i) => sum + (Number(i.currentValuation) || 0), 0);
  const totalCost = scopedInvestments.reduce((sum, i) => sum + ((Number(i.buyPrice) || 0) * (Number(i.quantity) || 1)), 0);
  const totalPnL = totalValuation - totalCost;
  const totalPnLPct = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

  // Day's P&L of scoped investments
  const totalDayPnL = scopedInvestments.reduce((sum, i) => {
    if (i.dayRupees !== undefined && !isNaN(Number(i.dayRupees))) {
      return sum + Number(i.dayRupees);
    }
    const ltp = Number(i.currentPrice || i.buyPrice || 0);
    const prev = Number(i.previousClose || ltp);
    const qty = Number(i.quantity || 1);
    return sum + ((ltp - prev) * qty);
  }, 0);
  const dayPnLPct = totalValuation > 0 ? (totalDayPnL / totalValuation) * 100 : 0;

  // =========================================================================
  // 1. ALLOCATION / ASSET CLASSES DATA
  // =========================================================================
  // When in 'all' view: show Asset Classes (Indian Stocks, MFs, Crypto, etc.)
  // When in a specific category (e.g. Indian Stocks): show Capital Invested per individual stock!
  let allocationChartData = [];
  let allocationListData = [];

  if (activeCategory === 'all') {
    const typeMap = {};
    const typeCount = {};
    for (const i of fullList) {
      const t = i.type || 'other';
      const label =
        t === 'stock' ? 'Indian Stocks' :
        t === 'us_stock' ? 'US Stocks' :
        t === 'mutual_fund' ? 'Mutual Funds' :
        t === 'gold' ? 'Gold & SGB' :
        t === 'crypto' ? 'Cryptocurrency' : 'Fixed Deposits';
      const val = Number(i.currentValuation) || 0;
      typeMap[label] = (typeMap[label] || 0) + val;
      typeCount[label] = (typeCount[label] || 0) + 1;
    }
    allocationChartData = Object.keys(typeMap).map((label, idx) => {
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
    allocationListData = allocationChartData;
  } else {
    // For specific category: Capital Invested Distribution across individual purchased stocks
    const sortedByCost = [...scopedInvestments].sort((a, b) => {
      const costA = (Number(a.buyPrice) || 0) * (Number(a.quantity) || 1);
      const costB = (Number(b.buyPrice) || 0) * (Number(b.quantity) || 1);
      return costB - costA;
    });

    allocationListData = sortedByCost.map((h, idx) => {
      const cost = Math.round((Number(h.buyPrice) || 0) * (Number(h.quantity) || 1));
      const pct = totalCost > 0 ? ((cost / totalCost) * 100) : 0;
      return {
        name: h.name || h.symbol || 'Asset',
        symbol: h.symbol || '',
        quantity: h.quantity || 1,
        buyPrice: Number(h.buyPrice || 0),
        value: cost,
        pct: pct.toFixed(1),
        color: PALETTE[idx % PALETTE.length]
      };
    });

    if (allocationListData.length <= 8) {
      allocationChartData = allocationListData;
    } else {
      const top7 = allocationListData.slice(0, 7);
      const restSum = allocationListData.slice(7).reduce((acc, i) => acc + i.value, 0);
      allocationChartData = [
        ...top7,
        {
          name: `Remaining (${allocationListData.length - 7} assets)`,
          symbol: 'Multiple',
          value: restSum,
          pct: totalCost > 0 ? ((restSum / totalCost) * 100).toFixed(1) : '0.0',
          color: '#94A3B8'
        }
      ];
    }
  }

  // =========================================================================
  // 2. HOLDINGS DISTRIBUTION (CURRENT VALUATION)
  // =========================================================================
  // Shows ALL holdings in list without arbitrary truncation!
  const sortedHoldings = [...scopedInvestments].sort((a, b) => (Number(b.currentValuation) || 0) - (Number(a.currentValuation) || 0));

  const fullHoldingsList = sortedHoldings.map((h, idx) => {
    const val = Math.round(Number(h.currentValuation) || 0);
    const cost = Math.round((Number(h.buyPrice) || 0) * (Number(h.quantity) || 1));
    const pnl = val - cost;
    const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
    const pct = totalValuation > 0 ? ((val / totalValuation) * 100) : 0;
    return {
      name: h.name || h.symbol || 'Asset',
      symbol: h.symbol || '',
      quantity: h.quantity || 1,
      currentPrice: Number(h.currentPrice || h.buyPrice || 0),
      buyPrice: Number(h.buyPrice || 0),
      value: val,
      cost,
      pnl,
      pnlPct: pnlPct.toFixed(2),
      pct: pct.toFixed(1),
      color: PALETTE[idx % PALETTE.length]
    };
  });

  // Chart data: up to 8 slices or top 7 + remaining
  let holdingsChartData = [];
  if (fullHoldingsList.length <= 8) {
    holdingsChartData = fullHoldingsList;
  } else {
    const top7 = fullHoldingsList.slice(0, 7);
    const othersVal = fullHoldingsList.slice(7).reduce((sum, h) => sum + h.value, 0);
    holdingsChartData = [
      ...top7,
      {
        name: `Remaining (${fullHoldingsList.length - 7} holdings)`,
        symbol: 'Multiple',
        value: othersVal,
        pct: totalValuation > 0 ? ((othersVal / totalValuation) * 100).toFixed(1) : '0.0',
        color: '#94A3B8'
      }
    ];
  }

  // =========================================================================
  // 3. DAY'S MOVEMENT (GAINERS & LOSERS DRILL-DOWN)
  // =========================================================================
  const gainersList = [];
  const losersList = [];
  const unchangedList = [];

  let totalGainersRupees = 0;
  let totalLosersRupees = 0;

  for (const h of scopedInvestments) {
    const ltp = Number(h.currentPrice || h.buyPrice || 0);
    const prev = Number(h.previousClose || ltp);
    const qty = Number(h.quantity || 1);
    const dayRupees = (h.dayRupees !== undefined && !isNaN(Number(h.dayRupees))) ? Number(h.dayRupees) : ((ltp - prev) * qty);
    const dayPct = prev > 0 ? ((ltp - prev) / prev) * 100 : (h.dayPercentage || 0);

    const item = {
      name: h.name || h.symbol || 'Asset',
      symbol: h.symbol || '',
      quantity: qty,
      currentPrice: ltp,
      previousClose: prev,
      dayRupees: Math.round(dayRupees * 100) / 100,
      dayPct: Number(dayPct).toFixed(2),
      currentValuation: Number(h.currentValuation) || 0
    };

    if (dayRupees > 0) {
      gainersList.push(item);
      totalGainersRupees += dayRupees;
    } else if (dayRupees < 0) {
      losersList.push(item);
      totalLosersRupees += Math.abs(dayRupees);
    } else {
      unchangedList.push(item);
    }
  }

  // Sort gainers highest first, losers biggest loss first
  gainersList.sort((a, b) => b.dayRupees - a.dayRupees);
  losersList.sort((a, b) => a.dayRupees - b.dayRupees);

  const dayMovementChartData = [
    { name: `Gainers (${gainersList.length})`, value: Math.round(totalGainersRupees), count: gainersList.length, color: '#10B981' },
    { name: `Losers (${losersList.length})`, value: Math.round(totalLosersRupees), count: losersList.length, color: '#EF4444' }
  ].filter(d => d.value > 0);

  // Active list filtered by dayFilter ('all' | 'gainers' | 'losers')
  const activeDayList =
    dayFilter === 'gainers' ? gainersList :
    dayFilter === 'losers' ? losersList :
    [...gainersList, ...losersList, ...unchangedList];

  // =========================================================================
  // 4. PROFIT & LOSS (UNREALIZED DRILL-DOWN)
  // =========================================================================
  const profitList = [];
  const lossList = [];

  let totalProfitSum = 0;
  let totalLossSum = 0;

  for (const h of scopedInvestments) {
    const cost = (Number(h.buyPrice) || 0) * (Number(h.quantity) || 1);
    const val = Number(h.currentValuation) || 0;
    const pnl = val - cost;
    const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;

    const item = {
      name: h.name || h.symbol || 'Asset',
      symbol: h.symbol || '',
      quantity: h.quantity || 1,
      cost,
      valuation: val,
      pnl: Math.round(pnl * 100) / 100,
      pnlPct: Number(pnlPct).toFixed(2)
    };

    if (pnl >= 0) {
      profitList.push(item);
      totalProfitSum += pnl;
    } else {
      lossList.push(item);
      totalLossSum += Math.abs(pnl);
    }
  }

  profitList.sort((a, b) => b.pnl - a.pnl);
  lossList.sort((a, b) => a.pnl - b.pnl);

  const pnlBreakdownChartData = [
    { name: `In Profit (${profitList.length})`, value: Math.round(totalProfitSum), count: profitList.length, color: '#10B981' },
    { name: `In Loss (${lossList.length})`, value: Math.round(totalLossSum), count: lossList.length, color: '#EF4444' }
  ].filter(d => d.value > 0);

  const activePnlList =
    pnlFilter === 'profit' ? profitList :
    pnlFilter === 'loss' ? lossList :
    [...profitList, ...lossList];

  // Active chart data based on activeSection
  const currentChartData =
    activeSection === 'allocation' ? allocationChartData :
    activeSection === 'holdings' ? holdingsChartData :
    activeSection === 'day' ? dayMovementChartData : pnlBreakdownChartData;

  const handleCategorySwitch = (catKey) => {
    setActiveCategory(catKey);
    if (onSelectCategory) {
      onSelectCategory(catKey);
    }
  };

  return (
    <div
      className="modal-backdrop"
      style={{
        zIndex: 10100,
        overflowY: 'auto',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '780px',
          width: '100%',
          padding: '24px',
          borderRadius: '24px',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(28px)',
          border: '1px solid var(--border-glass)',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
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
                boxShadow: '0 4px 14px var(--primary-glow)',
                flexShrink: 0
              }}
            >
              <PieIcon size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)', margin: 0, letterSpacing: '-0.3px' }}>
                  {activeCategory === 'all' ? 'Asset Allocation & Breakdown' : `${categoryName} Breakdown & Analytics`}
                </h2>
                <span className="badge badge-primary" style={{ fontSize: '10px', padding: '2px 8px', fontWeight: '800' }}>
                  {scopedInvestments.length} {scopedInvestments.length === 1 ? 'Asset' : 'Assets'}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                {activeCategory === 'all'
                  ? 'Visual allocation, holding weights & real-time performance distribution'
                  : `Detailed capital allocation, weightage and real-time performance for ${categoryName}`}
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close" style={{ flexShrink: 0 }}>
            <X size={20} />
          </button>
        </div>

        {/* Category Scope Filter Pills */}
        <div
          className="no-scrollbar"
          style={{
            display: 'flex',
            gap: '6px',
            marginBottom: '16px',
            overflowX: 'auto',
            paddingBottom: '2px'
          }}
        >
          {[
            { id: 'all', label: 'All Holdings', count: countAll },
            { id: 'stock', label: 'Indian Stocks', count: countStock },
            { id: 'us_stock', label: 'US Stocks', count: countUs },
            { id: 'mutual_fund', label: 'Mutual Funds', count: countMf },
            { id: 'gold', label: 'Gold & SGB', count: countGold },
            { id: 'crypto', label: 'Crypto', count: countCrypto },
            { id: 'fd', label: 'Fixed Deposits', count: countFd }
          ].map(cat => {
            const isCatActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                className={`btn btn-sm ${isCatActive ? 'btn-primary' : 'btn-ghost'}`}
                style={{
                  fontSize: '11px',
                  padding: '5px 11px',
                  borderRadius: '10px',
                  fontWeight: '800',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  gap: '4px'
                }}
                onClick={() => handleCategorySwitch(cat.id)}
              >
                <span>{cat.label}</span>
                <span
                  style={{
                    background: isCatActive ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                    padding: '1px 6px',
                    borderRadius: '8px',
                    fontSize: '9.5px'
                  }}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Summary Metric Stats Bar (Contextual to Selected Category) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '10px',
            marginBottom: '18px',
            padding: '12px 16px',
            borderRadius: '16px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-color)'
          }}
        >
          <div>
            <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              {activeCategory === 'all' ? 'Total Portfolio' : `${categoryName} Value`}
            </div>
            <div style={{ fontSize: '17px', fontWeight: '900', color: '#38BDF8', marginTop: '2px' }}>
              {formatInr(totalValuation)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Invested Cost
            </div>
            <div style={{ fontSize: '17px', fontWeight: '900', color: 'var(--text-main)', marginTop: '2px' }}>
              {formatInr(totalCost)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Day's P&L
            </div>
            <div style={{ fontSize: '17px', fontWeight: '900', color: totalDayPnL >= 0 ? '#10B981' : '#F87171', marginTop: '2px' }}>
              {totalDayPnL >= 0 ? '+' : ''}{formatInr(totalDayPnL)} ({dayPnLPct >= 0 ? '+' : ''}{dayPnLPct.toFixed(2)}%)
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total Net Return
            </div>
            <div style={{ fontSize: '17px', fontWeight: '900', color: totalPnL >= 0 ? '#10B981' : '#F87171', marginTop: '2px' }}>
              {totalPnL >= 0 ? '+' : ''}{formatInr(totalPnL)} ({totalPnLPct >= 0 ? '+' : ''}{totalPnLPct.toFixed(1)}%)
            </div>
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
            marginBottom: '18px',
            overflowX: 'auto'
          }}
        >
          {[
            {
              id: 'allocation',
              label: activeCategory === 'all' ? 'Asset Classes' : 'Capital Allocation',
              icon: Layers
            },
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
                onClick={() => {
                  setActiveSection(tab.id);
                  setSearchQuery('');
                }}
              >
                <TabIcon size={14} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* If scoped category is empty */}
        {scopedInvestments.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '6px' }}>
              No {categoryName} holdings in portfolio
            </div>
            <p style={{ fontSize: '12.5px', margin: 0 }}>
              You haven't added any {categoryName.toLowerCase()} investments yet. Switch to another tab or add your first holding.
            </p>
          </div>
        ) : (
          <div>
            {/* Top Interactive Row: Donut Chart on Left, Breakdown Info on Right */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px',
                alignItems: 'center',
                marginBottom: '18px'
              }}
            >
              {/* Donut Chart */}
              <div style={{ width: '100%', height: '220px', position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={currentChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={currentChartData.length > 1 ? 3 : 0}
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
                  <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    {activeSection === 'allocation' ? (activeCategory === 'all' ? 'Asset Types' : 'Capital') :
                     activeSection === 'holdings' ? 'Holdings' :
                     activeSection === 'day' ? "Day's Trend" : 'P&L Split'}
                  </span>
                  <span style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-main)', marginTop: '2px' }}>
                    {activeSection === 'allocation' ? `${allocationListData.length} Items` :
                     activeSection === 'holdings' ? `${scopedInvestments.length} Assets` :
                     activeSection === 'day' ? `${scopedInvestments.length} Movers` : `${scopedInvestments.length} Holdings`}
                  </span>
                </div>
              </div>

              {/* Chart Side Highlights / Quick Filters */}
              <div>
                {/* 1. If Section is Allocation */}
                {activeSection === 'allocation' && (
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 10px 0' }}>
                      {activeCategory === 'all' ? 'Portfolio Allocation By Asset Class' : `${categoryName} Capital Deployed`}
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', margin: '0 0 14px 0' }}>
                      {activeCategory === 'all'
                        ? 'Distribution of your net invested wealth across diversified asset classes.'
                        : `Breakdown of original capital deployed across your ${scopedInvestments.length} ${categoryName.toLowerCase()} investments.`}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {allocationChartData.slice(0, 4).map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
                            <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>{item.name}</span>
                          </div>
                          <span style={{ fontWeight: '800', color: 'var(--primary)' }}>{item.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. If Section is Holdings Distribution */}
                {activeSection === 'holdings' && (
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 8px 0' }}>
                      Valuation Weightage Breakdown
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', margin: '0 0 14px 0' }}>
                      Showing all {scopedInvestments.length} purchased {categoryName.toLowerCase()} ranked by current market value and portfolio weight.
                    </p>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div className="search-bar" style={{ flex: 1, padding: '6px 10px', borderRadius: '10px' }}>
                        <Search size={14} style={{ color: 'var(--text-muted)' }} />
                        <input
                          type="text"
                          placeholder="Search holding..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          style={{ fontSize: '12px', width: '100%' }}
                        />
                        {searchQuery && (
                          <button type="button" onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. If Section is Day's Movement */}
                {activeSection === 'day' && (
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 8px 0' }}>
                      Today's Real-Time Gainers & Losers
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', margin: '0 0 12px 0' }}>
                      Filter by gainers or losers to view individual stock performance for the current market session.
                    </p>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className={`btn btn-sm ${dayFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ fontSize: '11px', padding: '5px 10px', borderRadius: '8px', fontWeight: '800' }}
                        onClick={() => setDayFilter('all')}
                      >
                        All ({scopedInvestments.length})
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${dayFilter === 'gainers' ? 'btn-primary' : 'btn-ghost'}`}
                        style={{
                          fontSize: '11px',
                          padding: '5px 10px',
                          borderRadius: '8px',
                          fontWeight: '800',
                          color: '#10B981',
                          borderColor: dayFilter === 'gainers' ? '#10B981' : undefined
                        }}
                        onClick={() => setDayFilter('gainers')}
                      >
                        ▲ Gainers ({gainersList.length})
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${dayFilter === 'losers' ? 'btn-primary' : 'btn-ghost'}`}
                        style={{
                          fontSize: '11px',
                          padding: '5px 10px',
                          borderRadius: '8px',
                          fontWeight: '800',
                          color: '#EF4444',
                          borderColor: dayFilter === 'losers' ? '#EF4444' : undefined
                        }}
                        onClick={() => setDayFilter('losers')}
                      >
                        ▼ Losers ({losersList.length})
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. If Section is Profit & Loss */}
                {activeSection === 'pnl' && (
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 8px 0' }}>
                      Cumulative Unrealized Profit & Loss
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', margin: '0 0 12px 0' }}>
                      Analyze profitable vs loss-making holdings since initial purchase price.
                    </p>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className={`btn btn-sm ${pnlFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ fontSize: '11px', padding: '5px 10px', borderRadius: '8px', fontWeight: '800' }}
                        onClick={() => setPnlFilter('all')}
                      >
                        All ({scopedInvestments.length})
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${pnlFilter === 'profit' ? 'btn-primary' : 'btn-ghost'}`}
                        style={{
                          fontSize: '11px',
                          padding: '5px 10px',
                          borderRadius: '8px',
                          fontWeight: '800',
                          color: '#10B981',
                          borderColor: pnlFilter === 'profit' ? '#10B981' : undefined
                        }}
                        onClick={() => setPnlFilter('profit')}
                      >
                        ▲ In Profit ({profitList.length})
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${pnlFilter === 'loss' ? 'btn-primary' : 'btn-ghost'}`}
                        style={{
                          fontSize: '11px',
                          padding: '5px 10px',
                          borderRadius: '8px',
                          fontWeight: '800',
                          color: '#EF4444',
                          borderColor: pnlFilter === 'loss' ? '#EF4444' : undefined
                        }}
                        onClick={() => setPnlFilter('loss')}
                      >
                        ▼ In Loss ({lossList.length})
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ========================================================================= */}
            {/* FULL ITEMIZED INTERACTIVE LIST (SHOWS ALL HOLDINGS WITH SCROLL) */}
            {/* ========================================================================= */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  {activeSection === 'allocation' ? (activeCategory === 'all' ? 'Asset Class Breakdown' : `Capital Deployed Across All ${allocationListData.length} Holdings`) :
                   activeSection === 'holdings' ? `All ${fullHoldingsList.length} Holdings (Ranked by Valuation)` :
                   activeSection === 'day' ? `Day Movement Stock List (${activeDayList.length})` :
                   `Unrealized P&L Positions List (${activePnlList.length})`}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Scrollable view
                </span>
              </div>

              {/* Scrollable Holdings Container */}
              <div
                style={{
                  maxHeight: '280px',
                  overflowY: 'auto',
                  paddingRight: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                {/* TAB 1: ALLOCATION LIST */}
                {activeSection === 'allocation' && (
                  activeCategory === 'all' ? (
                    allocationListData.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--border-color)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
                              {item.name}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {item.count} {item.count === 1 ? 'holding' : 'holdings'} in portfolio
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '13px', fontWeight: '900', color: 'var(--text-main)' }}>
                            {formatInr(item.value)}
                          </div>
                          <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary)' }}>
                            {item.pct}% weight
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    allocationListData.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--border-color)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                              {item.symbol || item.name}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {item.name} • {item.quantity} Qty @ {formatInr(item.buyPrice)}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: '900', color: 'var(--text-main)' }}>
                            {formatInr(item.value)}
                          </div>
                          <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary)' }}>
                            {item.pct}% capital
                          </div>
                        </div>
                      </div>
                    ))
                  )
                )}

                {/* TAB 2: HOLDINGS DISTRIBUTION (ALL HOLDINGS INCLUDED) */}
                {activeSection === 'holdings' && (
                  fullHoldingsList
                    .filter(h => {
                      if (!searchQuery.trim()) return true;
                      const q = searchQuery.toLowerCase();
                      return (h.name || '').toLowerCase().includes(q) || (h.symbol || '').toLowerCase().includes(q);
                    })
                    .map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--border-color)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                              {item.symbol || item.name}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {item.name} • {item.quantity} shares @ {formatInr(item.currentPrice)}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: '900', color: '#38BDF8' }}>
                            {formatInr(item.value)}
                          </div>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: item.pnl >= 0 ? '#10B981' : '#F87171' }}>
                            {item.pct}% weight • {item.pnl >= 0 ? '+' : ''}{item.pnlPct}%
                          </div>
                        </div>
                      </div>
                    ))
                )}

                {/* TAB 3: DAY'S MOVEMENT (GAINERS & LOSERS LIST) */}
                {activeSection === 'day' && (
                  activeDayList.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                      No stocks in this filter.
                    </div>
                  ) : (
                    activeDayList.map((item, idx) => {
                      const isUp = item.dayRupees > 0;
                      const isDown = item.dayRupees < 0;
                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid var(--border-color)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '8px',
                                background: isUp ? 'rgba(16, 185, 129, 0.15)' : isDown ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                color: isUp ? '#10B981' : isDown ? '#EF4444' : 'var(--text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}
                            >
                              {isUp ? <ArrowUpRight size={16} /> : isDown ? <ArrowDownRight size={16} /> : <Minus size={14} />}
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                              <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                {item.symbol || item.name}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {item.name} • {item.quantity} Qty @ {formatInr(item.currentPrice)}
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: '900', color: isUp ? '#10B981' : isDown ? '#EF4444' : 'var(--text-muted)' }}>
                              {isUp ? '+' : ''}{formatInr(item.dayRupees)}
                            </div>
                            <div style={{ fontSize: '11px', fontWeight: '800', color: isUp ? '#10B981' : isDown ? '#EF4444' : 'var(--text-muted)' }}>
                              {isUp ? '+' : ''}{item.dayPct}% Today
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )
                )}

                {/* TAB 4: PROFIT & LOSS LIST */}
                {activeSection === 'pnl' && (
                  activePnlList.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                      No holdings in this filter.
                    </div>
                  ) : (
                    activePnlList.map((item, idx) => {
                      const isProfit = item.pnl >= 0;
                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid var(--border-color)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '8px',
                                background: isProfit ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                color: isProfit ? '#10B981' : '#EF4444',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}
                            >
                              {isProfit ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                              <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                {item.symbol || item.name}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {item.name} • Invested: {formatInr(item.cost)}
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: '900', color: isProfit ? '#10B981' : '#EF4444' }}>
                              {isProfit ? '+' : ''}{formatInr(item.pnl)}
                            </div>
                            <div style={{ fontSize: '11px', fontWeight: '800', color: isProfit ? '#10B981' : '#EF4444' }}>
                              {isProfit ? '+' : ''}{item.pnlPct}% Return
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
            Showing live metrics for <strong>{categoryName}</strong>
          </div>
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
