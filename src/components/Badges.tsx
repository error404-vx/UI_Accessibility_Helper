import type { FindingSeverity, Impact } from '../../shared/types';

export function ImpactBadge({ impact }: { impact: Impact }) {
  return <span className={`badge badge-${impact}`}>{impact}</span>;
}

const SEVERITY_TEXT: Record<FindingSeverity | 'na', string> = {
  good: 'Good',
  warn: 'Needs improvement',
  bad: 'Poor',
  na: 'Not measured',
};

export function SeverityBadge({ severity }: { severity: FindingSeverity | 'na' }) {
  return <span className={`badge badge-sev-${severity}`}>{SEVERITY_TEXT[severity]}</span>;
}
