/**
 * Local replica of the `analyze-website-free` edge function scoring logic,
 * used to measure the 3xVisibility site's own audit score deterministically.
 *
 * It mirrors supabase/functions/analyze-website-free/index.ts exactly:
 * same signal extraction, same checks, same weighting (40/30/30).
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function text(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i"));
  return m ? m[1].trim() : "";
}

function metaContent(html, key, kind) {
  const re = new RegExp(`<meta[^>]*${kind}\\s*=\\s*["']${key}["'][^>]*>`, "i");
  const tag = html.match(re)?.[0];
  return tag ? attr(tag, "content") : "";
}

function score(checks) {
  if (!checks.length) return 0;
  const pts = checks.reduce((s, c) => s + (c.status === "good" ? 1 : c.status === "warn" ? 0.5 : 0), 0);
  return Math.round((pts / checks.length) * 100);
}

function analyzeHtml(html, target) {
  const origin = new URL(target).origin;
  const host = new URL(target).hostname;

  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim();
  const description = metaContent(html, "description", "name");
  const canonical = attr(html.match(/<link[^>]*rel\s*=\s*["']canonical["'][^>]*>/i)?.[0] ?? "", "href");
  const ogTitle = metaContent(html, "og:title", "property");
  const ogImage = metaContent(html, "og:image", "property");
  const viewport = metaContent(html, "viewport", "name");
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => text(m[1])).filter(Boolean);
  const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].length;
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const imgsNoAlt = imgs.filter((t) => !attr(t, "alt")).length;
  const links = [...html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  const internalLinks = links.filter((h) => h.startsWith("/") || h.startsWith(origin)).length;
  const jsonLd = [...html.matchAll(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const bodyText = text(html);
  const words = bodyText ? bodyText.split(/\s+/).length : 0;
  const isHttps = target.startsWith("https://");

  // robots/sitemap: read from the public folder when scoring a local build
  let robotsOk = null;
  let sitemapOk = null;
  const robotsPath = resolve("public/robots.txt");
  if (existsSync(robotsPath)) {
    const txt = readFileSync(robotsPath, "utf8");
    robotsOk = !/^\s*disallow:\s*\/\s*$/im.test(txt);
    sitemapOk = /sitemap:/i.test(txt);
  }
  if (!sitemapOk && existsSync(resolve("public/sitemap.xml"))) sitemapOk = true;

  const seo = [
    { id: "title", label: "Page title", status: !title ? "bad" : title.length >= 30 && title.length <= 60 ? "good" : "warn", detail: title ? `"${title.slice(0, 70)}" — ${title.length} characters` : "No <title> tag found" },
    { id: "description", label: "Meta description", status: !description ? "bad" : description.length >= 70 && description.length <= 160 ? "good" : "warn", detail: description ? `${description.length} characters` : "Missing meta description" },
    { id: "h1", label: "H1 heading", status: h1s.length === 1 ? "good" : h1s.length === 0 ? "bad" : "warn", detail: h1s.length === 0 ? "No H1 found" : `${h1s.length} H1 tag(s)` },
    { id: "headings", label: "Heading structure", status: h2s >= 3 ? "good" : h2s >= 1 ? "warn" : "bad", detail: `${h2s} H2 section heading(s)` },
    { id: "content", label: "Content depth", status: words >= 800 ? "good" : words >= 300 ? "warn" : "bad", detail: `${words.toLocaleString()} words on the page` },
    { id: "canonical", label: "Canonical URL", status: canonical ? "good" : "warn", detail: canonical ? canonical.slice(0, 80) : "No canonical link" },
    { id: "images", label: "Image alt text", status: imgs.length === 0 ? "warn" : imgsNoAlt === 0 ? "good" : imgsNoAlt / imgs.length < 0.3 ? "warn" : "bad", detail: imgs.length ? `${imgsNoAlt} of ${imgs.length} images missing alt text` : "No images detected" },
    { id: "links", label: "Internal linking", status: internalLinks >= 10 ? "good" : internalLinks >= 3 ? "warn" : "bad", detail: `${internalLinks} internal link(s)` },
  ];

  const aiVisibility = [
    { id: "schema", label: "Structured data (JSON-LD)", status: jsonLd.length ? "good" : "bad", detail: jsonLd.length ? `${jsonLd.length} JSON-LD block(s)` : "No schema markup" },
    { id: "og", label: "Social / AI preview tags", status: ogTitle && ogImage ? "good" : ogTitle || ogImage ? "warn" : "bad", detail: `og:title ${ogTitle ? "✓" : "✗"} · og:image ${ogImage ? "✓" : "✗"}` },
    { id: "answers", label: "Answer-ready content", status: /<h[23][^>]*>[^<]*\?/i.test(html) ? "good" : "warn", detail: /<h[23][^>]*>[^<]*\?/i.test(html) ? "Question-style headings found" : "No question-based (FAQ) headings" },
    { id: "entity", label: "Brand entity clarity", status: new RegExp(host.replace(/^www\./i, "").split(".")[0], "i").test(title) ? "good" : "warn", detail: new RegExp(host.replace(/^www\./i, "").split(".")[0], "i").test(title) ? "Brand name present in the title" : "Brand name missing from the title tag" },
  ];

  const technical = [
    { id: "https", label: "HTTPS", status: isHttps ? "good" : "bad", detail: isHttps ? "Secure connection" : "Site is not served over HTTPS" },
    { id: "status", label: "HTTP response", status: "good", detail: "Status 200 (local file)" },
    { id: "viewport", label: "Mobile viewport", status: viewport ? "good" : "bad", detail: viewport ? "Responsive viewport set" : "No viewport meta tag" },
    { id: "robots", label: "robots.txt", status: robotsOk === true ? "good" : robotsOk === false ? "bad" : "warn", detail: robotsOk === true ? "Crawlable" : robotsOk === false ? "Crawlers are blocked" : "robots.txt not found" },
    { id: "sitemap", label: "XML sitemap", status: sitemapOk ? "good" : "bad", detail: sitemapOk ? "Sitemap discovered" : "No sitemap found" },
  ];

  const seoScore = score(seo);
  const aiScore = score(aiVisibility);
  const techScore = score(technical);
  const overall = Math.round(seoScore * 0.4 + aiScore * 0.3 + techScore * 0.3);
  const issues = [...seo, ...aiVisibility, ...technical].filter((c) => c.status !== "good");

  return {
    url: target,
    host,
    title,
    description,
    overall,
    categories: [
      { key: "seo", label: "SEO foundations", score: seoScore, checks: seo },
      { key: "ai", label: "AI / GEO visibility", score: aiScore, checks: aiVisibility },
      { key: "technical", label: "Technical health", score: techScore, checks: technical },
    ],
    issueCount: issues.length,
  };
}

// CLI: node scripts/audit-local.js [path-to-html] [url]
const htmlPath = process.argv[2] || "dist/index.html";
const url = process.argv[3] || "https://www.3xvisibility.com/";

if (!existsSync(resolve(htmlPath))) {
  console.error(`File not found: ${htmlPath}`);
  process.exit(1);
}

const html = readFileSync(resolve(htmlPath), "utf8");
const report = analyzeHtml(html, url);

console.log("════════════════════════════════════════════");
console.log(`  AUDIT: ${report.host}`);
console.log("════════════════════════════════════════════");
console.log(`Title      : ${report.title.slice(0, 80)}`);
console.log(`Description: ${report.description.slice(0, 80)}`);
console.log(`Overall    : ${report.overall}/100`);
console.log(`Issues     : ${report.issueCount}`);
console.log("");
for (const cat of report.categories) {
  console.log(`── ${cat.label}: ${cat.score}% ──`);
  for (const c of cat.checks) {
    const icon = c.status === "good" ? "✓" : c.status === "warn" ? "!" : "✗";
    console.log(`  ${icon} ${c.label} — ${c.detail}`);
  }
  console.log("");
}
