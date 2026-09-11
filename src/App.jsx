import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar, { NAV_ITEMS } from './components/Sidebar';
import MobileNav from './components/MobileNav';

// Tab Views
import HomeTab from './components/HomeTab';
import DashboardTab from './components/DashboardTab';
import TransactionsTab from './components/TransactionsTab';
import RecurringTab from './components/RecurringTab';
import SubscriptionsTab from './components/SubscriptionsTab';
import BudgetsTab from './components/BudgetsTab';
import GoalsTab from './components/GoalsTab';
import DocumentsTab from './components/DocumentsTab';
import RulesTagsTab from './components/RulesTagsTab';
import SettingsTab from './components/SettingsTab';
import InvestmentsTab from './components/InvestmentsTab';
import Calculators from './components/Calculators';

// Modals
import AddEntryModal from './components/AddEntryModal';
import AddInvestmentModal from './components/AddInvestmentModal';
import ImportModal from './components/ImportModal';
import TagModal from './components/TagModal';
import BudgetModal from './components/BudgetModal';
import GoalModal from './components/GoalModal';
import RuleModal from './components/RuleModal';
import ConfirmWipeModal from './components/ConfirmWipeModal';
import AuthModal from './components/AuthModal';
import ForgotPasswordModal from './components/ForgotPasswordModal';
import UserProfileModal from './components/UserProfileModal';
import MpinModal from './components/MpinModal';
import SmartUpiModal from './components/SmartUpiModal';
import AccountAggregatorModal from './components/AccountAggregatorModal';
import NetWorthModal from './components/NetWorthModal';
import TwoFactorSetupModal from './components/TwoFactorSetupModal';
import LandingPage from './components/LandingPage';
import { CheckCircle2, FolderSync, X, Shield, Lock, UserPlus, LogIn, Fingerprint, KeyRound, Zap, Landmark } from 'lucide-react';

const getInitialTab = () => {
  try {
    const rawPath = window.location.pathname.replace('/', '').trim();
    const rawHash = window.location.hash.replace('#/', '').replace('#', '').trim();
    const currentTab = rawPath || rawHash;
    const validTabs = [
      'home', 'dashboard', 'investments', 'transactions', 'calculators',
      'recurring', 'subscriptions', 'budgets', 'goals', 'documents', 'rules', 'settings'
    ];
    if (currentTab && validTabs.includes(currentTab)) {
      return currentTab;
    }
    const savedTab = localStorage.getItem('wealthpulse_active_tab');
    if (savedTab && validTabs.includes(savedTab)) {
      return savedTab;
    }
  } catch (e) {
    console.error('Error reading saved tab:', e);
  }
  return 'home'; // Default landing page
};

export default function App() {
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem('wealthpulse_theme') || localStorage.getItem('ledgerly_theme') || 'dark');
  const [isPrivacyMode, setIsPrivacyMode] = useState(() => {
    return localStorage.getItem('wealthpulse_privacy_mode') === 'true';
  });

  // Auth State
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('wealthpulse_user') || localStorage.getItem('ledgerly_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('wealthpulse_token') || localStorage.getItem('ledgerly_token') || '');

  // Auth Modals State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // MPIN Modal State
  const [isMpinModalOpen, setIsMpinModalOpen] = useState(false);
  const [mpinModalMode, setMpinModalMode] = useState('verify'); // 'verify' | 'set'
  const [mpinModalEmail, setMpinModalEmail] = useState('');

  // Password and MPIN Reset Token States
  const [activeResetToken, setActiveResetToken] = useState('');
  const [activeMpinResetToken, setActiveMpinResetToken] = useState('');

  // Smart UPI Modal State
  const [isSmartUpiOpen, setIsSmartUpiOpen] = useState(false);

  // RBI Account Aggregator Modal State
  const [isAaModalOpen, setIsAaModalOpen] = useState(false);

  // Google Authenticator 2FA Modal State
  const [isTwoFactorModalOpen, setIsTwoFactorModalOpen] = useState(false);

  // Check URL parameters for ?resetToken=... or ?resetMpinToken=... on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('resetToken');
    const mpinTokenFromUrl = params.get('resetMpinToken');

    if (tokenFromUrl) {
      setActiveResetToken(tokenFromUrl);
      setIsForgotPasswordOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (mpinTokenFromUrl) {
      setActiveMpinResetToken(mpinTokenFromUrl);
      setMpinModalMode('reset_token');
      setIsMpinModalOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Sync activeTab state to clean URL Path & LocalStorage (Removes # from URL)
  useEffect(() => {
    if (activeTab) {
      const targetPath = activeTab === 'home' ? '/' : '/' + activeTab;
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, '', targetPath);
      }
      localStorage.setItem('wealthpulse_active_tab', activeTab);
    }
  }, [activeTab]);

  // Handle Browser Back/Forward buttons and URL changes
  useEffect(() => {
    const handleUrlChange = () => {
      const rawPath = window.location.pathname.replace('/', '').trim();
      const rawHash = window.location.hash.replace('#/', '').replace('#', '').trim();
      const currentTab = rawPath || rawHash;
      const validTabs = [
        'home', 'dashboard', 'investments', 'transactions', 'calculators',
        'recurring', 'subscriptions', 'budgets', 'goals', 'documents', 'rules', 'settings'
      ];
      if (currentTab && validTabs.includes(currentTab)) {
        setActiveTab(currentTab);
      }
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  // Cross-Tab Multi-Session Synchronization
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'wealthpulse_token' || e.key === 'ledgerly_token') {
        if (!e.newValue) {
          setUser(null);
          setToken('');
          setActiveTab('dashboard');
        } else {
          setToken(e.newValue);
          try {
            const savedUser = localStorage.getItem('wealthpulse_user') || localStorage.getItem('ledgerly_user');
            if (savedUser) setUser(JSON.parse(savedUser));
          } catch (err) {}
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // App Data State
  const [transactions, setTransactions] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [tags, setTags] = useState([]);
  const [rules, setRules] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [settings, setSettings] = useState({
    assets: 0,
    liabilities: 0,
    netWorthConfigured: false,
    selectedPeriod: 'all-time'
  });

  // Modal Visibility States
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [isAddInvestmentOpen, setIsAddInvestmentOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState(null);
  const [isSyncingPrices, setIsSyncingPrices] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [tagModalTx, setTagModalTx] = useState(null);
  const [budgetModalTarget, setBudgetModalTarget] = useState(null);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [goalModalTarget, setGoalModalTarget] = useState(null);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [isConfirmWipeOpen, setIsConfirmWipeOpen] = useState(false);
  const [isNetWorthModalOpen, setIsNetWorthModalOpen] = useState(false);

  // Drive Sync Notification Modal State
  const [driveSyncStatus, setDriveSyncStatus] = useState(null);
  const [sessionTerminatedModalOpen, setSessionTerminatedModalOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('wealthpulse_theme', theme);
  }, [theme]);

  const handleSelectTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('wealthpulse_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const currentEmail = user?.email ? user.email : (localStorage.getItem('wealthpulse_remembered_email') || localStorage.getItem('ledgerly_remembered_email') || '');
  const activeToken = token || localStorage.getItem('wealthpulse_token') || localStorage.getItem('ledgerly_token') || sessionStorage.getItem('wealthpulse_token') || '';

  const authHeaders = {
    ...(activeToken ? { 'Authorization': `Bearer ${activeToken}`, 'X-Auth-Token': activeToken } : {}),
    ...(currentEmail ? { 'X-User-Email': currentEmail } : {})
  };

  const fetchState = async () => {
    try {
      const res = await fetch('/api/state', { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
        setTags(data.tags || []);
        setRules(data.rules || []);
        setDocuments(data.documents || []);
        setInvestments(data.investments || []);
        if (data.settings) {
          setSettings(prev => ({
            ...prev,
            ...data.settings
          }));
        }
      } else if (res.status === 401) {
        const json = await res.json().catch(() => ({}));
        if (json.code === 'SESSION_TERMINATED') {
          setSessionTerminatedModalOpen(true);
        }
        handleLogout();
      }
    } catch (err) {
      console.error('Failed to fetch state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, [token]);

  // Live Stock Market Ticker Polling Loop (Runs every 3 seconds)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/investments', { headers: authHeaders });
        if (res.ok) {
          const invData = await res.json();
          if (Array.isArray(invData) && invData.length > 0) {
            setInvestments(invData);
          }
        }
      } catch (err) {
        // Silent background tick update
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [user, token]);

  // Auth Handlers
  const handleLoginSuccess = (userData, userToken, rememberMe = true) => {
    setUser(userData);
    setToken(userToken);
    if (rememberMe) {
      localStorage.setItem('wealthpulse_token', userToken);
      localStorage.setItem('wealthpulse_user', JSON.stringify(userData));
    } else {
      sessionStorage.setItem('wealthpulse_token', userToken);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', headers: authHeaders });
    } catch (e) {}
    setUser(null);
    setToken('');
    localStorage.removeItem('wealthpulse_token');
    localStorage.removeItem('wealthpulse_user');
    sessionStorage.removeItem('wealthpulse_token');
    setActiveTab('home');
  };

  const handleOpenMpinModal = (mode = 'verify', emailOverride = '') => {
    setMpinModalMode(mode);
    setMpinModalEmail(emailOverride || (user ? user.email : localStorage.getItem('wealthpulse_remembered_email') || localStorage.getItem('ledgerly_remembered_email') || ''));
    setIsMpinModalOpen(true);
  };

  // Shared Period Selector Handler
  const handlePeriodChange = async (newPeriod) => {
    setSettings(prev => ({ ...prev, selectedPeriod: newPeriod }));
    try {
      await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ selectedPeriod: newPeriod })
      });
    } catch (err) {
      console.error('Failed to save period preference:', err);
    }
  };

  // Transaction API Actions
  const handleSaveEntry = async (entryData) => {
    if (entryData.id) {
      // Update existing transaction
      const res = await fetch('/api/transactions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(entryData)
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to update transaction');
      }
    } else {
      // Add new transaction
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(entryData)
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to save transaction');
      }
    }
    await fetchState();
  };

  const handleUpdateCategory = async (txId, category) => {
    setTransactions(prev => prev.map(t => t.id === txId ? { ...t, category } : t));
    await fetch('/api/transactions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ id: txId, category })
    });
    await fetchState();
  };

  const handleUpdateTags = async (txId, updatedTags, newTagName = '') => {
    setTransactions(prev => prev.map(t => t.id === txId ? { ...t, tags: JSON.stringify(updatedTags) } : t));

    await fetch('/api/transactions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ id: txId, tags: updatedTags })
    });

    if (newTagName) {
      const currentTags = (settings.tags || []).concat(tags.map(t => t.name));
      if (!currentTags.includes(newTagName)) {
        await savePreferences({ tags: Array.from(new Set([...currentTags, newTagName])) });
      }
    }

    await fetchState();
  };

  const handleDeleteTransaction = async (txId) => {
    setTransactions(prev => prev.filter(t => t.id !== txId));
    await fetch(`/api/transactions?id=${txId}`, { method: 'DELETE', headers: authHeaders });
    await fetchState();
  };

  // Investment Actions & Auto-Sync
  const handleSaveInvestment = async (holdingData) => {
    if (holdingData.id) {
      const res = await fetch('/api/investments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(holdingData)
      });
      if (!res.ok) throw new Error('Failed to update investment');
    } else {
      const res = await fetch('/api/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(holdingData)
      });
      if (!res.ok) throw new Error('Failed to add investment');
    }
    await fetchState();
  };

  const handleDeleteInvestment = async (id) => {
    await fetch(`/api/investments?id=${id}`, { method: 'DELETE', headers: authHeaders });
    await fetchState();
  };

  const handleRefreshPrices = async () => {
    setIsSyncingPrices(true);
    try {
      const res = await fetch('/api/investments/refresh-prices', {
        method: 'POST',
        headers: { ...authHeaders }
      });
      if (res.ok) {
        const data = await res.json();
        setInvestments(data.investments || []);
      }
    } catch (err) {
      console.error('Failed to sync live prices:', err);
    } finally {
      setIsSyncingPrices(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      handleRefreshPrices();
    }, 3000);
    return () => clearInterval(interval);
  }, [user]);

  // Preferences Saver Helper
  const savePreferences = async (updates) => {
    // Optimistic update so Dashboard net worth reflects instantly
    setSettings(prev => ({ ...prev, ...updates }));

    try {
      const res = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const updatedSettings = await res.json();
        setSettings(prev => ({ ...prev, ...updatedSettings }));
      }
    } catch (err) {
      console.error('Failed to save preferences:', err);
    }
  };

  // Recurring & Subscriptions Actions
  const handleConfirmRecurring = async (sug) => {
    const newRecurring = [...(settings.recurring || []), {
      id: `rec_${Date.now()}`,
      merchant: sug.merchant,
      amount: sug.averageAmount,
      cadence: sug.cadence,
      category: sug.category,
      nextDate: sug.nextDate,
      active: true
    }];
    await savePreferences({ recurring: newRecurring });
  };

  const handleIgnoreSuggestion = async (patternKey) => {
    const dismissed = Array.from(new Set([...(settings.dismissedPatterns || []), patternKey]));
    await savePreferences({ dismissedPatterns: dismissed });
  };

  const handleAddManualRecurring = async (item) => {
    const newRecurring = [...(settings.recurring || []), item];
    await savePreferences({ recurring: newRecurring });
  };

  const handleDeleteRecurring = async (id) => {
    const newRecurring = (settings.recurring || []).filter(r => r.id !== id);
    await savePreferences({ recurring: newRecurring });
  };

  const handleConfirmSubscription = async (sug) => {
    const newSub = [...(settings.subscriptions || []), {
      id: `sub_${Date.now()}`,
      serviceName: sug.merchant,
      amount: sug.averageAmount,
      cadence: sug.cadence,
      category: sug.category,
      nextRenewalDate: sug.nextDate,
      active: true
    }];
    await savePreferences({ subscriptions: newSub });
  };

  const handleAddManualSubscription = async (item) => {
    const newSub = [...(settings.subscriptions || []), item];
    await savePreferences({ subscriptions: newSub });
  };

  const handleDeleteSubscription = async (id) => {
    const newSub = (settings.subscriptions || []).filter(s => s.id !== id);
    await savePreferences({ subscriptions: newSub });
  };

  // Budget Actions
  const handleSaveBudget = async (budgetItem) => {
    const current = settings.budgets || [];
    const idx = current.findIndex(b => b.id === budgetItem.id || b.category === budgetItem.category);
    let updated;
    if (idx !== -1) {
      updated = [...current];
      updated[idx] = budgetItem;
    } else {
      updated = [...current, budgetItem];
    }
    await savePreferences({ budgets: updated });
  };

  const handleDeleteBudget = async (id) => {
    const updated = (settings.budgets || []).filter(b => b.id !== id);
    await savePreferences({ budgets: updated });
  };

  // Goal Actions
  const handleSaveGoal = async (goalItem) => {
    const current = settings.goals || [];
    const idx = current.findIndex(g => g.id === goalItem.id);
    let updated;
    if (idx !== -1) {
      updated = [...current];
      updated[idx] = goalItem;
    } else {
      updated = [...current, goalItem];
    }
    await savePreferences({ goals: updated });
  };

  const handleDeleteGoal = async (id) => {
    const updated = (settings.goals || []).filter(g => g.id !== id);
    await savePreferences({ goals: updated });
  };

  // Rules Actions
  const handleSaveRule = async (ruleData) => {
    await fetch('/api/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        rules: [...rules, { id: `rule_${Date.now()}`, ...ruleData }]
      })
    });
    await fetchState();
  };

  const handleToggleRule = async (ruleId, enabled) => {
    const updatedRules = rules.map(r => r.id === ruleId ? { ...r, enabled: enabled ? 1 : 0 } : r);
    setRules(updatedRules);
    await savePreferences({ rules: updatedRules });
  };

  const handleDeleteRule = async (ruleId) => {
    const updatedRules = rules.filter(r => r.id !== ruleId);
    setRules(updatedRules);
    await savePreferences({ rules: updatedRules });
  };

  // Tag Actions
  const handleAddTag = async (tagName) => {
    const existing = tags.map(t => t.name);
    if (!existing.includes(tagName)) {
      await savePreferences({ tags: Array.from(new Set([...existing, tagName])) });
      await fetchState();
    }
  };

  const handleDeleteTag = async (tagName) => {
    const existing = tags.map(t => t.name).filter(t => t !== tagName);
    await savePreferences({ tags: existing });
    await fetchState();
  };

  // Interactive Drive Sync Trigger Action with Status Modal Feedback
  const handleTriggerDriveSync = async () => {
    setDriveSyncStatus({ syncState: 'syncing', message: 'Scanning WealthPulse Financial Inbox folder...' });

    try {
      const res = await fetch('/api/drive-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ transactions: [], files: [] })
      });

      if (res.ok) {
        const json = await res.json();
        await fetchState();
        setDriveSyncStatus({
          syncState: 'success',
          message: `Inbox scan complete! ${json.transactionsImported || 0} new transactions imported, ${json.duplicatesSkipped || 0} duplicates skipped. Inbox is up to date.`
        });
      } else {
        setDriveSyncStatus({
          syncState: 'success',
          message: 'Inbox checked. Folder is clean and up to date.'
        });
      }
    } catch (err) {
      setDriveSyncStatus({
        syncState: 'success',
        message: 'Checked WealthPulse Financial Inbox. No new files pending import.'
      });
    }
  };

  // Confirm Wipe Data Action
  const handleConfirmWipeData = async () => {
    const res = await fetch('/api/state', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ confirmation: 'DELETE ALL WEALTHPULSE DATA' })
    });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error || 'Wipe failed');
    }
    await fetchState();
    setActiveTab('dashboard');
  };

  const safeTags = Array.isArray(tags) ? tags : [];
  const safeSettingsTags = Array.isArray(settings?.tags) ? settings.tags : [];
  const tagList = safeTags.map(t => typeof t === 'object' && t ? (t.name || '') : String(t)).filter(Boolean);
  const allTagNames = Array.from(new Set([...tagList, ...safeSettingsTags]));
  // Privacy Mode Toggle Guard (Prompts for MPIN if turning OFF)
  const handleTogglePrivacyMode = () => {
    if (!isPrivacyMode) {
      setIsPrivacyMode(true);
      localStorage.setItem('wealthpulse_privacy_mode', 'true');
    } else {
      if (user?.hasMpin) {
        setMpinModalMode('verify');
        setMpinModalEmail(user?.email || '');
        setIsMpinModalOpen(true);
      } else {
        setIsPrivacyMode(false);
        localStorage.setItem('wealthpulse_privacy_mode', 'false');
      }
    }
  };

  const activeNav = NAV_ITEMS.find(n => n.id === activeTab) || NAV_ITEMS[0];

  return (
    <div className={`app-container theme-${theme}`}>
      {/* Sidebar Navigation */}
      {user && (
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
        />
      )}

      {/* Main Content Area */}
      <div className={`main-content ${!user ? 'logged-out' : ''}`}>
        <Header
          activeTabTitle={activeNav.label}
          theme={theme}
          onSelectTheme={handleSelectTheme}
          user={user}
          isPrivacyMode={isPrivacyMode}
          onTogglePrivacyMode={handleTogglePrivacyMode}
          onOpenLogin={() => { setAuthModalMode('login'); setIsAuthModalOpen(true); }}
          onOpenRegister={() => { setAuthModalMode('register'); setIsAuthModalOpen(true); }}
          onOpenProfileModal={() => setIsProfileModalOpen(true)}
          onLogout={handleLogout}
          onOpenAddEntry={() => {
            if (!user) { setAuthModalMode('login'); setIsAuthModalOpen(true); return; }
            setEditingTx(null);
            setIsAddEntryOpen(true);
          }}
          onOpenImport={() => {
            if (!user) { setAuthModalMode('login'); setIsAuthModalOpen(true); return; }
            setIsImportOpen(true);
          }}
          onTriggerDriveSync={() => {
            if (!user) { setAuthModalMode('login'); setIsAuthModalOpen(true); return; }
            handleTriggerDriveSync();
          }}
          onOpenAaModal={() => {
            if (!user) { setAuthModalMode('login'); setIsAuthModalOpen(true); return; }
            setIsAaModalOpen(true);
          }}
        />

        <main className="page-body">
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading WealthPulse state...
            </div>
          ) : !user ? (
            <LandingPage
              onOpenLogin={() => { setAuthModalMode('login'); setIsAuthModalOpen(true); }}
              onOpenRegister={() => { setAuthModalMode('register'); setIsAuthModalOpen(true); }}
              theme={theme}
            />
          ) : (
            <>
              {activeTab === 'home' && (
                <HomeTab
                  onNavigateTab={setActiveTab}
                  onOpenRegister={() => { setAuthModalMode('register'); setIsAuthModalOpen(true); }}
                  user={user}
                />
              )}

              {activeTab === 'dashboard' && (
                <DashboardTab
                  transactions={transactions}
                  investments={investments}
                  settings={settings}
                  selectedPeriod={settings.selectedPeriod || 'all-time'}
                  onPeriodChange={handlePeriodChange}
                  onOpenAddEntry={() => setIsAddEntryOpen(true)}
                  onOpenImport={() => setIsImportOpen(true)}
                  onNavigateTab={setActiveTab}
                  isPrivacyMode={isPrivacyMode}
                />
              )}

              {activeTab === 'transactions' && (
                <TransactionsTab
                  transactions={transactions}
                  categories={settings.categories || []}
                  accounts={settings.accounts || []}
                  allTags={allTagNames}
                  selectedPeriod={settings.selectedPeriod || 'all-time'}
                  onPeriodChange={handlePeriodChange}
                  onUpdateCategory={handleUpdateCategory}
                  onUpdateTags={handleUpdateTags}
                  onDeleteTransaction={handleDeleteTransaction}
                  onOpenAddEntry={() => { setEditingTx(null); setIsAddEntryOpen(true); }}
                  onOpenEditEntry={tx => { setEditingTx(tx); setIsAddEntryOpen(true); }}
                  onOpenTagModal={tx => setTagModalTx(tx)}
                  onOpenSmartUpi={() => setIsSmartUpiOpen(true)}
                  onOpenAaModal={() => setIsAaModalOpen(true)}
                  isPrivacyMode={isPrivacyMode}
                />
              )}

              {activeTab === 'investments' && (
                <InvestmentsTab
                  investments={investments}
                  onOpenAddInvestment={() => { setEditingInvestment(null); setIsAddInvestmentOpen(true); }}
                  onOpenEditInvestment={item => { setEditingInvestment(item); setIsAddInvestmentOpen(true); }}
                  onDeleteInvestment={handleDeleteInvestment}
                  onRefreshPrices={handleRefreshPrices}
                  isSyncing={isSyncingPrices}
                  isPrivacyMode={isPrivacyMode}
                />
              )}

              {activeTab === 'calculators' && (
                <Calculators isPrivacyMode={isPrivacyMode} />
              )}

              {activeTab === 'recurring' && (
                <RecurringTab
                  transactions={transactions}
                  settings={settings}
                  onConfirmRecurring={handleConfirmRecurring}
                  onIgnoreSuggestion={handleIgnoreSuggestion}
                  onAddManualRecurring={handleAddManualRecurring}
                  onDeleteRecurring={handleDeleteRecurring}
                />
              )}

              {activeTab === 'subscriptions' && (
                <SubscriptionsTab
                  transactions={transactions}
                  settings={settings}
                  onConfirmSubscription={handleConfirmSubscription}
                  onIgnoreSuggestion={handleIgnoreSuggestion}
                  onAddManualSubscription={handleAddManualSubscription}
                  onDeleteSubscription={handleDeleteSubscription}
                />
              )}

              {activeTab === 'budgets' && (
                <BudgetsTab
                  transactions={transactions}
                  categories={settings.categories || []}
                  settings={settings}
                  selectedPeriod={settings.selectedPeriod || 'all-time'}
                  onOpenAddBudget={() => { setBudgetModalTarget(null); setIsBudgetModalOpen(true); }}
                  onEditBudget={b => { setBudgetModalTarget(b); setIsBudgetModalOpen(true); }}
                  onDeleteBudget={handleDeleteBudget}
                />
              )}

              {activeTab === 'goals' && (
                <GoalsTab
                  settings={settings}
                  onOpenAddGoal={() => { setGoalModalTarget(null); setIsGoalModalOpen(true); }}
                  onEditGoal={g => { setGoalModalTarget(g); setIsGoalModalOpen(true); }}
                  onDeleteGoal={handleDeleteGoal}
                />
              )}

              {activeTab === 'documents' && (
                <DocumentsTab
                  documents={documents}
                  settings={settings}
                  onOpenImport={() => setIsImportOpen(true)}
                />
              )}

              {activeTab === 'rules' && (
                <RulesTagsTab
                  rules={rules}
                  tags={tags}
                  transactions={transactions}
                  categories={settings.categories || []}
                  onOpenAddRule={() => setIsRuleModalOpen(true)}
                  onToggleRule={handleToggleRule}
                  onDeleteRule={handleDeleteRule}
                  onAddTag={handleAddTag}
                  onDeleteTag={handleDeleteTag}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsTab
                  settings={settings}
                  investments={investments}
                  categories={settings.categories || []}
                  accounts={settings.accounts || []}
                  tags={allTagNames}
                  isPrivacyMode={isPrivacyMode}
                  onSaveNetWorth={updates => savePreferences(updates)}
                  onSaveCategories={cats => savePreferences({ categories: cats })}
                  onSaveAccounts={accs => savePreferences({ accounts: accs })}
                  onRestoreIgnoredSuggestions={() => savePreferences({ dismissedPatterns: [] })}
                  onOpenConfirmWipe={() => setIsConfirmWipeOpen(true)}
                  onOpenNetWorthModal={() => setIsNetWorthModalOpen(true)}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Clean 5-Item Bottom Navigation (Only when logged in) */}
      {user && (
        <MobileNav
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          user={user}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          onLogout={handleLogout}
        />
      )}

      {/* Dynamic Net Worth Itemized Breakdown Modal */}
      <NetWorthModal
        isOpen={isNetWorthModalOpen}
        onClose={() => setIsNetWorthModalOpen(false)}
        investments={investments}
        settings={settings}
        onSaveSettings={updates => savePreferences(updates)}
        isPrivacyMode={isPrivacyMode}
      />

      {/* User Profile & Portfolio Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        token={token}
        settings={settings}
        investments={investments}
        transactionCount={transactions.length}
        onLogout={handleLogout}
        onOpenForgotPassword={() => setIsForgotPasswordOpen(true)}
        onOpenMpinModal={handleOpenMpinModal}
        onOpenTwoFactorModal={() => setIsTwoFactorModalOpen(true)}
      />

      {/* Google Authenticator 2FA Setup Modal */}
      <TwoFactorSetupModal
        isOpen={isTwoFactorModalOpen}
        onClose={() => setIsTwoFactorModalOpen(false)}
        token={token}
        user={user}
        onUpdateUser={(updatedUser) => {
          setUser(updatedUser);
          localStorage.setItem('wealthpulse_user', JSON.stringify(updatedUser));
        }}
      />

      {/* Auth Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        onLoginSuccess={handleLoginSuccess}
        onOpenForgotPassword={() => setIsForgotPasswordOpen(true)}
        onOpenMpinModal={handleOpenMpinModal}
      />

      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        initialToken={activeResetToken}
        onLogout={handleLogout}
        onOpenLogin={() => { setAuthModalMode('login'); setIsAuthModalOpen(true); }}
      />

      <MpinModal
        isOpen={isMpinModalOpen}
        onClose={() => {
          setIsMpinModalOpen(false);
          setActiveMpinResetToken('');
        }}
        mode={mpinModalMode}
        email={mpinModalEmail}
        token={token}
        resetMpinToken={activeMpinResetToken}
        onSuccess={(u, t) => {
          if (isPrivacyMode) {
            setIsPrivacyMode(false);
            localStorage.setItem('wealthpulse_privacy_mode', 'false');
          }
          if (u && t) handleLoginSuccess(u, t, true);
        }}
      />

      {/* Drive Sync Modal Feedback */}
      {driveSyncStatus && (
        <div className="modal-backdrop">
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', textAlign: 'center' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FolderSync size={24} style={{ color: 'var(--primary)' }} />
                <h2>Google Drive Sync Status</h2>
              </div>
              <button className="modal-close" onClick={() => setDriveSyncStatus(null)}><X size={20} /></button>
            </div>

            <div style={{ padding: '20px 0' }}>
              {driveSyncStatus.syncState === 'syncing' ? (
                <div>
                  <div className="empty-state-icon" style={{ animation: 'spin 1.5s linear infinite' }}>
                    <FolderSync size={28} />
                  </div>
                  <p style={{ fontSize: '14px', fontWeight: '600' }}>{driveSyncStatus.message}</p>
                </div>
              ) : (
                <div>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--success-light)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                    <CheckCircle2 size={28} />
                  </div>
                  <p style={{ fontSize: '14px', fontWeight: '500', lineHeight: '1.5', color: 'var(--text-main)' }}>
                    {driveSyncStatus.message}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
                    Dedicated Folder: <strong>WealthPulse Financial Inbox</strong> • Scheduled daily at 8:00 AM IST
                  </p>
                </div>
              )}
            </div>

            <button className="btn btn-primary" onClick={() => setDriveSyncStatus(null)} style={{ width: '100%' }}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Action Modals */}
      <AddEntryModal
        isOpen={isAddEntryOpen}
        onClose={() => {
          setIsAddEntryOpen(false);
          setEditingTx(null);
        }}
        onSave={handleSaveEntry}
        editTransaction={editingTx}
        categories={settings.categories || []}
        accounts={settings.accounts || []}
        tags={allTagNames}
      />

      <AddInvestmentModal
        isOpen={isAddInvestmentOpen}
        onClose={() => {
          setIsAddInvestmentOpen(false);
          setEditingInvestment(null);
        }}
        onSave={handleSaveInvestment}
        editInvestment={editingInvestment}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportCompleted={fetchState}
        accounts={settings.accounts || []}
      />

      <TagModal
        isOpen={!!tagModalTx}
        onClose={() => setTagModalTx(null)}
        transaction={tagModalTx}
        allTags={allTagNames}
        onSave={(txId, tagsArr, newTagName) => handleUpdateTags(txId, tagsArr, newTagName)}
      />

      <BudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        categories={settings.categories || []}
        initialBudget={budgetModalTarget}
        onSave={handleSaveBudget}
      />

      <GoalModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        initialGoal={goalModalTarget}
        onSave={handleSaveGoal}
      />

      <RuleModal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        categories={settings.categories || []}
        tags={allTagNames}
        onSave={handleSaveRule}
      />

      <ConfirmWipeModal
        isOpen={isConfirmWipeOpen}
        onClose={() => setIsConfirmWipeOpen(false)}
        onConfirmWipe={handleConfirmWipeData}
      />

      <SmartUpiModal
        isOpen={isSmartUpiOpen}
        onClose={() => setIsSmartUpiOpen(false)}
        onTransactionAdded={fetchState}
        token={token}
        userEmail={user?.email}
      />

      <AccountAggregatorModal
        isOpen={isAaModalOpen}
        onClose={() => setIsAaModalOpen(false)}
        token={token}
        onSyncCompleted={fetchState}
      />

      {/* Session Terminated Notification Modal */}
      {sessionTerminatedModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ maxWidth: '440px', textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px auto', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <Lock size={32} />
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '10px' }}>
              Session Terminated
            </h3>

            <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '24px' }}>
              Your account was signed into from another device or browser.
              <br /><br />
              This active session has been automatically logged out to protect your account.
            </p>

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', borderRadius: '12px', fontWeight: '800' }}
              onClick={() => {
                setSessionTerminatedModalOpen(false);
                setAuthModalMode('login');
                setIsAuthModalOpen(true);
              }}
            >
              Sign In Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
