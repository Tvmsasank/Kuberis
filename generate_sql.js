import fs from 'fs';

const raw = JSON.parse(fs.readFileSync('./data/db.json', 'utf-8'));
const jsonEscaped = JSON.stringify(raw).replace(/'/g, "''");

const sql = `-- ==========================================================
-- ⚡ Kuberis Complete Supabase Schema & Data Migration
-- ==========================================================

-- 1. Create Core Key-Value Store Table (Used by Node.js Backend)
CREATE TABLE IF NOT EXISTS public.wealthpulse_store (
  id VARCHAR(50) PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Visual Relational Tables (For Viewing & Managing Directly in Supabase Dashboard)
CREATE TABLE IF NOT EXISTS public.wealthpulse_users (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  mpin_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.wealthpulse_transactions (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100),
  date DATE NOT NULL,
  merchant VARCHAR(255) NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  type VARCHAR(50) NOT NULL,
  category VARCHAR(100) NOT NULL,
  account VARCHAR(100) NOT NULL,
  tags TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.wealthpulse_investments (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  symbol VARCHAR(100),
  type VARCHAR(50) NOT NULL,
  quantity NUMERIC(15, 4) NOT NULL,
  buy_price NUMERIC(15, 2) NOT NULL,
  current_price NUMERIC(15, 2),
  current_valuation NUMERIC(15, 2),
  unrealized_pnl NUMERIC(15, 2),
  pnl_percentage NUMERIC(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Seed Existing Local Database Data directly into Supabase Store
INSERT INTO public.wealthpulse_store (id, data, updated_at)
VALUES ('main_store', '${jsonEscaped}'::jsonb, NOW())
ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();

-- 4. Enable Row Level Security (RLS) & Grant Full Access to Service
ALTER TABLE public.wealthpulse_store ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full service access to wealthpulse_store" ON public.wealthpulse_store FOR ALL USING (true) WITH CHECK (true);
`;

fs.writeFileSync('./supabase_schema_and_data.sql', sql, 'utf-8');
console.log('Successfully generated supabase_schema_and_data.sql!');
