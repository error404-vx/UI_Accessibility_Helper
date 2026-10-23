import { useEffect, useRef, useState } from 'react';
import type { Box, Screenshot } from '../../shared/types';

export interface Marker {
  key: string;
  box: Box;
  label?: string;
  tone?: 'primary' | 'danger';
  active?: boolean;
}

interface Props {
  screenshot: Screenshot;
  markers: Marker[];
  focusBox?: Box;
  alt: string;
  height?: number;
  path?: boolean;
}

/** Shows the page screenshot in a scrollable frame with SVG overlays scaled to the image. */
export function ScreenshotView({ screenshot, markers, focusBox, alt, height = 360, path = false }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const frame = frameRef.current;
    const img = imgRef.current;
    if (!frame || !img || !loaded || !focusBox) return;
    const scale = img.clientWidth / screenshot.width;
    const centerY = (focusBox.y + focusBox.height / 2) * scale;
    const centerX = (focusBox.x + focusBox.width / 2) * scale;
    frame.scrollTo({ top: Math.max(0, centerY - frame.clientHeight / 2), left: Math.max(0, centerX - frame.clientWidth / 2) });
  }, [focusBox, loaded, screenshot.width]);

  const visible = markers.filter((m) => m.box.y < screenshot.height);
  const centers = visible.map((m) => [m.box.x + m.box.width / 2, m.box.y + m.box.height / 2]);

  return (
    <div className="screenshot-frame" ref={frameRef} style={{ maxHeight: height }} tabIndex={0} role="group" aria-label={`${alt} (scrollable)`}>
      <div className="screenshot-inner">
        <img ref={imgRef} src={screenshot.dataUrl} alt={alt} onLoad={() => setLoaded(true)} />
        <svg
          className="screenshot-overlay"
          viewBox={`0 0 ${screenshot.width} ${screenshot.height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {path && centers.length > 1 && (
            <polyline points={centers.map((c) => c.join(',')).join(' ')} className="focus-path" fill="none" />
          )}
          {visible.map((m) => (
            <g key={m.key} className={`marker marker-${m.tone ?? 'primary'}${m.active ? ' marker-active' : ''}`}>
              <rect
                x={m.box.x - 3}
                y={m.box.y - 3}
                width={Math.max(m.box.width + 6, 8)}
                height={Math.max(m.box.height + 6, 8)}
                rx="4"
              />
              {m.label && (
                <>
                  <circle cx={m.box.x} cy={m.box.y} r="14" />
                  <text x={m.box.x} y={m.box.y} textAnchor="middle" dominantBaseline="central">
                    {m.label}
                  </text>
                </>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
