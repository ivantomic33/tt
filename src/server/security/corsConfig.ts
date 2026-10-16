import cors, { CorsOptions } from 'cors';

/**
 * Stroga CORS Konfiguracija za rad sa HttpOnly kolačićima (Whitelist pristup)
 *
 * SIGURNOSNA PRAVILA:
 * 1. Wildcard (*) je STROGO ZABRANJEN kada je `credentials: true`.
 *    Pretraživači (Chrome, Firefox, Safari) blokiraju odgovore ako poslužitelj vrati `Access-Control-Allow-Origin: *` uz `Access-Control-Allow-Credentials: true`.
 * 2. Origin se nikada ne vrati "slijepo" iz `req.header('Origin')` bez prethodne verifikacije na kontrolnoj listi (whitelist).
 * 3. Pre-flight OPTIONS zahtevi se obrađuju sa `200/204 OK` i keširaju preko `maxAge` radi optimizacije performansi.
 */

// Lista eksplicitno dozvoljenih adresa frontenda (razvoj + produkcija iz okruženja).
// Nema hardkodovanih internih hosting domena — sve dodatno ide preko env varijabli.
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

// Dodaj dinamičku adresu iz okruženja ako je definisana
if (process.env.FRONTEND_URL && !ALLOWED_ORIGINS.includes(process.env.FRONTEND_URL)) {
  ALLOWED_ORIGINS.push(process.env.FRONTEND_URL);
}

// Dodatni dozvoljeni origin-i (npr. staging), odvojeni zapetom.
if (process.env.EXTRA_ALLOWED_ORIGINS) {
  for (const origin of process.env.EXTRA_ALLOWED_ORIGINS.split(',')) {
    const trimmed = origin.trim();
    if (trimmed && !ALLOWED_ORIGINS.includes(trimmed)) {
      ALLOWED_ORIGINS.push(trimmed);
    }
  }
}

/**
 * Validator funkcija koja provjerava dolazni Origin zaglavlje
 */
export const corsOriginValidator = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
) => {
  // Same-origin zahtevi, cURL/Postman ili server-to-server pozivi nemaju 'Origin' zaglavlje
  if (!origin) {
    return callback(null, true);
  }

  // Exact match proveravanje prema dozvoljenoj whitelist-i
  if (ALLOWED_ORIGINS.includes(origin)) {
    return callback(null, true);
  }

  // ZABRANJENO: Ako origin nije na listi, odbijamo zahtev i bilježimo bezbednosni incident
  console.warn(`[CORS SECURITY BLOCK] Odbijen neovlašćeni origin: ${origin}`);
  const corsError = new Error(`CORS zabranjuje pristup sa porekla: ${origin}`);
  return callback(corsError);
};

export const corsOptions: CorsOptions = {
  origin: corsOriginValidator,
  credentials: true, // Dozvoljava pretraživačima slanje i prihvatanje HttpOnly kolačića
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie', 'Accept'],
  exposedHeaders: ['Set-Cookie'], // Dozvoljava klijentu uvid u Set-Cookie pretraživačke metapodatke
  maxAge: 86400, // Preflight (OPTIONS) keširanje u pretraživaču na 24 sata (86400 sekundi)
  optionsSuccessStatus: 200, // Vraća HTTP status 200 OK za stare klijente i pretpregled
};

export const strictCorsMiddleware = cors(corsOptions);

export const getCorsPolicySummary = () => ({
  wildcardAllowed: false,
  credentialsSupported: true,
  allowedOrigins: ALLOWED_ORIGINS,
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  status: 'STRICT WHITELIST - Wildcard (*) prohibited for auth routes with credentials',
});

