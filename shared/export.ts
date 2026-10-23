import type { ScanResult } from './types';
import { CATEGORY_META, TOP_CATEGORIES } from './categories';
import { formatMetric, METRICS } from './perf';

function escapeMd(text: string): string {
  return text.replace(/([\\`*_[\]|<>])/g, '\\$1');
}

export function toMarkdown(scan: ScanResult): string {
  const lines: string[] = [];
  const target = scan.source.url ?? scan.source.label;
  lines.push(`# Accessibility report: ${escapeMd(target)}`);
  lines.push('');
  lines.push(`- **Scanned:** ${new Date(scan.createdAt).toISOString()}`);
  lines.push(`- **WCAG level:** ${scan.level}`);
  lines.push(`- **Health score:** ${scan.score}/100`);
  lines.push(`- **Issues:** ${scan.issues.length} (passed rules: ${scan.passes})`);
  lines.push('');
  lines.push('## Top issue categories');
  lines.push('');
  lines.push('| Category | Count |');
  lines.push('| --- | --- |');
  for (const cat of [...TOP_CATEGORIES, 'other' as const]) {
    lines.push(`| ${CATEGORY_META[cat].label} | ${scan.counts[cat]} |`);
  }
  lines.push('');

  if (scan.performance.metricsAvailable) {
    lines.push('## Performance');
    lines.push('');
    for (const m of METRICS) lines.push(`- **${m.label}** (${m.full}): ${formatMetric(m, scan.performance.metrics[m.key])}`);
    lines.push('');
  }
  const perfProblems = scan.performance.findings.filter((f) => f.severity !== 'good');
  if (perfProblems.length) {
    lines.push('### Performance findings');
    lines.push('');
    for (const f of perfProblems) lines.push(`- **${escapeMd(f.title)}**: ${escapeMd(f.detail)}`);
    lines.push('');
  }

  const structural = [...scan.structure.problems, ...scan.keyboard.problems];
  if (structural.length) {
    lines.push('## Structure and keyboard');
    lines.push('');
    for (const p of structural) lines.push(`- ${escapeMd(p)}`);
    lines.push('');
  }

  lines.push('## Issues');
  lines.push('');
  scan.issues.forEach((issue, i) => {
    const fixed = scan.fixedIds?.includes(issue.id) ? ' (marked fixed)' : '';
    lines.push(`### ${i + 1}. ${escapeMd(issue.title)}${fixed}`);
    lines.push('');
    lines.push(`- **Impact:** ${issue.impact}`);
    lines.push(`- **Rule:** [${issue.ruleId}](${issue.helpUrl})${issue.wcag.length ? ` (WCAG ${issue.wcag.join(', ')})` : ''}`);
    lines.push(`- **Element:** \`${issue.selector.replace(/`/g, "'")}\``);
    lines.push('');
    lines.push('```html');
    lines.push(issue.html);
    lines.push('```');
    if (issue.fix.code) {
      lines.push('');
      lines.push('**Suggested fix:**');
      lines.push('');
      lines.push('```');
      lines.push(issue.fix.code);
      lines.push('```');
    }
    lines.push('');
    lines.push(issue.fix.note);
    lines.push('');
  });
  return lines.join('\n');
}

export function toJson(scan: ScanResult, includeScreenshot: boolean): string {
  const { screenshot, ...rest } = scan;
  return JSON.stringify(includeScreenshot ? scan : rest, null, 2);
}
