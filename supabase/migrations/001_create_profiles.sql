--
-- VAZEDGAME — Profiles Migration (001_create_profiles.sql)
-- Supabase project: morbiyus/WEBSITE-001
-- Purpose: Create profiles table with username uniqueness and RLS
--

-- ---------------------------------------------------------------------------
-- 1. Create the profiles table
--    id references auth.users (the Supabase-authenticated user)
--    username must be unique (case-insensitive via LOWER())
--    display_name optional, avatar_url optional
--    created_at/updated_at for tracking
-- ---------------------------------------------------------------------------

CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT username_not_null CHECK (username IS NOT NULL)
);

-- 2. Create a case-insensitive unique index on username using LOWER()
--    This replaces COLLATE "en_US_CI" with a reliable function-based index.
--    IDempotent: uses DROP + CREATE.

DROP INDEX IF EXISTS public.profiles_username_key;

CREATE UNIQUE INDEX public.profiles_username_unique
  ON public.profiles (LOWER(username));

-- 3. Enable Row Level Security on the profiles table
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Policy: Users can read their own profile only
--    Idempotent: DROP IF EXISTS first

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- 5. Policy: Users can update their own profile only
--

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- 6. Create the trigger that auto-creates a profile when a user signs up
--

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION handle_on_auth_user_created()
RETURNS TRIGGER AS
$func$
DECLARE
  -- Empty search_path forces reference to auth.users (schema-qualified only)
  _search_path TEXT;
BEGIN
  -- Save and set search_path to empty string so we can reference auth.users directly
  SELECT current_setting('search_path') INTO _search_path;
  SET search_path = '';

  -- Insert profile using the new user's id and raw_user_meta_data username.
  -- The signup flow (frontend + server) always sends a valid username
  -- in the range 3-30 chars with only letters, numbers, underscores.
  -- We prefer this username from metadata over any generated fallback.
  INSERT INTO public.profiles (id, username, created_at, updated_at)
  VALUES (
    NEW.id,
    -- Use the username from raw_user_meta_data if available.
    -- If somehow missing, fall back to 'user' (4 chars, valid).
    COALESCE(
      NULLIF(
        (NEW.raw_user_meta_data->> 'username')::TEXT,
        ''
      ),
      'user'
    ),
    NOW(),
    NOW()
  );

  -- Restore original search_path
  IF _search_path IS NOT NULL THEN
    SET search_path = _search_path;
  END IF;

  -- Important: Do NOT modify NEW inside an AFTER INSERT trigger.
  -- The INSERT above creates a new row in profiles; we do not alter NEW.
  RETURN NEW;
END
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach the trigger to auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE handle_on_auth_user_created();

-- ---------------------------------------------------------------------------
-- Migration complete.
-- After running this:
--   1. Go to Supabase Dashboard → Authentication → Settings → Email templates
--      and set "Email redirect URL" if you want email confirmations.
--      Email confirmation is currently DISABLED per product decision.
--   2. Ensure your Supabase anon key is associated with this project.
--   3. Set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel environment.
-- ---------------------------------------------------------------------------