# Deploy checklist — Nexus Gaming Portal

Redosled koraka za bezbedno puštanje u produkciju nakon bezbednosnog očvršćavanja.

## 1. Tajne (obavezno pre starta)

Server u produkciji **fail-fast-uje** ako obavezne tajne nisu postavljene
(`requireSecret()` u `src/server/security/secrets.ts`).

Generiši jake vrednosti (najmanje 32 karaktera):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Popuni `.env` (vidi `.env.example`):

| Varijabla | Obavezno | Napomena |
|-----------|:--------:|----------|
| `JWT_ACCESS_SECRET` | ✅ | ≥ 32 karaktera |
| `JWT_REFRESH_SECRET` | ✅ | ≥ 32 karaktera |
| `JWT_RESET_SECRET` | ✅ | ≥ 32 karaktera |
| `STORAGE_HMAC_SECRET` | ✅ | ≥ 32 karaktera |
| `STORAGE_UPLOAD_SECRET` | ✅ | ≥ 32 karaktera |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | **rotiran** ključ (vidi korak 2) |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | ✅ | javni (build-time) |
| `ADMIN_EMAILS` | ✅ | admin adrese, odvojeno zapetom |
| `ADMIN_PASSWORD_HASH` | ➖ | preporučeno umesto `ADMIN_PASSWORD` |
| `VITE_ADMIN_EMAILS` | ➖ | isti skup kao `ADMIN_EMAILS` (samo UI hint) |
| `APP_URL` / `FRONTEND_URL` | ✅ | pravi domen (koristi se u reset linku i CORS whitelist-i) |
| `EXTRA_ALLOWED_ORIGINS` | ➖ | dodatni CORS origin-i (npr. staging), odvojeno zapetom |
| `RESEND_API_KEY` / `EMAIL_FROM` | ➖ | bez njih se mejlovi ne šalju (samo log u razvoju) |
| `NODE_ENV` | ✅ | `production` |
| `PORT` | ➖ | default `3000` |

## 2. Rotacija kompromitovanog ključa

`service_role` ključ je bio hardkodovan u izvornom kodu — smatra se kompromitovanim.

1. U Supabase → Project Settings → API → **Reset** `service_role` ključ.
2. Novi ključ upiši u `.env` kao `SUPABASE_SERVICE_ROLE_KEY`.
3. Ažuriraj ga i u svim CI/CD / hosting secret storage-ima.

## 3. Baza (jedan fajl, Supabase SQL Editor)

Pokreni **jedan** fajl: `supabase/schema.sql` (verzija 2.0).

- Sadrži kompletnu šemu, indekse, RLS politike, funkcije/trigere i view-ove.
- **Idempotentan** je: bezbedno ga je pokrenuti više puta, i na novi projekat i na
  postojeću bazu (kolone se dodaju, politike se zamjenjuju).
- Bezbedan je po defaultu (nema `USING(true)` write politika) — anon ima samo javno
  čitanje; svi upisi idu preko servera (`service_role`).
- Ne sadrži seed/demo podatke.

> Stare migracije su konsolidovane u `schema.sql` i arhivirane u
> `supabase/migrations/_archive/` — **ne pokreći ih** na bazi inicijalizovanoj
> novim `schema.sql`.

## 4. Build i start

```bash
npm install --legacy-peer-deps
npm run build
npm start            # NODE_ENV=production tsx server.ts
```

Pre starta (brza provera kvaliteta):

```bash
npx tsc --noEmit
npm test
```

## 5. Post-deploy verifikacija

- [ ] Server startuje bez `Missing required secret` greške.
- [ ] `POST /api/auth/forgot-password` vraća konstantnu poruku (bez enumeracije) i mejl stigne.
- [ ] Reset link vodi na `/reset-password?token=...` i **drugi** klik na isti link ne radi (single-use).
- [ ] Anon `insert`/`update`/`delete` nad `posts`/`post_reactions`/`newsletter_subscribers` preko Supabase anon klijenta je **odbijen** (RLS).
- [ ] `POST /api/newsletter` sa ispravnim email-om upisuje pretplatnika; neispravan email vraća `400`.
- [ ] Admin može da kreira/izmeni/obriše vest preko `/api/cms` (cookie sesija).
- [ ] `/api/auth/security-audit` bez sesije vraća `401`.
- [ ] CSP zaglavlje u produkciji **ne sadrži** `'unsafe-inline'` u `style-src` (samo `style-src-attr`).

## 6. Preostalo (nije blokada)

- CSP nonce za `style-src-elem` (trenutno `unsafe-inline` samo u razvoju).
- Zajedničko stanje (rate-limit, lockout, iskorišćeni reset tokeni) za više instanci → Redis/Postgres.
