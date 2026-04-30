const { Pool } = require('pg');
const crypto = require('crypto');

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
      email_verified BOOLEAN NOT NULL DEFAULT true,
      email_verification_token_hash TEXT NOT NULL DEFAULT '',
      email_verification_expires_at TIMESTAMPTZ,
      password_reset_token_hash TEXT NOT NULL DEFAULT '',
      password_reset_expires_at TIMESTAMPTZ,
      password_reset_used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  // Backfill columns on existing installs (idempotent).
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT true`);
  await pool.query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token_hash TEXT NOT NULL DEFAULT ''`,
  );
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token_hash TEXT NOT NULL DEFAULT ''`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_used_at TIMESTAMPTZ`);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS users_email_verification_token_hash_idx ON users(email_verification_token_hash)`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS users_password_reset_token_hash_idx ON users(password_reset_token_hash)`,
  );

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
    `SELECT id, name, email, university, password_hash, email_verified, created_at
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [email],
  );
  return res.rows[0] || null;
}

async function createUser({ name, email, university, passwordHash, emailVerified = true }) {
  const pool = getPool();
  const res = await pool.query(
    `INSERT INTO users (name, email, university, password_hash, email_verified)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email, university, email_verified, created_at`,
    [name, email, university, passwordHash, Boolean(emailVerified)],
  );
  return res.rows[0];
}

async function listUsers({ limit = 200 } = {}) {
  const pool = getPool();
  const safeLimit = Math.max(1, Math.min(1000, Number(limit) || 200));
  const res = await pool.query(
    `SELECT id, name, email, university, email_verified, created_at
     FROM users
     ORDER BY created_at DESC
     LIMIT $1`,
    [safeLimit],
  );
  return res.rows || [];
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

async function setEmailVerificationToken({ userId, token, ttlHours = 24 } = {}) {
  const pool = getPool();
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + Math.max(1, Number(ttlHours) || 24) * 60 * 60 * 1000).toISOString();

  const res = await pool.query(
    `UPDATE users
     SET email_verified = false,
         email_verification_token_hash = $2,
         email_verification_expires_at = $3
     WHERE id = $1
     RETURNING id, email, email_verified, email_verification_expires_at`,
    [userId, tokenHash, expiresAt],
  );
  return res.rows[0] || null;
}

async function verifyEmailByToken({ token } = {}) {
  const pool = getPool();
  const tokenHash = sha256Hex(token);
  const res = await pool.query(
    `UPDATE users
     SET email_verified = true,
         email_verification_token_hash = '',
         email_verification_expires_at = NULL
     WHERE email_verification_token_hash = $1
       AND email_verified = false
       AND (email_verification_expires_at IS NULL OR email_verification_expires_at > now())
     RETURNING id, name, email, university, email_verified, created_at`,
    [tokenHash],
  );
  return res.rows[0] || null;
}

async function setPasswordResetTokenByEmail({ email, token, ttlMinutes = 30 } = {}) {
  const pool = getPool();
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(
    Date.now() + Math.max(5, Number(ttlMinutes) || 30) * 60 * 1000,
  ).toISOString();

  const res = await pool.query(
    `UPDATE users
     SET password_reset_token_hash = $2,
         password_reset_expires_at = $3,
         password_reset_used_at = NULL
     WHERE email = $1
     RETURNING id, email, password_reset_expires_at`,
    [email, tokenHash, expiresAt],
  );
  return res.rows[0] || null;
}

async function consumePasswordResetToken({ token, newPasswordHash } = {}) {
  const pool = getPool();
  const tokenHash = sha256Hex(token);
  const res = await pool.query(
    `UPDATE users
     SET password_hash = $2,
         password_reset_token_hash = '',
         password_reset_expires_at = NULL,
         password_reset_used_at = now()
     WHERE password_reset_token_hash = $1
       AND password_reset_token_hash <> ''
       AND (password_reset_expires_at IS NULL OR password_reset_expires_at > now())
       AND password_reset_used_at IS NULL
     RETURNING id, name, email, university, email_verified, created_at`,
    [tokenHash, newPasswordHash],
  );
  return res.rows[0] || null;
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
  setEmailVerificationToken,
  verifyEmailByToken,
  setPasswordResetTokenByEmail,
  consumePasswordResetToken,
  getActiveSubscriptionByUserId,
  upsertSubscription,
  createPaymentRequest,
  listPaymentRequests,
  updatePaymentRequestStatus,
  getPaymentReceiptById,
  appendAdminAudit,
  listAdminAudit,
};
