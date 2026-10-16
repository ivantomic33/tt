import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { requireSecret } from './secrets';

/**
 * CLOUD FILE UPLOADS & STORAGE SECURITY SERVICE
 * 1. Extension, MIME Type, and Magic Bytes Signature Verification
 * 2. Strict 5 MB File Size Limit
 * 3. Cryptographic UUIDv4 Filename Generation (Path Traversal Protection)
 * 4. HMAC-SHA256 Signed Presigned URL Generation & Verification
 * 5. Strict Serving Security Headers (nosniff, Content-Disposition, Sandbox CSP)
 */

// Bez hardkodovanih fallback tajni; u produkciji fail-fast, u razvoju efemerna slučajna vrednost.
const STORAGE_READ_SECRET = requireSecret('STORAGE_HMAC_SECRET', { minLength: 32 });
const STORAGE_UPLOAD_SECRET = requireSecret('STORAGE_UPLOAD_SECRET', { minLength: 32 });

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf'];

export const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

export const MAGIC_BYTES_SIGNATURES: Record<string, { bytes: number[]; mask?: number[] }> = {
  'image/jpeg': { bytes: [0xff, 0xd8, 0xff] },
  'image/png': { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  'image/gif': { bytes: [0x47, 0x49, 0x46, 0x38] },
  'application/pdf': { bytes: [0x25, 0x50, 0x44, 0x46] },
};

/**
 * Verifies whether the leading bytes of the buffer match the expected Magic Bytes signature.
 */
export function verifyMagicBytes(
  buffer: Buffer,
  mimeType: string
): { valid: boolean; detectedType?: string } {
  if (!buffer || buffer.length < 4) {
    return { valid: false };
  }

  // 1. JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: mimeType === 'image/jpeg', detectedType: 'image/jpeg' };
  }

  // 2. PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: mimeType === 'image/png', detectedType: 'image/png' };
  }

  // 3. GIF
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return { valid: mimeType === 'image/gif', detectedType: 'image/gif' };
  }

  // 4. WEBP (RIFF....WEBP)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer.length >= 12 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { valid: mimeType === 'image/webp', detectedType: 'image/webp' };
  }

  // 5. PDF (%PDF)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return { valid: mimeType === 'application/pdf', detectedType: 'application/pdf' };
  }

  return { valid: false };
}

/**
 * Generates a cryptographically random UUIDv4 filename with a whitelisted extension.
 */
export function generateSecureFilename(originalFilename: string, validatedMimeType: string): string {
  const extFromOriginal = path.extname(originalFilename || '').toLowerCase();

  const mimeToExtMap: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'application/pdf': '.pdf',
  };

  const safeExt =
    mimeToExtMap[validatedMimeType] ||
    (ALLOWED_EXTENSIONS.includes(extFromOriginal) ? extFromOriginal : '.bin');
  const uuid = crypto.randomUUID();
  const timestamp = Date.now();

  return `upload_${uuid}_${timestamp}${safeExt}`;
}

const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(
        new Error(`Odbijeno: Ekstenzija '${ext}' nije na whitelist listi dozvoljenih formata.`)
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error(`Odbijeno: MIME tip '${file.mimetype}' nije dozvoljen.`));
    }

    cb(null, true);
  },
});

export const validateUploadedFileMiddleware: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.file) {
    res.status(400).json({
      success: false,
      error: 'Fajl nije priložen u zahtevu.',
    });
    return;
  }

  const file = req.file;

  if (file.size > MAX_FILE_SIZE_BYTES) {
    res.status(400).json({
      success: false,
      error: `Fajl je prevelik. Maksimalna dozvoljena veličina je 5 MB. Vaš fajl: ${(
        file.size /
        (1024 * 1024)
      ).toFixed(2)} MB`,
    });
    return;
  }

  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    res.status(400).json({
      success: false,
      error: `Nedozvoljena ekstenzija fajla '${ext}'. Dozvoljene: ${ALLOWED_EXTENSIONS.join(', ')}`,
    });
    return;
  }

  const magicCheck = verifyMagicBytes(file.buffer, file.mimetype);
  if (!magicCheck.valid) {
    res.status(422).json({
      success: false,
      error:
        'Sigurnosni alarm: Sadržaj fajla ne odgovara deklarisanom tipu! (Magic Bytes mismatch - Mogući pokušaj RCE/XSS eksploatacije).',
      detectedType: magicCheck.detectedType || 'Nepoznat / Maliciozan bajtni potpis',
    });
    return;
  }

  const secureFilename = generateSecureFilename(file.originalname, file.mimetype);
  (file as Express.Multer.File & { secureFilename?: string }).secureFilename = secureFilename;

  next();
};

export const CloudStorageService = {
  /**
   * Generates a temporary HMAC-signed Presigned Read URL (15 min TTL)
   */
  generatePresignedReadUrl(
    fileKey: string,
    expiresInSeconds: number = 900
  ): { url: string; expiresAt: string } {
    const expiresMs = Date.now() + expiresInSeconds * 1000;
    const token = crypto
      .createHmac('sha256', STORAGE_READ_SECRET)
      .update(`${fileKey}:${expiresMs}`)
      .digest('hex');

    const expiresAtIso = new Date(expiresMs).toISOString();
    const url = `/api/storage/serve/${fileKey}?token=${token}&expires=${expiresMs}`;

    return { url, expiresAt: expiresAtIso };
  },

  /**
   * Verifies a Presigned Read URL's HMAC token and expiration timestamp
   */
  verifyPresignedReadUrl(fileKey: string, token?: string, expires?: string): boolean {
    if (!token || !expires) return false;
    const expiresNum = Number(expires);
    if (isNaN(expiresNum) || Date.now() > expiresNum) {
      return false;
    }

    const expectedToken = crypto
      .createHmac('sha256', STORAGE_READ_SECRET)
      .update(`${fileKey}:${expiresNum}`)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
    } catch {
      return false;
    }
  },

  /**
   * Generates a Presigned Upload URL for direct PUT uploads
   */
  generatePresignedUploadUrl(intendedMimeType: string): {
    uploadUrl: string;
    fileKey: string;
    secureFilename: string;
    expiresAt: string;
  } {
    const secureFilename = generateSecureFilename('upload', intendedMimeType);
    const fileKey = `uploads/protected/${secureFilename}`;
    const expiresInSeconds = 600; // 10 minutes
    const expiresMs = Date.now() + expiresInSeconds * 1000;

    const uploadToken = crypto
      .createHmac('sha256', STORAGE_UPLOAD_SECRET)
      .update(`${secureFilename}:${intendedMimeType}:${expiresMs}`)
      .digest('hex');

    const expiresAt = new Date(expiresMs).toISOString();

    return {
      uploadUrl: `/api/storage/direct-upload/${secureFilename}?token=${uploadToken}&mime=${encodeURIComponent(
        intendedMimeType
      )}&expires=${expiresMs}`,
      fileKey,
      secureFilename,
      expiresAt,
    };
  },

  /**
   * Verifies a Presigned Upload URL's HMAC signature and expiration
   */
  verifyPresignedUploadUrl(
    secureFilename: string,
    mimeType: string,
    token?: string,
    expires?: string
  ): boolean {
    if (!token || !expires || !ALLOWED_MIME_TYPES.has(mimeType)) return false;
    const expiresNum = Number(expires);
    if (isNaN(expiresNum) || Date.now() > expiresNum) {
      return false;
    }

    const expectedToken = crypto
      .createHmac('sha256', STORAGE_UPLOAD_SECRET)
      .update(`${secureFilename}:${mimeType}:${expiresNum}`)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
    } catch {
      return false;
    }
  },

  /**
   * Applies strict security headers when serving stored files
   */
  applyServingSecurityHeaders(res: Response, mimeType: string, filename: string): void {
    res.setHeader('Content-Type', mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const isImage = mimeType.startsWith('image/');
    const dispositionType = isImage ? 'inline' : 'attachment';
    res.setHeader('Content-Disposition', `${dispositionType}; filename="${filename}"`);

    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; script-src 'none'; style-src 'none'; object-src 'none'; sandbox;"
    );
    res.setHeader('Cache-Control', 'private, max-age=900, no-transform');
  },
};

export function getFileUploadSecuritySummary() {
  return {
    maxSizeLimitMB: 5,
    allowedExtensions: ALLOWED_EXTENSIONS,
    allowedMimeTypes: Array.from(ALLOWED_MIME_TYPES),
    magicBytesValidation: 'Omogućeno (Deep Byte Signature Verification)',
    filenameSanitization: 'UUIDv4 Kriptografsko preimenovanje',
    presignedUrlsSupported: true,
    presignedUrlTTLMinutes: 15,
    servingHeaders: {
      contentTypeEnforcement: 'Strict (Client header ignored)',
      mimeSniffingProtection: 'X-Content-Type-Options: nosniff',
      contentDisposition: 'inline za slike, attachment za PDF',
      contentSecurityPolicy: "default-src 'none'; sandbox;",
    },
  };
}
