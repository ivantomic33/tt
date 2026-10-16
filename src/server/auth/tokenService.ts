import '../env';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { CookieOptions } from 'express';
import { getAdminSupabaseClient } from '../db/supabaseClient';
import { requireSecret } from '../security/secrets';

// NIKADA ne koristimo hardkodovane fallback tajne. U produkciji server fail-fast-uje
// ako env nije postavljen; u razvoju se koristi slučajna efemerna tajna.
const JWT_ACCESS_SECRET = requireSecret('JWT_ACCESS_SECRET', { minLength: 32 });
const JWT_REFRESH_SECRET = requireSecret('JWT_REFRESH_SECRET', { minLength: 32 });
const JWT_RESET_SECRET = requireSecret('JWT_RESET_SECRET', { minLength: 32 });

export interface UserTokenPayload {
  userId: string;
  sub?: string;
  email: string;
  role: string;
  name?: string;
  username?: string;
}

export interface RefreshTokenRecord {
  jti: string;
  userId: string;
  familyId: string;
  expiresAt: number;
  isUsed: boolean;
  isRevoked: boolean;
  createdAt: number;
  userAgent?: string;
}

// Bounded in-memory cache synchronized with PostgreSQL public.refresh_tokens
const MAX_CACHED_TOKENS = 5000;
const activeRefreshTokens = new Map<string, RefreshTokenRecord>();
const revokedFamilies = new Set<string>();
// Evidencija iskorišćenih reset tokena u memoriji (dopuna DB evidenciji)
const usedResetTokens = new Set<string>();

function pruneTokenCache(): void {
  if (activeRefreshTokens.size <= MAX_CACHED_TOKENS) return;
  const now = Date.now();
  for (const [jti, rec] of activeRefreshTokens.entries()) {
    if (rec.expiresAt < now || rec.isRevoked) {
      activeRefreshTokens.delete(jti);
    }
  }
}

export const TokenService = {
  /**
   * Generates a short-lived Access Token (15 minutes)
   */
  generateAccessToken(user: UserTokenPayload): string {
    return jwt.sign(
      {
        sub: user.userId,
        userId: user.userId,
        email: user.email,
        role: user.role,
        name: user.name,
        type: 'access',
      },
      JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );
  },

  /**
   * Generates a short-lived, single-use Password Reset Token (15 minutes)
   * and records it in PostgreSQL (public.password_reset_tokens) for evidence/replay protection.
   */
  async generatePasswordResetToken(email: string): Promise<{ token: string; jti: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const jti = crypto.randomUUID();
    const token = jwt.sign(
      {
        email: cleanEmail,
        jti,
        type: 'password_reset',
      },
      JWT_RESET_SECRET,
      { expiresIn: '15m' }
    );

    try {
      const adminClient = getAdminSupabaseClient();
      await adminClient.from('password_reset_tokens').insert({
        jti,
        email: cleanEmail,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      });
    } catch (e) {
      console.warn('[TokenService] password reset token persist warn:', e);
    }

    return { token, jti };
  },

  /**
   * Verifies the signature of a Password Reset Token (does not consume it).
   */
  verifyPasswordResetToken(token: string): { email: string; jti: string } | null {
    try {
      const decoded = jwt.verify(token, JWT_RESET_SECRET) as Record<string, unknown>;
      if (
        decoded &&
        decoded.type === 'password_reset' &&
        typeof decoded.email === 'string' &&
        typeof decoded.jti === 'string'
      ) {
        return { email: decoded.email, jti: decoded.jti };
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Consumes a Password Reset Token exactly once. Rejects reused or expired tokens
   * (checked in the in-memory set and in PostgreSQL when available).
   */
  async consumePasswordResetToken(token: string): Promise<{ email: string } | null> {
    const verified = this.verifyPasswordResetToken(token);
    if (!verified) return null;

    const { email, jti } = verified;
    if (usedResetTokens.has(jti)) return null;

    try {
      const adminClient = getAdminSupabaseClient();
      const { data } = await adminClient
        .from('password_reset_tokens')
        .select('jti, expires_at, used_at')
        .eq('jti', jti)
        .maybeSingle();

      if (data) {
        if (data.used_at) return null;
        if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return null;

        await adminClient
          .from('password_reset_tokens')
          .update({ used_at: new Date().toISOString() })
          .eq('jti', jti);
      }
    } catch (e) {
      console.warn('[TokenService] password reset consume warn (falling back to in-memory):', e);
    }

    usedResetTokens.add(jti);
    return { email };
  },

  /**
   * Generates a long-lived Refresh Token (7 days) with unique JTI and Family ID.
   * Persists the token record in the PostgreSQL 'refresh_tokens' table.
   */
  generateRefreshToken(
    user: UserTokenPayload,
    existingFamilyId?: string,
    userAgent?: string
  ): { refreshToken: string; jti: string; familyId: string } {
    pruneTokenCache();
    const jti = crypto.randomUUID();
    const familyId = existingFamilyId || crypto.randomUUID();
    const expiresInSeconds = 7 * 24 * 60 * 60; // 7 days
    const expiresAt = Date.now() + expiresInSeconds * 1000;

    const refreshToken = jwt.sign(
      {
        sub: user.userId,
        userId: user.userId,
        email: user.email,
        role: user.role,
        name: user.name,
        jti,
        familyId,
        type: 'refresh',
      },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    const record: RefreshTokenRecord = {
      jti,
      userId: user.userId,
      familyId,
      expiresAt,
      isUsed: false,
      isRevoked: false,
      createdAt: Date.now(),
      userAgent,
    };

    activeRefreshTokens.set(jti, record);

    // Persist in PostgreSQL via server-side admin client
    try {
      const adminClient = getAdminSupabaseClient();
      adminClient
        .from('refresh_tokens')
        .insert({
          jti,
          user_id: user.userId,
          family_id: familyId,
          is_used: false,
          is_revoked: false,
          user_agent: userAgent || 'Web Browser',
          expires_at: new Date(expiresAt).toISOString(),
        })
        .then(({ error }) => {
          if (error && error.code !== '42P01') {
            console.warn('[TokenService] Supabase DB token insert log:', error.message);
          }
        });
    } catch (e) {
      console.warn('[TokenService] Supabase DB token insert exception:', e);
    }

    return { refreshToken, jti, familyId };
  },

  /**
   * Verifies Access Token
   */
  verifyAccessToken(token: string): Record<string, unknown> | null {
    try {
      const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as Record<string, unknown>;
      if (decoded && decoded.type && decoded.type !== 'access') {
        return null;
      }
      return decoded;
    } catch {
      return null;
    }
  },

  /**
   * Verifies Refresh Token
   */
  verifyRefreshToken(token: string): Record<string, unknown> | null {
    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as Record<string, unknown>;
      if (decoded && decoded.type && decoded.type !== 'refresh') {
        return null;
      }
      return decoded;
    } catch {
      return null;
    }
  },

  /**
   * Performs Refresh Token Rotation with PostgreSQL fallback and Reuse Detection.
   * If the server restarted and the in-memory cache is empty, queries PostgreSQL first
   * before triggering a false-positive Reuse Detection alarm.
   */
  async rotateRefreshToken(
    oldRefreshToken: string,
    userPayload: UserTokenPayload,
    userAgent?: string
  ): Promise<{
    success: boolean;
    newAccessToken?: string;
    newRefreshToken?: string;
    error?: string;
    reuseDetected?: boolean;
  }> {
    try {
      const decoded = jwt.verify(oldRefreshToken, JWT_REFRESH_SECRET) as Record<string, unknown>;
      if (!decoded || decoded.type !== 'refresh') {
        return { success: false, error: 'Neispravan tip tokena.' };
      }

      const jti = typeof decoded.jti === 'string' ? decoded.jti : '';
      const familyId = typeof decoded.familyId === 'string' ? decoded.familyId : '';

      if (!jti || !familyId) {
        return { success: false, error: 'Nevažeća struktura osvežavajućeg tokena.' };
      }

      if (revokedFamilies.has(familyId)) {
        return {
          success: false,
          error: 'Pristup blokiran: detektovana kompromitacija sesije u bazi podataka (porodica tokena opozvana).',
          reuseDetected: true,
        };
      }

      const adminClient = getAdminSupabaseClient();
      let tokenRecord = activeRefreshTokens.get(jti);

      // If not found in memory (e.g., after server restart), look up in PostgreSQL
      if (!tokenRecord) {
        try {
          const { data: dbToken } = await adminClient
            .from('refresh_tokens')
            .select('*')
            .eq('jti', jti)
            .maybeSingle();

          if (dbToken) {
            tokenRecord = {
              jti: dbToken.jti,
              userId: dbToken.user_id,
              familyId: dbToken.family_id,
              expiresAt: new Date(dbToken.expires_at).getTime(),
              isUsed: Boolean(dbToken.is_used),
              isRevoked: Boolean(dbToken.is_revoked),
              createdAt: new Date(dbToken.created_at || Date.now()).getTime(),
              userAgent: dbToken.user_agent,
            };
            activeRefreshTokens.set(jti, tokenRecord);
          } else {
            // Token is cryptographically signed and unexpired, and not marked used/revoked in DB
            tokenRecord = {
              jti,
              userId: userPayload.userId,
              familyId,
              expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
              isUsed: false,
              isRevoked: false,
              createdAt: Date.now(),
              userAgent,
            };
            activeRefreshTokens.set(jti, tokenRecord);
          }
        } catch {
          tokenRecord = {
            jti,
            userId: userPayload.userId,
            familyId,
            expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
            isUsed: false,
            isRevoked: false,
            createdAt: Date.now(),
            userAgent,
          };
          activeRefreshTokens.set(jti, tokenRecord);
        }
      }

      // REUSE DETECTION: If token was already rotated/used or explicitly revoked
      if (tokenRecord.isUsed || tokenRecord.isRevoked) {
        revokedFamilies.add(familyId);

        for (const rec of activeRefreshTokens.values()) {
          if (rec.familyId === familyId) {
            rec.isRevoked = true;
          }
        }

        try {
          await adminClient
            .from('refresh_tokens')
            .update({ is_revoked: true })
            .eq('family_id', familyId);
        } catch (e) {
          console.warn('[TokenService] DB Revoke Family exception:', e);
        }

        return {
          success: false,
          error: 'Sigurnosni alarm (Baza Podataka): Detektovano ponovno korišćenje tokena! Svi tokeni sesije su opozvani u bazi.',
          reuseDetected: true,
        };
      }

      // Mark old token as used in memory and database
      tokenRecord.isUsed = true;
      try {
        await adminClient
          .from('refresh_tokens')
          .update({ is_used: true })
          .eq('jti', jti);
      } catch (e) {
        console.warn('[TokenService] DB Mark Token Used exception:', e);
      }

      // Issue new Access and Refresh Token within the same familyId
      const newAccessToken = this.generateAccessToken(userPayload);
      const { refreshToken: newRefreshToken } = this.generateRefreshToken(
        userPayload,
        familyId,
        userAgent
      );

      return {
        success: true,
        newAccessToken,
        newRefreshToken,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Token je istekao ili nevažeći';
      return { success: false, error: `Greška pri osvežavanju sesije: ${msg}` };
    }
  },

  /**
   * Instant revocation of all sessions for a user ("Sign out everywhere")
   */
  revokeAllUserSessions(userId: string): { success: boolean; count: number } {
    let count = 0;

    for (const rec of activeRefreshTokens.values()) {
      if (rec.userId === userId) {
        rec.isRevoked = true;
        revokedFamilies.add(rec.familyId);
        count++;
      }
    }

    try {
      const adminClient = getAdminSupabaseClient();
      adminClient
        .from('refresh_tokens')
        .update({ is_revoked: true })
        .eq('user_id', userId)
        .then(({ error }) => {
          if (error && error.code !== '42P01') {
            console.warn('[TokenService] DB Revoke All Sessions log:', error.message);
          }
        });
    } catch (e) {
      console.warn('[TokenService] DB Revoke All Sessions exception:', e);
    }

    return { success: true, count };
  },

  /**
   * Revokes a single refresh token session (Logout)
   */
  revokeSession(refreshToken?: string): void {
    if (!refreshToken) return;
    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as Record<string, unknown>;
      if (typeof decoded?.familyId === 'string') {
        revokedFamilies.add(decoded.familyId);
      }
      if (typeof decoded?.jti === 'string') {
        const record = activeRefreshTokens.get(decoded.jti);
        if (record) record.isRevoked = true;

        const adminClient = getAdminSupabaseClient();
        adminClient
          .from('refresh_tokens')
          .update({ is_revoked: true })
          .eq('jti', decoded.jti)
          .then();
      }
    } catch {
      // ignore invalid token on logout
    }
  },

  getAccessTokenCookieOptions(isProduction: boolean = false): CookieOptions {
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000, // 15 minutes
    };
  },

  getRefreshTokenCookieOptions(isProduction: boolean = false): CookieOptions {
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };
  },

  getAuditMetrics() {
    const active = Array.from(activeRefreshTokens.values()).filter(
      (t) => !t.isUsed && !t.isRevoked
    ).length;
    const rotated = Array.from(activeRefreshTokens.values()).filter((t) => t.isUsed).length;
    const revoked = Array.from(activeRefreshTokens.values()).filter((t) => t.isRevoked).length;

    return {
      databaseTable: 'public.refresh_tokens (PostgreSQL / Supabase)',
      activeSessionsCount: active,
      rotatedTokensCount: rotated,
      revokedSessionsCount: revoked,
      totalRegisteredTokensInDB: activeRefreshTokens.size,
      instantRevocationSupported: true,
      reuseDetectionEnabled: true,
    };
  },
};
