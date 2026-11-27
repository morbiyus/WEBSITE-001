/**
 * VAZEDGAME — Login (Demo Mode Disabled)
 *
 * Endpoint: POST /api/auth/login
 *
 * NOTE: Real server-side authentication is disabled in zero-budget demo mode.
 * Authentication is handled entirely in the frontend (demo mode only).
 * No passwords are stored, transmitted, or validated by this endpoint.
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
    error: 'Gerçek authentikasiya hal-hazırda mümkün deyildir. Daxil olma demo rejimində həyata keçirilir.'
  });
}
