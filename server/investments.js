/**
 * Live Investment Price Fetcher for Indian Mutual Funds, Stocks & Cryptocurrencies
 */

// Memory cache for prices (expires every 1 minute for fast live updates)
const priceCache = new Map();
const CACHE_TTL_MS = 60 * 1000;

// Popular Indian stock mapper (Company Name / Short Code -> Official NSE Ticker)
const INDIAN_STOCK_MAP = {
  'CANARA BANK': 'CANBK.NS',
  'CANARA': 'CANBK.NS',
  'CANBK': 'CANBK.NS',
  'CANBK.NS': 'CANBK.NS',
  'RELIANCE': 'RELIANCE.NS',
  'RELIANCE INDUSTRIES': 'RELIANCE.NS',
  'TATA MOTORS': 'TMPV.NS',
  'TATAMOTORS': 'TMPV.NS',
  'TATAMOTORS.NS': 'TMPV.NS',
  'TMCV': 'TMCV.NS',
  'TMCV.NS': 'TMCV.NS',
  'TMPV': 'TMPV.NS',
  'TMPV.NS': 'TMPV.NS',
  'INFOSYS': 'INFY.NS',
  'INFY': 'INFY.NS',
  'TCS': 'TCS.NS',
  'TATA CONSULTANCY SERVICES': 'TCS.NS',
  'HDFC BANK': 'HDFCBANK.NS',
  'HDFCBANK': 'HDFCBANK.NS',
  'ICICI BANK': 'ICICIBANK.NS',
  'ICICIBANK': 'ICICIBANK.NS',
  'TATA STEEL': 'TATASTEEL.NS',
  'TATASTEEL': 'TATASTEEL.NS',
  'SBI': 'SBIN.NS',
  'STATE BANK OF INDIA': 'SBIN.NS',
  'SBIN': 'SBIN.NS',
  'ITC': 'ITC.NS',
  'BAJAJ HOUSING': 'BAJAJHFL.NS',
  'BAJAJHFL': 'BAJAJHFL.NS',
  'ZOMATO': 'ZOMATO.NS',
  'PAYTM': 'PAYTM.NS',
  'JIO FINANCIAL': 'JIOFIN.NS',
  'JIOFIN': 'JIOFIN.NS',
  'WIPRO': 'WIPRO.NS',
  'BHARTI AIRTEL': 'BHARTIARTL.NS',
  'AIRTEL': 'BHARTIARTL.NS',
  'L&T': 'LT.NS',
  'LARSEN': 'LT.NS',
  'AXIS BANK': 'AXISBANK.NS',
  'KOTAK BANK': 'KOTAKBANK.NS',
  'GLAND': 'GLAND.NS',
  'GLAND PHARMA': 'GLAND.NS',
  'IRFC': 'IRFC.NS',
  'INDIAN RAILWAY FINANCE': 'IRFC.NS',
  'LAURUSLABS': 'LAURUSLABS.NS',
  'LAURUS LABS': 'LAURUSLABS.NS',
  'OLAELEC': 'OLAELEC.NS',
  'OLA ELECTRIC': 'OLAELEC.NS',
  'DEBIL': 'DBEIL.NS',
  'DEBIL.NS': 'DBEIL.NS',
  'DBEIL': 'DBEIL.NS',
  'DBEIL.NS': 'DBEIL.NS',
  'DEEPAK BUILDERS': 'DBEIL.NS',
  'DEEPAK BUILDERS & ENGINEERS': 'DBEIL.NS',
  'DEVYANI': 'DEVYANI.NS',
  'DELHIVERY': 'DELHIVERY.NS',
  'DEEPAKNTR': 'DEEPAKNTR.NS',
  'DELTACORP': 'DELTACORP.NS',
  'DELTA': 'DELTA.BO',
  'DELTA.BO': 'DELTA.BO',
  'DEBOCK': 'DEBOCK.NS',
  'BSE': 'BSE.NS',
  'BSE.NS': 'BSE.NS',
  'BSE.BO': '532648.BO',
  'BSE LIMITED': 'BSE.NS',
  '500325': '500325.BO',
  '532540': '532540.BO',
  '500180': '500180.BO',
  '500209': '500209.BO',
  '500112': '500112.BO',
  'GTV': 'GTV.BO',
  'GTV.BO': 'GTV.BO',
  'GTVENG': 'GTV.BO',
  'GTVENGINEERING': 'GTV.BO',
  'GTVENGINEERING.NS': 'GTV.BO',
  'GTVENGINEERING.BO': 'GTV.BO',
  'GTV ENGINEERING': 'GTV.BO',
  'GTV ENGINEERING LIMITED': 'GTV.BO',
  '539479': 'GTV.BO',
  'FUTURE RETAIL': 'FRETAIL.NS',
  'FUTURE RETAIL LIMITED': 'FRETAIL.NS',
  'FRETAIL': 'FRETAIL.NS',
  'FRETAIL.NS': 'FRETAIL.NS',
  'FRETAIL.BO': 'FRETAIL.BO',
  '540702': 'FRETAIL.NS',
  'FUTURE': 'FRETAIL.NS',
  'FUTURERELE': 'FRETAIL.NS',
  'FUTURERELE.NS': 'FRETAIL.NS'
};

// Popular Crypto mapper (Coin Name / Symbol -> Yahoo Finance INR Ticker)
const CRYPTO_MAP = {
  'BTC': 'BTC-INR',
  'BITCOIN': 'BTC-INR',
  'BTC-INR': 'BTC-INR',
  'ETH': 'ETH-INR',
  'ETHEREUM': 'ETH-INR',
  'ETH-INR': 'ETH-INR',
  'SOL': 'SOL-INR',
  'SOLANA': 'SOL-INR',
  'SOL-INR': 'SOL-INR',
  'DOGE': 'DOGE-INR',
  'DOGECOIN': 'DOGE-INR',
  'DOGE-INR': 'DOGE-INR',
  'XRP': 'XRP-INR',
  'RIPPLE': 'XRP-INR',
  'XRP-INR': 'XRP-INR',
  'USDT': 'USDT-INR',
  'TETHER': 'USDT-INR',
  'USDT-INR': 'USDT-INR',
  'BNB': 'BNB-INR',
  'BINANCE COIN': 'BNB-INR',
  'BNB-INR': 'BNB-INR',
  'ADA': 'ADA-INR',
  'CARDANO': 'ADA-INR',
  'ADA-INR': 'ADA-INR',
  'SHIB': 'SHIB-INR',
  'SHIBA INU': 'SHIB-INR',
  'SHIB-INR': 'SHIB-INR',
  'MATIC': 'MATIC-INR',
  'POLYGON': 'MATIC-INR',
  'MATIC-INR': 'MATIC-INR',
  'AVAX': 'AVAX-INR',
  'AVALANCHE': 'AVAX-INR',
  'AVAX-INR': 'AVAX-INR',
  'DOT': 'DOT-INR',
  'POLKADOT': 'DOT-INR',
  'DOT-INR': 'DOT-INR',
  'TRX': 'TRX-INR',
  'TRON': 'TRX-INR',
  'TRX-INR': 'TRX-INR'
};

/**
 * Resolve stock ticker for any Indian stock symbol or name
 */
export function resolveStockSymbol(symbolOrName, fallbackName = '') {
  if (!symbolOrName && !fallbackName) return null;
  const rawInput = (symbolOrName || fallbackName).trim().toUpperCase();
  const rawFallback = (fallbackName || '').trim().toUpperCase();

  // Explicit Exchange Prefixes: BSE:RELIANCE, NSE:TCS, BSE:500325
  if (rawInput.startsWith('BSE:') || rawInput.startsWith('BSE-') || rawInput.startsWith('BSE/')) {
    const code = rawInput.slice(4).trim().replace(/[^A-Z0-9]/g, '');
    return code ? `${code}.BO` : null;
  }
  if (rawInput.startsWith('NSE:') || rawInput.startsWith('NSE-') || rawInput.startsWith('NSE/')) {
    const code = rawInput.slice(4).trim().replace(/[^A-Z0-9]/g, '');
    return code ? `${code}.NS` : null;
  }

  // 1. Check Indian stock map dictionary FIRST
  if (INDIAN_STOCK_MAP[rawInput]) {
    return INDIAN_STOCK_MAP[rawInput];
  }

  // 2. Check stripped name (without .NS / .BO) in dictionary to catch GTVENGINEERING.NS -> GTV.BO
  const stripped = rawInput.replace(/\.(NS|BO)$/i, '');
  if (INDIAN_STOCK_MAP[stripped]) {
    return INDIAN_STOCK_MAP[stripped];
  }

  // 3. Check fallbackName in dictionary
  if (rawFallback) {
    if (INDIAN_STOCK_MAP[rawFallback]) {
      return INDIAN_STOCK_MAP[rawFallback];
    }
    const strippedFallback = rawFallback.replace(/\.(NS|BO)$/i, '');
    if (INDIAN_STOCK_MAP[strippedFallback]) {
      return INDIAN_STOCK_MAP[strippedFallback];
    }
  }

  // 4. If already ends with .NS or .BO
  if (rawInput.endsWith('.NS') || rawInput.endsWith('.BO')) {
    return rawInput;
  }

  // 5. Indian BSE numeric scrip codes (e.g., 500325, 532540, 500180, 539479)
  if (/^\d{5,6}$/.test(rawInput)) {
    return `${rawInput}.BO`;
  }

  const cleanSymbol = rawInput.replace(/[^A-Z0-9]/g, '');
  if (!cleanSymbol) return null;
  return `${cleanSymbol}.NS`;
}

/**
 * Resolve crypto ticker for any cryptocurrency
 */
export function resolveCryptoSymbol(symbolOrName) {
  if (!symbolOrName) return 'BTC-INR';
  const raw = symbolOrName.trim().toUpperCase();

  if (CRYPTO_MAP[raw]) {
    return CRYPTO_MAP[raw];
  }

  if (raw.endsWith('-INR') || raw.endsWith('-USD')) {
    return raw;
  }

  const clean = raw.replace(/[^A-Z0-9]/g, '');
  return `${clean}-INR`;
}

/**
 * Single symbol price query helper from Yahoo Finance API
 */
async function querySingleYahooSymbol(symbol) {
  if (!symbol) return null;
  const cacheKey = `price_${symbol}`;
  const cached = priceCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached;
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });

    if (res.ok) {
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      const livePrice = meta?.regularMarketPrice || meta?.chartPreviousClose || meta?.previousClose;
      const previousClose = meta?.chartPreviousClose || meta?.previousClose || livePrice;
      const dayChange = (typeof livePrice === 'number' && typeof previousClose === 'number') ? livePrice - previousClose : 0;
      const dayPercentage = (previousClose > 0) ? (dayChange / previousClose) * 100 : 0;

      if (livePrice && typeof livePrice === 'number' && livePrice > 0) {
        const result = { price: livePrice, previousClose, dayChange, dayPercentage };
        priceCache.set(cacheKey, { ...result, timestamp: Date.now() });
        return result;
      }
    }
  } catch (err) {
    // Ignore single query error
  }
  return null;
}

/**
 * Search Yahoo Finance for matching NSE / BSE symbol
 */
async function searchYahooIndianSymbol(query) {
  if (!query) return null;
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=6&newsCount=0`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    if (res.ok) {
      const data = await res.json();
      const quotes = data?.quotes || [];
      const nseMatch = quotes.find(q => q.symbol && q.symbol.endsWith('.NS'));
      if (nseMatch) return nseMatch.symbol;
      const bseMatch = quotes.find(q => q.symbol && (q.symbol.endsWith('.BO') || q.exchange === 'BSE'));
      if (bseMatch) return bseMatch.symbol;
    }
  } catch (err) {}
  return null;
}

/**
 * Fetch live stock price with dual NSE (.NS) and BSE (.BO) fallback resolution
 */
export async function fetchStockPrice(symbolOrName, fallbackName = '') {
  if (!symbolOrName && !fallbackName) return { price: null, symbol: null, previousClose: null, dayChange: 0, dayPercentage: 0 };
  const primarySymbol = resolveStockSymbol(symbolOrName, fallbackName);

  // 1. Try Primary Symbol (e.g. GTV.BO, FRETAIL.NS, TMCV.NS, DELTA.BO, 500325.BO)
  let quote = await querySingleYahooSymbol(primarySymbol);
  if (quote && quote.price !== null) {
    return { ...quote, symbol: primarySymbol };
  }

  // 2. Dual Fallback: If .NS failed, try .BO (BSE India); if .BO failed, try .NS
  if (primarySymbol) {
    if (primarySymbol.endsWith('.NS')) {
      const bseSymbol = primarySymbol.replace(/\.NS$/, '.BO');
      quote = await querySingleYahooSymbol(bseSymbol);
      if (quote && quote.price !== null) {
        return { ...quote, symbol: bseSymbol };
      }
    } else if (primarySymbol.endsWith('.BO')) {
      const nseSymbol = primarySymbol.replace(/\.BO$/, '.NS');
      quote = await querySingleYahooSymbol(nseSymbol);
      if (quote && quote.price !== null) {
        return { ...quote, symbol: nseSymbol };
      }
    }
  }

  // 3. Fallback: Search with fallback name (e.g. 'GTV Engineering' or 'Future Retail')
  if (fallbackName && fallbackName.trim() !== (symbolOrName || '').trim()) {
    const searchedSymbol = await searchYahooIndianSymbol(fallbackName.trim());
    if (searchedSymbol) {
      quote = await querySingleYahooSymbol(searchedSymbol);
      if (quote && quote.price !== null) {
        return { ...quote, symbol: searchedSymbol };
      }
    }
  }

  // 4. Fallback: Search with clean alphanumeric query
  const stripped = (symbolOrName || '').replace(/\.(NS|BO)$/i, '').trim();
  if (stripped) {
    const searchedSymbol = await searchYahooIndianSymbol(stripped);
    if (searchedSymbol && searchedSymbol !== primarySymbol) {
      quote = await querySingleYahooSymbol(searchedSymbol);
      if (quote && quote.price !== null) {
        return { ...quote, symbol: searchedSymbol };
      }
    }
  }

  return { price: null, symbol: primarySymbol, previousClose: null, dayChange: 0, dayPercentage: 0 };
}

/**
 * Fetch live Cryptocurrency price in INR
 */
export async function fetchCryptoPrice(symbolOrName) {
  if (!symbolOrName) return { price: null, symbol: null, previousClose: null, dayChange: 0, dayPercentage: 0 };
  const resolved = resolveCryptoSymbol(symbolOrName);

  let quote = await querySingleYahooSymbol(resolved);
  if (quote && quote.price !== null) {
    return { ...quote, symbol: resolved };
  }

  // Fallback: Try -USD converted to INR (~ ₹87)
  const usdSymbol = resolved.replace('-INR', '-USD');
  const usdQuote = await querySingleYahooSymbol(usdSymbol);
  if (usdQuote && usdQuote.price !== null) {
    const inrRate = 87.0;
    return {
      price: Math.round(usdQuote.price * inrRate * 100) / 100,
      previousClose: Math.round(usdQuote.previousClose * inrRate * 100) / 100,
      dayChange: Math.round(usdQuote.dayChange * inrRate * 100) / 100,
      dayPercentage: usdQuote.dayPercentage,
      symbol: resolved
    };
  }

  return { price: null, symbol: resolved, previousClose: null, dayChange: 0, dayPercentage: 0 };
}

/**
 * Clean complex fund names for accurate API search
 */
function cleanMFSearchQuery(rawText) {
  if (!rawText) return '';
  const trimmed = rawText.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;

  return trimmed
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\|/g, '')
    .replace(/inida/gi, 'India')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fetch live Mutual Fund NAV from mfapi.in (100% accurate Indian MF API down to 4 decimal places)
 */
/**
 * Fetch live Mutual Fund NAV from mfapi.in (100% accurate Indian MF API down to 4 decimal places)
 */
export async function fetchMutualFundNav(schemeNameOrCode) {
  if (!schemeNameOrCode) return null;
  const rawQuery = schemeNameOrCode.trim();
  const cacheKey = `mf_${rawQuery.toLowerCase()}`;

  const cached = priceCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached;
  }

  const parseNavData = (data, code, name) => {
    const list = data?.data || [];
    if (list.length === 0) return null;
    const latestNav = parseFloat(list[0]?.nav);
    if (isNaN(latestNav) || latestNav <= 0) return null;
    const prevNav = parseFloat(list[1]?.nav || list[0]?.nav);
    const navDate = list[0]?.date || '';
    const dayChange = !isNaN(prevNav) ? latestNav - prevNav : 0;
    const dayPercentage = prevNav > 0 ? (dayChange / prevNav) * 100 : 0;

    return {
      price: latestNav,
      previousClose: prevNav,
      dayChange: Math.round(dayChange * 10000) / 10000,
      dayPercentage: Math.round(dayPercentage * 100) / 100,
      navDate,
      schemeCode: String(code),
      schemeName: name || data?.meta?.scheme_name
    };
  };

  if (/^\d+$/.test(rawQuery)) {
    try {
      const res = await fetch(`https://api.mfapi.in/mf/${rawQuery}`);
      if (res.ok) {
        const data = await res.json();
        const result = parseNavData(data, rawQuery, data?.meta?.scheme_name);
        if (result) {
          priceCache.set(cacheKey, { ...result, timestamp: Date.now() });
          return result;
        }
      }
    } catch (err) {
      console.error(`mfapi code lookup error for ${rawQuery}:`, err.message);
    }
  }

  const searchQuery = cleanMFSearchQuery(rawQuery);
  try {
    const searchRes = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(searchQuery)}`);
    if (searchRes.ok) {
      const results = await searchRes.json();
      if (Array.isArray(results) && results.length > 0) {
        let bestMatch = results.find(r => 
          r.schemeName.toLowerCase().includes('direct') && r.schemeName.toLowerCase().includes('growth')
        );
        if (!bestMatch) {
          bestMatch = results.find(r => r.schemeName.toLowerCase().includes('growth'));
        }
        if (!bestMatch) {
          bestMatch = results[0];
        }

        if (bestMatch && bestMatch.schemeCode) {
          const detailRes = await fetch(`https://api.mfapi.in/mf/${bestMatch.schemeCode}`);
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            const result = parseNavData(detailData, bestMatch.schemeCode, bestMatch.schemeName);
            if (result) {
              priceCache.set(cacheKey, { ...result, timestamp: Date.now() });
              return result;
            }
          }
        }
      }
    }
  } catch (err) {
    console.error(`mfapi search error for ${searchQuery}:`, err.message);
  }

  return null;
}

/**
 * Batch price updates for array of holdings
 */
export async function refreshHoldingsPrices(holdings = []) {
  const updatedHoldings = [];

  for (const h of holdings) {
    let quote = null;
    let livePrice = null;
    let previousClose = null;
    let dayChange = 0;
    let dayPercentage = 0;
    let navDate = null;
    let resolvedSymbol = h.symbol || '';
    let priceStatus = 'ok';

    if (h.type === 'stock') {
      quote = await fetchStockPrice(h.symbol, h.name);
      livePrice = quote.price;
      previousClose = quote.previousClose;
      dayChange = quote.dayChange;
      dayPercentage = quote.dayPercentage;
      if (quote.symbol) resolvedSymbol = quote.symbol;
    } else if (h.type === 'crypto' || h.type === 'cryptocurrency') {
      quote = await fetchCryptoPrice(h.symbol || h.name);
      livePrice = quote.price;
      previousClose = quote.previousClose;
      dayChange = quote.dayChange;
      dayPercentage = quote.dayPercentage;
      if (quote.symbol) resolvedSymbol = quote.symbol;
    } else if (h.type === 'mutual_fund') {
      quote = await fetchMutualFundNav(h.symbol || h.name);
      livePrice = quote?.price ?? null;
      previousClose = quote?.previousClose ?? null;
      dayChange = quote?.dayChange ?? 0;
      dayPercentage = quote?.dayPercentage ?? 0;
      navDate = quote?.navDate ?? null;
      if (quote?.schemeCode) resolvedSymbol = String(quote.schemeCode);
    }

    const qty = Number(h.quantity || 1);

    if (livePrice !== null && !isNaN(livePrice) && livePrice > 0) {
      const currentValuation = Math.round((livePrice * qty) * 100) / 100;
      const totalCost = Math.round(((Number(h.buyPrice) || livePrice) * qty) * 100) / 100;
      const unrealizedPnL = Math.round((currentValuation - totalCost) * 100) / 100;
      const pnlPercentage = totalCost > 0 ? Math.round(((unrealizedPnL / totalCost) * 100) * 100) / 100 : 0;
      const dayRupees = Math.round((dayChange * qty) * 100) / 100;
      const roundedDayPct = Math.round(dayPercentage * 100) / 100;

      updatedHoldings.push({
        ...h,
        symbol: resolvedSymbol || h.symbol || '',
        currentPrice: livePrice,
        previousClose: previousClose || livePrice,
        dayChange,
        dayPercentage: roundedDayPct,
        dayRupees,
        navDate: navDate || h.navDate || null,
        currentValuation,
        unrealizedPnL,
        pnlPercentage,
        priceStatus: 'ok',
        lastPriceSyncAt: new Date().toISOString()
      });
    } else {
      priceStatus = (h.type === 'stock' || h.type === 'mutual_fund' || h.type === 'crypto') ? 'invalid_symbol' : 'manual';
      const currentPrice = Number(h.currentPrice || h.buyPrice || 0);
      const currentValuation = Math.round((currentPrice * qty) * 100) / 100;
      const totalCost = Math.round(((Number(h.buyPrice) || currentPrice) * qty) * 100) / 100;
      const unrealizedPnL = Math.round((currentValuation - totalCost) * 100) / 100;
      const pnlPercentage = totalCost > 0 ? Math.round(((unrealizedPnL / totalCost) * 100) * 100) / 100 : 0;

      updatedHoldings.push({
        ...h,
        symbol: resolvedSymbol || h.symbol || '',
        currentPrice,
        previousClose: h.previousClose || currentPrice,
        dayChange: h.dayChange || 0,
        dayPercentage: h.dayPercentage || 0,
        dayRupees: h.dayRupees || 0,
        navDate: h.navDate || null,
        currentValuation,
        unrealizedPnL,
        pnlPercentage,
        priceStatus
      });
    }
  }

  return updatedHoldings;
}
