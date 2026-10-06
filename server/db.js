import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const R2_DIR = path.join(__dirname, '..', 'storage', 'r2');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(R2_DIR)) {
  fs.mkdirSync(R2_DIR, { recursive: true });
}

// Starter configurations (Lookup definitions only, zero financial records)
const STARTER_CATEGORIES = [
  'Housing', 'Groceries', 'Shopping', 'Dining', 'Transportation',
  'Utilities', 'Subscriptions', 'Insurance', 'Health', 'Entertainment',
  'Income', 'Needs review', 'Other'
];

const STARTER_ACCOUNTS = [
  'Main Checking', 'Everyday Visa', 'Rewards Card', 'Cash'
];

const getInitialUserSettings = () => ({
  categories: STARTER_CATEGORIES,
  accounts: STARTER_ACCOUNTS,
  goals: [],
  budgets: [],
  subscriptions: [],
  recurring: [],
  dismissedPatterns: [],
  assets: 0,
  liabilities: 0,
  netWorthConfigured: false,
  selectedPeriod: 'all-time',
  driveFolder: {
    name: 'Kuberis Financial Inbox',
    id: 'folder-kuberis-inbox-01',
    url: 'https://drive.google.com/drive/my-drive'
  },
  driveSync: {
    schedule: '08:00 AM Daily',
    timezone: 'Asia/Kolkata',
    lastSyncedAt: null,
    lastStatus: 'idle',
    lastImportedCount: 0,
    lastDuplicateCount: 0,
    lastReviewCount: 0,
    errors: []
  },
  processedDriveFileIds: [],
  driveResetAt: null,
  freshStart: true
});

const getInitialDb = () => ({
  users: [],
  transactions: [],
  tags: [],
  rules: [],
  documents: [],
  settings: getInitialUserSettings(),
  userSettings: {}, // userId -> settings object
  auditLogs: [], // Security event history
  refreshTokens: [] // Active rotating refresh tokens
});

let memoryDb = null;
let pgPool = null;

// Initialize Supabase PostgreSQL Cloud Sync if DATABASE_URL is set
if (process.env.DATABASE_URL) {
  try {
    let connectionString = process.env.DATABASE_URL.trim();

    // Auto-fix: Convert IPv6 Direct Connection (port 5432) to IPv4 Pooler (port 6543) for cloud platforms like Render
    if (connectionString.includes('db.') && connectionString.includes('.supabase.co:5432')) {
      const match = connectionString.match(/db\.([a-z0-9]+)\.supabase\.co:5432/);
      if (match && match[1]) {
        const projectRef = match[1];
        if (!connectionString.includes(`postgres.${projectRef}:`)) {
          connectionString = connectionString.replace(`postgres:`, `postgres.${projectRef}:`);
        }
        connectionString = connectionString.replace(`db.${projectRef}.supabase.co:5432`, `aws-0-ap-south-1.pooler.supabase.com:6543`);
        console.log('[Supabase PostgreSQL] Auto-optimized connection string to IPv4 Transaction Pooler (port 6543)!');
      }
    }

    // Strip any sslmode query params so pg uses explicit rejectUnauthorized: false
    connectionString = connectionString.replace(/[?&]sslmode=[^&]+/g, '');

    pgPool = new pg.Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    });

    pgPool.query(`
      CREATE TABLE IF NOT EXISTS public.wealthpulse_store (
        id VARCHAR(50) PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS public.wealthpulse_users (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        password_hash VARCHAR(255),
        mpin_hash VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS public.wealthpulse_audit_logs (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        ip_address VARCHAR(100),
        user_agent TEXT,
        status VARCHAR(50) DEFAULT 'success',
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS public.wealthpulse_refresh_tokens (
        token_hash VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        session_id VARCHAR(100),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        revoked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Schema upgrades for WebAuthn Biometrics and Device Security Tracking
      ALTER TABLE public.wealthpulse_users ADD COLUMN IF NOT EXISTS webauthn_credential_id TEXT;
      ALTER TABLE public.wealthpulse_users ADD COLUMN IF NOT EXISTS webauthn_public_key TEXT;
      ALTER TABLE public.wealthpulse_audit_logs ADD COLUMN IF NOT EXISTS device_id VARCHAR(100);
      ALTER TABLE public.wealthpulse_audit_logs ADD COLUMN IF NOT EXISTS device_name VARCHAR(255);
      ALTER TABLE public.wealthpulse_audit_logs ADD COLUMN IF NOT EXISTS location VARCHAR(255);

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
        -- First update any existing user matching by email or id
        UPDATE public.wealthpulse_users
        SET
          id = p_id,
          name = COALESCE(NULLIF(p_name, ''), name),
          email = p_email,
          password_hash = COALESCE(p_password_hash, password_hash),
          mpin_hash = COALESCE(p_mpin_hash, mpin_hash)
        WHERE LOWER(email) = LOWER(p_email) OR id = p_id;

        -- If no existing row found, insert brand new user
        IF NOT FOUND THEN
          INSERT INTO public.wealthpulse_users (id, name, email, password_hash, mpin_hash, created_at)
          VALUES (p_id, p_name, p_email, p_password_hash, p_mpin_hash, p_created_at)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            password_hash = COALESCE(EXCLUDED.password_hash, public.wealthpulse_users.password_hash),
            mpin_hash = COALESCE(EXCLUDED.mpin_hash, public.wealthpulse_users.mpin_hash);
        END IF;
      EXCEPTION WHEN unique_violation THEN
        -- Handle concurrent insertion or unique email race gracefully
        UPDATE public.wealthpulse_users
        SET
          id = p_id,
          name = COALESCE(NULLIF(p_name, ''), name),
          password_hash = COALESCE(p_password_hash, password_hash),
          mpin_hash = COALESCE(p_mpin_hash, mpin_hash)
        WHERE LOWER(email) = LOWER(p_email) OR id = p_id;
      END;
      $$ LANGUAGE plpgsql;
    `).then(async () => {
      console.log('[Supabase PostgreSQL] Connected & table initialized successfully!');
      try {
        const res = await pgPool.query('SELECT data FROM public.wealthpulse_store WHERE id = $1', ['main_store']);
        if (res.rows.length > 0 && res.rows[0].data) {
          memoryDb = res.rows[0].data;
          fs.writeFileSync(DB_FILE, JSON.stringify(memoryDb, null, 2), 'utf-8');
          console.log('[Supabase PostgreSQL] Loaded live cloud data into memory!');
          syncRelationalTables(memoryDb);
        } else {
          const current = loadDb();
          await pgPool.query(
            'INSERT INTO public.wealthpulse_store (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()',
            ['main_store', JSON.stringify(current)]
          );
          syncRelationalTables(current);
          console.log('[Supabase PostgreSQL] Seeded local database to Supabase cloud!');
        }
      } catch (e) {
        console.error('[Supabase PostgreSQL] Cloud sync error:', e.message);
      }
    }).catch(err => {
      console.error('[Supabase PostgreSQL] Connection error:', err.message);
    });
  } catch (err) {
    console.error('[Supabase PostgreSQL] Pool init error:', err.message);
  }
}

// Helper: Securely execute Stored Procedure with automatic fallback
async function executeProcedureOrQuery(spQuery, spParams, fallbackQuery, fallbackParams) {
  if (!pgPool) return;
  try {
    await pgPool.query(spQuery, spParams);
  } catch (err) {
    if (err.code === '42883' || err.message.includes('function') || err.message.includes('does not exist') || err.code === '23505' || err.message.includes('unique constraint')) {
      if (fallbackQuery) {
        await pgPool.query(fallbackQuery, fallbackParams).catch(e => {
          if (e.code !== '23505' && !e.message.includes('unique constraint')) {
            console.error('[Supabase PostgreSQL] Fallback query error:', e.message);
          }
        });
      }
    } else {
      console.error('[Supabase PostgreSQL] Stored Procedure execution error:', err.message);
    }
  }
}

async function upsertUserToPostgres(u) {
  if (!pgPool || !u || !u.id) return;
  const name = u.name || '';
  const email = (u.email || '').trim().toLowerCase();
  const passwordHash = u.passwordHash || null;
  const mpinHash = u.mpinHash || null;
  const createdAt = u.createdAt || new Date().toISOString();

  try {
    await pgPool.query(
      'SELECT public.sp_upsert_wealthpulse_user($1, $2, $3, $4, $5, $6)',
      [u.id, name, email, passwordHash, mpinHash, createdAt]
    );
  } catch (err) {
    try {
      const updateRes = await pgPool.query(
        `UPDATE public.wealthpulse_users
         SET id = $1, name = $2, password_hash = COALESCE($4, password_hash), mpin_hash = COALESCE($5, mpin_hash)
         WHERE LOWER(email) = LOWER($3) OR id = $1`,
        [u.id, name, email, passwordHash, mpinHash]
      );
      if (updateRes.rowCount === 0) {
        await pgPool.query(
          `INSERT INTO public.wealthpulse_users (id, name, email, password_hash, mpin_hash, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             email = EXCLUDED.email,
             password_hash = COALESCE(EXCLUDED.password_hash, public.wealthpulse_users.password_hash),
             mpin_hash = COALESCE(EXCLUDED.mpin_hash, public.wealthpulse_users.mpin_hash)`,
          [u.id, name, email, passwordHash, mpinHash, createdAt]
        );
      }
    } catch (fallbackErr) {
      if (fallbackErr.code !== '23505' && !fallbackErr.message.includes('unique constraint')) {
        console.warn('[Supabase PostgreSQL] Safe user upsert notice:', fallbackErr.message);
      }
    }
  }
}

function syncRelationalTables(db) {
  if (!pgPool || !db) return;

  // 1. Sync Users to public.wealthpulse_users
  if (Array.isArray(db.users)) {
    for (const u of db.users) {
      if (!u || !u.id) continue;
      upsertUserToPostgres(u);
    }
  }

  // 2. Sync Transactions to public.wealthpulse_transactions
  if (Array.isArray(db.transactions)) {
    for (const tx of db.transactions) {
      if (!tx || !tx.id) continue;
      const userId = tx.userId || tx.user_id || null;
      const tagsJson = typeof tx.tags === 'string' ? tx.tags : JSON.stringify(Array.isArray(tx.tags) ? tx.tags : []);
      const createdAt = tx.createdAt || tx.created_at || new Date().toISOString();
      const rawDate = (tx.date && String(tx.date).trim()) ? String(tx.date).trim() : null;
      const dateVal = (rawDate && !isNaN(Date.parse(rawDate))) ? rawDate : new Date().toISOString().split('T')[0];

      executeProcedureOrQuery(
        'SELECT public.sp_upsert_wealthpulse_transaction($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)',
        [tx.id, userId, dateVal, tx.merchant || '', Number(tx.amount) || 0, tx.type || 'expense', tx.category || 'Other', tx.account || 'Main Checking', tagsJson, createdAt],
        `INSERT INTO public.wealthpulse_transactions (id, user_id, date, merchant, amount, type, category, account, tags, created_at)
         VALUES ($1, $2, COALESCE(NULLIF($3, '')::date, CURRENT_DATE), $4, $5, $6, $7, $8, $9::jsonb, $10)
         ON CONFLICT (id) DO UPDATE SET date = COALESCE(NULLIF($3, '')::date, CURRENT_DATE), merchant = $4, amount = $5, type = $6, category = $7, account = $8, tags = $9::jsonb`,
        [tx.id, userId, dateVal, tx.merchant || '', Number(tx.amount) || 0, tx.type || 'expense', tx.category || 'Other', tx.account || 'Main Checking', tagsJson, createdAt]
      );
    }
  }
}

function loadDb() {
  if (memoryDb) return memoryDb;
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      memoryDb = JSON.parse(raw);
      if (!memoryDb.users) memoryDb.users = [];
      if (!memoryDb.userSettings) memoryDb.userSettings = {};
      if (!memoryDb.investments) memoryDb.investments = [];
      if (!memoryDb.transactions) memoryDb.transactions = [];
      if (!memoryDb.auditLogs) memoryDb.auditLogs = [];
      if (!memoryDb.refreshTokens) memoryDb.refreshTokens = [];
    } catch (e) {
      console.error('Failed to parse database file, reinitializing', e);
      memoryDb = getInitialDb();
      saveDb();
    }
  } else {
    memoryDb = getInitialDb();
    saveDb();
  }
  return memoryDb;
}

function saveDb() {
  if (!memoryDb) return;
  fs.writeFileSync(DB_FILE, JSON.stringify(memoryDb, null, 2), 'utf-8');
  if (pgPool) {
    executeProcedureOrQuery(
      'SELECT public.sp_upsert_wealthpulse_store($1, $2)',
      ['main_store', memoryDb],
      'INSERT INTO public.wealthpulse_store (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()',
      ['main_store', JSON.stringify(memoryDb)]
    );

    syncRelationalTables(memoryDb);
  }
}

export const dbEngine = {
  getRawDb() {
    return loadDb();
  },

  saveRawDb(newDb) {
    memoryDb = newDb;
    saveDb();
  },

  createUser(args) {
    return this.registerUser(args);
  },

  registerUser({ name, email, password }) {
    const db = loadDb();
    const cleanEmail = (email || '').trim().toLowerCase();
    const existing = db.users.find(u => u.email === cleanEmail);
    if (existing) {
      throw new Error('An account with this email already exists');
    }

    const userId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const passwordHash = bcrypt.hashSync(password, 10);

    const newUser = {
      id: userId,
      name: (name || cleanEmail.split('@')[0]).trim(),
      email: cleanEmail,
      passwordHash,
      createdAt: new Date().toISOString(),
      resetToken: null,
      resetTokenExpiry: null
    };

    db.users.push(newUser);
    db.userSettings[userId] = getInitialUserSettings();
    saveDb();

    if (pgPool) {
      upsertUserToPostgres(newUser);
    }

    return {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      hasMpin: false,
      createdAt: newUser.createdAt
    };
  },

  verifyUserCredentials({ email, password }) {
    const db = loadDb();
    const cleanEmail = (email || '').trim().toLowerCase();
    const user = db.users.find(u => u.email === cleanEmail);
    if (!user) return null;

    const isValid = bcrypt.compareSync(password, user.passwordHash);
    if (!isValid) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      hasMpin: !!user.mpinHash,
      twoFactorEnabled: !!user.twoFactorEnabled,
      createdAt: user.createdAt
    };
  },

  getUserByEmail(email) {
    const db = loadDb();
    const cleanEmail = (email || '').trim().toLowerCase();
    return db.users.find(u => u.email === cleanEmail) || null;
  },

  getUserById(userId) {
    const db = loadDb();
    const user = db.users.find(u => u.id === userId);
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      hasMpin: !!user.mpinHash,
      hasBiometrics: !!user.webauthnCredentialId,
      twoFactorEnabled: !!user.twoFactorEnabled,
      activeSessionId: user.activeSessionId || null
    };
  },

  setUserActiveSession(userId, sessionId) {
    const db = loadDb();
    const user = db.users.find(u => u.id === userId);
    if (!user) return false;
    user.activeSessionId = sessionId;
    saveDb();
    return true;
  },

  getUserActiveSession(userId) {
    const db = loadDb();
    const user = db.users.find(u => u.id === userId);
    return user ? user.activeSessionId || null : null;
  },

  clearUserActiveSession(userId) {
    const db = loadDb();
    const user = db.users.find(u => u.id === userId);
    if (user) {
      user.activeSessionId = null;
      saveDb();
    }
    return true;
  },

  setTempTwoFactorSecret(userId, tempSecret) {
    const db = loadDb();
    const user = db.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');
    user.twoFactorTempSecret = tempSecret;
    saveDb();
    return true;
  },

  enableTwoFactor(userId, secret, recoveryCodes) {
    const db = loadDb();
    const user = db.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');
    user.twoFactorSecret = secret;
    user.twoFactorRecoveryCodes = recoveryCodes;
    user.twoFactorEnabled = true;
    user.twoFactorTempSecret = null;
    saveDb();
    return true;
  },

  disableTwoFactor(userId) {
    const db = loadDb();
    const user = db.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');
    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.twoFactorTempSecret = null;
    user.twoFactorRecoveryCodes = [];
    saveDb();
    return true;
  },

  getUserTwoFactorSecret(userId) {
    const db = loadDb();
    const user = db.users.find(u => u.id === userId);
    if (!user) return null;
    return {
      secret: user.twoFactorSecret,
      tempSecret: user.twoFactorTempSecret,
      enabled: !!user.twoFactorEnabled,
      recoveryCodes: user.twoFactorRecoveryCodes || []
    };
  },

  useRecoveryCode(userId, code) {
    const db = loadDb();
    const user = db.users.find(u => u.id === userId);
    if (!user || !user.twoFactorRecoveryCodes) return false;

    const cleanCode = (code || '').trim();
    const idx = user.twoFactorRecoveryCodes.findIndex(c => c.trim() === cleanCode);
    if (idx !== -1) {
      user.twoFactorRecoveryCodes.splice(idx, 1);
      saveDb();
      return true;
    }
    return false;
  },

  deleteUserAccount(userId) {
    const db = loadDb();
    db.users = (db.users || []).filter(u => u.id !== userId);
    if (db.userSettings) delete db.userSettings[userId];
    if (db.transactions) delete db.transactions[userId];
    if (db.investments) delete db.investments[userId];
    if (db.rules) delete db.rules[userId];
    if (db.documents) delete db.documents[userId];
    if (db.budgets) delete db.budgets[userId];
    if (db.goals) delete db.goals[userId];
    if (db.recurring) delete db.recurring[userId];
    if (db.subscriptions) delete db.subscriptions[userId];
    if (db.refreshTokens) db.refreshTokens = db.refreshTokens.filter(t => t.userId !== userId);
    if (db.auditLogs) db.auditLogs = db.auditLogs.filter(l => l.user_id !== userId);
    saveDb();

    if (pgPool) {
      pgPool.query('DELETE FROM public.wealthpulse_users WHERE id = $1', [userId]).catch(err => {
        console.error('[Supabase PostgreSQL] Error deleting user from wealthpulse_users:', err.message);
      });
      pgPool.query('DELETE FROM public.wealthpulse_transactions WHERE user_id = $1', [userId]).catch(err => {
        console.error('[Supabase PostgreSQL] Error deleting transactions from wealthpulse_transactions:', err.message);
      });
      pgPool.query('DELETE FROM public.wealthpulse_refresh_tokens WHERE user_id = $1', [userId]).catch(err => {
        console.error('[Supabase PostgreSQL] Error deleting refresh tokens:', err.message);
      });
      pgPool.query('DELETE FROM public.wealthpulse_audit_logs WHERE user_id = $1', [userId]).catch(err => {
        console.error('[Supabase PostgreSQL] Error deleting audit logs:', err.message);
      });
    }
    return true;
  },

  setUserMpin({ userId, mpin }) {
    const db = loadDb();
    const user = db.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');

    if (!/^\d{4}$/.test(mpin)) {
      throw new Error('MPIN must be exactly 4 digits');
    }

    if (user.mpinHash && bcrypt.compareSync(mpin, user.mpinHash)) {
      throw new Error('New 4-digit MPIN cannot be the same as your previous MPIN. Please choose a different 4-digit MPIN.');
    }

    user.mpinHash = bcrypt.hashSync(mpin, 10);
    saveDb();

    if (pgPool) {
      executeProcedureOrQuery(
        'SELECT public.sp_update_user_mpin($1, NULL, $2)',
        [user.id, user.mpinHash],
        'UPDATE public.wealthpulse_users SET mpin_hash = $1 WHERE id = $2',
        [user.mpinHash, user.id]
      );
    }
    return true;
  },

  verifyUserMpin({ email, mpin }) {
    const db = loadDb();
    const cleanEmail = (email || '').trim().toLowerCase();
    const user = db.users.find(u => u.email === cleanEmail);
    if (!user || !user.mpinHash) return null;

    const isValid = bcrypt.compareSync(mpin, user.mpinHash);
    if (!isValid) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      hasMpin: true,
      createdAt: user.createdAt
    };
  },

  registerWebAuthnCredential({ userId, credentialId, publicKey }) {
    const db = loadDb();
    const user = db.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');

    user.webauthnCredentialId = credentialId;
    user.webauthnPublicKey = publicKey;
    saveDb();

    if (pgPool) {
      pgPool.query(
        'UPDATE public.wealthpulse_users SET webauthn_credential_id = $1, webauthn_public_key = $2 WHERE id = $3',
        [credentialId, publicKey, userId]
      ).catch(e => console.warn('[Supabase PostgreSQL] WebAuthn save notice:', e.message));
    }
    return true;
  },

  async verifyWebAuthnCredential({ email, credentialId }) {
    const db = loadDb();
    const cleanEmail = (email || '').trim().toLowerCase();
    let user = db.users.find(u => 
      (cleanEmail && u.email === cleanEmail) || 
      (credentialId && u.webauthnCredentialId === credentialId)
    );

    if (!user && pgPool) {
      try {
        const res = await pgPool.query(
          'SELECT id, name, email, password_hash, mpin_hash, webauthn_credential_id, created_at FROM public.wealthpulse_users WHERE (webauthn_credential_id = $1 OR LOWER(email) = LOWER($2)) LIMIT 1',
          [credentialId || '', cleanEmail || '']
        );
        if (res.rows && res.rows.length > 0) {
          const row = res.rows[0];
          user = {
            id: row.id,
            name: row.name,
            email: row.email,
            passwordHash: row.password_hash,
            mpinHash: row.mpin_hash,
            webauthnCredentialId: row.webauthn_credential_id,
            createdAt: row.created_at
          };
          const existingMem = db.users.find(u => u.id === user.id);
          if (existingMem) {
            existingMem.webauthnCredentialId = user.webauthnCredentialId;
          } else {
            db.users.push(user);
          }
          saveDb();
        }
      } catch (e) {
        console.warn('[Supabase PostgreSQL] WebAuthn verify query error:', e.message);
      }
    }

    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      hasMpin: !!user.mpinHash,
      hasBiometrics: !!user.webauthnCredentialId,
      createdAt: user.createdAt
    };
  },

  createPasswordResetToken(email) {
    const db = loadDb();
    const cleanEmail = (email || '').trim().toLowerCase();
    const user = db.users.find(u => u.email === cleanEmail);
    if (!user) throw new Error('No user found with this email address');

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
    saveDb();

    return { resetToken, email: cleanEmail };
  },

  resetPassword({ resetToken, newPassword }) {
    const db = loadDb();
    const user = db.users.find(u => u.resetToken === resetToken && u.resetTokenExpiry > Date.now());
    if (!user) throw new Error('Invalid or expired password reset link');

    if (user.passwordHash && bcrypt.compareSync(newPassword, user.passwordHash)) {
      throw new Error('New password cannot be the same as your previous password. Please choose a different password.');
    }

    user.passwordHash = bcrypt.hashSync(newPassword, 10);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    saveDb();

    if (pgPool) {
      executeProcedureOrQuery(
        'SELECT public.sp_update_user_password($1, $2, $3)',
        [user.id, user.email, user.passwordHash],
        'UPDATE public.wealthpulse_users SET password_hash = $1 WHERE id = $2 OR LOWER(email) = LOWER($3)',
        [user.passwordHash, user.id, user.email]
      );
    }

    return user;
  },

  changePassword({ userId, currentPassword, newPassword }) {
    const db = loadDb();
    const user = db.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');

    if (!user.passwordHash || !bcrypt.compareSync(currentPassword, user.passwordHash)) {
      throw new Error('Incorrect current password. Please try again.');
    }

    if (!newPassword || newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters');
    }

    if (bcrypt.compareSync(newPassword, user.passwordHash)) {
      throw new Error('New password cannot be the same as your current password. Please choose a different password.');
    }

    user.passwordHash = bcrypt.hashSync(newPassword, 10);
    saveDb();

    if (pgPool) {
      executeProcedureOrQuery(
        'SELECT public.sp_update_user_password($1, $2, $3)',
        [user.id, user.email, user.passwordHash],
        'UPDATE public.wealthpulse_users SET password_hash = $1 WHERE id = $2 OR LOWER(email) = LOWER($3)',
        [user.passwordHash, user.id, user.email]
      );
    }

    return true;
  },

  createMpinResetToken(email) {
    const db = loadDb();
    const cleanEmail = (email || '').trim().toLowerCase();
    const user = db.users.find(u => u.email === cleanEmail);
    if (!user) throw new Error('No user found with this email address');

    const resetMpinToken = crypto.randomBytes(32).toString('hex');
    user.resetMpinToken = resetMpinToken;
    user.resetMpinTokenExpiry = Date.now() + 3600000; // 1 hour
    saveDb();

    return { resetMpinToken, email: cleanEmail };
  },

  resetUserMpin({ resetMpinToken, newMpin }) {
    const db = loadDb();
    const user = db.users.find(u => u.resetMpinToken === resetMpinToken && u.resetMpinTokenExpiry > Date.now());
    if (!user) throw new Error('Invalid or expired MPIN reset link');

    if (!/^\d{4}$/.test(newMpin)) {
      throw new Error('MPIN must be exactly 4 digits');
    }

    if (user.mpinHash && bcrypt.compareSync(newMpin, user.mpinHash)) {
      throw new Error('New 4-digit MPIN cannot be the same as your previous MPIN. Please choose a different 4-digit MPIN.');
    }

    user.mpinHash = bcrypt.hashSync(newMpin, 10);
    user.resetMpinToken = null;
    user.resetMpinTokenExpiry = null;
    user.failedMpinAttempts = 0;
    saveDb();

    if (pgPool) {
      executeProcedureOrQuery(
        'SELECT public.sp_update_user_mpin($1, $2, $3)',
        [user.id, user.email, user.mpinHash],
        'UPDATE public.wealthpulse_users SET mpin_hash = $1 WHERE id = $2 OR LOWER(email) = LOWER($3)',
        [user.mpinHash, user.id, user.email]
      );
    }

    return user;
  },

  getUserSettings(userId) {
    if (!userId) return getInitialUserSettings();
    const db = loadDb();
    if (!db.userSettings[userId]) {
      db.userSettings[userId] = getInitialUserSettings();
      saveDb();
    }
    // Auto-migrate legacy brand names in stored userSettings
    if (db.userSettings[userId]?.driveFolder?.name && /ledgerly|wealthpulse/i.test(db.userSettings[userId].driveFolder.name)) {
      db.userSettings[userId].driveFolder.name = 'Kuberis Financial Inbox';
      saveDb();
    }
    return db.userSettings[userId];
  },

  updateUserSettings(userId, newSettings) {
    if (!userId) return getInitialUserSettings();
    const db = loadDb();
    const current = db.userSettings[userId] || getInitialUserSettings();
    db.userSettings[userId] = {
      ...current,
      ...newSettings
    };
    saveDb();
    return db.userSettings[userId];
  },

  getState(userId) {
    if (!userId) {
      return {
        transactions: [],
        investments: [],
        rules: [],
        documents: [],
        settings: getInitialUserSettings(),
        tags: []
      };
    }
    const transactions = this.getTransactions(userId);
    const investments = this.getInvestments(userId);
    const rules = this.getRules(userId);
    const documents = this.getDocuments(userId);
    const settings = this.getUserSettings(userId);
    const tags = Array.from(new Set(transactions.flatMap(t => Array.isArray(t.tags) ? t.tags : [])));

    return {
      transactions,
      investments,
      rules,
      documents,
      settings,
      tags
    };
  },

  getTransactions(userId) {
    if (!userId) return [];
    const db = loadDb();
    return (db.transactions || []).filter(t => t.userId === userId);
  },

  addTransactions(userId, payload) {
    if (!payload) return [];
    if (Array.isArray(payload)) {
      return payload.map(tx => this.addTransaction(userId, tx));
    }
    return this.addTransaction(userId, payload);
  },

  addTransaction(userId, transaction) {
    const db = loadDb();
    const rawTxDate = (transaction.date && String(transaction.date).trim()) ? String(transaction.date).trim() : null;
    const safeTxDate = (rawTxDate && !isNaN(Date.parse(rawTxDate))) ? rawTxDate : new Date().toISOString().split('T')[0];

    const newTx = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      userId,
      date: safeTxDate,
      merchant: transaction.merchant || 'Unknown Merchant',
      amount: Number(transaction.amount) || 0,
      category: transaction.category || 'Other',
      account: transaction.account || 'Main Checking',
      type: transaction.type || (Number(transaction.amount) >= 0 ? 'income' : 'expense'),
      tags: Array.isArray(transaction.tags) ? transaction.tags : [],
      source: transaction.source || 'Manual',
      flagged: !!transaction.flagged,
      receiptUrl: transaction.receiptUrl || null,
      createdAt: new Date().toISOString()
    };
    if (!db.transactions) db.transactions = [];
    db.transactions.unshift(newTx);
    saveDb();

    // Dual-sync to relational table if pgPool is connected
    if (pgPool) {
      executeProcedureOrQuery(
        'SELECT public.sp_upsert_wealthpulse_transaction($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)',
        [newTx.id, newTx.userId, newTx.date, newTx.merchant, newTx.amount, newTx.type, newTx.category, newTx.account, JSON.stringify(newTx.tags), newTx.createdAt],
        `INSERT INTO public.wealthpulse_transactions (id, user_id, date, merchant, amount, type, category, account, tags, created_at)
         VALUES ($1, $2, COALESCE(NULLIF($3, '')::date, CURRENT_DATE), $4, $5, $6, $7, $8, $9::jsonb, $10)
         ON CONFLICT (id) DO UPDATE SET date = COALESCE(NULLIF($3, '')::date, CURRENT_DATE), merchant = $4, amount = $5, type = $6, category = $7, account = $8, tags = $9::jsonb`,
        [newTx.id, newTx.userId, newTx.date, newTx.merchant, newTx.amount, newTx.type, newTx.category, newTx.account, JSON.stringify(newTx.tags), newTx.createdAt]
      );
    }

    return newTx;
  },

  updateTransaction(userId, id, updates) {
    const db = loadDb();
    const index = (db.transactions || []).findIndex(t => t.id === id && (t.userId === userId || !t.userId));
    if (index === -1) throw new Error('Transaction not found');

    const updatedRawDate = updates.date ? String(updates.date).trim() : db.transactions[index].date;
    const safeUpdatedDate = (updatedRawDate && !isNaN(Date.parse(updatedRawDate))) ? updatedRawDate : new Date().toISOString().split('T')[0];

    db.transactions[index] = {
      ...db.transactions[index],
      ...updates,
      date: safeUpdatedDate,
      amount: updates.amount !== undefined ? Number(updates.amount) : db.transactions[index].amount,
      updatedAt: new Date().toISOString()
    };
    saveDb();

    if (pgPool) {
      const tx = db.transactions[index];
      executeProcedureOrQuery(
        'SELECT public.sp_update_wealthpulse_transaction($1, $2, $3, $4, $5, $6, $7, $8::jsonb)',
        [tx.id, tx.merchant, tx.amount, tx.type, tx.date, tx.category, tx.account, JSON.stringify(tx.tags)],
        `UPDATE public.wealthpulse_transactions
         SET merchant = $1, amount = $2, type = $3, date = COALESCE(NULLIF($4, '')::date, CURRENT_DATE), category = $5, account = $6, tags = $7::jsonb
         WHERE id = $8`,
        [tx.merchant, tx.amount, tx.type, tx.date, tx.category, tx.account, JSON.stringify(tx.tags), tx.id]
      );
    }

    return db.transactions[index];
  },

  deleteTransaction(userId, id) {
    const db = loadDb();
    const initialLength = (db.transactions || []).length;
    db.transactions = (db.transactions || []).filter(t => !(t.id === id && (t.userId === userId || !t.userId)));
    if (db.transactions.length === initialLength) throw new Error('Transaction not found');
    saveDb();

    if (pgPool) {
      pgPool.query('DELETE FROM public.wealthpulse_transactions WHERE id = $1', [id])
        .catch(e => console.error('[Supabase PostgreSQL] Relational Tx delete error:', e.message));
    }

    return true;
  },

  getInvestments(userId) {
    if (!userId) return [];
    const db = loadDb();
    return (db.investments || []).filter(i => i.userId === userId);
  },

  saveInvestments(userId, updatedList) {
    const db = loadDb();
    if (!db.investments) db.investments = [];
    const otherUsersInv = db.investments.filter(i => i.userId && i.userId !== userId);
    db.investments = [
      ...otherUsersInv,
      ...updatedList.map(item => ({ ...item, userId }))
    ];
    saveDb();
    return db.investments;
  },

  addInvestment(userId, item) {
    const db = loadDb();
    const newInv = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      userId,
      name: item.name || 'New Holding',
      symbol: item.symbol || '',
      type: item.type || 'stock',
      quantity: Number(item.quantity) || 1,
      buyPrice: Number(item.buyPrice) || 0,
      currentPrice: Number(item.currentPrice || item.buyPrice) || 0,
      currentValuation: Number(item.currentValuation) || 0,
      unrealizedPnL: Number(item.unrealizedPnL) || 0,
      pnlPercentage: Number(item.pnlPercentage) || 0,
      notes: item.notes || '',
      priceStatus: item.priceStatus || 'ok',
      createdAt: new Date().toISOString()
    };
    if (!db.investments) db.investments = [];
    db.investments.unshift(newInv);
    saveDb();

    if (pgPool) {
      pgPool.query(
        `INSERT INTO public.wealthpulse_investments (id, user_id, name, symbol, type, quantity, buy_price, current_price, current_valuation, unrealized_pnl, pnl_percentage, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE SET quantity = $6, buy_price = $7, current_price = $8, current_valuation = $9, unrealized_pnl = $10, pnl_percentage = $11`,
        [newInv.id, newInv.userId, newInv.name, newInv.symbol, newInv.type, newInv.quantity, newInv.buyPrice, newInv.currentPrice, newInv.currentValuation, newInv.unrealizedPnL, newInv.pnlPercentage, newInv.createdAt]
      ).catch(e => console.error('[Supabase PostgreSQL] Relational Inv sync error:', e.message));
    }

    return newInv;
  },

  updateInvestment(userId, id, updates) {
    const db = loadDb();
    const index = (db.investments || []).findIndex(i => i.id === id && i.userId === userId);
    if (index === -1) throw new Error('Investment not found');

    db.investments[index] = {
      ...db.investments[index],
      ...updates,
      quantity: updates.quantity !== undefined ? Number(updates.quantity) : db.investments[index].quantity,
      buyPrice: updates.buyPrice !== undefined ? Number(updates.buyPrice) : db.investments[index].buyPrice,
      currentPrice: updates.currentPrice !== undefined ? Number(updates.currentPrice) : db.investments[index].currentPrice,
      updatedAt: new Date().toISOString()
    };
    saveDb();

    if (pgPool) {
      const inv = db.investments[index];
      pgPool.query(
        `UPDATE public.wealthpulse_investments
         SET name = $1, symbol = $2, type = $3, quantity = $4, buy_price = $5, current_price = $6, current_valuation = $7, unrealized_pnl = $8, pnl_percentage = $9
         WHERE id = $10`,
        [inv.name, inv.symbol, inv.type, inv.quantity, inv.buyPrice, inv.currentPrice, inv.currentValuation, inv.unrealizedPnL, inv.pnlPercentage, inv.id]
      ).catch(e => console.error('[Supabase PostgreSQL] Relational Inv update error:', e.message));
    }

    return db.investments[index];
  },

  deleteInvestment(userId, id) {
    const db = loadDb();
    const initialLength = (db.investments || []).length;
    db.investments = (db.investments || []).filter(i => !(i.id === id && i.userId === userId));
    if (db.investments.length === initialLength) throw new Error('Investment not found');
    saveDb();

    if (pgPool) {
      pgPool.query('DELETE FROM public.wealthpulse_investments WHERE id = $1', [id])
        .catch(e => console.error('[Supabase PostgreSQL] Relational Inv delete error:', e.message));
    }

    return true;
  },

  getRules(userId) {
    if (!userId) return [];
    const db = loadDb();
    return (db.rules || []).filter(r => r.userId === userId);
  },

  addRule(userId, rule) {
    const db = loadDb();
    const newRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      userId,
      pattern: rule.pattern,
      category: rule.category,
      account: rule.account || null,
      createdAt: new Date().toISOString()
    };
    if (!db.rules) db.rules = [];
    db.rules.unshift(newRule);
    saveDb();
    return newRule;
  },

  deleteRule(userId, id) {
    const db = loadDb();
    const initialLength = (db.rules || []).length;
    db.rules = (db.rules || []).filter(r => !(r.id === id && r.userId === userId));
    if (db.rules.length === initialLength) throw new Error('Rule not found');
    saveDb();
    return true;
  },

  getDocuments(userId) {
    if (!userId) return [];
    const db = loadDb();
    return (db.documents || []).filter(d => d.userId === userId);
  },

  addDocument(userId, doc) {
    const db = loadDb();
    const newDoc = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      userId,
      name: doc.name || 'Untitled Document',
      filename: doc.filename,
      fileSize: doc.fileSize || 0,
      mimeType: doc.mimeType || 'application/octet-stream',
      uploadDate: new Date().toISOString().split('T')[0],
      source: doc.source || 'Manual Upload',
      driveFileId: doc.driveFileId || null,
      r2Path: doc.r2Path || null,
      createdAt: new Date().toISOString()
    };
    if (!db.documents) db.documents = [];
    db.documents.unshift(newDoc);
    saveDb();
    return newDoc;
  },

  deleteDocument(userId, id) {
    const db = loadDb();
    const initialLength = (db.documents || []).length;
    db.documents = (db.documents || []).filter(d => !(d.id === id && (d.userId === userId || !d.userId)));
    if (db.documents.length === initialLength) throw new Error('Document not found');
    saveDb();
    return true;
  },

  updatePreferences(userId, updates) {
    return this.updateUserSettings(userId, updates);
  },

  // RBI Account Aggregator Linked Banks
  getLinkedBankAccounts(userId) {
    const db = loadDb();
    return (db.linkedBankAccounts || []).filter(a => a.userId === userId);
  },

  saveLinkedBankAccount(userId, account) {
    const db = loadDb();
    if (!db.linkedBankAccounts) db.linkedBankAccounts = [];
    const existingIndex = db.linkedBankAccounts.findIndex(a => a.id === account.id || (a.userId === userId && a.bankCode === account.bankCode));
    if (existingIndex !== -1) {
      db.linkedBankAccounts[existingIndex] = { ...db.linkedBankAccounts[existingIndex], ...account };
    } else {
      db.linkedBankAccounts.unshift(account);
    }
    saveDb();
    return account;
  },

  unlinkBankAccount(userId, accountId) {
    const db = loadDb();
    if (!db.linkedBankAccounts) return false;
    db.linkedBankAccounts = db.linkedBankAccounts.filter(a => !(a.id === accountId && a.userId === userId));
    saveDb();
    return true;
  },

  updateLinkedBankAccountSync(userId, accountId, updates) {
    const db = loadDb();
    const acc = (db.linkedBankAccounts || []).find(a => a.id === accountId && a.userId === userId);
    if (acc) {
      Object.assign(acc, updates);
      saveDb();
    }
    return acc;
  },

  // Dual-Token Architecture: Rotating Refresh Token System
  createRefreshToken({ userId, sessionId, rememberMe = false }) {
    if (!userId) return null;
    const rawToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const durationMs = (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + durationMs).toISOString();

    const db = loadDb();
    if (!db.refreshTokens) db.refreshTokens = [];
    const tokenRecord = {
      tokenHash,
      userId,
      sessionId: sessionId || null,
      expiresAt,
      revoked: false,
      createdAt: new Date().toISOString()
    };
    db.refreshTokens.push(tokenRecord);
    saveDb();

    if (pgPool) {
      pgPool.query(
        `INSERT INTO public.wealthpulse_refresh_tokens (token_hash, user_id, session_id, expires_at, revoked, created_at)
         VALUES ($1, $2, $3, $4, FALSE, NOW())
         ON CONFLICT (token_hash) DO NOTHING`,
        [tokenHash, userId, sessionId || null, expiresAt]
      ).catch(e => console.warn('[Supabase PostgreSQL] Refresh token store notice:', e.message));
    }

    return rawToken;
  },

  async verifyAndRotateRefreshToken(rawRefreshToken) {
    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
      return { success: false, error: 'Refresh token is required' };
    }
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken.trim()).digest('hex');
    const db = loadDb();
    if (!db.refreshTokens) db.refreshTokens = [];

    let tokenRecord = db.refreshTokens.find(t => t.tokenHash === tokenHash);

    // If not found in memory, query PostgreSQL table
    if (!tokenRecord && pgPool) {
      try {
        const res = await pgPool.query(
          'SELECT token_hash, user_id, session_id, expires_at, revoked FROM public.wealthpulse_refresh_tokens WHERE token_hash = $1',
          [tokenHash]
        );
        if (res.rows.length > 0) {
          const row = res.rows[0];
          tokenRecord = {
            tokenHash: row.token_hash,
            userId: row.user_id,
            sessionId: row.session_id,
            expiresAt: row.expires_at,
            revoked: !!row.revoked
          };
        }
      } catch (e) {
        console.warn('[Supabase PostgreSQL] Token lookup error:', e.message);
      }
    }

    if (!tokenRecord) {
      return { success: false, error: 'Invalid refresh token' };
    }

    // Replay Attack Detection: If token was already revoked, revoke ALL user tokens (family revocation)
    if (tokenRecord.revoked) {
      this.revokeAllUserTokens(tokenRecord.userId);
      this.logSecurityEvent({
        userId: tokenRecord.userId,
        eventType: 'SUSPICIOUS_TOKEN_REUSE',
        status: 'danger',
        metadata: { reason: 'Revoked refresh token presented. All active sessions terminated.' }
      });
      return { success: false, error: 'Suspicious session reuse detected. Please log in again.' };
    }

    // Check expiration
    if (new Date(tokenRecord.expiresAt).getTime() < Date.now()) {
      tokenRecord.revoked = true;
      saveDb();
      return { success: false, error: 'Refresh token expired. Please sign in again.' };
    }

    const user = this.getUserById(tokenRecord.userId);
    if (!user) {
      return { success: false, error: 'User account not found' };
    }

    // Invalidate old token (one-time use rotation)
    tokenRecord.revoked = true;
    saveDb();

    if (pgPool) {
      pgPool.query(
        'UPDATE public.wealthpulse_refresh_tokens SET revoked = TRUE WHERE token_hash = $1',
        [tokenHash]
      ).catch(e => console.warn('[Supabase PostgreSQL] Revoke token notice:', e.message));
    }

    // Generate brand new rotating refresh token
    const newRefreshToken = this.createRefreshToken({
      userId: user.id,
      sessionId: tokenRecord.sessionId
    });

    return {
      success: true,
      user,
      sessionId: tokenRecord.sessionId,
      newRefreshToken
    };
  },

  revokeRefreshToken(rawRefreshToken) {
    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') return;
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken.trim()).digest('hex');
    const db = loadDb();
    if (db.refreshTokens) {
      const rec = db.refreshTokens.find(t => t.tokenHash === tokenHash);
      if (rec) rec.revoked = true;
      saveDb();
    }
    if (pgPool) {
      pgPool.query(
        'UPDATE public.wealthpulse_refresh_tokens SET revoked = TRUE WHERE token_hash = $1',
        [tokenHash]
      ).catch(e => console.warn('[Supabase PostgreSQL] Revoke token notice:', e.message));
    }
  },

  revokeAllUserTokens(userId) {
    if (!userId) return;
    const db = loadDb();
    if (db.refreshTokens) {
      for (const t of db.refreshTokens) {
        if (t.userId === userId) t.revoked = true;
      }
      saveDb();
    }
    if (pgPool) {
      pgPool.query(
        'UPDATE public.wealthpulse_refresh_tokens SET revoked = TRUE WHERE user_id = $1',
        [userId]
      ).catch(e => console.warn('[Supabase PostgreSQL] Revoke all notice:', e.message));
    }
  },

  // Security Audit Logging (Tamper-evident activity trail with instant commit)
  async logSecurityEvent({
    userId,
    eventType,
    ipAddress = '',
    userAgent = '',
    deviceId = '',
    deviceName = '',
    location = '',
    status = 'SUCCESS',
    metadata = {}
  }) {
    if (!userId || !eventType) return;
    const logId = `audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = new Date().toISOString();
    const event = {
      id: logId,
      user_id: userId,
      event_type: eventType,
      ip_address: ipAddress || 'Unknown',
      user_agent: (userAgent || '').substring(0, 255),
      device_id: deviceId || 'unknown_device',
      device_name: deviceName || 'Device',
      location: location || 'India - IN',
      status,
      metadata,
      created_at: timestamp
    };

    const db = loadDb();
    if (!db.auditLogs) db.auditLogs = [];
    db.auditLogs.unshift(event);
    if (db.auditLogs.length > 500) {
      db.auditLogs = db.auditLogs.slice(0, 500);
    }
    saveDb();

    if (pgPool) {
      try {
        await pgPool.query(
          `INSERT INTO public.wealthpulse_audit_logs (id, user_id, event_type, ip_address, user_agent, device_id, device_name, location, status, metadata, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
          [
            logId,
            userId,
            eventType,
            ipAddress || 'Unknown',
            (userAgent || '').substring(0, 255),
            deviceId || 'unknown_device',
            deviceName || 'Device',
            location || 'India - IN',
            status,
            JSON.stringify(metadata)
          ]
        );
      } catch (e) {
        try {
          await pgPool.query(
            `INSERT INTO public.wealthpulse_audit_logs (id, user_id, event_type, ip_address, user_agent, status, metadata, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
            [logId, userId, eventType, ipAddress || 'Unknown', (userAgent || '').substring(0, 255), status, JSON.stringify({ ...metadata, deviceId, deviceName, location })]
          );
        } catch (innerErr) {
          console.warn('[Supabase PostgreSQL] Audit log store notice:', innerErr.message);
        }
      }
    }
  },

  async getUserAuditLogs(userId, limit = 15) {
    if (!userId) return [];
    if (pgPool) {
      try {
        const res = await pgPool.query(
          `SELECT id, event_type, ip_address, user_agent, device_id, device_name, location, status, metadata, created_at
           FROM public.wealthpulse_audit_logs
           WHERE user_id = $1
           ORDER BY created_at DESC
           LIMIT $2`,
          [userId, limit]
        );
        if (res.rows && res.rows.length > 0) {
          return res.rows;
        }
      } catch (e) {
        try {
          const res = await pgPool.query(
            `SELECT id, event_type, ip_address, user_agent, status, metadata, created_at
             FROM public.wealthpulse_audit_logs
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT $2`,
            [userId, limit]
          );
          if (res.rows && res.rows.length > 0) {
            return res.rows;
          }
        } catch (err2) {
          console.warn('[Supabase PostgreSQL] Query audit logs notice:', err2.message);
        }
      }
    }

    const db = loadDb();
    const userLogs = (db.auditLogs || []).filter(l => l.user_id === userId);
    return userLogs.slice(0, limit);
  }
};
