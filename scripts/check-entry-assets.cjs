const fs = require("fs");
const h = fs.readFileSync("dist/index.html", "utf8");
const preloads = [...h.matchAll(/rel="modulepreload"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
const assets = [...new Set([...h.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]))];
console.log("modulepreload:", preloads.length);
console.log("entry assets:");
for (const a of assets) {
  const size = fs.statSync("dist" + a).size;
  console.log(`  ${a}  ${(size / 1024).toFixed(1)} kB`);
}
