import './src/server/env';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Express } from 'express';
import { createApp } from './src/server/app';

// Aplikacija se kreira jednom i kešira po instanci funkcije (Vercel warm start).
let appPromise: Promise<Express> | null = null;

function getApp(): Promise<Express> {
  if (!appPromise) {
    appPromise = createApp();
  }
  return appPromise;
}

/**
 * Vercel Serverless Function handler.
 *
 * Vercel automatski detektuje `server.ts` kao Express backend i prosleđuje mu
 * sve HTTP zahteve (Express je i router i handler). Export `default` je
 * standardni `(req, res)` potpis koji Vercel Node runtime prihvata.
 */
export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const app = await getApp();
  (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}

// Lokalno / Render / Cloud Run: pokreni pravi HTTP server na portu.
// Na Vercelu (`VERCEL === '1'`) se `listen` NE poziva — funkcija se poziva po zahtevu.
if (process.env.VERCEL !== '1') {
  getApp()
    .then((app) => {
      const PORT = Number(process.env.PORT) || 3000;
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`[SECURE API SERVER] Running on http://0.0.0.0:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Failed to start server:', err);
    });
}
