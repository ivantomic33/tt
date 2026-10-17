# Deploy na Vercel — Nexus Gaming Portal

Ovaj dokument opisuje kako je projekat prilagođen za Vercel i šta treba postaviti
pre prvog deploy-a.

## Kako je aplikacija prilagođena

Vercel automatski detektuje Express backend preko `server.ts` i ceo Express app
vrti kao **jednu Vercel funkciju** (Fluid compute). Zbog toga:

| Promena | Zašto |
|---------|-------|
| Vite build izlazi u `dist/` na Vercelu, a u `public/` lokalno (`vite.config.ts`) | Na Vercelu je `server.ts` serverless funkcija; statika se servira preko CDN-a iz `outputDirectory`. Lokalno `server.ts` i dalje servira iz `public/`. |
| `server.ts` eksportuje `default` handler `(req, res)` pored lokalnog `app.listen` | Vercel funkcija poziva handler po zahtevu; lokalno/Render i dalje radi klasičan HTTP server. `listen` se preskače kada je `VERCEL=1` ili `VERCEL_ENV` postavljen. |
| `app.ts` ne servira statiku/SPA na Vercelu | CDN servira statiku, a Vercel automatski pada na `index.html` za nepoznate putanje. Ovako se ne troši serverless vreme. |
| Dodat JSON `404` za nepoznate `/api/*` rute | API vraća JSON umesto Express HTML stranice. |
| `vercel.json` | `outputDirectory: "dist"`, deklaracija `server.ts` kao `@vercel/node` funkcije, `buildCommand`. |
| SSE stream-ovi (`/api/forum/stream`, `/api/posts/:id/reactions/stream`) se degradiraju na jednokratni snapshot | Serverless funkcija ne može da drži dugotrajnu konekciju. |
| `.vercelignore` | Ne šalje `.env`, ugnježdeni `tt/`, testove u deployment. |

`vercel.json`:

```json
{
  "framework": "express",
  "installCommand": "npm install",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "functions": {
    "server.ts": {
      "runtime": "@vercel/node@5.0.0",
      "maxDuration": 30,
      "memory": 1024,
      "includeFiles": "src/**"
    }
  }
}
```

- `outputDirectory: "dist"` mora da odgovara `outDir`-u iz `vite.config.ts`
  (koji je `dist` kada je `VERCEL`/`VERCEL_ENV` postavljen). Neslaganje daje
  `STATIC_BUILD_NO_OUT_DIR: No Output Directory named "dist"`.
- `functions.server.ts` eksplicitno vezuje Express app za `@vercel/node` runtime.
- **Root Directory mora biti prazan (root repoa).** Ako je postavljen na `tt`,
  Vercel builduje ugnježdeni scaffold projekat, ignoriše ovaj `vercel.json` i
  traži `dist/` koji ne postoji.
- `/api/*` ide u Express funkciju; statika (`/assets/...`) se servira preko CDN-a;
  ostalo dobija SPA `index.html` preko Vercel-ovog automatskog fallback-a.

## Korak 1 — Environment varijable na Vercelu

Project → Settings → **Environment Variables**. Dodaj ih za *Production* (i
*Preview* ako želiš preview deploy-e).

### Obavezno (server fail-fast ako nedostaje u produkciji)

Generiši jake vrednosti (≥ 32 karaktera):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

| Varijabla | Napomena |
|-----------|----------|
| `JWT_ACCESS_SECRET` | ≥ 32 karaktera |
| `JWT_REFRESH_SECRET` | ≥ 32 karaktera |
| `JWT_RESET_SECRET` | ≥ 32 karaktera |
| `STORAGE_HMAC_SECRET` | ≥ 32 karaktera |
| `STORAGE_UPLOAD_SECRET` | ≥ 32 karaktera |
| `SUPABASE_SERVICE_ROLE_KEY` | **rotiran** service_role ključ |
| `FRONTEND_URL` | `https://<tvoj-projekat>.vercel.app` — **obavezno za CORS!** |
| `APP_URL` | isti domen (koristi se u linku za reset lozinke) |
| `ADMIN_EMAILS` | admin adrese, odvojeno zapetom |

> ⚠️ **`FRONTEND_URL` je kritičan.** `corsConfig.ts` koristi strogi whitelist. Bez
> njega će isti-domen POST/PUT zahtevi (login, CMS, itd.) biti odbijeni jer
> pregledač šalje `Origin: https://<tvoj-domen>`.

### Build-time (Vite ih „upeče“ u frontend bundle)

| Varijabla | Napomena |
|-----------|----------|
| `VITE_SUPABASE_URL` | javno |
| `VITE_SUPABASE_ANON_KEY` | javno (ili `VITE_SUPABASE_PUBLISHABLE_KEY`) |
| `VITE_ADMIN_EMAILS` | opciono, UI hint |

### Opciono

| Varijabla | Napomena |
|-----------|----------|
| `ADMIN_PASSWORD_HASH` | preporučeno umesto `ADMIN_PASSWORD` |
| `EXTRA_ALLOWED_ORIGINS` | dodatni CORS origin-i (npr. preview domen), zapetom |
| `RESEND_API_KEY`, `EMAIL_FROM` | bez njih se reset mejlovi ne šalju |
| `NODE_ENV` | Vercel ga sam postavlja na `production` |

## Korak 2 — Deploy

```bash
git push origin main
```

Zatim na [vercel.com/new](https://vercel.com/new) importuj repo
`ivantomic33/tt`. U podešavanjima projekta **ostavi Root Directory prazan**
(ne `tt`). Vercel će:
1. pokrenuti `npm install` (eksplicitno zadato),
2. pokrenuti `npm run build` (frontend → `dist/`, jer je `VERCEL` postavljen),
3. preuzeti `server.ts` kao jednu `@vercel/node` funkciju.

Prvi deploy postavlja **production** domen; kasniji push-evi prave preview.

## Korak 3 — Provera posle deploy-a

- [ ] `GET /` vraća SPA (200, `text/html`).
- [ ] `GET /forum` (deep link) vraća SPA (200).
- [ ] `GET /assets/<hash>.js` vraća JS (200).
- [ ] `GET /api/forum/stream` vraća `text/event-stream` i odmah zatvara konekciju
      (na serverless-u nema dugotrajnog SSE-a).
- [ ] `POST /api/auth/login` ne vraća CORS grešku.
- [ ] `GET /api/nepoznato` vraća JSON `404`.
- [ ] Server ne baca `Missing required secret` (sve tajne postavljene).

## Poznata ograničenja (serverless)

Aplikacija je dizajnirana kao jedan dugotrajni proces; na serverless modelu:

- **Rate limiting i lockout** (`rateLimiter`, `lockoutService`) drže stanje u
  memoriji → važi po instanci, ne globalno. Za jaku zaštitu treba Redis/Postgres.
- **Upload fajlova** (`/api/storage`) čuva bajtove u in-memory map-u po instanci
  → upload i kasnije serviranje mogu da padnu na različite instance. Za produkciju
  koristi Supabase Storage.
- **Reset tokeni** (single-use) drže se u memoriji → mogu se „resetovati“ između
  instanci.
- **Real-time (SSE)** je na Vercelu degradiran na jednokratni snapshot; za pravi
  real-time koristi Supabase Realtime ili isti kod na dugotrajnom Node hostu.

Za punu funkcionalnost bez ovih ograničenja, isti kod radi na Render/Railway/
Fly.io/Cloud Run kao klasičan Node server (`npm start`), bez izmena.
