import type { Page } from 'playwright';
import type { Box, FocusStep, KeyboardReport } from '../../shared/types';
import { FOCUS_INFO_SCRIPT } from './browserScripts';

const MAX_STEPS = 60;

interface RawFocus {
  selector: string;
  tag: string;
  name: string;
  box: Box | null;
  focusVisible: boolean;
  href: string;
  targetExists: boolean;
}

export async function walkKeyboard(page: Page): Promise<KeyboardReport> {
  await page.evaluate(`(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); window.scrollTo(0, 0); })()`);

  const steps: FocusStep[] = [];
  const raws: RawFocus[] = [];
  const seen = new Set<string>();
  let trapDetected = false;
  let truncated = false;
  let sameCount = 0;

  for (let i = 0; i < MAX_STEPS; i++) {
    await page.keyboard.press('Tab');
    const info = (await page.evaluate(FOCUS_INFO_SCRIPT)) as RawFocus | null;
    if (!info) {
      if (steps.length > 0) break;
      continue;
    }
    const last = raws[raws.length - 1];
    if (last && last.selector === info.selector) {
      sameCount += 1;
      if (sameCount >= 2) {
        trapDetected = true;
        break;
      }
      continue;
    }
    sameCount = 0;
    if (seen.has(info.selector)) {
      // Returning to the first element is a normal wrap-around; returning elsewhere means focus is trapped.
      if (info.selector !== raws[0]?.selector) trapDetected = true;
      break;
    }
    seen.add(info.selector);
    raws.push(info);
    steps.push({
      index: steps.length + 1,
      selector: info.selector,
      tag: info.tag,
      name: info.name,
      box: info.box ?? undefined,
      focusVisible: info.focusVisible,
    });
    if (i === MAX_STEPS - 1) truncated = true;
  }

  const first = raws[0];
  const skipLike = !!first && first.tag === 'a' && first.href.startsWith('#') && /skip|jump|main content|zum inhalt/i.test(first.name);
  const skipLink = {
    present: skipLike,
    working: skipLike && first.targetExists,
    href: skipLike ? first.href : undefined,
  };

  const problems: string[] = [];
  if (steps.length === 0) problems.push('No focusable elements were reached with the Tab key.');
  if (trapDetected) problems.push('Keyboard focus appears to be trapped: Tab stopped moving through the page.');
  if (skipLink.present && !skipLink.working) problems.push(`The skip link points to "${skipLink.href}", but no element with that id exists.`);
  if (!skipLink.present && steps.length > 8) problems.push('No "skip to content" link: keyboard users must tab through every header link on each page.');
  const invisible = steps.filter((s) => !s.focusVisible).length;
  if (invisible > 0) problems.push(`${invisible} focused element${invisible > 1 ? 's show' : ' shows'} no visible focus indicator (outline or box-shadow).`);
  const offscreen = steps.filter((s) => !s.box).length;
  if (offscreen > 0) problems.push(`${offscreen} focused element${offscreen > 1 ? 's are' : ' is'} invisible or zero-sized when focused.`);
  const unnamed = steps.filter((s) => !s.name).length;
  if (unnamed > 0) problems.push(`${unnamed} focusable element${unnamed > 1 ? 's have' : ' has'} no accessible name.`);

  return { steps, problems, trapDetected, skipLink, truncated };
}
