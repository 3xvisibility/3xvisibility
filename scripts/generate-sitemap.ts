// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://3xvisibility.com";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

// Blog slugs come from the same source the /blog route reads.
function blogSlugs(): string[] {
  try {
    const src = readFileSync(resolve("src/data/blog.ts"), "utf8");
    const matches = [...src.matchAll(/^\s*slug:\s*"([^"]+)"/gm)].map((m) => m[1]);
    return [...new Set(matches)];
  } catch {
    return [];
  }
}

// Only public, indexable routes. Dashboard/auth/admin routes are intentionally excluded.
// No <lastmod>: the project has no authoritative per-page change timestamp.
const entries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/about", changefreq: "monthly", priority: "0.7" },
  { path: "/blog", changefreq: "weekly", priority: "0.8" },
  ...blogSlugs().map((slug) => ({
    path: `/blog/${slug}`,
    changefreq: "monthly" as const,
    priority: "0.7",
  })),
  { path: "/docs", changefreq: "monthly", priority: "0.8" },
  { path: "/guides/wordpress", changefreq: "monthly", priority: "0.7" },
  { path: "/guides/shopify", changefreq: "monthly", priority: "0.7" },
  { path: "/contact", changefreq: "monthly", priority: "0.6" },
  { path: "/changelog", changefreq: "weekly", priority: "0.5" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/cgv", changefreq: "yearly", priority: "0.3" },
  { path: "/confidentialite", changefreq: "yearly", priority: "0.3" },
  { path: "/mentions-legales", changefreq: "yearly", priority: "0.3" },
];

function generateSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries));
console.log(`sitemap.xml written (${entries.length} entries)`);
