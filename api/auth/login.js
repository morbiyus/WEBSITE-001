/**
 * VAZEDGAME — Login
 *
 * Endpoint: POST /api/auth/login
 *
 * Authentication via Supabase Auth using the password grant type.
 * Validates credentials against the Supabase backend using the correct
 * REST endpoint: POST /auth/v1/token?grant_type=password.
 * Returns user session with both access_token and refresh_token on success.
 *
 * Environment Variables Required (in Vercel Dashboard):
 * - SUPABASE_URL: Your Supabase project URL (server-side)
 * - SUPABASE_ANON_KEY: Your Supabase publishable/anon key
 *
 * CORS: This endpoint is configured for same-domain Vercel deployment.
 *      The frontend (vazedgame.vercel.app) and this API share the same origin.
 *      No Access-Control-Allow-Origin header is set (same-origin policy applies).
 *
 * Note: SESSION_SECRET is not required — Supabase manages session tokens
 * securely via its own authentication mechanism. No custom token signing
 * is needed on this server.
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'İstifadəçi adı və ya şifrə daxil edin.'
    });
  }

  // Supabase authentication using the correct password grant endpoint
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(503).json({
      success: false,
      error: 'Server xətası: Supabase konfiqurasiyası yoxdur.'
    });
  }

  const { data, error } = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
    },
    body: JSON.stringify({
      email,
      password
    })
  })
    .then(resp => {
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error('Login failed: ' + resp.status + ' ' + txt);
      }
      return resp.json();
    })
    .then(data => {
      // Data contains access_token and refresh_token
      if (data && data.session && data.session.access_token) {
        // Set BOTH access_token and refresh_token in secure cookies
        const maxAge = Math.floor(data.session.expires_in / 1000);
        res.setHeader('Set-Cookie', [
          `supabase_access_token=${data.session.access_token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`,
          `supabase_refresh_token=${data.session.refresh_token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`
        ]);
        return res.status(200).json({
          success: true,
          user: data.user,
          session: data.session.access_token,
          refresh_token: data.session.refresh_token,
          requireEmailVerification: false
        });
      } else {
        return res.status(401).json({
          success: false,
          error: 'Yanlış e-poçt və ya şifrə. Daxil olma imkan yoxdur.'
        });
      }
    })
    .catch(err => {
      console.error('Login error:', err);
      return res.status(401).json({
        success: false,
        error: 'Xəta baş verdi. Yanläs credentials.'
      });
    });
}