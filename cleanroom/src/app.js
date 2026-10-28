import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Router, sendError } from './router.js';
import { Store } from './store.js';
import { loadToolCatalog } from './tools.js';
import { registerQubeRoutes } from './qube.js';
import { registerQuantFlowRoutes } from './quantflow.js';

const PUBLIC_DIR = fileURLToPath(new URL('../public/', import.meta.url));
const STATIC_FILES = new Map([
  ['/', { file: 'index.html', type: 'text/html; charset=utf-8' }],
  ['/index.html', { file: 'index.html', type: 'text/html; charset=utf-8' }],
  ['/app.js', { file: 'app.js', type: 'text/javascript; charset=utf-8' }],
  ['/styles.css', { file: 'styles.css', type: 'text/css; charset=utf-8' }],
]);

export function createApp() {
  const store = new Store();
  const catalog = loadToolCatalog();
  const router = new Router();
  registerQubeRoutes(router, store, catalog);
  registerQuantFlowRoutes(router, store);

  const handler = async (req, res) => {
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-headers', 'content-type, authorization');
    res.setHeader('access-control-allow-methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    if (await router.handle(req, res)) return;

    let pathname;
    try {
      pathname = new URL(req.url, 'http://localhost').pathname;
    } catch {
      sendError(res, 400, 'invalid url');
      return;
    }
    if (pathname === '/favicon.ico') {
      res.writeHead(204);
      res.end();
      return;
    }
    const entry = STATIC_FILES.get(pathname);
    if (!entry || !['GET', 'HEAD'].includes(req.method)) {
      sendError(res, 404, 'not found');
      return;
    }
    try {
      const body = await readFile(`${PUBLIC_DIR}${entry.file}`);
      res.writeHead(200, {
        'content-type': entry.type,
        'content-length': body.length,
        'cache-control': 'no-store',
      });
      if (req.method === 'HEAD') res.end();
      else res.end(body);
    } catch (error) {
      sendError(res, 500, 'failed to read static file', String(error?.message ?? error));
    }
  };

  return { handler, store };
}
