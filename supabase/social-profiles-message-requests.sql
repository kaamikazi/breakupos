-- Public social profiles + message requests.
-- Superseded by security-hardening-beta.sql. Run hardening migration last.
-- Run after supabase/schema.sql and supabase/social-schema.sql. Safe to rerun.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS public_display_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS public_bio TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS social_vibe TEXT DEFAULT 'figuring_it_out';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS public_vibe TEXT DEFAULT 'figuring_it_out';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS public_profile_visible BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS public_location TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMPTZ;
UPDATE public.profiles SET public_profile_visible = TRUE WHERE public_profile_visible IS NULL;
ALTER TABLE public.profiles ALTER COLUMN public_profile_visible SET NOT NULL;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_social_vibe_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_social_vibe_check CHECK (social_vibe IN ('healing', 'dating', 'no_contact', 'figuring_it_out', 'glow_up'));
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_public_vibe_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_public_vibe_check CHECK (public_vibe IN ('healing', 'dating', 'no_contact', 'figuring_it_out', 'glow_up'));

UPDATE public.profiles
SET username = left(
  lower(trim(both '_' from regexp_replace(COALESCE(public_display_name, display_name, 'user'), '[^a-zA-Z0-9_]+', '_', 'g'))) || '_' || substr(id::text, 1, 6),
  30
)
WHERE username IS NULL;

UPDATE public.profiles
SET public_display_name = NULLIF(trim(display_name), '')
WHERE public_display_name IS NULL AND NULLIF(trim(display_name), '') IS NOT NULL;

DROP INDEX IF EXISTS public.idx_profiles_username;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower_unique ON public.profiles(lower(username)) WHERE username IS NOT NULL;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('new_match', 'new_message', 'message_request', 'report_update', 'weekly_summary'));

CREATE TABLE IF NOT EXISTS public.message_requests (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_post_id UUID REFERENCES public.social_posts(id) ON DELETE SET NULL,
  message_text   TEXT DEFAULT '' CHECK (char_length(message_text) <= 240),
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (sender_id <> receiver_id)
);

DROP TRIGGER IF EXISTS update_message_requests_updated_at ON public.message_requests;
CREATE TRIGGER update_message_requests_updated_at
BEFORE UPDATE ON public.message_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.message_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view public profiles" ON public.profiles;
CREATE POLICY "Users can view public profiles" ON public.profiles FOR SELECT USING (auth.uid() IS NOT NULL AND public_profile_visible = TRUE);

DROP POLICY IF EXISTS "Users can view own message requests" ON public.message_requests;
CREATE POLICY "Users can view own message requests" ON public.message_requests FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);
DROP POLICY IF EXISTS "Users can insert sent message requests" ON public.message_requests;
CREATE POLICY "Users can insert sent message requests" ON public.message_requests FOR INSERT WITH CHECK (
  auth.uid() = sender_id
  AND sender_id <> receiver_id
  AND EXISTS (
    SELECT 1 FROM public.profiles receiver
    WHERE receiver.id = receiver_id
      AND receiver.public_profile_visible = TRUE
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.user_blocks blocks
    WHERE blocks.blocker_user_id = sender_id
      AND blocks.blocked_user_id = receiver_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.user_blocks blocks
    WHERE blocks.blocker_user_id = receiver_id
      AND blocks.blocked_user_id = sender_id
  )
  AND (
    source_post_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.social_posts source_post
      WHERE source_post.id = source_post_id
        AND source_post.user_id = receiver_id
        AND source_post.is_deleted = FALSE
    )
  )
);
DROP POLICY IF EXISTS "Receivers can update incoming message requests" ON public.message_requests;
CREATE POLICY "Receivers can update incoming message requests" ON public.message_requests FOR UPDATE USING (auth.uid() = receiver_id AND status = 'pending') WITH CHECK (
  auth.uid() = receiver_id
  AND sender_id <> receiver_id
  AND status IN ('accepted', 'declined', 'blocked')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_message_requests_pending_pair ON public.message_requests(sender_id, receiver_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_message_requests_receiver_created ON public.message_requests(receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_requests_sender_created ON public.message_requests(sender_id, created_at DESC);
