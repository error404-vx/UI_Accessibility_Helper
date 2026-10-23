import { Link } from 'react-router-dom';
import type { Category } from '../../../shared/types';
import { CATEGORY_META, IMPACT_ORDER, TOP_CATEGORIES } from '../../../shared/categories';
import { METRICS, formatMetric, rateMetric } from '../../../shared/perf';
import { SeverityBadge } from '../../components/Badges';
import { plural } from '../../lib/util';
import { useReport } from '../ReportLayout';

export function OverviewTab() {
  const { scan } = useReport();
  const base = `/report/${scan.id}`;

  const cards = [...TOP_CATEGORIES].sort((a, b) => scan.counts[b] - scan.counts[a]);
  const worst = pickWorstCategory(scan);

  return (
    <div className="stack-lg">
      <h2>Overview</h2>

      {worst ? (
        <div className="callout">
          <p>
            <strong>Start here:</strong> {CATEGORY_META[worst].label} has the highest impact on this page.
          </p>
          <Link className="btn btn-primary" to={`${base}/issues?category=${worst}`}>
            Fix the biggest issue first
          </Link>
        </div>
      ) : (
        <p className="alert alert-success">No automatically detectable issues found. Now test with a keyboard and a screen reader.</p>
      )}

      <section aria-labelledby="top6-heading">
        <h3 id="top6-heading">The six most common WCAG failures</h3>
        <p className="muted">These six categories account for about 96% of all detected errors on the web (WebAIM Million).</p>
        <ul className="card-grid">
          {cards.map((cat) => {
            const count = scan.counts[cat];
            const meta = CATEGORY_META[cat];
            return (
              <li key={cat} className={`card category-card ${count ? 'has-issues' : 'is-clean'}`}>
                <h4>{meta.label}</h4>
                <p className="category-count">
                  {count ? plural(count, 'issue') : 'None found'}
                </p>
                <p className="muted">{meta.short}</p>
                {count > 0 && (
                  <Link to={`${base}/issues?category=${cat}`}>
                    View {meta.label.toLowerCase()}
                    <span className="visually-hidden"> issues</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
        {scan.counts.other > 0 && (
          <p>
            Plus <Link to={`${base}/issues?category=other`}>{plural(scan.counts.other, 'other issue')}</Link> (ARIA, headings, landmarks, and more).
          </p>
        )}
      </section>

      <div className="two-col">
        <section aria-labelledby="perf-summary-heading" className="card">
          <h3 id="perf-summary-heading">Performance</h3>
          {scan.performance.metricsAvailable ? (
            <dl className="metric-list">
              {METRICS.slice(0, 3).map((m) => (
                <div key={m.key}>
                  <dt>
                    <abbr title={m.full}>{m.label}</abbr>
                  </dt>
                  <dd>
                    {formatMetric(m, scan.performance.metrics[m.key])} <SeverityBadge severity={rateMetric(m, scan.performance.metrics[m.key])} />
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="muted">Metrics are only measured for URL scans.</p>
          )}
          <p>
            {plural(scan.performance.findings.filter((f) => f.severity !== 'good').length, 'performance finding')}.{' '}
            <Link to={`${base}/performance`}>See performance details</Link>
          </p>
        </section>

        <section aria-labelledby="structure-summary-heading" className="card">
          <h3 id="structure-summary-heading">Structure and keyboard</h3>
          <ul className="plain-list">
            <li>{plural(scan.structure.headings.length, 'heading')}, {plural(scan.structure.landmarks.length, 'landmark')}</li>
            <li>{plural(scan.structure.problems.length, 'structure problem')}</li>
            <li>{plural(scan.keyboard.steps.length, 'tab stop')}, {plural(scan.keyboard.problems.length, 'keyboard problem')}</li>
          </ul>
          <p>
            <Link to={`${base}/structure`}>Page structure</Link> · <Link to={`${base}/keyboard`}>Keyboard map</Link>
          </p>
        </section>
      </div>
    </div>
  );
}

function pickWorstCategory(scan: ReturnType<typeof useReport>['scan']): Category | null {
  if (scan.issues.length === 0) return null;
  const weight = (impact: string) => IMPACT_ORDER.length - IMPACT_ORDER.indexOf(impact as never);
  const totals = new Map<Category, number>();
  for (const issue of scan.issues) totals.set(issue.category, (totals.get(issue.category) ?? 0) + weight(issue.impact));
  return [...totals.entries()].sort((a, b) => b[1] - a[1])[0][0];
}
