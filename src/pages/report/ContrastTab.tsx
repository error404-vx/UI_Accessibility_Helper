import { useMemo, useState } from 'react';
import type { ContrastInfo } from '../../../shared/types';
import { contrastRatioHex, formatRatio, parseColor, rgbToHsl, suggestForeground, withLightness } from '../../../shared/color';
import { CopyButton } from '../../components/CopyButton';
import { plural } from '../../lib/util';
import { useReport } from '../ReportLayout';

interface Pair {
  key: string;
  fg: string;
  bg: string;
  ratio: number;
  required: number;
  count: number;
  sample: string;
}

function textSample(html: string): string {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.slice(0, 60) || 'Sample text';
}

export function ContrastTab() {
  const { scan } = useReport();
  const required = scan.level === 'AAA' ? 7 : 4.5;

  const { pairs, unknown } = useMemo(() => {
    const map = new Map<string, Pair>();
    let unknownBg = 0;
    for (const issue of scan.issues) {
      const c: ContrastInfo | undefined = issue.contrast;
      if (!c) continue;
      if (!c.bg) {
        unknownBg += 1;
        continue;
      }
      const key = `${c.fg}|${c.bg}|${c.required}`;
      const existing = map.get(key);
      if (existing) existing.count += 1;
      else map.set(key, { key, fg: c.fg, bg: c.bg, ratio: c.ratio, required: c.required, count: 1, sample: textSample(issue.html) });
    }
    return { pairs: [...map.values()].sort((a, b) => b.count - a.count), unknown: unknownBg };
  }, [scan.issues]);

  const [choices, setChoices] = useState<Record<string, string>>({});
  const chosen = (p: Pair) => choices[p.key] ?? suggestForeground(p.fg, p.bg, p.required + 0.05)?.color ?? p.fg;

  const cssExport = pairs.map((p, i) => `  --a11y-text-${i + 1}: ${chosen(p)}; /* was ${p.fg} on ${p.bg} */`).join('\n');
  const twExport = pairs.map((p, i) => `        'a11y-text-${i + 1}': '${chosen(p)}', // was ${p.fg} on ${p.bg}`).join('\n');

  return (
    <div className="stack-lg">
      <h2>Contrast fixer</h2>
      <p>
        WCAG {scan.level} requires a contrast ratio of at least {required}:1 for normal text
        {scan.level === 'AA' ? ' and 3:1 for large text' : ' and 4.5:1 for large text'}. Suggestions keep the original hue and change only the lightness.
      </p>

      {pairs.length === 0 ? (
        <p className="alert alert-success">No failing color pairs with a known background.</p>
      ) : (
        <ul className="stack pair-list">
          {pairs.map((p, i) => (
            <PairEditor key={p.key} index={i + 1} pair={p} value={chosen(p)} onChange={(v) => setChoices((c) => ({ ...c, [p.key]: v }))} />
          ))}
        </ul>
      )}
      {unknown > 0 && (
        <p className="muted">
          {plural(unknown, 'element')} with text over images or gradients could not be measured automatically. Check those by hand.
        </p>
      )}

      {pairs.length > 0 && (
        <section aria-labelledby="export-colors-heading" className="stack">
          <h3 id="export-colors-heading">Export fixed colors</h3>
          <div className="two-col">
            <div>
              <h4>CSS variables</h4>
              <pre tabIndex={0} aria-label="CSS variables">
                <code>{`:root {\n${cssExport}\n}`}</code>
              </pre>
              <CopyButton text={`:root {\n${cssExport}\n}`} label="Copy CSS" />
            </div>
            <div>
              <h4>Tailwind config</h4>
              <pre tabIndex={0} aria-label="Tailwind configuration">
                <code>{`theme: {\n  extend: {\n    colors: {\n${twExport}\n    },\n  },\n}`}</code>
              </pre>
              <CopyButton text={`theme: {\n  extend: {\n    colors: {\n${twExport}\n    },\n  },\n}`} label="Copy Tailwind" />
            </div>
          </div>
        </section>
      )}

      <ManualChecker />
    </div>
  );
}

function PairEditor({ index, pair, value, onChange }: { index: number; pair: Pair; value: string; onChange: (v: string) => void }) {
  const ratio = contrastRatioHex(value, pair.bg) ?? 0;
  const passes = ratio >= pair.required;
  const rgb = parseColor(value);
  const lightness = rgb ? Math.round(rgbToHsl(rgb).l) : 50;
  const sliderId = `lightness-${index}`;
  const suggestion = suggestForeground(pair.fg, pair.bg, pair.required + 0.05);

  return (
    <li className="card pair-card">
      <h3>
        Color pair {index} <span className="muted">· used by {plural(pair.count, 'element')}</span>
      </h3>
      <div className="pair-previews">
        <div className="pair-preview" style={{ color: pair.fg, background: pair.bg }}>
          <span className="pair-label">Before · {formatRatio(pair.ratio)}:1</span>
          {pair.sample}
        </div>
        <div className="pair-preview" style={{ color: value, background: pair.bg }}>
          <span className="pair-label">After · {formatRatio(ratio)}:1</span>
          {pair.sample}
        </div>
      </div>
      <p>
        Text <code>{pair.fg}</code> on background <code>{pair.bg}</code> → <code>{value}</code>{' '}
        <span className={passes ? 'text-good' : 'text-bad'}>
          {passes ? `Passes (needs ${pair.required}:1)` : `Fails (needs ${pair.required}:1)`}
        </span>
      </p>
      <div className="field">
        <label htmlFor={sliderId}>Text lightness: {lightness}%</label>
        <input
          id={sliderId}
          type="range"
          min={0}
          max={100}
          step={1}
          value={lightness}
          aria-valuetext={`${lightness}%, contrast ${formatRatio(ratio)} to 1, ${passes ? 'passes' : 'fails'}`}
          onChange={(e) => onChange(withLightness(value, Number(e.target.value)) ?? value)}
        />
      </div>
      <div className="actions">
        {suggestion && (
          <button type="button" className="btn btn-small" onClick={() => onChange(suggestion.color)}>
            Use suggestion ({suggestion.color})
          </button>
        )}
        <CopyButton text={`color: ${value};`} label="Copy color" />
      </div>
    </li>
  );
}

function ManualChecker() {
  const [fg, setFg] = useState('#767676');
  const [bg, setBg] = useState('#ffffff');
  const ratio = contrastRatioHex(fg, bg);

  return (
    <section aria-labelledby="manual-heading" className="card stack">
      <h3 id="manual-heading">Check any color pair</h3>
      <div className="color-inputs">
        <div className="field">
          <label htmlFor="manual-fg">Text color</label>
          <input id="manual-fg" type="color" value={fg} onChange={(e) => setFg(e.target.value)} />
          <code>{fg}</code>
        </div>
        <div className="field">
          <label htmlFor="manual-bg">Background color</label>
          <input id="manual-bg" type="color" value={bg} onChange={(e) => setBg(e.target.value)} />
          <code>{bg}</code>
        </div>
      </div>
      <div className="pair-preview" style={{ color: fg, background: bg }}>
        The quick brown fox jumps over the lazy dog.
      </div>
      {ratio !== null && (
        <table className="data-table">
          <caption>
            Contrast ratio <strong>{formatRatio(ratio)}:1</strong>
          </caption>
          <thead>
            <tr>
              <th scope="col">Requirement</th>
              <th scope="col">Needs</th>
              <th scope="col">Result</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['AA normal text', 4.5],
              ['AA large text', 3],
              ['AAA normal text', 7],
              ['AAA large text', 4.5],
            ].map(([label, need]) => (
              <tr key={label as string}>
                <th scope="row">{label}</th>
                <td>{need}:1</td>
                <td className={ratio >= (need as number) ? 'text-good' : 'text-bad'}>{ratio >= (need as number) ? 'Pass' : 'Fail'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
