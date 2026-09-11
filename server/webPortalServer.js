/**
 * Mu Manager PRO - Servidor Web Seguro & Portal de Distribución
 * Sirve la web oficial con headers de seguridad y soporte para streaming de APK.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
// Fuente única de verdad para archivos estáticos del portal
const WEBSITE_DIR = fs.existsSync(path.join(__dirname, '..', 'website'))
  ? path.join(__dirname, '..', 'website')
  : path.join(__dirname, 'website');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.apk': 'application/vnd.android.package-archive',
  '.zip': 'application/zip',
  '.txt': 'text/plain; charset=utf-8'
};

// Rate Limiting para descargas de APK: Máximo 10 solicitudes iniciales por IP cada 60 segundos
const downloadRateLimits = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;

// Limpieza periódica de mapa de rate limit cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of downloadRateLimits.entries()) {
    if (now - record.startTime > RATE_LIMIT_WINDOW_MS) {
      downloadRateLimits.delete(ip);
    }
  }
}, 5 * 60 * 1000);

function checkDownloadRateLimit(ip) {
  const now = Date.now();
  const record = downloadRateLimits.get(ip);
  if (!record || (now - record.startTime > RATE_LIMIT_WINDOW_MS)) {
    downloadRateLimits.set(ip, { startTime: now, count: 1 });
    return { allowed: true };
  }
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.ceil((record.startTime + RATE_LIMIT_WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfter };
  }
  record.count++;
  return { allowed: true };
}

const server = http.createServer((req, res) => {
  // Headers de Seguridad HTTP Avanzados (Hardening)
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; font-src 'self' data: https:; img-src 'self' data: https:; connect-src 'self' http://localhost:* https://*; frame-ancestors 'self';");

  let safeUrl = req.url.split('?')[0];

  // Redirección 302 automática al Panel de Control para atajo secreto (Ctrl + Shift + A / 7 clics)
  if (safeUrl === '/admin' || safeUrl === '/admin/') {
    const adminPanelUrl = process.env.ADMIN_PANEL_URL || 'http://localhost:3001/admin';
    res.writeHead(302, {
      'Location': adminPanelUrl,
      'Content-Type': 'text/plain; charset=utf-8'
    });
    res.end(`Redirigiendo al panel de control en ${adminPanelUrl}...`);
    return;
  }

  if (safeUrl === '/' || safeUrl === '') {
    safeUrl = '/index.html';
  } else if (safeUrl.startsWith('/download/')) {
    safeUrl = '/downloads/' + safeUrl.substring('/download/'.length);
  }

  // Redirección Inteligente a GitHub Releases para descargas de APK (0% ancho de banda)
  if (safeUrl.toLowerCase().endsWith('.apk') && !req.url.includes('local=1')) {
    const GITHUB_URL = process.env.GITHUB_RELEASE_DOWNLOAD_URL || 'https://github.com/eliaacjaziel/MuManagerPro-Gateway/releases/latest/download/MuManagerPro.apk';
    res.writeHead(302, {
      'Location': GITHUB_URL,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Content-Type': 'text/plain; charset=utf-8'
    });
    res.end('Redirigiendo a descarga de alta velocidad en GitHub Releases...');
    return;
  }

  // Rate Limiting en descargas directas de binarios .apk (ignora sub-rangos RFC 7233 de descarga en curso)
  if (safeUrl.toLowerCase().startsWith('/downloads/') && safeUrl.toLowerCase().endsWith('.apk') && !req.headers.range) {
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
    const rateCheck = checkDownloadRateLimit(clientIp);
    if (!rateCheck.allowed) {
      res.writeHead(429, {
        'Content-Type': 'application/json; charset=utf-8',
        'Retry-After': String(rateCheck.retryAfter || 60)
      });
      res.end(JSON.stringify({
        error: 'Too Many Requests',
        message: `Límite de descargas simultáneas excedido para esta IP. Por favor espera ${rateCheck.retryAfter || 60} segundos antes de intentar nuevamente.`
      }));
      return;
    }
  }

  // Prevenir Directory Traversal con resolución canónica
  const canonicalBase = path.resolve(WEBSITE_DIR);
  const normalizedRel = path.normalize(safeUrl).replace(/^(\.\.[\/\\])+/, '').replace(/^[\\\/]+/, '');
  const filePath = path.resolve(canonicalBase, normalizedRel);

  // Asegurar que la ruta resuelta permanezca estrictamente dentro de WEBSITE_DIR
  if (!filePath.toLowerCase().startsWith(canonicalBase.toLowerCase())) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 - Acceso Denegado');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 - Archivo No Encontrado');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Soporte para Range Requests RFC 7233 (Reanudación de descarga de APK/ZIP)
    const range = req.headers.range;
    if (range && (ext === '.apk' || ext === '.zip')) {
      const match = /^bytes=(?:(\d+)-(\d+)?|-(\d+))$/.exec(range.trim());
      if (!match) {
        res.writeHead(416, {
          'Content-Range': `bytes */${stats.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Type': 'text/plain; charset=utf-8'
        });
        res.end('416 Range Not Satisfiable');
        return;
      }

      let start, end;
      if (match[3] !== undefined) {
        // Suffix byte range: bytes=-N
        const suffix = parseInt(match[3], 10);
        if (suffix === 0) {
          res.writeHead(416, {
            'Content-Range': `bytes */${stats.size}`,
            'Accept-Ranges': 'bytes',
            'Content-Type': 'text/plain; charset=utf-8'
          });
          res.end('416 Range Not Satisfiable');
          return;
        }
        start = Math.max(0, stats.size - suffix);
        end = stats.size - 1;
      } else {
        start = parseInt(match[1], 10);
        end = match[2] !== undefined ? parseInt(match[2], 10) : stats.size - 1;
      }

      if (isNaN(start) || isNaN(end) || start > end || start >= stats.size) {
        res.writeHead(416, {
          'Content-Range': `bytes */${stats.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Type': 'text/plain; charset=utf-8'
        });
        res.end('416 Range Not Satisfiable');
        return;
      }

      if (end >= stats.size) {
        end = stats.size - 1;
      }

      const chunkSize = (end - start) + 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${path.basename(filePath)}"`
      });

      const fileStream = fs.createReadStream(filePath, { start, end });
      fileStream.pipe(res);
    } else {
      const headers = {
        'Content-Type': contentType,
        'Content-Length': stats.size,
        'Accept-Ranges': 'bytes'
      };

      if (ext === '.apk' || ext === '.zip') {
        headers['Content-Disposition'] = `attachment; filename="${path.basename(filePath)}"`;
      }

      res.writeHead(200, headers);
      fs.createReadStream(filePath).pipe(res);
    }
  });
});

server.listen(PORT, () => {
  console.log('================================================================');
  console.log(`🚀 Portal Web Mu Manager PRO disponible en:`);
  console.log(`   Local:     http://localhost:${PORT}`);
  console.log(`   Descargas: http://localhost:${PORT}/downloads/MuManagerPro-v1.1.2.apk`);
  console.log('================================================================');
});
