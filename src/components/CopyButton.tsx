import { useEffect, useState } from 'react';

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(''), 2500);
    return () => clearTimeout(t);
  }, [status]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus('Copied to clipboard');
    } catch {
      setStatus('Copy failed. Select the text and copy it manually.');
    }
  };

  return (
    <span className="copy-wrap">
      <button type="button" className="btn btn-small" onClick={copy}>
        {label}
      </button>
      <span role="status" className="copy-status">
        {status}
      </span>
    </span>
  );
}
