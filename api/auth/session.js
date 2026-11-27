/**
 * VAZEDGAME — Get Current Session (Vercel serverless function)
 *
 * Endpoint: GET /api/auth/session
 *
 * Behavior:
 *  - Reads the HttpOnly session cookie.
 *  - Returns the authenticated user if session is valid.
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/vz_session=([^;]+)/);

  if (!match || !global.__sessions) {
    return res.status(401).json({ success: false, authenticated: false });
  }

  const session = global.__sessions.get(match[1]);

  if (!session || session.expiresAt < Date.now()) {
    if (global.__sessions) global.__sessions.delete(match[1]);
    return res.status(401).json({ success: false, authenticated: false });
  }

  return res.status(200).json({
    success: true,
    authenticated: true,
    user: {
      username: session.username,
      email: session.email
    }
  });
}
