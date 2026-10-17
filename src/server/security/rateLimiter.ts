import rateLimit, { MemoryStore } from 'express-rate-limit';

/**
 * Globalni i Rutni Rate Limiting Middleware
 * Koristi express-rate-limit za zaštitu API infrastrukture od DoS, DDoS, spam i Brute-Force napada.
 *
 * NAPOMENA (serverless / Vercel):
 * Eksplicitno se koristi in-memory store, pa se validacije koje zahtevaju deljeno
 * skladište ili pouzdanu IP adresu preskaču. Time je middleware bezbedan za
 * pokretanje unutar Vercel serverless funkcije. Brojači su po instanci funkcije
 * (best-effort ograničenje), što je i dalje značajna anti-brute-force barijera.
 */

// Svaki limiter dobija SOPSTVENI store, da se brojači različitih limitera ne bi
// sabirali (npr. strogi auth limit ne sme da troši budžet globalnog limita).
const makeOptions = () => ({
  store: new MemoryStore(),
  standardHeaders: 'draft-7' as const,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

// 1. Globalni Rate Limiter (100 zahteva na 15 minuta po IP adresi za celokupan API)
export const globalRateLimiter = rateLimit({
  ...makeOptions(),
  windowMs: 15 * 60 * 1000,
  limit: 100,
  message: {
    success: false,
    error: 'Prekoračen globalni limit API zahteva sa vaše IP adrese. Molimo sačekajte 15 minuta.',
    retryAfterMinutes: 15,
  },
});

// 2. Strogi Rate Limiter za Osetljive Rute (/login, /register, /forgot-password, /reset-password, /newsletter)
export const sensitiveAuthRateLimiter = rateLimit({
  ...makeOptions(),
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: {
    success: false,
    error: 'Sigurnosni algoritam: Preveliki broj neuspešnih pokušaja sa ove IP adrese. Pristup privremeno obustavljen.',
    retryAfterMinutes: 15,
    strictAuthLimit: true,
  },
});

// 3. Anti-Spam Rate Limiter za Kreiranje Teme (Max 5 tema u 10 minuta)
export const threadRateLimiter = rateLimit({
  ...makeOptions(),
  windowMs: 10 * 60 * 1000,
  limit: 5,
  message: {
    success: false,
    error: 'Anti-Spam zaštita: Previše objavljenih tema u kratkom vremenskom roku. Molimo sačekajte pre sledeće objave.',
  },
});

// 4. Anti-Spam Rate Limiter za Komentare / Odgovore (Max 15 komentara u 5 minuta)
export const commentRateLimiter = rateLimit({
  ...makeOptions(),
  windowMs: 5 * 60 * 1000,
  limit: 15,
  message: {
    success: false,
    error: 'Anti-Spam zaštita: Prebrzo postavljanje komentara. Molimo sačekajte par minuta.',
  },
});

// 5. Anti-Spam Rate Limiter za Glasanje / Karma (Max 60 glasova u 1 minutu)
export const voteRateLimiter = rateLimit({
  ...makeOptions(),
  windowMs: 60 * 1000,
  limit: 60,
  message: {
    success: false,
    error: 'Prebrzo glasanje detektovano. Molimo usporite.',
  },
});

// 6. Rate Limiter za proveru dostupnosti email-a/korisničkog imena
// (ograničava masovnu enumeraciju naloga tokom registracije)
export const availabilityRateLimiter = rateLimit({
  ...makeOptions(),
  windowMs: 10 * 60 * 1000,
  limit: 30,
  message: {
    success: false,
    error: 'Previše provera dostupnosti. Molimo sačekajte pre sledećeg pokušaja.',
    code: 'AVAILABILITY_RATE_LIMITED',
  },
});

// 7. Strogi limit za zapise u forumu (kreiranje/izmena/brisanje tema, odgovora, članova)
export const strictWriteRateLimiter = rateLimit({
  ...makeOptions(),
  windowMs: 10 * 60 * 1000,
  limit: 40,
  message: {
    success: false,
    error: 'Previše izmena u kratkom periodu. Molimo sačekajte pre sledeće akcije.',
  },
});

export const getRateLimitSummary = () => ({
  globalLimit: '100 req / 15 min per IP',
  sensitiveRoutesLimit: '5 req / 15 min per IP',
  threadRateLimit: '5 req / 10 min per IP',
  commentRateLimit: '15 req / 5 min per IP',
  voteRateLimit: '60 req / min per IP',
  strictWriteRateLimit: '40 req / 10 min per IP',
  store: 'in-memory (per serverless instance)',
  protectedRoutes: [
    '/api/auth/login',
    '/api/auth/register',
    '/api/forum/threads (POST)',
    '/api/forum/threads/:id/replies (POST)',
    '/api/forum/threads/:id/vote (POST)',
  ],
  standardHeadersIncluded: true,
});
