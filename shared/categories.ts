import type { Category, Impact } from './types';

export interface CategoryMeta {
  id: Category;
  label: string;
  short: string;
  why: string;
  affects: string;
}

export const TOP_CATEGORIES: Category[] = [
  'contrast',
  'alt-text',
  'form-labels',
  'empty-links',
  'empty-buttons',
  'language',
];

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  contrast: {
    id: 'contrast',
    label: 'Low contrast text',
    short: 'Text that is hard to read against its background.',
    why: 'Text below the WCAG contrast ratio is hard or impossible to read for people with low vision, color blindness, or anyone using a screen in sunlight.',
    affects: 'Low-vision users, older users, mobile users outdoors',
  },
  'alt-text': {
    id: 'alt-text',
    label: 'Missing alternative text',
    short: 'Images with no text alternative.',
    why: 'Screen readers announce images without alt text as a file name or just "image", so the information or link purpose is lost.',
    affects: 'Blind and screen reader users, users with images disabled',
  },
  'form-labels': {
    id: 'form-labels',
    label: 'Missing form labels',
    short: 'Inputs without an accessible label.',
    why: 'Without a label, screen readers announce only "edit text", and voice-control users cannot target the field by name.',
    affects: 'Screen reader users, voice-control users, users with cognitive disabilities',
  },
  'empty-links': {
    id: 'empty-links',
    label: 'Empty links',
    short: 'Links with no text or accessible name.',
    why: 'An empty link is announced as just "link", giving no clue where it goes. Usually caused by icon-only links.',
    affects: 'Screen reader users, voice-control users',
  },
  'empty-buttons': {
    id: 'empty-buttons',
    label: 'Empty buttons',
    short: 'Buttons with no text or accessible name.',
    why: 'An icon-only button with no name is announced as just "button", so users cannot know what it does.',
    affects: 'Screen reader users, voice-control users',
  },
  language: {
    id: 'language',
    label: 'Missing document language',
    short: 'The page does not declare its language.',
    why: 'Without a lang attribute, screen readers may read the page with the wrong pronunciation rules, and translation tools guess the language.',
    affects: 'Screen reader users, braille display users, translation users',
  },
  other: {
    id: 'other',
    label: 'Other issues',
    short: 'Additional WCAG failures and best-practice problems.',
    why: 'These issues are less common but can still block users, for example invalid ARIA, skipped heading levels, or missing landmarks.',
    affects: 'Varies by issue',
  },
};

export const RULE_CATEGORY: Record<string, Category> = {
  'color-contrast': 'contrast',
  'color-contrast-enhanced': 'contrast',
  'image-alt': 'alt-text',
  'input-image-alt': 'alt-text',
  'role-img-alt': 'alt-text',
  'svg-img-alt': 'alt-text',
  'area-alt': 'alt-text',
  'object-alt': 'alt-text',
  label: 'form-labels',
  'select-name': 'form-labels',
  'aria-input-field-name': 'form-labels',
  'aria-toggle-field-name': 'form-labels',
  'label-title-only': 'form-labels',
  'link-name': 'empty-links',
  'button-name': 'empty-buttons',
  'input-button-name': 'empty-buttons',
  'html-has-lang': 'language',
  'html-lang-valid': 'language',
  'valid-lang': 'language',
  'html-xml-lang-mismatch': 'language',
};

export const IMPACT_ORDER: Impact[] = ['critical', 'serious', 'moderate', 'minor'];

export function categoryForRule(ruleId: string): Category {
  return RULE_CATEGORY[ruleId] ?? 'other';
}

export function emptyCounts(): Record<Category, number> {
  return {
    contrast: 0,
    'alt-text': 0,
    'form-labels': 0,
    'empty-links': 0,
    'empty-buttons': 0,
    language: 0,
    other: 0,
  };
}
