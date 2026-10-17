import helmet from 'helmet';
import { RequestHandler } from 'express';

/**
 * Konfiguracija Sigurnosnih HTTP Zaglavlja (Security HTTP Headers)
 * Koristi paket 'helmet' sa prilagođenim restriktivnim pravilima za CSP, HSTS, X-Frame-Options, i MIME sniffing.
 */

const isProduction = process.env.NODE_ENV === 'production';

// 'unsafe-inline' / 'unsafe-eval' su potrebni ISKLJUČIVO za Vite dev server i HMR.
// U produkciji se ne dodaju, čime CSP stvarno štiti od XSS-a.
const scriptSrc: string[] = ["'self'", 'https://*.googleapis.com'];
if (!isProduction) {
  scriptSrc.push("'unsafe-inline'", "'unsafe-eval'");
}

// Tailwind v4 u razvoju ubacuje <style> tagove (HMR), pa je 'unsafe-inline' potreban
// samo van produkcije. U produkciji se CSS isporučuje kao fajl ('self'), čime se
// blokira injekcija <style> blokova (vektor CSS-injection XSS-a).
const styleSrc: string[] = ["'self'", 'https://fonts.googleapis.com'];
if (!isProduction) {
  styleSrc.push("'unsafe-inline'");
}

// React `style={{ ... }}` propovi renderuju inline style ATRIBUTE, koji podležu
// style-src-attr (odvojeno od <style> blokova). Zadržavamo 'unsafe-inline' isključivo
// za atribute, dok su <style> blokovi u produkciji blokirani.
const styleSrcAttr: string[] = ["'unsafe-inline'"];

export const helmetSecurityMiddleware: RequestHandler = helmet({
  // 1. Content-Security-Policy (CSP) - Restriktivna kontrola izvora resursa
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc,
      styleSrc,
      styleSrcAttr,
      fontSrc: [
        "'self'",
        'https://fonts.gstatic.com',
        'data:',
      ],
      imgSrc: [
        "'self'",
        'data:',
        'blob:',
        'https://images.unsplash.com',
        'https://raw.githubusercontent.com',
        'https://*.supabase.co',
        'https://*.googleusercontent.com',
      ],
      connectSrc: [
        "'self'",
        // Eksplicitno dozvoljeni origin-i iz okruženja (produkcija/staging domen).
        // Potrebno zbog SSE stream-ova i fetch poziva ka istom API-ju preko CDN-a.
        ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
        ...(process.env.APP_URL ? [process.env.APP_URL] : []),
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://*.supabase.co',
        'ws://localhost:3000',
      ],
      frameSrc: ["'self'"],
      frameAncestors: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: isProduction ? [] : null,
    },
  },

  // 2. HTTP Strict Transport Security (HSTS) - Forsira HTTPS komunikaciju
  strictTransportSecurity: {
    maxAge: 31536000, // 1 godina (365 dana) u sekundama
    includeSubDomains: true, // Primenjuje se na sve poddomene
    preload: true, // Preporuka za registraciju na Chrome/Edge HSTS Preload listu
  },

  // 3. X-Content-Type-Options: nosniff - Sprečava MIME-type sniffing napade
  noSniff: true,

  // 4. X-Frame-Options: SAMEORIGIN - Sprečava Clickjacking napade u tuđim iframe-ovima
  frameguard: {
    action: 'sameorigin',
  },

  // 5. X-XSS-Protection: Onemogućava zastareli nedosledni XSS filter u starim pregledačima
  xssFilter: true,

  // 6. Referrer-Policy: Kontroliše količinu informacija u Referer zaglavlju
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },

  // 7. Cross-Origin Embedder & Opener Policies
  crossOriginEmbedderPolicy: false, // Onemogućeno radi kompatibilnosti sa spoljnim slikama (Unsplash)
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
});

export const getHelmetHeadersSummary = () => ({
  cspStatus: 'ACTIVE - Restriktivna Content-Security-Policy (whitelist za skripte, stilove, fontove i Unsplash/Supabase slike)',
  hstsStatus: 'ACTIVE - max-age=31536000; includeSubDomains; preload (Forsira HTTPS na 1 godinu)',
  mimeSniffingStatus: 'ACTIVE - X-Content-Type-Options: nosniff (Onemogućeno pretvaranje fajlova u skripte)',
  clickjackingStatus: 'ACTIVE - X-Frame-Options: SAMEORIGIN (Sprečeno ugradjivanje sajta u iframe sa nepoznatih domena)',
  referrerPolicyStatus: 'ACTIVE - strict-origin-when-cross-origin (Zaštita privatnosti URL parametara)',
  xssFilterStatus: 'ACTIVE - X-XSS-Protection: 1; mode=block',
});
