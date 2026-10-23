/*
 * Scripts evaluated inside the scanned page. Kept as plain JS strings so the
 * TS transpiler cannot inject helpers (e.g. esbuild's __name) that don't exist in the page.
 */

const SELECTOR_HELPERS = `
  function cssPath(el) {
    if (!(el instanceof Element)) return '';
    if (el.id && document.querySelectorAll('#' + CSS.escape(el.id)).length === 1) return '#' + CSS.escape(el.id);
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && node !== document.documentElement) {
      let part = node.tagName.toLowerCase();
      if (node.id && document.querySelectorAll('#' + CSS.escape(node.id)).length === 1) {
        parts.unshift('#' + CSS.escape(node.id));
        break;
      }
      const parent = node.parentElement;
      if (parent) {
        const same = Array.from(parent.children).filter((c) => c.tagName === node.tagName);
        if (same.length > 1) part += ':nth-of-type(' + (same.indexOf(node) + 1) + ')';
      }
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(' > ');
  }
  function docBox(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + window.scrollX, y: r.top + window.scrollY, width: r.width, height: r.height };
  }
  function textOf(el) {
    return (el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim();
  }
  function accessibleName(el) {
    const label = el.getAttribute('aria-label');
    if (label && label.trim()) return label.trim();
    const labelledby = el.getAttribute('aria-labelledby');
    if (labelledby) {
      const text = labelledby.split(/\\s+/).map((id) => {
        const ref = document.getElementById(id);
        return ref ? textOf(ref) : '';
      }).join(' ').trim();
      if (text) return text;
    }
    if (el.labels && el.labels.length) {
      const text = Array.from(el.labels).map(textOf).join(' ').trim();
      if (text) return text;
    }
    const text = textOf(el);
    if (text) return text.slice(0, 80);
    const img = el.tagName === 'IMG' ? el : el.querySelector('img[alt]');
    if (img && img.getAttribute('alt')) return img.getAttribute('alt');
    return (el.getAttribute('title') || el.getAttribute('value') || el.getAttribute('placeholder') || '').trim();
  }
  function isHidden(el) {
    if (el.closest('[hidden], [aria-hidden="true"]')) return true;
    const cs = getComputedStyle(el);
    return cs.display === 'none' || cs.visibility === 'hidden';
  }
`;

export function boxesScript(selectors: string[]): string {
  return `(() => {
    ${SELECTOR_HELPERS}
    const selectors = ${JSON.stringify(selectors)};
    return selectors.map((sel) => {
      try {
        const el = document.querySelector(sel);
        if (!el) return null;
        const b = docBox(el);
        return b.width > 0 || b.height > 0 ? b : null;
      } catch (e) {
        return null;
      }
    });
  })()`;
}

export const STRUCTURE_SCRIPT = `(() => {
  ${SELECTOR_HELPERS}
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]'))
    .filter((el) => !isHidden(el))
    .map((el) => {
      const aria = parseInt(el.getAttribute('aria-level') || '', 10);
      const level = /^H[1-6]$/.test(el.tagName) && !el.getAttribute('aria-level') ? Number(el.tagName[1]) : (aria || 2);
      return { level, text: textOf(el).slice(0, 140) || '(empty heading)' };
    });

  const roleFor = (el) => {
    const role = el.getAttribute('role');
    if (role) return role;
    const sectioning = 'article, aside, main, nav, section';
    switch (el.tagName) {
      case 'HEADER': return el.parentElement && el.parentElement.closest(sectioning) ? null : 'banner';
      case 'FOOTER': return el.parentElement && el.parentElement.closest(sectioning) ? null : 'contentinfo';
      case 'NAV': return 'navigation';
      case 'MAIN': return 'main';
      case 'ASIDE': return 'complementary';
      case 'SEARCH': return 'search';
      case 'FORM': return 'form';
      case 'SECTION': return 'region';
      default: return null;
    }
  };
  const landmarkRoles = ['banner', 'navigation', 'main', 'contentinfo', 'complementary', 'search', 'form', 'region'];
  const landmarks = Array.from(document.querySelectorAll('header, footer, nav, main, aside, search, form, section, [role]'))
    .filter((el) => !isHidden(el))
    .map((el) => {
      const role = roleFor(el);
      if (!role || !landmarkRoles.includes(role)) return null;
      const label = (el.getAttribute('aria-label') || '').trim() ||
        (el.getAttribute('aria-labelledby') || '').split(/\\s+/).map((id) => {
          const ref = document.getElementById(id);
          return ref ? textOf(ref) : '';
        }).join(' ').trim();
      if ((role === 'region' || role === 'form') && !label) return null;
      return { role, label, tag: el.tagName.toLowerCase() };
    })
    .filter(Boolean);

  return {
    title: document.title || '',
    lang: document.documentElement.getAttribute('lang') || '',
    headings,
    landmarks,
  };
})()`;

export const FOCUS_INFO_SCRIPT = `(() => {
  ${SELECTOR_HELPERS}
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return null;
  const cs = getComputedStyle(el);
  const outline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
  const shadow = cs.boxShadow && cs.boxShadow !== 'none';
  const box = docBox(el);
  const href = el.tagName === 'A' ? el.getAttribute('href') || '' : '';
  let targetExists = false;
  if (href.startsWith('#') && href.length > 1) {
    const id = decodeURIComponent(href.slice(1));
    targetExists = !!(document.getElementById(id) || document.getElementsByName(id).length);
  }
  return {
    selector: cssPath(el),
    tag: el.tagName.toLowerCase(),
    name: accessibleName(el).slice(0, 100),
    box: box.width > 0 && box.height > 0 ? box : null,
    focusVisible: Boolean(outline || shadow),
    href,
    targetExists,
  };
})()`;

export const PERF_INIT_SCRIPT = `(() => {
  const s = (window.__a11yPerf = { lcp: null, lcpEl: null, lcpUrl: '', cls: 0, longTasks: [] });
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) { s.lcp = e.startTime; s.lcpEl = e.element || null; s.lcpUrl = e.url || ''; }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) {}
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) { if (!e.hadRecentInput) s.cls += e.value; }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch (e) {}
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) s.longTasks.push(e.duration);
    }).observe({ type: 'longtask', buffered: true });
  } catch (e) {}
})();`;

export const PERF_COLLECT_SCRIPT = `(() => {
  ${SELECTOR_HELPERS}
  const s = window.__a11yPerf || null;
  const nav = performance.getEntriesByType('navigation')[0];
  const fcpEntry = performance.getEntriesByType('paint').find((e) => e.name === 'first-contentful-paint');

  let lcpEl = s && s.lcpEl;
  if (!lcpEl) {
    // Fallback for pages without observer data: the largest visible image above the fold.
    let best = null;
    let bestArea = 0;
    for (const img of Array.from(document.images)) {
      const r = img.getBoundingClientRect();
      if (r.top >= window.innerHeight || r.bottom <= 0) continue;
      const area = Math.max(0, Math.min(r.right, window.innerWidth) - Math.max(r.left, 0)) *
        Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0));
      if (area > bestArea) { best = img; bestArea = area; }
    }
    if (best && bestArea > window.innerWidth * window.innerHeight * 0.1) lcpEl = best;
  }

  let lcpInfo = null;
  if (lcpEl) {
    const isImg = lcpEl.tagName === 'IMG';
    const bg = getComputedStyle(lcpEl).backgroundImage;
    lcpInfo = {
      selector: cssPath(lcpEl),
      tag: lcpEl.tagName.toLowerCase(),
      isImage: isImg,
      isBackgroundImage: !isImg && !!bg && bg !== 'none',
      loading: isImg ? (lcpEl.getAttribute('loading') || '') : '',
      fetchpriority: isImg ? (lcpEl.getAttribute('fetchpriority') || '') : '',
      customLazy: isImg && (lcpEl.hasAttribute('data-src') || lcpEl.hasAttribute('data-lazy-src')),
    };
  }

  const unsized = Array.from(document.images).filter((img) => {
    if (isHidden(img)) return false;
    const cs = getComputedStyle(img);
    const hasAttrs = img.getAttribute('width') && img.getAttribute('height');
    const hasAspect = cs.aspectRatio && cs.aspectRatio !== 'auto';
    return !hasAttrs && !hasAspect;
  });

  const thirdParty = {};
  for (const r of performance.getEntriesByType('resource')) {
    if (r.initiatorType !== 'script') continue;
    let origin;
    try { origin = new URL(r.name).origin; } catch (e) { continue; }
    if (origin === location.origin) continue;
    const entry = thirdParty[origin] || (thirdParty[origin] = { origin, scripts: 0, bytes: 0 });
    entry.scripts += 1;
    entry.bytes += r.transferSize || r.encodedBodySize || 0;
  }

  const fontResources = performance.getEntriesByType('resource').filter((r) => /\\.(woff2?|ttf|otf)(\\?|$)/i.test(r.name)).length;
  const fontPreloads = document.querySelectorAll('link[rel="preload"][as="font"]').length;

  const tbt = s ? s.longTasks.reduce((sum, d) => sum + Math.max(0, d - 50), 0) : null;

  return {
    observed: !!s,
    ttfb: nav ? nav.responseStart : null,
    fcp: fcpEntry ? fcpEntry.startTime : null,
    lcp: s ? s.lcp : null,
    cls: s ? Math.round(s.cls * 1000) / 1000 : null,
    tbt,
    lcpInfo,
    unsizedCount: unsized.length,
    unsizedSamples: unsized.slice(0, 5).map((img) => cssPath(img)),
    thirdParty: Object.values(thirdParty).sort((a, b) => b.bytes - a.bytes),
    fontResources,
    fontPreloads,
  };
})()`;

export const PAGE_SIZE_SCRIPT = `(() => ({
  width: document.documentElement.scrollWidth,
  height: Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0),
}))()`;
