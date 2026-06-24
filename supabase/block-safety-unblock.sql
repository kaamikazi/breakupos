-- Block safety / unblock support.
-- Safe to rerun.

ALTER TABLE public.user_blocks ADD COLUMN IF NOT EXISTS reason TEXT;

DROP POLICY IF EXISTS "Users can delete own blocks" ON public.user_blocks;
CREATE POLICY "Users can delete own blocks" ON public.user_blocks
  FOR DELETE USING (auth.uid() = blocker_user_id);

DROP POLICY IF EXISTS "Users can view own blocks" ON public.user_blocks;
CREATE POLICY "Users can view own blocks" ON public.user_blocks
  FOR SELECT USING (auth.uid() = blocker_user_id OR auth.uid() = blocked_user_id);

DROP POLICY IF EXISTS "Users can insert own blocks" ON public.user_blocks;
CREATE POLICY "Users can insert own blocks" ON public.user_blocks
  FOR INSERT WITH CHECK (auth.uid() = blocker_user_id);
