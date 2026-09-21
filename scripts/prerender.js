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
 * Runs as a `postbuild` step. Designed to NEVER break a deployment:
 * Playwright is imported lazily, so a build server without the browser
 * binary simply skips prerendering and ships the crawler fallback content
 * baked into index.html instead.
 */
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

const ROUTE_META = {
  "/": {
    title: "3xVisibility — Mass-build SEO, GEO & programmatic pages",
    desc: "Automatically mass-build local SEO, programmatic SEO, GEO sites, directories and content at scale with one-click deployment. Save 40 hours per site.",
    intro: "3x Visibility is a programmatic SEO platform that turns structured data into thousands of unique, search-optimized pages and publishes them directly to WordPress, Shopify, WooCommerce and PrestaShop.",
  },
  "/about": {
    title: "About 3xVisibility — programmatic SEO & page generation",
    desc: "3xVisibility turns structured data into thousands of SEO-optimized pages published to WordPress, Shopify, WooCommerce and PrestaShop.",
    intro: "3x Visibility builds the page-generation layer for marketing teams: import a data source, map it to a template from your own design system, and publish hundreds of locally-optimized pages in one campaign.",
  },
  "/pricing": {
    title: "3xVisibility pricing — plans for programmatic SEO",
    desc: "Compare 3x Visibility plans: pages, AI generations, connected sites and support. Simple monthly or yearly pricing, cancel anytime.",
    intro: "Every plan includes the full generation engine: CSV import, template mapping, AI content and one-click publishing. Paid tiers raise the monthly page allowance, the number of connected sites and the support level.",
  },
  "/blog": {
    title: "3xVisibility blog — SEO, GEO & AEO playbooks",
    desc: "Product updates, SEO playbooks and engineering notes from the 3x Visibility team.",
    intro: "Articles on programmatic SEO, local SEO, answer-engine optimization and generative engine optimization, plus release notes from the 3x Visibility platform.",
  },
  "/contact": {
    title: "Contact 3xVisibility — sales & support",
    desc: "Get in touch with the 3x Visibility team for sales questions, onboarding help or support with your page-generation campaigns.",
    intro: "Reach the 3x Visibility team by email or the contact form. Tell us about your data source and target platforms and we will recommend the shortest path to published pages.",
  },
  "/changelog": {
    title: "3xVisibility changelog — updates & new features",
    desc: "Recent improvements, fixes and new features shipped to 3x Visibility — product releases listed newest first.",
    intro: "Every 3x Visibility release, newest first: what shipped, what improved and what was fixed in the page-generation platform.",
  },
  "/docs": {
    title: "3xVisibility documentation & publishing guides",
    desc: "Guides for connecting WordPress and Shopify, campaign setup, template variables and the 3x Visibility API.",
    intro: "Documentation for the 3x Visibility platform: connecting websites, building templates, mapping CSV columns, generating campaigns and publishing pages.",
  },
  "/terms": {
    title: "3xVisibility terms of service",
    desc: "The terms that govern your use of the 3x Visibility page generation and publishing service, including billing, acceptable use and liability.",
    intro: "The agreement between you and 3x Visibility covering accounts, acceptable use, billing, liability and changes to the service.",
  },
  "/cgv": {
    title: "3xVisibility general terms & conditions of sale",
    desc: "General terms and conditions governing the use of 3x Visibility page generation and publishing services, including subscriptions, licences and liability.",
    intro: "Sales terms for the 3x Visibility SaaS platform: subscriptions, licences, pricing, liability and applicable law.",
  },
  "/confidentialite": {
    title: "3xVisibility privacy policy (GDPR)",
    desc: "How 3x Visibility collects, uses and protects your personal data in accordance with the GDPR (EU) 2016/679 and the French Data Protection Act.",
    intro: "Our privacy policy: what data we collect, why we collect it, how long we keep it and your rights under the GDPR.",
  },
  "/privacy": {
    title: "3xVisibility privacy policy (GDPR)",
    desc: "How 3x Visibility collects, uses and protects your personal data in accordance with the GDPR (EU) 2016/679 and the French Data Protection Act.",
    intro: "Our privacy policy: what data we collect, why we collect it, how long we keep it and your rights under the GDPR.",
  },
  "/mentions-legales": {
    title: "3xVisibility legal notice",
    desc: "Legal information about the publisher and hosting of the 3x Visibility website, in accordance with French and European legislation (LCEN, GDPR).",
    intro: "Publisher, hosting and legal information for the 3x Visibility website.",
  },
  "/guides/wordpress": {
    title: "Publish 3xVisibility pages to WordPress",
    desc: "Step-by-step guide to connecting WordPress with Application Passwords and publishing generated pages to Elementor or Gutenberg.",
    intro: "Connect WordPress to 3x Visibility with REST API Application Passwords, choose Elementor or Gutenberg output, and publish generated pages without touching your theme.",
  },
  "/guides/shopify": {
    title: "Publish 3xVisibility pages to Shopify",
    desc: "Step-by-step guide to connecting a Shopify store via the Admin API and publishing theme-aware generated pages.",
    intro: "Connect a Shopify store through the Admin API, preview generated pages inside your live theme, and publish without breaking your storefront design.",
  },
  "/blog/seo-vs-aeo-vs-geo": {
    title: "SEO vs AEO vs GEO: three engines of search — 3xVisibility",
    desc: "Search is no longer one game. Learn how Search, Answer and Generative engine optimisation work — and how to win all three at once.",
    intro: "SEO earns the blue link, AEO earns the answer box, GEO earns the named citation in generative AI recommendations. Here is what each engine rewards.",
  },
  "/blog/programmatic-seo-2026": {
    title: "Programmatic SEO in 2026: what actually works — 3xVisibility",
    desc: "A field guide to building thousands of pages that rank — without getting flagged.",
    intro: "Quality at scale: how to build programmatic page sets that genuinely help users and survive algorithm updates.",
  },
  "/blog/shopify-publishing": {
    title: "Publishing to Shopify without breaking your theme — 3xVisibility",
    desc: "How 3x Visibility's theme adapter keeps generated pages pixel-perfect inside any Shopify theme.",
    intro: "Why generated content usually breaks Shopify themes, and how a theme-aware adapter keeps every published page on-brand.",
  },
  "/blog/ai-templates": {
    title: "AI templates: from CSV to live page in 60 seconds — 3xVisibility",
    desc: "Walkthrough of the AI Template Builder and the spintax engine behind it.",
    intro: "How a single CSV becomes a fleet of unique, on-brand pages through the AI Template Builder and spintax engine.",
  },
};

function escHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escAttr(s) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function generateFallbackRoutes() {
  const template = readFileSync(join(DIST, "index.html"), "utf8");
  let written = 0;
  for (const route of routes) {
    const meta = ROUTE_META[route];
    if (!meta) continue;
    const url = `https://www.3xvisibility.com${route === "/" ? "/" : route}`;
    let html = template;
    html = html.replace(/(<title data-fallback-seo>)[\s\S]*?(<\/title>)/, `$1${escHtml(meta.title)}$2`);
    html = html.replace(/(<meta data-fallback-seo\s+name="description"\s+content=")[\s\S]*?("\s*\/>)/, `$1${escAttr(meta.desc)}$2`);
    html = html.replace(/(<link data-fallback-seo rel="canonical" href=")[^"]*(")/, `$1${url}$2`);
    html = html.replace(/(<meta data-fallback-seo property="og:url" content=")[^"]*(")/, `$1${url}$2`);
    html = html.replace(/(<meta data-fallback-seo property="og:title" content=")[^"]*(")/, `$1${escAttr(meta.title)}$2`);
    html = html.replace(/(<meta data-fallback-seo\s+property="og:description"\s+content=")[\s\S]*?("\s*\/>)/, `$1${escAttr(meta.desc)}$2`);
    html = html.replace(/(<h1 data-fallback-h1>)[\s\S]*?(<\/h1>)/, `$1${escHtml(meta.title)}$2`);
    html = html.replace(/(<\/h1>\s*<p>\s*<img[\s\S]*?\/>\s*<\/p>\s*<p>)[\s\S]*?(<\/p>)/, `$1${escHtml(meta.intro)}$2`);
    const outDir = route === "/" ? DIST : join(DIST, route);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "index.html"), html, "utf8");
    written++;
  }
  console.log(`✓ wrote crawler fallback HTML for ${written} route(s)`);
}

async function main() {
  if (!existsSync(join(DIST, "index.html"))) {
    console.error("⚠ dist/index.html not found — run `vite build` first.");
    process.exit(0);
  }

  if (process.env.VERCEL || process.env.FORCE_FALLBACK) {
    generateFallbackRoutes();
    process.exit(0);
  }

  // Lazily import Playwright: on build servers where it isn't installed
  // (or the browser binary is missing) we degrade gracefully instead of
  // crashing the whole deployment.
  let chromium;
  try {
    chromium = (await import("playwright")).chromium;
  } catch (e) {
    console.log("⚠ Playwright module unavailable — writing per-route crawler fallback HTML instead.");
    console.log("  Reason:", String(e?.message || e).split("\n")[0]);
    generateFallbackRoutes();
    process.exit(0);
  }

  let browser;
  try {
    browser = await chromium.launch();
  } catch (e) {
    console.log("⚠ Playwright browser missing — attempting install…");
    try {
      const { execSync } = await import("child_process");
      execSync("npx playwright install chromium", { stdio: "inherit", timeout: 240000 });
      browser = await chromium.launch();
    } catch (installErr) {
      console.log(
        "⚠ Prerendering skipped (no Playwright browser available). " +
          "The site still works as a normal SPA; crawler fallback content is in index.html.",
      );
      console.log("  Reason:", String(installErr?.message || installErr).split("\n")[0]);
      generateFallbackRoutes();
      process.exit(0);
    }
  }

  const server = await startServer();
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
      let html = await page.content();

      // The static index.html ships fallback SEO tags (title/description/
      // canonical/OG) for when prerendering can't run. Now that the page's own
      // helmet tags are present, remove the fallbacks to avoid duplicates.
      // Keep the fallback <title> only if no helmet title was injected.
      const hasHelmetTitle = /<title[^>]*data-rh="true"[^>]*>/i.test(html);
      html = html.replace(
        new RegExp(
          `(<(?:title|meta|link)\\b[^>]*\\bdata-fallback-seo\\b[^>]*>)`,
          hasHelmetTitle ? "gi" : "",
        ),
        hasHelmetTitle ? "" : "$1",
      );
      if (!hasHelmetTitle) {
        // Promote the fallback title out of the "fallback" set so it isn't
        // treated as a duplicate, but keep it as the page title.
        html = html.replace(/<title([^>]*)\bdata-fallback-seo\b([^>]*)>/i, "<title$1$2>");
      }

      // The crawler-only <noscript> summary is redundant once the real rendered
      // page content is present — remove it so there is no duplicate H1/headings.
      html = html.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "");

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
  // Never fail the deployment itself: prerendering is an enhancement.
  process.exit(0);
}

main().catch((e) => {
  // Prerendering is best-effort. Any unexpected failure must not break the
  // real deployment — the crawler fallback content in index.html covers it.
  console.log("⚠ Prerendering skipped due to an unexpected error. Deployment continues.");
  console.log("  Reason:", String(e?.message || e).split("\n")[0]);
  process.exit(0);
});
