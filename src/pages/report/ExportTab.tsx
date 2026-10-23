import { useMemo, useState } from 'react';
import { toJson, toMarkdown } from '../../../shared/export';
import { CopyButton } from '../../components/CopyButton';
import { downloadFile } from '../../lib/util';
import { useReport } from '../ReportLayout';

export function ExportTab() {
  const { scan } = useReport();
  const [withScreenshot, setWithScreenshot] = useState(false);
  const markdown = useMemo(() => toMarkdown(scan), [scan]);
  const slug = (scan.source.url ? new URL(scan.source.url).hostname : 'pasted-html').replace(/[^a-z0-9.-]/gi, '-');
  const stamp = scan.createdAt.slice(0, 10);

  return (
    <div className="stack-lg">
      <h2>Export report</h2>
      <div className="actions">
        <button type="button" className="btn btn-primary" onClick={() => downloadFile(`a11y-report-${slug}-${stamp}.md`, markdown, 'text/markdown')}>
          Download Markdown
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => downloadFile(`a11y-report-${slug}-${stamp}.json`, toJson(scan, withScreenshot), 'application/json')}
        >
          Download JSON
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
          Print or save as PDF
        </button>
        <CopyButton text={markdown} label="Copy Markdown" />
      </div>
      <label className="checkbox">
        <input type="checkbox" checked={withScreenshot} onChange={(e) => setWithScreenshot(e.target.checked)} />
        Include screenshot in JSON (larger file)
      </label>
      <p className="muted">
        Markdown works well in GitHub issues and pull requests. For a PDF, open the Overview or Issues section and choose "Save as PDF" in the print dialog.
      </p>
      <section aria-labelledby="md-preview">
        <h3 id="md-preview">Markdown preview</h3>
        <pre className="export-preview" tabIndex={0} aria-labelledby="md-preview">
          {markdown}
        </pre>
      </section>
    </div>
  );
}
