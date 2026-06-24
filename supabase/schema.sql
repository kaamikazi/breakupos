-- BreakupOS Database Schema
--
-- Safe run instructions:
-- 1. Back up production data before running migrations.
-- 2. Run this file in the Supabase SQL editor.
-- 3. This schema is designed to be rerunnable: new columns use IF NOT EXISTS,
--    policies/triggers are dropped before recreation, and indexes use IF NOT EXISTS.
-- 4. Service-role API routes still enforce user ownership before writes.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
  id                     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                  TEXT NOT NULL,
  display_name           TEXT,
  username               TEXT UNIQUE,
  avatar_url             TEXT,
  public_bio             TEXT DEFAULT '' CHECK (char_length(public_bio) <= 300),
  public_vibe            TEXT DEFAULT 'figuring_it_out' CHECK (public_vibe IN ('healing', 'dating', 'no_contact', 'figuring_it_out', 'glow_up')),
  public_profile_visible BOOLEAN DEFAULT TRUE,
  plan                   TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  situations_count       INT DEFAULT 0,
  situations_limit       INT DEFAULT 5,
  ai_advice_used         INT DEFAULT 0,
  ai_advice_limit        INT DEFAULT 3,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

-- SITUATIONS TABLE
CREATE TABLE IF NOT EXISTS situations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  avatar_emoji     TEXT DEFAULT '🧑',
  stage            TEXT NOT NULL DEFAULT 'orbiting' CHECK (stage IN ('orbiting', 'talking', 'situationship', 'dating', 'no_contact', 'ghosted', 'red_flag_hold', 'archived')),
  emotional_invest INT DEFAULT 5 CHECK (emotional_invest BETWEEN 1 AND 10),
  compatibility    INT DEFAULT 50 CHECK (compatibility BETWEEN 0 AND 100),
  first_contact    DATE,
  last_interaction DATE,
  vibe             TEXT DEFAULT 'warm' CHECK (vibe IN ('hot', 'warm', 'cold', 'dead')),
  red_flags        TEXT[] DEFAULT '{}',
  green_flags      TEXT[] DEFAULT '{}',
  notes            TEXT DEFAULT '',
  contact_method   TEXT DEFAULT 'irl' CHECK (contact_method IN ('instagram', 'tinder', 'hinge', 'bumble', 'irl', 'twitter', 'discord', 'other')),
  is_archived      BOOLEAN DEFAULT FALSE,
  is_breakup_mode  BOOLEAN DEFAULT FALSE,
  no_contact_started DATE,
  no_contact_reasons TEXT[] DEFAULT '{}',
  recovery_milestones TEXT[] DEFAULT '{}',
  memory_summary   TEXT,
  private_vault    TEXT DEFAULT '',
  match_id         UUID,
  situation_person_type TEXT DEFAULT 'manual' CHECK (situation_person_type IN ('manual', 'matched_user')),
  manual_name      TEXT,
  manual_photo_url TEXT,
  matched_user_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  dating_profile_id UUID,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- INTERACTIONS TABLE
CREATE TABLE IF NOT EXISTS interactions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  situation_id UUID NOT NULL REFERENCES situations(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('message', 'date', 'call', 'ghost', 'breadcrumb', 'left_on_read', 'relapse', 'boundary', 'conflict', 'repair', 'stage_change')),
  note         TEXT DEFAULT '',
  sentiment    TEXT DEFAULT 'neutral' CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- AI ADVICE TABLE
CREATE TABLE IF NOT EXISTS ai_advice (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  situation_id UUID NOT NULL REFERENCES situations(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question     TEXT NOT NULL,
  advice       TEXT NOT NULL,
  advice_type  TEXT DEFAULT 'general' CHECK (advice_type IN ('general', 'red_flag_analysis', 'move_recommendation', 'exit_strategy', 'draft_reply', 'message_analysis')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- RELATIONSHIP REPORTS TABLE
CREATE TABLE IF NOT EXISTS relationship_reports (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  situation_id           UUID NOT NULL REFERENCES situations(id) ON DELETE CASCADE,
  title                  TEXT NOT NULL,
  summary                TEXT NOT NULL,
  recommended_next_steps TEXT[] DEFAULT '{}',
  content_html           TEXT NOT NULL,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

-- WEEKLY SUMMARIES TABLE
CREATE TABLE IF NOT EXISTS weekly_summaries (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start               DATE NOT NULL,
  week_end                 DATE NOT NULL,
  emotional_trend          TEXT NOT NULL,
  biggest_red_flag         TEXT NOT NULL,
  healthiest_connection    TEXT NOT NULL,
  most_draining_situation  TEXT NOT NULL,
  no_contact_progress      TEXT NOT NULL,
  suggested_focus          TEXT NOT NULL,
  summary                  TEXT NOT NULL,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

-- DATING PROFILE TABLES
CREATE TABLE IF NOT EXISTS dating_profiles (
  user_id                UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  display_name           TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 80),
  age                    INT NOT NULL CHECK (age BETWEEN 18 AND 99),
  bio                    TEXT DEFAULT '' CHECK (char_length(bio) <= 500),
  gender                 TEXT NOT NULL CHECK (gender IN ('female', 'male')),
  interested_in          TEXT NOT NULL CHECK (interested_in IN ('female', 'male')),
  relationship_goal      TEXT NOT NULL CHECK (relationship_goal IN ('long_term', 'short_term', 'friendship', 'figuring_out')),
  interests              TEXT[] DEFAULT '{}',
  city                   TEXT DEFAULT '' CHECK (char_length(city) <= 80),
  visibility_status      TEXT DEFAULT 'visible' CHECK (visibility_status IN ('visible', 'hidden')),
  verification_status    TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  use_nickname           BOOLEAN DEFAULT TRUE,
  onboarding_completed   BOOLEAN DEFAULT FALSE,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profile_photos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  photo_url   TEXT NOT NULL CHECK (char_length(photo_url) <= 500),
  storage_path TEXT,
  source      TEXT DEFAULT 'url' CHECK (source IN ('url', 'upload')),
  mime_type   TEXT,
  size_bytes  INT CHECK (size_bytes IS NULL OR size_bytes BETWEEN 0 AND 5242880),
  position    INT DEFAULT 0 CHECK (position BETWEEN 0 AND 5),
  is_primary  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profile_likes (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  liker_user_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  liked_user_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (liker_user_id, liked_user_id),
  CHECK (liker_user_id <> liked_user_id)
);

CREATE TABLE IF NOT EXISTS profile_passes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passer_user_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  passed_user_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (passer_user_id, passed_user_id),
  CHECK (passer_user_id <> passed_user_id)
);

CREATE TABLE IF NOT EXISTS matches (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_one_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_two_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_one_id, user_two_id),
  CHECK (user_one_id <> user_two_id)
);

CREATE TABLE IF NOT EXISTS user_blocks (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_user_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_user_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (blocker_user_id, blocked_user_id),
  CHECK (blocker_user_id <> blocked_user_id)
);

CREATE TABLE IF NOT EXISTS user_reports (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_user_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason            TEXT NOT NULL CHECK (reason IN ('harassment', 'scam', 'explicit_content', 'fake_profile', 'underage_concern', 'spam', 'other')),
  details           TEXT DEFAULT '' CHECK (char_length(details) <= 500),
  status            TEXT DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed', 'actioned')),
  internal_notes    TEXT DEFAULT '',
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  CHECK (reporter_user_id <> reported_user_id)
);

CREATE TABLE IF NOT EXISTS dating_messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id    UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body        TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  read_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('new_match', 'new_message', 'message_request', 'report_update', 'weekly_summary')),
  title      TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  body       TEXT NOT NULL CHECK (char_length(body) <= 500),
  link_url   TEXT,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_requests (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_post_id UUID REFERENCES social_posts(id) ON DELETE SET NULL,
  message_text   TEXT DEFAULT '' CHECK (char_length(message_text) <= 240),
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (sender_id <> receiver_id)
);

CREATE TABLE IF NOT EXISTS social_posts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  image_url     TEXT NOT NULL CHECK (char_length(image_url) BETWEEN 1 AND 500),
  storage_path  TEXT NOT NULL CHECK (char_length(storage_path) BETWEEN 1 AND 300),
  section       TEXT NOT NULL CHECK (section IN ('ghosted', 'talking_stage', 'situationship', 'no_contact', 'healing', 'glow_up', 'red_flags')),
  is_deleted    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS social_post_reactions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id       UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('love', 'red_flag')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

-- CREDIT / AI USAGE FOUNDATION
CREATE TABLE IF NOT EXISTS user_credits (
  user_id    UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  balance    INT NOT NULL DEFAULT 10 CHECK (balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount        INT NOT NULL,
  reason        TEXT NOT NULL,
  reference_id  UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_usage_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action          TEXT NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('started', 'succeeded', 'failed', 'blocked')),
  credits_charged INT NOT NULL DEFAULT 0 CHECK (credits_charged >= 0),
  reference_id    UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AUTO-UPDATE updated_at on situations
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_situations_updated_at ON situations;
CREATE TRIGGER update_situations_updated_at
BEFORE UPDATE ON situations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dating_profiles_updated_at ON dating_profiles;
CREATE TRIGGER update_dating_profiles_updated_at
BEFORE UPDATE ON dating_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dating_messages_updated_at ON dating_messages;
CREATE TRIGGER update_dating_messages_updated_at
BEFORE UPDATE ON dating_messages
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_social_posts_updated_at ON social_posts;
CREATE TRIGGER update_social_posts_updated_at
BEFORE UPDATE ON social_posts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_message_requests_updated_at ON message_requests;
CREATE TRIGGER update_message_requests_updated_at
BEFORE UPDATE ON message_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_credits_updated_at ON user_credits;
CREATE TRIGGER update_user_credits_updated_at
BEFORE UPDATE ON user_credits
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, avatar_url, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', ''),
    left(lower(trim(both '_' from regexp_replace(
      COALESCE(
        NEW.raw_user_meta_data->>'preferred_username',
        NEW.raw_user_meta_data->>'user_name',
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', 'user_' || substr(NEW.id::text, 1, 8)), '@', 1)
      ),
      '[^a-zA-Z0-9_]+',
      '_',
      'g'
    ))) || '_' || substr(NEW.id::text, 1, 6), 30),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', 'beta-user'), '@', 1),
      'beta-user'
    )
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    username = COALESCE(public.profiles.username, EXCLUDED.username),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name);
  INSERT INTO public.user_credits (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update situations_count when situation is created/deleted
CREATE OR REPLACE FUNCTION update_situations_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET situations_count = situations_count + 1 WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET situations_count = GREATEST(0, situations_count - 1) WHERE id = OLD.user_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_profile_situations_count ON situations;
CREATE TRIGGER update_profile_situations_count
AFTER INSERT OR DELETE ON situations
FOR EACH ROW EXECUTE FUNCTION update_situations_count();

-- Update ai_advice_used when advice is created
CREATE OR REPLACE FUNCTION update_ai_advice_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET ai_advice_used = ai_advice_used + 1 WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_profile_ai_count ON ai_advice;
CREATE TRIGGER update_profile_ai_count
AFTER INSERT ON ai_advice
FOR EACH ROW EXECUTE FUNCTION update_ai_advice_count();

CREATE OR REPLACE FUNCTION spend_user_credits(
  p_user_id UUID,
  p_amount INT,
  p_reason TEXT,
  p_reference_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Credit spend amount must be positive';
  END IF;

  UPDATE public.user_credits
  SET balance = balance - p_amount
  WHERE user_id = p_user_id
    AND balance >= p_amount;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.credit_transactions (user_id, amount, reason, reference_id)
  VALUES (p_user_id, -p_amount, p_reason, p_reference_id);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RLS POLICIES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE situations ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_advice ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE dating_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE dating_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_events ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only see/edit their own
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can view public profiles" ON profiles;
CREATE POLICY "Users can view public profiles" ON profiles FOR SELECT USING (public_profile_visible = TRUE);
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Situations: users can only CRUD their own
DROP POLICY IF EXISTS "Users can view own situations" ON situations;
CREATE POLICY "Users can view own situations" ON situations FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own situations" ON situations;
CREATE POLICY "Users can insert own situations" ON situations FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own situations" ON situations;
CREATE POLICY "Users can update own situations" ON situations FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own situations" ON situations;
CREATE POLICY "Users can delete own situations" ON situations FOR DELETE USING (auth.uid() = user_id);

-- Interactions: users can only CRUD their own
DROP POLICY IF EXISTS "Users can view own interactions" ON interactions;
CREATE POLICY "Users can view own interactions" ON interactions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own interactions" ON interactions;
CREATE POLICY "Users can insert own interactions" ON interactions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own interactions" ON interactions;
CREATE POLICY "Users can delete own interactions" ON interactions FOR DELETE USING (auth.uid() = user_id);

-- AI Advice: users can only CRUD their own
DROP POLICY IF EXISTS "Users can view own ai_advice" ON ai_advice;
CREATE POLICY "Users can view own ai_advice" ON ai_advice FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own ai_advice" ON ai_advice;
CREATE POLICY "Users can insert own ai_advice" ON ai_advice FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Relationship Reports: users can only read their own generated reports
DROP POLICY IF EXISTS "Users can view own relationship_reports" ON relationship_reports;
CREATE POLICY "Users can view own relationship_reports" ON relationship_reports FOR SELECT USING (auth.uid() = user_id);

-- Weekly Summaries: users can only read their own generated summaries
DROP POLICY IF EXISTS "Users can view own weekly_summaries" ON weekly_summaries;
CREATE POLICY "Users can view own weekly_summaries" ON weekly_summaries FOR SELECT USING (auth.uid() = user_id);

-- Dating profiles: visible completed profiles can be discovered; users manage their own profile.
DROP POLICY IF EXISTS "Users can view visible dating profiles" ON dating_profiles;
CREATE POLICY "Users can view visible dating profiles" ON dating_profiles FOR SELECT USING (
  auth.uid() = user_id OR (visibility_status = 'visible' AND onboarding_completed = TRUE)
);
DROP POLICY IF EXISTS "Users can insert own dating profile" ON dating_profiles;
CREATE POLICY "Users can insert own dating profile" ON dating_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own dating profile" ON dating_profiles;
CREATE POLICY "Users can update own dating profile" ON dating_profiles FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own dating profile" ON dating_profiles;
CREATE POLICY "Users can delete own dating profile" ON dating_profiles FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view profile photos" ON profile_photos;
CREATE POLICY "Users can view profile photos" ON profile_photos FOR SELECT USING (
  auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM dating_profiles
    WHERE dating_profiles.user_id = profile_photos.user_id
      AND dating_profiles.visibility_status = 'visible'
      AND dating_profiles.onboarding_completed = TRUE
  )
);
DROP POLICY IF EXISTS "Users can insert own profile photos" ON profile_photos;
CREATE POLICY "Users can insert own profile photos" ON profile_photos FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own profile photos" ON profile_photos;
CREATE POLICY "Users can update own profile photos" ON profile_photos FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own profile photos" ON profile_photos;
CREATE POLICY "Users can delete own profile photos" ON profile_photos FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own likes" ON profile_likes;
CREATE POLICY "Users can view own likes" ON profile_likes FOR SELECT USING (auth.uid() = liker_user_id OR auth.uid() = liked_user_id);
DROP POLICY IF EXISTS "Users can insert own likes" ON profile_likes;
CREATE POLICY "Users can insert own likes" ON profile_likes FOR INSERT WITH CHECK (auth.uid() = liker_user_id);

DROP POLICY IF EXISTS "Users can view own passes" ON profile_passes;
CREATE POLICY "Users can view own passes" ON profile_passes FOR SELECT USING (auth.uid() = passer_user_id);
DROP POLICY IF EXISTS "Users can insert own passes" ON profile_passes;
CREATE POLICY "Users can insert own passes" ON profile_passes FOR INSERT WITH CHECK (auth.uid() = passer_user_id);

DROP POLICY IF EXISTS "Users can view own matches" ON matches;
CREATE POLICY "Users can view own matches" ON matches FOR SELECT USING (auth.uid() = user_one_id OR auth.uid() = user_two_id);

DROP POLICY IF EXISTS "Users can view own blocks" ON user_blocks;
CREATE POLICY "Users can view own blocks" ON user_blocks FOR SELECT USING (auth.uid() = blocker_user_id OR auth.uid() = blocked_user_id);
DROP POLICY IF EXISTS "Users can insert own blocks" ON user_blocks;
CREATE POLICY "Users can insert own blocks" ON user_blocks FOR INSERT WITH CHECK (auth.uid() = blocker_user_id);

DROP POLICY IF EXISTS "Users can view own reports" ON user_reports;
CREATE POLICY "Users can view own reports" ON user_reports FOR SELECT USING (auth.uid() = reporter_user_id);
DROP POLICY IF EXISTS "Users can insert own reports" ON user_reports;
CREATE POLICY "Users can insert own reports" ON user_reports FOR INSERT WITH CHECK (auth.uid() = reporter_user_id);

DROP POLICY IF EXISTS "Match participants can view messages" ON dating_messages;
CREATE POLICY "Match participants can view messages" ON dating_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = dating_messages.match_id
      AND (matches.user_one_id = auth.uid() OR matches.user_two_id = auth.uid())
  )
);
DROP POLICY IF EXISTS "Match participants can insert own messages" ON dating_messages;
CREATE POLICY "Match participants can insert own messages" ON dating_messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = dating_messages.match_id
      AND (matches.user_one_id = auth.uid() OR matches.user_two_id = auth.uid())
  )
);
DROP POLICY IF EXISTS "Senders can update own messages" ON dating_messages;
CREATE POLICY "Senders can update own messages" ON dating_messages FOR UPDATE USING (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view live social posts" ON social_posts;
CREATE POLICY "Users can view live social posts" ON social_posts FOR SELECT USING (
  auth.uid() IS NOT NULL AND (is_deleted = FALSE OR auth.uid() = user_id)
);
DROP POLICY IF EXISTS "Users can insert own social posts" ON social_posts;
CREATE POLICY "Users can insert own social posts" ON social_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own social posts" ON social_posts;
CREATE POLICY "Users can update own social posts" ON social_posts FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own social posts" ON social_posts;
CREATE POLICY "Users can delete own social posts" ON social_posts FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view social reactions" ON social_post_reactions;
CREATE POLICY "Users can view social reactions" ON social_post_reactions FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Users can insert own social reactions" ON social_post_reactions;
CREATE POLICY "Users can insert own social reactions" ON social_post_reactions FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM social_posts
    WHERE social_posts.id = social_post_reactions.post_id
      AND social_posts.is_deleted = FALSE
  )
);
DROP POLICY IF EXISTS "Users can update own social reactions" ON social_post_reactions;
CREATE POLICY "Users can update own social reactions" ON social_post_reactions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM social_posts
    WHERE social_posts.id = social_post_reactions.post_id
      AND social_posts.is_deleted = FALSE
  )
);
DROP POLICY IF EXISTS "Users can delete own social reactions" ON social_post_reactions;
CREATE POLICY "Users can delete own social reactions" ON social_post_reactions FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own message requests" ON message_requests;
CREATE POLICY "Users can view own message requests" ON message_requests FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);
DROP POLICY IF EXISTS "Users can insert sent message requests" ON message_requests;
CREATE POLICY "Users can insert sent message requests" ON message_requests FOR INSERT WITH CHECK (auth.uid() = sender_id);
DROP POLICY IF EXISTS "Receivers can update incoming message requests" ON message_requests;
CREATE POLICY "Receivers can update incoming message requests" ON message_requests FOR UPDATE USING (auth.uid() = receiver_id) WITH CHECK (auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can view own credits" ON user_credits;
CREATE POLICY "Users can view own credits" ON user_credits FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view own credit transactions" ON credit_transactions;
CREATE POLICY "Users can view own credit transactions" ON credit_transactions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view own ai usage events" ON ai_usage_events;
CREATE POLICY "Users can view own ai usage events" ON ai_usage_events FOR SELECT USING (auth.uid() = user_id);

-- Query indexes for dashboard, detail pages, analytics, and Stripe lookups.
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_situations_user_updated ON situations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_situations_user_stage ON situations(user_id, stage);
CREATE INDEX IF NOT EXISTS idx_situations_user_breakup ON situations(user_id, is_breakup_mode) WHERE is_breakup_mode = TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_situations_user_match ON situations(user_id, match_id) WHERE match_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_interactions_situation_date ON interactions(situation_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_user_date ON interactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_advice_situation_created ON ai_advice(situation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_advice_user_created ON ai_advice(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_relationship_reports_user_created ON relationship_reports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_relationship_reports_situation_created ON relationship_reports(situation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_summaries_user_created ON weekly_summaries(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_summaries_user_week ON weekly_summaries(user_id, week_start, week_end);
CREATE INDEX IF NOT EXISTS idx_dating_profiles_discovery ON dating_profiles(visibility_status, onboarding_completed, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_dating_profiles_city ON dating_profiles(city);
CREATE INDEX IF NOT EXISTS idx_profile_photos_user_position ON profile_photos(user_id, position);
CREATE INDEX IF NOT EXISTS idx_profile_likes_liker_liked ON profile_likes(liker_user_id, liked_user_id);
CREATE INDEX IF NOT EXISTS idx_profile_likes_liked_liker ON profile_likes(liked_user_id, liker_user_id);
CREATE INDEX IF NOT EXISTS idx_profile_passes_passer_passed ON profile_passes(passer_user_id, passed_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_pair_unique ON matches(LEAST(user_one_id, user_two_id), GREATEST(user_one_id, user_two_id));
CREATE INDEX IF NOT EXISTS idx_matches_user_one_created ON matches(user_one_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_user_two_created ON matches(user_two_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_last_activity ON matches(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_blocked ON user_blocks(blocker_user_id, blocked_user_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_blocker ON user_blocks(blocked_user_id, blocker_user_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported_created ON user_reports(reported_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dating_messages_match_created ON dating_messages(match_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dating_messages_sender_created ON dating_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_social_posts_live_created ON social_posts(created_at DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_social_posts_section_created ON social_posts(section, created_at DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_social_posts_user_created ON social_posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_reactions_post ON social_post_reactions(post_id, reaction_type);
CREATE INDEX IF NOT EXISTS idx_social_reactions_user ON social_post_reactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_reactions_created ON social_post_reactions(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_message_requests_pending_pair ON message_requests(sender_id, receiver_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_message_requests_receiver_created ON message_requests(receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_requests_sender_created ON message_requests(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_created ON credit_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_user_created ON ai_usage_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_action_created ON ai_usage_events(action, created_at DESC);

-- Upgrade migration helpers for existing BreakupOS databases.
ALTER TABLE situations ADD COLUMN IF NOT EXISTS is_breakup_mode BOOLEAN DEFAULT FALSE;
ALTER TABLE situations ADD COLUMN IF NOT EXISTS no_contact_started DATE;
ALTER TABLE situations ADD COLUMN IF NOT EXISTS no_contact_reasons TEXT[] DEFAULT '{}';
ALTER TABLE situations ADD COLUMN IF NOT EXISTS recovery_milestones TEXT[] DEFAULT '{}';
ALTER TABLE situations ADD COLUMN IF NOT EXISTS memory_summary TEXT;
ALTER TABLE situations ADD COLUMN IF NOT EXISTS private_vault TEXT DEFAULT '';
ALTER TABLE situations ADD COLUMN IF NOT EXISTS match_id UUID;
ALTER TABLE situations ADD COLUMN IF NOT EXISTS situation_person_type TEXT DEFAULT 'manual';
ALTER TABLE situations ADD COLUMN IF NOT EXISTS manual_name TEXT;
ALTER TABLE situations ADD COLUMN IF NOT EXISTS manual_photo_url TEXT;
ALTER TABLE situations ADD COLUMN IF NOT EXISTS matched_user_id UUID;
ALTER TABLE situations ADD COLUMN IF NOT EXISTS dating_profile_id UUID;
ALTER TABLE situations DROP CONSTRAINT IF EXISTS situations_person_type_check;
ALTER TABLE situations ADD CONSTRAINT situations_person_type_check CHECK (situation_person_type IN ('manual', 'matched_user'));
ALTER TABLE situations DROP CONSTRAINT IF EXISTS situations_matched_user_id_fkey;
ALTER TABLE situations ADD CONSTRAINT situations_matched_user_id_fkey FOREIGN KEY (matched_user_id) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE situations DROP CONSTRAINT IF EXISTS situations_match_id_fkey;
ALTER TABLE situations ADD CONSTRAINT situations_match_id_fkey FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE SET NULL;
ALTER TABLE dating_profiles ADD COLUMN IF NOT EXISTS use_nickname BOOLEAN DEFAULT TRUE;
ALTER TABLE dating_profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE dating_profiles ADD COLUMN IF NOT EXISTS visibility_status TEXT DEFAULT 'visible';
ALTER TABLE dating_profiles ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified';
ALTER TABLE dating_profiles DROP CONSTRAINT IF EXISTS dating_profiles_verification_status_check;
ALTER TABLE dating_profiles ADD CONSTRAINT dating_profiles_verification_status_check CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected'));
ALTER TABLE dating_profiles DROP CONSTRAINT IF EXISTS dating_profiles_gender_check;
ALTER TABLE dating_profiles DROP CONSTRAINT IF EXISTS dating_profiles_interested_in_check;
UPDATE dating_profiles
SET
  gender = CASE
    WHEN gender IN ('woman', 'women', 'female') THEN 'female'
    WHEN gender IN ('man', 'men', 'male') THEN 'male'
    ELSE 'female'
  END,
  interested_in = CASE
    WHEN interested_in IN ('woman', 'women', 'female') THEN 'female'
    WHEN interested_in IN ('man', 'men', 'male') THEN 'male'
    WHEN gender IN ('woman', 'women', 'female') THEN 'male'
    ELSE 'female'
  END;
ALTER TABLE dating_profiles ADD CONSTRAINT dating_profiles_gender_check CHECK (gender IN ('female', 'male'));
ALTER TABLE dating_profiles ADD CONSTRAINT dating_profiles_interested_in_check CHECK (interested_in IN ('female', 'male'));

ALTER TABLE profiles ALTER COLUMN situations_count SET DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS public_bio TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS public_vibe TEXT DEFAULT 'figuring_it_out';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS public_profile_visible BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_public_vibe_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_public_vibe_check CHECK (public_vibe IN ('healing', 'dating', 'no_contact', 'figuring_it_out', 'glow_up'));
UPDATE profiles
SET username = left(
  lower(trim(both '_' from regexp_replace(COALESCE(display_name, split_part(email, '@', 1), 'user'), '[^a-zA-Z0-9_]+', '_', 'g'))) || '_' || substr(id::text, 1, 6),
  30
)
WHERE username IS NULL;
ALTER TABLE profiles ALTER COLUMN situations_limit SET DEFAULT 5;
ALTER TABLE profiles ALTER COLUMN ai_advice_used SET DEFAULT 0;
ALTER TABLE profiles ALTER COLUMN ai_advice_limit SET DEFAULT 3;
UPDATE profiles
SET
  situations_count = COALESCE(situations_count, 0),
  situations_limit = CASE WHEN situations_limit IS NULL OR situations_limit < 1 THEN 5 ELSE situations_limit END,
  ai_advice_used = COALESCE(ai_advice_used, 0),
  ai_advice_limit = CASE WHEN ai_advice_limit IS NULL OR ai_advice_limit < 1 THEN 3 ELSE ai_advice_limit END;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE profile_photos ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE profile_photos ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'url';
ALTER TABLE profile_photos ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE profile_photos ADD COLUMN IF NOT EXISTS size_bytes INT;
ALTER TABLE profile_photos DROP CONSTRAINT IF EXISTS profile_photos_user_id_fkey;
ALTER TABLE profile_photos ADD CONSTRAINT profile_photos_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
INSERT INTO user_credits (user_id)
SELECT id FROM profiles
ON CONFLICT (user_id) DO NOTHING;
ALTER TABLE user_reports ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';
ALTER TABLE user_reports ADD COLUMN IF NOT EXISTS internal_notes TEXT DEFAULT '';
ALTER TABLE user_reports ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE user_reports DROP CONSTRAINT IF EXISTS user_reports_reason_check;
ALTER TABLE user_reports ADD CONSTRAINT user_reports_reason_check CHECK (reason IN ('harassment', 'scam', 'explicit_content', 'fake_profile', 'underage_concern', 'spam', 'other', 'sexual_content', 'hate_or_abuse'));
ALTER TABLE user_reports DROP CONSTRAINT IF EXISTS user_reports_status_check;
ALTER TABLE user_reports ADD CONSTRAINT user_reports_status_check CHECK (status IN ('open', 'reviewed', 'dismissed', 'actioned'));
ALTER TABLE situations DROP CONSTRAINT IF EXISTS situations_stage_check;
ALTER TABLE situations ADD CONSTRAINT situations_stage_check CHECK (stage IN ('orbiting', 'talking', 'situationship', 'dating', 'no_contact', 'ghosted', 'red_flag_hold', 'archived'));
ALTER TABLE interactions DROP CONSTRAINT IF EXISTS interactions_type_check;
ALTER TABLE interactions ADD CONSTRAINT interactions_type_check CHECK (type IN ('message', 'date', 'call', 'ghost', 'breadcrumb', 'left_on_read', 'relapse', 'boundary', 'conflict', 'repair', 'stage_change'));
ALTER TABLE ai_advice DROP CONSTRAINT IF EXISTS ai_advice_advice_type_check;
ALTER TABLE ai_advice ADD CONSTRAINT ai_advice_advice_type_check CHECK (advice_type IN ('general', 'red_flag_analysis', 'move_recommendation', 'exit_strategy', 'draft_reply', 'message_analysis'));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('social-posts', 'social-posts', TRUE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;
