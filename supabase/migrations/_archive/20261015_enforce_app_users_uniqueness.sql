-- =========================================================================
-- NEXUS GAMING PORTAL — ENFORCE APP_USERS UNIQUENESS & DEDUPLICATION MIGRATION
-- Datum: 2026-10-15
-- Skripta je 100% idempotentna. Pre kreiranja UNIQUE indeksa, automatski pronalazi
-- i bezbedno rešava postojeće duplikate (email i username/name).
-- =========================================================================

-- 1. PRE-CHECK & DEDUPLIKACIJA PO EMAIL ADRESI (CASE-INSENSITIVE)
-- Ako postoje tokeni povezani sa duplikat nalozima, preusmeravamo ih na zadržani nalog
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'refresh_tokens'
  ) THEN
    UPDATE public.refresh_tokens rt
    SET user_id = keeper.id
    FROM public.app_users dupe
    JOIN public.app_users keeper 
      ON LOWER(TRIM(dupe.email)) = LOWER(TRIM(keeper.email)) 
      AND dupe.id <> keeper.id
    WHERE rt.user_id = dupe.id
      AND (
        dupe.created_at < keeper.created_at 
        OR (dupe.created_at = keeper.created_at AND dupe.id < keeper.id)
      );
  END IF;
END $$;

-- Brišemo duplikate u app_users sa istim email-om (zadržava se najnoviji nalog)
WITH ranked_dupes AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY LOWER(TRIM(email))
    ORDER BY created_at DESC, id DESC
  ) as rnum
  FROM public.app_users
  WHERE email IS NOT NULL AND TRIM(email) <> ''
)
DELETE FROM public.app_users
WHERE id IN (
  SELECT id FROM ranked_dupes WHERE rnum > 1
);

-- 2. DEDUPLIKACIJA KORISNIČKIH IMENA (NAME / USERNAME U APP_USERS)
-- Ako više različitih korisnika deli identično ime, dodajemo kratak jedinstveni sufiks duplikat nalozima
UPDATE public.app_users
SET name = TRIM(name) || '_' || SUBSTRING(MD5(id || created_at::text), 1, 4)
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY LOWER(TRIM(name)) 
      ORDER BY created_at ASC, id ASC
    ) as rnum
    FROM public.app_users
    WHERE name IS NOT NULL AND TRIM(name) <> ''
  ) ranked
  WHERE ranked.rnum > 1
);

-- Osiguravamo da prazna ili NULL imena dobiju jedinstvenu oznaku pre primene indeksa
UPDATE public.app_users
SET name = 'Gamer_' || SUBSTRING(id, 1, 6)
WHERE name IS NULL OR TRIM(name) = '';

-- 3. STROGI B-TREE UNIQUE INDEKSI NAD LOWER() KOLONAMA (CASE-INSENSITIVE UNIQUENESS)
-- Garantuje na nivou baze da je email 100% jedinstven bez obzira na velika/mala slova
CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_lower_uidx 
ON public.app_users (LOWER(TRIM(email)));

-- Garantuje na nivou baze da je username/name 100% jedinstven bez obzira na velika/mala slova
CREATE UNIQUE INDEX IF NOT EXISTS app_users_name_lower_uidx 
ON public.app_users (LOWER(TRIM(name)));

-- 4. USKLAĐIVANJE ZA FORUM_MEMBERS (TABELA ZAJEDNICE)
-- Napomena: Primarni ključ tabele forum_members je kolona "name" (a ne "id")
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'forum_members'
  ) THEN
    -- Brišemo eventualne duplikate koji se razlikuju samo po velikim/malim slovima
    DELETE FROM public.forum_members
    WHERE name IN (
      SELECT name FROM (
        SELECT name, ROW_NUMBER() OVER (
          PARTITION BY LOWER(TRIM(name)) 
          ORDER BY created_at ASC, name ASC
        ) as rnum
        FROM public.forum_members
        WHERE name IS NOT NULL AND TRIM(name) <> ''
      ) ranked
      WHERE ranked.rnum > 1
    );

    -- Kreiramo case-insensitive UNIQUE indeks nad forum_members.name
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS forum_members_name_lower_uidx ON public.forum_members (LOWER(TRIM(name)))';
  END IF;
END $$;
