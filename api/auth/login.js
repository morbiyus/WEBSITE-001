/**
 * VAZEDGAME — Login
 *
 * Endpoint: POST /api/auth/login
 *
 * Authentication via Supabase Auth.
 * Validates credentials against the Supabase backend.
 * Returns user session on success, or error on failure.
 *
 * Environment Variables Required:
 * - VITE_SUPABASE_URL: Your Supabase project URL
 * - VITE_SUPABASE_ANON_KEY: Your Supabase anon key
 * - SESSION_SECRET: Secret for signing cookies (server-side)
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'İstifadəçi adı və şifrə daxil edin.'
    });
  }

  // Supabase authentication
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(503).json({
      success: false,
      error: 'Server reconfigured: Supabase moveqli yanlış. Təlav edilən environment variables yoxdur.'
    });
  }

  const { data, error } = await fetch(`${supabaseUrl}/auth/v1/signin`, {
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
      if (!resp.ok) throw new Error('Login failed');
      return resp.json();
    })
    .then(data => {
      // Set secure cookie with session
      const sessionToken = Buffer.from(`${data.user.id}:${Date.now()}`).toString('base64');
      res.setHeader('Set-Cookie', `session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`);
      return res.status(200).json({
        success: true,
        user: data.user,
        session: sessionToken
      });
    })
    .catch(err => {
      console.error('Login error:', err);
      return res.status(401).json({
        success: false,
        error: 'Yanlış istifadəçi adı və ya şifrə. Daxil olma imkanı yoxdur.'
      });
    });
}