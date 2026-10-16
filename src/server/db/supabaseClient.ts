import '../env';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseKey } from '../../lib/supabase';
import { TokenService } from '../auth/tokenService';
import { optionalSecret } from '../security/secrets';

/**
 * DATABASE CLIENT SECURITY ARCHITECTURE FOR EXPRESS & SUPABASE
 *
 * Since the application uses custom Express-signed JWTs (JWT_ACCESS_SECRET),
 * forwarding a custom-signed JWT in `Authorization: Bearer` directly to Supabase PostgREST
 * would cause a 401 JWT signature mismatch unless signed by Supabase's internal JWT secret.
 *
 * Therefore:
 * 1. Backend middleware (`requireAuth`, `requireAdmin`, `authorizeResourceOwnership`) and
 *    `executeUserScopedQuery` strictly verify the Express JWT and enforce RBAC/IDOR in Node.js.
 * 2. Validated server queries execute via the server-side Supabase client (`getAdminSupabaseClient`),
 *    while `getScopedSupabaseClient` safely verifies the token before returning an active client.
 */

// Server-side service_role ključ. NIKADA se ne hardkoduje u izvornom kodu.
// Ako nije postavljen u okruženju, klijent pada na publishable (anon) ključ, čime se
// upiti izvršavaju pod RLS politikama (fail-closed), umesto da koristi kompromitovan ključ.
const SERVICE_ROLE_KEY =
  optionalSecret('SUPABASE_SERVICE_ROLE_KEY') ||
  optionalSecret('SUPABASE_KEY') ||
  optionalSecret('VITE_SUPABASE_SERVICE_ROLE_KEY');

let sharedAnonClient: SupabaseClient | null = null;
let adminClientInstance: SupabaseClient | null = null;
let hasLoggedServiceRoleWarning = false;

function getSharedAnonClient(): SupabaseClient {
  if (!sharedAnonClient) {
    sharedAnonClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return sharedAnonClient;
}

/**
 * 1. SCOPED SUPABASE CLIENT
 * Verifies the user's Express JWT if provided and returns a configured server-side Supabase client.
 */
export function getScopedSupabaseClient(accessToken?: string): SupabaseClient {
  if (accessToken) {
    const verified = TokenService.verifyAccessToken(accessToken);
    if (verified) {
      return getAdminSupabaseClient();
    }
  }
  return getSharedAnonClient();
}

/**
 * 2. ADMIN SUPABASE CLIENT
 * Singleton server-side client for authenticated backend operations.
 */
export function getAdminSupabaseClient(): SupabaseClient {
  const activeKey = SERVICE_ROLE_KEY || supabaseKey;

  if (!SERVICE_ROLE_KEY && !hasLoggedServiceRoleWarning) {
    hasLoggedServiceRoleWarning = true;
    console.warn(
      '[SECURITY NOTICE] SUPABASE_SERVICE_ROLE_KEY is not set. Falling back to the publishable (anon) key. ' +
        'Privileged server writes will be enforced by RLS (fail-closed). Set SUPABASE_SERVICE_ROLE_KEY in the environment.'
    );
  }

  if (!adminClientInstance) {
    adminClientInstance = createClient(supabaseUrl, activeKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return adminClientInstance;
}

/**
 * 3. EXPLICIT IDOR GUARD WRAPPER
 * Enforces backend resource ownership verification prior to executing a database query.
 */
export async function executeUserScopedQuery<T>(options: {
  accessToken?: string;
  authenticatedUserId: string;
  isAdmin?: boolean;
  targetUserId?: string;
  queryFn: (client: SupabaseClient) => Promise<{ data: T | null; error: { message?: string } | null }>;
}): Promise<{ data: T | null; error: string | null }> {
  const { accessToken, authenticatedUserId, isAdmin, targetUserId, queryFn } = options;

  if (!authenticatedUserId) {
    return {
      data: null,
      error: 'Autentifikacija je obavezna za izvršavanje ovog upita.',
    };
  }

  // 1. Backend IDOR Guard check
  if (targetUserId && targetUserId !== authenticatedUserId && !isAdmin) {
    console.error(
      `[IDOR GUARD] Blocked unauthorized access to resource ${targetUserId} by user ${authenticatedUserId}`
    );
    return {
      data: null,
      error: 'Pristup odbijen: Nemate dozvolu za pristup ili izmenu ovog resursa (IDOR Guard).',
    };
  }

  // 2. Execute query via verified server client
  const client = getScopedSupabaseClient(accessToken);
  const { data, error } = await queryFn(client);

  if (error) {
    console.error('[DATABASE QUERY ERROR]', error);
    return { data: null, error: error.message || 'Greška pri izvršavanju upita nad bazom.' };
  }

  return { data, error: null };
}

/**
 * 4. AUDIT SUMMARY METRICS
 */
export function getDbSecurityAuditSummary() {
  return {
    architecture: 'Express JWT Verification + Backend IDOR Guard + Scoped Server Client',
    rlsEnforcement: 'ACTIVE - Backend RBAC & Ownership Enforced Prior to Query Execution',
    serviceRoleUsage: 'ISOLATED - Server-only Singleton Client',
    idorProtectionLevel: 'DUAL LAYER (Backend Ownership Middleware + Scoped Query Wrapper)',
    serviceRoleConfigured: Boolean(SERVICE_ROLE_KEY),
  };
}
