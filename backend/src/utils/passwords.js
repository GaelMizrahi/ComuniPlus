import { randomBytes, scrypt as derive, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(derive);
const options = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const pattern = /^scrypt\$32768\$8\$1\$([a-f0-9]{32})\$([a-f0-9]{128})$/;
export const isLegacyPassword = (stored) => typeof stored === 'string' && !stored.startsWith('scrypt$');

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64, options);
  return `scrypt$32768$8$1$${salt}$${key.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  const match = typeof stored === 'string' && pattern.exec(stored);
  // Even missing accounts and legacy comparisons perform a derivation. Never
  // accept attacker-controlled work factors from a stored password string.
  const key = await scrypt(password, match ? match[1] : 'comuniplus-invalid-account-salt', 64, options);
  if (match) return timingSafeEqual(key, Buffer.from(match[2], 'hex'));
  if (!isLegacyPassword(stored)) return false;
  const digest = (value) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(password.trim()), digest(stored.trim()));
}
