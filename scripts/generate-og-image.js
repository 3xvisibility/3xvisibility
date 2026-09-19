/**
 * Generates the social preview (Open Graph / Twitter) image for the site.
 *
 * Uses Playwright (already a devDependency) to render a 1200x630 HTML canvas
 * to PNG — no extra native dependencies required. The design mirrors the
 * site's existing green branding on a light background.
 */
import { chromium } from "playwright";
import { writeFileSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUT = resolve(__dirname, "..", "public", "og-image.png");

const logoSrc = readFileSync(resolve(__dirname, "..", "src", "assets", "logo-3x.png")).toString("base64");

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }
  body { width:1200px; height:630px; overflow:hidden; background:#f6f8f4; }
  .wrap { position:relative; width:1200px; height:630px;
    background:
      radial-gradient(ellipse 700px 420px at 78% 18%, rgba(74,124,26,0.14), transparent 60%),
      radial-gradient(ellipse 600px 400px at 12% 88%, rgba(74,124,26,0.10), transparent 60%),
      linear-gradient(180deg,#f8faf5 0%, #eef3e8 100%);
  }
  .inner { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:center; padding:0 88px; }
  .logo { height:64px; width:auto; margin-bottom:34px; }
  h1 { font-size:62px; line-height:1.08; letter-spacing:-0.03em; color:#15210d; font-weight:800; max-width:980px; }
  h1 .accent { color:#4a7c1a; }
  p { margin-top:24px; font-size:26px; color:#4d5a48; max-width:900px; line-height:1.4; }
  .chips { margin-top:38px; display:flex; gap:14px; }
  .chip { font-size:20px; font-weight:700; color:#3d6612; background:rgba(74,124,26,0.10);
    border:1px solid rgba(74,124,26,0.28); padding:10px 20px; border-radius:999px; }
  .bar { position:absolute; left:0; top:0; bottom:0; width:14px; background:linear-gradient(180deg,#6ba31f,#3d6612); }
</style></head>
<body>
  <div class="wrap">
    <div class="bar"></div>
    <div class="inner">
      <img class="logo" src="data:image/png;base64,${logoSrc}" alt="3x Visibility">
      <h1>Mass-build SEO, GEO &amp; <span class="accent">programmatic pages</span> at scale</h1>
      <p>Automatically build local SEO pages, programmatic SEO sites, directories and content — published to WordPress, Shopify, WooCommerce &amp; PrestaShop.</p>
      <div class="chips">
        <span class="chip">Programmatic SEO</span>
        <span class="chip">Local SEO</span>
        <span class="chip">AEO &amp; GEO</span>
        <span class="chip">AI content</span>
      </div>
    </div>
  </div>
</body></html>`;

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const buffer = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: 1200, height: 630 } });
  await browser.close();
  writeFileSync(OUT, buffer);
  console.log(`✓ wrote ${OUT} (${buffer.length.toLocaleString()} bytes)`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
