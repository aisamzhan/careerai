const crypto = require('crypto');

function requireSecret() {
  const s = String(process.env.AUTH_TOKEN_SECRET || '').trim();
  if (!s) throw new Error('Missing env var: AUTH_TOKEN_SECRET');
  return s;
}

function b64urlEncode(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function b64urlDecode(str) {
  const s = String(str || '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Buffer.from(s + pad, 'base64');
}

function sign(data) {
  const secret = requireSecret();
  return crypto.createHmac('sha256', secret).update(data).digest();
}

function createAuthToken(payload, { ttlSeconds = 60 * 60 * 24 * 14 } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: now,
    exp: now + ttlSeconds,
    v: 1,
  };

  const json = JSON.stringify(body);
  const tokenBody = b64urlEncode(json);
  const sig = b64urlEncode(sign(tokenBody));
  return `${tokenBody}.${sig}`;
}

function verifyAuthToken(token) {
  const t = String(token || '').trim();
  const parts = t.split('.');
  if (parts.length !== 2) return null;
  const body = parts[0];
  const sig = parts[1];
  if (!body || !sig) return null;

  const expectedSig = b64urlEncode(sign(body));
  try {
    if (!crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(sig))) return null;
  } catch {
    return null;
  }

  let payload;
  try {
    payload = JSON.parse(b64urlDecode(body).toString('utf8'));
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (!payload || typeof payload !== 'object') return null;
  if (payload.exp && Number(payload.exp) < now) return null;
  return payload;
}

function isAdminEmail(email) {
  const raw = String(process.env.ADMIN_EMAILS || '').trim();
  if (!raw) return false;
  const list = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(String(email || '').trim().toLowerCase());
}

module.exports = {
  createAuthToken,
  verifyAuthToken,
  isAdminEmail,
};

