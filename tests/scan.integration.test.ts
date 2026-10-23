import { afterAll, describe, expect, it } from 'vitest';
import { DEMO_HTML } from '../shared/demoPage';
import { closeBrowser, runScan } from '../server/scan/runner';
import type { ScanStage } from '../shared/types';

describe('runScan (headless Chromium)', () => {
  afterAll(async () => {
    await closeBrowser();
  });

  it('finds the deliberate problems in the demo page', async () => {
    const stages: ScanStage[] = [];
    const result = await runScan({ html: DEMO_HTML, level: 'AA' }, (stage) => stages.push(stage));

    expect(stages).toEqual(['loading', 'accessibility', 'structure', 'performance', 'screenshot', 'keyboard']);
    expect(result.source.type).toBe('html');
    expect(result.score).toBeLessThan(90);

    for (const category of ['contrast', 'alt-text', 'form-labels', 'empty-links', 'empty-buttons', 'language'] as const) {
      expect(result.counts[category], category).toBeGreaterThan(0);
    }
    const contrast = result.issues.find((i) => i.category === 'contrast' && i.contrast?.suggestedFg);
    expect(contrast).toBeDefined();
    expect(result.issues.some((i) => i.box)).toBe(true);

    expect(result.structure.problems.join(' ')).toMatch(/<h1>/);
    expect(result.structure.headings.some((h) => h.problem?.startsWith('Skips'))).toBe(true);
    expect(result.structure.ariaSnapshot.length).toBeGreaterThan(0);

    expect(result.keyboard.steps.length).toBeGreaterThan(3);
    expect(result.keyboard.skipLink.present).toBe(true);
    expect(result.keyboard.skipLink.working).toBe(false);

    expect(result.performance.metricsAvailable).toBe(false);
    expect(result.performance.findings.some((f) => f.id === 'lcp-lazy')).toBe(true);
    expect(result.performance.findings.some((f) => f.id === 'unsized-images' && f.severity !== 'good')).toBe(true);

    expect(result.screenshot?.dataUrl.startsWith('data:image/jpeg;base64,')).toBe(true);
  });
});
