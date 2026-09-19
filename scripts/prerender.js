/**
 * Build-time prerendering for the 3xVisibility SPA.
 *
 * The app is a client-side rendered React SPA. Without prerendering, any
 * crawler / AI system / audit bot that fetches raw HTML sees only an empty
 * <div id="root"></div> — no H1, no content, no links, no images.
 *
 * This script renders every public route to static HTML after `vite build`,
 * so the initial HTML payload contains the full page content (headings,
 * text, internal links, images, FAQ questions, JSON-LD). React then
 * hydrates/re-renders on the client exactly as before — the design,
 * animations and interactivity are unchanged.
 *
 * Runs as a `postbuild` step.
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "fs";
import { resolve, dirname, join } from "path";
import { createServer } from "http";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DIST = resolve(__dirname, "..", "dist");
const PORT = 4517;

// Public, indexable routes. Blog slugs are read from the same source the
// /blog route reads so the prerendered set always matches the live content.
function blogSlugs() {
  try {
    const src = readFileSync(resolve(__dirname, "..", "src", "data", "blog.ts"), "utf8");
    const matches = [...src.matchAll(/^\s*slug:\s*"([^"]+)"/gm)].map((m) => m[1]);
    return [...new Set(matches)];
  } catch {
    return [];
  }
}

const routes = [
  "/",
  "/about",
  "/blog",
  ...blogSlugs().map((s) => `/blog/${s}`),
  "/docs",
  "/guides/wordpress",
  "/guides/shopify",
  "/pricing",
  "/contact",
  "/changelog",
  "/terms",
  "/cgv",
  "/confidentialite",
  "/mentions-legales",
  "/privacy",
];

// Minimal static file server with SPA fallback to index.html.
const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
  ".zip": "application/zip",
  ".csv": "text/csv",
  ".webp": "image/webp",
};

function startServer() {
  return new Promise((resolvePromise) => {
    const server = createServer((req, res) => {
      let pathname = decodeURIComponent(new URL(req.url, `http://localhost:${PORT}`).pathname);
      let filePath = join(DIST, pathname);

      if (pathname === "/" || !existsSync(filePath) || !filePath.startsWith(DIST)) {
        filePath = join(DIST, "index.html");
      } else if (existsSync(filePath) && statIsDir(filePath)) {
        const idx = join(filePath, "index.html");
        filePath = existsSync(idx) ? idx : join(DIST, "index.html");
      }

      const ext = filePath.slice(filePath.lastIndexOf("."));
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      res.end(readFileSync(filePath));
    });
    server.listen(PORT, () => resolvePromise(server));
  });
}

function statIsDir(p) {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

async function main() {
  if (!existsSync(join(DIST, "index.html"))) {
    console.error("⚠ dist/index.html not found — run `vite build` first.");
    process.exit(1);
  }

  const server = await startServer();
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 2400 },
    // A desktop-like UA keeps layout/animation code on its default path.
    userAgent: "Mozilla/5.0 (compatible; 3xVisibilityPrerender/1.0)",
  });

  let ok = 0;
  let failed = 0;

  for (const route of routes) {
    try {
      const url = `http://localhost:${PORT}${route}`;
      await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });

      // Wait for the app to settle: React render + helmet meta + animations.
      await page.waitForTimeout(1400);

      // Trigger any whileInView reveal animations by scanning the page.
      await page.evaluate(() => {
        window.scrollTo(0, 0);
        const els = document.querySelectorAll("section, [class*='ScrollReveal']");
        els.forEach((el) => {
          el.scrollIntoView({ behavior: "instant", block: "start" });
        });
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(500);

      // Grab the fully rendered DOM including helmet-injected <head> content.
      const html = await page.content();

      // Write to dist/<route>/index.html (or dist/index.html for "/").
      const outDir = route === "/" ? DIST : join(DIST, route);
      mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, "index.html"), html, "utf8");
      console.log(`✓ ${route}`);
      ok++;
    } catch (e) {
      console.error(`✗ ${route} — ${e.message}`);
      failed++;
    }
  }

  await browser.close();
  await new Promise((r) => server.close(r));

  console.log(`\nPrerendered ${ok} route(s), ${failed} failed.`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
