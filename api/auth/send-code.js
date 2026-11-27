/**
 * VAZEDGAME — Send Email Verification Code
 *
 * Endpoint: POST /api/auth/send-code
 *
 * NOTE: Email verification is permanently disabled in demo mode.
 * This endpoint always returns a 503 response — no email code is sent.
 * Users may register without email verification.
 *
 * Supabase Integration Note:
 * This endpoint currently returns 503. To enable email verification,
 * configure Supabase Auth and uncomment the verification logic below.
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Email verification is disabled per zero-budget requirements
  // Users can register without verifying email
  return res.status(503).json({
    success: false,
    error: 'E-poçt doğrulama xidməti अविलंब təlib edilmir. İstifadəçilər e-poçt təminəsi olmadan qeydiyyatdan keçə bilərler.'
  });
}