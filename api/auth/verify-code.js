/**
 * VAZEDGAME — Verify Email Code & Complete Registration (Vercel serverless function)
 *
 * Endpoint: POST /api/auth/verify-code
 * Body: { email, code, username, password }
 *
 * Behavior:
 *  - Looks up the pending hashed verification code for the email.
 *  - Checks expiry (5 minutes) and max attempts (5).
 *  - Compares the submitted code against the stored hash using bcrypt.
 *  - If valid, creates the user account with hashed password and marks email verified.
 *  - Removes the pending code after successful verification.
 *
 * Required environment variables (Vercel Project Settings):
 *   RESEND_API_KEY — your Resend API key
 *   RESEND_FROM_EMAIL — verified sender address
 */

import { Resend } from 'resend';
import {
  pendingCodes,
  CODE_TTL_MS,
  MAX_VERIFY_ATTEMPTS,
  now,
} from './shared-store.js';
import { usersStore, emailIndex, usernameIndex } from './shared-users.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

async function compareCode(plainCode, storedHash) {
  const bcrypt = await import('bcryptjs');
  return bcrypt.compareSync(plainCode, storedHash);
}

async function hashPassword(password) {
  const bcrypt = await import('bcryptjs');
  return bcrypt.hashSync(password, 10);
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
    const { email, code, username, password } = req.body || {};

    if (!email || !code || !username || !password) {
      return res.status(400).json({ success: false, error: 'Bütün xanalar doldurulmalıdır.' });
    }

    // Check duplicate username/email
    if (usernameIndex.has(username.toLowerCase())) {
      return res.status(409).json({ success: false, error: 'Bu istifadəçi adı artıq istifadə olunmaktadır.' });
    }
    if (emailIndex.has(email.toLowerCase())) {
      return res.status(409).json({ success: false, error: 'Bu e-poçt ünvanı artıq qeydiyyatdan keçirilib.' });
    }

    const entry = pendingCodes.get(email);

    if (!entry) {
      return res.status(400).json({ success: false, error: 'Doğrulama kodu tapılmadı. Zəhmət olmasa, yenidən qeydiyyatdan başlayın.' });
    }

    // Check expiry
    if (now() > entry.expiresAt) {
      pendingCodes.delete(email);
      return res.status(400).json({ success: false, error: 'Doğrulama kodunun müddəti bitib. Yenidən kod tələb edin.' });
    }

    // Check max attempts
    if (entry.attempts >= MAX_VERIFY_ATTEMPTS) {
      pendingCodes.delete(email);
      return res.status(400).json({ success: false, error: 'Maksimum 5 dəfə səhv kodu daxil etdiniz. Yenidən kod tələb edin.' });
    }

    entry.attempts++;

    // Verify code against stored hash
    const isValid = await compareCode(String(code), entry.codeHash);

    if (!isValid) {
      const remaining = MAX_VERIFY_ATTEMPTS - entry.attempts;
      return res.status(400).json({
        success: false,
        error: `Səhv kod. Qalıb cəhd hüququ: ${remaining}.`
      });
    }

    // Code valid — complete registration
    pendingCodes.delete(email);

    const passwordHash = await hashPassword(password);
    const userId = String(usersStore.size + 1);

    const user = {
      id: userId,
      username,
      email,
      passwordHash,
      emailVerified: true,
      createdAt: now()
    };

    usersStore.set(userId, user);
    emailIndex.set(email.toLowerCase(), userId);
    usernameIndex.set(username.toLowerCase(), userId);

    // Optional: send welcome email (non-critical if it fails)
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
