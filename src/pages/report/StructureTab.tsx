import { plural } from '../../lib/util';
import { useReport } from '../ReportLayout';

export function StructureTab() {
  const { scan } = useReport();
  const { structure } = scan;
  const flagged = structure.headings.filter((h) => h.problem).length;

  return (
    <div className="stack-lg">
      <h2>Page structure</h2>
      <p>Screen reader users move through a page by headings and landmarks. This is the outline they get.</p>

      <dl className="summary-list">
        <div>
          <dt>Title</dt>
          <dd>{structure.title || <span className="text-bad">Missing</span>}</dd>
        </div>
        <div>
          <dt>Language</dt>
          <dd>{structure.lang || <span className="text-bad">Missing</span>}</dd>
        </div>
        <div>
          <dt>Headings</dt>
          <dd>
            {structure.headings.length} ({flagged} flagged)
          </dd>
        </div>
        <div>
          <dt>Landmarks</dt>
          <dd>{structure.landmarks.length}</dd>
        </div>
      </dl>

      {structure.problems.length > 0 ? (
        <section aria-labelledby="structure-problems" className="card">
          <h3 id="structure-problems">{plural(structure.problems.length, 'problem')} found</h3>
          <ul>
            {structure.problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="alert alert-success">No structural problems detected.</p>
      )}

      <div className="two-col">
        <section aria-labelledby="outline-heading" className="card">
          <h3 id="outline-heading">Heading outline</h3>
          {structure.headings.length === 0 ? (
            <p className="muted">No headings found.</p>
          ) : (
            <ol className="outline">
              {structure.headings.map((h, i) => (
                <li key={i} style={{ marginInlineStart: `${(h.level - 1) * 1.25}rem` }} className={h.problem ? 'outline-problem' : undefined}>
                  <span className="badge badge-level">H{h.level}</span> {h.text}
                  {h.problem && <span className="outline-flag"> · {h.problem}</span>}
                </li>
              ))}
            </ol>
          )}
        </section>

        <section aria-labelledby="landmarks-heading" className="card">
          <h3 id="landmarks-heading">Landmarks</h3>
          {structure.landmarks.length === 0 ? (
            <p className="muted">No landmarks found.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Role</th>
                  <th scope="col">Element</th>
                  <th scope="col">Label</th>
                </tr>
              </thead>
              <tbody>
                {structure.landmarks.map((l, i) => (
                  <tr key={i}>
                    <td>{l.role}</td>
                    <td>
                      <code>&lt;{l.tag}&gt;</code>
                    </td>
                    <td>{l.label || <span className="muted">none</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <section aria-labelledby="sr-heading" className="stack">
        <h3 id="sr-heading">Read like a screen reader</h3>
        <p className="muted">The accessibility tree that assistive technology receives, in reading order.</p>
        {structure.ariaSnapshot ? (
          <pre className="aria-snapshot" tabIndex={0} aria-labelledby="sr-heading">
            {structure.ariaSnapshot}
          </pre>
        ) : (
          <p className="muted">The accessibility tree could not be captured for this page.</p>
        )}
      </section>
    </div>
  );
}
