import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Category, Impact, Issue, Screenshot } from '../../../shared/types';
import { CATEGORY_META, IMPACT_ORDER, TOP_CATEGORIES } from '../../../shared/categories';
import { ImpactBadge } from '../../components/Badges';
import { CopyButton } from '../../components/CopyButton';
import { ScreenshotView } from '../../components/ScreenshotView';
import { plural } from '../../lib/util';
import { useReport } from '../ReportLayout';

const ALL_CATEGORIES: Category[] = [...TOP_CATEGORIES, 'other'];

export function IssuesTab() {
  const { scan, updateScan } = useReport();
  const [params, setParams] = useSearchParams();
  const category = (params.get('category') ?? 'all') as Category | 'all';
  const impact = (params.get('impact') ?? 'all') as Impact | 'all';
  const hideFixed = params.get('hideFixed') === '1';
  const selectedId = params.get('issue');
  const detailRef = useRef<HTMLHeadingElement>(null);
  const fixed = useMemo(() => new Set(scan.fixedIds ?? []), [scan.fixedIds]);

  const filtered = scan.issues.filter(
    (i) =>
      (category === 'all' || i.category === category) &&
      (impact === 'all' || i.impact === impact) &&
      (!hideFixed || !fixed.has(i.id)),
  );
  const selected = scan.issues.find((i) => i.id === selectedId) ?? null;

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null || value === 'all' || value === '') next.delete(key);
    else next.set(key, value);
    if (key !== 'issue') next.delete('issue');
    setParams(next, { replace: true });
  };

  const select = (issue: Issue) => {
    const next = new URLSearchParams(params);
    next.set('issue', issue.id);
    setParams(next, { replace: true });
  };

  useEffect(() => {
    if (selectedId) detailRef.current?.focus();
  }, [selectedId]);

  const toggleFixed = (issue: Issue) => {
    const ids = new Set(fixed);
    if (ids.has(issue.id)) ids.delete(issue.id);
    else ids.add(issue.id);
    updateScan({ fixedIds: [...ids] });
  };

  return (
    <div className="stack">
      <h2>Issues</h2>
      <div className="filters" role="group" aria-label="Filter issues">
        <div className="field field-inline">
          <label htmlFor="filter-category">Category</label>
          <select id="filter-category" value={category} onChange={(e) => setParam('category', e.target.value)}>
            <option value="all">All categories ({scan.issues.length})</option>
            {ALL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_META[c].label} ({scan.counts[c]})
              </option>
            ))}
          </select>
        </div>
        <div className="field field-inline">
          <label htmlFor="filter-impact">Impact</label>
          <select id="filter-impact" value={impact} onChange={(e) => setParam('impact', e.target.value)}>
            <option value="all">All</option>
            {IMPACT_ORDER.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>
        <label className="checkbox">
          <input type="checkbox" checked={hideFixed} onChange={(e) => setParam('hideFixed', e.target.checked ? '1' : null)} />
          Hide issues marked as fixed
        </label>
      </div>

      <p role="status" className="muted">
        Showing {plural(filtered.length, 'issue')}
        {fixed.size > 0 ? `, ${fixed.size} marked as fixed` : ''}.
      </p>

      {category !== 'all' && (
        <p className="callout">
          <strong>Why it matters:</strong> {CATEGORY_META[category].why} <em>Affects: {CATEGORY_META[category].affects}.</em>
        </p>
      )}

      <div className="issues-layout">
        <ul className="issue-list" aria-label="Issues">
          {filtered.map((issue) => (
            <li key={issue.id}>
              <button
                type="button"
                className={`issue-item${issue.id === selectedId ? ' is-selected' : ''}${fixed.has(issue.id) ? ' is-fixed' : ''}`}
                aria-current={issue.id === selectedId ? 'true' : undefined}
                onClick={() => select(issue)}
              >
                <span className="issue-item-title">
                  <ImpactBadge impact={issue.impact} /> {issue.title}
                  {fixed.has(issue.id) && <span className="badge badge-fixed">fixed</span>}
                </span>
                <code className="issue-item-selector">{issue.selector}</code>
              </button>
            </li>
          ))}
          {filtered.length === 0 && <li className="muted">No issues match these filters.</li>}
        </ul>

        <div className="issue-detail">
          {selected ? (
            <IssueDetail
              issue={selected}
              screenshot={scan.screenshot}
              headingRef={detailRef}
              isFixed={fixed.has(selected.id)}
              onToggleFixed={() => toggleFixed(selected)}
            />
          ) : (
            <p className="muted card">Select an issue to see where it is, why it matters, and how to fix it.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function IssueDetail({
    issue,
    screenshot,
    headingRef,
    isFixed,
    onToggleFixed,
  }: {
    issue: Issue;
    screenshot?: Screenshot;
    headingRef: RefObject<HTMLHeadingElement | null>;
    isFixed: boolean;
    onToggleFixed: () => void;
  }) {
    const meta = CATEGORY_META[issue.category];
    return (
      <article className="card stack" aria-labelledby="issue-detail-title">
        <h3 id="issue-detail-title" ref={headingRef} tabIndex={-1}>
          {issue.title}
        </h3>
        <p>
          <ImpactBadge impact={issue.impact} /> <span className="muted">Rule</span> <code>{issue.ruleId}</code>
          {issue.wcag.length > 0 && <span className="muted"> · WCAG {issue.wcag.join(', ')}</span>}
        </p>
        <p>
          <strong>Why this matters:</strong> {issue.category === 'other' ? issue.description : meta.why}
        </p>

        {screenshot && issue.box ? (
          issue.box.y < screenshot.height ? (
            <ScreenshotView
              screenshot={screenshot}
              markers={[{ key: issue.id, box: issue.box, tone: 'danger', active: true }]}
              focusBox={issue.box}
              alt={`Screenshot of the page with the affected ${issue.selector} element outlined`}
              height={280}
            />
          ) : (
            <p className="muted">This element is below the captured screenshot area.</p>
          )
        ) : (
          <p className="muted">This element has no visible position on the page (it may be hidden or in the document head).</p>
        )}

        {issue.contrast && (
          <div className="contrast-sample">
            <span style={{ color: issue.contrast.fg, background: issue.contrast.bg || undefined }}>Current {issue.contrast.ratio.toFixed(2)}:1</span>
            {issue.contrast.suggestedFg && (
              <span style={{ color: issue.contrast.suggestedFg, background: issue.contrast.bg || undefined }}>
                Fixed {issue.contrast.suggestedRatio?.toFixed(2)}:1
              </span>
            )}
          </div>
        )}

        <div className="code-compare">
          <div>
            <h4>Current code</h4>
            <pre tabIndex={0} aria-label="Current code">
              <code>{issue.html}</code>
            </pre>
          </div>
          {issue.fix.code && (
            <div>
              <h4>Suggested fix</h4>
              <pre tabIndex={0} aria-label="Suggested fix">
                <code>{issue.fix.code}</code>
              </pre>
              <CopyButton text={issue.fix.code} label="Copy fix" />
            </div>
          )}
        </div>
        <p>{issue.fix.note}</p>

        {issue.failureSummary && (
          <details>
            <summary>Technical details</summary>
            <pre className="wrap">{issue.failureSummary}</pre>
            <p>
              Selector: <code>{issue.selector}</code>
            </p>
          </details>
        )}

        <div className="actions">
          <button type="button" className="btn btn-secondary" aria-pressed={isFixed} onClick={onToggleFixed}>
            {isFixed ? 'Marked as fixed' : 'Mark as fixed'}
          </button>
          <a href={issue.helpUrl} target="_blank" rel="noopener noreferrer">
            Learn more about {issue.ruleId}
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
        </div>
      </article>
    );
}
