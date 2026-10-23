import { useEffect, useState } from 'react';
import { ScreenshotView, type Marker } from '../../components/ScreenshotView';
import { prefersReducedMotion, useSettings } from '../../lib/settings';
import { plural } from '../../lib/util';
import { useReport } from '../ReportLayout';

export function KeyboardTab() {
  const { scan } = useReport();
  const { settings } = useSettings();
  const { keyboard } = scan;
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const total = keyboard.steps.length;

  useEffect(() => {
    if (!playing) return;
    const delay = prefersReducedMotion(settings) ? 1500 : 800;
    const timer = setInterval(() => {
      setCurrent((c) => {
        if (c >= total - 1) {
          setPlaying(false);
          return c;
        }
        return c + 1;
      });
    }, delay);
    return () => clearInterval(timer);
  }, [playing, total, settings]);

  const step = keyboard.steps[current];
  const markers: Marker[] = keyboard.steps
    .filter((s) => s.box)
    .map((s) => ({
      key: String(s.index),
      box: s.box!,
      label: String(s.index),
      tone: s.focusVisible ? 'primary' : 'danger',
      active: s.index === step?.index,
    }));

  return (
    <div className="stack-lg">
      <h2>Keyboard navigation</h2>
      <p>
        We pressed <kbd>Tab</kbd> through the page and recorded where focus went.
        {keyboard.truncated && ' Only the first 60 tab stops are shown.'}
      </p>

      {keyboard.problems.length > 0 ? (
        <section aria-labelledby="kb-problems" className="card">
          <h3 id="kb-problems">{plural(keyboard.problems.length, 'problem')} found</h3>
          <ul>
            {keyboard.problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <p className="muted">Focus-visibility checks are heuristic: custom focus styles using borders or backgrounds may be reported as missing.</p>
        </section>
      ) : (
        <p className="alert alert-success">No keyboard problems detected.</p>
      )}

      <dl className="summary-list">
        <div>
          <dt>Tab stops</dt>
          <dd>{total}</dd>
        </div>
        <div>
          <dt>Skip link</dt>
          <dd>
            {keyboard.skipLink.present ? (
              keyboard.skipLink.working ? (
                <span className="text-good">Present and working</span>
              ) : (
                <span className="text-bad">Present but broken</span>
              )
            ) : (
              'Not found'
            )}
          </dd>
        </div>
        <div>
          <dt>Focus trap</dt>
          <dd>{keyboard.trapDetected ? <span className="text-bad">Detected</span> : 'None detected'}</dd>
        </div>
      </dl>

      {total > 0 && (
        <>
          <div className="actions no-print" role="group" aria-label="Tab order playback">
            <button type="button" className="btn btn-small" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>
              Previous stop
            </button>
            <button
              type="button"
              className="btn btn-small btn-primary"
              onClick={() => {
                if (!playing && current >= total - 1) setCurrent(0);
                setPlaying((p) => !p);
              }}
            >
              {playing ? 'Pause' : 'Play tab order'}
            </button>
            <button type="button" className="btn btn-small" onClick={() => setCurrent((c) => Math.min(total - 1, c + 1))} disabled={current >= total - 1}>
              Next stop
            </button>
            <span role="status" aria-live="polite">
              {step && `Stop ${step.index} of ${total}: ${step.tag}${step.name ? ` "${step.name}"` : ' (no name)'}${step.focusVisible ? '' : ', no visible focus'}`}
            </span>
          </div>

          {scan.screenshot && (
            <ScreenshotView
              screenshot={scan.screenshot}
              markers={markers}
              focusBox={step?.box}
              alt="Screenshot of the page with numbered tab stops. Red markers have no visible focus indicator."
              height={460}
              path
            />
          )}

          <table className="data-table">
            <caption>Tab order</caption>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Element</th>
                <th scope="col">Accessible name</th>
                <th scope="col">Focus visible</th>
              </tr>
            </thead>
            <tbody>
              {keyboard.steps.map((s, i) => (
                <tr key={s.index} className={i === current ? 'row-active' : undefined}>
                  <td>
                    <button type="button" className="link-button" onClick={() => setCurrent(i)} aria-label={`Show stop ${s.index}`}>
                      {s.index}
                    </button>
                  </td>
                  <td>
                    <code>{s.selector}</code>
                  </td>
                  <td>{s.name || <span className="text-bad">No name</span>}</td>
                  <td>{s.focusVisible ? 'Yes' : <span className="text-bad">No</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
