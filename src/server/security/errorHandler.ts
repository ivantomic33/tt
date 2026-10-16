import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';

/**
 * Centralized Express Error Handling Middleware.
 * Intercepts Multer file upload errors, Zod validation errors, CORS blocks,
 * JSON parsing failures, and unexpected runtime errors, returning a standardized JSON payload.
 */
export function centralizedErrorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  // 1. Handle Multer File Upload Errors
  if (err instanceof multer.MulterError) {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Fajl prelazi maksimalnu dozvoljenu veličinu od 5 MB.'
        : `Greška pri upload-u fajla: ${err.message}`;

    res.status(status).json({
      success: false,
      error: message,
      code: err.code,
    });
    return;
  }

  // 2. Handle Zod Schema Validation Errors
  if (err instanceof ZodError) {
    const issues = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    res.status(400).json({
      success: false,
      error: issues[0]?.message || 'Validacija ulaznih podataka nije uspela.',
      validationErrors: issues,
      code: 'VALIDATION_ERROR',
    });
    return;
  }

  // 3. Handle Standard Error Instances (CORS, File Filter, JSON SyntaxError)
  if (err instanceof Error) {
    if (err.message.includes('CORS zabranjuje pristup')) {
      res.status(403).json({
        success: false,
        error: err.message,
        code: 'CORS_ORIGIN_FORBIDDEN',
      });
      return;
    }

    if (err.message.startsWith('Odbijeno:')) {
      res.status(422).json({
        success: false,
        error: err.message,
        code: 'INVALID_UPLOAD_FILE',
      });
      return;
    }

    if ('type' in err && (err as { type?: string }).type === 'entity.too.large') {
      res.status(413).json({
        success: false,
        error: 'Payload zahteva prelazi dozvoljeni limit od 1 MB.',
        code: 'PAYLOAD_TOO_LARGE',
      });
      return;
    }

    if (err instanceof SyntaxError && 'status' in err) {
      res.status(400).json({
        success: false,
        error: 'Neispravan JSON format u telu zahteva.',
        code: 'INVALID_JSON',
      });
      return;
    }

    console.error('[ServerError]', err.message);
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Interna greška na serveru.' : err.message,
      code: 'INTERNAL_SERVER_ERROR',
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: 'Nepoznata greška na serveru.',
    code: 'UNKNOWN_ERROR',
  });
}

export const errorHandlerMiddleware = centralizedErrorHandler;

