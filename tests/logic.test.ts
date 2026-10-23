import { describe, expect, it } from 'vitest';
import { computeScore } from '../shared/scoring';
import { compareScans } from '../shared/compare';
import { emptyCounts } from '../shared/categories';
import { buildFix } from '../server/scan/fixes';
import { normalizeViolations, wcagCriteria } from '../server/scan/normalize';
import { analyzeStructure } from '../server/scan/structure';
import type { Issue, ScanResult } from '../shared/types';

describe('computeScore', () => {
  it('is 100 with no issues', () => {
    expect(computeScore([])).toBe(100);
  });

  it('penalizes critical issues more than minor ones', () => {
    const critical = computeScore([{ ruleId: 'a', impact: 'critical' }]);
    const minor = computeScore([{ ruleId: 'a', impact: 'minor' }]);
    expect(critical).toBeLessThan(minor);
  });

  it('caps the per-element penalty and never goes below 0', () => {
    const many = Array.from({ length: 500 }, () => ({ ruleId: 'x', impact: 'serious' as const }));
    expect(computeScore(many)).toBe(100 - (6 + 10 * 6 * 0.2));
    const manyRules = Array.from({ length: 50 }, (_, i) => ({ ruleId: `r${i}`, impact: 'critical' as const }));
    expect(computeScore(manyRules)).toBe(0);
  });
});

describe('buildFix', () => {
  it('adds alt text to images', () => {
    expect(buildFix('image-alt', '<img src="a.png">').code).toBe('<img alt="Describe the purpose of this image" src="a.png">');
  });

  it('labels inputs by id', () => {
    expect(buildFix('label', '<input id="email" type="email">').code).toContain('<label for="email">');
  });

  it('adds an id and label when the input has none', () => {
    const fix = buildFix('label', '<input type="email">');
    expect(fix.code).toContain('<label for="input-id">');
    expect(fix.code).toContain('id="input-id"');
  });

  it('names icon buttons and links', () => {
    expect(buildFix('button-name', '<button class="x"></button>').code).toContain('aria-label=');
    expect(buildFix('link-name', '<a href="/cart"></a>').code).toContain('aria-label=');
  });

  it('suggests contrast colors', () => {
    const fix = buildFix('color-contrast', '<p>Hi</p>', {
      fg: '#b0b0b0',
      bg: '#ffffff',
      ratio: 2.2,
      required: 4.5,
      fontSize: '12pt',
      fontWeight: 'normal',
      suggestedFg: '#757575',
      suggestedRatio: 4.6,
    });
    expect(fix.code).toContain('color: #757575');
  });
});

describe('normalizeViolations', () => {
  it('maps axe rules to categories and computes contrast suggestions', () => {
    const issues = normalizeViolations(
      [
        {
          id: 'color-contrast',
          impact: 'serious',
          description: 'd',
          help: 'Elements must meet minimum color contrast ratio thresholds',
          helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/color-contrast',
          tags: ['wcag2aa', 'wcag143'],
          nodes: [
            {
              html: '<p class="muted">x</p>',
              target: ['.muted'],
              impact: 'serious',
              failureSummary: 'Fix any',
              any: [{ id: 'color-contrast', data: { fgColor: '#b0b0b0', bgColor: '#ffffff', contrastRatio: 2.17, expectedContrastRatio: '4.5:1', fontSize: '12.0pt', fontWeight: 'normal' } }],
              all: [],
              none: [],
            },
          ],
        },
        {
          id: 'image-alt',
          impact: 'critical',
          description: 'd',
          help: 'Images must have alternate text',
          helpUrl: 'https://example.test',
          tags: ['wcag2a', 'wcag111'],
          nodes: [{ html: '<img src="a">', target: ['img'], any: [], all: [], none: [] }],
        },
      ],
      'AA',
    );
    expect(issues).toHaveLength(2);
    expect(issues[0].category).toBe('alt-text');
    expect(issues[1].category).toBe('contrast');
    expect(issues[1].wcag).toEqual(['1.4.3']);
    expect(issues[1].contrast?.suggestedRatio).toBeGreaterThanOrEqual(4.5);
  });

  it('parses WCAG tags', () => {
    expect(wcagCriteria(['wcag2a', 'wcag111', 'wcag1410', 'best-practice'])).toEqual(['1.1.1', '1.4.10']);
  });
});

describe('analyzeStructure', () => {
  it('flags skipped levels, multiple h1s, and missing landmarks', () => {
    const report = analyzeStructure(
      {
        title: '',
        lang: '',
        headings: [
          { level: 1, text: 'A' },
          { level: 4, text: 'B' },
          { level: 1, text: 'C' },
        ],
        landmarks: [],
      },
      '',
    );
    expect(report.headings[1].problem).toMatch(/Skips from h1 to h4/);
    expect(report.problems.join(' ')).toMatch(/2 <h1>/);
    expect(report.problems.join(' ')).toMatch(/no <title>/);
    expect(report.problems.join(' ')).toMatch(/No <main>/);
  });
});

describe('compareScans', () => {
  const issue = (ruleId: string, selector: string): Issue => ({
    id: `${ruleId}-0`,
    ruleId,
    category: 'other',
    impact: 'minor',
    title: ruleId,
    description: '',
    helpUrl: '',
    wcag: [],
    selector,
    html: '',
    failureSummary: '',
    fix: { code: '', note: '' },
  });
  const scan = (score: number, issues: Issue[]): ScanResult => ({
    id: String(score),
    createdAt: '',
    source: { type: 'html', label: 'x' },
    level: 'AA',
    score,
    issues,
    counts: { ...emptyCounts(), other: issues.length },
    passes: 0,
    structure: { title: '', lang: '', headings: [], landmarks: [], problems: [], ariaSnapshot: '' },
    keyboard: { steps: [], problems: [], trapDetected: false, skipLink: { present: false, working: false }, truncated: false },
    performance: { metricsAvailable: false, metrics: { ttfb: null, fcp: null, lcp: null, cls: null, tbt: null }, findings: [], thirdParty: [] },
    durationMs: 0,
  });

  it('finds fixed and new issues', () => {
    const result = compareScans(scan(60, [issue('a', '#x'), issue('b', '#y')]), scan(80, [issue('b', '#y'), issue('c', '#z')]));
    expect(result.scoreDelta).toBe(20);
    expect(result.fixed.map((i) => i.ruleId)).toEqual(['a']);
    expect(result.added.map((i) => i.ruleId)).toEqual(['c']);
    expect(result.stillOpen).toBe(1);
    expect(result.countDeltas.other).toBe(0);
  });
});
