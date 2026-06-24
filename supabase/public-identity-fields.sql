-- Public identity fields for social surfaces.
-- Run in Supabase before/with deploy. Safe to rerun.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS public_display_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS public_profile_visible BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS social_vibe TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS public_location TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMPTZ;

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

DROP INDEX IF EXISTS public.idx_profiles_username;
DROP INDEX IF EXISTS public.idx_profiles_username_lower_unique;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_key;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_format_check;

DO $$
DECLARE
  profile_record RECORD;
  raw_seed TEXT;
  base_username TEXT;
  candidate_username TEXT;
  suffix TEXT;
BEGIN
  FOR profile_record IN
    SELECT id, public_display_name, display_name, username
    FROM public.profiles
    ORDER BY created_at NULLS LAST, id
  LOOP
    raw_seed := COALESCE(NULLIF(profile_record.public_display_name, ''), NULLIF(profile_record.display_name, ''), 'user');
    base_username := lower(regexp_replace(raw_seed, '[^a-zA-Z0-9_-]+', '_', 'g'));
    base_username := regexp_replace(base_username, '^[_-]+|[_-]+$', '', 'g');
    base_username := left(base_username, 20);

    IF char_length(base_username) < 3 THEN
      base_username := 'user';
    END IF;

    suffix := substr(replace(profile_record.id::text, '-', ''), 1, 8);
    candidate_username := left(base_username || '-' || suffix, 30);

    UPDATE public.profiles
    SET username = candidate_username
    WHERE id = profile_record.id
      AND (username IS NULL OR username = '' OR username !~ '^[a-z0-9_-]{3,30}$');
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower_unique
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_format_check
  CHECK (username IS NULL OR username ~ '^[a-z0-9_-]{3,30}$');
