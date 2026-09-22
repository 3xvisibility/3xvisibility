const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("CONSOLE: " + m.text()); });
  page.on("requestfailed", (r) => errors.push("REQFAIL: " + r.url() + " " + ((r.failure() || {}).errorText || "")));
  const resp = await page.goto("https://www.3xvisibility.com/", { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(6000);
  const info = await page.evaluate(() => {
    const r = document.getElementById("root");
    const fb = r ? r.querySelector("[data-fallback-content]") : null;
    return {
      cls: r ? r.className : "no-root",
      mounted: r ? r.classList.contains("react-mounted") : false,
      failed: r ? r.classList.contains("react-failed") : false,
      fbVisible: fb ? getComputedStyle(fb).display !== "none" : false,
      children: r ? r.children.length : 0,
    };
  });
  console.log("status", resp.status());
  console.log(JSON.stringify(info));
  console.log(errors.slice(0, 20).join("\n") || "no errors");
  await browser.close();
})();
