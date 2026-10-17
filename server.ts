import './src/server/env';
import type { Express } from 'express';
import { createApp } from './src/server/app';

/**
 * Lokalni razvojni / tradicionalni Node server (npm run dev, npm start).
 *
 * VAŽNO: Ovaj fajl NE izvozi `default` handler namerno.
 *
 * Vercel na osnovu imena fajla (`server.ts`) zaključuje da je projekat
 * „Express backend" i tada pokušava da kompajlira backend u `outputDirectory`
 * (`dist/`). Pošto `dist/` sadrži Vite frontend build, deploy pada sa:
 *   [BUILD_FAILED] No entrypoint found in output directory: "dist"
 *
 * Zato je serverless entrypoint izdvojen u `api/index.ts`, a statika se
 * servira preko CDN-a iz `dist/`.
 */

// Aplikacija se kreira jednom i kešira (warm start).
let appPromise: Promise<Express> | null = null;

function getApp(): Promise<Express> {
  if (!appPromise) {
    appPromise = createApp();
  }
  return appPromise;
}

// Na Vercelu se `listen` NE poziva (funkcija se poziva po zahtevu).
const IS_SERVERLESS = process.env.VERCEL === '1' || Boolean(process.env.VERCEL_ENV);

if (!IS_SERVERLESS) {
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
