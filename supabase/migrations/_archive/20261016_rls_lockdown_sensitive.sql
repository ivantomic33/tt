-- =========================================================================
-- NEXUS GAMING PORTAL — RLS LOCKDOWN (SENSITIVE / SAFE TO APPLY)
-- Datum: 2026-10-16
--
-- Ovaj fajl je 100% idempotentan i BEZBEDAN za primenu bez izmena u kodu:
-- zaključava tabele koje frontend NE piše direktno (reports) i ponovo
-- potvrđuje stroge politike nad osetljivim tabelama (app_users, refresh_tokens).
--
-- Pokreni u Supabase SQL Editor-u.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. REPORTS — samo server (service_role). Klijent prijave čuva lokalno,
--    pa zaključavanje ne kvari funkcionalnost.
-- -------------------------------------------------------------------------
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public manage reports" ON public.reports;
DROP POLICY IF EXISTS "Service role manage reports" ON public.reports;

CREATE POLICY "Service role manage reports"
ON public.reports
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- -------------------------------------------------------------------------
-- 2. APP_USERS — ukloni SVE permisivne politike i zadrži isključivo
--    "vlasnik čita svoj profil" + "service_role pun pristup".
--    (Prevents anon čitanje password_hash i manipulaciju nalozima.)
-- -------------------------------------------------------------------------
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public manage app_users" ON public.app_users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.app_users;
DROP POLICY IF EXISTS "Enable insert for registration" ON public.app_users;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.app_users;
DROP POLICY IF EXISTS "Users read own profile" ON public.app_users;
DROP POLICY IF EXISTS "Users can read own profile" ON public.app_users;
DROP POLICY IF EXISTS "Service role full access on app_users" ON public.app_users;

CREATE POLICY "Users can read own profile"
ON public.app_users FOR SELECT
USING (auth.uid() = id OR auth.role() = 'service_role');

CREATE POLICY "Service role full access on app_users"
ON public.app_users FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- -------------------------------------------------------------------------
-- 3. REFRESH_TOKENS — isključivo server (service_role).
-- -------------------------------------------------------------------------
ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own refresh tokens" ON public.refresh_tokens;
DROP POLICY IF EXISTS "Public manage refresh_tokens" ON public.refresh_tokens;
DROP POLICY IF EXISTS "Service access for refresh tokens" ON public.refresh_tokens;
DROP POLICY IF EXISTS "Service role only for refresh tokens" ON public.refresh_tokens;

CREATE POLICY "Service role only for refresh tokens"
ON public.refresh_tokens FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- -------------------------------------------------------------------------
-- 4. NEWSLETTER — prijava ide preko rate-limited API-ja (POST /api/newsletter).
--    Nema javnog INSERT-a (bio je spam vektor); čitanje/upravljanje samo service_role.
-- -------------------------------------------------------------------------
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read newsletter subscribers" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Public insert newsletter" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Service role manage newsletter" ON public.newsletter_subscribers;

CREATE POLICY "Service role manage newsletter"
ON public.newsletter_subscribers FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
