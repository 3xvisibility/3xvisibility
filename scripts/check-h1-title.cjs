const fs = require("fs");
const path = require("path");

const routes = [
  "/", "/about", "/pricing", "/blog", "/contact", "/changelog", "/docs",
  "/terms", "/cgv", "/confidentialite", "/privacy", "/mentions-legales",
  "/guides/wordpress", "/guides/shopify",
  "/blog/seo-vs-aeo-vs-geo", "/blog/programmatic-seo-2026",
  "/blog/shopify-publishing", "/blog/ai-templates",
];

const clean = (s) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
let bad = 0;

for (const r of routes) {
  const f = path.join("dist", r, "index.html");
  if (!fs.existsSync(f)) continue;
  const h = fs.readFileSync(f, "utf8");
  const title = clean((h.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "");
  const h1 = clean((h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || "");
  if (title && h1 && title === h1) {
    bad++;
    console.log(`DUPLICATE ${r}: "${title}"`);
  }
}

console.log(bad === 0 ? "OK: no H1 == title duplicates" : `${bad} duplicate(s)`);
process.exit(bad ? 1 : 0);
