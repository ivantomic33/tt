import { Request, Response, NextFunction } from 'express';
import { TokenService, UserTokenPayload } from '../auth/tokenService';
import { extractAccessTokenFromReq, normalizeTokenPayload } from './authMiddleware';

/**
 * Middleware for preventing BOLA / IDOR (Broken Object Level Authorization / Insecure Direct Object Reference).
 * Ensures that an authenticated user can only access, modify, or delete their own resources
 * unless they hold the 'admin' role.
 */

export interface AuthenticatedRequest extends Request {
  user?: UserTokenPayload;
}

/**
 * Middleware to verify that the authenticated user owns the target resource or is an Administrator.
 * @param getResourceOwnerId Function that resolves the owner's user ID from the request or database
 */
export const authorizeResourceOwnership = (
  getResourceOwnerId: (req: AuthenticatedRequest) => Promise<string | null> | string | null
) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const accessToken = extractAccessTokenFromReq(req);
      if (!accessToken) {
        res.status(401).json({
          success: false,
          error: 'Autentifikacija je obavezna za pristup resursu.',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const rawPayload = TokenService.verifyAccessToken(accessToken);
      const currentUser = normalizeTokenPayload(rawPayload);

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: 'Nevažeći ili istekao token sesije.',
          code: 'INVALID_TOKEN',
        });
        return;
      }

      req.user = currentUser;

      // Administrators have global access to all resources
      if (currentUser.role.toLowerCase() === 'admin' || currentUser.role.toLowerCase() === 'administrator') {
        next();
        return;
      }

      // Resolve owner of the requested resource
      const resourceOwnerId = await getResourceOwnerId(req);

      if (!resourceOwnerId) {
        res.status(404).json({
          success: false,
          error: 'Traženi resurs nije pronađen u bazi podataka.',
          code: 'RESOURCE_NOT_FOUND',
        });
        return;
      }

      // BOLA / IDOR protection: compare authenticated userId with resourceOwnerId
      if (currentUser.userId !== resourceOwnerId) {
        console.warn(
          `[BOLA / IDOR BLOCK] User ${currentUser.userId} attempted unauthorized access to resource owned by ${resourceOwnerId}`
        );

        res.status(403).json({
          success: false,
          error: 'Pristup odbijen (BOLA / IDOR Zaštita): Nemate dozvolu za pristup ili izmenu tuđeg resursa.',
          code: 'FORBIDDEN_RESOURCE_ACCESS',
        });
        return;
      }

      next();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Greška pri proveri autorizacije resursa.';
      res.status(500).json({ success: false, error: message });
    }
  };
};
