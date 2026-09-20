import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const file = resolve("index.html");
let html = readFileSync(file, "utf8");

const m = html.match(/<noscript>([\s\S]*?)<\/noscript>/);
if (!m) {
  console.log("no noscript block found — nothing to move");
  process.exit(0);
}

let inner = m[1].trim();
inner = inner.replace(
  /<div>/,
  '<div data-fallback-content style="min-height:100vh;background:#09090b;color:#e4e4e7;font-family:system-ui,-apple-system,sans-serif;padding:56px 24px;max-width:860px;margin:0 auto;line-height:1.6">',
);
inner = inner.replace(/<h1>/, '<h1 data-fallback-h1>');

html = html.replace(/<!--\s*Crawler-visible[\s\S]*?-->\s*/, "");
html = html.replace(/<noscript>[\s\S]*?<\/noscript>/, "");
html = html.replace(/<div id="root"><\/div>/, `<div id="root">${inner}</div>`);

writeFileSync(file, html, "utf8");
console.log("moved crawler fallback content from <noscript> into #root");
