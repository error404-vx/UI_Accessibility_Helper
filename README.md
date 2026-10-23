# UI Accessibility Helper

Scan a URL or pasted HTML and get a prioritized, fix-oriented report covering:

- **The six most common WCAG failures:** low contrast, missing alt text, missing form labels, empty links, empty buttons, missing language. Each issue comes with a screenshot highlight and copy-ready fix code.
- **Contrast fixer:** nearest passing colors (same hue), a live preview, and export as CSS variables or a Tailwind config.
- **Page structure:** heading outline, landmarks, and the accessibility tree as a screen reader receives it.
- **Keyboard map:** the recorded Tab order drawn over the screenshot, plus focus trap, skip-link, and focus-visibility checks.
- **Performance:** LCP, CLS, TBT, FCP, and TTFB, plus anti-pattern checks: a lazy-loaded LCP image, missing `fetchpriority`, unsized images, third-party scripts, and fonts without preload.
- **History, compare, and export:** scans are saved in the browser (IndexedDB). You can compare before/after scans and export as Markdown, JSON, or PDF (print).

## Requirements

- Node.js 20+ (tested with Node 22)

## Getting started

```bash
npm install        # also downloads headless Chromium for Playwright
npm run dev        # UI: http://localhost:5173  (API on :5174)
```

Click **Try the demo page** to scan a built-in page with deliberate problems.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Vite dev server and API with auto-reload |
| `npm run build` | Type-check and build the UI into `dist/` |
| `npm start` | Serve the built UI and the API on http://127.0.0.1:5174 |
| `npm test` | Unit, integration (real Chromium), and HTTP API tests |
| `npm run typecheck` | TypeScript only |

Set `E2E_ONLINE=1` to also run a live scan of https://example.com in the tests.

## Configuration (environment variables)

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `5174` | API/server port |
| `HOST` | `127.0.0.1` | Bind address |
| `ALLOW_PRIVATE_URLS` | unset | Set to `true` to scan `localhost` and private network sites (for example, your own dev server) |
| `MAX_CONCURRENT_SCANS` | `2` | Number of scans that can run in parallel |
| `SCAN_RATE_LIMIT` | `20` | Scans per minute per client |

## Security notes

- URL scans are protected against SSRF. Private, loopback, link-local, and metadata IP addresses are blocked. This check runs on the initial URL, on every request the page makes, and on the final URL after redirects.
- Pasted HTML is rendered with all network requests blocked.
- The API validates input, limits body size, rate-limits scans, and sets CSP and other security headers.

## Project layout

```
server/   Express API, Playwright + axe-core scan pipeline, URL guard
shared/   Types and logic shared by the UI and the server (color math, scoring, export, compare)
src/      React UI (pages, report sections, components)
tests/    Vitest tests
```
