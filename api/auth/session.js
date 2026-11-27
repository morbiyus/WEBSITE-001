/**
 * VAZEDGAME — Session Check
 *
 * Endpoint: GET /api/auth/session
 *
 * Verifies the user's authenticated session via Supabase Auth.
 * Returns session status and user data if authenticated.
 *
 * Environment Variables Required:
 * - VITE_SUPABASE_URL: Your Supabase project URL
 * - VITE_SUPABASE_ANON_KEY: Your Supabase anon key
 * - SESSION_SECRET: Secret for signing cookies (server-side)
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // No Supabase configured - return demo session from cookie or fallback
    const cookie = req.headers.cookie || '';
    const match = cookie.match(/session=([^;]+)/);
    if (match) {
      return res.status(200).json({
        success: true,
        authenticated: true,
        session: match[1],
        demo: true,
        user: { username: 'demo_user', email: '' }
      });
    }
    return res.status(401).json({
      success: false,
      authenticated: false,
      error: 'Gerçek oturum yoxlanımı hal-hazırda mümkün deyildir. Demo rejimində oturum sessionStorage vasitəsilə saxlanılır.'
    });
  }

  // Supabase session check
  const { data, error } = await fetch(`${supabaseUrl}/auth/v1/getSession`, {
    method: 'GET',
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`
    }
  })
    .then(resp => {
      if (!resp.ok) throw new Error('Session check failed');
      return resp.json();
    })
    .then(data => {
      if (data.session && data.user) {
        // Set secure cookie
        const sessionToken = Buffer.from(`${data.user.id}:${Date.now()}`).toString('base64');
        res.setHeader('Set-Cookie', `session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`);
        return res.status(200).json({
          success: true,
          authenticated: true,
          session: sessionToken,
          user: data.user,
          demo: false
        });
      } else {
        res.setHeader('Set-Cookie', 'session=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict');
        return res.status(200).json({
          success: false,
          authenticated: false,
          user: null,
          demo: true
        });
      }
    })
    .catch(err => {
      console.error('Session check error:', err);
      res.setHeader('Set-Cookie', 'session=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict');
      return res.status(200).json({
        success: false,
        authenticated: false,
        error: 'Oturum yoxlanmada xəta baş verdi.',
        demo: true
      });
    });
}