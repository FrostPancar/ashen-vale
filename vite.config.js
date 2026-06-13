import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import { generatePixelArt } from './tools/pixel-generator/api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VIEWER = '/tools/sprite-viewer/';

/** Paths that should 301 to the canonical sprite viewer URL. */
const REDIRECTS = new Map([
  ['/sprite-viewer', VIEWER],
  ['/sprite-viewer/', VIEWER],
  ['/tools/sprite-viewer', VIEWER],
]);

function pixelArtApi() {
  const handler = async (req, res, next) => {
    const url = req.url?.split('?')[0] ?? '';
    if (url !== '/api/pixel-art/generate') return next();
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return;
    }
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const result = await generatePixelArt(payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message || 'Generation failed' }));
      }
    });
  };
  return {
    name: 'pixel-art-api',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  if (env.CURSOR_API_KEY && !process.env.CURSOR_API_KEY) {
    process.env.CURSOR_API_KEY = env.CURSOR_API_KEY;
  }

  return {
  appType: 'mpa',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [pixelArtApi(), spriteViewerRedirects()],
  // Honor a PORT env var (e.g. from preview tooling); falls back to Vite's default.
  server: process.env.PORT ? { port: Number(process.env.PORT), strictPort: true } : undefined,
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        spriteViewer: 'tools/sprite-viewer/index.html',
        pixelGenerator: 'tools/pixel-generator/index.html',
        spriteViewerRedirect: 'sprite-viewer.html',
        spriteViewerAlias: 'sprite-viewer/index.html',
      },
    },
  },
};
});
