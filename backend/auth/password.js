const crypto = require('crypto');

function hashPassword(password) {
  const pwd = String(password || '');
  if (pwd.length < 6) throw new Error('Password must be at least 6 characters');

  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(pwd, salt, 64);
  return `scrypt:${salt}:${derived.toString('hex')}`;
}

function verifyPassword(password, storedHash) {
  const pwd = String(password || '');
  const raw = String(storedHash || '');
  const parts = raw.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const salt = parts[1];
  const expectedHex = parts[2];
  if (!salt || !expectedHex) return false;

  const derived = crypto.scryptSync(pwd, salt, 64).toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(expectedHex, 'hex'));
  } catch {
    return false;
  }
}

module.exports = { hashPassword, verifyPassword };

