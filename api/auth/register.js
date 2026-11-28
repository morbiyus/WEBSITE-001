/**
 * VAZEDGAME — Register
 *
 * Endpoint: POST /api/auth/register
 *
 * Register a new user via Supabase Auth.
 * Creates user account with username stored as metadata.
 * Email verification is disabled — user may register without confirming email.
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

  const { username, email, password } = req.body;

  // Validate required fields
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
      error: 'İstifadəçi adı yalnız hərf, rəqəm və alt xətt (_) istifadə edə bilərsiniz. Minimum 3 simvol.',
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: 'Zəhmət olmasa düzgün e-poçt ünvanı daxil edin.',
    });
  }

  // Validate password length
  if (password.length < 6 || password.length > 16) {
    return res.status(400).json({
      success: false,
      error: 'Şifrə 6–16 simvol arasında olmalıdır.',
    });
  }

  // Validate password contains at least one letter, one number, one special character
  if (!/(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*.,?])./.test(password)) {
    return res.status(400).json({
      success: false,
      error: 'Şifrə ən azı 1 hərf, 1 rəqəm və 1 xüsusi simvol (@#$%&*) içərsənmalıdır.',
    });
  }

  // Use Supabase Auth to register the user
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(503).json({
      success: false,
      error: 'Server xətası: Supabase konfigurasiya yoxdur.',
    });
  }

  try {
    // Register user via Supabase Auth
    const registerResp = await fetch(`${supabaseUrl}/auth/v1/signup`, {
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
      }),
    });

    const registerData = await registerResp.json();

    // Handle registration response
    if (registerResp.ok) {
      // Registration successful — user created in Supabase Auth
      // Username stored in user metadata
      // No email verification sent per requirements
      return res.status(201).json({
        success: true,
        user: registerData.user,
        requireEmailVerification: false,
        message: 'Qeydiyyat uğurla tamamlandı. E-poçt doğrulaması tələb edilmir.',
      });
    } else {
      // Handle specific Supabase errors
      let errorMessage = 'Qeydiyyat xətası';
      if (registerData.message) {
        errorMessage = registerData.message;
      }
      if (registerData.description) {
        // Check for duplicate email error
        if (registerData.description.includes('already been taken') ||
            registerData.description.includes('duplicate')) {
          errorMessage = 'Bu e-poçt ünvanı allaqen istifadə ediliyor.';
        }
        // Check for duplicate username - this occurs when the username already
        // exists in the profiles table (enforced by DB UNIQUE constraint)
        else if (registerData.description &&
                 (registerData.description.includes('username') ||
                  registerData.description.includes('unique constraint'))) {
          errorMessage = 'Bu istifadəçi adı allaqen daxil olub.';
        } else if (registerData.description.includes('too short')) {
          errorMessage = 'Şifrə too short (min 6 simvol)';
        }
      }

      return res.status(400).json({
        success: false,
        error: errorMessage,
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server xətası baş verdi.',
    });
  }
}