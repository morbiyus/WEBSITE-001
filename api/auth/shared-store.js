/**
 * VAZEDGAME — Shared Verification Code Store
 *
 * This module is imported by both send-code.js and verify-code.js so they
 * share the same in-memory Map for verification codes.
 *
 * IMPORTANT: Vercel serverless functions do NOT guarantee shared in-memory
 * state across separate function invocations or cold starts. This shared
 * module works only when both endpoints execute within the same warm
 * container instance.
 *
 * For production reliability, replace this module with a persistent shared
 * store such as Vercel KV, Upstash Redis, Vercel Postgres, or Supabase.
 * See README.md for required environment variables.
 */

const pendingCodes = new Map(); // email -> { codeHash, expiresAt, attempts, lastResendAt }
const rateLimitStore = new Map(); // key -> { lastSendAt, count }

const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_SENDS_PER_WINDOW = 3;
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_VERIFY_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds

function now() {
  return Date.now();
}

function generateCode() {
  // Cryptographically secure 6-digit code
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const code = String(array[0] % 900000 + 100000);
  return code;
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers['x-real-ip'] || 'unknown';
}

function rateLimitKey(ip, email) {
  return `${ip}:${email}`;
}

function isRateLimited(key) {
  const entry = rateLimitStore.get(key);
  if (!entry) return false;
  if (now() - entry.lastSendAt > RATE_WINDOW_MS) {
    rateLimitStore.delete(key);
    return false;
  }
  return entry.count >= MAX_SENDS_PER_WINDOW;
}

function registerSend(key) {
  const entry = rateLimitStore.get(key) || { lastSendAt: 0, count: 0 };
  if (now() - entry.lastSendAt > RATE_WINDOW_MS) {
    entry.count = 0;
    entry.lastSendAt = now();
  }
  entry.count++;
  entry.lastSendAt = now();
  rateLimitStore.set(key, entry);
}

module.exports = {
  pendingCodes,
  rateLimitStore,
  CODE_TTL_MS,
  MAX_SENDS_PER_WINDOW,
  RATE_WINDOW_MS,
  MAX_VERIFY_ATTEMPTS,
  RESEND_COOLDOWN_MS,
  now,
  generateCode,
  getClientIp,
  isRateLimited,
  registerSend,
};
