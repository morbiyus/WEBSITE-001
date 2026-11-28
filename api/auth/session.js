import { NextResponse } from 'next/server';
import { serialize } from 'cookie';

function setAuthCookies(res, accessToken, refreshToken) {
  const secure = process.env.NODE_ENV === 'production';
  const opts = {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30
  };
  res.headers.set('Set-Cookie', [
    serialize('supabase_access_token', accessToken, opts),
    serialize('supabase_refresh_token', refreshToken, { ...opts, maxAge: 60 * 60 * 24 * 30 })
  ]);
}

export async function POST(req) {
  const { action, email, password, refreshToken } = await req.json();
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: 'Server xətası: Supabase konfiqurasiyası yoxdur.' }, { status: 500 });
  }

  if (action === 'login' && email && password) {
    const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: anonKey },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: 'Yanlış e-poçt və ya şifrə. Daxil olma imkan yoxdur.' }, { status: 401 });
    }
    const nextRes = NextResponse.json({ success: true, user: data.user });
    setAuthCookies(nextRes, data.access_token, data.refresh_token);
    return nextRes;
  }

  if (action === 'check') {
    const cookies = req.headers.get('cookie') || '';
    const accessToken = cookies.match(/supabase_access_token=([^;]+)/)?.[1];

    if (accessToken) {
      const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` }
      });
      if (userRes.ok) {
        const user = await userRes.json();
        return NextResponse.json({ success: true, user });
      }
    }

    if (refreshToken) {
      const refRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: anonKey },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
      if (refRes.ok) {
        const tokens = await refRes.json();
        const nextRes = NextResponse.json({ success: true, user: tokens.user });
        setAuthCookies(nextRes, tokens.access_token, tokens.refresh_token);
        return nextRes;
      }
    }

    return NextResponse.json({ error: 'Oturum tapılmadı.' }, { status: 401 });
  }

  return NextResponse.json({ error: 'Naməlum əməliyyat.' }, { status: 400 });
}