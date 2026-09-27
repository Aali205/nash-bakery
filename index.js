// Tiny zero-dependency static server: `npm start` → http://localhost:5173
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = process.env.PORT || 5173;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    let file = path.normalize(path.join(root, urlPath));
    if (!file.startsWith(root)) return res.writeHead(403).end();
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    fs.stat(file, (err, stat) => {
      if (err || !stat.isFile()) return res.writeHead(404).end('Not found');
      const type = types[path.extname(file)] || 'application/octet-stream';
      // Byte ranges, so browsers can stream and loop video like on GitHub Pages
      const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
      if (m && (m[1] || m[2])) {
        const start = m[1] ? Number(m[1]) : Math.max(0, stat.size - Number(m[2]));
        const end = m[1] && m[2] ? Math.min(Number(m[2]), stat.size - 1) : stat.size - 1;
        if (start > end || start >= stat.size) {
          return res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` }).end();
        }
        res.writeHead(206, {
          'Content-Type': type, 'Accept-Ranges': 'bytes',
          'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Content-Length': end - start + 1,
        });
        if (req.method === 'HEAD') return res.end();
        return fs.createReadStream(file, { start, end }).pipe(res);
      }
      res.writeHead(200, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': stat.size });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(file).pipe(res);
    });
  })
  .listen(port, () => console.log(`NASH ☕  http://localhost:${port}`));
