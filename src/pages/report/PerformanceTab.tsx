import { METRICS, formatMetric, rateMetric } from '../../../shared/perf';
import { SeverityBadge } from '../../components/Badges';
import { CopyButton } from '../../components/CopyButton';
import { formatBytes } from '../../lib/util';
import { useReport } from '../ReportLayout';

export function PerformanceTab() {
  const { scan } = useReport();
  const perf = scan.performance;
  const order = { bad: 0, warn: 1, good: 2 } as const;
  const findings = [...perf.findings].sort((a, b) => order[a.severity] - order[b.severity]);

  return (
    <div className="stack-lg">
      <h2>Performance</h2>
      {perf.metricsAvailable ? (
        <>
          <p className="muted">
            Lab measurements from one desktop page load (1280×800). Real users on slower phones will see higher numbers.
          </p>
          <ul className="card-grid metric-grid">
            {METRICS.map((m) => {
              const value = perf.metrics[m.key];
              return (
                <li key={m.key} className="card">
                  <h3>
                    <abbr title={m.full}>{m.label}</abbr>
                  </h3>
                  <p className="metric-value">{formatMetric(m, value)}</p>
                  <SeverityBadge severity={rateMetric(m, value)} />
                  <p className="muted">{m.help}</p>
                  <p className="muted small">
                    Good ≤ {m.unit === 'ms' ? `${m.good} ms` : m.good}, poor &gt; {m.unit === 'ms' ? `${m.poor} ms` : m.poor}
                  </p>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <p className="callout">Metrics are only measured for URL scans. Static checks below still apply to the pasted HTML.</p>
      )}

      {perf.lcpElement && (
        <p>
          Largest Contentful Paint element: <code>{perf.lcpElement}</code>
        </p>
      )}

      <section aria-labelledby="findings-heading" className="stack">
        <h3 id="findings-heading">Findings</h3>
        <ul className="stack plain-list">
          {findings.map((f) => (
            <li key={f.id} className={`card finding finding-${f.severity}`}>
              <h4>
                <SeverityBadge severity={f.severity} /> {f.title}
              </h4>
              <p>{f.detail}</p>
              {f.fix && (
                <>
                  <pre tabIndex={0} aria-label={`Fix for: ${f.title}`}>
                    <code>{f.fix}</code>
                  </pre>
                  <CopyButton text={f.fix} label="Copy fix" />
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      {perf.thirdParty.length > 0 && (
        <table className="data-table">
          <caption>Third-party scripts by origin</caption>
          <thead>
            <tr>
              <th scope="col">Origin</th>
              <th scope="col">Scripts</th>
              <th scope="col">Transferred</th>
            </tr>
          </thead>
          <tbody>
            {perf.thirdParty.map((t) => (
              <tr key={t.origin}>
                <td>
                  <code>{t.origin}</code>
                </td>
                <td>{t.scripts}</td>
                <td>{t.bytes ? formatBytes(t.bytes) : 'unknown'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
