/**
 * VAZEDGAME — Server-Side Login (Vercel serverless function)
 *
 * Endpoint: POST /api/auth/login
 * Body: { username, password }
 *
 * Behavior:
 *  - Validates username/password against stored user accounts.
 *  - On success, sets an HttpOnly, Secure, SameSite=Strict session cookie.
 *  - Only email-verified accounts can log in.
 *
 * Required environment variables (Vercel Project Settings):
 *   SESSION_SECRET — random secret for signing session cookies
 *   (Database: Replace in-memory store with Vercel Postgres / Supabase)
 */

import { usersStore } from './shared-users.js';

async function comparePassword(plainPassword, storedHash) {
  const bcrypt = await import('bcryptjs');
  return bcrypt.compareSync(plainPassword, storedHash);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'İstifadəçi adı və şifrə tələb olunur.' });
    }

    // Find user by username (case-insensitive)
    const user = Array.from(usersStore.values()).find(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    );

    if (!user) {
      return res.status(401).json({ success: false, error: 'Siz Qeydiyyatdan Keçməmisiniz.' });
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        error: 'E-poçt ünvanınız doğrulanmayıb. Zəhmət olmasa, qeydiyyat prosesini tamamlayın.'
      });
    }

    // Verify password against stored hash
    const isValid = await comparePassword(password, user.passwordHash);

    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Siz Qeydiyyatdan Keçməmisiniz.' });
    }

    // Create session (placeholder — replace with signed JWT/session cookie in production)
    const sessionId = require('crypto').randomBytes(16).toString('hex');
    const sessionExpiry = now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    // Store session (in production, use Redis/database with signed cookie)
    if (!global.__sessions) global.__sessions = new Map();
    global.__sessions.set(sessionId, {
      userId: user.id,
      username: user.username,
      email: user.email,
      expiresAt: sessionExpiry
    });

    // Set HttpOnly, Secure, SameSite=Strict cookie
    res.setHeader('Set-Cookie', [
      `vz_session=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${604800}`
    ]);

    return res.status(200).json({
      success: true,
      message: 'Xoş gəldiniz, ' + user.username + '!',
      user: { username: user.username, email: user.email }
    });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({
      success: false,
      error: 'Daxil olarkən xəta baş verdi. Zəhmət olmasa, daha sonra yenidən cəhd edin.'
    });
  }
}

function now() {
  return Date.now();
}
