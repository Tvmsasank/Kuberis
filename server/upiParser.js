/**
 * Kuberis AI Smart UPI & Indian Bank SMS Parser
 * Extracts Amount, Merchant/Beneficiary, Bank Account, Notes, Category, UPI Ref, and Timestamp
 */

// Category Auto-Classifier based on Merchant Keywords and Notes
const CATEGORY_MAP = {
  Dining: [
    'tea', 'chai', 'coffee', 'hotel', 'restaurant', 'cafe', 'swiggy', 'zomato', 
    'bakery', 'tiffin', 'canteen', 'dhaba', 'burger', 'pizza', 'food', 'biryani',
    'juice', 'sweets', 'swathi', 'mess', 'eats', 'snacks', 'starbucks', 'mcdonalds'
  ],
  Groceries: [
    'grocery', 'groceries', 'supermarket', 'mart', 'dmart', 'blinkit', 'zepto',
    'instamart', 'bigbasket', 'kirana', 'milk', 'vegetables', 'fruits', 'dairy',
    'provision', 'general store', 'more retail', 'reliance fresh', 'nature basket'
  ],
  Transportation: [
    'petrol', 'fuel', 'diesel', 'cng', 'shell', 'hp', 'hpcl', 'ioc', 'iocl', 'bpcl',
    'bharat petroleum', 'indian oil', 'uber', 'ola', 'rapido', 'auto', 'cab', 'metro',
    'toll', 'fastag', 'irctc', 'railway', 'parking', 'bus', 'flight', 'redbus'
  ],
  Utilities: [
    'electricity', 'power', 'water', 'tanker', 'hmwssb', 'bescom', 'tneb', 'mseb',
    'gas', 'indane', 'hp gas', 'bharat gas', 'airtel', 'jio', 'vi', 'vodafone',
    'recharge', 'broadband', 'wifi', 'dth', 'tata play', 'dish tv', 'maintenance'
  ],
  Shopping: [
    'amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa', 'zara', 'h&m',
    'clothing', 'apparel', 'footwear', 'electronics', 'croma', 'reliance digital',
    'trends', 'lifestyle', 'shoppers stop', 'decathlon', 'retail', 'stationery', 'book'
  ],
  Entertainment: [
    'movie', 'theatre', 'cinema', 'pvr', 'inox', 'cinepolis', 'bookmyshow', 'netflix',
    'prime', 'hotstar', 'spotify', 'youtube', 'gaming', 'playstation', 'steam'
  ],
  Health: [
    'pharmacy', 'chemist', 'medical', 'hospital', 'clinic', 'doctor', 'apollo',
    'medplus', 'pharmeasy', '1mg', 'netmeds', 'diagnostic', 'lab', 'dentist'
  ],
  Housing: [
    'rent', 'flat', 'apartment', 'society', 'landlord', 'deposit', 'house', 'room'
  ],
  Exams: [
    'exam', 'isro', 'gate', 'upsc', 'fee', 'application', 'registration', 'college', 'school'
  ]
};

// Bank Keyword Resolver
const BANK_MAP = [
  { keywords: ['hdfc'], name: 'HDFC Account' },
  { keywords: ['sbi', 'state bank'], name: 'SBI Account' },
  { keywords: ['icici'], name: 'ICICI Account' },
  { keywords: ['axis'], name: 'Axis Account' },
  { keywords: ['kotak'], name: 'Kotak Account' },
  { keywords: ['pnb', 'punjab national'], name: 'PNB Account' },
  { keywords: ['canara', 'canbk'], name: 'Canara Account' },
  { keywords: ['bob', 'bank of baroda'], name: 'Bank of Baroda' },
  { keywords: ['idfc'], name: 'IDFC FIRST Account' },
  { keywords: ['indusind'], name: 'IndusInd Account' },
  { keywords: ['paytm bank', 'paytm payments'], name: 'Paytm Bank' },
  { keywords: ['gpay', 'google pay'], name: 'Google Pay UPI' },
  { keywords: ['phonepe'], name: 'PhonePe UPI' },
  { keywords: ['cred'], name: 'CRED UPI' }
];

export function autoClassifyCategory(merchant = '', note = '', rawText = '') {
  const combined = `${merchant} ${note} ${rawText}`.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
    for (const kw of keywords) {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      if (regex.test(combined) || combined.includes(kw)) {
        return category;
      }
    }
  }

  return 'General';
}

export function detectAccount(rawText = '', defaultAccount = 'HDFC Account') {
  const lower = rawText.toLowerCase();
  for (const bank of BANK_MAP) {
    if (bank.keywords.some(kw => lower.includes(kw))) {
      return bank.name;
    }
  }
  return defaultAccount;
}

/**
 * Parse any Indian Bank SMS, UPI notification, or freeform payment text
 * @param {string} text - Raw SMS / text / notification string
 * @returns {object|null} Parsed financial transaction object
 */
export function parseUpiTransactionText(text = '') {
  if (!text || typeof text !== 'string') return null;
  const raw = text.trim();
  if (raw.length < 3) return null;

  let amount = null;
  let type = 'expense';
  let merchant = '';
  let note = '';
  let upiRef = '';
  let source = 'UPI Auto-Sync';

  // 1. Detect Type (Credit vs Debit)
  const isCredit = /(credited|received|refunded|deposited|added)/i.test(raw);
  if (isCredit) {
    type = 'income';
  }

  // 2. Extract Amount (e.g. Rs. 10.00, INR 150, ₹500, Rs 20, 10 rupees)
  const amountPatterns = [
    /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:rs\.?|inr|₹|rupees)/i,
    /(?:debited|credited|sent|paid|transferred|transfer\s+of)\s+(?:by\s+)?(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /\b(?:paid|sent|transferred|spent)\s+([\d,]+(?:\.\d{1,2})?)\b/i
  ];

  for (const pattern of amountPatterns) {
    const match = raw.match(pattern);
    if (match && match[1]) {
      const parsedNum = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(parsedNum) && parsedNum > 0) {
        amount = parsedNum;
        break;
      }
    }
  }

  if (!amount) return null;

  // 3. Extract UPI Reference Number (e.g., UPI Ref: 42358912, Ref 659740211224, (UPI 128148388270))
  const upiRefMatch = raw.match(/(?:upi\s*ref(?:erence)?\s*(?:no\.?)?|ref\s*(?:no\.?)?|rrn)[\s/:]*([a-zA-Z0-9]{6,16})/i)
    || raw.match(/\bupi[\s:]*([0-9]{8,16})\b/i)
    || raw.match(/upi\/([0-9]{8,16})/i);
  if (upiRefMatch && upiRefMatch[1]) {
    upiRef = upiRefMatch[1].trim();
  }

  // 4. Extract User Note / Remarks / Info (e.g. Info: Chai and biscuits, Note: Petrol, Remarks: Dinner)
  const noteMatch = raw.match(/(?:info|note|remarks?|desc(?:ription)?|for)[\s/:]+([^.\n,]+?)(?=\s*(?:bal|avail|on|\(upi|upi\s*ref|ref|\.|$))/i);
  if (noteMatch && noteMatch[1]) {
    const cleanNote = noteMatch[1].trim();
    // Exclude if it captured standard system words
    if (!/^(upi|imps|neft|xx|\d+)$/i.test(cleanNote) && cleanNote.length > 1) {
      note = cleanNote;
    }
  }

  // 5. Extract Merchant / Beneficiary Name
  // Patterns for Indian Bank SMS and UPI apps
  const merchantPatterns = [
    /(?:from\s+vpa|to\s+vpa|from\s+upi|to\s+upi|vpa|upi\s*id)[\s/:]+([a-zA-Z0-9._-]+@[a-zA-Z0-9]+)/i,
    /(?:to|towards|at|paid\s+to|transfer\s+to)\s+([A-Za-z0-9\s&'-]+?)(?=\s+(?:on|via|using|ref|\(upi|upi|bal|avail|not\s+you|\.|\n|$))/i,
    /upi\/[0-9]+\/([^/.\n]+)/i,
    /(?:paid|sent)\s+(?:rs\.?|inr|₹)?\s*[\d,.]+\s+to\s+([A-Za-z0-9\s&'-]+?)(?=\s+(?:on|via|for|\.|$))/i
  ];

  for (const mPattern of merchantPatterns) {
    const match = raw.match(mPattern);
    if (match && match[1]) {
      let candidate = match[1].trim();
      // If candidate is a VPA like "merchant-name-2@okhdfcbank", clean it into readable name
      if (candidate.includes('@')) {
        candidate = candidate.split('@')[0].replace(/[-_0-9]+/g, ' ').trim();
      }

      // Clean noise words
      candidate = candidate
        .replace(/^(a\/c|account|m\/s|mr|mrs|dr)\s+/i, '')
        .replace(/\s+(a\/c|account|bank|ltd|pvt|upi)$/i, '')
        .trim();

      if (candidate.length >= 2 && !/^(rs|inr|the|your|my)$/i.test(candidate)) {
        merchant = candidate;
        break;
      }
    }
  }

  // Fallback for merchant if not found
  if (!merchant) {
    if (note && note.length > 2) {
      merchant = note;
    } else {
      merchant = type === 'income' ? 'UPI Sender' : 'UPI Merchant';
    }
  }

  // Detect Source UPI App
  if (/gpay|google\s*pay/i.test(raw)) source = 'UPI - GPay';
  else if (/phonepe/i.test(raw)) source = 'UPI - PhonePe';
  else if (/paytm/i.test(raw)) source = 'UPI - Paytm';
  else if (/\bcred\s+(?:app|pay|upi)?\b/i.test(raw) && !/credit/i.test(raw)) source = 'UPI - CRED';
  else if (/bhim/i.test(raw)) source = 'UPI - BHIM';

  // Detect Bank Account
  const account = detectAccount(raw, 'HDFC Account');

  // Auto-Classify Category
  const category = autoClassifyCategory(merchant, note, raw);

  // Capitalize Merchant Cleanly
  const cleanMerchant = merchant
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  const today = new Date().toISOString().split('T')[0];

  return {
    amount: Math.round(amount * 100) / 100,
    merchant: cleanMerchant,
    type,
    category,
    account,
    notes: note || (upiRef ? `UPI Ref: ${upiRef}` : 'UPI Transfer'),
    tags: ['UPI', source.replace('UPI - ', '')].filter(Boolean),
    date: today,
    source,
    upiRef: upiRef || null,
    rawText: raw
  };
}
