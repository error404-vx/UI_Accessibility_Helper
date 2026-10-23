import express, { type NextFunction, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ScanEvent, ScanRequest } from '../shared/types';
import { UrlGuardError, validateScanUrl } from './security/urlGuard';
import { closeBrowser, runScan, ScanError } from './scan/runner';

const PORT = Number(process.env.PORT ?? 5174);
const HOST = process.env.HOST ?? '127.0.0.1';
const MAX_HTML_LENGTH = 1_000_000;
const MAX_CONCURRENT_SCANS = Number(process.env.MAX_CONCURRENT_SCANS ?? 2);

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  );
  next();
});

const scanLimiter = rateLimit({
  windowMs: 60_000,
  limit: Number(process.env.SCAN_RATE_LIMIT ?? 20),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many scans. Please wait a minute and try again.' },
});

let activeScans = 0;

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, activeScans });
});

function parseRequest(body: unknown): ScanRequest {
  if (!body || typeof body !== 'object') throw new UrlGuardError('Invalid request body.');
  const { url, html, level } = body as Record<string, unknown>;
  if (level !== 'AA' && level !== 'AAA') throw new UrlGuardError('level must be "AA" or "AAA".');
  const hasUrl = typeof url === 'string' && url.trim() !== '';
  const hasHtml = typeof html === 'string' && html.trim() !== '';
  if (hasUrl === hasHtml) throw new UrlGuardError('Provide either a URL or HTML to scan.');
  if (hasHtml && (html as string).length > MAX_HTML_LENGTH) throw new UrlGuardError('The HTML is too large (max 1 MB).');
  return hasUrl ? { url: (url as string).trim(), level } : { html: html as string, level };
}

app.post('/api/scan', scanLimiter, async (req: Request, res: Response) => {
  let scanRequest: ScanRequest;
  try {
    scanRequest = parseRequest(req.body);
    if (scanRequest.url) scanRequest.url = (await validateScanUrl(scanRequest.url)).toString();
  } catch (err) {
    const message = err instanceof UrlGuardError ? err.message : 'Invalid request.';
    res.status(400).json({ error: message });
    return;
  }

  if (activeScans >= MAX_CONCURRENT_SCANS) {
    res.status(503).json({ error: 'The scanner is busy. Please try again in a few seconds.' });
    return;
  }

  activeScans += 1;
  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableFinished) controller.abort();
  });

  res.status(200);
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.flushHeaders();
  const send = (event: ScanEvent) => {
    if (!res.writableEnded) res.write(JSON.stringify(event) + '\n');
  };

  try {
    const result = await runScan(scanRequest, (stage, message) => send({ type: 'progress', stage, message }), controller.signal);
    send({ type: 'result', result });
  } catch (err) {
    const message = err instanceof ScanError ? err.message : 'The scan failed unexpectedly. The page may be too slow or blocking automated browsers.';
    if (!(err instanceof ScanError)) console.error('[scan] unexpected error:', err);
    send({ type: 'error', message });
  } finally {
    activeScans -= 1;
    res.end();
  }
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (existsSync(distDir)) {
  app.use(express.static(distDir, { index: false, maxAge: '1h' }));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status = (err as { status?: number }).status;
  if (status === 400 || status === 413) {
    res.status(status).json({ error: status === 413 ? 'Request too large.' : 'Malformed request.' });
    return;
  }
  console.error('[server] error:', err);
  if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(PORT, HOST, () => {
  const ui = existsSync(distDir) ? `UI + API on http://${HOST}:${PORT}` : `API on http://${HOST}:${PORT} (run "npm run dev" for the UI)`;
  console.log(`[server] ${ui}`);
});

async function shutdown() {
  server.close();
  await closeBrowser();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
