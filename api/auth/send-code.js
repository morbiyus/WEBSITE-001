/**
 * VAZEDGAME — Email verification code sender (Vercel serverless function)
 *
 * Endpoint: POST /api/auth/send-code
 * Body: { email }
 *
 * Behavior:
 *  - Generates a random 6-digit verification code.
 *  - Sends it to the provided email address via Resend.
 *  - Stores the pending code (with 5-minute expiry) in memory.
 *  - Enforces rate limiting (max 3 sends per 5 minutes per email/IP).
 *
 * Required environment variable (set in Vercel project settings):
 *   RESEND_API_KEY — your Resend API key
 *   RESEND_FROM_EMAIL — verified sender address (default: onboarding@resend.dev)
 */

import { Resend } from 'resend';

// In-memory store for pending verification codes (per serverless instance).
// For production, replace with Vercel KV / Upstash Redis / database.
const pendingCodes = new Map(); // key -> { code, expiresAt, attempts, resendCount, lastResendAt }

// Rate-limit store (per IP/email): { lastSendAt, count }
const rateLimitStore = new Map();

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_SENDS_PER_WINDOW = 3;
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_VERIFY_ATTEMPTS = 5;

function now() {
  return Date.now();
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
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

export default async function handler(req, res) {
  // CORS
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
    const { email } = req.body || {};

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: 'Düzgün e-poçt ünvanı daxil edin.' });
    }

    const ip = getClientIp(req);
    const key = rateLimitKey(ip, email);

    if (isRateLimited(key)) {
      return res.status(429).json({
        success: false,
        error: 'Çox təbdirložendəsiniz. Zəhmət olmasa, daha sonra yenidən cəhd edin.'
      });
    }

    // Check for existing pending code for this email (avoid duplicate sends within short window)
    const existing = pendingCodes.get(email);
    if (existing && now() - existing.lastResendAt < 60000) {
      return res.status(429).json({
        success: false,
        error: 'Kod indi göndərilib. Zəhmət olmasa 1 dəqiqə gözləyin.'
      });
    }

    const code = generateCode();
    const expiresAt = now() + CODE_TTL_MS;

    pendingCodes.set(email, {
      code,
      expiresAt,
      attempts: 0,
      resendCount: 0,
      lastResendAt: now()
    });

    registerSend(key);

    // Send email via Resend
    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; background:#0a0a0a; color:#fff; padding:24px; border-radius:12px; max-width:600px; margin:0 auto;">
        <div style="text-align:center; margin-bottom:24px;">
          <div style="font-size:28px; font-weight:800; color:#FFD200; letter-spacing:2px;">VAZEDGAME</div>
          <div style="font-size:14px; color:#888; margin-top:6px;">Qara və Sarı dünyaya xoş gəldiniz</div>
        </div>
        <p style="font-size:16px; line-height:1.6; margin-bottom:20px;">
          Qeydiyyat prosesinizi tamamlaymaq üçün aşağıdakı 6 rəqəmli doğrulama kodunu istifadə edin:
        </p>
        <div style="background:#111; border:1px solid rgba(255,210,0,0.3); border-radius:8px; padding:20px; text-align:center; margin-bottom:20px;">
          <span style="font-size:32px; font-weight:800; letter-spacing:8px; color:#FFD200; display:inline-block;">${code.split('').join(' ')}</span>
        </div>
        <p style="font-size:14px; color:#888; margin-bottom:20px;">
          Kod 5 dəqiqə ərzində geçerlidir. Kodu başkası ilə paylaşmayın.
        </p>
        <hr style="border:none; border-top:1px solid rgba(255,210,0,0.15); margin-bottom:20px;">
        <p style="font-size:12px; color:#666;">
          Bu e-poçt VAZEDGAME-ə terkib olub. Əgər siz bu əmaliyyatı aparmıyazsınızsa, bu e-poçtı eşitməyəyin.
        </p>
      </div>
    `;

    const text = `VAZEDGAME - Doğrulama kodunuz: ${code}. Kod 5 dəqiqə ərzində geçerlidir.`;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'VAZEDGAME - Doğrulama kodunuz',
      text,
      html
    });

    return res.status(200).json({
      success: true,
      message: 'Doğrulama kodu e-poçtunuza göndərilib.',
      expiresInMinutes: Math.round(CODE_TTL_MS / 60000)
    });
  } catch (err) {
    console.error('send-code error:', err);
    return res.status(500).json({
      success: false,
      error: 'E-poçt göndərilə bilmədi. Zəhmət olmasa, daha sonra yenidən cəhd edin.'
    });
  }
}
