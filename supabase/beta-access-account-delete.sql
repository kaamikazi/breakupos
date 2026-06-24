-- Breakup OS launch migration: account-level beta approval.
--
-- Safe run instructions:
-- 1. Run this in the Supabase SQL editor before or with the Vercel deploy.
-- 2. It is rerunnable: all schema changes use IF NOT EXISTS.
-- 3. Vercel deploys do not modify Supabase schema automatically.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS beta_approved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_beta_approved
  ON public.profiles(beta_approved_at)
  WHERE beta_approved_at IS NOT NULL;
