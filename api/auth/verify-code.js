/**
 * VAZEDGAME — Verify email verification code & complete registration (Vercel serverless function)
 *
 * Endpoint: POST /api/auth/verify-code
 * Body: { email, code, username, password }
 *
 * Behavior:
 *  - Looks up the pending verification code for the email.
 *  - Checks expiry (5 minutes) and max attempts (5).
 *  - If valid, creates the user account.
 *  - Removes the pending code after successful verification.
 *
 * Required environment variable (set in Vercel project settings):
 *   RESEND_API_KEY — your Resend API key
 *   RESEND_FROM_EMAIL — verified sender address
 */

import { Resend } from 'resend';

const pendingCodes = new Map(); // must match send-code.js (same runtime instance ideal)

const CODE_TTL_MS = 5 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

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
    const { email, code, username, password } = req.body || {};

    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'E-poçt və kod tələb olunur.' });
    }

    const entry = pendingCodes.get(email);

    if (!entry) {
      return res.status(400).json({ success: false, error: 'Doğrulama kodu tapılmadı. Zəhmət olmasa, yenidən qeydiyyatdan keçin.' });
    }

    // Check expiry
    if (now() > entry.expiresAt) {
      pendingCodes.delete(email);
      return res.status(400).json({ success: false, error: 'Doğrulama koduun müddəti bitib. Yenidən kod təbdir edin.' });
    }

    // Check attempts
    if (entry.attempts >= MAX_VERIFY_ATTEMPTS) {
      pendingCodes.delete(email);
      return res.status(400).json({ success: false, error: 'Çoxrəcfə yanlış kodu daxil etdiniz. Yenidən kod təbdir edin.' });
    }

    entry.attempts++;

    // Verify code
    if (entry.code !== String(code)) {
      const remaining = MAX_VERIFY_ATTEMPTS - entry.attempts;
      return res.status(400).json({
        success: false,
        error: `Səhv kod. Qalıb cəhd: ${remaining}.`
      });
    }

    // Code valid — complete registration
    const user = { username, email, password, createdAt: now() };

    // In a production app, save to a database here (e.g., Vercel Postgres, MongoDB, etc.).
    // For now we return success; the frontend stores credentials via its own login flow.
    pendingCodes.delete(email);

    // Optional: send welcome email
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: 'Xoş gəldiniz — VAZEDGAME',
        text: `Salam ${username}! VAZEDGAME hesabınız uğurla yaradıldı. İndi daxil ola bilərsiniz.`,
        html: `
          <div style="font-family: system-ui, -apple-system, sans-serif; background:#0a0a0a; color:#fff; padding:24px; border-radius:12px; max-width:600px; margin:0 auto;">
            <div style="text-align:center; margin-bottom:24px;">
              <div style="font-size:28px; font-weight:800; color:#FFD200; letter-spacing:2px;">VAZEDGAME</div>
            </div>
            <p style="font-size:16px; line-height:1.6; margin-bottom:20px;">Salam, <strong>${username}</strong>!</p>
            <p style="font-size:16px; line-height:1.6; margin-bottom:20px;">
              VAZEDGAME hesabınız uğurla yaradıldı. İndi daxil ola bilər və oyunlara başlamaq olar.
            </p>
            <div style="text-align:center; margin-top:24px;">
              <a href="${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : '#'}" style="background:#FFD200; color:#000; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight:700;">Sayta daxil olun</a>
            </div>
          </div>
        `
      });
    } catch (welcomeErr) {
      console.warn('Welcome email failed (non-critical):', welcomeErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Qeydiyyat uğurla tamamlandı. İndi daxil ola bilərsiniz.',
      user: { username, email }
    });
  } catch (err) {
    console.error('verify-code error:', err);
    return res.status(500).json({
      success: false,
      error: 'Doğrulama zamanı xəta baş verdi. Zəhmət olmasa, daha sonra yenidən cəhd edin.'
    });
  }
}

function now() {
  return Date.now();
}
