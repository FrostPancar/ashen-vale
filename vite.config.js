import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VIEWER = '/tools/sprite-viewer/';

/** Paths that should 301 to the canonical sprite viewer URL. */
const REDIRECTS = new Map([
  ['/sprite-viewer', VIEWER],
  ['/sprite-viewer/', VIEWER],
  ['/tools/sprite-viewer', VIEWER],
]);

function spriteViewerRedirects() {
  const handler = (req, res, next) => {
    const url = req.url ?? '';
    const pathname = url.split('?')[0];
    const qs = url.includes('?') ? url.slice(url.indexOf('?')) : '';
    const target = REDIRECTS.get(pathname);
    if (target) {
      res.writeHead(301, { Location: target + qs });
      res.end();
      return;
    }
    next();
  };
  return {
    name: 'sprite-viewer-redirects',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig({
  appType: 'mpa',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [spriteViewerRedirects()],
  // Honor a PORT env var (e.g. from preview tooling); falls back to Vite's default.
  server: process.env.PORT ? { port: Number(process.env.PORT), strictPort: true } : undefined,
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        spriteViewer: 'tools/sprite-viewer/index.html',
        spriteViewerRedirect: 'sprite-viewer.html',
        spriteViewerAlias: 'sprite-viewer/index.html',
      },
    },
  },
});
