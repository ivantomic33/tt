import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  // Serverless deploy (Vercel): `server.ts` je serverless funkcija, a statički
  // build se servira preko CDN-a iz posebnog foldera (`dist`) kako se output
  // build-a i izvorni kod funkcije ne bi mešali u istom folderu (`public/`).
  const isServerlessBuild = process.env.VERCEL === '1' || Boolean(process.env.VERCEL_ENV);
  const outDir = isServerlessBuild ? 'dist' : 'public';

  return {
    plugins: [react(), tailwindcss()],
    // Vercel (Express backend) ignoriše `express.static` i servira statiku iz
    // `outputDirectory` preko CDN-a. Lokalno `server.ts` servira iz `public/`.
    // `publicDir` se isključuje da Vite ne bi rekurzivno kopirao sam sebe.
    publicDir: false as const,
    build: {
      outDir,
      emptyOutDir: true,
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, "./src"),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
