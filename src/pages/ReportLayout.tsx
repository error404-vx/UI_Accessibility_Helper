import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useOutletContext, useParams } from 'react-router-dom';
import type { ScanResult } from '../../shared/types';
import { getScan, saveScan } from '../lib/db';
import { formatDate, plural, usePageTitle } from '../lib/util';
import { ScoreGauge } from '../components/ScoreGauge';
import { ScanProgress, useScanRunner } from './HomePage';

export interface ReportContext {
  scan: ScanResult;
  updateScan: (patch: Partial<ScanResult>) => Promise<void>;
}

export function useReport() {
  return useOutletContext<ReportContext>();
}

const TABS = [
  { to: '', label: 'Overview', end: true },
  { to: 'issues', label: 'Issues' },
  { to: 'contrast', label: 'Contrast' },
  { to: 'structure', label: 'Structure' },
  { to: 'keyboard', label: 'Keyboard' },
  { to: 'performance', label: 'Performance' },
  { to: 'export', label: 'Export' },
];

export function ReportLayout() {
  const { id = '' } = useParams();
  const [scan, setScan] = useState<ScanResult | null | undefined>(undefined);
  const runner = useScanRunner();

  useEffect(() => {
    setScan(undefined);
    getScan(id).then((s) => setScan(s ?? null));
  }, [id]);

  usePageTitle(scan ? `Report: ${scan.source.url ?? scan.source.label}` : 'Report');

  const updateScan = useCallback(
    async (patch: Partial<ScanResult>) => {
      if (!scan) return;
      const next = { ...scan, ...patch };
      setScan(next);
      await saveScan(next);
    },
    [scan],
  );

  if (scan === undefined) return <p role="status">Loading report…</p>;
  if (scan === null) {
    return (
      <div className="stack">
        <h1 tabIndex={-1}>Report not found</h1>
        <p>This scan may have been deleted from your history.</p>
        <Link to="/">Start a new scan</Link>
      </div>
    );
  }

  const target = scan.source.url ?? scan.source.label;
  const openIssues = scan.issues.filter((i) => !scan.fixedIds?.includes(i.id)).length;

  return (
    <div className="stack-lg">
      <header className="report-header">
        <ScoreGauge score={scan.score} />
        <div className="report-meta">
          <h1 tabIndex={-1}>
            <span className="visually-hidden">Report for </span>
            {target}
          </h1>
          <p className="muted">
            Scanned {formatDate(scan.createdAt)} · WCAG {scan.level} · {plural(scan.issues.length, 'issue')} ({openIssues} open) ·{' '}
            {plural(scan.passes, 'rule')} passed · {(scan.durationMs / 1000).toFixed(1)} s
          </p>
          {scan.finalUrl && scan.finalUrl !== scan.source.url && (
            <p className="muted">
              Redirected to{' '}
              <a href={scan.finalUrl} target="_blank" rel="noopener noreferrer">
                {scan.finalUrl}
                <span className="visually-hidden"> (opens in a new tab)</span>
              </a>
            </p>
          )}
          {scan.request && (
            <div className="no-print">
              <button type="button" className="btn btn-secondary" onClick={() => runner.start(scan.request!)} disabled={runner.running}>
                Re-scan
              </button>
            </div>
          )}
          {runner.error && (
            <p className="alert alert-error" role="alert">
              {runner.error}
            </p>
          )}
        </div>
      </header>

      {runner.running && runner.stage && <ScanProgress stage={runner.stage} message={runner.message} onCancel={runner.cancel} />}

      <nav aria-label="Report sections" className="tabs no-print">
        <ul>
          {TABS.map((t) => (
            <li key={t.label}>
              <NavLink to={`/report/${scan.id}${t.to ? `/${t.to}` : ''}`} end={t.end}>
                {t.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <section className="report-body">
        <Outlet context={{ scan, updateScan } satisfies ReportContext} />
      </section>
    </div>
  );
}
