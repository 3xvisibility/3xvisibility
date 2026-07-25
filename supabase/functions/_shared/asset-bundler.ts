/**
 * HTML-only (v1) asset bundler.
 *
 * Published pages must be a 1:1 copy of the preview. That only holds when every
 * asset the template references (CSS, JS, images, fonts, video posters) still
 * resolves from the *published* domain, which is almost never the same origin
 * the template was scanned/imported from.
 *
 * This module:
 *  - resolves `<base href>` and then removes it (CMS pages have their own base),
 *  - rewrites every relative/protocol-relative asset URL to an absolute URL,
 *    including `srcset`, `poster`, `data-src`, inline `style="...url()"` and
 *    `url(...)` inside `<style>` blocks (that is where @font-face lives),
 *  - keeps stylesheet / preload / font / preconnect `<link>` tags alive so the
 *    design and typography survive the head-stripping done for CMS publishes.
 *
 * It never inlines or re-hosts binaries — assets keep pointing at their original
 * CDN/origin, which is what makes the published render identical to the preview.
 */

const ASSET_URL_ATTRS = [
  "src",
  "href",
  "poster",
  "data-src",
  "data-lazy-src",
  "data-bg",
  "data-background",
  "data-background-image",
  "data-original",
];

/** Links that must survive `stripHeadTagsForCms` because they carry design. */
const DESIGN_LINK_RELS = /\b(stylesheet|preload|prefetch|preconnect|dns-prefetch|modulepreload)\b/i;

function isSkippableUrl(url: string): boolean {
  if (!url) return true;
  const u = url.trim();
  if (!u) return true;
  return (
    u.startsWith("#") ||
    u.startsWith("data:") ||
    u.startsWith("blob:") ||
    u.startsWith("mailto:") ||
    u.startsWith("tel:") ||
    u.startsWith("javascript:") ||
    u.startsWith("{{") ||
    /^https?:\/\//i.test(u)
  );
}

function absolutize(url: string, base: URL | null): string {
  const raw = url.trim();
  if (raw.startsWith("//")) return `https:${raw}`;
  if (isSkippableUrl(raw) || !base) return url;
  try {
    return new URL(raw, base).toString();
  } catch {
    return url;
  }
}

function rewriteSrcset(value: string, base: URL | null): string {
  return value
    .split(",")
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return "";
      const [u, ...rest] = trimmed.split(/\s+/);
      return [absolutize(u, base), ...rest].join(" ");
    })
    .filter(Boolean)
    .join(", ");
}

function rewriteCssUrls(css: string, base: URL | null): string {
  if (!base) return css;
  return css
    .replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (m, q, u) => {
      const next = absolutize(u, base);
      return next === u ? m : `url(${q}${next}${q})`;
    })
    .replace(/@import\s+(['"])([^'"]+)\1/gi, (m, q, u) => {
      const next = absolutize(u, base);
      return next === u ? m : `@import ${q}${next}${q}`;
    });
}

/** Pull the `<base href>` value (if any) out of the document. */
export function extractBaseHref(html: string): string | null {
  const m = html.match(/<base\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/i);
  return m ? m[1] : null;
}

/**
 * Guess the origin the template came from by looking at the absolute asset URLs
 * it already contains. Used when no explicit base URL is known.
 */
export function inferAssetBase(html: string): string | null {
  const counts = new Map<string, number>();
  const re = /(?:src|href)\s*=\s*["'](https?:\/\/[^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (!/\.(css|js|png|jpe?g|gif|svg|webp|avif|woff2?|ttf|otf|mp4|webm)(\?|#|$)/i.test(m[1])) continue;
    try {
      const origin = new URL(m[1]).origin;
      counts.set(origin, (counts.get(origin) || 0) + 1);
    } catch { /* ignore */ }
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [origin, count] of counts) {
    if (count > bestCount) { best = origin; bestCount = count; }
  }
  return best;
}

export interface BundleAssetsOptions {
  /** Origin/URL the template HTML was authored or scanned from. */
  baseUrl?: string | null;
}

export interface BundleAssetsResult {
  html: string;
  /** Base URL actually used for resolution (null when nothing could be inferred). */
  baseUsed: string | null;
  /** How many URLs were rewritten — handy for publish timelines/logs. */
  rewritten: number;
}

/**
 * Rewrite every asset reference in `html` so it resolves from anywhere.
 */
export function bundleTemplateAssets(
  html: string,
  options: BundleAssetsOptions = {},
): BundleAssetsResult {
  if (!html) return { html, baseUsed: null, rewritten: 0 };

  const baseCandidate =
    options.baseUrl || extractBaseHref(html) || inferAssetBase(html);
  let base: URL | null = null;
  if (baseCandidate) {
    try {
      base = new URL(
        baseCandidate.startsWith("//") ? `https:${baseCandidate}` : baseCandidate,
      );
    } catch { base = null; }
  }

  let rewritten = 0;
  const bump = (before: string, after: string) => {
    if (before !== after) rewritten++;
    return after;
  };

  // Drop <base> — the published page lives on a different origin.
  let out = html.replace(/<base\b[^>]*>/gi, "");

  // Protocol-relative URLs are always upgradable, even without a base.
  out = out.replace(
    /(\s(?:src|href|poster|data-src|data-lazy-src)\s*=\s*["'])\/\//gi,
    (_m, p1) => { rewritten++; return `${p1}https://`; },
  );

  if (base) {
    // Plain URL attributes.
    for (const attr of ASSET_URL_ATTRS) {
      const re = new RegExp(`(\\s${attr}\\s*=\\s*)(["'])([^"']*)\\2`, "gi");
      out = out.replace(re, (m, lead, q, url) =>
        bump(m, `${lead}${q}${absolutize(url, base)}${q}`),
      );
    }

    // srcset / imagesrcset (responsive images).
    out = out.replace(
      /(\s(?:srcset|imagesrcset)\s*=\s*)(["'])([^"']*)\2/gi,
      (m, lead, q, value) => bump(m, `${lead}${q}${rewriteSrcset(value, base)}${q}`),
    );

    // <style> blocks: background images, @font-face src, @import.
    out = out.replace(
      /(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi,
      (m, open, css, close) => bump(m, `${open}${rewriteCssUrls(css, base)}${close}`),
    );

    // Inline style attributes.
    out = out.replace(
      /(\sstyle\s*=\s*)(["'])([^"']*)\2/gi,
      (m, lead, q, css) => bump(m, `${lead}${q}${rewriteCssUrls(css, base)}${q}`),
    );
  }

  return { html: out, baseUsed: base ? base.toString() : null, rewritten };
}

/** True when a `<link>` tag carries design (CSS, fonts, preconnects). */
export function isDesignLinkTag(tag: string): boolean {
  const rel = tag.match(/\brel\s*=\s*["']([^"']+)["']/i)?.[1] || "";
  if (!rel) return false;
  if (/\b(canonical|alternate|amphtml|shortlink|manifest|icon|apple-touch-icon|profile|pingback|edituri|https:\/\/api\.w\.org\/)\b/i.test(rel)) {
    // icons/canonical are metadata the CMS owns — drop them.
    return false;
  }
  return DESIGN_LINK_RELS.test(rel);
}
