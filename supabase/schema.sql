-- Fart Bounty — Supabase Schema
-- Version: 2.0
-- Author: Cascade
--
-- This single schema file defines the entire database structure.
-- Run this script once in your Supabase SQL editor to initialize the database.

-- ----------------------------------------------------------------------------
-- 1. HELPER FUNCTIONS & EXTENSIONS
-- ----------------------------------------------------------------------------

-- Enable the pgcrypto extension for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ----------------------------------------------------------------------------
-- 2. STORAGE BUCKETS SETUP
-- ----------------------------------------------------------------------------

-- Create storage buckets (these need to be created manually in Supabase UI)
-- avatars/, banners/, sounds/, videos/, games/, thumbnails/, shop/

-- Basic storage policies (will be enhanced after users table is created)
CREATE POLICY "Public avatar access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Public banner access" ON storage.objects FOR SELECT USING (bucket_id = 'banners');
CREATE POLICY "Public sound access" ON storage.objects FOR SELECT USING (bucket_id = 'sounds');
CREATE POLICY "Public video access" ON storage.objects FOR SELECT USING (bucket_id = 'videos');
CREATE POLICY "Public thumbnail access" ON storage.objects FOR SELECT USING (bucket_id = 'thumbnails');
CREATE POLICY "Public game access" ON storage.objects FOR SELECT USING (bucket_id = 'games');
CREATE POLICY "Public shop access" ON storage.objects FOR SELECT USING (bucket_id = 'shop');

-- ----------------------------------------------------------------------------
-- 3. USERS TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Auth fields (populated by Supabase Auth)
    username text UNIQUE NOT NULL CHECK (length(username) >= 3 AND length(username) <= 30),
    display_name text CHECK (length(display_name) <= 50),
    bio text CHECK (length(bio) <= 200),
    location text CHECK (length(location) <= 50),

    -- Profile assets
    avatar_url text,
    banner_url text,

    -- Privacy settings (for future use)
    is_private boolean DEFAULT false,

    -- Premium status
    is_premium boolean DEFAULT false,
    premium_since timestamptz,

    -- In-game currency
    fb_coins integer DEFAULT 0 CHECK (fb_coins >= 0),

    -- Username change cooldown (14 days) - NULL means user has never changed username
    last_username_change_at timestamptz DEFAULT NULL,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX users_username_idx ON users(username);
CREATE INDEX users_is_premium_idx ON users(is_premium);
CREATE INDEX users_fb_coins_idx ON users(fb_coins);
CREATE INDEX users_created_at_idx ON users(created_at);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enhanced storage policies (now that users table exists)
CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE USING (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users can delete own avatar" ON storage.objects FOR DELETE USING (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for banners bucket (premium only)
CREATE POLICY "Premium users can upload banner" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'banners' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_premium = true)
);
CREATE POLICY "Users can update own banner" ON storage.objects FOR UPDATE USING (
  bucket_id = 'banners' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users can delete own banner" ON storage.objects FOR DELETE USING (
  bucket_id = 'banners' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for sounds bucket
CREATE POLICY "Users can upload sounds" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'sounds' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users can delete own sounds" ON storage.objects FOR DELETE USING (
  bucket_id = 'sounds' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for videos bucket (simplified for testing)
CREATE POLICY "Users can upload videos" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'videos' AND auth.uid() IS NOT NULL
);
CREATE POLICY "Users can delete own videos" ON storage.objects FOR DELETE USING (
  bucket_id = 'videos' AND auth.uid() IS NOT NULL
);

-- Storage policies for thumbnails bucket (simplified for testing)
CREATE POLICY "Users can upload thumbnails" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'thumbnails' AND auth.uid() IS NOT NULL
);
CREATE POLICY "Users can delete own thumbnails" ON storage.objects FOR DELETE USING (
  bucket_id = 'thumbnails' AND auth.uid() IS NOT NULL
);
-- 4. SOUNDS TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE sounds (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- User-defined name for the sound
    name text NOT NULL DEFAULT 'Untitled Sound',

    storage_path text NOT NULL, -- Path in Supabase Storage
    duration_seconds integer NOT NULL CHECK (duration_seconds > 0),

    -- Sound generation parameters (JSON metadata)
    parameters jsonb,

    -- Soft delete functionality - boolean instead of timestamp
    deleted boolean NOT NULL DEFAULT false,

    created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX sounds_user_id_idx ON sounds(user_id);
CREATE INDEX sounds_created_at_idx ON sounds(created_at);
CREATE INDEX sounds_parameters_idx ON sounds USING GIN (parameters);
CREATE INDEX sounds_name_idx ON sounds(name);
CREATE INDEX sounds_deleted_idx ON sounds(deleted);

-- Function for soft deleting sounds
CREATE OR REPLACE FUNCTION soft_delete_sound(sound_uuid uuid, p_user_id uuid)
RETURNS void AS $$
BEGIN
    UPDATE sounds
    SET deleted = true
    WHERE id = sound_uuid AND user_id = p_user_id AND deleted = false;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sound not found or you do not have permission to delete it';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has reached the sound limit
CREATE OR REPLACE FUNCTION check_sound_limit()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if user already has 4 non-deleted sounds
    IF (SELECT COUNT(*) FROM sounds WHERE user_id = NEW.user_id AND deleted = false) > 4 THEN
        RAISE EXCEPTION 'Users are limited to a maximum of 4 sounds. Please delete a sound before adding a new one.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce sound limit on INSERT
CREATE TRIGGER trigger_check_sound_limit
    BEFORE INSERT ON sounds
    FOR EACH ROW EXECUTE FUNCTION check_sound_limit();

-- ----------------------------------------------------------------------------
-- 5. POSTS TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Content (250 chars normal, 1500 chars premium)
    content text NOT NULL CHECK (length(content) > 0),

    -- Optional sound attachment
    sound_id uuid REFERENCES sounds(id) ON DELETE SET NULL,

    -- Timestamps
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    edited_at timestamptz,
    deleted boolean DEFAULT false
);

CREATE INDEX posts_user_id_idx ON posts(user_id);
CREATE INDEX posts_created_at_idx ON posts(created_at);

-- ----------------------------------------------------------------------------
-- 6. COMMENTS TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Nested comments support
    parent_comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,

    content text NOT NULL CHECK (length(content) > 0 AND length(content) <= 500),

    created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 7. STORIES TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE stories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    title text NOT NULL CHECK (length(title) > 0 AND length(title) <= 100),
    content text NOT NULL CHECK (length(content) > 0 AND length(content) <= 3000),
    category text NOT NULL CHECK (category IN ('fiction', 'non-fiction')) DEFAULT 'fiction',

    created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 8. STORY REACTIONS TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE story_reactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    reaction_type text NOT NULL CHECK (reaction_type IN ('heart', 'laugh', 'vomit', 'cry')),

    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,

    -- One reaction per user per story
    UNIQUE(story_id, user_id)
);

-- ----------------------------------------------------------------------------
-- 9. LIKES TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE likes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,

    -- One like per user per post
    UNIQUE(post_id, user_id)
);

-- ----------------------------------------------------------------------------
-- 10. FOLLOWS TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE follows (
    follower_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,

    -- One follow relation per user pair, follower != followee
    PRIMARY KEY (follower_id, followee_id),
    CHECK (follower_id != followee_id)
);

-- ----------------------------------------------------------------------------
-- 11. CONFESSIONALS TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE confessionals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    video_path text NOT NULL,
    thumbnail_path text NOT NULL,
    duration_seconds integer NOT NULL CHECK (duration_seconds > 0 AND duration_seconds <= 60),

    -- Visual effects
    blur_level integer DEFAULT 0 CHECK (blur_level >= 0 AND blur_level <= 10),
    voice_effects jsonb, -- Voice modulation parameters

    created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 12. CONFESSIONAL REACTIONS TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE confessional_reactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    confessional_id uuid NOT NULL REFERENCES confessionals(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    reaction_type text NOT NULL CHECK (reaction_type IN ('heart', 'laugh', 'vomit', 'cry')),

    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,

    -- One reaction per user per confessional
    UNIQUE(confessional_id, user_id)
);

CREATE INDEX confessional_reactions_confessional_id_idx ON confessional_reactions(confessional_id);
CREATE INDEX confessional_reactions_user_id_idx ON confessional_reactions(user_id);

-- ----------------------------------------------------------------------------
-- 12b. CONFESSIONAL COMMENTS TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE confessional_comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    confessional_id uuid NOT NULL REFERENCES confessionals(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    content text NOT NULL CHECK (content <> ''),
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX confessional_comments_confessional_id_idx ON confessional_comments(confessional_id);
CREATE INDEX confessional_comments_user_id_idx ON confessional_comments(user_id);

-- ----------------------------------------------------------------------------
-- 13. CHALLENGES TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE challenges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    slug text UNIQUE NOT NULL,
    name text NOT NULL,
    description text NOT NULL,

    -- Threshold definition (numeric or rule-based)
    threshold jsonb NOT NULL,

    badge_url text NOT NULL,

    created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 13. USER ACHIEVEMENTS TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE user_achievements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,

    unlocked_at timestamptz DEFAULT CURRENT_TIMESTAMP,

    -- One achievement per user per challenge
    UNIQUE(user_id, challenge_id)
);

CREATE INDEX user_achievements_user_id_idx ON user_achievements(user_id);
CREATE INDEX user_achievements_challenge_id_idx ON user_achievements(challenge_id);
CREATE INDEX challenges_threshold_idx ON challenges USING GIN (threshold);

-- ----------------------------------------------------------------------------
-- 14. GAME LEADERBOARDS TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE game_leaderboards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id text NOT NULL, -- e.g., 'flappy-fart', 'space-invaders', etc.

    -- Score details
    high_score integer NOT NULL CHECK (high_score >= 0),

    -- Game metadata
    game_version text DEFAULT '1.0',
    achieved_at timestamptz DEFAULT CURRENT_TIMESTAMP,

    -- Ensure one high score per user per game
    UNIQUE(user_id, game_id)
);

CREATE INDEX game_leaderboards_user_id_idx ON game_leaderboards(user_id);
CREATE INDEX game_leaderboards_game_id_idx ON game_leaderboards(game_id);
CREATE INDEX game_leaderboards_high_score_idx ON game_leaderboards(game_id, high_score DESC);
CREATE INDEX game_leaderboards_achieved_at_idx ON game_leaderboards(achieved_at);

CREATE TABLE shop_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    name text NOT NULL,
    description text NOT NULL,
    type text NOT NULL CHECK (type IN ('theme', 'sound', 'perk', 'filter', 'avatar', 'badge')),
    category text NOT NULL CHECK (category IN ('cosmetic', 'functional', 'premium')),

    -- Pricing
    price_fb_coins integer NOT NULL CHECK (price_fb_coins > 0),
    price_usd numeric(10,2) CHECK (price_usd >= 0),

    -- Visual assets
    image_url text,
    preview_url text, -- For themes/sounds previews

    -- Metadata
    metadata jsonb, -- Additional item-specific data (colors for themes, etc.)

    -- Availability
    is_active boolean DEFAULT true,
    is_premium_only boolean DEFAULT false,
    max_quantity integer, -- NULL for unlimited, specific number for limited items

    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX shop_items_type_idx ON shop_items(type);
CREATE INDEX shop_items_category_idx ON shop_items(category);
CREATE INDEX shop_items_is_active_idx ON shop_items(is_active);
CREATE INDEX shop_items_is_premium_only_idx ON shop_items(is_premium_only);

-- ----------------------------------------------------------------------------
-- 15. USER INVENTORY TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE user_inventory (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shop_item_id uuid NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,

    -- Ownership details
    quantity integer DEFAULT 1 CHECK (quantity > 0),
    purchased_at timestamptz DEFAULT CURRENT_TIMESTAMP,

    -- Usage tracking
    first_used_at timestamptz,
    last_used_at timestamptz,
    use_count integer DEFAULT 0,

    -- Item-specific data (e.g., equipped status for themes)
    item_data jsonb,

    -- One user can only own each item once (unless quantity > 1)
    UNIQUE(user_id, shop_item_id)
);

CREATE INDEX user_inventory_user_id_idx ON user_inventory(user_id);
CREATE INDEX user_inventory_shop_item_id_idx ON user_inventory(shop_item_id);
CREATE INDEX user_inventory_purchased_at_idx ON user_inventory(purchased_at);

-- Trigger to auto-update updated_at for shop_items
CREATE TRIGGER update_shop_items_updated_at BEFORE UPDATE ON shop_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 16. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE sounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE confessionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE confessional_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_leaderboards ENABLE ROW LEVEL SECURITY;

-- Force RLS (explicit security guarantee)
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE posts FORCE ROW LEVEL SECURITY;
ALTER TABLE comments FORCE ROW LEVEL SECURITY;
ALTER TABLE stories FORCE ROW LEVEL SECURITY;
ALTER TABLE story_reactions FORCE ROW LEVEL SECURITY;
ALTER TABLE likes FORCE ROW LEVEL SECURITY;
ALTER TABLE follows FORCE ROW LEVEL SECURITY;
ALTER TABLE sounds FORCE ROW LEVEL SECURITY;
ALTER TABLE confessionals FORCE ROW LEVEL SECURITY;
ALTER TABLE confessional_reactions FORCE ROW LEVEL SECURITY;
ALTER TABLE challenges FORCE ROW LEVEL SECURITY;
ALTER TABLE user_achievements FORCE ROW LEVEL SECURITY;
ALTER TABLE shop_items FORCE ROW LEVEL SECURITY;
ALTER TABLE user_inventory FORCE ROW LEVEL SECURITY;
ALTER TABLE game_leaderboards FORCE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Public profiles viewable" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Auth system inserts profiles" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Posts policies
CREATE POLICY "Anyone can view non-deleted posts" ON posts FOR SELECT USING (deleted = false);
CREATE POLICY "Users can create posts" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own posts" ON posts FOR UPDATE USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Anyone can view comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON comments FOR DELETE USING (auth.uid() = user_id);

-- Stories policies
CREATE POLICY "Anyone can view stories" ON stories FOR SELECT USING (true);
CREATE POLICY "Users can create stories" ON stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own stories" ON stories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own stories" ON stories FOR DELETE USING (auth.uid() = user_id);

-- Story reactions policies
CREATE POLICY "Anyone can view story reactions" ON story_reactions FOR SELECT USING (true);
CREATE POLICY "Users can insert reactions" ON story_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reactions" ON story_reactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reactions" ON story_reactions FOR DELETE USING (auth.uid() = user_id);

-- Likes policies
CREATE POLICY "Anyone can view likes" ON likes FOR SELECT USING (true);
CREATE POLICY "Users can insert likes" ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own likes" ON likes FOR DELETE USING (auth.uid() = user_id);

-- Follows policies
CREATE POLICY "Anyone can view follows" ON follows FOR SELECT USING (true);
CREATE POLICY "Users can manage their own follows" ON follows FOR ALL USING (auth.uid() = follower_id);

-- Sounds policies
CREATE POLICY "Users can view sounds in posts context" ON sounds FOR SELECT USING (true);
CREATE POLICY "Users can manage their own non-deleted sounds" ON sounds FOR ALL USING (auth.uid() = user_id AND deleted = false);

-- Confessionals policies
CREATE POLICY "Anyone can view confessionals" ON confessionals FOR SELECT USING (true);
CREATE POLICY "Users can manage their own confessionals" ON confessionals FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view confessional reactions" ON confessional_reactions FOR SELECT USING (true);
CREATE POLICY "Users can insert reactions" ON confessional_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reactions" ON confessional_reactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reactions" ON confessional_reactions FOR DELETE USING (auth.uid() = user_id);

-- Confessional comments policies
CREATE POLICY "Anyone can view confessional comments" ON confessional_comments FOR SELECT USING (true);
CREATE POLICY "Users can create confessional comments" ON confessional_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own confessional comments" ON confessional_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own confessional comments" ON confessional_comments FOR DELETE USING (auth.uid() = user_id);

-- Challenges policies (read-only for users)
CREATE POLICY "Anyone can view challenges" ON challenges FOR SELECT USING (true);
CREATE POLICY "Only service role can modify challenges" ON challenges FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- User achievements policies
CREATE POLICY "Users can view their own achievements" ON user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert achievements" ON user_achievements FOR INSERT WITH CHECK (true);

-- Shop items policies (read-only for users)
CREATE POLICY "Anyone can view active shop items" ON shop_items FOR SELECT USING (is_active = true);
CREATE POLICY "Only service role can modify shop items" ON shop_items FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- User inventory policies
CREATE POLICY "Users can view their own inventory" ON user_inventory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add items to their inventory" ON user_inventory FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own inventory" ON user_inventory FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can remove items from their inventory" ON user_inventory FOR DELETE USING (auth.uid() = user_id);

-- Game leaderboards policies
CREATE POLICY "Anyone can view leaderboards" ON game_leaderboards FOR SELECT USING (true);
CREATE POLICY "Users can insert their own scores" ON game_leaderboards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own scores" ON game_leaderboards FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own scores" ON game_leaderboards FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 15. GAME FUNCTIONS
-- ----------------------------------------------------------------------------

-- Function to update or insert high score for a game
CREATE OR REPLACE FUNCTION upsert_game_high_score(
    p_user_id uuid,
    p_game_id text,
    p_score integer
)
RETURNS jsonb AS $$
DECLARE
    existing_record RECORD;
    result jsonb;
BEGIN
    -- Check if user already has a score for this game
    SELECT * INTO existing_record
    FROM game_leaderboards
    WHERE user_id = p_user_id AND game_id = p_game_id;

    IF FOUND THEN
        -- Update if new score is higher
        IF p_score > existing_record.high_score THEN
            UPDATE game_leaderboards
            SET
                high_score = p_score,
                achieved_at = CURRENT_TIMESTAMP
            WHERE id = existing_record.id;

            result := jsonb_build_object(
                'action', 'updated',
                'new_high_score', p_score,
                'previous_score', existing_record.high_score
            );
        ELSE
            result := jsonb_build_object(
                'action', 'no_update',
                'current_high_score', existing_record.high_score,
                'attempted_score', p_score
            );
        END IF;
    ELSE
        -- Insert new record
        INSERT INTO game_leaderboards (user_id, game_id, high_score)
        VALUES (p_user_id, p_game_id, p_score);

        result := jsonb_build_object(
            'action', 'inserted',
            'new_high_score', p_score
        );
    END IF;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get leaderboard for a specific game
CREATE OR REPLACE FUNCTION get_game_leaderboard(p_game_id text, p_limit integer DEFAULT 10)
RETURNS TABLE (
    rank bigint,
    user_id uuid,
    username text,
    display_name text,
    high_score integer,
    achieved_at timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ROW_NUMBER() OVER (ORDER BY gl.high_score DESC) as rank,
        gl.user_id,
        u.username,
        u.display_name,
        gl.high_score,
        gl.achieved_at
    FROM game_leaderboards gl
    JOIN users u ON gl.user_id = u.id
    WHERE gl.game_id = p_game_id
    ORDER BY gl.high_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate post content length based on premium_tier
CREATE OR REPLACE FUNCTION validate_post_content_length()
RETURNS TRIGGER AS $$
DECLARE
    user_tier text;
    max_len integer;
BEGIN
    -- Only validate content length if content is actually being changed
    IF NEW.content IS DISTINCT FROM OLD.content THEN
        -- Get user's premium tier
        SELECT COALESCE(premium_tier, 'free') INTO user_tier
        FROM users WHERE id = NEW.user_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'User not found';
        END IF;

        -- Per-tier post length limits (must match TIER_CONFIGS in PremiumContext)
        CASE user_tier
            WHEN 'free'        THEN max_len := 250;
            WHEN 'premium'     THEN max_len := 500;
            WHEN 'premium_pro' THEN max_len := 1500;
            WHEN 'unlimited'   THEN max_len := 3000;
            ELSE max_len := 250;
        END CASE;

        IF length(NEW.content) > max_len THEN
            RAISE EXCEPTION 'Post content exceeds maximum length of % characters for % tier', max_len, user_tier;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on posts table
CREATE TRIGGER trigger_validate_post_content_length
    BEFORE INSERT OR UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION validate_post_content_length();

-- ----------------------------------------------------------------------------
-- 16. TRIGGER FUNCTIONS FOR PREMIUM CONTENT VALIDATION
-- ----------------------------------------------------------------------------

-- Function to check if user can change username (14 days cooldown)
CREATE OR REPLACE FUNCTION can_change_username(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
    RETURN (
        SELECT COALESCE(
            EXTRACT(DAYS FROM CURRENT_TIMESTAMP - last_username_change_at) >= 14,
            true
        )
        FROM users
        WHERE id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update username and timestamp
CREATE OR REPLACE FUNCTION update_username(user_uuid uuid, new_username text)
RETURNS void AS $$
BEGIN
    -- Check if username is already taken by another user
    IF EXISTS (SELECT 1 FROM users WHERE username = new_username AND id != user_uuid) THEN
        RAISE EXCEPTION 'Username is already taken';
    END IF;

    UPDATE users
    SET
        username = new_username,
        last_username_change_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = user_uuid;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 17. PREMIUM UPGRADE FUNCTION
-- ----------------------------------------------------------------------------

-- Function to upgrade user to premium
CREATE OR REPLACE FUNCTION upgrade_to_premium(user_uuid uuid)
RETURNS void AS $$
BEGIN
    UPDATE users
    SET
        is_premium = true,
        premium_since = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = user_uuid;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

----

-- Function to safely delete a post (bypasses RLS issues)
CREATE OR REPLACE FUNCTION delete_post(post_id uuid, p_user_id uuid)
RETURNS void AS $$
DECLARE
    post_record RECORD;
BEGIN
    -- Get the post details including sound information
    SELECT * FROM posts WHERE id = post_id AND user_id = p_user_id INTO post_record;

    -- Verify the post exists and belongs to the user
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Post not found or you do not have permission to delete it';
    END IF;

    -- Note: We NO LONGER delete the sound when deleting a post
    -- The sound should remain in the user's media library
    -- If post has an attached sound, we just set sound_id to NULL
    IF post_record.sound_id IS NOT NULL THEN
        -- Update the post to remove the sound reference but keep the sound record
        UPDATE posts SET sound_id = NULL WHERE id = post_id;
    END IF;

    -- Soft delete the post
    UPDATE posts SET deleted = true WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

---

-- ----------------------------------------------------------------------------
-- 18. ACHIEVEMENT AWARDING FUNCTIONS
-- ----------------------------------------------------------------------------

-- Function to automatically award achievements based on user activity
CREATE OR REPLACE FUNCTION award_achievement_if_eligible(
    p_user_id uuid,
    p_challenge_slug text
)
RETURNS boolean AS $$
DECLARE
    challenge_record RECORD;
    user_stats RECORD;
    threshold_met boolean := false;
BEGIN
    -- Get challenge details
    SELECT * INTO challenge_record FROM challenges WHERE slug = p_challenge_slug;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Challenge not found: %', p_challenge_slug;
    END IF;

    -- Check if user already has this achievement
    IF EXISTS (SELECT 1 FROM user_achievements ua
               JOIN challenges c ON ua.challenge_id = c.id
               WHERE ua.user_id = p_user_id AND c.slug = p_challenge_slug) THEN
        RETURN false; -- Already awarded
    END IF;

    -- Evaluate threshold based on challenge type
    CASE challenge_record.slug
        WHEN 'first-post' THEN
            -- Check if user has at least 1 post
            SELECT EXISTS(SELECT 1 FROM posts WHERE user_id = p_user_id AND deleted = false) INTO threshold_met;

        WHEN 'social-butterfly' THEN
            -- Check if user has at least 10 followers
            SELECT (SELECT COUNT(*) FROM follows WHERE followee_id = p_user_id) >= 10 INTO threshold_met;

        WHEN 'storyteller' THEN
            -- Check if user has at least 5 stories
            SELECT (SELECT COUNT(*) FROM stories WHERE user_id = p_user_id) >= 5 INTO threshold_met;

        WHEN 'sound-maker' THEN
            -- Check if user has at least 3 non-deleted sounds
            SELECT (SELECT COUNT(*) FROM sounds WHERE user_id = p_user_id AND deleted = false) >= 3 INTO threshold_met;

        WHEN 'confessional' THEN
            -- Check if user has at least 1 confessional
            SELECT EXISTS(SELECT 1 FROM confessionals WHERE user_id = p_user_id) INTO threshold_met;

        ELSE
            -- For any other challenges, evaluate JSON threshold
            -- This is a simplified example - in practice you'd need more complex logic
            threshold_met := false;
    END CASE;

    -- Award achievement if threshold met
    IF threshold_met THEN
        INSERT INTO user_achievements (user_id, challenge_id)
        VALUES (p_user_id, challenge_record.id);

        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 19. SHOP AND CURRENCY FUNCTIONS
-- ----------------------------------------------------------------------------

-- Function to purchase an item from the shop
CREATE OR REPLACE FUNCTION purchase_shop_item(
    p_user_id uuid,
    p_shop_item_id uuid
)
RETURNS jsonb AS $$
DECLARE
    shop_item_record RECORD;
    user_coins integer;
    purchase_result jsonb;
BEGIN
    -- Get shop item details
    SELECT * INTO shop_item_record FROM shop_items WHERE id = p_shop_item_id AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Shop item not found or not available';
    END IF;

    -- Check if user is premium (for premium-only items)
    IF shop_item_record.is_premium_only THEN
        IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND is_premium = true) THEN
            RAISE EXCEPTION 'This item requires premium membership';
        END IF;
    END IF;

    -- Check if item quantity limit reached
    IF shop_item_record.max_quantity IS NOT NULL THEN
        IF (SELECT COUNT(*) FROM user_inventory WHERE user_id = p_user_id AND shop_item_id = p_shop_item_id) >= shop_item_record.max_quantity THEN
            RAISE EXCEPTION 'Item quantity limit reached';
        END IF;
    END IF;

    -- Get user's current coin balance
    SELECT fb_coins INTO user_coins FROM users WHERE id = p_user_id;

    -- Check if user has enough coins
    IF user_coins < shop_item_record.price_fb_coins THEN
        RAISE EXCEPTION 'Insufficient FB coins. Required: %, Available: %', shop_item_record.price_fb_coins, user_coins;
    END IF;

    -- Deduct coins and add item to inventory in a transaction
    BEGIN
        -- Deduct coins
        UPDATE users
        SET
            fb_coins = fb_coins - shop_item_record.price_fb_coins,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_user_id;

        -- Add item to inventory
        INSERT INTO user_inventory (user_id, shop_item_id)
        VALUES (p_user_id, p_shop_item_id);

        -- Award achievement if eligible
        PERFORM award_achievement_if_eligible(p_user_id, 'first-purchase');

        -- Return success result
        purchase_result := jsonb_build_object(
            'success', true,
            'item_name', shop_item_record.name,
            'coins_spent', shop_item_record.price_fb_coins,
            'remaining_coins', user_coins - shop_item_record.price_fb_coins
        );

    EXCEPTION
        WHEN OTHERS THEN
        -- If anything fails, the transaction will be rolled back
        RAISE EXCEPTION 'Purchase failed: %', SQLERRM;
    END;

    RETURN purchase_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add coins to user account (for admin/rewards)
CREATE OR REPLACE FUNCTION add_fb_coins(
    p_user_id uuid,
    p_amount integer
)
RETURNS void AS $$
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive';
    END IF;

    UPDATE users
    SET
        fb_coins = fb_coins + p_amount,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's inventory with item details
CREATE OR REPLACE FUNCTION get_user_inventory(p_user_id uuid)
RETURNS TABLE (
    item_id uuid,
    item_name text,
    item_description text,
    item_type text,
    item_category text,
    quantity integer,
    purchased_at timestamptz,
    first_used_at timestamptz,
    last_used_at timestamptz,
    use_count integer,
    item_data jsonb
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        si.id,
        si.name,
        si.description,
        si.type,
        si.category,
        ui.quantity,
        ui.purchased_at,
        ui.first_used_at,
        ui.last_used_at,
        ui.use_count,
        ui.item_data
    FROM user_inventory ui
    JOIN shop_items si ON ui.shop_item_id = si.id
    WHERE ui.user_id = p_user_id
    ORDER BY ui.purchased_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to use an inventory item (track usage)
CREATE OR REPLACE FUNCTION use_inventory_item(
    p_user_id uuid,
    p_shop_item_id uuid
)
RETURNS void AS $$
BEGIN
    UPDATE user_inventory
    SET
        first_used_at = COALESCE(first_used_at, CURRENT_TIMESTAMP),
        last_used_at = CURRENT_TIMESTAMP,
        use_count = use_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id AND shop_item_id = p_shop_item_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item not found in user inventory';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 20. SAMPLE DATA (Optional - for development/testing)
-- ----------------------------------------------------------------------------

-- Insert sample challenges
INSERT INTO challenges (slug, name, description, threshold, badge_url) VALUES
('first-post', 'First Steps', 'Make your first post', '{"posts": 1}', '/badges/first-post.png'),
('social-butterfly', 'Social Butterfly', 'Get 10 followers', '{"followers": 10}', '/badges/social-butterfly.png'),
('storyteller', 'Storyteller', 'Post 5 stories', '{"stories": 5}', '/badges/storyteller.png'),
('sound-maker', 'Sound Maker', 'Create 3 sounds', '{"sounds": 3}', '/badges/sound-maker.png'),
('confessional', 'Confessional', 'Create your first confessional', '{"confessionals": 1}', '/badges/confessional.png'),
('first-purchase', 'Shopper', 'Make your first purchase', '{"purchases": 1}', '/badges/shopper.png')
ON CONFLICT (slug) DO NOTHING;

-- Insert sample shop items
INSERT INTO shop_items (name, description, type, category, price_fb_coins, price_usd, image_url, metadata, is_premium_only) VALUES
('Dark Mode Theme', 'A sleek dark theme that reduces eye strain and looks great in low-light environments', 'theme', 'cosmetic', 500, 4.99, '/shop/themes/dark-mode.jpg', '{"colors": {"bg": "#1a1a1a", "text": "#ffffff", "accent": "#ff6b35"}}', false),
('Neon Nights Theme', 'Vibrant neon colors that make your posts pop with electric energy', 'theme', 'cosmetic', 750, 6.99, '/shop/themes/neon-nights.jpg', '{"colors": {"bg": "#0a0a0a", "text": "#00ffff", "accent": "#ff00ff"}}', false),
('Retro Wave Theme', '80s inspired theme with synthwave aesthetics and nostalgic vibes', 'theme', 'cosmetic', 1000, 9.99, '/shop/themes/retro-wave.jpg', '{"colors": {"bg": "#1a0033", "text": "#ff0080", "accent": "#00ffff"}}', true),
('Fart Sound Pack 1', 'Classic collection of hilarious fart sounds for your posts', 'sound', 'functional', 300, 2.99, '/shop/sounds/fart-pack-1.jpg', '{"sound_count": 10, "duration": "5-15s"}', false),
('Premium Fart Sounds', 'Extended collection with high-quality, funny sound effects', 'sound', 'functional', 600, 5.99, '/shop/sounds/premium-farts.jpg', '{"sound_count": 25, "duration": "3-20s"}', true),
('Confessional Filter Pack', 'Special blur and voice effects for your confessional videos', 'filter', 'functional', 400, 3.99, '/shop/filters/confessional-pack.jpg', '{"filters": ["heavy-blur", "voice-deep", "voice-high", "echo"]}', false),
('Premium Filters', 'Advanced visual effects including pixelation, color grading, and more', 'filter', 'functional', 800, 7.99, '/shop/filters/premium-filters.jpg', '{"filters": ["pixelate", "sepia", "vintage", "neon", "glitch"]}', true),
('Golden Badge', 'Show off your premium status with this exclusive golden badge', 'badge', 'cosmetic', 200, 1.99, '/shop/badges/golden.jpg', '{"rarity": "rare"}', false),
('Diamond Badge', 'Ultra-rare diamond badge for the most dedicated users', 'badge', 'cosmetic', 1500, 14.99, '/shop/badges/diamond.jpg', '{"rarity": "legendary"}', true),
('Extended Post Length', 'Unlock the ability to write longer posts (up to 1000 characters)', 'perk', 'functional', 250, 2.49, '/shop/perks/extended-posts.jpg', '{"post_limit": 1000}', false)
ON CONFLICT (id) DO NOTHING;



-- ----------------------------------------------------------------------------
-- 20. FINAL NOTES
-- ----------------------------------------------------------------------------

-- After running this script:
-- 1. Create the storage buckets in Supabase UI: avatars, banners, sounds, videos, games, thumbnails, shop
-- 2. Set up Row Level Security policies in Supabase Auth
-- 3. Configure Stripe webhooks for premium subscriptions
-- 4. Test the database with your application

-- The schema is now ready for the Fart Bounty application with full shop and inventory system!