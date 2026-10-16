import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Express Middleware za strogu validaciju tela zahteva (req.body).
 * Odbija bilo kakav payload sa nedozvoljenim poljima (Strict Parsing / Whitelist).
 */
export const validateBody = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Izvršavamo strog parsing - odbijamo nepoznata ili injecktovana polja
      const sanitizedBody = await schema.parseAsync(req.body);
      req.body = sanitizedBody;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const issues = err.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));

        res.status(400).json({
          success: false,
          error: 'Validacija ulaznih podataka nije uspela.',
          validationErrors: issues,
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: 'Neispravan ili maliciozan format ulaznih podataka.',
      });
    }
  };
};
