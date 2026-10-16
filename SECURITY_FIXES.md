# Bezbednosne ispravke — Nexus Gaming Portal

Datum: 2026-10-16

Ovaj dokument prati izvršene ispravke i preostale preporuke nakon bezbednosne analize.

## ✅ Ispravljeno

| # | Nalaz | Fajl | Šta je urađeno |
|---|-------|------|----------------|
| 1 | Hardkodovan Supabase `service_role` ključ | `src/server/db/supabaseClient.ts` | Uklonjen literal. Ključ se čita isključivo iz okruženja; ako nedostaje, klijent pada na anon ključ (fail-closed). |
| 2 | Hardkodovani JWT tajni ključevi | `src/server/auth/tokenService.ts` | Uveden `requireSecret()` — u produkciji fail-fast, u razvoju efemerna slučajna tajna. |
| 3 | Hardkodovane storage tajne | `src/server/security/fileUploadSecurity.ts` | Isto preko `requireSecret()`. |
| 4 | Default admin lozinka `admin123` + lični mejlovi | `src/server/auth/authRouter.ts`, `.env.example` | Default lozinka uklonjena; admin fallback se kreira samo ako je `ADMIN_PASSWORD(_HASH)` postavljen; lista iz `ADMIN_EMAILS` (bez hardkodovanih adresa). |
| 5 | **Klijentski admin backdoor** (`password.length >= 6` za hardkodovane admin mejlove) | `src/services/storage.ts` | Lokalna/demo admin prijava potpuno onemogućena; autentikacija samo preko servera. |
| 6 | Hardkodovane admin adrese na klijentu | `AuthContext.tsx`, `userService.ts`, `AuthModal.tsx`, `Login.tsx`, `Register.tsx` | Centralizovano u `src/utils/adminEmails.ts`, lista iz `VITE_ADMIN_EMAILS`. |
| 7 | IDOR: `posts` sa `author_id = NULL` otvoreni svakom prijavljenom | `src/server/controllers/postsController.ts` | Provera sada blokira i NULL vlasnika (samo vlasnik ili admin). |
| 8 | CSP `unsafe-inline` / `unsafe-eval` i u produkciji | `src/server/security/helmetConfig.ts` | Dodaju se samo van produkcije. |
| 9 | Curenje internih DB grešaka klijentu | `postsController.ts` | Vraća se generička poruka, detalji se loguju na serveru. |
| 10 | Nepokretne skripte | `package.json` | `start` → `tsx server.ts`; uklonjen nepostojeći `test:security`. |
| 11 | RLS — osetljive tabele | `supabase/migrations/20261016_rls_lockdown_sensitive.sql` | `reports`, `app_users`, `refresh_tokens`, `newsletter` zaključani (samo `service_role` + javni upis newslettera). |
| 12 | **Tokeni u `localStorage`** | `src/services/apiAuth.ts`, `src/main.tsx` | Tokeni se više ne perzistiraju; sesija isključivo HttpOnly kolačićem. Zaostali tokeni se uklanjaju na startu. |
| 13 | Reset lozinke bez evidencije (replay) | `src/server/auth/tokenService.ts`, `authRouter.ts`, `mailer.ts`, migracija | Token je sada **single-use** i evidentira se u `password_reset_tokens`; reset link se šalje (Resend) ili loguje u razvoju. |
| 14 | Email enumeracija + javni `/security-audit` | `authRouter.ts`, `rateLimiter.ts` | `check-availability` dobio strogi rate limit; `security-audit` zahteva autentikaciju i ne izlaže CORS whitelist. |
| 15 | **RLS za sadržaj + refaktor klijentskih upisa** | `src/server/routes/cmsRouter.ts` *(novo)*, `src/services/cmsClient.ts` *(novo)*, `storage.ts`, `userService.ts`, `server.ts`, migracija | Svi upisi (posts/categories/tags/comments/views/likes/forum_members) idu preko autentifikovanog API-ja; migracija `20261016_rls_lockdown_content.sql` uklanja permisivne politike. |
| 16 | Reset flow nije imao frontend rutu | `src/views/ResetPasswordView.tsx` *(novo)*, `src/App.tsx`, `apiAuth.ts` | Dodata javna ruta `/reset-password` (čita `?token=`, validira jačinu lozinke, poziva `POST /api/auth/reset-password`); `ApiAuth.forgotPassword/resetPassword`. |
| 17 | Direktni anon upisi u adminskim ekranima | `NewPost.tsx`, `EditPost.tsx`, `Posts.tsx`, `cmsRouter.ts` | Kreiranje/izmena/brisanje vesti i tagova preusmereno na `CmsClient` → `/api/cms` (server upravlja `post_tags`). |
| 18 | Javni upis u `post_reactions` | migracija `20261016_rls_lockdown_content.sql` | Reakcije idu isključivo preko servera (`ReactionsController`); uklonjene permisivne politike i uključen RLS. |
| 19 | Nema automatizovanih testova | `tests/security.test.ts` *(novo)*, `tests/setup.ts` *(novo)*, `package.json` | 18 testova: `requireSecret`, sanitizacija (XSS), Zod politika lozinke, JWT roundtrip/tamper/type-confusion, single-use reset token, bcrypt heširanje. |
| 20 | Mrtvi kod: klijentski `app_users` upisi, hardkodovana lična imena | `userService.ts`, `postsController.ts`, `NewPost.tsx` | Uklonjeni upisi u `app_users` (sada isključivo server), uklonjen uvoz `isConfiguredAdminEmail`, zamena „Ivan Tomić" → „Nexus Urednik". |
| 21 | Nepotpun `.env.example` (nedostaju mejl varijable) | `.env.example`, `DEPLOY_CHECKLIST.md` *(novo)* | Dodati `RESEND_API_KEY`/`EMAIL_FROM`, neutralan `APP_URL`; dodat deploy checklist (env, red migracija, rotacija ključa, verifikacija). |
| 22 | Rezolucija uloge zavisila od anon RLS čitanja `app_users` | `authRouter.ts` *(novi `/api/auth/resolve-role`)*, `apiAuth.ts`, `AuthContext.tsx` | Uloga se sada razrešava autoritativno preko backend-a (server verifikuje Supabase token i čita `app_users` preko `service_role`), uz lokalni fallback. |
| 23 | Admin lista nije videla neobjavljene (draft) vesti | `cmsRouter.ts` (`GET /posts`, `GET /posts/:id`), `cmsClient.ts`, `Posts.tsx`, `EditPost.tsx` | Dodato autentifikovano admin čitanje (service_role) koje obuhvata i draftove; klijent prvo pokušava API, pa fallback na anon. |
| 24 | Nema integracionih testova API-ja | `src/server/app.ts` *(novo, `createApp`)*, `server.ts`, `tests/api.test.ts` *(novo)* | Aplikacija izdvojena da je testovi mogu podići in-memory (supertest); testovi za CMS admin-gate (401/403/OK) i auth validaciju/anti-enumeraciju. |
| 25 | Nedostupna `Test.tsx` stranica sa direktnim insert-om + CSP `styleSrc` | `src/pages/Test.tsx` *(uklonjen)*, `App.tsx`, `helmetConfig.ts` | Uklonjena test stranica; `'unsafe-inline'` za stilove sada samo van produkcije, uz odvojen `style-src-attr` (blokiraju se `<style>` blokovi u produkciji). |
| 26 | `schema.sql` „insecure by default" (sve `USING(true)` politike) | `supabase/schema.sql` | Sve permisivne write politike uklonjene iz osnovnog schema-a; anon ima samo javno čitanje, svi upisi idu preko servera. Novi projekat je bezbedan i bez migracija. |
| 27 | Newsletter javni `INSERT WITH CHECK(true)` (spam vektor) | `newsletterRouter.ts` *(novo)*, `app.ts`, `storage.ts`, `schema.sql`, migracija | Prijava ide preko `POST /api/newsletter` (rate-limited, service_role, validacija email-a); uklonjena javna insert politika. |
| 28 | Hardkodovan `FALLBACK_URL`/`FALLBACK_KEY` (pravi project ref + anon ključ) | `src/lib/supabase.ts`, `AdminSettingsView.tsx` | Placeholderi uklonjeni; bez env-a klijent je fail-closed (`isSupabaseConfigured() === false`), admin UI prikazuje stvarni/„nije konfigurisano" URL. |
| 29 | Hardkodovani `*.run.app` origin-i (CORS + CSP) | `corsConfig.ts`, `helmetConfig.ts`, `.env.example` | Uklonjeni AI Studio domeni i široki `*.run.app` regex; whitelist se proširuje preko `FRONTEND_URL`/`EXTRA_ALLOWED_ORIGINS`. |

## ⚠️ Potrebna dodatna akcija (van koda)

1. **Rotiraj `service_role` ključ u Supabase-u** — prethodni je bio u izvornom kodu i smatra se kompromitovanim.
2. Postavi jake vrednosti u `.env`: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_RESET_SECRET`, `STORAGE_HMAC_SECRET`, `STORAGE_UPLOAD_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAILS`, `ADMIN_PASSWORD_HASH`, `VITE_ADMIN_EMAILS`.
3. Primeni bazu u Supabase SQL Editor-u: pokreni **jedan** fajl `supabase/schema.sql`
   (v2.0, idempotentan). Stare migracije su konsolidovane i arhivirane u
   `supabase/migrations/_archive/` — ne pokreći ih posebno.
4. Za slanje mejlova postavi `RESEND_API_KEY` (i opciono `EMAIL_FROM`, `APP_URL`).

## 📋 Preostalo / napomene

- **CSP `style-src-attr`** još dozvoljava `unsafe-inline` (React inline `style` atributi). `style-src-elem`/`<style>` blokovi su u produkciji blokirani; pun prelazak na nonce je veći zahvat.
- **In-memory stanje** (sesije, lockout, iskorišćeni reset tokeni) nije bezbedno za više instanci — prelazak na Redis/Postgres.
- **`getScopedSupabaseClient`** i dalje vraća admin klijent za svaki verifikovan token; bezbednost se oslanja na per-route provere (BOLA + ownership).
- **Newsletter u admin panelu** čita lokalne (localStorage) pretplatnike; baza ih čuva preko API-ja — po potrebi dodati admin čitanje preko servera.
- **Git:** repozitorijum u `nexus-src/`; lokalni identitet `Nexus Developer <dev@nexus.local>` — promeniti po potrebi.

