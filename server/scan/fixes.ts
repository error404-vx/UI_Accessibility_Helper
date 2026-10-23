import type { ContrastInfo, Fix } from '../../shared/types';

function addAttribute(html: string, attr: string): string {
  return html.replace(/^(\s*<[a-zA-Z][\w-]*)/, `$1 ${attr}`);
}

function setAttribute(html: string, name: string, value: string): string {
  const re = new RegExp(`(\\s${name}\\s*=\\s*)("[^"]*"|'[^']*'|[^\\s>]+)`, 'i');
  if (re.test(html)) return html.replace(re, `$1"${value}"`);
  return addAttribute(html, `${name}="${value}"`);
}

function tagName(html: string): string {
  return (html.match(/^\s*<([a-zA-Z][\w-]*)/)?.[1] ?? '').toLowerCase();
}

function idOf(html: string): string | null {
  return html.match(/^\s*<[^>]*\sid\s*=\s*["']([^"']+)["']/i)?.[1] ?? null;
}

export function buildFix(ruleId: string, html: string, contrast?: ContrastInfo): Fix {
  const tag = tagName(html);
  switch (ruleId) {
    case 'image-alt':
    case 'input-image-alt':
    case 'area-alt':
      return {
        code: setAttribute(html, 'alt', 'Describe the purpose of this image'),
        note: 'Describe what the image conveys. If it is purely decorative, use alt="" so screen readers skip it.',
      };
    case 'role-img-alt':
    case 'svg-img-alt':
      return {
        code: setAttribute(tag === 'svg' ? setAttribute(html, 'role', 'img') : html, 'aria-label', 'Describe this graphic'),
        note: 'Give the graphic an accessible name. If it is decorative, use aria-hidden="true" instead.',
      };
    case 'object-alt':
      return {
        code: setAttribute(html, 'aria-label', 'Describe this embedded content'),
        note: 'Provide a text alternative for the embedded object.',
      };
    case 'link-name':
      return {
        code: setAttribute(html, 'aria-label', 'Describe where this link goes'),
        note: 'Prefer visible link text. For icon-only links, add an aria-label or alt text on the inner image, and mark decorative SVGs with aria-hidden="true".',
      };
    case 'button-name':
      return {
        code: setAttribute(html, 'aria-label', 'Describe what this button does'),
        note: 'Icon-only buttons need an accessible name. Visible text is best; otherwise use aria-label.',
      };
    case 'input-button-name':
      return {
        code: setAttribute(html, 'value', 'Submit'),
        note: 'Input buttons take their name from the value attribute.',
      };
    case 'label':
    case 'select-name':
    case 'aria-input-field-name':
    case 'aria-toggle-field-name':
    case 'label-title-only': {
      const id = idOf(html);
      if (id) {
        return {
          code: `<label for="${id}">Field label</label>\n${html}`,
          note: 'Add a visible <label> linked to the field. Placeholders and titles are not reliable labels.',
        };
      }
      const fieldId = `${tag || 'field'}-id`;
      return {
        code: `<label for="${fieldId}">Field label</label>\n${setAttribute(html, 'id', fieldId)}`,
        note: 'Add a visible <label> and link it to the field with matching for/id attributes.',
      };
    }
    case 'html-has-lang':
      return { code: '<html lang="en">', note: 'Set lang to the primary language of the page (e.g. "en", "de", "fr").' };
    case 'html-lang-valid':
    case 'valid-lang':
      return { code: setAttribute(html, 'lang', 'en'), note: 'Use a valid BCP 47 language code such as "en" or "en-US".' };
    case 'document-title':
      return { code: '<title>Page purpose - Site name</title>', note: 'Every page needs a unique, descriptive <title>.' };
    case 'page-has-heading-one':
      return { code: '<h1>Main page heading</h1>', note: 'Add one <h1> that describes the page content.' };
    case 'landmark-one-main':
    case 'region':
      return {
        code: '<main id="main">\n  <!-- primary page content -->\n</main>',
        note: 'Wrap the primary content in <main> and other content in header, nav, aside, or footer landmarks.',
      };
    case 'heading-order':
      return { code: html, note: 'Heading levels should increase by one. Change this heading to the next level after the previous heading, and style it with CSS if needed.' };
    case 'color-contrast':
    case 'color-contrast-enhanced':
      if (contrast?.suggestedFg) {
        return {
          code: `color: ${contrast.suggestedFg}; /* was ${contrast.fg} on ${contrast.bg} */`,
          note: `Raises contrast from ${contrast.ratio.toFixed(2)}:1 to ${contrast.suggestedRatio?.toFixed(2)}:1 (needs ${contrast.required}:1). Hue and saturation are kept.`,
        };
      }
      return {
        code: '',
        note: 'The background could not be determined (for example, text over an image or gradient). Add a solid background or text shadow behind the text and re-test.',
      };
    default:
      return { code: '', note: 'See the failure summary and the rule documentation for how to fix this.' };
  }
}
