import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { ScanResult } from '../../shared/types';
import { Sparkline } from '../components/Sparkline';
import { deleteScan, listScans } from '../lib/db';
import { formatDate, plural, usePageTitle } from '../lib/util';

export function HistoryPage() {
  usePageTitle('History');
  const navigate = useNavigate();
  const [scans, setScans] = useState<ScanResult[] | null>(null);
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    listScans().then(setScans);
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, ScanResult[]>();
    for (const s of scans ?? []) {
      const key = s.source.label;
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return [...map.entries()];
  }, [scans]);

  const remove = async (scan: ScanResult) => {
    if (!window.confirm(`Delete the scan of ${scan.source.url ?? scan.source.label} from ${formatDate(scan.createdAt)}?`)) return;
    await deleteScan(scan.id);
    setScans((list) => list?.filter((s) => s.id !== scan.id) ?? null);
    setStatus('Scan deleted.');
  };

  const compare = (e: FormEvent) => {
    e.preventDefault();
    if (a && b && a !== b) navigate(`/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`);
  };

  if (scans === null) return <p role="status">Loading history…</p>;

  return (
    <div className="stack-lg">
      <h1 tabIndex={-1}>Scan history</h1>
      <p role="status" className="muted">
        {status}
      </p>
      {scans.length === 0 ? (
        <p>
          No scans yet. <Link to="/">Run your first scan</Link>.
        </p>
      ) : (
        <>
          {scans.length > 1 && (
            <form className="card compare-form" onSubmit={compare}>
              <h2>Compare two scans</h2>
              <div className="field field-inline">
                <label htmlFor="compare-a">Before</label>
                <select id="compare-a" value={a} onChange={(e) => setA(e.target.value)} required>
                  <option value="">Choose a scan</option>
                  {scans.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.source.label} · {formatDate(s.createdAt)} · {s.score}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field field-inline">
                <label htmlFor="compare-b">After</label>
                <select id="compare-b" value={b} onChange={(e) => setB(e.target.value)} required>
                  <option value="">Choose a scan</option>
                  {scans.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.source.label} · {formatDate(s.createdAt)} · {s.score}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary" disabled={!a || !b || a === b}>
                Compare
              </button>
            </form>
          )}

          {groups.map(([label, list], groupIndex) => {
            const chronological = [...list].reverse();
            return (
              <section key={label} className="card" aria-labelledby={`group-${groupIndex}`}>
                <div className="group-header">
                  <h2 id={`group-${groupIndex}`}>{label}</h2>
                  <Sparkline values={chronological.map((s) => s.score)} label={`Score trend for ${label}: ${chronological.map((s) => s.score).join(', ')}`} />
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Score</th>
                      <th scope="col">Issues</th>
                      <th scope="col">
                        <span className="visually-hidden">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <Link to={`/report/${s.id}`}>{formatDate(s.createdAt)}</Link>
                        </td>
                        <td>{s.score}</td>
                        <td>{plural(s.issues.length, 'issue')}</td>
                        <td>
                          <button type="button" className="btn btn-small btn-danger" onClick={() => remove(s)}>
                            Delete<span className="visually-hidden"> scan from {formatDate(s.createdAt)}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
