-- =========================================================================
-- NEXUS GAMING PORTAL — RLS LOCKDOWN (CONTENT TABLES)
-- Datum: 2026-10-16
--
-- STATUS: Spreman za primenu. Klijentski upisi su preusmereni na autentifikovani
-- CMS API (/api/cms, service_role na serveru):
--   - src/services/storage.ts      → CmsClient (posts, categories, tags, comments, views, likes)
--   - src/services/userService.ts  → CmsClient.syncMember (forum_members)
--
-- Zato anon klijent više NE mora da ima write pristup; javno ostaje samo čitanje.
--
-- NAPOMENA: "Sync from Supabase" u admin panelu će nakon ove migracije preko anon
-- klijenta videti samo OBJAVLJENE (published) postove. Za pun pristup koristiti API.
--
-- Pokreni u Supabase SQL Editor-u.
-- =========================================================================

-- ------------------------- POSTS -------------------------
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public insert posts" ON public.posts;
DROP POLICY IF EXISTS "Public update posts" ON public.posts;
DROP POLICY IF EXISTS "Public delete posts" ON public.posts;
DROP POLICY IF EXISTS "Admin full manage posts" ON public.posts;
DROP POLICY IF EXISTS "Allow all operations for authenticated/admin on posts" ON public.posts;

-- Javno čitanje ostaje samo za objavljene postove.
DROP POLICY IF EXISTS "Public read published posts" ON public.posts;
CREATE POLICY "Public read published posts"
ON public.posts FOR SELECT USING (status = 'published');

-- ------------------------- CATEGORIES / TAGS -------------------------
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public insert categories" ON public.categories;
DROP POLICY IF EXISTS "Public update categories" ON public.categories;
DROP POLICY IF EXISTS "Public insert tags" ON public.tags;
DROP POLICY IF EXISTS "Public insert post_tags" ON public.post_tags;

-- ------------------------- COMMENTS -------------------------
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public insert comments" ON public.comments;
DROP POLICY IF EXISTS "Allow public read on comments" ON public.comments;

-- Javno se čitaju samo odobreni komentari, preko bezbednog view-a (bez author_email).
DROP POLICY IF EXISTS "Public read approved comments" ON public.comments;
CREATE POLICY "Public read approved comments"
ON public.comments FOR SELECT USING (status = 'approved');

-- ------------------------- FORUM -------------------------
ALTER TABLE public.forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public insert forum_threads" ON public.forum_threads;
DROP POLICY IF EXISTS "Public update forum_threads" ON public.forum_threads;
DROP POLICY IF EXISTS "Public delete forum_threads" ON public.forum_threads;

DROP POLICY IF EXISTS "Public insert forum_replies" ON public.forum_replies;
DROP POLICY IF EXISTS "Public update forum_replies" ON public.forum_replies;
DROP POLICY IF EXISTS "Public delete forum_replies" ON public.forum_replies;

DROP POLICY IF EXISTS "Public write forum_votes" ON public.forum_votes;
DROP POLICY IF EXISTS "Public write forum_members" ON public.forum_members;

-- Javno čitanje sadržaja ostaje.
DROP POLICY IF EXISTS "Public read forum_threads" ON public.forum_threads;
CREATE POLICY "Public read forum_threads" ON public.forum_threads FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read forum_replies" ON public.forum_replies;
CREATE POLICY "Public read forum_replies" ON public.forum_replies FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read forum_votes" ON public.forum_votes;
CREATE POLICY "Public read forum_votes" ON public.forum_votes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read forum_members" ON public.forum_members;
CREATE POLICY "Public read forum_members" ON public.forum_members FOR SELECT USING (true);

-- ------------------------- REAKCIJE (post_reactions) -------------------------
-- Reakcije se čitaju I upisuju isključivo preko servera
-- (GET/POST /api/posts/:id/reactions → ReactionsController, service_role).
-- Zato anon klijentu nije potreban nikakav pristup ovoj tabeli.
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read post_reactions" ON public.post_reactions;
DROP POLICY IF EXISTS "Public insert post_reactions" ON public.post_reactions;
DROP POLICY IF EXISTS "Public delete post_reactions" ON public.post_reactions;
