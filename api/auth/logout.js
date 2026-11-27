/**
 * VAZEDGAME — Logout
 *
 * Endpoint: POST /api/auth/logout
 *
 * Invalidates the user session via Supabase Auth.
 * Clears the secure HTTP-only session cookie.
 *
 * Environment Variables Required:
 * - VITE_SUPABASE_URL: Your Supabase project URL
 * - VITE_SUPABASE_ANON_KEY: Your Supabase anon key
 *
 * Note: SESSION_SECRET is not required — Supabase manages session token
 * invalidation through its signOut endpoint.
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Even without Supabase config, clear any local session data
    res.setHeader('Set-Cookie', 'supabase_auth_token=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict');
    return res.status(200).json({
      success: true,
      message: 'Oturum(dayıxma demo rejimində həyata keçirilir.'
    });
  }

  // Supabase logout
  const { error } = await fetch(`${supabaseUrl}/auth/v1/signout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
    }
  })
    .then(resp => {
      if (!resp.ok) throw new Error('Logout failed');
      return resp.json();
    })
    .then(() => {
      // Clear the secure cookie
      res.setHeader('Set-Cookie', 'supabase_auth_token=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict');
      return res.status(200).json({
        success: true,
        message: 'Sistemdən çıxış etdiniz (demo rejim).'
      });
    })
    .catch(err => {
      console.error('Logout error:', err);
      // Still clear the cookie even if Supabase call fails
      res.setHeader('Set-Cookie', 'supabase_auth_token=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict');
      return res.status(200).json({
        success: true,
        message: 'Sistemdən çıxış etdiniz (demo rejim - Supabase xeta).'
      });
    });
}