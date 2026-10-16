import crypto from 'crypto';

/**
 * Centralizovana provera tajni (secrets) za server.
 *
 * Pravila:
 * - U produkciji: NIKADA ne postoje hardkodovane tajne. Ako env varijabla nije
 *   postavljena (ili je prekratka), server odbija da se pokrene (fail-fast).
 * - U razvoju: ako varijabla nije postavljena, generiše se kriptografski slučajna
 *   efemerna vrednost za tekući proces. Time se NIKADA ne koriste predvidive
 *   hardkodovane vrednosti (koje bi omogućile forge-ovanje tokena).
 */

const ephemeralCache = new Map<string, string>();

export function requireSecret(name: string, options: { minLength?: number } = {}): string {
  const minLength = options.minLength ?? 32;
  const raw = process.env[name];
  const value = typeof raw === 'string' ? raw.trim() : '';
  const isProduction = process.env.NODE_ENV === 'production';

  if (value.length >= minLength) {
    return value;
  }

  if (value.length > 0 && value.length < minLength) {
    throw new Error(
      `[SECURITY] Environment variable "${name}" is too short (min ${minLength} characters). ` +
        `Refusing to start with a weak secret.`
    );
  }

  if (isProduction) {
    throw new Error(
      `[SECURITY] Missing required secret "${name}". ` +
        `Set it in the environment before starting the server in production.`
    );
  }

  // Development / test fallback: cryptographically random, ephemeral (per process).
  if (!ephemeralCache.has(name)) {
    ephemeralCache.set(name, crypto.randomBytes(48).toString('hex'));
    console.warn(
      `[SECURITY WARNING] "${name}" is not set. Using a random ephemeral secret for this process. ` +
        `Tokens/sessions will NOT survive a restart. Set "${name}" in .env for stable development sessions.`
    );
  }
  return ephemeralCache.get(name)!;
}

export function optionalSecret(name: string): string | null {
  const raw = process.env[name];
  const value = typeof raw === 'string' ? raw.trim() : '';
  return value.length > 0 ? value : null;
}
