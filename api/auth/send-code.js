/**
 * VAZEDGAME — Send Email Verification Code (Vercel serverless function)
 *
 * Endpoint: POST /api/auth/send-code
 * Body: { email }
 *
 * Behavior:
 *  - Generates a cryptographically secure 6-digit verification code.
 *  - Hashes the code before storage (never stores raw codes).
 *  - Sends the code to the email via Resend.
 *  - Returns success ONLY if Resend accepts the email.
 *  - Enforces rate limiting (max 3 sends per 15 minutes per IP+email).
 *  - 60-second cooldown between resends for the same email.
 *
 * Required environment variables (Vercel Project Settings):
 *   RESEND_API_KEY — your Resend API key
 *   RESEND_FROM_EMAIL — verified sender address (e.g. onboarding@resend.dev)
 */

import { Resend } from 'resend';
import {
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
} from './shared-store.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

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
        error: 'Çox speciesdə kodu tələb edibsiz. Zəhmət olmasa, daha sonra yenidən cəhd edin.'
      });
    }

    // Check resend cooldown for this email
    const existing = pendingCodes.get(email);
    if (existing && now() - existing.lastResendAt < RESEND_COOLDOWN_MS) {
      const remaining = Math.ceil((RESEND_COOLDOWN_MS - (now() - existing.lastResendAt)) / 1000);
      return res.status(429).json({
        success: false,
        error: `Kod indi göndərilib. Zəhmət olmasa ${remaining} saniyə gözləyin.`
      });
    }

    const code = generateCode();
    const expiresAt = now() + CODE_TTL_MS;

    // Store HASHED code — never store raw verification codes
    const codeHash = await hashCode(code);

    pendingCodes.set(email, {
      codeHash,
      expiresAt,
      attempts: 0,
      lastResendAt: now()
    });

    registerSend(key);

    // Send email via Resend — return success ONLY if Resend accepts it
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
          Kod 5 dəqiqə ərzində qüvvədədir. Kodu başkası ilə paylaşmayın.
        </p>
        <hr style="border:none; border-top:1px solid rgba(255,210,0,0.15); margin-bottom:20px;">
        <p style="font-size:12px; color:#666;">
          Bu e-poçt VAZEDGAME tərəfinden göndərilib. Əgər siz bu əməliyyatı aparmıyazsınızsa, bu e-poçtı eşitməyəyin.
        </p>
      </div>
    `;

    const text = `VAZEDGAME - Doğrulama kodunuz: ${code}. Kod 5 dəqiqə ərzində qüvvədədir.`;

    const sendResult = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'VAZEDGAME - Doğrulama kodunuz',
      text,
      html
    });

    // Resend returns { data: { id } } on success. If no data.id, the email was not accepted.
    if (!sendResult.data || !sendResult.data.id) {
      // Remove the pending code since email was not sent
      pendingCodes.delete(email);
      return res.status(500).json({
        success: false,
        error: 'E-poçt göndərilə bilmədi. Zəhmət olmasa, daha sonra yenidən cəhd edin.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Doğrulama kodu e-poçtunuza göndərilib.',
      expiresInMinutes: Math.round(CODE_TTL_MS / 60000)
    });
  } catch (err) {
    console.error('send-code error:', err);
    return res.status(500).json({
      success: false,
      error: 'E-poçt göndərilərkən xəta baş verdi. Zəhmət olmasa, daha sonra yenidən cəhd edin.'
    });
  }
}

async function hashCode(code) {
  const bcrypt = await import('bcryptjs');
  return bcrypt.hashSync(code, 10);
}
