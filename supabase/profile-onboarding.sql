-- Breakup OS launch migration: required first-time profile onboarding.
--
-- Safe run instructions:
-- 1. Run this in Supabase SQL editor before deploying onboarding-gated code.
-- 2. It is rerunnable.
-- 3. Vercel deploys do not update Supabase schema automatically.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS public_display_name TEXT,
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_reasons TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS first_goal TEXT,
  ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS public_profile_visible BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_format_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_key;
DROP INDEX IF EXISTS public.idx_profiles_username_lower_unique;
DROP INDEX IF EXISTS public.profiles_username_lower_unique;

UPDATE public.profiles
SET public_profile_visible = TRUE
WHERE public_profile_visible IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN public_profile_visible SET DEFAULT TRUE,
  ALTER COLUMN public_profile_visible SET NOT NULL;

UPDATE public.profiles
SET public_display_name = NULLIF(trim(display_name), '')
WHERE public_display_name IS NULL
  AND NULLIF(trim(display_name), '') IS NOT NULL;

UPDATE public.profiles
SET username = left(lower(trim(both '_-' from regexp_replace(COALESCE(public_display_name, display_name, 'user'), '[^a-zA-Z0-9_-]+', '_', 'g'))), 13) || '-' || substr(id::text, 1, 6)
WHERE username IS NULL OR trim(username) = '';

UPDATE public.profiles
SET username = left(lower(trim(both '_-' from regexp_replace(username, '[^a-zA-Z0-9_-]+', '_', 'g'))), 20)
WHERE username IS NOT NULL;

UPDATE public.profiles
SET username = 'user-' || substr(id::text, 1, 6)
WHERE username IS NULL OR length(username) < 3;

DO $$
DECLARE
  duplicate_record RECORD;
BEGIN
  FOR duplicate_record IN
    SELECT id, username, row_number() OVER (PARTITION BY lower(username) ORDER BY created_at NULLS LAST, id) AS duplicate_rank
    FROM public.profiles
    WHERE username IS NOT NULL
  LOOP
    IF duplicate_record.duplicate_rank > 1 THEN
      UPDATE public.profiles
      SET username = left(lower(trim(both '_-' from regexp_replace(duplicate_record.username, '[^a-zA-Z0-9_-]+', '_', 'g'))), 13) || '-' || substr(duplicate_record.id::text, 1, 6)
      WHERE id = duplicate_record.id;
    END IF;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_unique
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_format_check
  CHECK (username IS NULL OR username ~ '^[a-z0-9_-]{3,20}$');

CREATE INDEX IF NOT EXISTS idx_profiles_profile_completed
  ON public.profiles(profile_completed_at)
  WHERE profile_completed_at IS NOT NULL;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view public profiles" ON public.profiles;
CREATE POLICY "Users can view public profiles" ON public.profiles
  FOR SELECT
  USING (public_profile_visible = TRUE);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
