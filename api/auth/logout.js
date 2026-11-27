/**
 * VAZEDGAME — Server-Side Logout (Vercel serverless function)
 *
 * Endpoint: POST /api/auth/logout
 *
 * Behavior:
 *  - Clears the session cookie.
 *  - Invalidates the server-side session.
 */

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

  // Clear the session cookie
  res.setHeader('Set-Cookie', [
    'vz_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'
  ]);

  // Invalidate server-side session if it exists
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/vz_session=([^;]+)/);
  if (match && global.__sessions) {
    global.__sessions.delete(match[1]);
  }

  return res.status(200).json({
    success: true,
    message: 'Sistemdən uğurla çıxış etdiniz.'
  });
}
