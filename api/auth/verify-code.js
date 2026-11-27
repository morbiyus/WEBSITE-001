/**
 * VAZEDGAME — Verify Email Code (Demo Mode Disabled)
 *
 * Endpoint: POST /api/auth/verify-code
 *
 * NOTE: Email verification is temporarily disabled in zero-budget demo mode.
 * This endpoint always returns a "service unavailable" response.
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(503).json({
    success: false,
    error: 'E-poçt doğrulama xidməti hal-hazırda mümkün deyildir. Qeydiyyat demo rejimində davam edir.'
  });
}
