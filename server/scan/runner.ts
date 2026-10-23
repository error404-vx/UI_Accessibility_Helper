import { randomUUID } from 'node:crypto';
import { chromium, type Browser, type Page } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import type { ScanRequest, ScanResult, ScanStage, Screenshot } from '../../shared/types';
import { emptyCounts } from '../../shared/categories';
import { computeScore } from '../../shared/scoring';
import { isHostAllowed } from '../security/urlGuard';
import { boxesScript, PAGE_SIZE_SCRIPT, PERF_COLLECT_SCRIPT, PERF_INIT_SCRIPT, STRUCTURE_SCRIPT } from './browserScripts';
import { normalizeViolations, type AxeRuleResult } from './normalize';
import { analyzeStructure, type RawStructure } from './structure';
import { analyzePerf, type RawPerf } from './perf';
import { walkKeyboard } from './keyboard';

const VIEWPORT = { width: 1280, height: 800 };
const MAX_SCREENSHOT_HEIGHT = 6000;
const NAV_TIMEOUT = 30_000;

export class ScanError extends Error {}

let browserPromise: Promise<Browser> | null = null;

function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch({ headless: true }).catch((err) => {
      browserPromise = null;
      throw err;
    });
  }
  return browserPromise;
}

export async function closeBrowser(): Promise<void> {
  if (!browserPromise) return;
  const browser = await browserPromise.catch(() => null);
  browserPromise = null;
  await browser?.close();
}

type ProgressFn = (stage: ScanStage, message: string) => void;

function checkAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new ScanError('Scan cancelled.');
}

async function captureScreenshot(page: Page): Promise<Screenshot | undefined> {
  try {
    const size = (await page.evaluate(PAGE_SIZE_SCRIPT)) as { width: number; height: number };
    const height = Math.max(1, Math.min(size.height, MAX_SCREENSHOT_HEIGHT));
    const buffer = await page.screenshot({
      fullPage: true,
      clip: { x: 0, y: 0, width: VIEWPORT.width, height },
      type: 'jpeg',
      quality: 60,
      animations: 'disabled',
      timeout: 15_000,
    });
    return { dataUrl: `data:image/jpeg;base64,${buffer.toString('base64')}`, width: VIEWPORT.width, height };
  } catch {
    return undefined;
  }
}

export async function runScan(request: ScanRequest, onProgress: ProgressFn, signal?: AbortSignal): Promise<ScanResult> {
  const started = Date.now();
  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    serviceWorkers: 'block',
    acceptDownloads: false,
    javaScriptEnabled: true,
  });
  const abortHandler = () => void context.close().catch(() => {});
  signal?.addEventListener('abort', abortHandler, { once: true });

  try {
    const hostCache = new Map<string, boolean>();
    await context.route('**/*', async (route) => {
      let url: URL;
      try {
        url = new URL(route.request().url());
      } catch {
        return route.abort();
      }
      if (url.protocol === 'data:' || url.protocol === 'blob:') return route.continue();
      // Pasted HTML is scanned fully offline.
      if (request.html !== undefined) return route.abort('blockedbyclient');
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return route.abort('blockedbyclient');
      if (await isHostAllowed(url.hostname, hostCache)) return route.continue();
      return route.abort('blockedbyclient');
    });

    const page = await context.newPage();
    page.setDefaultTimeout(20_000);
    await page.addInitScript(PERF_INIT_SCRIPT);

    onProgress('loading', request.url ? `Loading ${request.url}` : 'Rendering pasted HTML');
    let finalUrl: string | undefined;
    if (request.url) {
      const response = await page.goto(request.url, { waitUntil: 'load', timeout: NAV_TIMEOUT }).catch((err: Error) => {
        throw new ScanError(`Could not load the page: ${err.message.split('\n')[0]}`);
      });
      if (response && response.status() >= 400) {
        throw new ScanError(`The page responded with HTTP ${response.status()}.`);
      }
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});
      finalUrl = page.url();
      if (!(await isHostAllowed(new URL(finalUrl).hostname, hostCache))) {
        throw new ScanError('The page redirected to a private or blocked address.');
      }
    } else {
      await page.setContent(request.html ?? '', { waitUntil: 'load', timeout: NAV_TIMEOUT });
    }
    checkAborted(signal);

    onProgress('accessibility', 'Checking WCAG rules');
    const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
    let builder = new AxeBuilder({ page }).withTags(request.level === 'AAA' ? [...tags, 'wcag2aaa'] : tags);
    if (request.level === 'AAA') builder = builder.disableRules(['color-contrast']);
    const axe = await builder.analyze();
    const issues = normalizeViolations(axe.violations as unknown as AxeRuleResult[], request.level);

    const boxes = (await page.evaluate(boxesScript(issues.map((i) => i.selector)))) as (ScanResult['issues'][number]['box'] | null)[];
    issues.forEach((issue, i) => {
      if (boxes[i]) issue.box = boxes[i]!;
    });
    checkAborted(signal);

    onProgress('structure', 'Mapping headings and landmarks');
    const rawStructure = (await page.evaluate(STRUCTURE_SCRIPT)) as RawStructure;
    const ariaSnapshot = await page
      .locator('body')
      .ariaSnapshot({ timeout: 10_000 })
      .catch(() => '');
    const structure = analyzeStructure(rawStructure, ariaSnapshot.slice(0, 30_000));
    checkAborted(signal);

    onProgress('performance', 'Measuring performance');
    const rawPerf = (await page.evaluate(PERF_COLLECT_SCRIPT)) as RawPerf;
    const performance = analyzePerf(rawPerf, Boolean(request.url) && rawPerf.observed);
    checkAborted(signal);

    onProgress('screenshot', 'Capturing screenshot');
    const screenshot = await captureScreenshot(page);
    checkAborted(signal);

    onProgress('keyboard', 'Walking the keyboard tab order');
    const keyboard = await walkKeyboard(page);

    const counts = emptyCounts();
    for (const issue of issues) counts[issue.category] += 1;

    return {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      source: request.url
        ? { type: 'url', url: request.url, label: new URL(request.url).hostname }
        : { type: 'html', label: 'Pasted HTML' },
      finalUrl,
      level: request.level,
      score: computeScore(issues),
      issues,
      counts,
      passes: axe.passes.length,
      structure,
      keyboard,
      performance,
      screenshot,
      durationMs: Date.now() - started,
    };
  } catch (err) {
    if (signal?.aborted) throw new ScanError('Scan cancelled.');
    throw err;
  } finally {
    signal?.removeEventListener('abort', abortHandler);
    await context.close().catch(() => {});
  }
}
