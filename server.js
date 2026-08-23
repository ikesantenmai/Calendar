/* Render の Web Service など、Node で配信する場合の静的ファイルサーバー。
 * 依存パッケージなし。PORT は環境変数から受け取る。
 * 静的サイト（Static Site）として公開する場合、このファイルは使わない。 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ics': 'text/calendar; charset=utf-8',
  '.webmanifest': 'application/manifest+json'
};

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end('Method Not Allowed');
  }

  const pathname = decodeURIComponent(url.parse(req.url).pathname);
  const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const file = path.resolve(ROOT, rel);

  /* ルート外へのアクセスを防ぐ */
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(file, (err, stat) => {
    /* ディレクトリなら、その中の index.html を返す（/en/ → /en/index.html） */
    if (!err && stat.isDirectory()) return send(path.join(file, 'index.html'));
    if (err || !stat.isFile()) return notFound();
    send(file, stat);
  });

  function notFound() {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  }

  function send(file, known) {
    if (!known) {
      return fs.stat(file, (err, stat) => {
        if (err || !stat.isFile()) return notFound();
        send(file, stat);
      });
    }
    const stat = known;
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff'
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Calendar app listening on http://${HOST}:${PORT}`);
});
