/**
 * Vercel Serverless Function entrypoint.
 *
 * Vercel automatski pretvara svaki fajl u `api/` folderu u serverless funkciju.
 * Ovaj fajl izlaže postojeći Express app (`createApp`) i to je JEDINI način da
 * backend i statički Vite frontend koegzistiraju u istom projektu:
 *
 *   - `/api/*`  -> ova funkcija (Express)
 *   - sve ostalo -> statički `dist/` preko CDN-a (SPA fallback rešava Vercel)
 *
 * Razlog zašto NE koristimo `"framework": "express"` + `functions["server.ts"]`:
 * Express builder tada pokušava da kompajlira backend i traži entrypoint u
 * `outputDirectory` (npr. `dist/index.js`). Pošto `dist/` sadrži frontend build,
 * deploy pada sa `[BUILD_FAILED] No entrypoint found in output directory: "dist"`.
 */

import { createApp } from '../src/server/app';
import type { Express } from 'express';
import type { IncomingMessage, ServerResponse } from 'http';

// Aplikacija se kreira jednom i kešira po instanci funkcije (Fluid compute warm start).
let appPromise: Promise<Express> | null = null;

function getApp(): Promise<Express> {
  if (!appPromise) {
    appPromise = createApp();
  }
  return appPromise;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const app = await getApp();
  (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}
