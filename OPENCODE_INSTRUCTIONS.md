# VAZEDGAME - OpenCode Otomasyon Görevleri
# Bu script senin yerinde çalışabilecek her şeyi yapar.
# YAPAMAYACAKLARI (Dashboard/UI işlemleri) SONUÇ RAPORUNDA BELİRT.

## ⚠️ BAŞLANGIÇ KONTROLÜ
- Proje kök dizinindeyim: `pwd` → `C:\Users\vasif\VAZEDGAME`
- Git status temiz mi? `git status`
- Node/npm var mı? `node -v && npm -v`

---

## 1. DOSYA GÜNCELLEMELERİ (File System)

### 1.1 Migration Dosyası Güncelle
**Dosya:** `supabase/migrations/001_create_profiles.sql`  
**İçerik:** Aşağıdaki SQL ile **tamamen değiştir** (eskiyi sil, bunu yaz):

```sql
-- VAZEDGAME — Final Profiles Migration (Fixed Index Syntax)
-- Supabase SQL Editor'da tek seferde çalıştır

-- 1. Tablo oluştur
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  username_lower TEXT GENERATED ALWAYS AS (LOWER(username)) STORED
);

-- 2. Case-insensitive unique index (schema prefix index adından KALDIRILDI)
DROP INDEX IF EXISTS profiles_username_unique;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique
  ON public.profiles (username_lower);

-- 3. RLS Etkinleştir
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Politikalar
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 5. Trigger Fonksiyonu
CREATE OR REPLACE FUNCTION public.handle_on_auth_user_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $func$
BEGIN
  INSERT INTO public.profiles (
    id, username, created_at, updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'username', ''),
      'vazed_user_' || SUBSTR(NEW.id::TEXT, 1, 8)
    ),
    NOW(), NOW()
  );
  RETURN NEW;
END;
$func$;

-- 6. Trigger Kaydı
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_on_auth_user_created();

-- 7. Eski kullanıcılar için backfill
INSERT INTO public.profiles (id, username, created_at, updated_at)
SELECT
  u.id,
  COALESCE(
    NULLIF((u.raw_user_meta_data ->> 'username')::TEXT, ''),
    'vazed_user_' || SUBSTR(u.id::TEXT, 1, 8)
  ),
  u.created_at,
  NOW()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- 8. Email doğrulama kapatıldıysa eski kullanıcıları onayla
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;
```

### 1.2 API Route: Register
**Dosya:** `api/auth/register.js` → **Yenisiyle değiştir:**

```javascript
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
```

### 1.3 API Route: Session (Login + Check + Refresh)
**Dosya:** `api/auth/session.js` → **Yenisiyle değiştir:**

```javascript
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
```

### 1.4 API Route: Logout
**Dosya:** `api/auth/logout.js` → **Yenisiyle değiştir:**

```javascript
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
```

### 1.5 Package.json - Cookie Dependency
**Dosya:** `package.json`  
**İşlem:** `dependencies` içine `"cookie": "^0.6.0"` ekle (yoksa).  
**Komut:** `npm install cookie` (veya `pnpm add cookie` / `yarn add cookie`)

---

## 2. TERMİNAL / CLI İŞLEMLERİ (Supabase Migration & Git)

### 2.1 Supabase CLI Kurulu mu?
```bash
supabase --version
```
Yoksa: `npm install -g supabase` (veya `brew install supabase/tap/supabase`)

### 2.2 Supabase Login & Link (Proje zaten linkliyse atla)
```bash
supabase login
supabase link --project-ref nfjypyddttyzeviqezqi
```

### 2.3 Migration Çalıştır (DB Push)
```bash
supabase db push
```
**Beklenen:** `Finished supabase db push.` / `Applied migration 2024..._create_profiles.sql`

> ⚠️ Eğer `supabase db push` hata verirse (örn. index hatası), **SQL'i manuel çalıştırmak için** şu komutu ver:
```bash
supabase db execute --file supabase/migrations/001_create_profiles.sql
```

### 2.4 Migration Doğrulama
```bash
supabase db execute --sql "SELECT count(*) FROM public.profiles; SELECT tgname FROM pg_trigger WHERE tgrelid = 'auth.users'::REGCLASS;"
```

### 2.5 Git Commit & Push
```bash
git add supabase/migrations/001_create_profiles.sql api/auth/ package.json package-lock.json 2>/dev/null
git commit -m "fix: auth hardening, service role username check, lax cookies, demo gate, idempotent migration"
git push origin main
```

---

## 3. YAPAMAYACAĞIN İŞLEMLER (MANUEL GEREKLİ)
**Bu işleri BEN (kullanıcı) yapacağım. Sen sadece SONUÇ RAPORUNA yaz ki "MANUEL GEREKLİ".**

| # | İşlem | Platform | Nasıl Yapılır |
|---|-------|----------|---------------|
| 1 | **Vercel API Token İptal Et** | Vercel Dashboard | Settings → Tokens → `vck_5W6VPP3r...` → Revoke |
| 2 | **Yeni Vercel Token Oluştur** (gerekirse) | Vercel Dashboard | Settings → Tokens → Create |
| 3 | **Env Vars Ekle/Güncelle** | Vercel Dashboard | Settings → Env Variables → Production'a 4 key ekle |
| 4 | **Email Confirmation OFF** | Supabase Dashboard | Auth → Settings → Email → Confirm email: OFF |
| 5 | **Allow Signups ON** | Supabase Dashboard | Auth → Settings → Email → Allow signups: ON |
| 6 | **Service Role Key Kopyala** | Supabase Dashboard | Settings → API → `service_role` key |

**Vercel Env Vars (Production):**
```
SUPABASE_URL=https://nfjypyddttyzeviqezqi.supabase.co
SUPABASE_ANON_KEY=<mevcut anon key>
SUPABASE_SERVICE_ROLE_KEY=<supabase dashboard'dan kopyalanacak service_role key>
DEMO_MODE=false
```

---

## 4. SONUÇ RAPORU FORMATI
Tüm işlemler bittiğinde **şu formatta** bana (kullanıcıya) mesaj ver:

```
=== OPENCODE SONUÇ RAPORU ===

✅ DOSYA GÜNCELLEMELERİ:
- supabase/migrations/001_create_profiles.sql: BAŞARILI
- api/auth/register.js: BAŞARILI
- api/auth/session.js: BAŞARILI
- api/auth/logout.js: BAŞARILI
- package.json (cookie eklendi): BAŞARILI

✅ TERMİNAL/CLI:
- supabase db push: BAŞARILI / HATA: <mesaj>
- git commit & push: BAŞARILI / HATA: <mesaj>
- Migration doğrulama (profiles count): <sayı> satır
- Trigger doğrulama: on_auth_user_created VAR/YOK

⚠️ MANUEL GEREKLİ (Ben yapacağım):
- [ ] Vercel Token iptal + yeni token
- [ ] Vercel Env Vars (4 adet)
- [ ] Supabase Auth: Email Confirmation OFF
- [ ] Supabase Auth: Allow Signups ON
- [ ] Service Role Key Vercel'e eklendi

🌐 DEPLOY:
- Vercel Build: BAŞARILI / BEKLEMEDE / HATA
- Production URL: https://vazedgame.vercel.app

📝 NOTLAR:
<Herhangi bir hata, uyarı, takılma noktası buraya>
```

---

## 5. BAŞLATMA KOMUTU
Bu dosyayı okuduğuna göre **HEMEN BAŞLA**.  
Sıra:
1. Dosya yazmaları (1.1 - 1.5)
2. Terminal komutları (2.1 - 2.5)
3. Rapor yaz (Bölüm 4 formatında)

**İlk komut:** `pwd && ls -la` → proje kökünde olduğunu doğrula.

**Hazırsan başlat.**