import { spawn, type ChildProcess } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ScanEvent } from '../shared/types';

const PORT = 5199;
const BASE = `http://127.0.0.1:${PORT}`;
let server: ChildProcess;

async function waitForHealth(timeoutMs = 30_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('Server did not start');
}

async function scan(body: object): Promise<ScanEvent[]> {
  const res = await fetch(`${BASE}/api/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  expect(res.status).toBe(200);
  expect(res.headers.get('content-type')).toContain('application/x-ndjson');
  const text = await res.text();
  return text
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as ScanEvent);
}

describe('HTTP API', () => {
  beforeAll(async () => {
    server = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], {
      env: { ...process.env, PORT: String(PORT), ALLOW_PRIVATE_URLS: '' },
      stdio: 'ignore',
    });
    await waitForHealth();
  });

  afterAll(() => {
    server?.kill();
  });

  it('sets security headers', async () => {
    const res = await fetch(`${BASE}/api/health`);
    expect(res.headers.get('content-security-policy')).toContain("default-src 'self'");
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-powered-by')).toBeNull();
  });

  it('rejects private network URLs (SSRF)', async () => {
    const res = await fetch(`${BASE}/api/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'http://169.254.169.254/latest/meta-data', level: 'AA' }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/private/);
  });

  it('validates the request body', async () => {
    const bad = [{ level: 'AA' }, { url: 'https://example.com', html: '<p>', level: 'AA' }, { url: 'https://example.com', level: 'A' }];
    for (const body of bad) {
      const res = await fetch(`${BASE}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      expect(res.status).toBe(400);
    }
    const malformed = await fetch(`${BASE}/api/scan`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{oops' });
    expect(malformed.status).toBe(400);
  });

  it('streams progress and a result for pasted HTML', async () => {
    const events = await scan({ html: '<html><body><img src="x.png"><button></button></body></html>', level: 'AAA' });
    expect(events.filter((e) => e.type === 'progress').length).toBe(6);
    const result = events.find((e) => e.type === 'result');
    expect(result?.type).toBe('result');
    if (result?.type !== 'result') return;
    const rules = result.result.issues.map((i) => i.ruleId);
    expect(rules).toContain('image-alt');
    expect(rules).toContain('button-name');
    expect(rules).toContain('html-has-lang');
    expect(result.result.level).toBe('AAA');
  });

  it.runIf(process.env.E2E_ONLINE === '1')('scans a live public URL', async () => {
    const events = await scan({ url: 'https://example.com', level: 'AA' });
    const result = events.find((e) => e.type === 'result');
    if (result?.type !== 'result') throw new Error(JSON.stringify(events.at(-1)));
    expect(result.result.performance.metricsAvailable).toBe(true);
    expect(result.result.performance.metrics.ttfb).not.toBeNull();
    expect(result.result.structure.title).not.toBe('');
    expect(result.result.structure.ariaSnapshot.length).toBeGreaterThan(0);
    expect(result.result.screenshot).toBeDefined();
  });
});
