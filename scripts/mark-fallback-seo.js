/**
 * One-off helper: marks the fallback SEO tags in index.html with a
 * `data-fallback-seo` attribute so scripts/prerender.js can strip them
 * before writing the per-route HTML (avoids duplicate canonical/title).
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const file = resolve("index.html");
let html = readFileSync(file, "utf8");

const patterns = [
  /<title>/,
  /<meta\s+name="description"/,
  /<meta\s+name="robots"/,
  /<link\s+rel="canonical"/,
  /<meta\s+property="og:type"/,
  /<meta\s+property="og:site_name"/,
  /<meta\s+property="og:url"/,
  /<meta\s+property="og:title"/,
  /<meta\s+property="og:description"/,
  /<meta\s+property="og:image"/,
  /<meta\s+name="twitter:card"/,
  /<meta\s+name="twitter:image"/,
];

let count = 0;
for (const re of patterns) {
  html = html.replace(re, (m) => {
    if (m.includes("data-fallback-seo")) return m;
    count++;
    return m.replace(/^<([a-z]+)/, (tag, name) => {
      const attrs = tag.endsWith("/") ? " data-fallback-seo" : " data-fallback-seo";
      return `<${name}${attrs}`;
    });
  });
}

writeFileSync(file, html);
console.log(`✓ marked ${count} fallback SEO tags in index.html`);
