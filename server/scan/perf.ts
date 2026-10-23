import type { PerfFinding, PerfReport, ThirdPartyOrigin } from '../../shared/types';

export interface RawPerf {
  observed: boolean;
  ttfb: number | null;
  fcp: number | null;
  lcp: number | null;
  cls: number | null;
  tbt: number | null;
  lcpInfo: {
    selector: string;
    tag: string;
    isImage: boolean;
    isBackgroundImage: boolean;
    loading: string;
    fetchpriority: string;
    customLazy: boolean;
  } | null;
  unsizedCount: number;
  unsizedSamples: string[];
  thirdParty: ThirdPartyOrigin[];
  fontResources: number;
  fontPreloads: number;
}

export function analyzePerf(raw: RawPerf, metricsAvailable: boolean): PerfReport {
  const findings: PerfFinding[] = [];
  const lcp = raw.lcpInfo;

  if (lcp?.isImage) {
    if (lcp.loading === 'lazy' || lcp.customLazy) {
      findings.push({
        id: 'lcp-lazy',
        severity: 'bad',
        title: 'The main (LCP) image is lazy-loaded',
        detail: `${lcp.selector} is the largest element in view but is lazy-loaded, which delays when it starts downloading. About 16% of mobile sites make this mistake.`,
        fix: '<img src="hero.jpg" fetchpriority="high" width="1200" height="400" alt="…">  <!-- remove loading="lazy" / data-src -->',
      });
    }
    if (lcp.fetchpriority !== 'high') {
      findings.push({
        id: 'lcp-priority',
        severity: 'warn',
        title: 'The main (LCP) image is not prioritized',
        detail: `Add fetchpriority="high" to ${lcp.selector} so the browser downloads it before less important images.`,
        fix: '<img src="hero.jpg" fetchpriority="high" …>',
      });
    } else {
      findings.push({ id: 'lcp-priority', severity: 'good', title: 'The main (LCP) image is prioritized', detail: 'fetchpriority="high" is set.', fix: '' });
    }
  } else if (lcp?.isBackgroundImage) {
    findings.push({
      id: 'lcp-bg',
      severity: 'warn',
      title: 'The main (LCP) element uses a CSS background image',
      detail: `${lcp.selector} loads its image from CSS, so the browser cannot discover it until the stylesheet is parsed.`,
      fix: 'Use an <img fetchpriority="high"> element, or add <link rel="preload" as="image" href="hero.jpg" fetchpriority="high"> in <head>.',
    });
  }

  if (raw.unsizedCount > 0) {
    findings.push({
      id: 'unsized-images',
      severity: raw.unsizedCount > 5 ? 'bad' : 'warn',
      title: `${raw.unsizedCount} image${raw.unsizedCount > 1 ? 's have' : ' has'} no width/height`,
      detail: `Images without dimensions cause layout shifts while loading. Examples: ${raw.unsizedSamples.join(', ')}`,
      fix: '<img src="photo.jpg" width="800" height="600" alt="…">  /* or CSS: aspect-ratio: 4 / 3; */',
    });
  } else {
    findings.push({ id: 'unsized-images', severity: 'good', title: 'All images have dimensions', detail: 'No unsized images found.', fix: '' });
  }

  const thirdPartyScripts = raw.thirdParty.reduce((sum, t) => sum + t.scripts, 0);
  if (thirdPartyScripts > 0) {
    findings.push({
      id: 'third-party',
      severity: thirdPartyScripts > 10 ? 'bad' : 'warn',
      title: `${thirdPartyScripts} third-party script${thirdPartyScripts > 1 ? 's' : ''} from ${raw.thirdParty.length} origin${raw.thirdParty.length > 1 ? 's' : ''}`,
      detail: 'Tracking, consent, and CDN-hosted scripts are the top causes of slow interactions (INP). Review each one.',
      fix: '<script src="…" defer></script>  <!-- load non-critical scripts after interaction or idle -->',
    });
  }

  if (raw.fontResources > 0 && raw.fontPreloads === 0) {
    findings.push({
      id: 'fonts',
      severity: 'warn',
      title: 'Web fonts are not preloaded',
      detail: `${raw.fontResources} font file${raw.fontResources > 1 ? 's' : ''} loaded without a preload hint, which can cause text to shift when the font arrives.`,
      fix: '<link rel="preload" href="/fonts/brand.woff2" as="font" type="font/woff2" crossorigin>\n/* and in @font-face: font-display: optional; */',
    });
  }

  if (raw.tbt !== null && raw.tbt > 200) {
    findings.push({
      id: 'tbt',
      severity: raw.tbt > 600 ? 'bad' : 'warn',
      title: 'Long JavaScript tasks block the main thread',
      detail: `The main thread was blocked for ${Math.round(raw.tbt)} ms in total. Clicks and taps feel slow while it is blocked.`,
      fix: 'Split long tasks (await scheduler.yield()), defer non-critical JS, and remove unused third-party scripts.',
    });
  }

  return {
    metricsAvailable,
    metrics: metricsAvailable
      ? { ttfb: raw.ttfb, fcp: raw.fcp, lcp: raw.lcp, cls: raw.cls, tbt: raw.tbt }
      : { ttfb: null, fcp: null, lcp: null, cls: null, tbt: null },
    findings,
    lcpElement: lcp?.selector,
    thirdParty: raw.thirdParty.slice(0, 15),
  };
}
