
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const port = process.env.PORT || 5173;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let pathname;

  try {
    pathname = decodeURIComponent(
      new URL(req.url, `http://${req.headers.host}`).pathname
    );
  } catch {
    res.writeHead(400);
    res.end('Bad request');
    return;
  }

  if (pathname === '/') pathname = '/index.html';

  const filePath = path.resolve(root, '.' + pathname);

  if (!filePath.startsWith(root + path.sep)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(err.code === 'ENOENT' ? 404 : 500);
      res.end(err.code === 'ENOENT' ? 'File not found' : 'Server error');
      return;
    }

    res.writeHead(200, {
      'Content-Type':
        mimeTypes[path.extname(filePath).toLowerCase()] ||
        'application/octet-stream',
      'Cache-Control': 'no-cache'
    });

    res.end(data);
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`OS Performance Analyzer running on port ${port}`);
});