import { createClient, SupabaseClient } from '@supabase/supabase-js';

// TypeScript deklaracija za globalni window singleton objekat
declare global {
  interface Window {
    __supabase?: SupabaseClient;
  }
}

// BEZ hardkodovanog projekta/ključa. Ako environment nije konfigurisan, klijent se
// pravi sa bezopasnim placeholderom koji ne doseže nijedan pravi projekat, a funkcije
// koje zavise od Supabase-a se preskaču (isSupabaseConfigured() === false).
const UNCONFIGURED_URL = 'http://localhost:9';
const UNCONFIGURED_KEY = 'unconfigured-anon-key';

export function sanitizeSupabaseUrl(url: unknown): string {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return '';
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    if (trimmed.includes('supabase.co')) {
      return `https://${trimmed}`;
    }
    return '';
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmed;
    }
  } catch {
    return '';
  }
  return '';
}

export function sanitizeSupabaseKey(key: unknown): string {
  if (typeof key !== 'string') return '';
  const trimmed = key.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return '';
  return trimmed;
}

const rawUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' &&
    (process.env?.VITE_SUPABASE_URL ||
      process.env?.SUPABASE_URL ||
      process.env?.NEXT_PUBLIC_SUPABASE_URL)) ||
  '';

const rawKey =
  (typeof import.meta !== 'undefined' &&
    (import.meta.env?.VITE_SUPABASE_ANON_KEY || import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY)) ||
  (typeof process !== 'undefined' &&
    (process.env?.VITE_SUPABASE_ANON_KEY ||
      process.env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
      process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env?.SUPABASE_ANON_KEY)) ||
  '';

export const supabaseUrl = sanitizeSupabaseUrl(rawUrl);
export const supabaseKey = sanitizeSupabaseKey(rawKey);

/**
 * Proverava da li su uneti pravi produkcioni Supabase parametri ili se koriste podrazumevani demo/placeholderi.
 */
export function isSupabaseConfigured(): boolean {
  if (!supabaseUrl || !supabaseKey) return false;
  if (
    supabaseKey.includes('your-supabase-anon-key') ||
    supabaseKey === 'sb_publishable_placeholder'
  ) {
    return false;
  }
  return true;
}

/**
 * Singleton kreiranje Supabase klijenta:
 * Proverava window.__supabase pre kreiranja novog klijenta kako
 * bi se izbeglo kreiranje višestrukih GoTrueClient instanci tokom
 * ponovnih renderovanja i Vite Hot Module Replacement-a (HMR).
 */
function getSupabaseClient(): SupabaseClient {
  // 1. Ako klijent već postoji na window objektu, koristi postojeći
  if (typeof window !== 'undefined' && window.__supabase) {
    return window.__supabase;
  }

  // 2. Ako ne postoji, kreiraj jedinstvenu instancu
  let client: SupabaseClient;
  if (!isSupabaseConfigured()) {
    console.warn(
      '[supabase] Nije konfigurisan (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). ' +
        'Supabase funkcije su onemogućene (fail-closed).'
    );
    client = createClient(UNCONFIGURED_URL, UNCONFIGURED_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  } else {
    try {
      client = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch (err) {
      console.warn('Greška pri inicijalizaciji Supabase klijenta; koristi se nekonfigurisani klijent:', err);
      client = createClient(UNCONFIGURED_URL, UNCONFIGURED_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
    }
  }

  // 3. Sačuvaj u window.__supabase
  if (typeof window !== 'undefined') {
    window.__supabase = client;
  }

  return client;
}

// Glavni singleton export
export const supabase: SupabaseClient = getSupabaseClient();
export default supabase;
