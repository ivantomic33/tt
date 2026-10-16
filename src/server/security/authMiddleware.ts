import { Request, Response, NextFunction } from 'express';
import { TokenService, UserTokenPayload } from '../auth/tokenService';
import { AuthenticatedRequest } from './bolaMiddleware';

/**
 * Extracts the JWT access token from the Authorization Bearer header or HttpOnly cookie.
 */
export function extractAccessTokenFromReq(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token && token !== 'null' && token !== 'undefined') {
      return token;
    }
  }
  const cookieToken = req.cookies?.access_token;
  if (cookieToken && typeof cookieToken === 'string') {
    return cookieToken;
  }
  return null;
}

/**
 * Normalizes decoded JWT payload into UserTokenPayload.
 */
export function normalizeTokenPayload(raw: Record<string, unknown> | null): UserTokenPayload | null {
  if (!raw) return null;
  const userId = (typeof raw.sub === 'string' && raw.sub) || (typeof raw.userId === 'string' && raw.userId) || '';
  const email = typeof raw.email === 'string' ? raw.email : '';
  const role = typeof raw.role === 'string' ? raw.role : 'user';
  const name = typeof raw.name === 'string' ? raw.name : undefined;

  if (!userId) return null;

  return {
    userId,
    email,
    role,
    name,
  };
}

/**
 * Middleware: Requires a valid JWT access token.
 * Populates req.user with normalized UserTokenPayload or responds with 401 Unauthorized.
 */
export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const token = extractAccessTokenFromReq(req);
  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Autentifikacija je obavezna za ovu akciju (nedostaje access_token).',
      code: 'UNAUTHORIZED',
    });
    return;
  }

  const decoded = TokenService.verifyAccessToken(token);
  const normalized = normalizeTokenPayload(decoded);

  if (!normalized) {
    res.status(401).json({
      success: false,
      error: 'Sesija je istekla ili je token nevažeći.',
      code: 'INVALID_OR_EXPIRED_TOKEN',
    });
    return;
  }

  req.user = normalized;
  next();
};

/**
 * Middleware: Attaches req.user if a valid JWT access token is present,
 * but allows the request to proceed if unauthenticated.
 */
export const optionalAuth = (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
  const token = extractAccessTokenFromReq(req);
  if (token) {
    const decoded = TokenService.verifyAccessToken(token);
    const normalized = normalizeTokenPayload(decoded);
    if (normalized) {
      req.user = normalized;
    }
  }
  next();
};

/**
 * Middleware factory: Requires authenticated user to have one of the allowed roles.
 */
export const requireRole = (allowedRoles: string[]) => {
  const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase());

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      const token = extractAccessTokenFromReq(req);
      const decoded = token ? TokenService.verifyAccessToken(token) : null;
      const normalized = normalizeTokenPayload(decoded);
      if (normalized) {
        req.user = normalized;
      }
    }

    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Morate biti prijavljeni da biste izvršili ovu akciju.',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    const userRole = (req.user.role || 'user').toLowerCase();
    if (!normalizedAllowed.includes(userRole)) {
      res.status(403).json({
        success: false,
        error: 'Pristup odbijen: Nemate odgovarajuće privilegije za ovu operaciju.',
        code: 'INSUFFICIENT_ROLE',
      });
      return;
    }

    next();
  };
};

export const requireAdmin = requireRole(['admin', 'administrator']);
export const requireModerator = requireRole(['admin', 'administrator', 'moderator']);
