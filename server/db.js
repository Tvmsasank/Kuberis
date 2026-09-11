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
    name: 'WealthPulse Financial Inbox',
    id: 'folder-wealthpulse-inbox-01',
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
  userSettings: {} // userId -> settings object
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
    if (err.code === '42883' || err.message.includes('function') || err.message.includes('does not exist')) {
      await pgPool.query(fallbackQuery, fallbackParams).catch(e => console.error('[Supabase PostgreSQL] Fallback query error:', e.message));
    } else {
      console.error('[Supabase PostgreSQL] Stored Procedure execution error:', err.message);
    }
  }
}

function syncRelationalTables(db) {
  if (!pgPool || !db) return;

  // 1. Sync Users to public.wealthpulse_users
  if (Array.isArray(db.users)) {
    for (const u of db.users) {
      if (!u || !u.id) continue;
      executeProcedureOrQuery(
        'SELECT public.sp_upsert_wealthpulse_user($1, $2, $3, $4, $5, $6)',
        [u.id, u.name || '', u.email || '', u.passwordHash || null, u.mpinHash || null, u.createdAt || new Date().toISOString()],
        `INSERT INTO public.wealthpulse_users (id, name, email, password_hash, mpin_hash, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           email = EXCLUDED.email,
           password_hash = EXCLUDED.password_hash,
           mpin_hash = EXCLUDED.mpin_hash`,
        [u.id, u.name || '', u.email || '', u.passwordHash || null, u.mpinHash || null, u.createdAt || new Date().toISOString()]
      );
    }
  }

  // 2. Sync Transactions to public.wealthpulse_transactions
  if (Array.isArray(db.transactions)) {
    for (const tx of db.transactions) {
      if (!tx || !tx.id) continue;
      const userId = tx.userId || tx.user_id || null;
      const tagsJson = typeof tx.tags === 'string' ? tx.tags : JSON.stringify(Array.isArray(tx.tags) ? tx.tags : []);
      const createdAt = tx.createdAt || tx.created_at || new Date().toISOString();
      const dateVal = (tx.date && String(tx.date).trim()) ? String(tx.date).trim() : null;

      executeProcedureOrQuery(
        'SELECT public.sp_upsert_wealthpulse_transaction($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)',
        [tx.id, userId, dateVal, tx.merchant || '', Number(tx.amount) || 0, tx.type || 'expense', tx.category || 'Other', tx.account || 'Main Checking', tagsJson, createdAt],
        `INSERT INTO public.wealthpulse_transactions (id, user_id, date, merchant, amount, type, category, account, tags, created_at)
         VALUES ($1, $2, NULLIF($3, '')::date, $4, $5, $6, $7, $8, $9::jsonb, $10)
         ON CONFLICT (id) DO UPDATE SET date = NULLIF($3, '')::date, merchant = $4, amount = $5, type = $6, category = $7, account = $8, tags = $9::jsonb`,
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
      executeProcedureOrQuery(
        'SELECT public.sp_upsert_wealthpulse_user($1, $2, $3, $4, NULL, $5)',
        [newUser.id, newUser.name, newUser.email, newUser.passwordHash, newUser.createdAt],
        'INSERT INTO public.wealthpulse_users (id, name, email, password_hash, created_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
        [newUser.id, newUser.name, newUser.email, newUser.passwordHash, newUser.createdAt]
      );
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
      twoFactorEnabled: !!user.twoFactorEnabled
    };
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
    saveDb();
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
    return true;
  },

  verifyWebAuthnCredential({ email, credentialId }) {
    const db = loadDb();
    const cleanEmail = (email || '').trim().toLowerCase();
    const user = db.users.find(u => 
      (cleanEmail && u.email === cleanEmail) || 
      (credentialId && u.webauthnCredentialId === credentialId)
    );
    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      hasMpin: !!user.mpinHash,
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

    return true;
  },

  getUserSettings(userId) {
    if (!userId) return getInitialUserSettings();
    const db = loadDb();
    if (!db.userSettings[userId]) {
      db.userSettings[userId] = getInitialUserSettings();
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
    const newTx = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      userId,
      date: transaction.date || new Date().toISOString().split('T')[0],
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
        'SELECT public.sp_upsert_wealthpulse_transaction($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [newTx.id, newTx.userId, newTx.date, newTx.merchant, newTx.amount, newTx.type, newTx.category, newTx.account, JSON.stringify(newTx.tags), newTx.createdAt],
        `INSERT INTO public.wealthpulse_transactions (id, user_id, date, merchant, amount, type, category, account, tags, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET date = $3, merchant = $4, amount = $5, type = $6, category = $7, account = $8, tags = $9`,
        [newTx.id, newTx.userId, newTx.date, newTx.merchant, newTx.amount, newTx.type, newTx.category, newTx.account, JSON.stringify(newTx.tags), newTx.createdAt]
      );
    }

    return newTx;
  },

  updateTransaction(userId, id, updates) {
    const db = loadDb();
    const index = (db.transactions || []).findIndex(t => t.id === id && (t.userId === userId || !t.userId));
    if (index === -1) throw new Error('Transaction not found');

    db.transactions[index] = {
      ...db.transactions[index],
      ...updates,
      amount: updates.amount !== undefined ? Number(updates.amount) : db.transactions[index].amount,
      updatedAt: new Date().toISOString()
    };
    saveDb();

    if (pgPool) {
      const tx = db.transactions[index];
      executeProcedureOrQuery(
        'SELECT public.sp_update_wealthpulse_transaction($1, $2, $3, $4, $5, $6, $7, $8)',
        [tx.id, tx.merchant, tx.amount, tx.type, tx.date, tx.category, tx.account, JSON.stringify(tx.tags)],
        `UPDATE public.wealthpulse_transactions
         SET merchant = $1, amount = $2, type = $3, date = $4, category = $5, account = $6, tags = $7
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
  }
};
