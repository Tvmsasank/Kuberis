/**
 * Official Indian Savings Accounts Directory & Daily/Progressive Interest Engine
 * Authoritative Q3-Q4 FY 2026-27 Rates covering Slice Bank, High-Yield SFBs, Private Banks, and PSU Banks.
 */

export const SAVINGS_BANKS_CATALOG = [
  // 🕒 1. DAILY PAYOUT & DAILY COMPOUNDING
  {
    id: 'slice',
    name: 'Slice (Slice Small Finance Bank)',
    shortName: 'Slice Bank',
    category: 'daily_payout',
    badge: 'Daily Compounding',
    payoutFrequency: 'daily', // 'daily' | 'monthly' | 'quarterly' | 'annually'
    compoundingFrequency: 'daily',
    baseRate: 5.50,
    logo: '⚡',
    themeColor: '#7C3AED',
    headline: '5.50% p.a. • Credited Every 24 Hours',
    description: 'Calculates interest on daily closing balance and credits/compounds every morning into your savings account. Linked to 100% of the RBI repo rate.',
    officialSource: 'https://slice.bank.in/savings-account',
    isFlat: true,
    slabs: [
      { min: 0, max: Infinity, rate: 5.50, label: 'All balances (From ₹1 to No Limit)' }
    ]
  },

  // 📅 2. MONTHLY INTEREST PAYOUT (HIGH-YIELD PROGRESSIVE BANKS)
  {
    id: 'idfc_first',
    name: 'IDFC FIRST Bank',
    shortName: 'IDFC FIRST',
    category: 'monthly_payout',
    badge: 'Monthly Payout',
    payoutFrequency: 'monthly',
    compoundingFrequency: 'monthly',
    baseRate: 7.00,
    logo: '🏦',
    themeColor: '#991B1B',
    headline: 'Up to 7.00% p.a. • Monthly Interest Credit',
    description: 'Progressive tiered savings account. Balance up to ₹3 Lakh earns 2.50%, ₹3 Lakh to ₹25 Lakh earns high 7.00%. Credited on the 1st of every month.',
    officialSource: 'https://www.idfcfirst.bank.in/personal-banking/accounts/savings-account/interest-rate',
    isFlat: false,
    slabs: [
      { min: 0, max: 300000, rate: 2.50, label: 'Up to ₹3 Lakh' },
      { min: 300000, max: 2500000, rate: 7.00, label: 'Above ₹3 Lakh to ₹25 Lakh' },
      { min: 2500000, max: 50000000, rate: 6.25, label: 'Above ₹25 Lakh to ₹5 Crore' },
      { min: 50000000, max: Infinity, rate: 5.00, label: 'Above ₹5 Crore' }
    ]
  },
  {
    id: 'rbl_bank',
    name: 'RBL Bank',
    shortName: 'RBL Bank',
    category: 'monthly_payout',
    badge: 'Monthly Payout',
    payoutFrequency: 'monthly',
    compoundingFrequency: 'monthly',
    baseRate: 6.00,
    logo: '🔴',
    themeColor: '#DC2626',
    headline: 'Up to 6.00% p.a. • Monthly Compounding',
    description: 'High-yield private bank savings interest. Credited to account on the last day of each calendar month.',
    officialSource: 'https://www.rbl.bank.in/interest-rates',
    isFlat: false,
    slabs: [
      { min: 0, max: 500000, rate: 3.00, label: 'Up to ₹5 Lakh' },
      { min: 500000, max: 1000000, rate: 5.00, label: 'Above ₹5 Lakh to ₹10 Lakh' },
      { min: 1000000, max: 30000000, rate: 6.00, label: 'Above ₹10 Lakh to ₹3 Crore' },
      { min: 30000000, max: Infinity, rate: 5.25, label: 'Above ₹3 Crore' }
    ]
  },
  {
    id: 'au_sfb',
    name: 'AU Small Finance Bank',
    shortName: 'AU Bank',
    category: 'monthly_payout',
    badge: 'Monthly Payout',
    payoutFrequency: 'monthly',
    compoundingFrequency: 'monthly',
    baseRate: 6.50,
    logo: '🟠',
    themeColor: '#EA580C',
    headline: 'Up to 6.50% p.a. • Monthly Interest Credit',
    description: 'Tiered progressive interest credited at monthly intervals. Balances above ₹10 Lakh qualify for 6.50% rate tier.',
    officialSource: 'https://www.au.bank.in/interest-rates/savings-account-interest-rates',
    isFlat: false,
    slabs: [
      { min: 0, max: 300000, rate: 2.50, label: 'Up to ₹3 Lakh' },
      { min: 300000, max: 500000, rate: 2.75, label: 'Above ₹3 Lakh to ₹5 Lakh' },
      { min: 500000, max: 1000000, rate: 3.50, label: 'Above ₹5 Lakh to ₹10 Lakh' },
      { min: 1000000, max: 250000000, rate: 6.50, label: 'Above ₹10 Lakh to ₹25 Crore' }
    ]
  },
  {
    id: 'equitas_sfb',
    name: 'Equitas Small Finance Bank',
    shortName: 'Equitas SFB',
    category: 'monthly_payout',
    badge: 'Monthly Payout',
    payoutFrequency: 'monthly',
    compoundingFrequency: 'monthly',
    baseRate: 7.00,
    logo: '🟣',
    themeColor: '#7E22CE',
    headline: 'Up to 7.00% p.a. • Monthly Interest Payout',
    description: 'Progressive savings account interest with monthly interest credit on the last day of the month.',
    officialSource: 'https://www.equitasbank.com/savings-account-interest-rates',
    isFlat: false,
    slabs: [
      { min: 0, max: 100000, rate: 3.50, label: 'Up to ₹1 Lakh' },
      { min: 100000, max: 500000, rate: 5.25, label: 'Above ₹1 Lakh to ₹5 Lakh' },
      { min: 500000, max: 5000000, rate: 7.00, label: 'Above ₹5 Lakh to ₹50 Lakh' },
      { min: 5000000, max: Infinity, rate: 6.50, label: 'Above ₹50 Lakh' }
    ]
  },

  // 🏢 3. QUARTERLY INTEREST PAYOUT (MAJOR COMMERCIAL & PSU BANKS)
  {
    id: 'hdfc_bank',
    name: 'HDFC Bank',
    shortName: 'HDFC Bank',
    category: 'quarterly_payout',
    badge: 'Quarterly Payout',
    payoutFrequency: 'quarterly',
    compoundingFrequency: 'quarterly',
    baseRate: 3.00,
    logo: '🏛️',
    themeColor: '#1E3A8A',
    headline: '3.00% to 3.50% p.a. • Quarterly Interest Credit',
    description: 'Calculated on daily closing balances and credited to account quarterly at the end of March, June, September, and December.',
    officialSource: 'https://www.hdfcbank.com/personal/resources/rates',
    isFlat: false,
    slabs: [
      { min: 0, max: 5000000, rate: 3.00, label: 'Up to ₹50 Lakh' },
      { min: 5000000, max: Infinity, rate: 3.50, label: 'Above ₹50 Lakh' }
    ]
  },
  {
    id: 'icici_bank',
    name: 'ICICI Bank',
    shortName: 'ICICI Bank',
    category: 'quarterly_payout',
    badge: 'Quarterly Payout',
    payoutFrequency: 'quarterly',
    compoundingFrequency: 'quarterly',
    baseRate: 3.00,
    logo: '🏢',
    themeColor: '#B45309',
    headline: '3.00% to 3.50% p.a. • Quarterly Interest Payout',
    description: 'Daily product calculation methodology with quarterly payouts according to RBI guidelines.',
    officialSource: 'https://www.icicibank.com/personal-banking/deposits/savings-account/savings-account-interest-rates',
    isFlat: false,
    slabs: [
      { min: 0, max: 5000000, rate: 3.00, label: 'Up to ₹50 Lakh' },
      { min: 5000000, max: Infinity, rate: 3.50, label: 'Above ₹50 Lakh' }
    ]
  },
  {
    id: 'sbi',
    name: 'State Bank of India (SBI)',
    shortName: 'SBI',
    category: 'quarterly_payout',
    badge: 'Quarterly Payout',
    payoutFrequency: 'quarterly',
    compoundingFrequency: 'quarterly',
    baseRate: 2.70,
    logo: '🔵',
    themeColor: '#0369A1',
    headline: '2.70% p.a. Flat • Sovereign Public Sector Safety',
    description: "India's largest public sector bank. Flat 2.70% across all balance slabs with quarterly compounding credit.",
    officialSource: 'https://sbi.co.in/web/interest-rates/interest-rates/savings-bank-deposits-interest-rates',
    isFlat: true,
    slabs: [
      { min: 0, max: Infinity, rate: 2.70, label: 'All Balance Slabs' }
    ]
  },
  {
    id: 'kotak_bank',
    name: 'Kotak Mahindra Bank',
    shortName: 'Kotak Bank',
    category: 'quarterly_payout',
    badge: 'Quarterly Payout',
    payoutFrequency: 'quarterly',
    compoundingFrequency: 'quarterly',
    baseRate: 3.50,
    logo: '🔴',
    themeColor: '#BE123C',
    headline: '3.50% to 4.00% p.a. • Quarterly Interest Credit',
    description: 'Tiered progressive slabs up to ₹50 Lakh earns 3.50%, balance above ₹50 Lakh earns 4.00%.',
    officialSource: 'https://www.kotak.com/en/rates/interest-rates.html',
    isFlat: false,
    slabs: [
      { min: 0, max: 5000000, rate: 3.50, label: 'Up to ₹50 Lakh' },
      { min: 5000000, max: Infinity, rate: 4.00, label: 'Above ₹50 Lakh' }
    ]
  },
  {
    id: 'axis_bank',
    name: 'Axis Bank',
    shortName: 'Axis Bank',
    category: 'quarterly_payout',
    badge: 'Quarterly Payout',
    payoutFrequency: 'quarterly',
    compoundingFrequency: 'quarterly',
    baseRate: 3.00,
    logo: '🔺',
    themeColor: '#9D174D',
    headline: '3.00% to 3.50% p.a. • Quarterly Interest Credit',
    description: 'Interest calculated on daily closing balance, credited quarterly.',
    officialSource: 'https://www.axisbank.com/retail/interest-rates-tariff',
    isFlat: false,
    slabs: [
      { min: 0, max: 5000000, rate: 3.00, label: 'Up to ₹50 Lakh' },
      { min: 5000000, max: Infinity, rate: 3.50, label: 'Above ₹50 Lakh' }
    ]
  }
];

/**
 * Calculates blended/progressive annual interest rate and daily interest for a given balance in a bank.
 * Follows RBI Progressive Slab Methodology where balance is split across tiers.
 */
export function calculateBankSlabInterest(balance = 0, bankId = 'slice', customRate = null) {
  const bal = Math.max(0, Number(balance) || 0);
  const bank = SAVINGS_BANKS_CATALOG.find(b => b.id === bankId) || SAVINGS_BANKS_CATALOG[0];

  // If custom rate provided and bank is custom or user overrode it
  if (customRate !== null && !isNaN(customRate) && Number(customRate) > 0) {
    const rate = Number(customRate);
    const annualInterest = (bal * rate) / 100;
    const dailyInterest = annualInterest / 365;
    return {
      effectiveAnnualRate: rate,
      annualInterest,
      dailyInterest,
      slabBreakdown: [{ label: 'Custom Flat Rate', amountInSlab: bal, rate, interest: annualInterest }]
    };
  }

  // Flat rate bank (e.g. Slice, SBI)
  if (bank.isFlat || !bank.slabs || bank.slabs.length === 1) {
    const rate = bank.slabs && bank.slabs[0] ? bank.slabs[0].rate : bank.baseRate;
    const annualInterest = (bal * rate) / 100;
    const dailyInterest = annualInterest / 365;
    return {
      effectiveAnnualRate: rate,
      annualInterest,
      dailyInterest,
      slabBreakdown: [{ label: bank.slabs?.[0]?.label || 'Flat Rate', amountInSlab: bal, rate, interest: annualInterest }]
    };
  }

  // Progressive slab calculation
  let remaining = bal;
  let totalAnnualInterest = 0;
  const breakdown = [];

  for (const slab of bank.slabs) {
    if (remaining <= 0) break;
    const slabSpan = slab.max === Infinity ? remaining : (slab.max - slab.min);
    const amountInSlab = Math.min(remaining, slabSpan);

    if (amountInSlab > 0) {
      const slabInterest = (amountInSlab * slab.rate) / 100;
      totalAnnualInterest += slabInterest;
      breakdown.push({
        label: slab.label,
        amountInSlab,
        rate: slab.rate,
        interest: slabInterest
      });
      remaining -= amountInSlab;
    }
  }

  const effectiveRate = bal > 0 ? (totalAnnualInterest / bal) * 100 : bank.baseRate;
  const dailyInterest = totalAnnualInterest / 365;

  return {
    effectiveAnnualRate: Number(effectiveRate.toFixed(3)),
    annualInterest: totalAnnualInterest,
    dailyInterest,
    slabBreakdown: breakdown
  };
}

/**
 * Date helper to parse YYYY-MM-DD in local time without UTC offset bugs
 */
export function parseLocalDate(dateStr) {
  if (!dateStr) return new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

/**
 * Date helper to format Date object as local YYYY-MM-DD
 */
export function formatLocalDate(dateObj) {
  if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) return '';
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Computes exact daily compounded balance from depositDate to today (or targetDate).
 * Supports multiple deposits and withdrawals over time (e.g. 5 to 10 deposits a month).
 * Accurately models Slice Bank's 24h daily payout with paisa-level precision (0.45 + 0.45 = 0.90).
 */
export function simulateEmergencyFundGrowth({
  depositAmount = 3000,
  depositDate = '2026-10-31',
  deposits = [], // Array of { id, type: 'deposit'|'withdrawal', amount, date, notes }
  targetDate = null,
  bankId = 'slice',
  customRate = null,
  payoutFrequency = 'daily' // 'daily' | 'monthly' | 'quarterly' | 'annually'
}) {
  const initialPrincipal = Math.max(0, Number(depositAmount) || 0);

  if (!depositDate && (!deposits || deposits.length === 0)) {
    return {
      currentBalance: 0,
      accruedInterest: 0,
      netPrincipal: 0,
      depositsCount: 0,
      daysElapsed: 0,
      dailyInterestToday: 0,
      effectiveRate: 5.5,
      dayByDayHistory: [],
      allEvents: []
    };
  }

  // Compile all transactions chronologically
  const allEvents = [];
  if (depositDate && initialPrincipal > 0) {
    allEvents.push({
      id: 'initial_deposit',
      type: 'deposit',
      amount: initialPrincipal,
      date: depositDate,
      notes: 'Initial Deposit',
      isInitial: true
    });
  }

  if (Array.isArray(deposits)) {
    deposits.forEach(dep => {
      const amt = Number(dep.amount);
      if (amt > 0 && dep.date) {
        allEvents.push({
          id: dep.id || `event_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          type: dep.type === 'withdrawal' ? 'withdrawal' : 'deposit',
          amount: amt,
          date: dep.date,
          notes: dep.notes || (dep.type === 'withdrawal' ? 'Withdrawal' : 'Deposit'),
          isInitial: false
        });
      }
    });
  }

  // Sort events chronologically
  allEvents.sort((a, b) => a.date.localeCompare(b.date));

  // Determine starting date
  const earliestDate = allEvents.length > 0 ? allEvents[0].date : (depositDate || formatLocalDate(new Date()));
  const start = parseLocalDate(earliestDate);

  // Determine ending date
  const now = new Date();
  const end = targetDate ? parseLocalDate(targetDate) : parseLocalDate(formatLocalDate(now));

  const diffTime = end.getTime() - start.getTime();
  const totalDays = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));

  // Map events by date for fast lookup
  const eventsByDate = new Map();
  allEvents.forEach(evt => {
    if (!eventsByDate.has(evt.date)) {
      eventsByDate.set(evt.date, []);
    }
    eventsByDate.get(evt.date).push(evt);
  });

  let runningBalance = 0;
  let netPrincipal = 0;
  let totalInterestEarned = 0;
  const history = [];

  const isDailyCompounding = payoutFrequency === 'daily' || bankId === 'slice';

  // Process day by day from Day 0 (start date) to today
  for (let i = 0; i <= totalDays; i++) {
    const curDate = new Date(start);
    curDate.setDate(curDate.getDate() + i);
    const dateStr = formatLocalDate(curDate);

    const dayOpeningBalance = runningBalance;
    const dayEvents = eventsByDate.get(dateStr) || [];
    let dayNetEvents = 0;

    // Apply any deposits or withdrawals occurring on this day
    for (const evt of dayEvents) {
      if (evt.type === 'deposit') {
        runningBalance += evt.amount;
        netPrincipal += evt.amount;
        dayNetEvents += evt.amount;
      } else if (evt.type === 'withdrawal') {
        const withdrawable = Math.min(runningBalance, evt.amount);
        runningBalance -= withdrawable;
        netPrincipal = Math.max(0, netPrincipal - withdrawable);
        dayNetEvents -= withdrawable;
      }
    }

    // Daily interest calculation:
    // Interest is credited starting from the day after deposit (Day 1 onwards on closing balance)
    let dayInterest = 0;
    if (i > 0 && runningBalance > 0) {
      const { effectiveAnnualRate } = calculateBankSlabInterest(runningBalance, bankId, customRate);
      const rawInterest = (runningBalance * effectiveAnnualRate) / (100 * 365);
      // Slice Bank and Indian banks credit interest rounded to exact paisa (2 decimals)
      dayInterest = Math.round(rawInterest * 100) / 100;
    }

    totalInterestEarned += dayInterest;

    let closingBalance = runningBalance;
    if (isDailyCompounding) {
      closingBalance = runningBalance + dayInterest;
      runningBalance = closingBalance;
    } else {
      const isMonthEnd = new Date(curDate.getFullYear(), curDate.getMonth() + 1, 0).getDate() === curDate.getDate();
      const isQuarterEnd = isMonthEnd && [2, 5, 8, 11].includes(curDate.getMonth());
      if ((payoutFrequency === 'monthly' && isMonthEnd) || (payoutFrequency === 'quarterly' && isQuarterEnd)) {
        closingBalance = runningBalance + dayInterest;
        runningBalance = closingBalance;
      }
    }

    history.push({
      day: i,
      date: dateStr,
      openingBalance: Number(dayOpeningBalance.toFixed(2)),
      events: dayEvents,
      netEvents: dayNetEvents,
      dailyInterest: dayInterest,
      closingBalance: Number(closingBalance.toFixed(2)),
      cumulativeInterest: Number(totalInterestEarned.toFixed(2))
    });
  }

  // Todays daily earning rate based on current balance
  const latestEarning = calculateBankSlabInterest(runningBalance, bankId, customRate);
  const dailyYieldToday = Math.round((latestEarning.dailyInterest || 0) * 100) / 100;

  return {
    currentBalance: Number(runningBalance.toFixed(2)),
    accruedInterest: Number(totalInterestEarned.toFixed(2)),
    netPrincipal: Number(netPrincipal.toFixed(2)),
    depositsCount: allEvents.filter(e => e.type === 'deposit').length,
    daysElapsed: totalDays,
    dailyInterestToday: dailyYieldToday,
    effectiveRate: latestEarning.effectiveAnnualRate,
    dayByDayHistory: history,
    allEvents
  };
}

/**
 * Projects compounding trajectory over standard horizons: 7 Days, 30 Days, 90 Days, 180 Days, 365 Days (1 Year)
 */
export function generateEmergencyProjections(principal = 3000, bankId = 'slice', customRate = null, payoutFrequency = 'daily') {
  const p = Math.max(0, Number(principal) || 0);
  const horizons = [
    { label: '7 Days', days: 7 },
    { label: '30 Days (1 Month)', days: 30 },
    { label: '90 Days (1 Quarter)', days: 90 },
    { label: '180 Days (6 Months)', days: 180 },
    { label: '365 Days (1 Year)', days: 365 }
  ];

  return horizons.map(h => {
    let bal = p;
    let earned = 0;
    for (let d = 1; d <= h.days; d++) {
      const { effectiveAnnualRate } = calculateBankSlabInterest(bal, bankId, customRate);
      const dayInterest = (bal * effectiveAnnualRate) / (100 * 365);
      earned += dayInterest;
      if (payoutFrequency === 'daily' || bankId === 'slice') {
        bal += dayInterest;
      }
    }
    if (payoutFrequency !== 'daily' && bankId !== 'slice') {
      bal += earned; // Add accrued interest at end
    }

    return {
      label: h.label,
      days: h.days,
      finalBalance: Number(bal.toFixed(2)),
      interestEarned: Number(earned.toFixed(2)),
      dailyAverage: Number((earned / h.days).toFixed(2))
    };
  });
}
