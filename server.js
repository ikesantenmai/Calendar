/* Render の Web Service など、Node で配信する場合の静的ファイルサーバー。
 * 依存パッケージなし。PORT は環境変数から受け取る。
 * 静的サイト（Static Site）として公開する場合、このファイルは使わない。 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const dns = require('dns').promises;
const net = require('net');

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

/* ---- 公開カレンダー(.ics)の中継 ----
 * iCloud などの配信元は Access-Control-Allow-Origin を返さないため、
 * ブラウザから直接は取得できない。ここで取り寄せて返す。
 * ICS_PROXY=off で無効化、ICS_PROXY_ALLOW=host1,host2 で配信元を追加できる。 */
const PROXY_ON = String(process.env.ICS_PROXY || 'on').toLowerCase() !== 'off';
const ALLOW_HOSTS = [
  'icloud.com', 'apple.com',
  'google.com', 'googleusercontent.com',
  'outlook.com', 'office365.com', 'office.com', 'live.com',
  'yahoo.com', 'yahoo.co.jp',
  'calendar.yahoo.co.jp'
].concat(
  String(process.env.ICS_PROXY_ALLOW || '')
    .split(',').map((h) => h.trim().toLowerCase()).filter(Boolean)
);
const MAX_ICS_BYTES = 8 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15000;

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

  const parsed = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  if (parsed.pathname === '/api/ics') {
    return handleIcsProxy(req, res, parsed.searchParams.get('url'));
  }

  const pathname = decodeURIComponent(parsed.pathname);
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
      /* 画面の更新が確実に届くよう、HTML と JS/CSS は毎回確認させる */
      'Cache-Control': /\.(html|js|css|json)$/.test(ext)
        ? 'no-cache'
        : 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff'
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  }
});

function sendJson(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(text),
    'Cache-Control': 'no-store'
  });
  res.end(text);
}

function hostAllowed(host) {
  const h = String(host).toLowerCase();
  return ALLOW_HOSTS.some((d) => h === d || h.endsWith('.' + d));
}

/* 社内ネットワークや自分自身への踏み台にされないようにする */
function isPrivateAddress(ip) {
  if (net.isIPv4(ip)) {
    const p = ip.split('.').map(Number);
    return p[0] === 0 || p[0] === 10 || p[0] === 127 ||
      (p[0] === 169 && p[1] === 254) ||
      (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
      (p[0] === 192 && p[1] === 168) ||
      (p[0] === 100 && p[1] >= 64 && p[1] <= 127) ||
      p[0] >= 224;
  }
  const v = ip.toLowerCase();
  return v === '::' || v === '::1' || v.startsWith('fc') || v.startsWith('fd') ||
    v.startsWith('fe80') || v.startsWith('::ffff:');
}

async function handleIcsProxy(req, res, raw) {
  if (!PROXY_ON) return sendJson(res, 404, { error: 'disabled' });
  if (!raw) return sendJson(res, 400, { error: 'missing_url' });

  let target;
  try {
    target = new URL(String(raw).replace(/^webcal:\/\//i, 'https://'));
  } catch (e) {
    return sendJson(res, 400, { error: 'bad_url' });
  }
  if (target.protocol !== 'https:' && target.protocol !== 'http:') {
    return sendJson(res, 400, { error: 'bad_scheme' });
  }
  if (!hostAllowed(target.hostname)) {
    return sendJson(res, 403, { error: 'host_not_allowed', host: target.hostname });
  }

  try {
    const addrs = await dns.lookup(target.hostname, { all: true });
    if (!addrs.length || addrs.some((a) => isPrivateAddress(a.address))) {
      return sendJson(res, 403, { error: 'blocked_address' });
    }
  } catch (e) {
    return sendJson(res, 502, { error: 'dns_failed', detail: e.message });
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const upstream = await fetch(target.href, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'User-Agent': 'calendar-web-app', Accept: 'text/calendar, text/plain, */*' }
    });
    if (!upstream.ok) {
      return sendJson(res, 502, { error: 'upstream_status', status: upstream.status });
    }

    /* 大きすぎる応答で詰まらないよう、読みながら上限で打ち切る */
    const chunks = [];
    let size = 0;
    for await (const chunk of upstream.body) {
      size += chunk.length;
      if (size > MAX_ICS_BYTES) return sendJson(res, 413, { error: 'too_large' });
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);
    if (!/BEGIN:VCALENDAR/i.test(body.slice(0, 4096).toString('utf8'))) {
      return sendJson(res, 415, { error: 'not_icalendar' });
    }

    res.writeHead(200, {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Length': body.length,
      'Cache-Control': 'no-store'
    });
    res.end(body);
  } catch (e) {
    const aborted = e.name === 'AbortError';
    sendJson(res, 504, { error: aborted ? 'timeout' : 'fetch_failed', detail: e.message });
  } finally {
    clearTimeout(timer);
  }
}

server.listen(PORT, HOST, () => {
  console.log(`Calendar app listening on http://${HOST}:${PORT}`);
});
