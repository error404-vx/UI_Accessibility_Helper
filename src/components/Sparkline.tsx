export function Sparkline({ values, label }: { values: number[]; label: string }) {
  const width = 120;
  const height = 32;
  if (values.length === 0) return null;
  const points = values.map((v, i) => {
    const x = values.length === 1 ? width / 2 : (i / (values.length - 1)) * (width - 8) + 4;
    const y = height - 4 - (v / 100) * (height - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = points[points.length - 1].split(',');
  return (
    <svg className="sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      <polyline points={points.join(' ')} fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx={last[0]} cy={last[1]} r="3" fill="currentColor" />
    </svg>
  );
}
