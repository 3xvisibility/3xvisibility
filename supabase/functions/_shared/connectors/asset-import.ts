/**
 * Elementor / WordPress Asset Import System.
 *
 * Before a page is published, every external asset referenced by the HTML
 * template (images, background images, SVGs, icons, CSS `url(...)` references)
 * is downloaded and uploaded into the WordPress Media Library. The original URL
 * is then rewritten to the uploaded Media Library URL so the published page
 * never depends on the source site, and never ships broken relative paths like
 * `images/`, `assets/`, `../img/` or `./images/`.
 */

export interface MediaUploader {
  /** Upload a remote asset URL into WP media; resolve to the new media URL or null. */
  (sourceUrl: string): Promise<string | null>;
}

const ASSET_EXT = /\.(png|jpe?g|gif|webp|avif|svg|ico|bmp|tiff?)(\?[^)"'\s]*)?$/i;

function isHttpUrl(u: string): boolean {
  return /^https?:\/\//i.test(u);
}

/** Collect every asset URL referenced in the HTML (img src/srcset, CSS url(...)). */
export function collectAssetUrls(html: string): string[] {
  const urls = new Set<string>();

  // img src / poster
  const attrRe = /\b(?:src|poster)\s*=\s*("([^"]*)"|'([^']*)')/gi;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(html)) !== null) {
    const v = (m[2] ?? m[3] ?? "").trim();
    if (v) urls.add(v);
  }

  // srcset (comma-separated "url widthDescriptor")
  const srcsetRe = /\bsrcset\s*=\s*("([^"]*)"|'([^']*)')/gi;
  while ((m = srcsetRe.exec(html)) !== null) {
    const v = (m[2] ?? m[3] ?? "").trim();
    for (const part of v.split(",")) {
      const url = part.trim().split(/\s+/)[0];
      if (url) urls.add(url);
    }
  }

  // CSS url(...) — inline styles and <style> blocks
  const cssUrlRe = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
  while ((m = cssUrlRe.exec(html)) !== null) {
    const v = (m[2] ?? "").trim();
    if (v && !v.startsWith("data:")) urls.add(v);
  }

  return [...urls].filter(
    (u) => !u.startsWith("data:") && (isHttpUrl(u) || ASSET_EXT.test(u))
  );
}

/** Resolve a possibly-relative URL against an optional base origin. */
function resolveUrl(url: string, baseUrl?: string): string | null {
  if (isHttpUrl(url)) return url;
  if (url.startsWith("//")) return "https:" + url;
  if (!baseUrl) return null; // can't resolve relative paths without a base
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return null;
  }
}

/** Replace every occurrence of an original URL with its uploaded URL. */
function replaceAll(html: string, from: string, to: string): string {
  return html.split(from).join(to);
}

/**
 * Import all assets referenced in `html` into the Media Library and return the
 * HTML with every asset URL rewritten to its uploaded Media Library URL.
 */
export async function importHtmlAssets(
  html: string,
  upload: MediaUploader,
  baseUrl?: string,
  options: { maxAssets?: number; maxMs?: number } = {},
): Promise<string> {
  if (!html) return html;
  const maxAssets = options.maxAssets ?? 8;
  const maxMs = options.maxMs ?? 45_000;
  const startedAt = Date.now();
  const urls = collectAssetUrls(html).slice(0, maxAssets);
  if (urls.length === 0) return html;

  let result = html;
  // Sequential to avoid hammering the host; dedupe already handled by Set.
  for (const original of urls) {
    if (Date.now() - startedAt > maxMs) break;
    const absolute = resolveUrl(original, baseUrl);
    if (!absolute) continue;
    try {
      const uploaded = await upload(absolute);
      if (uploaded && uploaded !== original) {
        result = replaceAll(result, original, uploaded);
      }
    } catch {
      // Best effort: keep original URL on failure.
    }
  }
  return result;
}
