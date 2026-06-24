-- Public social profile fields for production.
-- Run before deploying code that selects profiles.username.
-- Safe to rerun.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS public_bio TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS public_profile_visible BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS social_vibe TEXT DEFAULT 'figuring_it_out';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS public_vibe TEXT DEFAULT 'figuring_it_out';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS public_location TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMPTZ;

UPDATE public.profiles
SET public_profile_visible = TRUE
WHERE public_profile_visible IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN public_profile_visible SET DEFAULT TRUE,
  ALTER COLUMN public_profile_visible SET NOT NULL;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_format_check;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_social_vibe_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_public_vibe_check;

UPDATE public.profiles
SET
  bio = COALESCE(NULLIF(bio, ''), public_bio, ''),
  public_bio = COALESCE(NULLIF(public_bio, ''), bio, ''),
  social_vibe = COALESCE(NULLIF(social_vibe, ''), public_vibe, 'figuring_it_out'),
  public_vibe = COALESCE(NULLIF(public_vibe, ''), social_vibe, 'figuring_it_out');

DROP INDEX IF EXISTS public.idx_profiles_username;
DROP INDEX IF EXISTS public.idx_profiles_username_lower_unique;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_key;

DO $$
DECLARE
  profile_record RECORD;
  raw_seed TEXT;
  base_username TEXT;
  candidate_username TEXT;
  suffix TEXT;
BEGIN
  FOR profile_record IN
    SELECT id, display_name, username
    FROM public.profiles
    ORDER BY created_at NULLS LAST, id
  LOOP
    raw_seed := COALESCE(NULLIF(profile_record.username, ''), NULLIF(profile_record.display_name, ''), 'user');
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
      AND (
        username IS NULL
        OR username = ''
        OR username !~ '^[a-z0-9_-]{3,30}$'
        OR EXISTS (
          SELECT 1
          FROM public.profiles duplicate_profile
          WHERE duplicate_profile.id <> profile_record.id
            AND duplicate_profile.username IS NOT NULL
            AND lower(duplicate_profile.username) = lower(public.profiles.username)
        )
      );
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower_unique
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_social_vibe_check
  CHECK (social_vibe IN ('healing', 'dating', 'no_contact', 'figuring_it_out', 'glow_up'));

ALTER TABLE public.profiles ADD CONSTRAINT profiles_public_vibe_check
  CHECK (public_vibe IN ('healing', 'dating', 'no_contact', 'figuring_it_out', 'glow_up'));

ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_format_check
  CHECK (username IS NULL OR username ~ '^[a-z0-9_-]{3,30}$');
