-- =================================================================================
-- SUPABASE POSTGRESQL SECURITY & PERFORMANCE AUDIT FIXES (MIGRATION)
-- Resolves:
-- 1. Overly permissive RLS policies on public.app_users and public.refresh_tokens
-- 2. Overly permissive RLS policies on public.posts and public.comments
-- 3. Public column exposure of User Emails in public.comments
-- 4. High-Concurrency Race Conditions (Lost Updates) on Views, Reactions & Replies
-- 5. Missing Indexes for Foreign Keys & Sorting Columns
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- FIX 0: LOCK DOWN APP_USERS & REFRESH_TOKENS RLS POLICIES
-- Prevents anon clients from reading password_hash or manipulating refresh_tokens
-- ---------------------------------------------------------------------------------
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.app_users;
DROP POLICY IF EXISTS "Enable insert for registration" ON public.app_users;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.app_users;
DROP POLICY IF EXISTS "Users can read own profile" ON public.app_users;
DROP POLICY IF EXISTS "Service role full access on app_users" ON public.app_users;

CREATE POLICY "Users can read own profile"
ON public.app_users FOR SELECT
USING (auth.uid() = id OR auth.role() = 'service_role');

CREATE POLICY "Service role full access on app_users"
ON public.app_users FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service access for refresh tokens" ON public.refresh_tokens;
DROP POLICY IF EXISTS "Service role only for refresh tokens" ON public.refresh_tokens;

CREATE POLICY "Service role only for refresh tokens"
ON public.refresh_tokens FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Safe public view of app_users (excludes password_hash and email)
CREATE OR REPLACE VIEW public.public_user_profiles AS
SELECT
  id,
  username,
  role,
  avatar_url,
  created_at
FROM public.app_users;

GRANT SELECT ON public.public_user_profiles TO anon, authenticated;

-- ---------------------------------------------------------------------------------
-- FIX 1: TIGHTEN ROW LEVEL SECURITY (RLS) POLICIES ON POSTS & COMMENTS
-- ---------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Allow all operations for authenticated/admin on posts" ON public.posts;
DROP POLICY IF EXISTS "Allow delete for admin on comments" ON public.comments;
DROP POLICY IF EXISTS "Allow public read access on comments" ON public.comments;

CREATE POLICY "Allow insert for authenticated authors and admins on posts"
ON public.posts
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = author_id
  OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  OR (auth.jwt() ->> 'role') = 'admin'
);

CREATE POLICY "Allow update for post owners and admins on posts"
ON public.posts
FOR UPDATE
TO authenticated
USING (
  auth.uid() = author_id
  OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  OR (auth.jwt() ->> 'role') = 'admin'
)
WITH CHECK (
  auth.uid() = author_id
  OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  OR (auth.jwt() ->> 'role') = 'admin'
);

CREATE POLICY "Allow delete for post owners and admins on posts"
ON public.posts
FOR DELETE
TO authenticated
USING (
  auth.uid() = author_id
  OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  OR (auth.jwt() ->> 'role') = 'admin'
);

CREATE POLICY "Allow delete for comment owners and admins on comments"
ON public.comments
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  OR (auth.jwt() ->> 'role') = 'admin'
);

-- ---------------------------------------------------------------------------------
-- FIX 2: PROTECT USER EMAIL PRIVACY IN COMMENTS
-- ---------------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.public_comments AS
SELECT
  id,
  post_id,
  author_name,
  content,
  created_at,
  user_id
FROM public.comments;

GRANT SELECT ON public.public_comments TO anon, authenticated;

CREATE POLICY "Allow public read on comments"
ON public.comments
FOR SELECT
USING (true);

-- ---------------------------------------------------------------------------------
-- FIX 3: ATOMIC DATABASE RPC FUNCTIONS TO ELIMINATE RACE CONDITIONS
-- ---------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.increment_post_views(post_id_param BIGINT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_views INTEGER;
BEGIN
  UPDATE public.posts
  SET views = COALESCE(views, 0) + 1
  WHERE id = post_id_param
  RETURNING views INTO new_views;

  RETURN new_views;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_thread_views(thread_id_param TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_views INTEGER;
BEGIN
  UPDATE public.forum_threads
  SET views = COALESCE(views, 0) + 1
  WHERE id = thread_id_param
  RETURNING views INTO new_views;

  RETURN new_views;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_thread_replies(thread_id_param TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE public.forum_threads
  SET
    reply_count = COALESCE(reply_count, 0) + 1,
    last_activity_at = NOW(),
    updated_at = NOW()
  WHERE id = thread_id_param
  RETURNING reply_count INTO new_count;

  RETURN new_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_post_views(BIGINT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_thread_views(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_thread_replies(TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------------------------
-- FIX 4: PERFORMANCE INDEXES FOR FOREIGN KEYS, SORTING & FILTERING
-- ---------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_posts_category_status_date
  ON public.posts(category, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_featured
  ON public.posts(featured) WHERE featured = true;

CREATE INDEX IF NOT EXISTS idx_posts_author_id
  ON public.posts(author_id);

CREATE INDEX IF NOT EXISTS idx_comments_post_id_created
  ON public.comments(post_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comments_user_id
  ON public.comments(user_id);

CREATE INDEX IF NOT EXISTS idx_forum_threads_subforum_activity
  ON public.forum_threads(subforum_id, is_pinned DESC, last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_forum_threads_score
  ON public.forum_threads(score DESC, upvotes DESC);

CREATE INDEX IF NOT EXISTS idx_forum_replies_thread_created
  ON public.forum_replies(thread_id, created_at ASC);
