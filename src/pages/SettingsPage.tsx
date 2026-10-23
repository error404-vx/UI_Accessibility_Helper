import { useState } from 'react';
import type { WcagLevel } from '../../shared/types';
import { clearScans } from '../lib/db';
import { useSettings, type Theme } from '../lib/settings';
import { usePageTitle } from '../lib/util';

export function SettingsPage() {
  usePageTitle('Settings');
  const { settings, update } = useSettings();
  const [status, setStatus] = useState('');

  const clear = async () => {
    if (!window.confirm('Delete all saved scans? This cannot be undone.')) return;
    await clearScans();
    setStatus('All scans deleted.');
  };

  return (
    <div className="stack-lg">
      <h1 tabIndex={-1}>Settings</h1>
      <form className="card stack" onSubmit={(e) => e.preventDefault()}>
        <fieldset>
          <legend>Default WCAG level</legend>
          {(['AA', 'AAA'] as WcagLevel[]).map((l) => (
            <label key={l} className="radio">
              <input type="radio" name="level" value={l} checked={settings.level === l} onChange={() => update({ level: l })} />
              {l === 'AA' ? 'AA (most laws and policies require this)' : 'AAA (strictest)'}
            </label>
          ))}
        </fieldset>

        <div className="field">
          <label htmlFor="theme">Theme</label>
          <select id="theme" value={settings.theme} onChange={(e) => update({ theme: e.target.value as Theme })}>
            <option value="system">Match system</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        <label className="checkbox">
          <input type="checkbox" checked={settings.reducedMotion} onChange={(e) => update({ reducedMotion: e.target.checked })} />
          Reduce motion (also follows your system setting)
        </label>
      </form>

      <section className="card stack" aria-labelledby="data-heading">
        <h2 id="data-heading">Your data</h2>
        <p>Scans are stored only in this browser (IndexedDB). Nothing is uploaded except the page you ask to scan.</p>
        <div>
          <button type="button" className="btn btn-danger" onClick={clear}>
            Delete all scans
          </button>
        </div>
        <p role="status">{status}</p>
      </section>
    </div>
  );
}
