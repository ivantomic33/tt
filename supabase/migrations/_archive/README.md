# Arhivirane migracije

Ove migracije su **konsolidovane** u jedinstveni fajl `supabase/schema.sql` (v2.0)
i više se ne pokreću pojedinačno.

Zadržane su samo kao istorijski zapis — **ne pokreći ih** na bazi koja je već
inicijalizovana novim `schema.sql` (novi fajl je idempotentan i potpuno pokriva
sve što su ove migracije radile).

| Fajl | Šta je radio | Gde je sada u schema.sql |
|------|--------------|--------------------------|
| `20261015_audit_fixes.sql` | RLS za `app_users`/`refresh_tokens`/`posts`/`comments`, RPC funkcije, indeksi | sekcije 5 i 6 |
| `20261015_auth_security_hardening.sql` | kolone za lockout u `app_users` | sekcija 2 |
| `20261015_enforce_app_users_uniqueness.sql` | deduplikacija + case-insensitive unique indeksi | sekcije 3 i 4 |
| `20261016_password_reset_tokens.sql` | tabela `password_reset_tokens` + RLS | sekcije 1.10 i 5.8 |
| `20261016_rls_lockdown_content.sql` | zaključavanje upisa nad sadržajem | sekcija 5 |
| `20261016_rls_lockdown_sensitive.sql` | zaključavanje osetljivih tabela | sekcija 5 |

> Novi projekat: samo pokreni `supabase/schema.sql`.
> Postojeća baza: takođe samo `supabase/schema.sql` (bezbedno je pokrenuti više puta).
