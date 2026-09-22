const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const DIST = path.resolve(__dirname, "..", "dist");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".txt": "text/plain", ".xml": "application/xml", ".json": "application/json", ".mp4": "video/mp4" };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  let file = path.join(DIST, p);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, p, "index.html");
  if (!fs.existsSync(file)) file = path.join(DIST, "index.html");
  res.setHeader("Content-Type", MIME[path.extname(file)] || "application/octet-stream");
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise((r) => server.listen(4173, r));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("CONSOLE: " + m.text()); });
  await page.goto("http://localhost:4173/", { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(6000);
  const info = await page.evaluate(() => {
    const r = document.getElementById("root");
    return {
      mounted: r ? r.classList.contains("react-mounted") : false,
      failed: r ? r.classList.contains("react-failed") : false,
      children: r ? r.children.length : 0,
      hasNav: !!document.querySelector("nav, header"),
      textLen: (document.body.innerText || "").length,
    };
  });
  console.log(JSON.stringify(info));
  console.log(errors.slice(0, 10).join("\n") || "no errors");
  await browser.close();
  server.close();
  process.exit(info.mounted && info.textLen > 500 && errors.length === 0 ? 0 : 1);
})();
