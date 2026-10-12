/**
 * Indian Fixed Deposit (FD) Live Rates Engine & Official Scheme Directory
 * Authoritative Q3 FY 2026-27 Rate Guide covering Post Office (MoF), Public Banks,
 * Private Banks, Small Finance Banks (SFBs), and NBFCs.
 */

export const RATE_NOTIFICATIONS = [
  {
    id: 'notif_po_q3_2026',
    date: '2026-10-01',
    category: 'Govt Notification',
    title: 'India Post Q3 FY 2026-27 Rates Confirmed',
    description: 'Ministry of Finance confirmed Post Office Time Deposit rates: 1Y @ 6.90%, 2Y @ 7.00%, 3Y @ 7.10%, 5Y TD (80C) @ 7.50%, SCSS @ 8.20%.',
    severity: 'info',
    isNew: true
  },
  {
    id: 'notif_sbi_amrit_2026',
    date: '2026-09-15',
    category: 'Bank Scheme',
    title: 'SBI Amrit Kalash (400D @ 7.10%) & Amrit Vrishti (444D @ 7.25%)',
    description: 'State Bank of India extends special high-yield retail deposit schemes with senior citizen yield up to 7.75%.',
    severity: 'success',
    isNew: true
  },
  {
    id: 'notif_unity_sfb_900',
    date: '2026-09-28',
    category: 'Market Benchmark',
    title: 'Unity SFB 1001 Days Super Scheme @ 9.00%',
    description: 'Highest fixed income yield currently available: 9.00% p.a. regular, 9.50% p.a. for senior citizens with DICGC insurance up to ₹5 Lakh.',
    severity: 'warning',
    isNew: true
  },
  {
    id: 'notif_rbi_repo_steady',
    date: '2026-10-08',
    category: 'Monetary Policy',
    title: 'RBI MPC Holds Repo Rate Steady at 6.50%',
    description: 'Peak bank deposit rates likely to stabilize over Q3-Q4. Good window to lock in multi-year fixed deposits.',
    severity: 'info',
    isNew: false
  }
];

export const FD_INSTITUTIONS = [
  // 🏤 Post Office / Ministry of Finance (Govt of India)
  {
    id: 'post_office',
    name: 'India Post (Govt of India / MoF)',
    shortName: 'India Post',
    category: 'govt',
    logo: '🏤',
    isGovt: true,
    strictTenuresOnly: true,
    rules: {
      compoundingFrequency: 'annually',
      compoundingLabel: 'Quarterly Compounded, Paid Annually',
      minDeposit: 1000,
      multipleOf: 100,
      isSeniorRatesSame: true,
      seniorNote: 'India Post offers the same rate for General & Senior on regular TD. For higher senior yield, opt for SCSS (8.20%).',
      taxDeduction80C: 'Available on 5-Year TD up to ₹1.5 Lakh under Section 80C',
      prematureWithdrawal: 'Permitted after 6 months from deposit date'
    },
    officialTenures: [
      { label: '1 Year (6.90%)', years: 1, months: 0, days: 0, totalDays: 365, regularRate: 6.90, seniorRate: 6.90, schemeName: 'Post Office 1-Year Time Deposit (POTD)', badge: 'Govt Guaranteed' },
      { label: '2 Years (7.00%)', years: 2, months: 0, days: 0, totalDays: 730, regularRate: 7.00, seniorRate: 7.00, schemeName: 'Post Office 2-Year Time Deposit (POTD)', badge: 'Govt Guaranteed' },
      { label: '3 Years (7.10%)', years: 3, months: 0, days: 0, totalDays: 1095, regularRate: 7.10, seniorRate: 7.10, schemeName: 'Post Office 3-Year Time Deposit (POTD)', badge: 'Govt Guaranteed' },
      { label: '5 Years (80C Tax Saver @ 7.50%)', years: 5, months: 0, days: 0, totalDays: 1825, regularRate: 7.50, seniorRate: 7.50, schemeName: 'Post Office 5-Year Time Deposit (80C)', isSpecial: true, badge: '80C Tax Saver' },
      { label: 'Senior Citizen SCSS 5Y (8.20%)', years: 5, months: 0, days: 0, totalDays: 1825, regularRate: 8.20, seniorRate: 8.20, schemeName: 'Senior Citizen Savings Scheme (SCSS)', isSpecial: true, isSeniorOnly: true, badge: 'SCSS (8.20%)' },
      { label: 'Mahila Samman 2Y (7.50%)', years: 2, months: 0, days: 0, totalDays: 730, regularRate: 7.50, seniorRate: 7.50, schemeName: 'Mahila Samman Savings Certificate', isSpecial: true, badge: 'Women Special' },
      { label: 'NSC Certificate 5Y (7.70%)', years: 5, months: 0, days: 0, totalDays: 1825, regularRate: 7.70, seniorRate: 7.70, schemeName: 'National Savings Certificate (NSC)', isSpecial: true, badge: 'Govt 7.70%' },
      { label: 'Kisan Vikas Patra KVP (7.50%)', years: 9, months: 7, days: 0, totalDays: 3500, regularRate: 7.50, seniorRate: 7.50, schemeName: 'Kisan Vikas Patra (KVP - Doubles Amount)', isSpecial: true, badge: 'Doubles Money' }
    ],
    slabs: [
      { minDays: 365, maxDays: 365, regularRate: 6.90, seniorRate: 6.90, label: 'Post Office 1-Year TD', schemeName: '1-Year Time Deposit' },
      { minDays: 730, maxDays: 730, regularRate: 7.00, seniorRate: 7.00, label: 'Post Office 2-Year TD', schemeName: '2-Year Time Deposit' },
      { minDays: 1095, maxDays: 1095, regularRate: 7.10, seniorRate: 7.10, label: 'Post Office 3-Year TD', schemeName: '3-Year Time Deposit' },
      { minDays: 1825, maxDays: 1825, regularRate: 7.50, seniorRate: 7.50, label: 'Post Office 5-Year TD (80C)', schemeName: '5-Year Time Deposit (80C)' }
    ]
  },

  // 🏛️ Public Sector Banks
  {
    id: 'sbi',
    name: 'State Bank of India (SBI)',
    shortName: 'SBI',
    category: 'public',
    logo: '🏛️',
    isGovt: true,
    strictTenuresOnly: false,
    rules: {
      compoundingFrequency: 'quarterly',
      compoundingLabel: 'Quarterly Compounding (Indian Standard)',
      minDeposit: 1000,
      isSeniorRatesSame: false,
      taxDeduction80C: 'Available on 5-Year WeCare Term Deposit'
    },
    officialTenures: [
      { label: '400 Days Amrit Kalash (7.10%)', years: 0, months: 0, days: 400, totalDays: 400, regularRate: 7.10, seniorRate: 7.60, schemeName: 'SBI Amrit Kalash (400 Days)', isSpecial: true, badge: 'Special Scheme' },
      { label: '444 Days Amrit Vrishti (7.25%)', years: 0, months: 0, days: 444, totalDays: 444, regularRate: 7.25, seniorRate: 7.75, schemeName: 'SBI Amrit Vrishti (444 Days)', isSpecial: true, badge: 'Highest SBI Rate' },
      { label: '1 Year (6.80%)', years: 1, months: 0, days: 0, totalDays: 365, regularRate: 6.80, seniorRate: 7.30, schemeName: 'SBI 1-Year Term Deposit' },
      { label: '2 Years (7.00%)', years: 2, months: 0, days: 0, totalDays: 730, regularRate: 7.00, seniorRate: 7.50, schemeName: 'SBI 2-Year Term Deposit' },
      { label: '3 Years (6.75%)', years: 3, months: 0, days: 0, totalDays: 1095, regularRate: 6.75, seniorRate: 7.25, schemeName: 'SBI 3-Year Term Deposit' },
      { label: '5 Years WeCare (6.50% / 7.50%)', years: 5, months: 0, days: 0, totalDays: 1825, regularRate: 6.50, seniorRate: 7.50, schemeName: 'SBI WeCare Tax Saver', isSpecial: true, badge: 'WeCare (+1% Senior)' }
    ],
    slabs: [
      { minDays: 7, maxDays: 45, regularRate: 3.50, seniorRate: 4.00, label: '7 to 45 Days' },
      { minDays: 46, maxDays: 179, regularRate: 5.50, seniorRate: 6.00, label: '46 to 179 Days' },
      { minDays: 180, maxDays: 210, regularRate: 6.25, seniorRate: 6.75, label: '180 to 210 Days' },
      { minDays: 211, maxDays: 364, regularRate: 6.50, seniorRate: 7.00, label: '211 to 364 Days' },
      { minDays: 365, maxDays: 399, regularRate: 6.80, seniorRate: 7.30, label: '1 Year' },
      { minDays: 400, maxDays: 400, regularRate: 7.10, seniorRate: 7.60, label: '400 Days Amrit Kalash', isSpecial: true, schemeName: 'SBI Amrit Kalash' },
      { minDays: 401, maxDays: 443, regularRate: 6.80, seniorRate: 7.30, label: '401 to 443 Days' },
      { minDays: 444, maxDays: 444, regularRate: 7.25, seniorRate: 7.75, label: '444 Days Amrit Vrishti', isSpecial: true, schemeName: 'SBI Amrit Vrishti' },
      { minDays: 445, maxDays: 729, regularRate: 6.80, seniorRate: 7.30, label: '15M to <2Y' },
      { minDays: 730, maxDays: 1094, regularRate: 7.00, seniorRate: 7.50, label: '2 to 3 Years' },
      { minDays: 1095, maxDays: 1824, regularRate: 6.75, seniorRate: 7.25, label: '3 to 5 Years' },
      { minDays: 1825, maxDays: 3650, regularRate: 6.50, seniorRate: 7.50, label: '5 to 10 Years WeCare', isSpecial: true, schemeName: 'SBI WeCare Tax Saver' }
    ]
  },
  {
    id: 'pnb',
    name: 'Punjab National Bank (PNB)',
    shortName: 'PNB',
    category: 'public',
    logo: '🏛️',
    isGovt: true,
    strictTenuresOnly: false,
    rules: { compoundingFrequency: 'quarterly', compoundingLabel: 'Quarterly Compounding', minDeposit: 1000 },
    officialTenures: [
      { label: '400 Days PNB Uttam (7.25%)', years: 0, months: 0, days: 400, totalDays: 400, regularRate: 7.25, seniorRate: 7.75, schemeName: 'PNB Uttam Special FD', isSpecial: true, badge: 'Special Scheme' },
      { label: '1 Year (6.80%)', years: 1, months: 0, days: 0, totalDays: 365, regularRate: 6.80, seniorRate: 7.30, schemeName: 'PNB 1-Year Term Deposit' },
      { label: '2 Years (7.00%)', years: 2, months: 0, days: 0, totalDays: 730, regularRate: 7.00, seniorRate: 7.50, schemeName: 'PNB 2-Year Term Deposit' },
      { label: '3 to 5 Years Tax Saver (6.50%)', years: 5, months: 0, days: 0, totalDays: 1825, regularRate: 6.50, seniorRate: 7.00, schemeName: 'PNB Tax Saver 80C', isSpecial: true }
    ],
    slabs: [
      { minDays: 7, maxDays: 45, regularRate: 3.50, seniorRate: 4.00, label: '7 to 45 Days' },
      { minDays: 46, maxDays: 179, regularRate: 4.50, seniorRate: 5.00, label: '46 to 179 Days' },
      { minDays: 180, maxDays: 364, regularRate: 6.00, seniorRate: 6.50, label: '180 to 364 Days' },
      { minDays: 365, maxDays: 399, regularRate: 6.80, seniorRate: 7.30, label: '1 Year' },
      { minDays: 400, maxDays: 400, regularRate: 7.25, seniorRate: 7.75, label: '400 Days PNB Uttam', isSpecial: true, schemeName: 'PNB Uttam Special FD' },
      { minDays: 730, maxDays: 1094, regularRate: 7.00, seniorRate: 7.50, label: '2 to 3 Years' },
      { minDays: 1095, maxDays: 1825, regularRate: 6.50, seniorRate: 7.00, label: '3 to 5 Years Tax Saver' }
    ]
  },
  {
    id: 'bob',
    name: 'Bank of Baroda (BOB)',
    shortName: 'BOB',
    category: 'public',
    logo: '🏛️',
    isGovt: true,
    strictTenuresOnly: false,
    rules: { compoundingFrequency: 'quarterly', compoundingLabel: 'Quarterly Compounding', minDeposit: 1000 },
    officialTenures: [
      { label: '400 Days Monsoon (7.15%)', years: 0, months: 0, days: 400, totalDays: 400, regularRate: 7.15, seniorRate: 7.65, schemeName: 'BOB Monsoon Special FD', isSpecial: true, badge: 'Special Scheme' },
      { label: '1 Year (6.85%)', years: 1, months: 0, days: 0, totalDays: 365, regularRate: 6.85, seniorRate: 7.35, schemeName: 'BOB 1-Year Term Deposit' },
      { label: '2 to 3 Years (7.15%)', years: 2, months: 0, days: 0, totalDays: 730, regularRate: 7.15, seniorRate: 7.65, schemeName: 'BOB 2-3 Year Term Deposit' },
      { label: '5 Years Tax Saver (6.50%)', years: 5, months: 0, days: 0, totalDays: 1825, regularRate: 6.50, seniorRate: 7.15, schemeName: 'BOB Tax Saver FD' }
    ],
    slabs: [
      { minDays: 7, maxDays: 45, regularRate: 4.25, seniorRate: 4.75, label: '7 to 45 Days' },
      { minDays: 181, maxDays: 364, regularRate: 6.15, seniorRate: 6.65, label: '181 to 364 Days' },
      { minDays: 365, maxDays: 399, regularRate: 6.85, seniorRate: 7.35, label: '1 Year' },
      { minDays: 400, maxDays: 400, regularRate: 7.15, seniorRate: 7.65, label: '400 Days BOB Monsoon', isSpecial: true, schemeName: 'BOB Monsoon Special FD' },
      { minDays: 730, maxDays: 1094, regularRate: 7.15, seniorRate: 7.65, label: '2 to 3 Years' },
      { minDays: 1095, maxDays: 1825, regularRate: 6.50, seniorRate: 7.15, label: '3 to 5 Years' }
    ]
  },
  {
    id: 'canara',
    name: 'Canara Bank',
    shortName: 'Canara Bank',
    category: 'public',
    logo: '🏛️',
    isGovt: true,
    strictTenuresOnly: false,
    rules: { compoundingFrequency: 'quarterly', compoundingLabel: 'Quarterly Compounding', minDeposit: 1000 },
    officialTenures: [
      { label: '444 Days Special (7.25%)', years: 0, months: 0, days: 444, totalDays: 444, regularRate: 7.25, seniorRate: 7.75, schemeName: 'Canara 444 Days Special', isSpecial: true, badge: 'Highest Yield' },
      { label: '1 Year (6.85%)', years: 1, months: 0, days: 0, totalDays: 365, regularRate: 6.85, seniorRate: 7.35, schemeName: 'Canara 1-Year Term Deposit' },
      { label: '2 to 3 Years (6.85%)', years: 2, months: 0, days: 0, totalDays: 730, regularRate: 6.85, seniorRate: 7.35, schemeName: 'Canara 2-3 Year Term Deposit' },
      { label: '5 Years Tax Saver (6.70%)', years: 5, months: 0, days: 0, totalDays: 1825, regularRate: 6.70, seniorRate: 7.20, schemeName: 'Canara Tax Saver 80C' }
    ],
    slabs: [
      { minDays: 7, maxDays: 179, regularRate: 5.25, seniorRate: 5.75, label: 'Up to 179 Days' },
      { minDays: 180, maxDays: 364, regularRate: 6.25, seniorRate: 6.75, label: '180 to 364 Days' },
      { minDays: 365, maxDays: 443, regularRate: 6.85, seniorRate: 7.35, label: '1 Year' },
      { minDays: 444, maxDays: 444, regularRate: 7.25, seniorRate: 7.75, label: '444 Days Special Scheme', isSpecial: true, schemeName: 'Canara 444 Days' },
      { minDays: 730, maxDays: 1094, regularRate: 6.85, seniorRate: 7.35, label: '2 to 3 Years' },
      { minDays: 1095, maxDays: 1825, regularRate: 6.70, seniorRate: 7.20, label: '3 to 5 Years' }
    ]
  },
  {
    id: 'union_bank',
    name: 'Union Bank of India',
    shortName: 'Union Bank',
    category: 'public',
    logo: '🏛️',
    isGovt: true,
    strictTenuresOnly: false,
    rules: { compoundingFrequency: 'quarterly', compoundingLabel: 'Quarterly Compounding', minDeposit: 1000 },
    officialTenures: [
      { label: '399 Days Special (7.25%)', years: 0, months: 0, days: 399, totalDays: 399, regularRate: 7.25, seniorRate: 7.75, schemeName: 'Union Bank 399 Days Special', isSpecial: true, badge: 'Special Scheme' },
      { label: '1 Year (6.75%)', years: 1, months: 0, days: 0, totalDays: 365, regularRate: 6.75, seniorRate: 7.25, schemeName: 'Union 1-Year Term Deposit' },
      { label: '2 Years (6.50%)', years: 2, months: 0, days: 0, totalDays: 730, regularRate: 6.50, seniorRate: 7.00, schemeName: 'Union 2-Year Term Deposit' }
    ],
    slabs: [
      { minDays: 365, maxDays: 398, regularRate: 6.75, seniorRate: 7.25, label: '1 Year' },
      { minDays: 399, maxDays: 399, regularRate: 7.25, seniorRate: 7.75, label: '399 Days Special', isSpecial: true, schemeName: 'Union Bank 399 Days' }
    ]
  },
  {
    id: 'indian_bank',
    name: 'Indian Bank',
    shortName: 'Indian Bank',
    category: 'public',
    logo: '🏛️',
    isGovt: true,
    strictTenuresOnly: false,
    rules: { compoundingFrequency: 'quarterly', compoundingLabel: 'Quarterly Compounding', minDeposit: 1000 },
    officialTenures: [
      { label: '400 Days Ind Super (7.25%)', years: 0, months: 0, days: 400, totalDays: 400, regularRate: 7.25, seniorRate: 7.75, schemeName: 'Indian Bank Ind Super 400', isSpecial: true, badge: 'Special Scheme' },
      { label: '1 Year (6.10%)', years: 1, months: 0, days: 0, totalDays: 365, regularRate: 6.10, seniorRate: 6.60, schemeName: 'Indian Bank 1-Year Term Deposit' }
    ],
    slabs: [
      { minDays: 365, maxDays: 399, regularRate: 6.10, seniorRate: 6.60, label: '1 Year' },
      { minDays: 400, maxDays: 400, regularRate: 7.25, seniorRate: 7.75, label: '400 Days Ind Super', isSpecial: true, schemeName: 'Ind Super 400' }
    ]
  },

  // 🏢 Major Private Sector Banks
  {
    id: 'hdfc',
    name: 'HDFC Bank Ltd',
    shortName: 'HDFC Bank',
    category: 'private',
    logo: '🏢',
    isGovt: false,
    strictTenuresOnly: false,
    rules: { compoundingFrequency: 'quarterly', compoundingLabel: 'Quarterly Compounding', minDeposit: 5000 },
    officialTenures: [
      { label: '18 Months to < 2 Years (7.10%)', years: 1, months: 6, days: 0, totalDays: 548, regularRate: 7.10, seniorRate: 7.60, schemeName: 'HDFC Regular Term Deposit', badge: 'Popular Private' },
      { label: '1 Year (6.60%)', years: 1, months: 0, days: 0, totalDays: 365, regularRate: 6.60, seniorRate: 7.10, schemeName: 'HDFC 1-Year Term Deposit' },
      { label: '2 to 3 Years (7.00%)', years: 2, months: 0, days: 0, totalDays: 730, regularRate: 7.00, seniorRate: 7.50, schemeName: 'HDFC 2-3 Year Term Deposit' },
      { label: '5 to 10 Years Senior Care (7.75%)', years: 5, months: 0, days: 0, totalDays: 1825, regularRate: 7.00, seniorRate: 7.75, schemeName: 'HDFC Senior Citizen Care FD', isSpecial: true, badge: 'Senior Care (7.75%)' }
    ],
    slabs: [
      { minDays: 365, maxDays: 547, regularRate: 6.60, seniorRate: 7.10, label: '1 Year' },
      { minDays: 548, maxDays: 729, regularRate: 7.10, seniorRate: 7.60, label: '18M to <2Y' },
      { minDays: 730, maxDays: 1094, regularRate: 7.00, seniorRate: 7.50, label: '2 to 3 Years' },
      { minDays: 1825, maxDays: 3650, regularRate: 7.00, seniorRate: 7.75, label: '5 to 10 Years' }
    ]
  },
  {
    id: 'icici',
    name: 'ICICI Bank Ltd',
    shortName: 'ICICI Bank',
    category: 'private',
    logo: '🏢',
    isGovt: false,
    strictTenuresOnly: false,
    rules: { compoundingFrequency: 'quarterly', compoundingLabel: 'Quarterly Compounding', minDeposit: 10000 },
    officialTenures: [
      { label: '15 Months to < 2 Years (7.20%)', years: 1, months: 3, days: 0, totalDays: 456, regularRate: 7.20, seniorRate: 7.75, schemeName: 'ICICI Golden Years FD', isSpecial: true, badge: 'Top ICICI Rate' },
      { label: '1 Year (6.70%)', years: 1, months: 0, days: 0, totalDays: 365, regularRate: 6.70, seniorRate: 7.20, schemeName: 'ICICI 1-Year Term Deposit' },
      { label: '2 to 3 Years (7.00%)', years: 2, months: 0, days: 0, totalDays: 730, regularRate: 7.00, seniorRate: 7.50, schemeName: 'ICICI 2-3 Year Term Deposit' }
    ],
    slabs: [
      { minDays: 365, maxDays: 455, regularRate: 6.70, seniorRate: 7.20, label: '1 Year' },
      { minDays: 456, maxDays: 729, regularRate: 7.20, seniorRate: 7.75, label: '15M to <2Y', isSpecial: true },
      { minDays: 730, maxDays: 1094, regularRate: 7.00, seniorRate: 7.50, label: '2 to 3 Years' }
    ]
  },
  {
    id: 'axis',
    name: 'Axis Bank Ltd',
    shortName: 'Axis Bank',
    category: 'private',
    logo: '🏢',
    isGovt: false,
    strictTenuresOnly: false,
    rules: { compoundingFrequency: 'quarterly', compoundingLabel: 'Quarterly Compounding', minDeposit: 5000 },
    officialTenures: [
      { label: '17 Months to < 2 Years (7.10%)', years: 1, months: 5, days: 0, totalDays: 511, regularRate: 7.10, seniorRate: 7.60, schemeName: 'Axis Fixed Deposit', badge: 'Top Axis Rate' },
      { label: '1 Year (6.70%)', years: 1, months: 0, days: 0, totalDays: 365, regularRate: 6.70, seniorRate: 7.20, schemeName: 'Axis 1-Year Fixed Deposit' },
      { label: '2 to 5 Years (7.10%)', years: 2, months: 0, days: 0, totalDays: 730, regularRate: 7.10, seniorRate: 7.60, schemeName: 'Axis Multi-Year FD' }
    ],
    slabs: [
      { minDays: 365, maxDays: 510, regularRate: 6.70, seniorRate: 7.20, label: '1 Year' },
      { minDays: 511, maxDays: 729, regularRate: 7.10, seniorRate: 7.60, label: '17M to <2Y' },
      { minDays: 730, maxDays: 1825, regularRate: 7.10, seniorRate: 7.60, label: '2 to 5 Years' }
    ]
  },
  {
    id: 'kotak',
    name: 'Kotak Mahindra Bank',
    shortName: 'Kotak Bank',
    category: 'private',
    logo: '🏢',
    isGovt: false,
    strictTenuresOnly: false,
    rules: { compoundingFrequency: 'quarterly', compoundingLabel: 'Quarterly Compounding', minDeposit: 5000 },
    officialTenures: [
      { label: '390 Days to < 2 Years (7.15%)', years: 1, months: 1, days: 0, totalDays: 390, regularRate: 7.15, seniorRate: 7.65, schemeName: 'Kotak ActivMoney FD', badge: 'Top Kotak Rate' },
      { label: '365 to 389 Days (7.10%)', years: 1, months: 0, days: 0, totalDays: 365, regularRate: 7.10, seniorRate: 7.60, schemeName: 'Kotak 1-Year FD' },
      { label: '2 to 5 Years (7.00%)', years: 2, months: 0, days: 0, totalDays: 730, regularRate: 7.00, seniorRate: 7.50, schemeName: 'Kotak Term Deposit' }
    ],
    slabs: [
      { minDays: 365, maxDays: 389, regularRate: 7.10, seniorRate: 7.60, label: '365 to 389 Days' },
      { minDays: 390, maxDays: 729, regularRate: 7.15, seniorRate: 7.65, label: '390 Days to <2Y' },
      { minDays: 730, maxDays: 1825, regularRate: 7.00, seniorRate: 7.50, label: '2 to 5 Years' }
    ]
  },
  {
    id: 'indusind',
    name: 'IndusInd Bank',
    shortName: 'IndusInd Bank',
    category: 'private',
    logo: '🏢',
    isGovt: false,
    strictTenuresOnly: false,
    rules: { compoundingFrequency: 'quarterly', compoundingLabel: 'Quarterly Compounding', minDeposit: 10000 },
    officialTenures: [
      { label: '1 Year to 2 Years (7.75%)', years: 1, months: 0, days: 0, totalDays: 365, regularRate: 7.75, seniorRate: 8.25, schemeName: 'IndusInd High Yield FD', isSpecial: true, badge: 'High Private Yield (7.75%)' },
      { label: '2 to 3 Years (7.25%)', years: 2, months: 0, days: 0, totalDays: 730, regularRate: 7.25, seniorRate: 7.75, schemeName: 'IndusInd Term Deposit' }
    ],
    slabs: [
      { minDays: 365, maxDays: 729, regularRate: 7.75, seniorRate: 8.25, label: '1 to 2 Years' },
      { minDays: 730, maxDays: 1095, regularRate: 7.25, seniorRate: 7.75, label: '2 to 3 Years' }
    ]
  },
  {
    id: 'federal',
    name: 'Federal Bank',
    shortName: 'Federal Bank',
    category: 'private',
    logo: '🏢',
    isGovt: false,
    strictTenuresOnly: false,
    rules: { compoundingFrequency: 'quarterly', compoundingLabel: 'Quarterly Compounding', minDeposit: 5000 },
    officialTenures: [
      { label: '400 Days Special (7.40%)', years: 0, months: 0, days: 400, totalDays: 400, regularRate: 7.40, seniorRate: 7.90, schemeName: 'Federal 400 Days Special', isSpecial: true, badge: 'Special Scheme' },
      { label: '1 Year (6.80%)', years: 1, months: 0, days: 0, totalDays: 365, regularRate: 6.80, seniorRate: 7.30, schemeName: 'Federal 1-Year FD' }
    ],
    slabs: [
      { minDays: 365, maxDays: 399, regularRate: 6.80, seniorRate: 7.30, label: '1 Year' },
      { minDays: 400, maxDays: 400, regularRate: 7.40, seniorRate: 7.90, label: '400 Days Special', isSpecial: true }
    ]
  },
  {
    id: 'idfc_first',
    name: 'IDFC FIRST Bank',
    shortName: 'IDFC First',
    category: 'private',
    logo: '🏢',
    isGovt: false,
    strictTenuresOnly: false,
    rules: { compoundingFrequency: 'quarterly', compoundingLabel: 'Quarterly Compounding', minDeposit: 10000 },
    officialTenures: [
      { label: '400 Days Special (7.50%)', years: 0, months: 0, days: 400, totalDays: 400, regularRate: 7.50, seniorRate: 8.00, schemeName: 'IDFC FIRST 400 Days', isSpecial: true, badge: 'High Private Yield' },
      { label: '1 Year (6.50%)', years: 1, months: 0, days: 0, totalDays: 365, regularRate: 6.50, seniorRate: 7.00, schemeName: 'IDFC FIRST 1-Year FD' }
    ],
    slabs: [
      { minDays: 365, maxDays: 399, regularRate: 6.50, seniorRate: 7.00, label: '1 Year' },
      { minDays: 400, maxDays: 400, regularRate: 7.50, seniorRate: 8.00, label: '400 Days Special', isSpecial: true }
    ]
  },

  // 💎 Small Finance Banks (Highest Fixed Income Yields, DICGC Insured up to ₹5 Lakh)
  {
    id: 'unity_sfb',
    name: 'Unity Small Finance Bank',
    shortName: 'Unity SFB',
    category: 'sfb',
    logo: '💎',
    isGovt: false,
    strictTenuresOnly: false,
    rules: { compoundingFrequency: 'quarterly', compoundingLabel: 'Quarterly Compounding', minDeposit: 10000, insurance: 'DICGC Insured up to ₹5 Lakh' },
    officialTenures: [
      { label: '1001 Days Super Scheme (9.00%)', years: 0, months: 0, days: 1001, totalDays: 1001, regularRate: 9.00, seniorRate: 9.50, schemeName: 'Unity 1001 Days Super Scheme', isSpecial: true, badge: '🔥 Market Peak (9.00%)' },
      { label: '701 Days Special (8.95%)', years: 0, months: 0, days: 701, totalDays: 701, regularRate: 8.95, seniorRate: 9.45, schemeName: 'Unity 701 Days Special', isSpecial: true, badge: '8.95% High Yield' },
      { label: '1 Year (7.85%)', years: 1, months: 0, days: 0, totalDays: 365, regularRate: 7.85, seniorRate: 8.35, schemeName: 'Unity 1-Year Term Deposit' }
    ],
    slabs: [
      { minDays: 365, maxDays: 700, regularRate: 7.85, seniorRate: 8.35, label: '1 Year' },
      { minDays: 701, maxDays: 701, regularRate: 8.95, seniorRate: 9.45, label: '701 Days Special', isSpecial: true },
      { minDays: 1001, maxDays: 1001, regularRate: 9.00, seniorRate: 9.50, label: '1001 Days Special', isSpecial: true }
    ]
  },
  {
    id: 'suryoday_sfb',
    name: 'Suryoday Small Finance Bank',
    shortName: 'Suryoday SFB',
    category: 'sfb',
    logo: '💎',
    isGovt: false,
    strictTenuresOnly: false,
    rules: { compoundingFrequency: 'quarterly', compoundingLabel: 'Quarterly Compounding', minDeposit: 1000 },
    officialTenures: [
      { label: '2 Years Special (8.60%)', years: 2, months: 0, days: 0, totalDays: 730, regularRate: 8.60, seniorRate: 9.10, schemeName: 'Suryoday 2Y High Yield', isSpecial: true, badge: '8.60% / 9.10%' },
      { label: '3 Years Term Deposit (8.25%)', years: 3, months: 0, days: 0, totalDays: 1095, regularRate: 8.25, seniorRate: 8.75, schemeName: 'Suryoday 3Y Term Deposit' },
      { label: '1 Year (6.85%)', years: 1, months: 0, days: 0, totalDays: 365, regularRate: 6.85, seniorRate: 7.35, schemeName: 'Suryoday 1-Year FD' }
    ],
    slabs: [
      { minDays: 365, maxDays: 729, regularRate: 6.85, seniorRate: 7.35, label: '1 Year' },
      { minDays: 730, maxDays: 730, regularRate: 8.60, seniorRate: 9.10, label: '2 Years Special', isSpecial: true },
      { minDays: 1095, maxDays: 1825, regularRate: 8.25, seniorRate: 8.75, label: '3 to 5 Years' }
    ]
  },
  {
    id: 'equitas_sfb',
    name: 'Equitas Small Finance Bank',
    shortName: 'Equitas SFB',
    category: 'sfb',
    logo: '💎',
    isGovt: false,
    strictTenuresOnly: false,
    rules: { compoundingFrequency: 'quarterly', compoundingLabel: 'Quarterly Compounding', minDeposit: 5000 },
    officialTenures: [
      { label: '444 Days Special (8.50%)', years: 0, months: 0, days: 444, totalDays: 444, regularRate: 8.50, seniorRate: 9.00, schemeName: 'Equitas 444 Days Super FD', isSpecial: true, badge: '8.50% / 9.00%' },
      { label: '1 Year (8.20%)', years: 1, months: 0, days: 0, totalDays: 365, regularRate: 8.20, seniorRate: 8.70, schemeName: 'Equitas 1-Year FD' }
    ],
    slabs: [
      { minDays: 365, maxDays: 443, regularRate: 8.20, seniorRate: 8.70, label: '1 Year' },
      { minDays: 444, maxDays: 444, regularRate: 8.50, seniorRate: 9.00, label: '444 Days Special', isSpecial: true }
    ]
  },

  // 🛡️ Corporate NBFCs
  {
    id: 'bajaj_finance',
    name: 'Bajaj Finance Ltd',
    shortName: 'Bajaj Finance',
    category: 'nbfc',
    logo: '🛡️',
    isGovt: false,
    strictTenuresOnly: false,
    rules: { compoundingFrequency: 'quarterly', compoundingLabel: 'Quarterly Compounding', minDeposit: 15000 },
    officialTenures: [
      { label: '24 to 36 Months (8.10%)', years: 2, months: 6, days: 0, totalDays: 912, regularRate: 8.10, seniorRate: 8.35, schemeName: 'Bajaj Finance Corporate FD', isSpecial: true, badge: 'AAA Rated (8.10%)' },
      { label: '18 to 24 Months (7.80%)', years: 1, months: 6, days: 0, totalDays: 548, regularRate: 7.80, seniorRate: 8.15, schemeName: 'Bajaj Finance 18-24M' },
      { label: '12 to 18 Months (7.40%)', years: 1, months: 0, days: 0, totalDays: 365, regularRate: 7.40, seniorRate: 7.75, schemeName: 'Bajaj Finance 1Y FD' }
    ],
    slabs: [
      { minDays: 365, maxDays: 540, regularRate: 7.40, seniorRate: 7.75, label: '12 to 18 Months' },
      { minDays: 541, maxDays: 729, regularRate: 7.80, seniorRate: 8.15, label: '18 to 24 Months' },
      { minDays: 730, maxDays: 1825, regularRate: 8.10, seniorRate: 8.35, label: '24 to 60 Months' }
    ]
  },
  {
    id: 'shriram_finance',
    name: 'Shriram Finance Ltd',
    shortName: 'Shriram Finance',
    category: 'nbfc',
    logo: '🛡️',
    isGovt: false,
    strictTenuresOnly: false,
    rules: { compoundingFrequency: 'quarterly', compoundingLabel: 'Quarterly Compounding', minDeposit: 5000 },
    officialTenures: [
      { label: '3 to 5 Years (8.40%)', years: 3, months: 0, days: 0, totalDays: 1095, regularRate: 8.40, seniorRate: 8.90, schemeName: 'Shriram Finance Fixed Deposit', isSpecial: true, badge: 'High NBFC Yield' },
      { label: '1 Year (7.85%)', years: 1, months: 0, days: 0, totalDays: 365, regularRate: 7.85, seniorRate: 8.35, schemeName: 'Shriram Finance 1Y FD' }
    ],
    slabs: [
      { minDays: 365, maxDays: 729, regularRate: 7.85, seniorRate: 8.35, label: '1 Year' },
      { minDays: 730, maxDays: 1825, regularRate: 8.40, seniorRate: 8.90, label: '2 to 5 Years' }
    ]
  },
  {
    id: 'other',
    name: 'Custom / Other Institution',
    shortName: 'Other',
    category: 'custom',
    logo: '🏦',
    isGovt: false,
    strictTenuresOnly: false,
    rules: { compoundingFrequency: 'quarterly', compoundingLabel: 'Quarterly Compounding', minDeposit: 1000 },
    officialTenures: [
      { label: '1 Year Benchmark (7.00%)', years: 1, months: 0, days: 0, totalDays: 365, regularRate: 7.00, seniorRate: 7.50, schemeName: '1-Year Term Deposit' },
      { label: '2 Years Benchmark (7.15%)', years: 2, months: 0, days: 0, totalDays: 730, regularRate: 7.15, seniorRate: 7.65, schemeName: '2-Year Term Deposit' },
      { label: '3 Years Benchmark (7.00%)', years: 3, months: 0, days: 0, totalDays: 1095, regularRate: 7.00, seniorRate: 7.50, schemeName: '3-Year Term Deposit' },
      { label: '5 Years Benchmark (6.80%)', years: 5, months: 0, days: 0, totalDays: 1825, regularRate: 6.80, seniorRate: 7.30, schemeName: '5-Year Term Deposit' }
    ],
    slabs: []
  }
];

export function getBankTenures(institutionId) {
  const inst = FD_INSTITUTIONS.find(i => i.id === institutionId) || FD_INSTITUTIONS[0];
  return inst.officialTenures || [];
}

export function getBankRules(institutionId) {
  const inst = FD_INSTITUTIONS.find(i => i.id === institutionId) || FD_INSTITUTIONS[0];
  return inst.rules || { compoundingFrequency: 'quarterly', minDeposit: 1000 };
}

export function matchFdRate(institutionId, totalDays, isSenior = false) {
  const inst = FD_INSTITUTIONS.find(i => i.id === institutionId) || FD_INSTITUTIONS[0];
  const days = Math.max(1, Number(totalDays) || 365);

  // If bank has officialTenures, look for exact totalDays match first
  if (inst.officialTenures && inst.officialTenures.length > 0) {
    const exactTenure = inst.officialTenures.find(t => t.totalDays === days);
    if (exactTenure) {
      return {
        institutionId: inst.id,
        institutionName: inst.name,
        rate: isSenior ? exactTenure.seniorRate : exactTenure.regularRate,
        matchedSlab: exactTenure.label,
        schemeName: exactTenure.schemeName || exactTenure.label,
        isSpecial: !!exactTenure.isSpecial,
        isSenior
      };
    }
  }

  if (!inst.slabs || inst.slabs.length === 0) {
    return {
      institutionId: inst.id,
      institutionName: inst.name,
      rate: isSenior ? 7.50 : 7.00,
      matchedSlab: 'Default 1 Year Benchmark',
      schemeName: 'Regular Fixed Deposit',
      isSpecial: false,
      isSenior
    };
  }

  const exactMatch = inst.slabs.find(s => s.minDays === days && s.maxDays === days);
  if (exactMatch) {
    return {
      institutionId: inst.id,
      institutionName: inst.name,
      rate: isSenior ? exactMatch.seniorRate : exactMatch.regularRate,
      matchedSlab: exactMatch.label,
      schemeName: exactMatch.schemeName || exactMatch.label,
      isSpecial: !!exactMatch.isSpecial,
      isSenior
    };
  }

  const rangeMatch = inst.slabs.find(s => days >= s.minDays && days <= s.maxDays);
  if (rangeMatch) {
    return {
      institutionId: inst.id,
      institutionName: inst.name,
      rate: isSenior ? rangeMatch.seniorRate : rangeMatch.regularRate,
      matchedSlab: rangeMatch.label,
      schemeName: rangeMatch.schemeName || rangeMatch.label,
      isSpecial: !!rangeMatch.isSpecial,
      isSenior
    };
  }

  const closest = inst.slabs.reduce((prev, curr) => {
    return Math.abs(curr.minDays - days) < Math.abs(prev.minDays - days) ? curr : prev;
  });

  return {
    institutionId: inst.id,
    institutionName: inst.name,
    rate: isSenior ? closest.seniorRate : closest.regularRate,
    matchedSlab: closest.label,
    schemeName: closest.schemeName || closest.label,
    isSpecial: !!closest.isSpecial,
    isSenior
  };
}

export function calculateFdReturns(principal, annualRate, tenureDays, frequency = 'quarterly') {
  const p = Math.max(0, Number(principal) || 0);
  const r = Math.max(0, Number(annualRate) || 0) / 100;
  const days = Math.max(1, Number(tenureDays) || 1);
  const timeInYears = days / 365;

  if (p === 0 || r === 0) {
    return { maturityAmount: p, totalInterest: 0, timeInYears };
  }

  let maturityAmount = p;

  if (frequency === 'simple') {
    maturityAmount = p * (1 + (r * timeInYears));
  } else {
    const n = frequency === 'monthly' ? 12
      : frequency === 'half_yearly' ? 2
      : frequency === 'annually' ? 1
      : 4;

    maturityAmount = p * Math.pow(1 + (r / n), n * timeInYears);
  }

  const roundedMaturity = Math.round(maturityAmount * 100) / 100;
  const totalInterest = Math.round((roundedMaturity - p) * 100) / 100;

  return {
    principal: p,
    annualRate: annualRate,
    tenureDays: days,
    timeInYears: Number(timeInYears.toFixed(3)),
    frequency,
    maturityAmount: roundedMaturity,
    totalInterest
  };
}

export function calculateFdAccrued({
  principal,
  annualRate,
  startDate,
  maturityDate,
  tenureDays,
  frequency = 'quarterly'
}) {
  const p = Math.max(0, Number(principal) || 0);
  const r = Math.max(0, Number(annualRate) || 0) / 100;
  const start = startDate ? new Date(startDate) : new Date();
  const now = new Date();

  // Total tenure in days
  let totalDays = tenureDays ? Number(tenureDays) : 365;
  let mature = maturityDate ? new Date(maturityDate) : null;
  if (!mature && totalDays) {
    mature = new Date(start.getTime() + totalDays * 86400000);
  } else if (mature && !totalDays) {
    totalDays = Math.max(1, Math.round((mature - start) / 86400000));
  }

  // Days elapsed
  const elapsedMs = Math.max(0, now.getTime() - start.getTime());
  const elapsedDays = Math.min(totalDays, Math.floor(elapsedMs / 86400000));
  const daysToMaturity = mature
    ? Math.ceil((mature.getTime() - now.getTime()) / 86400000)
    : Math.max(0, totalDays - elapsedDays);

  const n = frequency === 'monthly' ? 12
    : frequency === 'half_yearly' ? 2
    : frequency === 'annually' ? 1
    : frequency === 'simple' ? 0
    : 4;

  const totalYears = totalDays / 365;
  const elapsedYears = elapsedDays / 365;

  let maturityAmount = p;
  let accruedValuation = p;

  if (n === 0) {
    maturityAmount = p * (1 + (r * totalYears));
    accruedValuation = p * (1 + (r * elapsedYears));
  } else {
    maturityAmount = p * Math.pow(1 + (r / n), n * totalYears);
    accruedValuation = p * Math.pow(1 + (r / n), n * elapsedYears);
  }

  maturityAmount = Math.round(maturityAmount * 100) / 100;
  accruedValuation = Math.round(accruedValuation * 100) / 100;
  const accruedInterest = Math.round((accruedValuation - p) * 100) / 100;
  const totalInterest = Math.round((maturityAmount - p) * 100) / 100;

  let maturityStatus = 'active';
  if (daysToMaturity <= 0) {
    maturityStatus = 'matured';
  } else if (daysToMaturity <= 30) {
    maturityStatus = 'maturing_soon';
  }

  return {
    principal: p,
    annualRate: Number(annualRate) || 0,
    startDate: start.toISOString().split('T')[0],
    maturityDate: mature ? mature.toISOString().split('T')[0] : null,
    tenureDays: totalDays,
    elapsedDays,
    daysToMaturity,
    maturityStatus,
    accruedValuation,
    accruedInterest,
    maturityAmount,
    totalInterest,
    frequency
  };
}
