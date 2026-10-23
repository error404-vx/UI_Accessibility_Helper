import type { HeadingInfo, LandmarkInfo, StructureReport } from '../../shared/types';

export interface RawStructure {
  title: string;
  lang: string;
  headings: HeadingInfo[];
  landmarks: LandmarkInfo[];
}

export function analyzeStructure(raw: RawStructure, ariaSnapshot: string): StructureReport {
  const problems: string[] = [];
  const headings = raw.headings.map((h) => ({ ...h }));

  if (!raw.title.trim()) problems.push('The page has no <title>.');
  if (!raw.lang.trim()) problems.push('The <html> element has no lang attribute.');

  const h1Count = headings.filter((h) => h.level === 1).length;
  if (headings.length === 0) problems.push('The page has no headings. Screen reader users navigate by headings.');
  else if (h1Count === 0) problems.push('The page has no <h1>.');
  else if (h1Count > 1) problems.push(`The page has ${h1Count} <h1> headings. Use one <h1> for the page title.`);

  let previous = 0;
  let skipped = 0;
  for (const heading of headings) {
    if (heading.level === 1 && h1Count > 1 && previous !== 0) heading.problem = 'Additional <h1>';
    if (previous > 0 && heading.level > previous + 1) {
      heading.problem = `Skips from h${previous} to h${heading.level}`;
      skipped += 1;
    }
    if (heading.text === '(empty heading)') heading.problem = 'Empty heading';
    previous = heading.level;
  }
  if (skipped > 0) problems.push(`${skipped} heading${skipped > 1 ? 's skip' : ' skips'} a level (e.g. h2 to h4).`);

  if (!raw.landmarks.some((l) => l.role === 'main')) problems.push('No <main> landmark. Add <main> so users can jump to the content.');
  if (!raw.landmarks.some((l) => l.role === 'navigation')) problems.push('No <nav> landmark found.');

  return { title: raw.title, lang: raw.lang, headings, landmarks: raw.landmarks, problems, ariaSnapshot };
}
