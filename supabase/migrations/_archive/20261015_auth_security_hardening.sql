-- =========================================================================
-- NEXUS GAMING PORTAL — AUTH & SECURITY HARDENING MIGRATION
-- Adds failed_login_attempts, locked_until, terms_accepted_at to app_users
-- and enforces unique case-insensitive constraints on email and name/username.
-- =========================================================================

-- 1. Dodavanje kolona u public.app_users ako ne postoje
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Čišćenje potencijalnih duplikata u app_users pre kreiranja jedinstvenih indeksa
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Ako tabela app_users postoji
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'app_users') THEN
    -- Obriši duplikate po email-u (ostavi onog sa najranijim created_at)
    DELETE FROM public.app_users
    WHERE id IN (
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(email)) ORDER BY created_at ASC NULLS LAST) as rnum
        FROM public.app_users
        WHERE email IS NOT NULL AND TRIM(email) <> ''
      ) t
      WHERE t.rnum > 1
    );

    -- Obriši duplikate po name / username (ostavi onog sa najranijim created_at)
    DELETE FROM public.app_users
    WHERE id IN (
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(name)) ORDER BY created_at ASC NULLS LAST) as rnum
        FROM public.app_users
        WHERE name IS NOT NULL AND TRIM(name) <> ''
      ) t
      WHERE t.rnum > 1
    );

    -- Kreiramo case-insensitive UNIQUE indekse
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_lower_uidx ON public.app_users (LOWER(TRIM(email)))';
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS app_users_name_lower_uidx ON public.app_users (LOWER(TRIM(name)))';
  END IF;
END $$;
