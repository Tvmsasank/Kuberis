import React from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Calendar,
  Plus,
  Upload,
  Building2,
  Briefcase,
  Activity,
  ChevronRight
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import { calculateDynamicNetWorth } from '../utils/netWorth';

export default function DashboardTab({
  transactions = [],
  investments = [],
  settings = {},
  selectedPeriod,
  onPeriodChange,
  onOpenAddEntry,
  onOpenImport,
  onNavigateTab,
  isPrivacyMode = false
}) {
  const { assets = 0, liabilities = 0, netWorthConfigured = false, recurring = [], subscriptions = [] } = settings;

  const formatInr = (val) =>
    isPrivacyMode
      ? '₹••••••••'
      : '₹' +
        Number(val || 0).toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });

  // Live Investments Total Valuation (Safe array check)
  const safeInvestments = Array.isArray(investments) ? investments : [];
  const totalInvestmentsValuation = safeInvestments.reduce((sum, i) => sum + (Number(i.currentValuation) || 0), 0);
  const totalInvestmentsCost = safeInvestments.reduce((sum, i) => sum + ((Number(i.buyPrice) || 0) * (Number(i.quantity) || 1)), 0);
  const totalInvestmentsPnL = totalInvestmentsValuation - totalInvestmentsCost;
  const totalInvestmentsPnLPct = totalInvestmentsCost > 0 ? (totalInvestmentsPnL / totalInvestmentsCost) * 100 : 0;

  // Filter transactions by selectedPeriod
  const filteredTransactions = filterByPeriod(transactions, selectedPeriod);

  // Income, Spending, Savings Rate
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalSpending = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const savingsRate = totalIncome > 0 ? (((totalIncome - totalSpending) / totalIncome) * 100).toFixed(1) : '0';

  // Dynamic Real-Time Net Worth Calculation via unified netWorth helper
  const {
    totalAssets: totalDynamicAssets,
    totalLiabilities,
    netWorth: netWorthValue
  } = calculateDynamicNetWorth(investments, settings);

  // Cash Flow Chart View Mode ('daily' | 'cumulative' | 'monthly')
  const [chartViewMode, setChartViewMode] = React.useState('daily');
  const cashFlowData = getCashFlowChartData(filteredTransactions, chartViewMode);

  // Spending by Category Pie chart data
  const categoryData = getSpendingByCategoryData(filteredTransactions);
  const COLORS = ['#7C6EE6', '#10B981', '#F97316', '#3B82F6', '#EC4899', '#8B5CF6', '#F59E0B', '#64748B'];

  // Needs review count
  const needsReviewCount = transactions.filter(t => t.category === 'Needs review').length;

  // Recent activity (Up to 10 items)
  const recentTx = [...filteredTransactions].slice(0, 10);

  // Coming up recurring/subscriptions
  const comingUp = [...recurring, ...subscriptions].slice(0, 3);

  return (
    <div>
      {/* Date Period Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Financial Overview & Ledger</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Complete view of transactions, live investments, and net worth</p>
        </div>

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
      </div>

      {/* 4 Summary Cards */}
      <div className="grid-4" style={{ marginBottom: '28px' }}>
        {/* Dynamic Net Worth Card */}
        <div
          className="card"
          style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer' }}
          onClick={() => onNavigateTab ? onNavigateTab('settings') : null}
          title="Click to view Net Worth setup and breakdown"
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Net Worth <span className="badge badge-success" style={{ fontSize: '9px', padding: '1px 5px' }}>Auto Live</span>
              </span>
              <div style={{ padding: '8px', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 'var(--radius-md)' }}>
                <Wallet size={18} />
              </div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '4px' }}>
              {formatInr(netWorthValue)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Assets: {formatInr(totalDynamicAssets)} • Debts: -{formatInr(totalLiabilities)}
            </div>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '700', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Auto Live Valuation</span>
            <ChevronRight size={14} />
          </div>
        </div>

        {/* Income Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Income</span>
              <div style={{ padding: '8px', background: 'var(--success-light)', color: 'var(--success)', borderRadius: 'var(--radius-md)' }}>
                <TrendingUp size={18} />
              </div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '4px' }}>
              {formatInr(totalIncome)}
            </div>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '8px' }}>
            Sum of income in period
          </div>
        </div>

        {/* Spending Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Spending</span>
              <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', borderRadius: 'var(--radius-md)' }}>
                <TrendingDown size={18} />
              </div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '4px' }}>
              {formatInr(totalSpending)}
            </div>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '8px' }}>
            Sum of expenses in period
          </div>
        </div>

        {/* Savings Rate Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Savings Rate</span>
              <div style={{ padding: '8px', background: 'var(--info-light)', color: 'var(--info)', borderRadius: 'var(--radius-md)' }}>
                <PiggyBank size={18} />
              </div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '4px' }}>
              {savingsRate}%
            </div>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '8px' }}>
            ((Income - Spending) / Income)
          </div>
        </div>
      </div>

      {/* Real-Time Investment Portfolio Live Widget on Dashboard */}
      {safeInvestments.length > 0 && (
        <div className="card" style={{ marginBottom: '28px', padding: '20px', background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)', border: '1px solid var(--primary-light)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: 'white' }}>
                <TrendingUp style={{ color: '#10B981' }} size={20} /> Live Stock & Investment Portfolio
              </h3>
              <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity size={13} className="spin" style={{ color: '#10B981' }} /> Real-time market prices auto-updating continuously
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#94A3B8' }}>Portfolio Value</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#F8FAFC' }}>
                  ₹{totalInvestmentsValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: totalInvestmentsPnL >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: totalInvestmentsPnL >= 0 ? '#34D399' : '#FCA5A5',
                  border: `1px solid ${totalInvestmentsPnL >= 0 ? '#10B981' : '#EF4444'}`
                }}
              >
                {totalInvestmentsPnL >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                {totalInvestmentsPnL >= 0 ? '+' : ''}₹{Math.abs(totalInvestmentsPnL).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({totalInvestmentsPnLPct >= 0 ? '+' : ''}{totalInvestmentsPnLPct.toFixed(2)}%)
              </div>

              <button className="btn btn-primary btn-sm" onClick={() => onNavigateTab('investments')} style={{ fontSize: '12px', padding: '6px 12px' }}>
                Open Portfolio <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Quick Holding Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginTop: '12px' }}>
            {safeInvestments.slice(0, 4).map(item => {
              const buyPrice = Number(item.buyPrice || 0);
              const currentPrice = Number(item.currentPrice || buyPrice);
              const valuation = Number(item.currentValuation || (currentPrice * (item.quantity || 1)));
              const pnl = Number(item.unrealizedPnL || (valuation - (buyPrice * (item.quantity || 1))));
              const pnlPct = Number(item.pnlPercentage || (buyPrice > 0 ? (pnl / (buyPrice * item.quantity)) * 100 : 0));

              return (
                <div key={item.id} style={{ padding: '12px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ fontWeight: '700', fontSize: '13px', color: '#F8FAFC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '12px' }}>
                    <span style={{ color: '#94A3B8' }}>Live: <strong style={{ color: 'white' }}>₹{currentPrice.toLocaleString('en-IN')}</strong></span>
                    <span style={{ fontWeight: '700', color: pnl >= 0 ? '#34D399' : '#FCA5A5' }}>
                      {pnl >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cash Flow Line Chart & Category Pie Chart */}
      <div className="grid-2" style={{ marginBottom: '28px' }}>
        {/* Cash Flow Trend Line Chart */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Cash Flow & Spending Trajectory</h3>
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '3px', borderRadius: '10px' }}>
              {[
                { id: 'daily', label: 'Date-wise' },
                { id: 'cumulative', label: 'Cumulative' },
                { id: 'monthly', label: 'Monthly' }
              ].map(m => (
                <button
                  key={m.id}
                  type="button"
                  className={`btn btn-sm ${chartViewMode === m.id ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '7px', height: '26px', fontWeight: '700' }}
                  onClick={() => setChartViewMode(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {cashFlowData.length > 0 ? (
            <div style={{ width: '100%', height: '240px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cashFlowData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <XAxis dataKey="dateLabel" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} tickLine={false} />
                  <Tooltip content={<CustomCashFlowTooltip isPrivacyMode={isPrivacyMode} />} />
                  <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3, fill: '#10B981' }} activeDot={{ r: 6, fill: '#10B981', stroke: '#FFFFFF' }} name="Income" />
                  <Line type="monotone" dataKey="spending" stroke="#F97316" strokeWidth={2.5} dot={{ r: 3, fill: '#F97316' }} activeDot={{ r: 6, fill: '#F97316', stroke: '#FFFFFF' }} name="Spending" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '36px 16px' }}>
              <div className="empty-state-icon"><Calendar size={24} /></div>
              <div className="empty-state-title">No Cash Flow Data</div>
              <div className="empty-state-text">Import or add transactions to see cash flow.</div>
              <button className="btn btn-primary btn-sm" onClick={onOpenImport}>Import CSV</button>
            </div>
          )}
        </div>

        {/* Spending by Category Pie Chart */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Spending by Category</h3>
          {categoryData.length > 0 ? (
            <div>
              <div style={{ width: '100%', height: '170px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `₹${Number(value).toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Clean Structured Category Legends (Zero Overlap) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginTop: '12px', maxHeight: '130px', overflowY: 'auto', paddingRight: '4px' }}>
                {categoryData.map((cat, idx) => (
                  <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '4px 6px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[idx % COLORS.length], flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80px' }} title={cat.name}>
                      {cat.name}
                    </span>
                    <span style={{ fontWeight: '700', marginLeft: 'auto', color: 'var(--text-main)', fontSize: '11px' }}>
                      ₹{Number(cat.value).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '36px 16px' }}>
              <div className="empty-state-icon"><PiggyBank size={24} /></div>
              <div className="empty-state-title">No Category Data</div>
              <div className="empty-state-text">Categorized expense transactions will appear here.</div>
              <button className="btn btn-secondary btn-sm" onClick={onOpenAddEntry}>Add Transaction</button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Grid: Recent Activity & WealthPulse Insight */}
      <div className="grid-2">
        {/* Recent Activity (All Account Transactions Displayed) */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Recent Account Transactions</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigateTab('transactions')}>
              View all ({filteredTransactions.length}) →
            </button>
          </div>

          {recentTx.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="table-container desktop-table-view">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date & Merchant</th>
                      <th>Category</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTx.map(tx => (
                      <tr key={tx.id}>
                        <td>
                          <div style={{ fontWeight: '600' }}>{tx.merchant}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{tx.date}</div>
                        </td>
                        <td>
                          <span className="badge badge-secondary">{tx.category}</span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '600', color: tx.type === 'income' ? 'var(--success)' : 'var(--text-main)' }}>
                          {tx.type === 'income' ? '+' : '-'}₹{Math.abs(tx.amount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Recent Activity Card List */}
              <div className="mobile-cards-view">
                {recentTx.map(tx => (
                  <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', marginBottom: '8px' }}>
                    <div style={{ minWidth: 0, flex: 1, paddingRight: '8px' }}>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tx.merchant}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <span>{tx.date}</span> • <span className="badge badge-secondary" style={{ fontSize: '10px', padding: '1px 6px' }}>{tx.category}</span>
                      </div>
                    </div>
                    <div style={{ fontWeight: '700', fontSize: '14px', flexShrink: 0, color: tx.type === 'income' ? 'var(--success)' : 'var(--text-main)' }}>
                      {tx.type === 'income' ? '+' : '-'}₹{Math.abs(tx.amount).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ padding: '24px 16px' }}>
              <div className="empty-state-text">No recent transactions in selected period.</div>
            </div>
          )}
        </div>

        {/* WealthPulse Insights & Coming Up */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* WealthPulse Insight Panel */}
          <div className="card card-navy">
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: 'white' }}>
              WealthPulse Insight
            </h3>
            {needsReviewCount > 0 ? (
              <div style={{ fontSize: '14px', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} style={{ color: '#F97316' }} />
                <span>You have <strong>{needsReviewCount}</strong> transactions flagged as <em>Needs review</em>. Review them in Transactions.</span>
              </div>
            ) : (
              <div style={{ fontSize: '14px', color: '#CBD5E1' }}>
                All saved transactions have assigned categories. Excellent organization!
              </div>
            )}
          </div>

          {/* Coming Up */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600' }}>Coming Up</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => onNavigateTab('recurring')}>
                Manage →
              </button>
            </div>

            {comingUp.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {comingUp.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-app)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '13px' }}>{item.merchant || item.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.frequency || 'Monthly'}</div>
                    </div>
                    <div style={{ fontWeight: '600', fontSize: '13px' }}>
                      ₹{Math.abs(item.amount).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                No upcoming confirmed recurring bills. Add or confirm items in <strong>Recurring</strong>.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helpers
function filterByPeriod(txs, period) {
  if (period === 'all-time') return txs;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  return txs.filter(t => {
    const d = new Date(t.date);
    if (period === 'this-month') return d.getFullYear() === year && d.getMonth() === month;
    if (period === 'last-month') return d.getFullYear() === year && d.getMonth() === month - 1;
    if (period === 'last-3-months') {
      const threeMonthsAgo = new Date(year, month - 3, 1);
      return d >= threeMonthsAgo;
    }
    if (period === 'last-6-months') {
      const sixMonthsAgo = new Date(year, month - 6, 1);
      return d >= sixMonthsAgo;
    }
    if (period === 'this-year') return d.getFullYear() === year;
    return true;
  });
}

const CustomCashFlowTooltip = ({ active, payload, label, isPrivacyMode }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  const mask = (v) => isPrivacyMode ? '₹••••' : `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  return (
    <div
      style={{
        background: 'rgba(10, 25, 47, 0.95)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: '14px',
        padding: '12px 16px',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        color: '#F8FAFC',
        minWidth: '220px',
        fontSize: '12px'
      }}
    >
      <div style={{ fontWeight: '800', color: '#10B981', marginBottom: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '4px' }}>
        📅 {data.fullDate || label}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#10B981', fontWeight: '700' }}>● Income:</span>
          <span style={{ fontWeight: '800' }}>{mask(data.income)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#F97316', fontWeight: '700' }}>● Spending:</span>
          <span style={{ fontWeight: '800' }}>{mask(data.spending)}</span>
        </div>
      </div>

      {data.itemizedSpends && data.itemizedSpends.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '6px', marginTop: '4px' }}>
          <div style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '4px' }}>
            Itemized Spends Breakdown:
          </div>
          {data.itemizedSpends.slice(0, 4).map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#CBD5E1', marginBottom: '2px' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px' }}>• {item.category}</span>
              <span style={{ color: '#FCA5A5', fontWeight: '700' }}>{mask(item.amount)}</span>
            </div>
          ))}
          {data.itemizedSpends.length > 4 && (
            <div style={{ fontSize: '10px', color: '#94A3B8', textAlign: 'right', marginTop: '2px' }}>
              +{data.itemizedSpends.length - 4} more items
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function getCashFlowChartData(txs, viewMode = 'daily') {
  if (!txs || txs.length === 0) return [];

  const sorted = [...txs].sort((a, b) => new Date(a.date) - new Date(b.date));

  if (viewMode === 'monthly') {
    const map = {};
    for (const t of sorted) {
      const key = t.date ? t.date.substring(0, 7) : 'Unknown';
      if (!map[key]) map[key] = { dateLabel: key, fullDate: key, income: 0, spending: 0, dayTxs: [] };
      if (t.type === 'income') map[key].income += Math.abs(t.amount);
      else if (t.type === 'expense') map[key].spending += Math.abs(t.amount);
      map[key].dayTxs.push(t);
    }
    const keys = Object.keys(map).sort();
    return keys.map(k => {
      const categoryMap = {};
      for (const t of map[k].dayTxs) {
        if (t.type === 'expense') {
          const cat = t.category || t.merchant || 'Other';
          categoryMap[cat] = (categoryMap[cat] || 0) + Math.abs(t.amount);
        }
      }
      const itemizedSpends = Object.keys(categoryMap).map(c => ({ category: c, amount: categoryMap[c] })).sort((a, b) => b.amount - a.amount);
      return {
        dateLabel: k,
        fullDate: `Month ${k}`,
        income: Math.round(map[k].income),
        spending: Math.round(map[k].spending),
        itemizedSpends
      };
    });
  }

  const firstTxDate = new Date(sorted[0].date);
  const lastTxDate = new Date(sorted[sorted.length - 1].date);

  const minDate = new Date(firstTxDate);
  const maxDate = new Date(lastTxDate);
  const dayDiff = (maxDate - minDate) / (1000 * 60 * 60 * 24);
  if (dayDiff < 14) {
    minDate.setDate(minDate.getDate() - (14 - Math.round(dayDiff)));
  }

  const mapByDate = {};
  for (const t of sorted) {
    const dStr = t.date ? t.date.substring(0, 10) : '';
    if (!dStr) continue;
    if (!mapByDate[dStr]) mapByDate[dStr] = { income: 0, spending: 0, txs: [] };
    if (t.type === 'income') mapByDate[dStr].income += Math.abs(t.amount);
    else if (t.type === 'expense') mapByDate[dStr].spending += Math.abs(t.amount);
    mapByDate[dStr].txs.push(t);
  }

  const result = [];
  let curr = new Date(minDate);
  let cumIncome = 0;
  let cumSpending = 0;

  while (curr <= maxDate || result.length < 14) {
    const dStr = curr.toISOString().substring(0, 10);
    const dayObj = mapByDate[dStr] || { income: 0, spending: 0, txs: [] };

    cumIncome += dayObj.income;
    cumSpending += dayObj.spending;

    const dateLabel = curr.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const fullDate = curr.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

    const categoryMap = {};
    for (const t of dayObj.txs) {
      if (t.type === 'expense') {
        const cat = t.category || t.merchant || 'Other';
        categoryMap[cat] = (categoryMap[cat] || 0) + Math.abs(t.amount);
      }
    }
    const itemizedSpends = Object.keys(categoryMap).map(c => ({ category: c, amount: categoryMap[c] })).sort((a, b) => b.amount - a.amount);

    result.push({
      dateStr: dStr,
      dateLabel,
      fullDate,
      income: viewMode === 'cumulative' ? Math.round(cumIncome) : Math.round(dayObj.income),
      spending: viewMode === 'cumulative' ? Math.round(cumSpending) : Math.round(dayObj.spending),
      rawIncome: dayObj.income,
      rawSpending: dayObj.spending,
      txs: dayObj.txs,
      itemizedSpends
    });

    curr.setDate(curr.getDate() + 1);
    if (result.length > 120) break;
  }

  return result;
}

function getSpendingByCategoryData(txs) {
  const map = {};
  for (const t of txs) {
    if (t.type === 'expense') {
      const cat = t.category || 'Other';
      map[cat] = (map[cat] || 0) + Math.abs(t.amount);
    }
  }
  return Object.keys(map).map(k => ({ name: k, value: Math.round(map[k]) }));
}
