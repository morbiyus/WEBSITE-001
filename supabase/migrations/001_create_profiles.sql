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