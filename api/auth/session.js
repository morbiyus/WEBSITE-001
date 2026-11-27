/**
 * VAZEDGAME — Session Check and Management
 *
 * Endpoint: GET /api/auth/session (check session)
 *           POST /api/auth/session (handle auth operations)
 *
 * Verifies the user's authenticated session via Supabase Auth.
 * Returns session status and user data if authenticated.
 *
 * Environment Variables Required:
 * - VITE_SUPABASE_URL: Your Supabase project URL
 * - VITE_SUPABASE_ANON_KEY: Your Supabase anon key
 *
 * Note: SESSION_SECRET is not required — Supabase manages session tokens
 * securely via its own authentication mechanism. No custom token signing
 * is needed on this server.
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle GET: check current session
  if (req.method === 'GET') {
    return handleSessionCheck(req, res);
  }

  // Handle POST: authentication operations
  if (req.method === 'POST') {
    return handleAuthOperations(req, res);
  }
}

async function handleSessionCheck(req, res) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  // If Supabase not configured, fall back to demo mode from cookie
  if (!supabaseUrl || !supabaseAnonKey) {
    const cookie = req.headers.cookie || '';
    const match = cookie.match(/supabase_auth_token=([^;]+)/);
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

  // Supabase session check using Supabase getSession endpoint
  try {
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
        if (data.session && data.session.access_token && data.user) {
          // Set Supabase session cookie with the real access token
          res.setHeader('Set-Cookie', `supabase_auth_token=${data.session.access_token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${Math.floor(data.session.expires_in / 1000)}`);
          return res.status(200).json({
            success: true,
            authenticated: true,
            session: data.session.access_token,
            user: data.user,
            demo: false
          });
        } else {
          // Clear any existing cookie
          res.setHeader('Set-Cookie', 'supabase_auth_token=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict');
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
        // Clear cookie on error
        res.setHeader('Set-Cookie', 'supabase_auth_token=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict');
        return res.status(200).json({
          success: false,
          authenticated: false,
          error: 'Oturum yoxlanmada xəta baş verdi.',
          demo: true
        });
      });
  } catch (err) {
    console.error('Session check exception:', err);
    res.setHeader('Set-Cookie', 'supabase_auth_token=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict');
    return res.status(200).json({
      success: false,
      authenticated: false,
      error: 'Oturum yoxlanmada xəta baş verdi.',
      demo: true
    });
  }
}

async function handleAuthOperations(req, res) {
  const { action } = req.body;

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(503).json({
      success: false,
      error: 'Server xətası: Supabase konfigurasiya yoxdur.',
    });
  }

  if (action === 'login') {
    return handleLoginOperation(req, res, supabaseUrl, supabaseAnonKey);
  }

  if (action === 'register') {
    return handleRegisterOperation(req, res, supabaseUrl, supabaseAnonKey);
  }

  if (action === 'logout') {
    return handleLogoutOperation(req, res, supabaseUrl, supabaseAnonKey);
  }

  return res.status(400).json({
    success: false,
    error: 'Bilinməyən əmrlə.',
  });
}

async function handleLoginOperation(req, res, supabaseUrl, supabaseAnonKey) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'İstifadəçi adı və ya şifrə daxil edin.',
    });
  }

  // Supabase login
  const { data, error } = await fetch(`${supabaseUrl}/auth/v1/signin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
    },
    body: JSON.stringify({ email, password })
  })
    .then(resp => {
      if (!resp.ok) throw new Error('Login failed');
      return resp.json();
    })
    .then(data => {
      if (data.session && data.session.access_token && data.user) {
        // Set Supabase session cookie
        res.setHeader('Set-Cookie', `supabase_auth_token=${data.session.access_token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${Math.floor(data.session.expires_in / 1000)}`);
        return res.status(200).json({
          success: true,
          user: data.user,
          session: data.session.access_token,
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
        error: 'Xəta baş verdi. Yanläs credentials.',
      });
    });
}

async function handleRegisterOperation(req, res, supabaseUrl, supabaseAnonKey) {
  const { username, email, password } = req.body;

  // Validate inputs
  if (!username || !email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Bütün sahəlarni doldurun.',
    });
  }

  // Validate username format: only letters, numbers, underscores, min 3 chars
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
    return res.status(400).json({
      success: false,
      error: 'İstifadəçi adı formatı yoxdu. Yalnız hərf, rəqəm və alt xətt (_). Minimum 3 simvol.',
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: 'Zəhmət olmasa düzgün e-poçt ünvanı daxil edin.',
    });
  });

  // Validate password length
  if (password.length < 6 || password.length > 16) {
    return res.status(400).json({
      success: false,
      error: 'Şifrə 6–16 simvol arasında olmalıdır.',
    });
  });

  // Validate password complexity
  if (!/(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*.,?])./.test(password)) {
    return res.status(400).json({
      success: false,
      error: 'Şifrə ən azı 1 hərf, 1 rəqəm və 1 xüsusi simvol (@#$%&*) içərsənmalıdır.',
    });
  }

  try {
    // Register via Supabase Auth - email verification disabled
    const { data, error } = await fetch(`${supabaseUrl}/auth/v1/signUp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({
        email,
        password,
        options: {
          data: {
            username: username,
          },
          // Do NOT confirm email — per requirements, email verification is disabled
          emailRedirectTo: `${supabaseUrl}/auth/callback`,
        },
      })
    })
      .then(resp => resp.json())
      .then(data => {
        if (data.user) {
          // Registration successful
          // Set session cookie with Supabase access token
          const expiresIn = data.session?.expires_in ? Math.floor(data.session.expires_in / 1000) : 86400;
          res.setHeader('Set-Cookie', `supabase_auth_token=${data.session.access_token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${expiresIn}`);
          return res.status(201).json({
            success: true,
            user: data.user,
            requireEmailVerification: false,
            message: 'Qeydiyyat uğurla tamamlandı. E-poçt doğrulaması tələb edilmir.',
          });
        } else {
          // Registration failed
          let errorMsg = 'Qeydiyyat xətası';
          if (error && error.message) {
            errorMsg = error.message;
          }
          if (error && error.description) {
            if (error.description.includes('already been taken') || error.description.includes('duplicate')) {
              errorMsg = 'Bu e-poçt ünvanı allaqen istifadə ediliyor.';
            } else if (error.description.includes('too short')) {
              errorMsg = 'Şifrə too short (min 6 simvol)';
            }
          }
          return res.status(400).json({
            success: false,
            error: errorMsg,
          });
        }
      })
      .catch(err => {
        console.error('Register operation error:', err);
        return res.status(500).json({
          success: false,
          error: 'Server xətası baş verdi.',
        });
      });
  } catch (err) {
    console.error('Register operation exception:', err);
    return res.status(500).json({
      success: false,
      error: 'Server xətası baş verdi.',
    });
  }
}

async function handleLogoutOperation(req, res, supabaseUrl, supabaseAnonKey) {
  try {
    // Call Supabase signout
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
  } catch (err) {
    console.error('Logout exception:', err);
    // Clear cookie even on exception
    res.setHeader('Set-Cookie', 'supabase_auth_token=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict');
    return res.status(200).json({
      success: true,
      message: 'Sistemdən çıxış etdiniz (xahta görə).'
    });
  }
}