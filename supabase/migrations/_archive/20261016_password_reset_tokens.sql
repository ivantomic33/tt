-- =========================================================================
-- NEXUS GAMING PORTAL — PASSWORD RESET TOKENS (single-use evidence)
-- Datum: 2026-10-16
--
-- Evidencija tokena za reset lozinke radi sprečavanja ponovnog korišćenja
-- (replay) i omogućavanja opoziva. Primeni u Supabase SQL Editor-u.
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  jti TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email
  ON public.password_reset_tokens (LOWER(email));

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role only for password reset tokens" ON public.password_reset_tokens;
CREATE POLICY "Service role only for password reset tokens"
ON public.password_reset_tokens FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
