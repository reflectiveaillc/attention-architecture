// LOOP collector — tiny static server for web/site + event sink.
// Events arrive as JSON via POST /e (navigator.sendBeacon) and are appended
// as JSON lines to the configured file. Local-only; nothing external.
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SITE_DIR = path.join(ROOT, 'web', 'site');

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml'
};

export function startCollector({ port = 0, eventsFile, host = '127.0.0.1', https: useHttps = false }) {
  if (eventsFile) fs.mkdirSync(path.dirname(eventsFile), { recursive: true });
  const handler = (req, res) => {
    if (req.method === 'POST' && req.url.startsWith('/e')) {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        if (eventsFile && body.trim()) fs.appendFileSync(eventsFile, body.trim() + '\n');
        res.writeHead(204, { 'Access-Control-Allow-Origin': '*' });
        res.end();
      });
      return;
    }
    // static site
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath.endsWith('/')) urlPath += 'index.html';
    const file = path.join(SITE_DIR, path.normalize(urlPath));
    if (!file.startsWith(SITE_DIR) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404); res.end('not found'); return;
    }
    const type = MIME[path.extname(file)] || 'application/octet-stream';
    const size = fs.statSync(file).size;
    // iOS Safari refuses to play <video> without byte-range (206) support
    const range = req.headers.range && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    if (range) {
      const start = range[1] ? parseInt(range[1], 10) : 0;
      const end = range[2] ? Math.min(parseInt(range[2], 10), size - 1) : size - 1;
      if (start >= size || start > end) {
        res.writeHead(416, { 'Content-Range': `bytes */${size}` }); res.end(); return;
      }
      res.writeHead(206, {
        'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache',
        'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1
      });
      fs.createReadStream(file, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': size, 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  };
  let server;
  const certDir = path.join(ROOT, 'engine', 'state', 'certs');
  if (useHttps && fs.existsSync(path.join(certDir, 'cert.pem'))) {
    server = https.createServer({ key: fs.readFileSync(path.join(certDir, 'key.pem')), cert: fs.readFileSync(path.join(certDir, 'cert.pem')) }, handler);
  } else {
    server = http.createServer(handler);
  }
  const scheme = (useHttps && fs.existsSync(path.join(certDir, 'cert.pem'))) ? 'https' : 'http';
  return new Promise((resolve) => {
    server.listen(port, host, () => {
      resolve({ server, port: server.address().port, url: `${scheme}://127.0.0.1:${server.address().port}`, scheme });
    });
  });
}

// `node engine/lib/collector.mjs serve` → preview the site locally
// (guard on the entry script — this block must NOT fire when imported by loop.mjs)
import { pathToFileURL } from 'node:url';
if (process.argv[2] === 'serve' && process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const eventsFile = path.join(ROOT, 'engine', 'state', 'events', 'dev.jsonl');
  const { url } = await startCollector({ port: 4620, eventsFile });
  console.log(`DIR: ${ROOT}`);
  console.log(`site:   ${url}/`);
  console.log(`game:   ${url}/games/stack-rush/`);
  console.log(`events: ${eventsFile}`);
}
