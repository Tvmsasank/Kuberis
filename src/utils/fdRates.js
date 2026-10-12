/**
 * Indian Fixed Deposit (FD) Live Rates Engine & Official Scheme Directory
 * Covers Public Sector, Private Sector, Post Office (Ministry of Finance),
 * Small Finance Banks (SFBs), and NBFCs across standard tenure slabs.
 */

export const FD_INSTITUTIONS = [
  // Public Sector Banks
  {
    id: 'sbi',
    name: 'State Bank of India (SBI)',
    shortName: 'SBI',
    category: 'public',
    logo: '🏛️',
    isGovt: true,
    slabs: [
      { minDays: 7, maxDays: 45, regularRate: 3.50, seniorRate: 4.00, label: '7 to 45 Days' },
      { minDays: 46, maxDays: 179, regularRate: 5.50, seniorRate: 6.00, label: '46 to 179 Days' },
      { minDays: 180, maxDays: 210, regularRate: 6.25, seniorRate: 6.75, label: '180 to 210 Days' },
      { minDays: 211, maxDays: 364, regularRate: 6.50, seniorRate: 7.00, label: '211 to 364 Days' },
      { minDays: 365, maxDays: 399, regularRate: 6.80, seniorRate: 7.30, label: '1 Year to < 400 Days' },
      { minDays: 400, maxDays: 400, regularRate: 7.10, seniorRate: 7.60, label: '400 Days (Amrit Kalash Special Scheme)', isSpecial: true, schemeName: 'SBI Amrit Kalash' },
      { minDays: 401, maxDays: 443, regularRate: 6.80, seniorRate: 7.30, label: '401 to 443 Days' },
      { minDays: 444, maxDays: 444, regularRate: 7.25, seniorRate: 7.75, label: '444 Days (Amrit Vrishti Scheme)', isSpecial: true, schemeName: 'SBI Amrit Vrishti' },
      { minDays: 445, maxDays: 729, regularRate: 6.80, seniorRate: 7.30, label: '15 Months to < 2 Years' },
      { minDays: 730, maxDays: 1094, regularRate: 7.00, seniorRate: 7.50, label: '2 Years to < 3 Years' },
      { minDays: 1095, maxDays: 1824, regularRate: 6.75, seniorRate: 7.25, label: '3 Years to < 5 Years' },
      { minDays: 1825, maxDays: 3650, regularRate: 6.50, seniorRate: 7.50, label: '5 to 10 Years (SBI WeCare)', isSpecial: true, schemeName: 'SBI WeCare Tax Saver' }
    ]
  },
  {
    id: 'pnb',
    name: 'Punjab National Bank (PNB)',
    shortName: 'PNB',
    category: 'public',
    logo: '🏛️',
    isGovt: true,
    slabs: [
      { minDays: 7, maxDays: 45, regularRate: 3.50, seniorRate: 4.00, label: '7 to 45 Days' },
      { minDays: 46, maxDays: 179, regularRate: 4.50, seniorRate: 5.00, label: '46 to 179 Days' },
      { minDays: 180, maxDays: 270, regularRate: 6.00, seniorRate: 6.50, label: '180 to 270 Days' },
      { minDays: 271, maxDays: 364, regularRate: 6.25, seniorRate: 6.75, label: '271 to 364 Days' },
      { minDays: 365, maxDays: 399, regularRate: 6.80, seniorRate: 7.30, label: '1 Year' },
      { minDays: 400, maxDays: 400, regularRate: 7.25, seniorRate: 7.75, label: '400 Days PNB Uttam', isSpecial: true, schemeName: 'PNB Uttam Special FD' },
      { minDays: 401, maxDays: 729, regularRate: 6.85, seniorRate: 7.35, label: '401 Days to < 2 Years' },
      { minDays: 730, maxDays: 1094, regularRate: 7.00, seniorRate: 7.50, label: '2 Years to < 3 Years' },
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
    slabs: [
      { minDays: 7, maxDays: 45, regularRate: 4.25, seniorRate: 4.75, label: '7 to 45 Days' },
      { minDays: 46, maxDays: 180, regularRate: 5.50, seniorRate: 6.00, label: '46 to 180 Days' },
      { minDays: 181, maxDays: 364, regularRate: 6.15, seniorRate: 6.65, label: '181 to 364 Days' },
      { minDays: 365, maxDays: 399, regularRate: 6.85, seniorRate: 7.35, label: '1 Year' },
      { minDays: 400, maxDays: 400, regularRate: 7.15, seniorRate: 7.65, label: '400 Days (BOB Monsoon Special)', isSpecial: true, schemeName: 'BOB Monsoon Special FD' },
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
    slabs: [
      { minDays: 7, maxDays: 45, regularRate: 4.00, seniorRate: 4.50, label: '7 to 45 Days' },
      { minDays: 46, maxDays: 179, regularRate: 5.25, seniorRate: 5.75, label: '46 to 179 Days' },
      { minDays: 180, maxDays: 364, regularRate: 6.25, seniorRate: 6.75, label: '180 to 364 Days' },
      { minDays: 365, maxDays: 443, regularRate: 6.85, seniorRate: 7.35, label: '1 Year' },
      { minDays: 444, maxDays: 444, regularRate: 7.25, seniorRate: 7.75, label: '444 Days Special Scheme', isSpecial: true, schemeName: 'Canara 444 Days' },
      { minDays: 730, maxDays: 1094, regularRate: 6.85, seniorRate: 7.35, label: '2 to 3 Years' },
      { minDays: 1095, maxDays: 1825, regularRate: 6.70, seniorRate: 7.20, label: '3 to 5 Years' }
    ]
  },

  // Post Office / Govt of India Schemes (Ministry of Finance)
  {
    id: 'post_office',
    name: 'India Post (Govt of India / MoF)',
    shortName: 'India Post',
    category: 'govt',
    logo: '🏤',
    isGovt: true,
    slabs: [
      { minDays: 365, maxDays: 365, regularRate: 6.90, seniorRate: 6.90, label: 'Post Office 1-Year Time Deposit (POTD)', schemeName: '1-Year Time Deposit (TD)' },
      { minDays: 730, maxDays: 730, regularRate: 7.00, seniorRate: 7.00, label: 'Post Office 2-Year Time Deposit (POTD)', schemeName: '2-Year Time Deposit (TD)' },
      { minDays: 1095, maxDays: 1095, regularRate: 7.10, seniorRate: 7.10, label: 'Post Office 3-Year Time Deposit (POTD)', schemeName: '3-Year Time Deposit (TD)' },
      { minDays: 1825, maxDays: 1825, regularRate: 7.50, seniorRate: 7.50, label: 'Post Office 5-Year Time Deposit (POTD)', schemeName: '5-Year Time Deposit (80C Tax Saver)' },
      { minDays: 1826, maxDays: 1826, regularRate: 8.20, seniorRate: 8.20, label: 'Senior Citizen Savings Scheme (SCSS - 8.20%)', isSpecial: true, schemeName: 'Senior Citizen Savings Scheme (SCSS)' },
      { minDays: 731, maxDays: 731, regularRate: 7.50, seniorRate: 7.50, label: 'Mahila Samman Savings Certificate (2Y @ 7.50%)', isSpecial: true, schemeName: 'Mahila Samman Savings Certificate' },
      { minDays: 1827, maxDays: 1827, regularRate: 7.70, seniorRate: 7.70, label: 'National Savings Certificate (NSC 5Y @ 7.70%)', isSpecial: true, schemeName: 'National Savings Certificate (NSC)' }
    ]
  },

  // Major Private Sector Banks
  {
    id: 'hdfc',
    name: 'HDFC Bank Ltd',
    shortName: 'HDFC Bank',
    category: 'private',
    logo: '🏢',
    isGovt: false,
    slabs: [
      { minDays: 7, maxDays: 29, regularRate: 3.00, seniorRate: 3.50, label: '7 to 29 Days' },
      { minDays: 30, maxDays: 89, regularRate: 4.50, seniorRate: 5.00, label: '30 to 89 Days' },
      { minDays: 90, maxDays: 179, regularRate: 5.25, seniorRate: 5.75, label: '90 to 179 Days' },
      { minDays: 180, maxDays: 364, regularRate: 6.60, seniorRate: 7.10, label: '180 to 364 Days' },
      { minDays: 365, maxDays: 547, regularRate: 6.60, seniorRate: 7.10, label: '1 Year to < 18 Months' },
      { minDays: 548, maxDays: 729, regularRate: 7.10, seniorRate: 7.60, label: '18 Months to < 2 Years' },
      { minDays: 730, maxDays: 1094, regularRate: 7.00, seniorRate: 7.50, label: '2 Years to < 3 Years' },
      { minDays: 1095, maxDays: 1824, regularRate: 7.00, seniorRate: 7.50, label: '3 Years to < 5 Years' },
      { minDays: 1825, maxDays: 3650, regularRate: 7.00, seniorRate: 7.75, label: '5 to 10 Years (Tax Saver)', schemeName: 'HDFC Senior Citizen Care' }
    ]
  },
  {
    id: 'icici',
    name: 'ICICI Bank Ltd',
    shortName: 'ICICI Bank',
    category: 'private',
    logo: '🏢',
    isGovt: false,
    slabs: [
      { minDays: 7, maxDays: 29, regularRate: 3.00, seniorRate: 3.50, label: '7 to 29 Days' },
      { minDays: 30, maxDays: 89, regularRate: 4.75, seniorRate: 5.25, label: '30 to 89 Days' },
      { minDays: 90, maxDays: 184, regularRate: 5.75, seniorRate: 6.25, label: '90 to 184 Days' },
      { minDays: 185, maxDays: 364, regularRate: 6.70, seniorRate: 7.20, label: '185 to 364 Days' },
      { minDays: 365, maxDays: 455, regularRate: 6.70, seniorRate: 7.20, label: '1 Year to 15 Months' },
      { minDays: 456, maxDays: 729, regularRate: 7.20, seniorRate: 7.75, label: '15 Months to < 2 Years' },
      { minDays: 730, maxDays: 1094, regularRate: 7.00, seniorRate: 7.50, label: '2 to 3 Years' },
      { minDays: 1095, maxDays: 1825, regularRate: 7.00, seniorRate: 7.50, label: '3 to 5 Years Tax Saver' }
    ]
  },
  {
    id: 'axis',
    name: 'Axis Bank Ltd',
    shortName: 'Axis Bank',
    category: 'private',
    logo: '🏢',
    isGovt: false,
    slabs: [
      { minDays: 7, maxDays: 45, regularRate: 3.50, seniorRate: 4.00, label: '7 to 45 Days' },
      { minDays: 46, maxDays: 179, regularRate: 5.00, seniorRate: 5.50, label: '46 to 179 Days' },
      { minDays: 180, maxDays: 364, regularRate: 6.00, seniorRate: 6.50, label: '180 to 364 Days' },
      { minDays: 365, maxDays: 510, regularRate: 6.70, seniorRate: 7.20, label: '1 Year' },
      { minDays: 511, maxDays: 729, regularRate: 7.10, seniorRate: 7.60, label: '17 Months to < 2 Years' },
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
    slabs: [
      { minDays: 7, maxDays: 30, regularRate: 2.75, seniorRate: 3.25, label: '7 to 30 Days' },
      { minDays: 31, maxDays: 90, regularRate: 3.25, seniorRate: 3.75, label: '31 to 90 Days' },
      { minDays: 91, maxDays: 179, regularRate: 5.60, seniorRate: 6.10, label: '91 to 179 Days' },
      { minDays: 180, maxDays: 364, regularRate: 6.50, seniorRate: 7.00, label: '180 to 364 Days' },
      { minDays: 365, maxDays: 389, regularRate: 7.10, seniorRate: 7.60, label: '365 to 389 Days' },
      { minDays: 390, maxDays: 729, regularRate: 7.15, seniorRate: 7.65, label: '390 Days to < 2 Years' },
      { minDays: 730, maxDays: 1825, regularRate: 7.00, seniorRate: 7.50, label: '2 to 5 Years' }
    ]
  },

  // Small Finance Banks (Highest Fixed Income Yields)
  {
    id: 'unity_sfb',
    name: 'Unity Small Finance Bank',
    shortName: 'Unity SFB',
    category: 'sfb',
    logo: '💎',
    isGovt: false,
    slabs: [
      { minDays: 180, maxDays: 364, regularRate: 7.50, seniorRate: 8.00, label: '6 Months to < 1 Year' },
      { minDays: 365, maxDays: 729, regularRate: 7.85, seniorRate: 8.35, label: '1 Year' },
      { minDays: 1001, maxDays: 1001, regularRate: 9.00, seniorRate: 9.50, label: '1001 Days Special (9.00% / 9.50%)', isSpecial: true, schemeName: 'Unity 1001 Days Super Scheme' },
      { minDays: 730, maxDays: 1094, regularRate: 8.15, seniorRate: 8.65, label: '2 to 3 Years' }
    ]
  },
  {
    id: 'suryoday_sfb',
    name: 'Suryoday Small Finance Bank',
    shortName: 'Suryoday SFB',
    category: 'sfb',
    logo: '💎',
    isGovt: false,
    slabs: [
      { minDays: 365, maxDays: 365, regularRate: 6.85, seniorRate: 7.35, label: '1 Year' },
      { minDays: 730, maxDays: 730, regularRate: 8.60, seniorRate: 9.10, label: '2 Years Special (8.60% / 9.10%)', isSpecial: true, schemeName: 'Suryoday 2Y High Yield' },
      { minDays: 1095, maxDays: 1825, regularRate: 8.25, seniorRate: 8.75, label: '3 to 5 Years' }
    ]
  },

  // Corporate NBFCs
  {
    id: 'bajaj_finance',
    name: 'Bajaj Finance Ltd',
    shortName: 'Bajaj Finance',
    category: 'nbfc',
    logo: '🛡️',
    isGovt: false,
    slabs: [
      { minDays: 365, maxDays: 540, regularRate: 7.40, seniorRate: 7.75, label: '12 to 18 Months' },
      { minDays: 541, maxDays: 729, regularRate: 7.80, seniorRate: 8.15, label: '18 to 24 Months' },
      { minDays: 730, maxDays: 1094, regularRate: 8.10, seniorRate: 8.35, label: '24 to 36 Months' },
      { minDays: 1095, maxDays: 1825, regularRate: 8.10, seniorRate: 8.35, label: '36 to 60 Months' }
    ]
  },
  {
    id: 'other',
    name: 'Custom / Other Institution',
    shortName: 'Other',
    category: 'custom',
    logo: '🏦',
    isGovt: false,
    slabs: []
  }
];

export function matchFdRate(institutionId, totalDays, isSenior = false) {
  const inst = FD_INSTITUTIONS.find(i => i.id === institutionId) || FD_INSTITUTIONS[0];
  const days = Math.max(1, Number(totalDays) || 365);

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
    totalDays = Math.max(1, Math.round((mature.getTime() - start.getTime()) / 86400000));
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

