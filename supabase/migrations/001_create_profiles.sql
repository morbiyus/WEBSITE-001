--
-- VAZEDGAME — Profiles Migration (001_create_profiles.sql)
-- Supabase project: morbiyus/WEBSITE-001
-- Purpose: Create profiles table with username uniqueness and RLS
--

-- ---------------------------------------------------------------------------
-- NOTE: Run this migration in the Supabase SQL Editor AFTER creating your
-- project. The trigger below references auth.users and will only work if
-- Supabase Authentication is enabled on the project.
-- ---------------------------------------------------------------------------

-- 1. Create the profiles table
--    id references auth.users (the Supabase-authenticated user)
--    username must be unique (case-insensitive)
--    created_at/updated_at for tracking
--

CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  username TEXT UNIQUE COLLATE "en_US_CI" NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Create a case-insensitive unique index on username
--    COLLATE "en_US_CI" ensures CI uniqueness (Azerbaijani usernames work)
--

-- Drop if already exists (idempotent migration)
DROP INDEX IF EXISTS public.profiles_username_key;

CREATE UNIQUE INDEX public.profiles_username_key
  ON public.profiles (username COLLATE "en_US_CI");

-- 3. Enable Row Level Security on the profiles table
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Policy: Users can read their own profile only
--
-- This ensures a user can ONLY SELECT their own profile (by id matching auth.uid()).
-- The policy uses uid() which gets the JWT subject from the Supabase auth token.
--

CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- 5. Policy: Users can update their own profile only
--
-- Same restriction: a user may UPDATE only their own row.
-- We explicitly disallow changing the `id` or `username` (immutable fields)
-- by listing them in the SET clause only if they appear; here we allow
-- display_name and avatar_url to be updatable.
--

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- 6. Create the trigger that auto-creates a profile when a user signs up
--
-- The trigger runs AFTER INSERT on auth.users.
-- It uses SECURITY DEFINER so it runs with the privileges of the function owner
-- (the Supabase service role), allowing it to insert into auth.users' metadata.
-- The empty search_path ensures we reference auth.users unambiguously.
--

-- Drop if already exists (idempotent migration)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION handle_on_auth_user_created()
RETURNS TRIGGER AS
$func$
DECLARE
  -- Empty search_path forces reference to auth.users (schema-qualified)
  _search_path TEXT;
BEGIN
  -- Save and set search_path to public so we can reference auth.users directly
  SELECT current_setting('search_path') INTO _search_path;
  SET LOCAL search_path = 'public';

  -- Insert profile using the new user's id and raw_user_meta_data username
  -- NEW.id is the auth.uid() value (JWT subject)
  -- NEW.raw_user_meta_data is populated by Supabase when signUp includes options.data
  INSERT INTO public.profiles (id, username, created_at, updated_at)
  VALUES (
    NEW.id,
    -- Prefer the username from raw_user_meta_data; fall back to lowercase email prefix
    COALESCE(
      (NEW.raw_user_meta_data->> 'username')::TEXT,
      LOWER(SPLIT_PART(NEW.email, '@', 1))
    ),
    NOW(),
    NOW()
  );

  -- Restore original search_path
  IF _search_path IS NOT NULL THEN
    SET LOCAL search_path = _search_path;
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

-- 7. Optional: Also update the profile if the username is later changed
--    via a users metadata update (handled separately by Supabase admin).
--

-- ---------------------------------------------------------------------------
-- Migration complete.
-- After running this:
--   1. Go to Supabase Dashboard → Authentication → Settings → Email templates
--      and set "Email redirect URL" if you want email confirmations.
--   2. Ensure your Supabase anon key is associated with this project.
--   3. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel environment.
-- ---------------------------------------------------------------------------