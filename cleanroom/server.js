import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { createApp } from './src/app.js';

export function createServer() {
  const app = createApp();
  return http.createServer(app.handler);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const port = Number(process.env.PORT || 8787);
  const host = process.env.HOST || '0.0.0.0';
  const server = createServer();
  server.listen(port, host, () => {
    console.log(`cleanroom mock listening on http://${host}:${port}`);
  });
}
