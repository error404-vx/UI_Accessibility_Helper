import type { FindingSeverity, PerfMetrics } from './types';

export interface MetricMeta {
  key: keyof PerfMetrics;
  label: string;
  full: string;
  unit: 'ms' | '';
  good: number;
  poor: number;
  help: string;
}

/** Thresholds follow web.dev Core Web Vitals guidance (TBT is the lab proxy for INP). */
export const METRICS: MetricMeta[] = [
  { key: 'lcp', label: 'LCP', full: 'Largest Contentful Paint', unit: 'ms', good: 2500, poor: 4000, help: 'When the main content (often the hero image) appears.' },
  { key: 'cls', label: 'CLS', full: 'Cumulative Layout Shift', unit: '', good: 0.1, poor: 0.25, help: 'How much the layout jumps around while loading.' },
  { key: 'tbt', label: 'TBT', full: 'Total Blocking Time', unit: 'ms', good: 200, poor: 600, help: 'Main-thread blocking time; a lab proxy for responsiveness (INP).' },
  { key: 'fcp', label: 'FCP', full: 'First Contentful Paint', unit: 'ms', good: 1800, poor: 3000, help: 'When the first text or image appears.' },
  { key: 'ttfb', label: 'TTFB', full: 'Time to First Byte', unit: 'ms', good: 800, poor: 1800, help: 'How fast the server starts responding.' },
];

export function rateMetric(meta: MetricMeta, value: number | null): FindingSeverity | 'na' {
  if (value === null || Number.isNaN(value)) return 'na';
  if (value <= meta.good) return 'good';
  if (value <= meta.poor) return 'warn';
  return 'bad';
}

export function formatMetric(meta: MetricMeta, value: number | null): string {
  if (value === null) return 'n/a';
  if (meta.unit === 'ms') return value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${Math.round(value)} ms`;
  return value.toFixed(3);
}
