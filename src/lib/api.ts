import type { ScanEvent, ScanRequest, ScanResult, ScanStage } from '../../shared/types';

export async function requestScan(
  request: ScanRequest,
  onProgress: (stage: ScanStage, message: string) => void,
  signal?: AbortSignal,
): Promise<ScanResult> {
  const response = await fetch('/api/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok || !response.body) {
    let message = `Scan failed (HTTP ${response.status}).`;
    try {
      const data = await response.json();
      if (data?.error) message = data.error;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (value) buffer += decoder.decode(value, { stream: true });
    let newline: number;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      const event = JSON.parse(line) as ScanEvent;
      if (event.type === 'progress') onProgress(event.stage, event.message);
      else if (event.type === 'result') return event.result;
      else if (event.type === 'error') throw new Error(event.message);
    }
    if (done) break;
  }
  throw new Error('The scan ended without a result.');
}
