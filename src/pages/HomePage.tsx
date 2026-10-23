import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { ScanRequest, ScanResult, ScanStage, WcagLevel } from '../../shared/types';
import { DEMO_HTML } from '../../shared/demoPage';
import { requestScan } from '../lib/api';
import { listScans, saveScan } from '../lib/db';
import { useSettings } from '../lib/settings';
import { formatDate, usePageTitle } from '../lib/util';

const STAGES: { id: ScanStage; label: string }[] = [
  { id: 'loading', label: 'Loading page' },
  { id: 'accessibility', label: 'Checking accessibility' },
  { id: 'structure', label: 'Mapping page structure' },
  { id: 'performance', label: 'Measuring performance' },
  { id: 'screenshot', label: 'Capturing screenshot' },
  { id: 'keyboard', label: 'Testing keyboard navigation' },
];

export function useScanRunner() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<ScanStage | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const start = async (request: ScanRequest) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setError('');
    setStage('loading');
    setMessage('Starting scan');
    try {
      const result: ScanResult = await requestScan(
        request,
        (s, m) => {
          setStage(s);
          setMessage(m);
        },
        controller.signal,
      );
      result.request = request;
      result.fixedIds = [];
      await saveScan(result);
      navigate(`/report/${result.id}`);
    } catch (err) {
      if (controller.signal.aborted) setError('Scan cancelled.');
      else setError(err instanceof Error ? err.message : 'The scan failed.');
    } finally {
      setStage(null);
      controllerRef.current = null;
    }
  };

  const cancel = () => controllerRef.current?.abort();
  return { stage, message, error, start, cancel, running: stage !== null };
}

export function ScanProgress({ stage, message, onCancel }: { stage: ScanStage; message: string; onCancel: () => void }) {
  const activeIndex = STAGES.findIndex((s) => s.id === stage);
  return (
    <section className="card progress-card" aria-labelledby="progress-heading">
      <h2 id="progress-heading">Scanning…</h2>
      <p role="status" aria-live="polite" className="muted">
        {message}
      </p>
      <ol className="stage-list">
        {STAGES.map((s, i) => {
          const state = i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'pending';
          return (
            <li key={s.id} className={`stage stage-${state}`} aria-current={state === 'active' ? 'step' : undefined}>
              <span className="stage-icon" aria-hidden="true">
                {state === 'done' ? '✓' : state === 'active' ? '' : '○'}
              </span>
              {s.label}
              <span className="visually-hidden">{state === 'done' ? ' (done)' : state === 'active' ? ' (in progress)' : ''}</span>
            </li>
          );
        })}
      </ol>
      <button type="button" className="btn btn-secondary" onClick={onCancel}>
        Cancel scan
      </button>
    </section>
  );
}

export function HomePage() {
  usePageTitle('New scan');
  const { settings } = useSettings();
  const [mode, setMode] = useState<'url' | 'html'>('url');
  const [url, setUrl] = useState('');
  const [html, setHtml] = useState('');
  const [level, setLevel] = useState<WcagLevel>(settings.level);
  const [recent, setRecent] = useState<ScanResult[]>([]);
  const [formError, setFormError] = useState('');
  const runner = useScanRunner();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listScans().then((scans) => setRecent(scans.slice(0, 5)));
  }, []);

  useEffect(() => setLevel(settings.level), [settings.level]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (mode === 'url') {
      let value = url.trim();
      if (!value) {
        setFormError('Enter a URL to scan.');
        inputRef.current?.focus();
        return;
      }
      if (!/^https?:\/\//i.test(value)) {
        value = `https://${value}`;
        setUrl(value);
      }
      runner.start({ url: value, level });
    } else {
      if (!html.trim()) {
        setFormError('Paste some HTML to scan.');
        return;
      }
      runner.start({ html, level });
    }
  };

  const runDemo = () => {
    setMode('html');
    setHtml(DEMO_HTML);
    runner.start({ html: DEMO_HTML, level });
  };

  const error = formError || runner.error;

  return (
    <div className="stack-lg">
      <section className="hero">
        <h1 tabIndex={-1}>Find and fix the accessibility issues that matter most</h1>
        <p className="lead">
          Scan a page and get a prioritized report of the six most common WCAG failures, plus page structure, keyboard
          navigation, and performance checks. Every issue comes with code you can copy.
        </p>
      </section>

      {runner.running && runner.stage ? (
        <ScanProgress stage={runner.stage} message={runner.message} onCancel={runner.cancel} />
      ) : (
        <form className="card scan-form" onSubmit={submit} noValidate aria-describedby={error ? 'scan-error' : undefined}>
          <fieldset className="segmented">
            <legend>What do you want to scan?</legend>
            <label>
              <input type="radio" name="mode" value="url" checked={mode === 'url'} onChange={() => setMode('url')} />
              <span>A web address</span>
            </label>
            <label>
              <input type="radio" name="mode" value="html" checked={mode === 'html'} onChange={() => setMode('html')} />
              <span>Pasted HTML</span>
            </label>
          </fieldset>

          {mode === 'url' ? (
            <div className="field">
              <label htmlFor="scan-url">Page URL</label>
              <input
                ref={inputRef}
                id="scan-url"
                type="url"
                inputMode="url"
                autoComplete="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                aria-invalid={formError ? true : undefined}
                autoFocus
              />
              <p className="hint">Public pages only. Private and local addresses are blocked unless the server allows them.</p>
            </div>
          ) : (
            <div className="field">
              <label htmlFor="scan-html">HTML to scan</label>
              <textarea
                id="scan-html"
                rows={10}
                spellCheck={false}
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                placeholder="<!doctype html>…"
                aria-invalid={formError ? true : undefined}
              />
              <p className="hint">Pasted HTML is rendered offline: external files are not loaded and performance metrics are skipped.</p>
            </div>
          )}

          <div className="field field-inline">
            <label htmlFor="scan-level">WCAG level</label>
            <select id="scan-level" value={level} onChange={(e) => setLevel(e.target.value as WcagLevel)}>
              <option value="AA">AA (recommended)</option>
              <option value="AAA">AAA (strict)</option>
            </select>
          </div>

          {error && (
            <p id="scan-error" className="alert alert-error" role="alert">
              {error}
            </p>
          )}

          <div className="actions">
            <button type="submit" className="btn btn-primary">
              Scan page
            </button>
            <button type="button" className="btn btn-secondary" onClick={runDemo}>
              Try the demo page
            </button>
          </div>
        </form>
      )}

      {recent.length > 0 && (
        <section aria-labelledby="recent-heading">
          <h2 id="recent-heading">Recent scans</h2>
          <ul className="recent-list">
            {recent.map((s) => (
              <li key={s.id}>
                <Link to={`/report/${s.id}`}>{s.source.url ?? s.source.label}</Link>
                <span className="muted">
                  {' '}
                  · score {s.score} · {formatDate(s.createdAt)}
                </span>
              </li>
            ))}
          </ul>
          <p>
            <Link to="/history">View all scans</Link>
          </p>
        </section>
      )}
    </div>
  );
}
