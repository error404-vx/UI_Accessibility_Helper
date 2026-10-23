import { describe, expect, it } from 'vitest';
import { contrastRatio, contrastRatioHex, formatRatio, parseColor, suggestForeground, withLightness } from '../shared/color';

describe('color math', () => {
  it('parses hex and rgb colors', () => {
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColor('#1d4ed8')).toEqual({ r: 29, g: 78, b: 216 });
    expect(parseColor('rgb(10, 20, 30)')).toEqual({ r: 10, g: 20, b: 30 });
    expect(parseColor('rgba(10 20 30 / 50%)')).toEqual({ r: 10, g: 20, b: 30 });
    expect(parseColor('banana')).toBeNull();
  });

  it('computes WCAG contrast ratios', () => {
    expect(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(21, 5);
    expect(contrastRatioHex('#767676', '#ffffff')!).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatioHex('#777777', '#ffffff')!).toBeLessThan(4.5);
  });

  it('never rounds a ratio up', () => {
    expect(formatRatio(4.499)).toBe('4.49');
  });

  it('suggests a passing color with the same hue', () => {
    const suggestion = suggestForeground('#b0b0b0', '#ffffff', 4.55);
    expect(suggestion).not.toBeNull();
    expect(contrastRatioHex(suggestion!.color, '#ffffff')!).toBeGreaterThanOrEqual(4.5);
    const { r, g, b } = parseColor(suggestion!.color)!;
    expect(r).toBe(g);
    expect(g).toBe(b);
  });

  it('can lighten text on dark backgrounds', () => {
    const suggestion = suggestForeground('#444444', '#000000', 7.05);
    expect(contrastRatioHex(suggestion!.color, '#000000')!).toBeGreaterThanOrEqual(7);
  });

  it('returns the original color if it already passes', () => {
    expect(suggestForeground('#000000', '#ffffff', 4.5)?.color).toBe('#000000');
  });

  it('adjusts lightness', () => {
    expect(withLightness('#ff0000', 0)).toBe('#000000');
    expect(withLightness('#ff0000', 100)).toBe('#ffffff');
  });
});
