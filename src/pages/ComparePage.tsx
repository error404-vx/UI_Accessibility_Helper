import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Category, Issue, ScanResult } from '../../shared/types';
import { CATEGORY_META, TOP_CATEGORIES } from '../../shared/categories';
import { compareScans } from '../../shared/compare';
import { ImpactBadge } from '../components/Badges';
import { formatDate, plural, usePageTitle } from '../lib/util';
import { getScan } from '../lib/db';

export function ComparePage() {
  usePageTitle('Compare scans');
  const [params] = useSearchParams();
  const [scans, setScans] = useState<[ScanResult | undefined, ScanResult | undefined] | null>(null);

  useEffect(() => {
    Promise.all([getScan(params.get('a') ?? ''), getScan(params.get('b') ?? '')]).then(([a, b]) => setScans([a, b]));
  }, [params]);

  if (!scans) return <p role="status">Loading…</p>;
  const [before, after] = scans;
  if (!before || !after) {
    return (
      <div className="stack">
        <h1 tabIndex={-1}>Compare scans</h1>
        <p>One of the selected scans could not be found.</p>
        <Link to="/history">Back to history</Link>
      </div>
    );
  }

  const result = compareScans(before, after);
  const delta = result.scoreDelta;
  const categories: Category[] = [...TOP_CATEGORIES, 'other'];

  return (
    <div className="stack-lg">
      <h1 tabIndex={-1}>Compare scans</h1>
      <div className="two-col">
        <ScanSummary title="Before" scan={before} />
        <ScanSummary title="After" scan={after} />
      </div>

      <p className={`callout ${delta > 0 ? 'text-good' : delta < 0 ? 'text-bad' : ''}`}>
        <strong>
          Score {delta > 0 ? 'improved' : delta < 0 ? 'dropped' : 'unchanged'}: {before.score} → {after.score} ({delta > 0 ? '+' : ''}
          {delta})
        </strong>
        . {plural(result.fixed.length, 'issue')} fixed, {plural(result.added.length, 'new issue')}, {result.stillOpen} still open.
      </p>

      <table className="data-table">
        <caption>Issues by category</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Before</th>
            <th scope="col">After</th>
            <th scope="col">Change</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((c) => {
            const d = result.countDeltas[c];
            return (
              <tr key={c}>
                <th scope="row">{CATEGORY_META[c].label}</th>
                <td>{before.counts[c]}</td>
                <td>{after.counts[c]}</td>
                <td className={d < 0 ? 'text-good' : d > 0 ? 'text-bad' : undefined}>
                  {d > 0 ? '+' : ''}
                  {d}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="two-col">
        <IssueGroup title="Fixed" tone="good" issues={result.fixed} />
        <IssueGroup title="New" tone="bad" issues={result.added} />
      </div>
    </div>
  );
}

function ScanSummary({ title, scan }: { title: string; scan: ScanResult }) {
  return (
    <section className="card" aria-label={`${title} scan`}>
      <h2>{title}</h2>
      <p>
        <Link to={`/report/${scan.id}`}>{scan.source.url ?? scan.source.label}</Link>
      </p>
      <p className="muted">
        {formatDate(scan.createdAt)} · score {scan.score} · {plural(scan.issues.length, 'issue')}
      </p>
    </section>
  );
}

function IssueGroup({ title, tone, issues }: { title: string; tone: 'good' | 'bad'; issues: Issue[] }) {
  return (
    <section className="card" aria-labelledby={`group-${title}`}>
      <h2 id={`group-${title}`} className={`text-${tone}`}>
        {title} ({issues.length})
      </h2>
      {issues.length === 0 ? (
        <p className="muted">None.</p>
      ) : (
        <ul className="plain-list compact-list">
          {issues.slice(0, 100).map((i) => (
            <li key={`${i.ruleId}-${i.selector}`}>
              <ImpactBadge impact={i.impact} /> {i.title} <code>{i.selector}</code>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
