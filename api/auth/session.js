/**
 * VAZEDGAME — Session Check (Demo Mode Disabled)
 *
 * Endpoint: GET /api/auth/session
 *
 * NOTE: Real server-side session verification is disabled in zero-budget demo mode.
 * Session state is managed entirely in the frontend (sessionStorage only).
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(401).json({
    success: false,
    authenticated: false,
    error: 'Gerçek oturum yoxlanımı hal-hazırda mümkün deyildir. Demo rejimində oturum sessionStorage vasitəsilə saxlanılır.'
  });
}
