import express, { Router, Request, Response } from 'express';
import {
  uploadMiddleware,
  validateUploadedFileMiddleware,
  CloudStorageService,
  getFileUploadSecuritySummary,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  verifyMagicBytes,
} from './security/fileUploadSecurity';
import { optionalAuth } from './security/authMiddleware';

const router = Router();

interface StoredFileEntry {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  createdAt: number;
}

// Bounded in-memory file store with automatic TTL & LRU eviction (prevents RAM exhaustion)
const MAX_STORED_FILES = 30;
const FILE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const uploadedFilesMap = new Map<string, StoredFileEntry>();

function pruneStoredFiles(): void {
  const now = Date.now();
  for (const [key, entry] of uploadedFilesMap.entries()) {
    if (now - entry.createdAt > FILE_TTL_MS) {
      uploadedFilesMap.delete(key);
    }
  }
  while (uploadedFilesMap.size >= MAX_STORED_FILES) {
    const oldestKey = uploadedFilesMap.keys().next().value;
    if (!oldestKey) break;
    uploadedFilesMap.delete(oldestKey);
  }
}

/**
 * 1. SECURE FILE UPLOAD ENDPOINT
 * POST /api/storage/upload
 */
router.post(
  '/upload',
  optionalAuth,
  uploadMiddleware.single('file'),
  validateUploadedFileMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const file = req.file as (Express.Multer.File & { secureFilename?: string }) | undefined;
      if (!file || !file.secureFilename) {
        res.status(400).json({ success: false, error: 'Fajl nije poslat.' });
        return;
      }

      pruneStoredFiles();

      const secureFilename = file.secureFilename;
      uploadedFilesMap.set(secureFilename, {
        buffer: file.buffer,
        mimeType: file.mimetype,
        originalName: file.originalname,
        createdAt: Date.now(),
      });

      const presignedRead = CloudStorageService.generatePresignedReadUrl(secureFilename, 900);

      res.status(201).json({
        success: true,
        message: 'Fajl je uspešno verificiran (Magic Bytes & MIME Validated) i bezbedno skladišten.',
        fileData: {
          originalName: file.originalname,
          secureFilename,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          sizeFormatted: `${(file.size / 1024).toFixed(1)} KB`,
          presignedReadUrl: presignedRead.url,
          presignedUrlExpiresAt: presignedRead.expiresAt,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Greška pri skladištenju fajla.';
      res.status(500).json({ success: false, error: msg });
    }
  }
);

/**
 * 2. PRESIGNED UPLOAD URL GENERATION
 * POST /api/storage/presigned-upload-url
 */
router.post('/presigned-upload-url', optionalAuth, (req: Request, res: Response): void => {
  try {
    const { mimeType } = req.body || {};
    if (!mimeType || typeof mimeType !== 'string') {
      res.status(400).json({ success: false, error: 'MIME tip fajla je obavezno polje.' });
      return;
    }

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      res.status(422).json({
        success: false,
        error: `Nedozvoljen MIME tip '${mimeType}'.`,
      });
      return;
    }

    const presignedUpload = CloudStorageService.generatePresignedUploadUrl(mimeType);

    res.json({
      success: true,
      uploadConfig: presignedUpload,
      instruction: 'Pošaljite PUT zahtev sa bajtovima fajla direktno na uploadUrl.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Greška pri generisanju presigned upload URL-a.';
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * 2b. DIRECT UPLOAD TARGET FOR PRESIGNED PUT URLS
 * PUT /api/storage/direct-upload/:fileKey
 */
router.put(
  '/direct-upload/:fileKey',
  express.raw({ type: '*/*', limit: '5mb' }),
  (req: Request, res: Response): void => {
    try {
      const { fileKey } = req.params;
      const token = typeof req.query.token === 'string' ? req.query.token : undefined;
      const mime = typeof req.query.mime === 'string' ? req.query.mime : undefined;
      const expires = typeof req.query.expires === 'string' ? req.query.expires : undefined;

      if (!mime || !CloudStorageService.verifyPresignedUploadUrl(fileKey, mime, token, expires)) {
        res.status(403).json({
          success: false,
          error: 'Potpisani URL za upload je nevažeći ili je istekao.',
        });
        return;
      }

      const buffer = Buffer.isBuffer(req.body) ? req.body : null;
      if (!buffer || buffer.length === 0 || buffer.length > MAX_FILE_SIZE_BYTES) {
        res.status(400).json({
          success: false,
          error: 'Neispravan ili prevelik binarni payload fajla.',
        });
        return;
      }

      const magicCheck = verifyMagicBytes(buffer, mime);
      if (!magicCheck.valid) {
        res.status(422).json({
          success: false,
          error: 'Sigurnosni alarm: Magic Bytes potpis ne odgovara deklarisanom MIME tipu.',
        });
        return;
      }

      pruneStoredFiles();
      uploadedFilesMap.set(fileKey, {
        buffer,
        mimeType: mime,
        originalName: fileKey,
        createdAt: Date.now(),
      });

      const presignedRead = CloudStorageService.generatePresignedReadUrl(fileKey, 900);
      res.status(201).json({
        success: true,
        secureFilename: fileKey,
        presignedReadUrl: presignedRead.url,
        presignedUrlExpiresAt: presignedRead.expiresAt,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Greška pri direktnom upload-u.';
      res.status(500).json({ success: false, error: msg });
    }
  }
);

/**
 * 3. SAFE FILE SERVING WITH HMAC SIGNATURE & EXPIRATION VERIFICATION
 * GET /api/storage/serve/:fileKey
 */
router.get('/serve/:fileKey', (req: Request, res: Response): void => {
  try {
    pruneStoredFiles();
    const { fileKey } = req.params;
    const token = typeof req.query.token === 'string' ? req.query.token : undefined;
    const expires = typeof req.query.expires === 'string' ? req.query.expires : undefined;

    // Verify presigned URL signature & expiration if token parameters are provided
    if (token || expires) {
      const isValidSignature = CloudStorageService.verifyPresignedReadUrl(fileKey, token, expires);
      if (!isValidSignature) {
        res.status(403).json({
          success: false,
          error: 'Pristup odbijen: Potpisani URL (Presigned URL) je istekao ili ima nevažeći HMAC potpis.',
        });
        return;
      }
    }

    const fileData = uploadedFilesMap.get(fileKey);

    if (!fileData) {
      res.status(404).json({
        success: false,
        error: 'Traženi fajl nije pronađen ili je potpisani URL istekao.',
      });
      return;
    }

    CloudStorageService.applyServingSecurityHeaders(res, fileData.mimeType, fileKey);
    res.send(fileData.buffer);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Greška pri serviranju fajla.';
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * 4. UPLOAD SECURITY METRICS
 * GET /api/storage/audit
 */
router.get('/audit', (_req: Request, res: Response): void => {
  res.json({
    success: true,
    storageAudit: getFileUploadSecuritySummary(),
  });
});

export default router;
