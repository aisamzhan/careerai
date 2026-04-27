const { Pool } = require('pg');

let _pool = null;

function getPool() {
  if (_pool) return _pool;
  const url = String(process.env.DATABASE_URL || '').trim();
  if (!url) throw new Error('Missing env var: DATABASE_URL');

  _pool = new Pool({
    connectionString: url,
    // Render/Heroku-style Postgres typically requires SSL in production
    ssl:
      process.env.PGSSLMODE === 'disable'
        ? false
        : { rejectUnauthorized: false },
  });

  return _pool;
}

async function initAuthDb() {
  const pool = getPool();
  // Needed for gen_random_uuid() on many Postgres installs (including Render).
  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      university TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      plan_code TEXT NOT NULL,
      current_period_end TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions(user_id);`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount_kzt INT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'KZT',
      transaction_id TEXT NOT NULL,
      payer_account TEXT NOT NULL DEFAULT '',
      receipt_mime TEXT NOT NULL DEFAULT '',
      receipt_base64 TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  // Backfill columns on existing installs (idempotent).
  await pool.query(`ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS payer_account TEXT NOT NULL DEFAULT ''`);
  await pool.query(`ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS receipt_mime TEXT NOT NULL DEFAULT ''`);
  await pool.query(`ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS receipt_base64 TEXT NOT NULL DEFAULT ''`);
  await pool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS payment_requests_transaction_id_uniq ON payment_requests(transaction_id);`,
  );
  await pool.query(`CREATE INDEX IF NOT EXISTS payment_requests_user_id_idx ON payment_requests(user_id);`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_audit_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_email TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id UUID NOT NULL,
      meta_json TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS admin_audit_log_created_at_idx ON admin_audit_log(created_at);`);
}

async function findUserByEmail(email) {
  const pool = getPool();
  const res = await pool.query(
    `SELECT id, name, email, university, password_hash, created_at
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [email],
  );
  return res.rows[0] || null;
}

async function createUser({ name, email, university, passwordHash }) {
  const pool = getPool();
  const res = await pool.query(
    `INSERT INTO users (name, email, university, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, university, created_at`,
    [name, email, university, passwordHash],
  );
  return res.rows[0];
}

async function listUsers({ limit = 200 } = {}) {
  const pool = getPool();
  const safeLimit = Math.max(1, Math.min(1000, Number(limit) || 200));
  const res = await pool.query(
    `SELECT id, name, email, university, created_at
     FROM users
     ORDER BY created_at DESC
     LIMIT $1`,
    [safeLimit],
  );
  return res.rows || [];
}

async function getActiveSubscriptionByUserId(userId) {
  const pool = getPool();
  const res = await pool.query(
    `SELECT id, user_id, status, plan_code, current_period_end, created_at, updated_at
     FROM subscriptions
     WHERE user_id = $1
     ORDER BY updated_at DESC
     LIMIT 1`,
    [userId],
  );
  return res.rows[0] || null;
}

async function upsertSubscription({ userId, status, planCode, currentPeriodEndIso }) {
  const pool = getPool();
  // Keep a single "latest" row per user via delete+insert (simple MVP approach).
  await pool.query(`DELETE FROM subscriptions WHERE user_id = $1`, [userId]);
  const res = await pool.query(
    `INSERT INTO subscriptions (user_id, status, plan_code, current_period_end, updated_at)
     VALUES ($1, $2, $3, $4, now())
     RETURNING id, user_id, status, plan_code, current_period_end, created_at, updated_at`,
    [userId, status, planCode, currentPeriodEndIso],
  );
  return res.rows[0];
}

async function createPaymentRequest({
  userId,
  amountKzt,
  transactionId,
  payerAccount,
  receiptMime,
  receiptBase64,
  notes,
}) {
  const pool = getPool();
  const res = await pool.query(
    `INSERT INTO payment_requests (user_id, amount_kzt, transaction_id, payer_account, receipt_mime, receipt_base64, status, notes, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, now())
     RETURNING id, user_id, amount_kzt, currency, transaction_id, payer_account, status, notes, created_at, updated_at`,
    [
      userId,
      amountKzt,
      transactionId,
      String(payerAccount || '').slice(0, 64),
      String(receiptMime || '').slice(0, 80),
      String(receiptBase64 || ''),
      String(notes || '').slice(0, 2000),
    ],
  );
  return res.rows[0];
}

async function listPaymentRequests({ limit = 200, status = null } = {}) {
  const pool = getPool();
  const safeLimit = Math.max(1, Math.min(1000, Number(limit) || 200));
  const where = status ? `WHERE pr.status = $2` : '';
  const params = status ? [safeLimit, status] : [safeLimit];
  const res = await pool.query(
    `SELECT pr.id, pr.user_id, pr.amount_kzt, pr.currency, pr.transaction_id, pr.payer_account, pr.status, pr.notes, pr.created_at, pr.updated_at,
            (CASE WHEN pr.receipt_base64 <> '' THEN true ELSE false END) AS has_receipt,
            u.email, u.name, u.university
     FROM payment_requests pr
     JOIN users u ON u.id = pr.user_id
     ${where}
     ORDER BY pr.created_at DESC
     LIMIT $1`,
    params,
  );
  return res.rows || [];
}

async function getPaymentReceiptById(id) {
  const pool = getPool();
  const res = await pool.query(
    `SELECT id, user_id, receipt_mime, receipt_base64
     FROM payment_requests
     WHERE id = $1
     LIMIT 1`,
    [id],
  );
  return res.rows[0] || null;
}

async function updatePaymentRequestStatus({ id, status }) {
  const pool = getPool();
  const res = await pool.query(
    `UPDATE payment_requests
     SET status = $2, updated_at = now()
     WHERE id = $1
     RETURNING id, user_id, amount_kzt, currency, transaction_id, status, notes, created_at, updated_at`,
    [id, status],
  );
  return res.rows[0] || null;
}

async function appendAdminAudit({ adminEmail, action, entityType, entityId, meta }) {
  const pool = getPool();
  const res = await pool.query(
    `INSERT INTO admin_audit_log (admin_email, action, entity_type, entity_id, meta_json)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, admin_email, action, entity_type, entity_id, created_at`,
    [
      String(adminEmail || '').slice(0, 200),
      String(action || '').slice(0, 80),
      String(entityType || '').slice(0, 80),
      String(entityId || '').slice(0, 80),
      meta ? JSON.stringify(meta).slice(0, 8000) : '',
    ],
  );
  return res.rows[0] || null;
}

async function listAdminAudit({ limit = 200 } = {}) {
  const pool = getPool();
  const safeLimit = Math.max(1, Math.min(1000, Number(limit) || 200));
  const res = await pool.query(
    `SELECT id, admin_email, action, entity_type, entity_id, meta_json, created_at
     FROM admin_audit_log
     ORDER BY created_at DESC
     LIMIT $1`,
    [safeLimit],
  );
  return res.rows || [];
}

module.exports = {
  getPool,
  initAuthDb,
  findUserByEmail,
  createUser,
  listUsers,
  getActiveSubscriptionByUserId,
  upsertSubscription,
  createPaymentRequest,
  listPaymentRequests,
  updatePaymentRequestStatus,
  getPaymentReceiptById,
  appendAdminAudit,
  listAdminAudit,
};
