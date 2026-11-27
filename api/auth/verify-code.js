/**
 * VAZEDGAME — Verify Email Code
 *
 * Endpoint: POST /api/auth/verify-code
 *
 * NOTE: Email verification is permanently disabled in demo mode.
 * This endpoint always returns a 503 response — no verification code is accepted.
 * Users may register and log in without email verification code.
 *
 * Supabase Integration Note:
 * To enable email verification, configure Supabase Auth and
 * replace this handler with Supabase email verification logic.
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Email verification is disabled per requirements
  // Users may complete registration without verification code
  return res.status(503).json({
    success: false,
    error: 'E-poçt doğrulama kodu tələb edilmir. Qeydiyyat tamamlanmaq mümkündür.'
  });
}