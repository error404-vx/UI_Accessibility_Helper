import type { Category, Issue, ScanResult } from './types';
import { emptyCounts } from './categories';

export interface ScanComparison {
  scoreDelta: number;
  fixed: Issue[];
  added: Issue[];
  stillOpen: number;
  countDeltas: Record<Category, number>;
}

function issueKey(issue: Issue): string {
  return `${issue.ruleId}::${issue.selector}`;
}

export function compareScans(before: ScanResult, after: ScanResult): ScanComparison {
  const beforeKeys = new Set(before.issues.map(issueKey));
  const afterKeys = new Set(after.issues.map(issueKey));
  const countDeltas = emptyCounts();
  for (const key of Object.keys(countDeltas) as Category[]) {
    countDeltas[key] = (after.counts[key] ?? 0) - (before.counts[key] ?? 0);
  }
  return {
    scoreDelta: after.score - before.score,
    fixed: before.issues.filter((i) => !afterKeys.has(issueKey(i))),
    added: after.issues.filter((i) => !beforeKeys.has(issueKey(i))),
    stillOpen: after.issues.filter((i) => beforeKeys.has(issueKey(i))).length,
    countDeltas,
  };
}
