import { NextResponse } from 'next/server';

export async function POST(req) {
  const isDemo = process.env.DEMO_MODE === 'true' && !process.env.SUPABASE_URL;
  
  if (isDemo) {
    return NextResponse.json({ success: true, demo: true });
  }

  const { email, password, username } = await req.json();

  if (!email || !password || !username) {
    return NextResponse.json({ error: 'Bütün sahəlarni doldurun.' }, { status: 400 });
  }

  const userRegex = /^[a-zA-Z0-9_]{3,30}$/;
  if (!userRegex.test(username)) {
    return NextResponse.json({ error: 'İstifadəçi adı 3-30 simvol, hərf/rəqəm/_ olmalıdır.' }, { status: 400 });
  }

  const passRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,16}$/;
  if (!passRegex.test(password)) {
    return NextResponse.json({ error: 'Şifrə 6-16 simvol, hərf+rəqəm+xüsusi simvol ehtiva etməlidir.' }, { status: 400 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceKey) {
    const usernameLower = username.toLowerCase().trim();
    const checkRes = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id&username_lower=eq.${encodeURIComponent(usernameLower)}&limit=1`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`
      }
    });
    if (checkRes.ok) {
      const rows = await checkRes.json();
      if (rows.length > 0) {
        return NextResponse.json({ error: 'Bu istifadəçi adı allaqen daxil olub.' }, { status: 409 });
      }
    }
  }

  try {
    const signupRes = await fetch(`${supabaseUrl}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: process.env.SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        email,
        password,
        data: { username }
      })
    });

    const signupData = await signupRes.json();

    if (!signupRes.ok) {
      if (signupData?.message?.includes('already registered')) {
        return NextResponse.json({ error: 'Bu e-poçt ünvanı allaqen istifadə ediliyor.' }, { status: 409 });
      }
      return NextResponse.json({ error: signupData?.message || 'Qeydiyyat xətası.' }, { status: signupRes.status });
    }

    return NextResponse.json({ success: true, requireEmailVerification: false });
  } catch (err) {
    return NextResponse.json({ error: 'Server xətası: Supabase konfiqurasiyası yoxdur.' }, { status: 500 });
  }
}