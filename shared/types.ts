export type WcagLevel = 'AA' | 'AAA';

export type Category =
  | 'contrast'
  | 'alt-text'
  | 'form-labels'
  | 'empty-links'
  | 'empty-buttons'
  | 'language'
  | 'other';

export type Impact = 'critical' | 'serious' | 'moderate' | 'minor';

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ContrastInfo {
  fg: string;
  bg: string;
  ratio: number;
  required: number;
  fontSize: string;
  fontWeight: string;
  suggestedFg?: string;
  suggestedRatio?: number;
}

export interface Fix {
  code: string;
  note: string;
}

export interface Issue {
  id: string;
  ruleId: string;
  category: Category;
  impact: Impact;
  title: string;
  description: string;
  helpUrl: string;
  wcag: string[];
  selector: string;
  html: string;
  failureSummary: string;
  fix: Fix;
  box?: Box;
  contrast?: ContrastInfo;
}

export interface HeadingInfo {
  level: number;
  text: string;
  problem?: string;
}

export interface LandmarkInfo {
  role: string;
  label: string;
  tag: string;
}

export interface StructureReport {
  title: string;
  lang: string;
  headings: HeadingInfo[];
  landmarks: LandmarkInfo[];
  problems: string[];
  ariaSnapshot: string;
}

export interface FocusStep {
  index: number;
  selector: string;
  tag: string;
  name: string;
  box?: Box;
  focusVisible: boolean;
}

export interface KeyboardReport {
  steps: FocusStep[];
  problems: string[];
  trapDetected: boolean;
  skipLink: { present: boolean; working: boolean; href?: string };
  truncated: boolean;
}

export interface PerfMetrics {
  ttfb: number | null;
  fcp: number | null;
  lcp: number | null;
  cls: number | null;
  tbt: number | null;
}

export type FindingSeverity = 'good' | 'warn' | 'bad';

export interface PerfFinding {
  id: string;
  title: string;
  detail: string;
  fix: string;
  severity: FindingSeverity;
}

export interface ThirdPartyOrigin {
  origin: string;
  scripts: number;
  bytes: number;
}

export interface PerfReport {
  metricsAvailable: boolean;
  metrics: PerfMetrics;
  findings: PerfFinding[];
  lcpElement?: string;
  thirdParty: ThirdPartyOrigin[];
}

export interface Screenshot {
  dataUrl: string;
  width: number;
  height: number;
}

export interface ScanRequest {
  url?: string;
  html?: string;
  level: WcagLevel;
}

export interface ScanResult {
  id: string;
  createdAt: string;
  source: { type: 'url' | 'html'; label: string; url?: string };
  finalUrl?: string;
  level: WcagLevel;
  score: number;
  issues: Issue[];
  counts: Record<Category, number>;
  passes: number;
  structure: StructureReport;
  keyboard: KeyboardReport;
  performance: PerfReport;
  screenshot?: Screenshot;
  durationMs: number;
  /** Client-side only: original request (for re-scan) and issues the user marked as fixed. */
  request?: ScanRequest;
  fixedIds?: string[];
}

export type ScanStage =
  | 'loading'
  | 'accessibility'
  | 'structure'
  | 'performance'
  | 'screenshot'
  | 'keyboard';

export type ScanEvent =
  | { type: 'progress'; stage: ScanStage; message: string }
  | { type: 'result'; result: ScanResult }
  | { type: 'error'; message: string };
