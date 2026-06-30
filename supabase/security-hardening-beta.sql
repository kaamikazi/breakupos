-- BreakupOS beta security hardening.
-- Safe to rerun. Run this in Supabase SQL editor before/with the matching Vercel deploy.

-- Message requests must not be insertable directly through the anon key in a
-- way that bypasses app-level checks for public visibility, blocks, self-send,
-- or source post ownership.
--
-- Dating chat messages and likes are API-only writes in the app. The server
-- routes enforce rate limits, blocks, validation, daily like limits, and safety
-- checks before writing with the service role, so direct anon INSERT policies
-- are intentionally removed here.
DROP POLICY IF EXISTS "Match participants can insert own messages" ON public.dating_messages;
DROP POLICY IF EXISTS "Users can insert own likes" ON public.profile_likes;

ALTER TABLE public.message_requests
  DROP CONSTRAINT IF EXISTS message_requests_no_self_check;

ALTER TABLE public.message_requests
  ADD CONSTRAINT message_requests_no_self_check
  CHECK (sender_id <> receiver_id);

DROP POLICY IF EXISTS "Users can view own message requests" ON public.message_requests;
CREATE POLICY "Users can view own message requests"
ON public.message_requests
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can insert sent message requests" ON public.message_requests;
CREATE POLICY "Users can insert sent message requests"
ON public.message_requests
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND sender_id <> receiver_id
  AND EXISTS (
    SELECT 1
    FROM public.profiles receiver
    WHERE receiver.id = receiver_id
      AND receiver.public_profile_visible = TRUE
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_blocks blocks
    WHERE blocks.blocker_user_id = sender_id
      AND blocks.blocked_user_id = receiver_id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_blocks blocks
    WHERE blocks.blocker_user_id = receiver_id
      AND blocks.blocked_user_id = sender_id
  )
  AND (
    source_post_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.social_posts source_post
      WHERE source_post.id = source_post_id
        AND source_post.user_id = receiver_id
        AND source_post.is_deleted = FALSE
    )
  )
);

DROP POLICY IF EXISTS "Receivers can update incoming message requests" ON public.message_requests;
CREATE POLICY "Receivers can update incoming message requests"
ON public.message_requests
FOR UPDATE
USING (auth.uid() = receiver_id AND status = 'pending')
WITH CHECK (
  auth.uid() = receiver_id
  AND sender_id <> receiver_id
  AND status IN ('accepted', 'declined', 'blocked')
);

-- Keep public discovery/profile reads available only to signed-in beta users.
DROP POLICY IF EXISTS "Users can view public profiles" ON public.profiles;
CREATE POLICY "Users can view public profiles"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL AND public_profile_visible = TRUE);

DROP POLICY IF EXISTS "Users can view visible dating profiles" ON public.dating_profiles;
CREATE POLICY "Users can view visible dating profiles"
ON public.dating_profiles
FOR SELECT
USING (
  auth.uid() = user_id OR (
    auth.uid() IS NOT NULL
    AND visibility_status = 'visible'
    AND onboarding_completed = TRUE
  )
);

DROP POLICY IF EXISTS "Users can view profile photos" ON public.profile_photos;
CREATE POLICY "Users can view profile photos"
ON public.profile_photos
FOR SELECT
USING (
  auth.uid() = user_id
  OR (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.dating_profiles
      WHERE dating_profiles.user_id = profile_photos.user_id
        AND dating_profiles.visibility_status = 'visible'
        AND dating_profiles.onboarding_completed = TRUE
    )
  )
);

DROP POLICY IF EXISTS "Senders can update own messages" ON public.dating_messages;
CREATE POLICY "Senders can update own messages"
ON public.dating_messages
FOR UPDATE
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can update own social posts" ON public.social_posts;
CREATE POLICY "Users can update own social posts"
ON public.social_posts
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Refund helper used when a paid AI provider call fails after credits were
-- reserved. The route uses service role; this function stays atomic.
CREATE OR REPLACE FUNCTION public.refund_user_credits(
  p_user_id UUID,
  p_amount INT,
  p_reason TEXT,
  p_reference_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Credit refund amount must be positive';
  END IF;

  UPDATE public.user_credits
  SET balance = balance + p_amount
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.user_credits (user_id, balance)
    VALUES (p_user_id, p_amount);
  END IF;

  INSERT INTO public.credit_transactions (user_id, amount, reason, reference_id)
  VALUES (p_user_id, p_amount, p_reason, p_reference_id);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
