import '../env';
import { Router, Request, Response } from 'express';
import { PasswordService } from './passwordService';
import { TokenService, UserTokenPayload } from './tokenService';
import { validateBody } from '../validation/validateMiddleware';
import {
  RegisterSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from '../validation/schemas';
import { sensitiveAuthRateLimiter, availabilityRateLimiter, getRateLimitSummary } from '../security/rateLimiter';
import { LockoutService } from '../security/lockoutService';
import { getAdminSupabaseClient, getScopedSupabaseClient } from '../db/supabaseClient';
import { getCorsPolicySummary } from '../security/corsConfig';
import { getHelmetHeadersSummary } from '../security/helmetConfig';
import { authorizeResourceOwnership, AuthenticatedRequest } from '../security/bolaMiddleware';
import { extractAccessTokenFromReq, requireAuth } from '../security/authMiddleware';
import { sendPasswordResetEmail } from './mailer';

const router = Router();
const isProduction = process.env.NODE_ENV === 'production';

// Lista administratorskih email adresa se isključivo učitava iz okruženja (ADMIN_EMAILS).
// Nema hardkodovanih ličnih adresa niti podrazumevanih admin naloga.
const EXPLICIT_ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

function resolveUserRole(email: string, existingRole?: string): string {
  const clean = email.trim().toLowerCase();
  if (EXPLICIT_ADMIN_EMAILS.has(clean)) {
    return 'admin';
  }
  if (existingRole && ['admin', 'moderator', 'user'].includes(existingRole.toLowerCase())) {
    return existingRole.toLowerCase();
  }
  return 'user';
}

interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: string;
  createdAt: string;
}

const userDatabase = new Map<string, StoredUser>();

export function extractAccessToken(req: Request): string | null {
  return extractAccessTokenFromReq(req);
}

export function extractRefreshToken(req: Request): string | null {
  if (req.body?.refreshToken && typeof req.body.refreshToken === 'string') {
    return req.body.refreshToken.trim();
  }
  const xRefresh = req.headers['x-refresh-token'];
  if (xRefresh && typeof xRefresh === 'string') {
    return xRefresh.trim();
  }
  return req.cookies?.refresh_token || null;
}

async function getUserById(userId: string, emailFallback?: string): Promise<UserTokenPayload | null> {
  try {
    const client = getAdminSupabaseClient();
    const { data, error } = await client
      .from('app_users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (data && !error) {
      const stored: StoredUser = {
        id: data.id,
        email: data.email.trim().toLowerCase(),
        passwordHash: data.password_hash || '',
        name: data.name || data.email.split('@')[0],
        role: resolveUserRole(data.email, data.role),
        createdAt: data.created_at || new Date().toISOString(),
      };
      userDatabase.set(stored.email, stored);
      return {
        userId: stored.id,
        email: stored.email,
        role: stored.role,
        name: stored.name,
      };
    }

    if (!error && !data) {
      // User does not exist in Supabase app_users (e.g. account was deleted); evict from memory and invalidate session
      for (const [key, u] of userDatabase.entries()) {
        if (u.id === userId || (emailFallback && key === emailFallback.trim().toLowerCase())) {
          userDatabase.delete(key);
        }
      }
      return null;
    }
  } catch (err) {
    console.warn('[AuthServer] Could not fetch user from Supabase app_users:', err);
  }

  for (const user of userDatabase.values()) {
    if (user.id === userId) {
      return {
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      };
    }
  }

  return null;
}

/**
 * 0. CHECK EMAIL AND USERNAME AVAILABILITY (GET /api/auth/check-availability)
 */
router.get('/check-availability', availabilityRateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const emailQuery =
      typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : undefined;
    const nameQuery =
      typeof req.query.name === 'string' ? req.query.name.trim() : undefined;

    const result: { emailAvailable?: boolean; nameAvailable?: boolean } = {};
    const client = getAdminSupabaseClient();

    if (emailQuery) {
      const { data, error } = await client
        .from('app_users')
        .select('id, password_hash')
        .ilike('email', emailQuery)
        .maybeSingle();

      if (!error) {
        if (!data || !data.password_hash) {
          userDatabase.delete(emailQuery);
          result.emailAvailable = true;
        } else {
          result.emailAvailable = false;
        }
      } else {
        result.emailAvailable = !userDatabase.has(emailQuery);
      }
    }

    if (nameQuery) {
      const { data: userRow, error } = await client
        .from('app_users')
        .select('id, password_hash')
        .ilike('name', nameQuery)
        .maybeSingle();

      if (!error) {
        if (!userRow || !userRow.password_hash) {
          for (const [k, v] of userDatabase.entries()) {
            if (v.name.trim().toLowerCase() === nameQuery.toLowerCase()) {
              userDatabase.delete(k);
            }
          }
          result.nameAvailable = true;
        } else {
          result.nameAvailable = false;
        }
      } else {
        const inMem = Array.from(userDatabase.values()).some(
          (u) => u.name.trim().toLowerCase() === nameQuery.toLowerCase()
        );
        result.nameAvailable = !inMem;
      }
    }

    res.json({ success: true, ...result });
  } catch {
    res.json({ success: true, emailAvailable: true, nameAvailable: true });
  }
});

/**
 * 1. USER REGISTRATION (POST /api/auth/register)
 */
router.post(
  '/register',
  sensitiveAuthRateLimiter,
  validateBody(RegisterSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, name } = req.body;
      const cleanEmail = email.trim().toLowerCase();
      const candidateName =
        name && typeof name === 'string' && name.trim().length > 0
          ? name.trim()
          : cleanEmail.split('@')[0].trim();

      const client = getAdminSupabaseClient();

      // Primary source of truth: Supabase public.app_users
      const { data: existingEmailUser, error: emailCheckError } = await client
        .from('app_users')
        .select('id, email, name, password_hash')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (existingEmailUser) {
        if (existingEmailUser.password_hash) {
          res.status(409).json({
            success: false,
            error: 'Ova email adresa je već registrovana.',
            code: 'EMAIL_ALREADY_EXISTS',
          });
          return;
        } else {
          // Incomplete ghost record without password_hash: remove so fresh registration succeeds
          await client.from('app_users').delete().eq('id', existingEmailUser.id);
          userDatabase.delete(cleanEmail);
        }
      }

      if (!emailCheckError) {
        // User does not exist in Supabase app_users (e.g., deleted via Supabase Studio); clear any stale in-memory entry
        userDatabase.delete(cleanEmail);
      } else if (userDatabase.has(cleanEmail)) {
        res.status(409).json({
          success: false,
          error: 'Ova email adresa je već registrovana.',
          code: 'EMAIL_ALREADY_EXISTS',
        });
        return;
      }

      const { data: existingNameUser, error: nameCheckError } = await client
        .from('app_users')
        .select('id, email, name, password_hash')
        .ilike('name', candidateName)
        .maybeSingle();

      if (existingNameUser) {
        if (existingNameUser.password_hash) {
          res.status(409).json({
            success: false,
            error: 'Ovo korisničko ime je već zauzeto.',
            code: 'USERNAME_ALREADY_TAKEN',
          });
          return;
        } else {
          await client.from('app_users').delete().eq('id', existingNameUser.id);
        }
      }

      if (!nameCheckError) {
        for (const [k, v] of userDatabase.entries()) {
          if (v.name.trim().toLowerCase() === candidateName.toLowerCase()) {
            userDatabase.delete(k);
          }
        }
      } else {
        const nameExistsInMemory = Array.from(userDatabase.values()).some(
          (u) => u.name.trim().toLowerCase() === candidateName.toLowerCase()
        );
        if (nameExistsInMemory) {
          res.status(409).json({
            success: false,
            error: 'Ovo korisničko ime je već zauzeto.',
            code: 'USERNAME_ALREADY_TAKEN',
          });
          return;
        }
      }

      const passwordHash = await PasswordService.hashPassword(password);
      const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const role = resolveUserRole(cleanEmail);

      const newUser: StoredUser = {
        id: userId,
        email: cleanEmail,
        passwordHash,
        name: candidateName,
        role,
        createdAt: new Date().toISOString(),
      };

      let { error: appUserError } = await client.from('app_users').insert({
        id: newUser.id,
        email: newUser.email,
        password_hash: newUser.passwordHash,
        name: newUser.name,
        role: newUser.role,
        created_at: newUser.createdAt,
        updated_at: new Date().toISOString(),
        terms_accepted_at: new Date().toISOString(),
      });

      if (
        appUserError &&
        (appUserError.code === 'PGRST204' || appUserError.message?.includes('terms_accepted_at'))
      ) {
        const retryRes = await client.from('app_users').insert({
          id: newUser.id,
          email: newUser.email,
          password_hash: newUser.passwordHash,
          name: newUser.name,
          role: newUser.role,
          created_at: newUser.createdAt,
          updated_at: new Date().toISOString(),
        });
        appUserError = retryRes.error;
      }

      if (appUserError) {
        if (appUserError.code === '23505') {
          const detailStr = (appUserError.details || appUserError.message || '').toLowerCase();
          if (detailStr.includes('email')) {
            res.status(409).json({
              success: false,
              error: 'Ova email adresa je već registrovana.',
              code: 'EMAIL_ALREADY_EXISTS',
            });
            return;
          }
          if (detailStr.includes('name') || detailStr.includes('username')) {
            res.status(409).json({
              success: false,
              error: 'Ovo korisničko ime je već zauzeto.',
              code: 'USERNAME_ALREADY_TAKEN',
            });
            return;
          }
          res.status(409).json({
            success: false,
            error: 'Korisnik sa ovim podacima već postoji u bazi.',
            code: 'DUPLICATE_ENTRY',
          });
          return;
        }

        if (appUserError.code === '42501') {
          res.status(500).json({
            success: false,
            error: 'Sistemska greška (RLS): Nije dozvoljen upis u bazu korisnika.',
          });
          return;
        } else if (appUserError.code !== '42P01') {
          res.status(500).json({
            success: false,
            error: 'Greška pri kreiranju korisničkog naloga u bazi.',
          });
          return;
        }
      }

      userDatabase.set(cleanEmail, newUser);

      try {
        await client.from('forum_members').upsert(
          {
            name: newUser.name,
            role: newUser.role === 'admin' ? 'Administrator' : 'Član',
            avatar:
              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
            base_karma: 50,
            is_online: true,
            bio: 'Novo registrovani član zajednice',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'name' }
        );
      } catch (fErr) {
        console.warn('[AuthServer] Non-fatal info upserting forum_member:', fErr);
      }

      const userPayload: UserTokenPayload = {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
        name: newUser.name,
      };

      const accessToken = TokenService.generateAccessToken(userPayload);
      const { refreshToken } = TokenService.generateRefreshToken(
        userPayload,
        undefined,
        req.get('User-Agent')
      );

      res.cookie('access_token', accessToken, TokenService.getAccessTokenCookieOptions(isProduction));
      res.cookie(
        'refresh_token',
        refreshToken,
        TokenService.getRefreshTokenCookieOptions(isProduction)
      );

      res.status(201).json({
        success: true,
        accessToken,
        refreshToken,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
        },
        message: 'Uspešna registracija. Podaci su prošli strog Zod whitelist audit.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Greška na serveru.';
      res.status(500).json({ success: false, error: msg });
    }
  }
);

/**
 * 2. USER LOGIN (POST /api/auth/login)
 */
router.post(
  '/login',
  sensitiveAuthRateLimiter,
  (req, res, next) => LockoutService.checkLockoutMiddleware(req, res, next),
  validateBody(LoginSchema),
  async (req: Request, res: Response): Promise<void> => {
    const cleanEmail = (req.body.email || '').trim().toLowerCase();
    const lockoutKey = LockoutService.getKey(req, cleanEmail);

    try {
      const { password } = req.body;
      let storedUser: StoredUser | undefined;

      // 1. Primary source of truth: Supabase public.app_users
      try {
        const client = getAdminSupabaseClient();
        const { data: dbUser, error: dbError } = await client
          .from('app_users')
          .select('id, email, password_hash, name, role, created_at')
          .ilike('email', cleanEmail)
          .maybeSingle();

        if (dbUser && dbUser.password_hash) {
          storedUser = {
            id: dbUser.id,
            email: dbUser.email.trim().toLowerCase(),
            passwordHash: dbUser.password_hash,
            name: dbUser.name || cleanEmail.split('@')[0],
            role: resolveUserRole(dbUser.email, dbUser.role),
            createdAt: dbUser.created_at || new Date().toISOString(),
          };
          userDatabase.set(cleanEmail, storedUser);
        } else if (!dbError && !dbUser) {
          // User was removed from app_users in Supabase; clear any stale cached entry
          userDatabase.delete(cleanEmail);
        }
      } catch (dbErr) {
        console.warn('[AuthServer] Error querying app_users on login:', dbErr);
      }

      // 2. Fallback to in-memory cache (if DB was unreachable)
      if (!storedUser) {
        storedUser = userDatabase.get(cleanEmail);
      }

      // 3. Fallback za administratore definisane isključivo preko okruženja (ADMIN_EMAILS + ADMIN_PASSWORD)
      //    Ako nije postavljena ni ADMIN_PASSWORD_HASH ni ADMIN_PASSWORD, admin fallback se NE kreira
      //    (nema podrazumevane lozinke poput "admin123").
      if (!storedUser && EXPLICIT_ADMIN_EMAILS.has(cleanEmail)) {
        const adminHash = process.env.ADMIN_PASSWORD_HASH?.trim();
        const adminPlainPassword = process.env.ADMIN_PASSWORD?.trim();

        if (adminHash || adminPlainPassword) {
          const hash = adminHash || (await PasswordService.hashPassword(adminPlainPassword!));
          storedUser = {
            id: `usr_admin_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
            email: cleanEmail,
            passwordHash: hash,
            name: 'Administrator',
            role: 'admin',
            createdAt: new Date().toISOString(),
          };
        }
      }

      if (!storedUser) {
        const { locked, remainingSeconds, unlockTimestamp } = await LockoutService.recordFailedAttempt(
          lockoutKey,
          cleanEmail
        );
        if (locked) {
          res.status(429).json({
            success: false,
            error:
              'Privremeno zaključavanje: Detektovano previše neuspešnih pokušaja prijave. Nalog je zaključan na 60 minuta.',
            locked: true,
            remainingSeconds,
            unlockTimestamp,
          });
          return;
        }

        res.status(401).json({ success: false, error: 'Neispravan email ili lozinka.' });
        return;
      }

      const isValidPassword = await PasswordService.verifyPassword(
        password,
        storedUser.passwordHash
      );

      if (!isValidPassword) {
        const { locked, remainingSeconds, unlockTimestamp } = await LockoutService.recordFailedAttempt(
          lockoutKey,
          cleanEmail
        );
        if (locked) {
          res.status(429).json({
            success: false,
            error:
              'Privremeno zaključavanje: Detektovano previše neuspešnih pokušaja prijave. Nalog je zaključan na 60 minuta.',
            locked: true,
            remainingSeconds,
            unlockTimestamp,
          });
          return;
        }

        res.status(401).json({ success: false, error: 'Neispravan email ili lozinka.' });
        return;
      }

      await LockoutService.recordSuccess(lockoutKey, cleanEmail);

      try {
        const client = getAdminSupabaseClient();
        await client.from('app_users').upsert(
          {
            id: storedUser.id,
            email: storedUser.email,
            password_hash: storedUser.passwordHash,
            name: storedUser.name,
            role: storedUser.role,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

        await client.from('forum_members').upsert(
          {
            name: storedUser.name,
            role: storedUser.role === 'admin' ? 'Administrator' : 'Član',
            avatar:
              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
            is_online: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'name' }
        );
      } catch (err) {
        console.warn('[AuthServer] Non-fatal error syncing logged-in user:', err);
      }

      const userPayload: UserTokenPayload = {
        userId: storedUser.id,
        email: storedUser.email,
        role: storedUser.role,
        name: storedUser.name,
      };

      const accessToken = TokenService.generateAccessToken(userPayload);
      const { refreshToken } = TokenService.generateRefreshToken(
        userPayload,
        undefined,
        req.get('User-Agent')
      );

      res.cookie('access_token', accessToken, TokenService.getAccessTokenCookieOptions(isProduction));
      res.cookie(
        'refresh_token',
        refreshToken,
        TokenService.getRefreshTokenCookieOptions(isProduction)
      );

      res.json({
        success: true,
        accessToken,
        refreshToken,
        user: {
          id: storedUser.id,
          email: storedUser.email,
          name: storedUser.name,
          role: storedUser.role,
        },
        message: 'Uspešna prijava. Bezbedni kolačići su postavljeni.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Greška na serveru pri prijavi.';
      res.status(500).json({ success: false, error: msg });
    }
  }
);

/**
 * 3. FORGOT PASSWORD (POST /api/auth/forgot-password)
 */
router.post(
  '/forgot-password',
  sensitiveAuthRateLimiter,
  validateBody(ForgotPasswordSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;
    // Generiše kriptografski reset token, evidentira ga (single-use) i šalje mejl,
    // uz konstantan odgovor bezbedan od enumeracije (ne potvrđuje da li nalog postoji).
    const { token } = await TokenService.generatePasswordResetToken(email);
    await sendPasswordResetEmail(email, token);
    res.json({
      success: true,
      message:
        'Ukoliko nalog sa unetom adresom postoji u sistemu, poslat je bezbedni link za resetovanje lozinke.',
    });
  }
);

/**
 * 4. RESET PASSWORD (POST /api/auth/reset-password)
 */
router.post(
  '/reset-password',
  sensitiveAuthRateLimiter,
  validateBody(ResetPasswordSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { token, newPassword } = req.body;
      const verified = await TokenService.consumePasswordResetToken(token);

      if (!verified) {
        res.status(400).json({
          success: false,
          error: 'Token za resetovanje lozinke je nevažeći, istekao ili je već iskorišćen.',
        });
        return;
      }

      const newHash = await PasswordService.hashPassword(newPassword);
      const existingMem = userDatabase.get(verified.email);
      if (existingMem) {
        existingMem.passwordHash = newHash;
        TokenService.revokeAllUserSessions(existingMem.id);
      }

      try {
        const client = getAdminSupabaseClient();
        await client
          .from('app_users')
          .update({
            password_hash: newHash,
            failed_login_attempts: 0,
            locked_until: null,
            updated_at: new Date().toISOString(),
          })
          .ilike('email', verified.email);
      } catch (e) {
        console.warn('[AuthServer] Password reset DB update warn:', e);
      }

      res.json({
        success: true,
        message: 'Lozinka je uspešno promenjena. Možete se prijaviti sa novom lozinkom.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Greška pri resetovanju lozinke.';
      res.status(500).json({ success: false, error: msg });
    }
  }
);

/**
 * 5. SESSION REFRESH WITH ROTATION & REUSE DETECTION (POST /api/auth/refresh)
 */
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const oldRefreshToken = extractRefreshToken(req);

    if (!oldRefreshToken) {
      res.status(401).json({
        success: false,
        error: 'Nema osvežavajućeg tokena (refresh_token kolačić ili payload).',
      });
      return;
    }

    // Strict verification: never accept unverified req.body.userPayload
    const decoded = TokenService.verifyRefreshToken(oldRefreshToken);

    const sub = typeof decoded?.sub === 'string' ? decoded.sub : '';
    const uid = typeof decoded?.userId === 'string' ? decoded.userId : '';
    const userId = sub || uid;

    if (!decoded || !userId) {
      res.status(401).json({ success: false, error: 'Nevažeći osvežavajući token.' });
      return;
    }

    const emailClaim = typeof decoded.email === 'string' ? decoded.email : undefined;
    const userPayload = await getUserById(userId, emailClaim);

    if (!userPayload) {
      res.clearCookie('access_token', TokenService.getAccessTokenCookieOptions(isProduction));
      res.clearCookie('refresh_token', TokenService.getRefreshTokenCookieOptions(isProduction));
      res.status(401).json({
        success: false,
        error: 'Korisnički nalog više ne postoji u bazi podataka.',
      });
      return;
    }

    const rotationResult = await TokenService.rotateRefreshToken(
      oldRefreshToken,
      userPayload,
      req.get('User-Agent')
    );

    if (!rotationResult.success) {
      res.clearCookie('access_token', TokenService.getAccessTokenCookieOptions(isProduction));
      res.clearCookie('refresh_token', TokenService.getRefreshTokenCookieOptions(isProduction));

      res.status(401).json({
        success: false,
        error: rotationResult.error || 'Nevažeći ili ponovo iskorišćen refresh token.',
        reuseDetected: rotationResult.reuseDetected || false,
      });
      return;
    }

    res.cookie(
      'access_token',
      rotationResult.newAccessToken!,
      TokenService.getAccessTokenCookieOptions(isProduction)
    );
    res.cookie(
      'refresh_token',
      rotationResult.newRefreshToken!,
      TokenService.getRefreshTokenCookieOptions(isProduction)
    );

    res.json({
      success: true,
      accessToken: rotationResult.newAccessToken,
      refreshToken: rotationResult.newRefreshToken,
      user: {
        id: userPayload.userId,
        email: userPayload.email,
        name: userPayload.name,
        role: userPayload.role,
      },
      message: 'Sesija je uspešno osvežena uz rotaciju osvežavajućeg tokena (Refresh Token Rotation).',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Greška pri osvežavanju sesije.';
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * 6. CURRENT USER PROFILE (GET /api/auth/me)
 */
router.get('/me', async (req: Request, res: Response): Promise<void> => {
  try {
    const accessToken = extractAccessToken(req);

    if (!accessToken) {
      res.status(401).json({ success: false, error: 'Niste prijavljeni (nedostaje access_token).' });
      return;
    }

    const payload = TokenService.verifyAccessToken(accessToken);
    const userId =
      (typeof payload?.sub === 'string' && payload.sub) ||
      (typeof payload?.userId === 'string' && payload.userId) ||
      '';

    if (!payload || !userId) {
      res.status(401).json({ success: false, error: 'Access token je istekao ili nevažeći.' });
      return;
    }

    const emailClaim = typeof payload.email === 'string' ? payload.email : undefined;
    const userPayload = await getUserById(userId, emailClaim);

    if (!userPayload) {
      res.clearCookie('access_token', TokenService.getAccessTokenCookieOptions(isProduction));
      res.clearCookie('refresh_token', TokenService.getRefreshTokenCookieOptions(isProduction));
      res.status(401).json({
        success: false,
        error: 'Korisnički nalog više ne postoji u bazi podataka.',
      });
      return;
    }

    res.json({
      success: true,
      user: {
        id: userPayload.userId,
        email: userPayload.email,
        name: userPayload.name,
        role: userPayload.role,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Greška pri proveri korisnika.';
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * 7. USER LOGOUT (POST /api/auth/logout)
 */
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = extractRefreshToken(req);

    if (refreshToken) {
      TokenService.revokeSession(refreshToken);
    }

    res.clearCookie('access_token', TokenService.getAccessTokenCookieOptions(isProduction));
    res.clearCookie('refresh_token', TokenService.getRefreshTokenCookieOptions(isProduction));

    res.json({ success: true, message: 'Uspešno ste se odjavili. Kolačići su uklonjeni.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Greška pri odjavi.';
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * 8. REVOKE ALL USER SESSIONS (POST /api/auth/revoke-all)
 * Protected by requireAuth to prevent unauthenticated revocation of admin sessions.
 */
router.post(
  '/revoke-all',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const result = TokenService.revokeAllUserSessions(userId);

      res.clearCookie('access_token', TokenService.getAccessTokenCookieOptions(isProduction));
      res.clearCookie('refresh_token', TokenService.getRefreshTokenCookieOptions(isProduction));

      res.json({
        success: true,
        message:
          'Uspešno ste se odjavili sa SVIH uređaja! Baza podataka (public.refresh_tokens) je poništila sve sesije za ovog korisnika.',
        revokedCount: result.count,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Greška pri opozivu sesija.';
      res.status(500).json({ success: false, error: msg });
    }
  }
);

/**
 * 9. BOLA / IDOR PROTECTED USER PROFILE ROUTE (GET /api/auth/users/:userId/profile)
 */
router.get(
  '/users/:userId/profile',
  authorizeResourceOwnership((req) => req.params.userId),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const userPayload = await getUserById(userId);

      if (!userPayload) {
        res.status(404).json({ success: false, error: 'Korisnički profil nije pronađen.' });
        return;
      }

      res.json({
        success: true,
        user: {
          id: userPayload.userId,
          email: userPayload.email,
          name: userPayload.name,
          role: userPayload.role,
        },
        securityInfo:
          'Pristup odobren: Verifikovano vlasništvo nad resursom (BOLA/IDOR Middleware Passed).',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Greška pri dobavljanju profila.';
      res.status(500).json({ success: false, error: msg });
    }
  }
);

/**
 * 10. SECURITY AUDIT REPORT (GET /api/auth/security-audit)
 *     Zaštićeno autentikacijom; javna lista dozvoljenih CORS origin-a se ne izlaže.
 */
router.get('/security-audit', requireAuth, async (_req: Request, res: Response): Promise<void> => {
  const { allowedOrigins: _allowedOrigins, ...corsPolicyPublic } = getCorsPolicySummary();

  res.json({
    timestamp: new Date().toISOString(),
    passwordPolicy: PasswordService.getSecurityParams(),
    rateLimiting: getRateLimitSummary(),
    lockoutPolicy: LockoutService.getAuditMetrics(),
    corsPolicy: corsPolicyPublic,
    helmetHeaders: getHelmetHeadersSummary(),
    cookiesPolicy: {
      flags: {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'None' : 'Lax',
        accessTokenPath: '/',
        refreshTokenPath: '/',
      },
      prohibitions: {
        localStorageTokensAllowed: false,
        sessionStorageTokensAllowed: false,
        status: 'PASSED - HttpOnly Cookie Primary + Scoped Bearer Verification',
      },
    },
    refreshTokenRotation: {
      mechanism: 'Refresh Token Rotation with Reuse Detection in PostgreSQL DB',
      status: 'ACTIVE',
      tokenMetrics: TokenService.getAuditMetrics(),
    },
  });
});

/**
 * 11. RESOLVE ROLE (POST /api/auth/resolve-role)
 *     Klijent šalje Supabase access token; server ga verifikuje preko Supabase servisa
 *     (bez potrebe za Supabase JWT tajnom), a zatim autoritativno određuje ulogu
 *     (app_users preko service_role + eksplicitna ADMIN_EMAILS lista).
 *     Time rezolucija uloge ne zavisi od anon RLS čitanja na klijentu.
 */
router.post('/resolve-role', async (req: Request, res: Response): Promise<void> => {
  try {
    const supabaseAccessToken =
      typeof req.body?.supabaseAccessToken === 'string' ? req.body.supabaseAccessToken.trim() : '';
    if (!supabaseAccessToken) {
      res.status(400).json({ success: false, error: 'Supabase access token je obavezan.' });
      return;
    }

    // 1. Verifikuj Supabase sesiju (delegirano Supabase GoTrue servisu).
    const anonClient = getScopedSupabaseClient();
    const { data: userData, error: userError } = await anonClient.auth.getUser(supabaseAccessToken);
    if (userError || !userData?.user?.id) {
      res.status(401).json({ success: false, error: 'Nevažeća ili istekla Supabase sesija.' });
      return;
    }

    const supabaseUser = userData.user;
    const email = (supabaseUser.email || '').toLowerCase();

    // 2. Autoritativna uloga: app_users (service_role) + eksplicitna admin lista.
    const admin = getAdminSupabaseClient();
    const { data: profile } = await admin
      .from('app_users')
      .select('id, email, name, role')
      .eq('id', supabaseUser.id)
      .maybeSingle();

    const isAdmin =
      profile?.role === 'admin' ||
      EXPLICIT_ADMIN_EMAILS.has(email) ||
      supabaseUser.user_metadata?.role === 'admin';

    const role = isAdmin ? 'admin' : (profile?.role || 'user');
    const name =
      profile?.name ||
      supabaseUser.user_metadata?.name ||
      supabaseUser.user_metadata?.full_name ||
      email.split('@')[0] ||
      'Gamer';

    res.json({
      success: true,
      user: { id: supabaseUser.id, email: supabaseUser.email || '', name, role },
    });
  } catch (err) {
    console.error('[authRouter.resolveRole]', err);
    res.status(500).json({ success: false, error: 'Greška na serveru.' });
  }
});

export default router;
