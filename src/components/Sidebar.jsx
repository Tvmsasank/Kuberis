import React from 'react';
import {
  Home,
  LayoutDashboard,
  Receipt,
  TrendingUp,
  Calculator,
  RefreshCw,
  CreditCard,
  PieChart,
  Target,
  FileText,
  Sliders,
  Settings
} from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'investments', label: 'Investments', icon: TrendingUp },
  { id: 'transactions', label: 'Transactions', icon: Receipt },
  { id: 'calculators', label: 'Calculators', icon: Calculator },
  { id: 'recurring', label: 'Recurring', icon: RefreshCw },
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
  { id: 'budgets', label: 'Budgets', icon: PieChart },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'rules', label: 'Rules & Tags', icon: Sliders },
  { id: 'settings', label: 'Settings', icon: Settings }
];

export default function Sidebar({ activeTab, onSelectTab }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <button
          type="button"
          className="sidebar-logo"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}
          onClick={() => onSelectTab('home')}
          title="Go to Home / Landing Page"
        >
          <img src="/favicon.svg" alt="Kuberis" style={{ width: '30px', height: '30px', filter: 'drop-shadow(0 0 8px var(--primary-glow))' }} />
          <span>Kuberis</span>
        </button>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectTab(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
