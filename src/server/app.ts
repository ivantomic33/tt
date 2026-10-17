import './env';
import path from 'path';
import fs from 'fs';
import express, { Express, Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import authRouter from './auth/authRouter';
import storageRouter from './storageRouter';
import postsRouter from './routes/postsRouter';
import forumRouter from './routes/forumRouter';
import cmsRouter from './routes/cmsRouter';
import newsletterRouter from './routes/newsletterRouter';
import { strictCorsMiddleware } from './security/corsConfig';
import { globalRateLimiter } from './security/rateLimiter';
import { helmetSecurityMiddleware } from './security/helmetConfig';
import { errorHandlerMiddleware } from './security/errorHandler';

/**
 * Kreira i konfiguriše Express aplikaciju (bez `listen`).
 *
 * Izdvojeno iz `server.ts` kako bi integracioni testovi (supertest) mogli da
 * podignu app in-memory, bez otvaranja mrežnog porta i bez Vite dev servera.
 */
export async function createApp(): Promise<Express> {
  const app = express();

  // Omogući trust proxy za rad iza Cloud Run / reverse proxy okruženja
  app.set('trust proxy', 1);

  // 1. Stroga Helmet konfiguracija (CSP, HSTS, nosniff, frameguard)
  app.use(helmetSecurityMiddleware);

  // 2. Stroga CORS politika (whitelist bez wildcard-a)
  app.use(strictCorsMiddleware);
  app.options('*', strictCorsMiddleware);

  // 3. Body parser (max 1MB) i cookie parser
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // 4. Globalni rate limiting za sve /api rute
  app.use('/api', globalRateLimiter);

  // 5. Rute
  app.use('/api/auth', authRouter);
  app.use('/api/storage', storageRouter);
  app.use('/api/posts', postsRouter);
  app.use('/api/forum', forumRouter);
  app.use('/api/cms', cmsRouter);
  app.use('/api/newsletter', newsletterRouter);

  // 5b. Nepoznata /api ruta -> JSON 404 (umesto Express HTML "Cannot GET" stranice).
  app.use('/api', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: `Ruta ${req.method} ${req.originalUrl} ne postoji.`,
    });
  });

  // 6. Centralizovani error handler za sve /api rute
  app.use('/api', errorHandlerMiddleware);

  // 7. Frontend: Vite u razvoju / statički fajlovi u produkciji.
  //    U test režimu se oba preskaču (testiraju se samo API rute).
  //
  //    NAPOMENA (Vercel): funkcija prima samo `/api/*` (vidi api/index.ts), dok
  //    statiku i SPA deep-linkove servira Vercel CDN iz `dist/`. Zato se ovaj blok
  //    na Vercelu preskače (da ne troši serverless vreme), a ostaje aktivan za
  //    lokalni `npm start` / Render / Cloud Run.
  const isServerlessRuntime = process.env.VERCEL === '1' || Boolean(process.env.VERCEL_ENV);
  const isTest = process.env.NODE_ENV === 'test';

  if (!isTest && !isServerlessRuntime) {
    if (process.env.NODE_ENV === 'production') {
      // Na Vercelu Vite gradi u `dist/`; lokalno u `public/`. Podrži oba.
      const publicDir = path.resolve(process.cwd(), 'public');
      const distDir = path.resolve(process.cwd(), 'dist');
      const staticDir = fs.existsSync(path.join(publicDir, 'index.html')) ? publicDir : distDir;

      app.use(express.static(staticDir));
      app.get(/^\/(?!api(?:\/|$)).*/, (_req, res) => {
        res.sendFile(path.join(staticDir, 'index.html'));
      });
    } else if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    }
  }

  // 8. Fallback globalni error handler
  app.use(errorHandlerMiddleware);

  return app;
}

export default createApp;
