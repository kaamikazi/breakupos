-- Public social profiles + message requests.
-- Run after supabase/schema.sql and supabase/social-schema.sql. Safe to rerun.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS public_bio TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS public_vibe TEXT DEFAULT 'figuring_it_out';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS public_profile_visible BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_public_vibe_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_public_vibe_check CHECK (public_vibe IN ('healing', 'dating', 'no_contact', 'figuring_it_out', 'glow_up'));

UPDATE public.profiles
SET username = left(
  lower(trim(both '_' from regexp_replace(COALESCE(display_name, split_part(email, '@', 1), 'user'), '[^a-zA-Z0-9_]+', '_', 'g'))) || '_' || substr(id::text, 1, 6),
  30
)
WHERE username IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username) WHERE username IS NOT NULL;

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
CREATE POLICY "Users can view public profiles" ON public.profiles FOR SELECT USING (public_profile_visible = TRUE);

DROP POLICY IF EXISTS "Users can view own message requests" ON public.message_requests;
CREATE POLICY "Users can view own message requests" ON public.message_requests FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);
DROP POLICY IF EXISTS "Users can insert sent message requests" ON public.message_requests;
CREATE POLICY "Users can insert sent message requests" ON public.message_requests FOR INSERT WITH CHECK (auth.uid() = sender_id);
DROP POLICY IF EXISTS "Receivers can update incoming message requests" ON public.message_requests;
CREATE POLICY "Receivers can update incoming message requests" ON public.message_requests FOR UPDATE USING (auth.uid() = receiver_id) WITH CHECK (auth.uid() = receiver_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_message_requests_pending_pair ON public.message_requests(sender_id, receiver_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_message_requests_receiver_created ON public.message_requests(receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_requests_sender_created ON public.message_requests(sender_id, created_at DESC);
