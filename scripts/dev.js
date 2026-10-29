import { cp, readFile, rm, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { context } from 'esbuild';
import { bundleOptions, prepareOutput } from './build-config.js';

const outputDirectory = resolve('dist');
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

await rm('dist', { recursive: true, force: true });
await cp('public', 'dist', { recursive: true });
await prepareOutput();

const buildContext = await context(bundleOptions);
await buildContext.rebuild();
await buildContext.watch();

const server = createServer(async (request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('Bad request');
    return;
  }

  const filePath = resolve(outputDirectory, `.${pathname}`);
  if (filePath !== outputDirectory && !filePath.startsWith(`${outputDirectory}${sep}`)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const fileInfo = await stat(filePath);
    if (!fileInfo.isFile()) throw Object.assign(new Error('Not a file'), { code: 'ENOENT' });
    response.writeHead(200, { 'Content-Type': contentTypes[extname(filePath)] || 'application/octet-stream' });
    response.end(await readFile(filePath));
  } catch (error) {
    if (error.code !== 'ENOENT' || extname(pathname)) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500).end('Not found');
      return;
    }

    response.writeHead(200, { 'Content-Type': contentTypes['.html'] });
    response.end(await readFile(resolve(outputDirectory, 'index.html')));
  }
});

server.listen(3000, () => {
  console.log('AeroDine is running at http://localhost:3000');
});
