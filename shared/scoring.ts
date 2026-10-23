import type { Impact, Issue } from './types';

const RULE_WEIGHT: Record<Impact, number> = { critical: 10, serious: 6, moderate: 3, minor: 1 };

/**
 * 100 minus a penalty per failing rule (weighted by impact) plus a smaller,
 * capped penalty for each additional affected element of that rule.
 */
export function computeScore(issues: Pick<Issue, 'ruleId' | 'impact'>[]): number {
  const byRule = new Map<string, { impact: Impact; count: number }>();
  for (const issue of issues) {
    const entry = byRule.get(issue.ruleId);
    if (entry) entry.count += 1;
    else byRule.set(issue.ruleId, { impact: issue.impact, count: 1 });
  }
  let penalty = 0;
  for (const { impact, count } of byRule.values()) {
    const weight = RULE_WEIGHT[impact];
    penalty += weight + Math.min(count - 1, 10) * weight * 0.2;
  }
  return Math.max(0, Math.round(100 - penalty));
}

export function scoreLabel(score: number): 'good' | 'warn' | 'bad' {
  if (score >= 90) return 'good';
  if (score >= 50) return 'warn';
  return 'bad';
}
