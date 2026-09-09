-- ============================================================================
-- WEALTHPULSE SECURE STORED PROCEDURES & DATABASE SCHEMA FOR SUPABASE
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLES & CONSTRAINTS SETUP
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wealthpulse_store (
  id VARCHAR(50) PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.wealthpulse_users (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT,
  mpin_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.wealthpulse_transactions (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) REFERENCES public.wealthpulse_users(id) ON DELETE CASCADE,
  date VARCHAR(50),
  merchant VARCHAR(255),
  amount NUMERIC(15, 2),
  type VARCHAR(50),
  category VARCHAR(100),
  account VARCHAR(100),
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance & Security Indexes
CREATE INDEX IF NOT EXISTS idx_wealthpulse_users_email ON public.wealthpulse_users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_wealthpulse_transactions_user_id ON public.wealthpulse_transactions (user_id);

-- ----------------------------------------------------------------------------
-- 2. STORED PROCEDURES (SECURITY DEFINER FUNCTIONS WITH PARAMETER SANITIZATION)
-- ----------------------------------------------------------------------------

-- Procedure 1: Fetch Main JSON Store
CREATE OR REPLACE FUNCTION public.sp_get_wealthpulse_store(p_id VARCHAR(50))
RETURNS TABLE (data JSONB, updated_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT s.data, s.updated_at
  FROM public.wealthpulse_store s
  WHERE s.id = p_id;
END;
$$;

-- Procedure 2: Upsert Main JSON Store
CREATE OR REPLACE FUNCTION public.sp_upsert_wealthpulse_store(p_id VARCHAR(50), p_data JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.wealthpulse_store (id, data, updated_at)
  VALUES (p_id, p_data, NOW())
  ON CONFLICT (id) DO UPDATE
  SET data = EXCLUDED.data,
      updated_at = NOW();
END;
$$;

-- Procedure 3: Upsert User (Registration & Multi-Tenant Sync)
CREATE OR REPLACE FUNCTION public.sp_upsert_wealthpulse_user(
  p_id VARCHAR(50),
  p_name VARCHAR(255),
  p_email VARCHAR(255),
  p_password_hash TEXT DEFAULT NULL,
  p_mpin_hash TEXT DEFAULT NULL,
  p_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.wealthpulse_users (id, name, email, password_hash, mpin_hash, created_at)
  VALUES (
    p_id,
    TRIM(p_name),
    LOWER(TRIM(p_email)),
    p_password_hash,
    p_mpin_hash,
    COALESCE(p_created_at, NOW())
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    password_hash = COALESCE(EXCLUDED.password_hash, public.wealthpulse_users.password_hash),
    mpin_hash = COALESCE(EXCLUDED.mpin_hash, public.wealthpulse_users.mpin_hash);
END;
$$;

-- Procedure 4: Securely Update User 4-Digit MPIN Hash
CREATE OR REPLACE FUNCTION public.sp_update_user_mpin(
  p_user_id VARCHAR(50),
  p_email VARCHAR(255),
  p_mpin_hash TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.wealthpulse_users
  SET mpin_hash = p_mpin_hash
  WHERE id = p_user_id OR LOWER(email) = LOWER(TRIM(p_email));
END;
$$;

-- Procedure 5: Securely Update User Password Hash
CREATE OR REPLACE FUNCTION public.sp_update_user_password(
  p_user_id VARCHAR(50),
  p_email VARCHAR(255),
  p_password_hash TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.wealthpulse_users
  SET password_hash = p_password_hash
  WHERE id = p_user_id OR LOWER(email) = LOWER(TRIM(p_email));
END;
$$;

-- Procedure 6: Upsert Relational Financial Transaction
CREATE OR REPLACE FUNCTION public.sp_upsert_wealthpulse_transaction(
  p_id VARCHAR(50),
  p_user_id VARCHAR(50),
  p_date VARCHAR(50),
  p_merchant VARCHAR(255),
  p_amount NUMERIC(15, 2),
  p_type VARCHAR(50),
  p_category VARCHAR(100),
  p_account VARCHAR(100),
  p_tags JSONB DEFAULT '[]'::jsonb,
  p_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.wealthpulse_transactions (id, user_id, date, merchant, amount, type, category, account, tags, created_at)
  VALUES (
    p_id,
    p_user_id,
    p_date,
    p_merchant,
    p_amount,
    p_type,
    p_category,
    p_account,
    COALESCE(p_tags, '[]'::jsonb),
    COALESCE(p_created_at, NOW())
  )
  ON CONFLICT (id) DO UPDATE SET
    date = EXCLUDED.date,
    merchant = EXCLUDED.merchant,
    amount = EXCLUDED.amount,
    type = EXCLUDED.type,
    category = EXCLUDED.category,
    account = EXCLUDED.account,
    tags = EXCLUDED.tags;
END;
$$;

-- Procedure 7: Update Relational Financial Transaction
CREATE OR REPLACE FUNCTION public.sp_update_wealthpulse_transaction(
  p_id VARCHAR(50),
  p_merchant VARCHAR(255),
  p_amount NUMERIC(15, 2),
  p_type VARCHAR(50),
  p_date VARCHAR(50),
  p_category VARCHAR(100),
  p_account VARCHAR(100),
  p_tags JSONB DEFAULT '[]'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.wealthpulse_transactions
  SET merchant = p_merchant,
      amount = p_amount,
      type = p_type,
      date = p_date,
      category = p_category,
      account = p_account,
      tags = COALESCE(p_tags, '[]'::jsonb)
  WHERE id = p_id;
END;
$$;

-- Grant Execution Permissions to Postgres & Anon Roles
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
