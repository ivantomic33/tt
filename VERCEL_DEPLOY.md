# Deploy na Vercel — Nexus Gaming Portal

Ovaj dokument opisuje kako je projekat prilagođen za Vercel i šta treba postaviti
pre prvog deploy-a.

## Kako je aplikacija prilagođena

Vercel automatski detektuje Express backend preko `server.ts` i ceo Express app
vrti kao **jednu Vercel funkciju** (Fluid compute). Zbog toga:

| Promena | Zašto |
|---------|-------|
| Vite build sada izlazi u `public/` (`vite.config.ts`) | Vercel **ignoriše `express.static()`**, a statiku servira preko CDN-a iz `public/**`. |
| `server.ts` eksportuje `default` handler `(req, res)` pored lokalnog `app.listen` | Vercel funkcija poziva handler po zahtevu; lokalno/Render i dalje radi klasičan HTTP server. `listen` se preskače kada je `VERCEL=1`. |
| `app.ts` u produkciji servira SPA fallback iz `public/index.html` (osim za `/api/*`) | Deep linkovi kao `/forum` rade i ako zahtev stigne do funkcije. |
| Dodat JSON `404` za nepoznate `/api/*` rute | API vraća JSON umesto Express HTML stranice. |
| `vercel.json` | `buildCommand` + SPA fallback rewrite (vidi dole). |
| `.vercelignore` | Ne šalje `.env`, ugnježdeni `tt/`, testove u deployment. |
| `.gitignore` | Sada ignoriše i `public/` (build izlaz). |

`vercel.json`:

```json
{
  "framework": "express",
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "rewrites": [
    { "source": "/:path((?!api).*)", "destination": "/index.html" }
  ]
}
```

- `"framework": "express"` je **ključno**: bez toga Vercel sam izabere **Vite**
  preset (jer vidi `vite.config.ts` + `index.html`) i traži `dist/`, pa build
  padne sa `STATIC_BUILD_NO_OUT_DIR: No Output Directory named "dist"`.
- Postojeći statički fajlovi (`/assets/...`) se serviraju prvo (filesystem ima prioritet).
- Sve što nije `/api*` i nije fajl → `/index.html` (SPA rutanje).
- `/api/*` ide u Express funkciju.

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
`ivantomic33/tt`. Vercel će:
1. pokrenuti `npm install` (eksplicitno zadato, uprkos `bun.lock`),
2. pokrenuti `npm run build` (frontend → `public/`),
3. detektovati `server.ts` kao Express backend i napraviti jednu funkciju.

Prvi deploy postavlja **production** domen; kasniji push-evi prave preview.

## Korak 3 — Provera posle deploy-a

- [ ] `GET /` vraća SPA (200, `text/html`).
- [ ] `GET /forum` (deep link) vraća SPA (200).
- [ ] `GET /assets/<hash>.js` vraća JS (200).
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

Za punu funkcionalnost bez ovih ograničenja, isti kod radi na Render/Railway/
Fly.io/Cloud Run kao klasičan Node server (`npm start`), bez izmena.
