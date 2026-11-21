// Minimal static file server for local play (Node 22, standard library
// only). Serves game/ on http://localhost:8080 so Night Vault can be
// opened in a desktop browser with no build step and no network.
// Usage: node serve.ts [--port 8080]
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const gameRoot = resolve(fileURLToPath(new URL('./game', import.meta.url)));
const cliArgs = process.argv.slice(2);
const portFlag = cliArgs.indexOf('--port');
const parsedPort = portFlag === -1 ? 8080 : Number(cliArgs[portFlag + 1]);
const listenPort =
  Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort < 65536
    ? parsedPort
    : 8080;

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url ?? '/', 'http://localhost');
  let urlPath: string;
  try {
    urlPath = decodeURIComponent(requestUrl.pathname);
  } catch {
    response.writeHead(400).end('bad request');
    return;
  }
  if (urlPath.endsWith('/')) urlPath += 'index.html';
  const filePath = resolve(join(gameRoot, normalize(urlPath)));
  if (filePath !== gameRoot && !filePath.startsWith(gameRoot + sep)) {
    response.writeHead(403).end('forbidden');
    return;
  }
  let fileSize: number;
  try {
    const stats = statSync(filePath);
    if (!stats.isFile()) throw new Error('not a file');
    fileSize = stats.size;
  } catch {
    response.writeHead(404).end('not found');
    return;
  }
  response.writeHead(200, {
    'content-type':
      CONTENT_TYPES[extname(filePath).toLowerCase()] ??
      'application/octet-stream',
    'content-length': fileSize,
    'cache-control': 'no-store',
  });
  createReadStream(filePath).pipe(response);
});

server.listen(listenPort, '127.0.0.1', () => {
  console.log(`Night Vault: game/ served at http://localhost:${listenPort}`);
});
