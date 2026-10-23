const heroSvg =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='400'%3E%3Crect width='1200' height='400' fill='%2338bdf8'/%3E%3Ccircle cx='1000' cy='90' r='60' fill='%23fde047'/%3E%3Cpath d='M0 300 Q300 240 600 300 T1200 300 V400 H0Z' fill='%230ea5e9'/%3E%3C/svg%3E";
const iconSvg =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Ccircle cx='12' cy='12' r='10' fill='%23334155'/%3E%3C/svg%3E";

/** A deliberately broken page used for demos and integration tests. */
export const DEMO_HTML = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Seaside Shop - Demo page with accessibility problems</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; color: #222; background: #fff; }
    header, footer { padding: 16px 24px; background: #f1f5f9; }
    .content { padding: 24px; max-width: 960px; }
    .muted { color: #b0b0b0; }
    .promo { background: #38bdf8; color: #ffffff; padding: 12px; }
    .icon-btn { border: 0; background: transparent; padding: 4px; cursor: pointer; }
    .icon-btn:focus { outline: none; }
    .card { border: 1px solid #ddd; padding: 16px; margin: 12px 0; border-radius: 8px; }
    .skip { position: absolute; left: -9999px; }
    .skip:focus { left: 8px; top: 8px; background: #fff; }
  </style>
</head>
<body>
  <a class="skip" href="#content">Skip to content</a>
  <header>
    <a href="/"><img src="${iconSvg}"></a>
    <a href="/cart"><svg width="20" height="20"><circle cx="10" cy="10" r="8"/></svg></a>
    <button class="icon-btn"><svg width="20" height="20"><rect width="16" height="16" x="2" y="2"/></svg></button>
  </header>
  <div class="content">
    <h1>Seaside Shop</h1>
    <img class="hero" src="${heroSvg}" loading="lazy" style="width:100%">
    <p class="muted">Free shipping on all beach towels this week only.</p>
    <p class="promo">Summer sale: 30% off sunglasses</p>
    <h4>Featured products</h4>
    <div class="card">
      <h1>Beach umbrella</h1>
      <img src="${iconSvg}" width="24">
      <p>Stays put in strong winds. <a href="/umbrella">Click here</a></p>
    </div>
    <h2>Newsletter</h2>
    <form>
      <input type="email" placeholder="Your email">
      <select><option>Weekly</option><option>Monthly</option></select>
      <button type="submit"></button>
    </form>
  </div>
  <footer>
    <p class="muted">&copy; 2026 Seaside Shop</p>
  </footer>
</body>
</html>`;
