import { Request, Response, NextFunction } from 'express';
import { getAdminSupabaseClient } from '../db/supabaseClient';

/**
 * Enhanced Lockout Service (3-Strike 1-Hour Cooldown)
 * Triggers lockout after 3 failed login attempts for 60 minutes.
 * Persists state in both memory and Supabase app_users table.
 */

interface LockoutRecord {
  failedAttempts: number;
  lockedUntil: number | null;
  lastAttemptAt: number;
}

const lockoutStore = new Map<string, LockoutRecord>();

const MAX_FAILED_ATTEMPTS = 3; // 3-Strike rule
const LOCKOUT_DURATION_MS = 60 * 60 * 1000; // 1 hour (60 minutes)

export const LockoutService = {
  getKey(req: Request, email?: string): string {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const cleanEmail = (email || req.body?.email || '').toLowerCase().trim();
    return cleanEmail ? `lockout:${ip}:${cleanEmail}` : `lockout:${ip}`;
  },

  isLockedOut(key: string): { locked: boolean; remainingSeconds: number; unlockTimestamp?: string } {
    const record = lockoutStore.get(key);
    if (!record || !record.lockedUntil) {
      return { locked: false, remainingSeconds: 0 };
    }

    const now = Date.now();
    if (now < record.lockedUntil) {
      const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      const unlockTimestamp = new Date(record.lockedUntil).toISOString();
      return { locked: true, remainingSeconds, unlockTimestamp };
    }

    // Lockout expired
    lockoutStore.delete(key);
    return { locked: false, remainingSeconds: 0 };
  },

  async checkDbLockout(email: string): Promise<{ locked: boolean; remainingSeconds: number; unlockTimestamp?: string }> {
    try {
      const client = getAdminSupabaseClient();
      const { data } = await client
        .from('app_users')
        .select('failed_login_attempts, locked_until')
        .ilike('email', email)
        .maybeSingle();

      if (data && data.locked_until) {
        const lockedUntilTime = new Date(data.locked_until).getTime();
        const now = Date.now();
        if (now < lockedUntilTime) {
          const remainingSeconds = Math.ceil((lockedUntilTime - now) / 1000);
          return {
            locked: true,
            remainingSeconds,
            unlockTimestamp: data.locked_until,
          };
        }
      }
    } catch (err) {
      console.warn('[LockoutService] Error checking DB lockout:', err);
    }
    return { locked: false, remainingSeconds: 0 };
  },

  async recordFailedAttempt(key: string, email?: string): Promise<{ locked: boolean; remainingSeconds: number; attempts: number; unlockTimestamp?: string }> {
    const now = Date.now();
    let record = lockoutStore.get(key);

    if (!record) {
      record = { failedAttempts: 1, lockedUntil: null, lastAttemptAt: now };
    } else {
      record.failedAttempts += 1;
      record.lastAttemptAt = now;
    }

    if (record.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_DURATION_MS;
      lockoutStore.set(key, record);
      const unlockTimestamp = new Date(record.lockedUntil).toISOString();

      // Persist in DB if email is provided
      if (email) {
        try {
          const client = getAdminSupabaseClient();
          await client
            .from('app_users')
            .update({
              failed_login_attempts: record.failedAttempts,
              locked_until: unlockTimestamp,
              updated_at: new Date().toISOString(),
            })
            .ilike('email', email);
        } catch (dbErr) {
          console.warn('[LockoutService] Failed persisting lockout in DB:', dbErr);
        }
      }

      return {
        locked: true,
        remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
        attempts: record.failedAttempts,
        unlockTimestamp,
      };
    }

    lockoutStore.set(key, record);

    // Update DB failed attempts count
    if (email) {
      try {
        const client = getAdminSupabaseClient();
        await client
          .from('app_users')
          .update({
            failed_login_attempts: record.failedAttempts,
            updated_at: new Date().toISOString(),
          })
          .ilike('email', email);
      } catch (dbErr) {
        console.warn('[LockoutService] Failed updating failed attempts in DB:', dbErr);
      }
    }

    return {
      locked: false,
      remainingSeconds: 0,
      attempts: record.failedAttempts,
    };
  },

  async recordSuccess(key: string, email?: string): Promise<void> {
    lockoutStore.delete(key);
    if (email) {
      try {
        const client = getAdminSupabaseClient();
        await client
          .from('app_users')
          .update({
            failed_login_attempts: 0,
            locked_until: null,
            updated_at: new Date().toISOString(),
          })
          .ilike('email', email);
      } catch (dbErr) {
        console.warn('[LockoutService] Failed resetting lockout on success in DB:', dbErr);
      }
    }
  },

  async checkLockoutMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    const email = req.body?.email;
    const key = LockoutService.getKey(req, email);
    
    // Check memory first
    let lockoutStatus = LockoutService.isLockedOut(key);

    // If not locked in memory, check DB
    if (!lockoutStatus.locked && email) {
      lockoutStatus = await LockoutService.checkDbLockout(email);
    }

    if (lockoutStatus.locked) {
      res.status(429).json({
        success: false,
        error: `Nalog je privremeno zaključan zbog previše neuspešnih pokušaja prijave. Pokušajte ponovo nakon isteka tajmera.`,
        locked: true,
        remainingSeconds: lockoutStatus.remainingSeconds,
        unlockTimestamp: lockoutStatus.unlockTimestamp,
      });
      return;
    }

    next();
  },

  getAuditMetrics() {
    const now = Date.now();
    const activeLockouts = Array.from(lockoutStore.values()).filter(
      (r) => r.lockedUntil && r.lockedUntil > now
    ).length;

    return {
      maxAllowedFailedAttempts: MAX_FAILED_ATTEMPTS,
      lockoutDurationMinutes: LOCKOUT_DURATION_MS / 60000,
      activeLockoutsCount: activeLockouts,
    };
  },
};
