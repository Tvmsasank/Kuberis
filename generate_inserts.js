import fs from 'fs';

const raw = JSON.parse(fs.readFileSync('./data/db.json', 'utf-8'));
let sql = `-- ==========================================================
-- ⚡ Kuberis: Insert All Initial Data into Supabase Tables
-- ==========================================================

-- 1. Insert Users
`;

for (const u of raw.users) {
  const mpinVal = u.mpinHash ? `'${u.mpinHash}'` : 'NULL';
  sql += `INSERT INTO public.wealthpulse_users (id, name, email, password_hash, mpin_hash, created_at)
VALUES ('${u.id}', '${u.name.replace(/'/g, "''")}', '${u.email}', '${u.passwordHash}', ${mpinVal}, '${u.createdAt}')
ON CONFLICT (id) DO NOTHING;\n`;
}

sql += `\n-- 2. Insert Transactions\n`;
for (const t of raw.transactions) {
  const tagsVal = typeof t.tags === 'string' ? t.tags.replace(/'/g, "''") : JSON.stringify(t.tags || []);
  sql += `INSERT INTO public.wealthpulse_transactions (id, user_id, date, merchant, amount, type, category, account, tags, created_at)
VALUES ('${t.id}', '${t.userId}', '${t.date}', '${t.merchant.replace(/'/g, "''")}', ${t.amount}, '${t.type}', '${t.category}', '${t.account}', '${tagsVal}', '${t.createdAt}')
ON CONFLICT (id) DO NOTHING;\n`;
}

sql += `\n-- 3. Insert Stock & Mutual Fund Investments\n`;
for (const i of raw.investments) {
  sql += `INSERT INTO public.wealthpulse_investments (id, user_id, name, symbol, type, quantity, buy_price, current_price, current_valuation, unrealized_pnl, pnl_percentage, created_at)
VALUES ('${i.id}', '${i.userId}', '${i.name.replace(/'/g, "''")}', '${i.symbol}', '${i.type}', ${i.quantity}, ${i.buyPrice}, ${i.currentPrice || i.buyPrice}, ${i.currentValuation || 0}, ${i.unrealizedPnL || 0}, ${i.pnlPercentage || 0}, '${i.createdAt}')
ON CONFLICT (id) DO NOTHING;\n`;
}

fs.writeFileSync('./insert_all_data.sql', sql, 'utf-8');
console.log('insert_all_data.sql generated successfully!');
