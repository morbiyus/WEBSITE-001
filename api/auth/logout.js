import { NextResponse } from 'next/server';
import { serialize } from 'cookie';

export async function POST(req) {
  const cookies = req.headers.get('cookie') || '';
  const refreshToken = cookies.match(/supabase_refresh_token=([^;]+)/)?.[1];

  if (refreshToken && process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    try {
      await fetch(`${process.env.SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: process.env.SUPABASE_ANON_KEY },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
    } catch {}
  }

  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0)
  };

  const nextRes = NextResponse.json({ success: true });
  nextRes.headers.set('Set-Cookie', [
    serialize('supabase_access_token', '', opts),
    serialize('supabase_refresh_token', '', opts)
  ]);
  return nextRes;
}