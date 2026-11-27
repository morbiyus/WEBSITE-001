/**
 * VAZEDGAME — Logout (Demo Mode Disabled)
 *
 * Endpoint: POST /api/auth/logout
 *
 * NOTE: Real server-side session management is disabled in zero-budget demo mode.
 * Logout is handled entirely in the frontend (sessionStorage only).
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
    error: 'OturumManagement xidməti hal-hazırda mümkün deyildir. Çıxış demo rejimində həyata keçirilir.'
  });
}
