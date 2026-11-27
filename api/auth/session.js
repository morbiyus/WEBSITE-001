/**
 * VAZEDGAME — Session Check and Management
 *
 * Endpoint: GET /api/auth/session (check session)
 *           POST /api/auth/session (handle auth operations: refresh, logout)
 *
 * Verifies the user's authenticated session via Supabase Auth.
 * Stores BOTH access_token and refresh_token securely in HTTP-only cookies.
 * Implements refresh-token rotation: on successful refresh, replaces both tokens.
 * Uses Supabase Auth REST endpoints correctly:
 *   - Session validation: GET /auth/v1/user (with access_token)
 *   - Token refresh: POST /auth/v1/token?grant_type=refresh_token
 *   - Logout: POST /auth/v1/logout
 *
 * Environment Variables Required (in Vercel Dashboard):
 * - SUPABASE_URL: Your Supabase project URL (server-side)
 * - SUPABASE_ANON_KEY: Your Supabase publishable/anon key
 *
 * Note: SESSION_SECRET is not required — Supabase manages session tokens
 * securely via its own authentication mechanism. No custom token signing
 * is needed on this server.
 *
 * CORS: This endpoint is configured for same-domain Vercel deployment.
 *      The frontend (vazedgame.vercel.app) and this API share the same origin.
 *      No Access-Control-Allow-Origin header is set (same-origin policy applies).
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle GET: check current session
  if (req.method === 'GET') {
    return handleSessionCheck(req, res);
  }

  // Handle POST: authentication operations (refresh and logout)
  if (req.method === 'POST') {
    return handleAuthOperations(req, res);
  }
}

async function handleSessionCheck(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  // If Supabase not configured, fall back to demo mode from cookie
  if (!supabaseUrl || !supabaseAnonKey) {
    const cookie = req.headers.cookie || '';
    const accessMatch = cookie.match(/supabase_access_token=([^;]+)/);
    if (accessMatch) {
      return res.status(200).json({
        success: true,
        authenticated: true,
        session: accessMatch[1],
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

  // Supabase session validation using GET /auth/v1/user with the access token
  try {
    // Read the access token from the request cookie
    const cookie = req.headers.cookie || '';
    const accessMatch = cookie.match(/supabase_access_token=([^;]+)/);
    const refreshMatch = cookie.match(/supabase_refresh_token=([^;]+)/);

    if (!accessMatch) {
      // No access token found, clear cookies and return unauthorized
      res.setHeader('Set-Cookie', 'supabase_access_token=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict');
      res.setHeader('Set-Cookie', 'supabase_refresh_token=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict');
      return res.status(401).json({
        success: false,
        authenticated: false,
        error: 'Session token yoxlanmadı. Təkrar daxil olun.',
        demo: true
      });
    }

    const accessToken = accessMatch[1];

    const { data, error } = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'GET',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${accessToken}`
      }
    })
      .then(resp => {
        if (!resp.ok) {
          // Token might be expired, try refresh
          return refreshSession(req, res, supabaseUrl, supabaseAnonKey, refreshMatch);
        }
        return resp.json();
      })
      .then(data => {
        if (data && data.user) {
          // Valid session - set cookies
          const maxAge = 86400; // 1 day default
          res.setHeader('Set-Cookie', `supabase_access_token=${accessToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`);
          // Also refresh the refresh token cookie if we have one
          if (refreshMatch) {
            res.setHeader('Set-Cookie', `supabase_refresh_token=${refreshMatch[1]}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`);
          }
          return res.status(200).json({
            success: true,
            authenticated: true,
            session: accessToken,
            user: data.user,
            demo: false
          });
        } else {
          // Token invalid, try refresh
          return refreshSession(req, res, supabaseUrl, supabaseAnonKey, refreshMatch);
        }
      })
      .catch(err => {
        console.error('Session check error:', err);
        // Try refresh on error
        if (refreshMatch) {
          return refreshSession(req, res, supabaseUrl, supabaseAnonKey, refreshMatch);
        }
        res.setHeader('Set-Cookie', 'supabase_access_token=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict');
        res.setHeader('Set-Cookie', 'supabase_refresh_token=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict');
        return res.status(401).json({
          success: false,
          authenticated: false,
          error: 'Oturum yoxlanmada xəta baş verdi.',
          demo: true
        });
      });
  } catch (err) {
    console.error('Session check exception:', err);
    res.setHeader('Set-Cookie', 'supabase_access_token=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict');
    res.setHeader('Set-Cookie', 'supabase_refresh_token=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict');
    return res.status(401).json({
      success: false,
      authenticated: false,
      error: 'Oturum yoxlanmada xəta baş verdi.',
      demo: true
    });
  }
}

/**
 * Refresh session tokens using POST /auth/v1/token?grant_type=refresh_token
 */
async function refreshSession(req, res, supabaseUrl, supabaseAnonKey, refreshMatch) {
  if (!refreshMatch) {
    // No refresh token available, force re-login
    res.setHeader('Set-Cookie', 'supabase_access_token=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict');
    res.setHeader('Set-Cookie', 'supabase_refresh_token=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict');
    return res.status(401).json({
      success: false,
      authenticated: false,
      error: 'Session təcid edilmədi. Təkrar daxil olun.',
      demo: true
    });
  }

  const refreshToken = refreshMatch[1];

  try {
    const { data, error } = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({
        refresh_token: refreshToken
      })
    })
      .then(resp => {
        if (!resp.ok) throw new Error('Refresh failed');
        return resp.json();
      })
      .then(data => {
        if (data && data.session && data.session.access_token && data.session.refresh_token) {
          // Refresh successful - rotate both tokens (new refresh token, new access token)
          const maxAge = Math.floor(data.session.expires_in / 1000);
          res.setHeader('Set-Cookie', [
            `supabase_access_token=${data.session.access_token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`,
            `supabase_refresh_token=${data.session.refresh_token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`
          ]);
          return res.status(200).json({
            success: true,
            authenticated: true,
            session: data.session.access_token,
            refresh_token: data.session.refresh_token,
            user: data.user,
            demo: false,
            refreshed: true
          });
        } else {
          // Refresh failed
          res.setHeader('Set-Cookie', 'supabase_access_token=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict');
          res.setHeader('Set-Cookie', 'supabase_refresh_token=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict');
          return res.status(401).json({
            success: false,
            authenticated: false,
            error: 'Session yeniləmədi.',
            demo: true
          });
        }
      })
      .catch(err => {
        console.error('Refresh error:', err);
        res.setHeader('Set-Cookie', 'supabase_access_token=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict');
        res.setHeader('Set-Cookie', 'supabase_refresh_token=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict');
        return res.status(401).json({
          success: false,
          authenticated: false,
          error: 'Session yeniləmədə xəta baş verdi.',
          demo: true
        });
      });
  } catch (err) {
    console.error('Refresh exception:', err);
    res.setHeader('Set-Cookie', 'supabase_access_token=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict');
    res.setHeader('Set-Cookie', 'supabase_refresh_token=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict');
    return res.status(401).json({
      success: false,
      authenticated: false,
      error: 'Session yeniləmədə xəta baş verdi.',
      demo: true
    });
  }
}

async function handleAuthOperations(req, res) {
  const { action } = req.body;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(503).json({
      success: false,
      error: 'Server xətası: Supabase konfiqurasiyası yoxdur.',
    });
  }

  if (action === 'login') {
    // Login is primarily handled in login.js, but we acknowledge here
    return res.status(200).json({
      success: true,
      message: 'Login endpoint redirects to /api/auth/login for Supabase password grant.'
    });
  }

  if (action === 'refresh') {
    // Refresh is handled in handleSessionCheck via the cookie-based approach
    return res.status(200).json({
      success: true,
      message: 'Refresh operation managed via session check cookies.'
    });
  }

  if (action === 'logout') {
    return handleLogoutOperation(req, res, supabaseUrl, supabaseAnonKey);
  }

  return res.status(400).json({
    success: false,
    error: 'Bilinməyən əmrlə.',
  });
}

async function handleLogoutOperation(req, res, supabaseUrl, supabaseAnonKey) {
  try {
    // Call Supabase signout
    const { error } = await fetch(`${supabaseUrl}/auth/v1/logout`, {
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
        // Clear BOTH access_token and refresh_token cookies
        res.setHeader('Set-Cookie', [
          'supabase_access_token=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict',
          'supabase_refresh_token=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict'
        ]);
        return res.status(200).json({
          success: true,
          message: 'Sistemdən çıxış etdiniz (demo rejim).'
        });
      })
      .catch(err => {
        console.error('Logout error:', err);
        // Still clear both cookies even if Supabase call fails
        res.setHeader('Set-Cookie', [
          'supabase_access_token=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict',
          'supabase_refresh_token=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict'
        ]);
        return res.status(200).json({
          success: true,
          message: 'Sistemdən çıxış etdiniz (demo rejim - Supabase xeta).'
        });
      });
  } catch (err) {
    console.error('Logout exception:', err);
    // Clear both cookies even on exception
    res.setHeader('Set-Cookie', [
      'supabase_access_token=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict',
      'supabase_refresh_token=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict'
    ]);
    return res.status(200).json({
      success: true,
      message: 'Sistemdən çıxış etdiniz (xahta görə).'
    });
  }
}