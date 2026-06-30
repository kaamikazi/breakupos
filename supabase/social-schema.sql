-- BreakupOS Social Feed Schema (photo-only posts + Love / Red Flag reactions)
-- Superseded by security-hardening-beta.sql. Run hardening migration last.
--
-- Safe run instructions:
-- 1. Run supabase/schema.sql first (profiles must exist).
-- 2. Run this file in the Supabase SQL editor. It is rerunnable.
-- 3. Storage: this file also creates the public 'social-posts' bucket.
--    If your project restricts SQL access to storage.buckets, create it in
--    Dashboard -> Storage instead: name "social-posts", public, 5MB limit.

-- SOCIAL POSTS (photo-only by design: no caption/text column exists)
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

-- SOCIAL POST REACTIONS: one row per user per post, enforced by UNIQUE.
CREATE TABLE IF NOT EXISTS social_post_reactions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id       UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('love', 'red_flag')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

-- updated_at trigger (reuses update_updated_at_column from schema.sql)
DROP TRIGGER IF EXISTS update_social_posts_updated_at ON social_posts;
CREATE TRIGGER update_social_posts_updated_at
BEFORE UPDATE ON social_posts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_post_reactions ENABLE ROW LEVEL SECURITY;

-- Posts: any signed-in user can view live posts; owners manage their own.
DROP POLICY IF EXISTS "Users can view live social posts" ON social_posts;
CREATE POLICY "Users can view live social posts" ON social_posts FOR SELECT USING (
  auth.uid() IS NOT NULL AND (is_deleted = FALSE OR auth.uid() = user_id)
);
DROP POLICY IF EXISTS "Users can insert own social posts" ON social_posts;
CREATE POLICY "Users can insert own social posts" ON social_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own social posts" ON social_posts;
CREATE POLICY "Users can update own social posts" ON social_posts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own social posts" ON social_posts;
CREATE POLICY "Users can delete own social posts" ON social_posts FOR DELETE USING (auth.uid() = user_id);

-- Reactions: visible to signed-in users; one per user; never on deleted posts.
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

-- Indexes for feed pagination, section filters, and ranking queries.
CREATE INDEX IF NOT EXISTS idx_social_posts_live_created ON social_posts(created_at DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_social_posts_section_created ON social_posts(section, created_at DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_social_posts_user_created ON social_posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_reactions_post ON social_post_reactions(post_id, reaction_type);
CREATE INDEX IF NOT EXISTS idx_social_reactions_user ON social_post_reactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_reactions_created ON social_post_reactions(created_at DESC);

-- Public storage bucket for post photos (5MB, images only).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('social-posts', 'social-posts', TRUE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;
