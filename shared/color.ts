export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

export function parseColor(input: string): Rgb | null {
  const value = input.trim().toLowerCase();
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }
  const rgb = value.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/);
  if (rgb) {
    return { r: clamp255(+rgb[1]), g: clamp255(+rgb[2]), b: clamp255(+rgb[3]) };
  }
  return null;
}

function clamp255(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

export function toHex({ r, g, b }: Rgb): string {
  return '#' + [r, g, b].map((n) => clamp255(n).toString(16).padStart(2, '0')).join('');
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(c: Rgb): number {
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export function contrastRatioHex(a: string, b: string): number | null {
  const pa = parseColor(a);
  const pb = parseColor(b);
  if (!pa || !pb) return null;
  return contrastRatio(pa, pb);
}

/** Rounds down to 2 decimals so a displayed ratio never overstates compliance. */
export function formatRatio(ratio: number): string {
  return (Math.floor(ratio * 100) / 100).toFixed(2);
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return { h: h * 60, s: s * 100, l: l * 100 };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const sn = s / 100;
  const ln = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => ln - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return { r: clamp255(f(0) * 255), g: clamp255(f(8) * 255), b: clamp255(f(4) * 255) };
}

export function withLightness(color: string, lightness: number): string | null {
  const rgb = parseColor(color);
  if (!rgb) return null;
  const hsl = rgbToHsl(rgb);
  return toHex(hslToRgb({ ...hsl, l: Math.max(0, Math.min(100, lightness)) }));
}

/**
 * Finds the foreground color closest in lightness to the original (same hue and
 * saturation) that reaches the target contrast ratio against the background.
 */
export function suggestForeground(
  fg: string,
  bg: string,
  target: number,
): { color: string; ratio: number } | null {
  const fgRgb = parseColor(fg);
  const bgRgb = parseColor(bg);
  if (!fgRgb || !bgRgb) return null;
  if (contrastRatio(fgRgb, bgRgb) >= target) return { color: toHex(fgRgb), ratio: contrastRatio(fgRgb, bgRgb) };

  const base = rgbToHsl(fgRgb);
  let best: { color: string; ratio: number; delta: number } | null = null;
  for (const dir of [-1, 1]) {
    for (let step = 0.5; step <= 100; step += 0.5) {
      const l = base.l + dir * step;
      if (l < 0 || l > 100) break;
      const candidate = hslToRgb({ ...base, l });
      const ratio = contrastRatio(candidate, bgRgb);
      if (ratio >= target) {
        if (!best || step < best.delta) best = { color: toHex(candidate), ratio, delta: step };
        break;
      }
    }
  }
  if (best) return { color: best.color, ratio: best.ratio };

  const black = { r: 0, g: 0, b: 0 };
  const white = { r: 255, g: 255, b: 255 };
  const rb = contrastRatio(black, bgRgb);
  const rw = contrastRatio(white, bgRgb);
  const pick = rb >= rw ? { color: '#000000', ratio: rb } : { color: '#ffffff', ratio: rw };
  return pick.ratio >= target ? pick : null;
}
