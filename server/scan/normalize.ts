import type { ContrastInfo, Impact, Issue, WcagLevel } from '../../shared/types';
import { categoryForRule } from '../../shared/categories';
import { suggestForeground } from '../../shared/color';
import { buildFix } from './fixes';

/** Minimal subset of axe-core result types used here. */
export interface AxeNode {
  html: string;
  target: unknown[];
  impact?: string | null;
  failureSummary?: string;
  any: { id: string; data?: unknown }[];
  all: { id: string; data?: unknown }[];
  none: { id: string; data?: unknown }[];
}

export interface AxeRuleResult {
  id: string;
  impact?: string | null;
  description: string;
  help: string;
  helpUrl: string;
  tags: string[];
  nodes: AxeNode[];
}

const MAX_NODES_PER_RULE = 50;
const IMPACTS: Impact[] = ['critical', 'serious', 'moderate', 'minor'];

function toImpact(value: string | null | undefined): Impact {
  return IMPACTS.includes(value as Impact) ? (value as Impact) : 'moderate';
}

/** Converts axe tags like "wcag143" into "1.4.3". */
export function wcagCriteria(tags: string[]): string[] {
  return tags
    .map((t) => t.match(/^wcag(\d)(\d)(\d+)$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => `${m[1]}.${m[2]}.${m[3]}`);
}

function selectorOf(target: unknown[]): string {
  const parts = target.map((t) => (Array.isArray(t) ? t.join(' >>> ') : String(t)));
  return parts.join(' >>> iframe ');
}

interface AxeContrastData {
  fgColor?: string;
  bgColor?: string;
  contrastRatio?: number;
  expectedContrastRatio?: string | number;
  fontSize?: string;
  fontWeight?: string;
}

function contrastFrom(node: AxeNode, level: WcagLevel): ContrastInfo | undefined {
  const check = [...node.any, ...node.all, ...node.none].find((c) => c.id.startsWith('color-contrast'));
  const data = check?.data as AxeContrastData | undefined;
  if (!data?.fgColor) return undefined;
  const required = Number(String(data.expectedContrastRatio ?? (level === 'AAA' ? 7 : 4.5)).replace(':1', ''));
  const info: ContrastInfo = {
    fg: data.fgColor,
    bg: data.bgColor ?? '',
    ratio: data.contrastRatio ?? 0,
    required,
    fontSize: data.fontSize ?? '',
    fontWeight: data.fontWeight ?? '',
  };
  if (data.bgColor) {
    // Aim slightly above the threshold so rounding never lands on a failing value.
    const suggestion = suggestForeground(data.fgColor, data.bgColor, required + 0.05);
    if (suggestion) {
      info.suggestedFg = suggestion.color;
      info.suggestedRatio = suggestion.ratio;
    }
  }
  return info;
}

export function normalizeViolations(violations: AxeRuleResult[], level: WcagLevel): Issue[] {
  const issues: Issue[] = [];
  for (const rule of violations) {
    const category = categoryForRule(rule.id);
    rule.nodes.slice(0, MAX_NODES_PER_RULE).forEach((node, index) => {
      const contrast = category === 'contrast' ? contrastFrom(node, level) : undefined;
      issues.push({
        id: `${rule.id}-${index}`,
        ruleId: rule.id,
        category,
        impact: toImpact(node.impact ?? rule.impact),
        title: rule.help,
        description: rule.description,
        helpUrl: rule.helpUrl,
        wcag: wcagCriteria(rule.tags),
        selector: selectorOf(node.target),
        html: node.html.length > 1200 ? node.html.slice(0, 1200) + '…' : node.html,
        failureSummary: node.failureSummary ?? '',
        fix: buildFix(rule.id, node.html, contrast),
        contrast,
      });
    });
  }
  const order = (i: Issue) => IMPACTS.indexOf(i.impact);
  return issues.sort((a, b) => order(a) - order(b));
}
