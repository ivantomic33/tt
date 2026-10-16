-- ============================================================================
--  NEXUS GAMING PORTAL — KONSOLIDOVANA ŠEMA BAZE (Supabase / PostgreSQL)
--  Verzija 2.0  |  Datum: 2026-10-16
-- ----------------------------------------------------------------------------
--  Ovaj jedan fajl zamenjuje ranije odvojene fajlove:
--    * supabase/schema.sql (v1.0)
--    * supabase/migrations/20261015_audit_fixes.sql
--    * supabase/migrations/20261015_auth_security_hardening.sql
--    * supabase/migrations/20261015_enforce_app_users_uniqueness.sql
--    * supabase/migrations/20261016_password_reset_tokens.sql
--    * supabase/migrations/20261016_rls_lockdown_content.sql
--    * supabase/migrations/20261016_rls_lockdown_sensitive.sql
--  (stare migracije su arhivirane u supabase/migrations/_archive/)
--
--  KARAKTERISTIKE:
--    * 100% idempotentan — bezbedno ga je pokrenuti više puta, i na potpuno
--      nov projekat i na postojeću bazu (kolone se dodaju preko
--      ADD COLUMN IF NOT EXISTS, politike preko DROP + CREATE).
--    * "Secure by default" RLS — anon klijent ima SAMO javno čitanje sadržaja.
--      Svi upisi (posts/categories/tags/comments/reactions/forum/newsletter)
--      idu isključivo preko autentifikovanog servera (Express API + service_role).
--    * Bez seed/demo podataka — samo šema, indeksi, RLS, funkcije i view-ovi.
--
--  POKRETANJE: nalepljuj ceo fajl u Supabase SQL Editor i pokreni odjednom.
-- ============================================================================


-- ============================================================================
-- 0. EKSTENZIJE
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()


-- ============================================================================
-- 1. TABELE
-- ============================================================================

-- 1.1 KATEGORIJE
CREATE TABLE IF NOT EXISTS public.categories (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  color       TEXT DEFAULT '#a855f7',
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 1.2 TAGOVI
CREATE TABLE IF NOT EXISTS public.tags (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL
);

-- 1.3 VESTI / POSTOVI
--     author_id je obavezan za BOLA/IDOR proveru vlasništva (vidi postsController).
--     published je denormalizovana zastavica koja se automatski sinhronizuje sa status.
CREATE TABLE IF NOT EXISTS public.posts (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  excerpt       TEXT,
  content       TEXT NOT NULL,
  cover_image   TEXT,
  category_id   INT REFERENCES public.categories(id) ON DELETE SET NULL,
  author_id     TEXT,
  author_name   TEXT DEFAULT 'Nexus Urednik',
  author_role   TEXT DEFAULT 'Autor',
  author_avatar TEXT,
  status        TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  published     BOOLEAN DEFAULT FALSE,
  views         INT DEFAULT 0,
  views_count   INT DEFAULT 0,
  likes         INT DEFAULT 0,
  reading_time  INT DEFAULT 4,
  featured      BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  published_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 1.4 VEZA POSTOVA I TAGOVA
CREATE TABLE IF NOT EXISTS public.post_tags (
  post_id INT REFERENCES public.posts(id) ON DELETE CASCADE,
  tag_id  INT REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- 1.5 KOMENTARI
--     user_id: vezuje komentar za prijavljenog korisnika (opciono).
--     author_email je osetljiv i NE izlaže se anon klijentu (vidi view public_comments).
CREATE TABLE IF NOT EXISTS public.comments (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  post_id      INT REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id      TEXT,
  author_name  TEXT NOT NULL,
  author_email TEXT,
  content      TEXT NOT NULL,
  status       TEXT DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'spam')),
  likes        INT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 1.6 REAKCIJE NA POSTOVE (like / gg / hype) — pristup isključivo server
CREATE TABLE IF NOT EXISTS public.post_reactions (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  post_id       INT REFERENCES public.posts(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'gg', 'hype')),
  client_id     TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (post_id, reaction_type, client_id)
);

-- 1.7 NEWSLETTER PRETPLATNICI — upis isključivo preko rate-limited servera
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email         TEXT UNIQUE NOT NULL,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  active        BOOLEAN DEFAULT TRUE
);

-- 1.8 KORISNICI (app_users) — heširane lozinke, zaključavanje naloga
CREATE TABLE IF NOT EXISTS public.app_users (
  id                    TEXT PRIMARY KEY,
  email                 TEXT UNIQUE NOT NULL,
  password_hash         TEXT NOT NULL,
  name                  TEXT,
  role                  TEXT DEFAULT 'user',
  avatar_url            TEXT,
  failed_login_attempts INT DEFAULT 0,
  locked_until          TIMESTAMPTZ,
  terms_accepted_at     TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 1.9 REFRESH TOKENI (rotacija + instant opoziv) — pristup isključivo server
CREATE TABLE IF NOT EXISTS public.refresh_tokens (
  jti         TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES public.app_users(id) ON DELETE CASCADE,
  family_id   TEXT NOT NULL,
  is_used     BOOLEAN DEFAULT FALSE,
  is_revoked  BOOLEAN DEFAULT FALSE,
  user_agent  TEXT,
  ip_address  TEXT,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 1.10 PASSWORD RESET TOKENI (single-use evidencija) — pristup isključivo server
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  jti        TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.11 FORUM — POTFORUMI
CREATE TABLE IF NOT EXISTS public.forum_subforums (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  description   TEXT,
  icon          TEXT DEFAULT 'Layers',
  color         TEXT DEFAULT '#a855f7',
  badge         TEXT,
  display_order INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 1.12 FORUM — TEME
CREATE TABLE IF NOT EXISTS public.forum_threads (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title            TEXT NOT NULL,
  slug             TEXT UNIQUE NOT NULL,
  subforum_id      TEXT NOT NULL,
  author_id        TEXT,
  author_name      TEXT NOT NULL,
  author_role      TEXT DEFAULT 'Član',
  author_avatar    TEXT,
  author_karma     INT DEFAULT 50,
  content          TEXT NOT NULL,
  tags             TEXT[] DEFAULT '{}',
  poll             JSONB,
  views            INT DEFAULT 0,
  upvotes          INT DEFAULT 0,
  downvotes        INT DEFAULT 0,
  score            INT DEFAULT 0,
  reply_count      INT DEFAULT 0,
  is_pinned        BOOLEAN DEFAULT FALSE,
  is_locked        BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.13 FORUM — ODGOVORI (ugnježđeni)
CREATE TABLE IF NOT EXISTS public.forum_replies (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  thread_id     TEXT REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  parent_id     TEXT REFERENCES public.forum_replies(id) ON DELETE CASCADE,
  author_id     TEXT,
  author_name   TEXT NOT NULL,
  author_role   TEXT DEFAULT 'Član',
  author_avatar TEXT,
  author_karma  INT DEFAULT 50,
  content       TEXT NOT NULL,
  upvotes       INT DEFAULT 0,
  downvotes     INT DEFAULT 0,
  score         INT DEFAULT 0,
  mentions      TEXT[] DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 1.14 FORUM — GLASOVI (karma) — pristup isključivo server
CREATE TABLE IF NOT EXISTS public.forum_votes (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  target_id   TEXT NOT NULL,       -- thread_id ili reply_id
  target_type TEXT NOT NULL CHECK (target_type IN ('thread', 'reply')),
  client_id   TEXT NOT NULL,
  vote_type   TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (target_id, client_id)
);

-- 1.15 FORUM — ČLANOVI (primarni ključ je "name")
CREATE TABLE IF NOT EXISTS public.forum_members (
  name           TEXT PRIMARY KEY,
  role           TEXT DEFAULT 'Član',
  avatar         TEXT,
  cover_banner   TEXT,
  base_karma     INT DEFAULT 50,
  is_online      BOOLEAN DEFAULT FALSE,
  bio            TEXT,
  steam_id       TEXT,
  discord_tag    TEXT,
  twitch         TEXT,
  youtube        TEXT,
  psn_id         TEXT,
  xbox_gamertag  TEXT,
  badges         JSONB DEFAULT '[]'::jsonb,
  xp_points      INT DEFAULT 150,
  karma_tier     TEXT DEFAULT 'Silver',
  status         TEXT DEFAULT 'active' CHECK (status IN ('active', 'banned')),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 1.16 PRIJAVE SADRŽAJA (reports) — pristup isključivo server
CREATE TABLE IF NOT EXISTS public.reports (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  reporter_id  TEXT,
  reporter_name TEXT,
  target_type  TEXT NOT NULL CHECK (target_type IN ('thread', 'comment', 'reply', 'user')),
  target_id    TEXT NOT NULL,
  target_title TEXT,
  reason       TEXT NOT NULL,
  details      TEXT,
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 1.17 SAČUVANI ČLANCI (bookmarks) — veza korisnik ↔ post.
--      Prikazuje se javno na profilu korisnika, a svi upisi idu preko servera.
CREATE TABLE IF NOT EXISTS public.user_bookmarks (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_name  TEXT NOT NULL,
  post_id    INT NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_name, post_id)
);


-- ============================================================================
-- 2. DOPUNE ZA POSTOJEĆE BAZE
--    CREATE TABLE IF NOT EXISTS ne menja postojeće tabele, pa ovde eksplicitno
--    dodajemo kolone koje su kroz istoriju dodavane migracijama.
-- ============================================================================
ALTER TABLE public.posts     ADD COLUMN IF NOT EXISTS author_id    TEXT;
ALTER TABLE public.posts     ADD COLUMN IF NOT EXISTS published    BOOLEAN DEFAULT FALSE;
ALTER TABLE public.posts     ADD COLUMN IF NOT EXISTS views_count  INT DEFAULT 0;

ALTER TABLE public.comments  ADD COLUMN IF NOT EXISTS user_id      TEXT;

ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS avatar_url            TEXT;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS locked_until          TIMESTAMPTZ;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS terms_accepted_at     TIMESTAMPTZ;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS updated_at            TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.forum_members ADD COLUMN IF NOT EXISTS cover_banner  TEXT;
ALTER TABLE public.forum_members ADD COLUMN IF NOT EXISTS steam_id      TEXT;
ALTER TABLE public.forum_members ADD COLUMN IF NOT EXISTS discord_tag   TEXT;
ALTER TABLE public.forum_members ADD COLUMN IF NOT EXISTS twitch        TEXT;
ALTER TABLE public.forum_members ADD COLUMN IF NOT EXISTS youtube       TEXT;
ALTER TABLE public.forum_members ADD COLUMN IF NOT EXISTS psn_id        TEXT;
ALTER TABLE public.forum_members ADD COLUMN IF NOT EXISTS xbox_gamertag TEXT;
ALTER TABLE public.forum_members ADD COLUMN IF NOT EXISTS badges        JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.forum_members ADD COLUMN IF NOT EXISTS xp_points     INT DEFAULT 150;
ALTER TABLE public.forum_members ADD COLUMN IF NOT EXISTS karma_tier    TEXT DEFAULT 'Silver';
ALTER TABLE public.forum_members ADD COLUMN IF NOT EXISTS status        TEXT DEFAULT 'active';


-- ============================================================================
-- 3. DEDUPLIKACIJA PRE UVOĐENJA CASE-INSENSITIVE UNIQUE INDEKSA
--    Idempotentno i bezbedno: rešava postojeće duplikate pre kreiranja indeksa.
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'app_users') THEN

    -- Email (zadržavamo najstariji nalog)
    DELETE FROM public.app_users
    WHERE id IN (
      SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY LOWER(TRIM(email))
                 ORDER BY created_at ASC NULLS LAST, id ASC
               ) AS rn
        FROM public.app_users
        WHERE email IS NOT NULL AND TRIM(email) <> ''
      ) t
      WHERE t.rn > 1
    );

    -- Korisničko ime: duplikatima dodajemo kratak jedinstveni sufiks
    UPDATE public.app_users
    SET name = TRIM(name) || '_' || SUBSTRING(MD5(id || COALESCE(created_at::text, '')), 1, 4)
    WHERE id IN (
      SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY LOWER(TRIM(name))
                 ORDER BY created_at ASC NULLS LAST, id ASC
               ) AS rn
        FROM public.app_users
        WHERE name IS NOT NULL AND TRIM(name) <> ''
      ) t
      WHERE t.rn > 1
    );

    -- Prazna / NULL imena dobijaju jedinstvenu oznaku
    UPDATE public.app_users
    SET name = 'Gamer_' || SUBSTRING(id, 1, 6)
    WHERE name IS NULL OR TRIM(name) = '';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'forum_members') THEN
    DELETE FROM public.forum_members
    WHERE name IN (
      SELECT name FROM (
        SELECT name,
               ROW_NUMBER() OVER (
                 PARTITION BY LOWER(TRIM(name))
                 ORDER BY created_at ASC NULLS LAST, name ASC
               ) AS rn
        FROM public.forum_members
        WHERE name IS NOT NULL AND TRIM(name) <> ''
      ) t
      WHERE t.rn > 1
    );
  END IF;
END $$;


-- ============================================================================
-- 4. INDEKSI
-- ============================================================================

-- Posts
CREATE INDEX IF NOT EXISTS idx_posts_status             ON public.posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_published_at       ON public.posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category           ON public.posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_slug               ON public.posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_views              ON public.posts(views DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_id          ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_category_status_date ON public.posts(category_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_featured           ON public.posts(featured) WHERE featured = TRUE;

-- Comments
CREATE INDEX IF NOT EXISTS idx_comments_post_id         ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id_created ON public.comments(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_user_id         ON public.comments(user_id);

-- Reakcije
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id   ON public.post_reactions(post_id);

-- Tokeni
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family             ON public.refresh_tokens(family_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user               ON public.refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email       ON public.password_reset_tokens(LOWER(email));

-- Korisnici (case-insensitive jedinstvenost)
CREATE INDEX IF NOT EXISTS idx_app_users_email                   ON public.app_users(email);
CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_lower_uidx     ON public.app_users(LOWER(TRIM(email)));
CREATE UNIQUE INDEX IF NOT EXISTS app_users_name_lower_uidx      ON public.app_users(LOWER(TRIM(name)));

-- Forum
CREATE INDEX IF NOT EXISTS idx_forum_threads_subforum_activity   ON public.forum_threads(subforum_id, is_pinned DESC, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_threads_score               ON public.forum_threads(score DESC, upvotes DESC);
CREATE INDEX IF NOT EXISTS idx_forum_replies_thread_created      ON public.forum_replies(thread_id, created_at ASC);
CREATE UNIQUE INDEX IF NOT EXISTS forum_members_name_lower_uidx  ON public.forum_members(LOWER(TRIM(name)));

-- Sačuvani članci
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user          ON public.user_bookmarks(LOWER(TRIM(user_name)));
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_created  ON public.user_bookmarks(user_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_post          ON public.user_bookmarks(post_id);


-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) — SECURE BY DEFAULT
--    Anon/authenticated imaju samo javno ČITANJE sadržaja.
--    Svi upisi idu preko servera (service_role), koji zaobilazi RLS.
-- ============================================================================

-- 5.1 KATEGORIJE / TAGOVI / POST_TAGS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_tags  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read categories"    ON public.categories;
DROP POLICY IF EXISTS "Public insert categories"  ON public.categories;
DROP POLICY IF EXISTS "Public update categories"  ON public.categories;
DROP POLICY IF EXISTS "Admin manage categories"   ON public.categories;
CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Public read tags"   ON public.tags;
DROP POLICY IF EXISTS "Public insert tags" ON public.tags;
DROP POLICY IF EXISTS "Admin manage tags"  ON public.tags;
CREATE POLICY "Public read tags" ON public.tags FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Public read post_tags"   ON public.post_tags;
DROP POLICY IF EXISTS "Public insert post_tags" ON public.post_tags;
DROP POLICY IF EXISTS "Admin manage post_tags"  ON public.post_tags;
CREATE POLICY "Public read post_tags" ON public.post_tags FOR SELECT USING (TRUE);

-- 5.2 POSTOVI — javno se čitaju samo objavljeni (service_role vidi sve)
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read published posts"                              ON public.posts;
DROP POLICY IF EXISTS "Author or Admin read drafts"                              ON public.posts;
DROP POLICY IF EXISTS "Public insert posts"                                      ON public.posts;
DROP POLICY IF EXISTS "Public update posts"                                      ON public.posts;
DROP POLICY IF EXISTS "Public delete posts"                                      ON public.posts;
DROP POLICY IF EXISTS "Admin full manage posts"                                  ON public.posts;
DROP POLICY IF EXISTS "Allow all operations for authenticated/admin on posts"    ON public.posts;
DROP POLICY IF EXISTS "Allow insert for authenticated authors and admins on posts" ON public.posts;
DROP POLICY IF EXISTS "Allow update for post owners and admins on posts"         ON public.posts;
DROP POLICY IF EXISTS "Allow delete for post owners and admins on posts"         ON public.posts;

CREATE POLICY "Public read published posts"
  ON public.posts FOR SELECT USING (status = 'published');

-- 5.3 KOMENTARI — bez javne politike nad tabelom (author_email je osetljiv).
--     Javno čitanje ide preko view-a public_comments (bez email-a), upis preko servera.
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read approved comments"                 ON public.comments;
DROP POLICY IF EXISTS "Public insert comments"                        ON public.comments;
DROP POLICY IF EXISTS "Admin manage comments"                         ON public.comments;
DROP POLICY IF EXISTS "Allow public read access on comments"          ON public.comments;
DROP POLICY IF EXISTS "Allow public read on comments"                 ON public.comments;
DROP POLICY IF EXISTS "Allow delete for admin on comments"            ON public.comments;
DROP POLICY IF EXISTS "Allow delete for comment owners and admins on comments" ON public.comments;

-- 5.4 REAKCIJE — isključivo server (GET/POST /api/posts/:id/reactions)
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read post_reactions"   ON public.post_reactions;
DROP POLICY IF EXISTS "Public insert post_reactions" ON public.post_reactions;
DROP POLICY IF EXISTS "Public delete post_reactions" ON public.post_reactions;

-- 5.5 NEWSLETTER — prijava preko rate-limited servera
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public insert newsletter"           ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Admin read newsletter subscribers"  ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Service role manage newsletter"     ON public.newsletter_subscribers;
CREATE POLICY "Service role manage newsletter"
  ON public.newsletter_subscribers FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 5.6 APP_USERS — vlasnik čita svoj profil + pun pristup samo za service_role
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public manage app_users"                    ON public.app_users;
DROP POLICY IF EXISTS "Enable read access for all users"           ON public.app_users;
DROP POLICY IF EXISTS "Enable insert for registration"             ON public.app_users;
DROP POLICY IF EXISTS "Enable update for users based on id"        ON public.app_users;
DROP POLICY IF EXISTS "Users read own profile"                     ON public.app_users;
DROP POLICY IF EXISTS "Users can read own profile"                 ON public.app_users;
DROP POLICY IF EXISTS "Service role full access on app_users"      ON public.app_users;
CREATE POLICY "Users can read own profile"
  ON public.app_users FOR SELECT
  USING (auth.uid()::text = id OR auth.role() = 'service_role');
CREATE POLICY "Service role full access on app_users"
  ON public.app_users FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 5.7 REFRESH TOKENS — isključivo server
ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own refresh tokens"     ON public.refresh_tokens;
DROP POLICY IF EXISTS "Public manage refresh_tokens"        ON public.refresh_tokens;
DROP POLICY IF EXISTS "Service access for refresh tokens"   ON public.refresh_tokens;
DROP POLICY IF EXISTS "Service role only for refresh tokens" ON public.refresh_tokens;
CREATE POLICY "Service role only for refresh tokens"
  ON public.refresh_tokens FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 5.8 PASSWORD RESET TOKENS — isključivo server
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role only for password reset tokens" ON public.password_reset_tokens;
CREATE POLICY "Service role only for password reset tokens"
  ON public.password_reset_tokens FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 5.9 FORUM — javno čitanje, upisi preko servera
ALTER TABLE public.forum_subforums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_threads   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_votes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_members   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read forum_subforums"  ON public.forum_subforums;
DROP POLICY IF EXISTS "Admin manage forum_subforums" ON public.forum_subforums;
CREATE POLICY "Public read forum_subforums" ON public.forum_subforums FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Public read forum_threads"    ON public.forum_threads;
DROP POLICY IF EXISTS "Public insert forum_threads"  ON public.forum_threads;
DROP POLICY IF EXISTS "Public update forum_threads"  ON public.forum_threads;
DROP POLICY IF EXISTS "Public delete forum_threads"  ON public.forum_threads;
CREATE POLICY "Public read forum_threads" ON public.forum_threads FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Public read forum_replies"    ON public.forum_replies;
DROP POLICY IF EXISTS "Public insert forum_replies"  ON public.forum_replies;
DROP POLICY IF EXISTS "Public update forum_replies"  ON public.forum_replies;
DROP POLICY IF EXISTS "Public delete forum_replies"  ON public.forum_replies;
CREATE POLICY "Public read forum_replies" ON public.forum_replies FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Public read forum_votes" ON public.forum_votes;
DROP POLICY IF EXISTS "Public write forum_votes" ON public.forum_votes;
CREATE POLICY "Public read forum_votes" ON public.forum_votes FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Public read forum_members" ON public.forum_members;
DROP POLICY IF EXISTS "Public write forum_members" ON public.forum_members;
CREATE POLICY "Public read forum_members" ON public.forum_members FOR SELECT USING (TRUE);

-- 5.10 REPORTS — isključivo server
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public manage reports"        ON public.reports;
DROP POLICY IF EXISTS "Service role manage reports"  ON public.reports;
CREATE POLICY "Service role manage reports"
  ON public.reports FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 5.11 SAČUVANI ČLANCI — čita/piše isključivo server (service_role)
ALTER TABLE public.user_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read user_bookmarks"         ON public.user_bookmarks;
DROP POLICY IF EXISTS "Service role manage user_bookmarks" ON public.user_bookmarks;
CREATE POLICY "Service role manage user_bookmarks"
  ON public.user_bookmarks FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ============================================================================
-- 6. FUNKCIJE I TRIGERI
-- ============================================================================

-- 6.1 Atomsko inkrementiranje pregleda posta (bez race condition-a)
--     Uklanjamo stari INT potpis (v1) da ne dođe do preopterećenja/ambiguity u RPC pozivu.
DROP FUNCTION IF EXISTS public.increment_post_views(INTEGER);
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

-- 6.2 Atomsko inkrementiranje pregleda teme
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

-- 6.3 Atomsko uvećanje broja odgovora i aktivnosti teme
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
  SET reply_count      = COALESCE(reply_count, 0) + 1,
      last_activity_at = NOW(),
      updated_at       = NOW()
  WHERE id = thread_id_param
  RETURNING reply_count INTO new_count;
  RETURN new_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_post_views(BIGINT)   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_thread_views(TEXT)   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_thread_replies(TEXT) TO anon, authenticated;

-- 6.4 Zaštita od privilege escalation-a (korisnik ne može sam sebi da promeni ulogu)
--     Dozvoljeno samo adminima (JWT role) i service_role-u / direktnom DB pristupu.
CREATE OR REPLACE FUNCTION public.enforce_user_role_protection()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role)
     AND COALESCE(auth.role(), '') NOT IN ('service_role', '')
     AND COALESCE(auth.jwt() ->> 'role', '') <> 'admin' THEN
    RAISE EXCEPTION 'Privilege Escalation Detected: korisnik ne može sam sebi promeniti ulogu!';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_user_role ON public.app_users;
CREATE TRIGGER trg_protect_user_role
  BEFORE UPDATE ON public.app_users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_user_role_protection();

-- 6.5 Sinhronizacija "published" zastavice sa "status" (jedan izvor istine je status)
CREATE OR REPLACE FUNCTION public.sync_post_published_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.published := (NEW.status = 'published');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_post_published ON public.posts;
CREATE TRIGGER trg_sync_post_published
  BEFORE INSERT OR UPDATE OF status ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_post_published_flag();

-- Jednokratno usklađivanje postojećih redova
UPDATE public.posts
SET published = (status = 'published')
WHERE published IS DISTINCT FROM (status = 'published');


-- ============================================================================
-- 7. VIEW-OVI (bezbedan javni pristup bez osetljivih kolona)
-- ============================================================================

-- 7.1 Javni komentari — bez author_email, samo odobreni
DROP VIEW IF EXISTS public.public_comments;
CREATE OR REPLACE VIEW public.public_comments AS
SELECT id, post_id, author_name, content, status, likes, created_at
FROM public.comments
WHERE status = 'approved';

GRANT SELECT ON public.public_comments TO anon, authenticated;

-- 7.2 Javni profili — bez email-a i password_hash-a
DROP VIEW IF EXISTS public.public_user_profiles;
CREATE OR REPLACE VIEW public.public_user_profiles AS
SELECT
  id,
  name  AS username,
  role,
  avatar_url,
  created_at
FROM public.app_users;

GRANT SELECT ON public.public_user_profiles TO anon, authenticated;


-- ============================================================================
-- 8. STORAGE (Supabase Storage) — bucket za slike (postovi, avatari, baneri)
-- ----------------------------------------------------------------------------
--    Aplikacija otprema slike klijentski preko `supabase.storage.from('covers')`.
--    Ovaj blok je idempotentan i bezbedan i kada bucket već postoji.
--
--    BEZBEDNOSNA NAPOMENA: aplikacija koristi sopstvenu JWT autentifikaciju
--    (ne Supabase Auth), pa se upload izvršava anon pristupnim ključem. Zbog
--    toga je dozvoljen anon INSERT samo u `covers`. Ako želite strože, prebacite
--    upload na server (service_role) i uklonite "covers anon upload" politiku.
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('covers', 'covers', TRUE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "covers public read" ON storage.objects;
DROP POLICY IF EXISTS "covers upload"      ON storage.objects;

CREATE POLICY "covers public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'covers');

CREATE POLICY "covers upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'covers');


-- ============================================================================
--  KRAJ — šema je spremna. Za ponovno pokretanje nije potrebno ništa menjati.
-- ============================================================================
