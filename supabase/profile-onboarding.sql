-- Breakup OS launch migration: required first-time profile onboarding.
--
-- Safe run instructions:
-- 1. Run this in Supabase SQL editor before deploying onboarding-gated code.
-- 2. It is rerunnable.
-- 3. Vercel deploys do not update Supabase schema automatically.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_reasons TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS first_goal TEXT,
  ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_profile_completed
  ON public.profiles(profile_completed_at)
  WHERE profile_completed_at IS NOT NULL;
