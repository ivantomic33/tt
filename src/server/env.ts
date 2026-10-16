import dotenv from 'dotenv';

// U testovima NE učitavamo .env: tests/setup.ts postavlja sve deterministički
// (uključujući nedostupnu Supabase adresu), pa bi override pokvario hermetičnost testova.
if (process.env.NODE_ENV !== 'test') {
  // Load .env with override: true so values provided in .env take precedence
  dotenv.config({ override: true });
}
