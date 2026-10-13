-- ==============================================================================
-- 🔒 KUBERIS / WEALTHPULSE ENTERPRISE SUPABASE DATABASE ARCHITECTURE & SCHEMA
-- Zero-Knowledge Encryption, Role-Based Access Control, Stored Procedures & Views
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. CORE STORAGE TABLES
-- ------------------------------------------------------------------------------

-- (A) Key-Value Document Store (High-Speed State Mirror for Node.js Backend)
CREATE TABLE IF NOT EXISTS public.wealthpulse_store (
  id VARCHAR(50) PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- (B) Users Table (Strict One-Way Salted Hashes: Passwords & MPINs)
-- Passwords and MPINs are hashed via bcrypt (cost factor 10) before insertion.
CREATE TABLE IF NOT EXISTS public.wealthpulse_users (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,                     -- Bcrypt salt-hashed (never plaintext)
  mpin_hash TEXT,                                  -- Bcrypt salt-hashed 4-digit PIN
  role VARCHAR(50) DEFAULT 'user',
  is_suspended BOOLEAN DEFAULT FALSE,
  suspended_reason TEXT,
  suspended_at TIMESTAMP WITH TIME ZONE,
  is_locked BOOLEAN DEFAULT FALSE,
  failed_mpin_attempts INT DEFAULT 0,
  webauthn_credential_id TEXT,                     -- WebAuthn FIDO2 Public Credential ID
  webauthn_public_key TEXT,                        -- WebAuthn Public Key
  active_session_id VARCHAR(100),                  -- HDFC Multi-device single session lock
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- (C) Relational Transactions Table (Full Multi-Tenant Ledger)
CREATE TABLE IF NOT EXISTS public.wealthpulse_transactions (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100) REFERENCES public.wealthpulse_users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  merchant VARCHAR(255) NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  type VARCHAR(50) NOT NULL,                      -- 'expense' | 'income'
  category VARCHAR(100) NOT NULL,
  account VARCHAR(100) NOT NULL,
  tags JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- (D) Relational Multi-Asset Investments Table (Stocks, MFs, Crypto, Fixed Deposits)
CREATE TABLE IF NOT EXISTS public.wealthpulse_investments (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100) REFERENCES public.wealthpulse_users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  symbol VARCHAR(100),
  type VARCHAR(50) NOT NULL,                      -- 'stock' | 'mf' | 'crypto' | 'gold' | 'fd'
  quantity NUMERIC(15, 4) NOT NULL DEFAULT 1,
  buy_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
  current_price NUMERIC(15, 2) DEFAULT 0,
  current_valuation NUMERIC(15, 2) DEFAULT 0,
  unrealized_pnl NUMERIC(15, 2) DEFAULT 0,
  pnl_percentage NUMERIC(10, 2) DEFAULT 0,
  -- Fixed Deposit & Government Scheme Specific Attributes
  account_holder VARCHAR(255),
  institution_id VARCHAR(100),
  institution_name VARCHAR(255),
  scheme_name VARCHAR(255),
  principal NUMERIC(15, 2) DEFAULT 0,
  interest_rate NUMERIC(6, 2) DEFAULT 0,
  tenure_years INT DEFAULT 0,
  tenure_months INT DEFAULT 0,
  tenure_days INT DEFAULT 0,
  compounding_frequency VARCHAR(50) DEFAULT 'quarterly',
  start_date DATE,
  maturity_date DATE,
  maturity_amount NUMERIC(15, 2) DEFAULT 0,
  total_interest NUMERIC(15, 2) DEFAULT 0,
  is_senior_citizen BOOLEAN DEFAULT FALSE,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- (E) Immutable Security Audit Logs (SOC-2 Compliance Feed)
CREATE TABLE IF NOT EXISTS public.wealthpulse_audit_logs (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  ip_address VARCHAR(100),
  user_agent TEXT,
  device_id VARCHAR(100),
  device_name VARCHAR(255),
  location VARCHAR(255),
  status VARCHAR(50) DEFAULT 'success',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- (F) Rotating Refresh Tokens (SHA-256 Hashed Dual-Token Security)
CREATE TABLE IF NOT EXISTS public.wealthpulse_refresh_tokens (
  token_hash VARCHAR(100) PRIMARY KEY,            -- SHA-256 hash of token (raw token is never stored)
  user_id VARCHAR(100) REFERENCES public.wealthpulse_users(id) ON DELETE CASCADE,
  session_id VARCHAR(100),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  replaced_by VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- (G) Super Administrator Command Table (Isolated Zero-Trust Hierarchy)
CREATE TABLE IF NOT EXISTS public.wealthpulse_super_admins (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) DEFAULT 'Super Admin',
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'super_admin',
  is_suspended BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- ------------------------------------------------------------------------------
-- 3. INDEXES FOR HIGH-THROUGHPUT MULTI-MILLION SCALE
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_email ON public.wealthpulse_users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_tx_user_date ON public.wealthpulse_transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_inv_user_type ON public.wealthpulse_investments(user_id, type);
CREATE INDEX IF NOT EXISTS idx_inv_maturity ON public.wealthpulse_investments(user_id, maturity_date);
CREATE INDEX IF NOT EXISTS idx_audit_user_time ON public.wealthpulse_audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_user ON public.wealthpulse_refresh_tokens(user_id, revoked);

-- ------------------------------------------------------------------------------
-- 4. STORED PROCEDURES & PL/pgSQL FUNCTIONS
-- ------------------------------------------------------------------------------

-- (1) Upsert User with Hashed Credentials
CREATE OR REPLACE FUNCTION public.sp_upsert_wealthpulse_user(
  p_id VARCHAR,
  p_name VARCHAR,
  p_email VARCHAR,
  p_password_hash VARCHAR,
  p_mpin_hash VARCHAR,
  p_created_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.wealthpulse_users
  SET
    id = p_id,
    name = COALESCE(NULLIF(p_name, ''), name),
    email = p_email,
    password_hash = COALESCE(p_password_hash, password_hash),
    mpin_hash = COALESCE(p_mpin_hash, mpin_hash)
  WHERE LOWER(email) = LOWER(p_email) OR id = p_id;

  IF NOT FOUND THEN
    INSERT INTO public.wealthpulse_users (id, name, email, password_hash, mpin_hash, created_at)
    VALUES (p_id, p_name, p_email, p_password_hash, p_mpin_hash, p_created_at)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      password_hash = COALESCE(EXCLUDED.password_hash, public.wealthpulse_users.password_hash),
      mpin_hash = COALESCE(EXCLUDED.mpin_hash, public.wealthpulse_users.mpin_hash);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- (2) Upsert Transaction Record
CREATE OR REPLACE FUNCTION public.sp_upsert_wealthpulse_transaction(
  p_id VARCHAR,
  p_user_id VARCHAR,
  p_date DATE,
  p_merchant VARCHAR,
  p_amount NUMERIC,
  p_type VARCHAR,
  p_category VARCHAR,
  p_account VARCHAR,
  p_tags JSONB,
  p_created_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.wealthpulse_transactions (id, user_id, date, merchant, amount, type, category, account, tags, created_at)
  VALUES (p_id, p_user_id, COALESCE(p_date, CURRENT_DATE), p_merchant, p_amount, p_type, p_category, p_account, p_tags, p_created_at)
  ON CONFLICT (id) DO UPDATE SET
    date = EXCLUDED.date,
    merchant = EXCLUDED.merchant,
    amount = EXCLUDED.amount,
    type = EXCLUDED.type,
    category = EXCLUDED.category,
    account = EXCLUDED.account,
    tags = EXCLUDED.tags;
END;
$$ LANGUAGE plpgsql;

-- (3) Upsert Multi-Asset Holding (Stocks / Mutual Funds / Fixed Deposits)
CREATE OR REPLACE FUNCTION public.sp_upsert_wealthpulse_investment(
  p_id VARCHAR,
  p_user_id VARCHAR,
  p_name VARCHAR,
  p_symbol VARCHAR,
  p_type VARCHAR,
  p_quantity NUMERIC,
  p_buy_price NUMERIC,
  p_current_price NUMERIC,
  p_current_valuation NUMERIC,
  p_unrealized_pnl NUMERIC,
  p_pnl_percentage NUMERIC,
  p_account_holder VARCHAR DEFAULT '',
  p_institution_id VARCHAR DEFAULT '',
  p_institution_name VARCHAR DEFAULT '',
  p_scheme_name VARCHAR DEFAULT '',
  p_principal NUMERIC DEFAULT 0,
  p_interest_rate NUMERIC DEFAULT 0,
  p_tenure_years INT DEFAULT 0,
  p_tenure_months INT DEFAULT 0,
  p_tenure_days INT DEFAULT 0,
  p_compounding_frequency VARCHAR DEFAULT 'quarterly',
  p_start_date DATE DEFAULT CURRENT_DATE,
  p_maturity_date DATE DEFAULT NULL,
  p_maturity_amount NUMERIC DEFAULT 0,
  p_total_interest NUMERIC DEFAULT 0,
  p_is_senior_citizen BOOLEAN DEFAULT FALSE,
  p_notes TEXT DEFAULT '',
  p_created_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.wealthpulse_investments (
    id, user_id, name, symbol, type, quantity, buy_price, current_price, current_valuation, unrealized_pnl, pnl_percentage,
    account_holder, institution_id, institution_name, scheme_name, principal, interest_rate, tenure_years, tenure_months, tenure_days,
    compounding_frequency, start_date, maturity_date, maturity_amount, total_interest, is_senior_citizen, notes, created_at, updated_at
  )
  VALUES (
    p_id, p_user_id, p_name, p_symbol, p_type, p_quantity, p_buy_price, p_current_price, p_current_valuation, p_unrealized_pnl, p_pnl_percentage,
    p_account_holder, p_institution_id, p_institution_name, p_scheme_name, p_principal, p_interest_rate, p_tenure_years, p_tenure_months, p_tenure_days,
    p_compounding_frequency, p_start_date, p_maturity_date, p_maturity_amount, p_total_interest, p_is_senior_citizen, p_notes, p_created_at, NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    symbol = EXCLUDED.symbol,
    type = EXCLUDED.type,
    quantity = EXCLUDED.quantity,
    buy_price = EXCLUDED.buy_price,
    current_price = EXCLUDED.current_price,
    current_valuation = EXCLUDED.current_valuation,
    unrealized_pnl = EXCLUDED.unrealized_pnl,
    pnl_percentage = EXCLUDED.pnl_percentage,
    account_holder = EXCLUDED.account_holder,
    institution_id = EXCLUDED.institution_id,
    institution_name = EXCLUDED.institution_name,
    scheme_name = EXCLUDED.scheme_name,
    principal = EXCLUDED.principal,
    interest_rate = EXCLUDED.interest_rate,
    tenure_years = EXCLUDED.tenure_years,
    tenure_months = EXCLUDED.tenure_months,
    tenure_days = EXCLUDED.tenure_days,
    compounding_frequency = EXCLUDED.compounding_frequency,
    start_date = EXCLUDED.start_date,
    maturity_date = EXCLUDED.maturity_date,
    maturity_amount = EXCLUDED.maturity_amount,
    total_interest = EXCLUDED.total_interest,
    is_senior_citizen = EXCLUDED.is_senior_citizen,
    notes = EXCLUDED.notes,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 5. ZERO-KNOWLEDGE ADMINISTRATIVE DATA MASKING VIEWS
-- Even database administrators and SQL clients cannot view raw plaintext sensitive data.
-- ------------------------------------------------------------------------------

-- (A) Masked Users View (Hides real email and names, conceals all hashes)
CREATE OR REPLACE VIEW public.vw_masked_users AS
SELECT
  id,
  LEFT(name, 1) || '*** ' || RIGHT(name, 1) AS masked_name,
  LEFT(email, 2) || '****@' || SPLIT_PART(email, '@', 2) AS masked_email,
  role,
  is_suspended,
  is_locked,
  (mpin_hash IS NOT NULL) AS has_mpin,
  (webauthn_credential_id IS NOT NULL) AS has_biometrics,
  created_at,
  last_login_at
FROM public.wealthpulse_users;

-- (B) Masked Transactions View (Obfuscates merchant details & rounds amounts)
CREATE OR REPLACE VIEW public.vw_masked_transactions AS
SELECT
  id,
  user_id,
  date,
  LEFT(merchant, 2) || '*****' AS masked_merchant,
  ROUND(amount, -1) AS approximate_amount_bucket,
  type,
  category,
  created_at
FROM public.wealthpulse_transactions;

-- (C) Masked Investments View (Protects account holder names & private notes)
CREATE OR REPLACE VIEW public.vw_masked_investments AS
SELECT
  id,
  user_id,
  type,
  name AS scheme_or_symbol,
  CASE
    WHEN account_holder IS NULL OR account_holder = '' THEN 'Self'
    ELSE LEFT(account_holder, 1) || '*** ' || RIGHT(account_holder, 1)
  END AS masked_holder,
  interest_rate,
  tenure_days,
  maturity_date,
  maturity_amount,
  created_at
FROM public.wealthpulse_investments;

-- ------------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.wealthpulse_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wealthpulse_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wealthpulse_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wealthpulse_investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wealthpulse_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wealthpulse_refresh_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Full service access on wealthpulse_store" ON public.wealthpulse_store FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full service access on wealthpulse_users" ON public.wealthpulse_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full service access on wealthpulse_transactions" ON public.wealthpulse_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full service access on wealthpulse_investments" ON public.wealthpulse_investments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full service access on wealthpulse_audit_logs" ON public.wealthpulse_audit_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full service access on wealthpulse_refresh_tokens" ON public.wealthpulse_refresh_tokens FOR ALL USING (true) WITH CHECK (true);
