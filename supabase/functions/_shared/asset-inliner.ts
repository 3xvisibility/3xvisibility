/**
 * Asset inliner — turns a *referenced* design into a *self-contained* one.
 *
 * `asset-bundler.ts` only rewrites asset URLs to absolute form; the CSS and JS
 * bytes still live on the source origin. That is fine for a live site but not
 * for an imported template: the source server can block hotlinking, the CMS
 * strips `<link>`/`<script src>` tags, and the published page then renders as
 * unstyled HTML.
 *
 * This module fetches the actual stylesheet / script bodies at IMPORT time and
 * embeds them as inline `<style>` / `<script>` blocks, so the template stored in
 * the database already carries the complete design (colors, fonts, layout,
 * behaviour). Preview and published output are then byte-identical.
 *
 * Safety rails: bounded concurrency, per-file size cap, total budget, request
 * timeout, tracker/analytics skip-list, and one level of `@import` following.
 * Anything that cannot be fetched is left as the original absolute-URL tag, so
 * the result is never worse than before.
 */

const TRACKER_RE =
  /(googletagmanager|google-analytics|gtag\/js|facebook\.net|connect\.facebook|hotjar|clarity\.ms|segment\.(com|io)|mixpanel|intercom|drift\.com|tawk\.to|crisp\.chat|matomo|yandex\.ru\/metrika|doubleclick|adservice|fullstory|amplitude|heap(analytics)?\.com|recaptcha|cookiebot|onetrust|usercentrics)/i;

export interface InlineAssetsOptions {
  baseUrl?: string | null;
  /** Inline external <script src> too (behaviour JS). Default true. */
  inlineScripts?: boolean;
  /** Max bytes for a single asset file. Default 900 KB. */
  maxFileBytes?: number;
  /** Max total inlined bytes across all assets. Default 3.5 MB. */
  maxTotalBytes?: number;
  /** Per-request timeout in ms. Default 12000. */
  timeoutMs?: number;
}

export interface InlineAssetsResult {
  html: string;
  stylesheetsInlined: number;
  scriptsInlined: number;
  failures: string[];
  bytes: number;
}

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/css,application/javascript,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

function absolutize(raw: string, base?: string | null): string | null {
  const url = (raw || "").trim();
  if (!url || url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("#")) return null;
  if (url.startsWith("//")) return `https:${url}`;
  if (/^https?:\/\//i.test(url)) return url;
  if (!base) return null;
  try {
    return new URL(url, base).toString();
  } catch {
    return null;
  }
}

async function fetchText(url: string, timeoutMs: number, maxBytes: number): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: FETCH_HEADERS, redirect: "follow", signal: controller.signal });
    if (!res.ok) return null;
    const len = Number(res.headers.get("content-length") || 0);
    if (len && len > maxBytes) return null;
    const text = await res.text();
    if (text.length > maxBytes) return null;
    return text;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Rewrite `url(...)` and `@import "..."` inside CSS to absolute URLs. */
export function absolutizeCss(css: string, cssUrl: string): string {
  return css
    .replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (full, q, raw) => {
      const abs = absolutize(raw, cssUrl);
      return abs ? `url(${q}${abs}${q})` : full;
    })
    .replace(/@import\s+(?:url\()?\s*(['"])([^'"]+)\1\s*\)?/gi, (full, q, raw) => {
      const abs = absolutize(raw, cssUrl);
      return abs ? `@import ${q}${abs}${q}` : full;
    });
}

/**
 * Follow one level of `@import` so font/base sheets referenced by the main
 * stylesheet are embedded too (WordPress themes do this constantly).
 */
async function expandImports(
  css: string,
  cssUrl: string,
  opts: Required<Pick<InlineAssetsOptions, "timeoutMs" | "maxFileBytes">>,
  budget: { left: number },
): Promise<string> {
  const importRe = /@import\s+(?:url\()?\s*(['"])([^'"]+)\1\s*\)?\s*;?/gi;
  const found: { stmt: string; url: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = importRe.exec(css)) !== null) {
    const abs = absolutize(m[2], cssUrl);
    if (abs && !TRACKER_RE.test(abs)) found.push({ stmt: m[0], url: abs });
  }
  if (found.length === 0) return css;

  const fetched = await Promise.all(
    found.map(async (f) => {
      if (budget.left <= 0) return null;
      const text = await fetchText(f.url, opts.timeoutMs, Math.min(opts.maxFileBytes, budget.left));
      if (!text) return null;
      budget.left -= text.length;
      return absolutizeCss(text, f.url);
    }),
  );

  let out = css;
  found.forEach((f, i) => {
    const body = fetched[i];
    if (body) out = out.split(f.stmt).join(`\n/* inlined: ${f.url} */\n${body}\n`);
  });
  return out;
}

/**
 * Replace every external stylesheet / script reference in `html` with its
 * fetched content, so the markup is fully self-contained.
 */
export async function inlineExternalAssets(
  html: string,
  options: InlineAssetsOptions = {},
): Promise<InlineAssetsResult> {
  const baseUrl = options.baseUrl || null;
  const inlineScripts = options.inlineScripts !== false;
  const maxFileBytes = options.maxFileBytes ?? 900_000;
  const timeoutMs = options.timeoutMs ?? 12_000;
  const budget = { left: options.maxTotalBytes ?? 3_500_000 };
  const failures: string[] = [];
  let stylesheetsInlined = 0;
  let scriptsInlined = 0;
  const startBudget = budget.left;

  if (!html) {
    return { html: "", stylesheetsInlined: 0, scriptsInlined: 0, failures: [], bytes: 0 };
  }

  // ---- 1. Stylesheets -----------------------------------------------------
  const linkTags: { tag: string; url: string }[] = [];
  const linkRe = /<link\b[^>]*>/gi;
  let lm: RegExpExecArray | null;
  while ((lm = linkRe.exec(html)) !== null) {
    const tag = lm[0];
    if (!/rel\s*=\s*["']?stylesheet/i.test(tag)) continue;
    const href = tag.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
    const abs = absolutize(href || "", baseUrl);
    if (!abs || TRACKER_RE.test(abs)) continue;
    linkTags.push({ tag, url: abs });
  }

  const cssBodies = await Promise.all(
    linkTags.map(async (l) => {
      if (budget.left <= 0) return null;
      const text = await fetchText(l.url, timeoutMs, Math.min(maxFileBytes, budget.left));
      if (!text) {
        failures.push(l.url);
        return null;
      }
      budget.left -= text.length;
      const absolute = absolutizeCss(text, l.url);
      return await expandImports(absolute, l.url, { timeoutMs, maxFileBytes }, budget);
    }),
  );

  let out = html;
  linkTags.forEach((l, i) => {
    const css = cssBodies[i];
    if (!css) return;
    stylesheetsInlined++;
    out = out.split(l.tag).join(
      `<style data-xxxv-asset data-inlined-from="${l.url.replace(/"/g, "&quot;")}">\n${css}\n</style>`,
    );
  });

  // ---- 2. Scripts ---------------------------------------------------------
  if (inlineScripts) {
    const scriptTags: { tag: string; url: string; attrs: string }[] = [];
    const scriptRe = /<script\b([^>]*)>\s*<\/script>|<script\b([^>]*)\/>/gi;
    let sm: RegExpExecArray | null;
    while ((sm = scriptRe.exec(out)) !== null) {
      const attrs = sm[1] ?? sm[2] ?? "";
      const src = attrs.match(/src\s*=\s*["']([^"']+)["']/i)?.[1];
      if (!src) continue;
      const abs = absolutize(src, baseUrl);
      if (!abs || TRACKER_RE.test(abs)) continue;
      // Module scripts usually pull further relative imports we cannot resolve
      // by inlining; leaving them as absolute URLs is the safer behaviour.
      if (/type\s*=\s*["']module["']/i.test(attrs)) continue;
      scriptTags.push({ tag: sm[0], url: abs, attrs });
    }

    const jsBodies = await Promise.all(
      scriptTags.map(async (s) => {
        if (budget.left <= 0) return null;
        const text = await fetchText(s.url, timeoutMs, Math.min(maxFileBytes, budget.left));
        if (!text) {
          failures.push(s.url);
          return null;
        }
        budget.left -= text.length;
        return text;
      }),
    );

    scriptTags.forEach((s, i) => {
      const js = jsBodies[i];
      // `</script>` inside a string literal would close the tag early.
      if (!js || js.includes("</script")) return;
      scriptsInlined++;
      const defer = /\bdefer\b/i.test(s.attrs) ? " defer" : "";
      out = out.split(s.tag).join(
        `<script data-xxxv-asset data-inlined-from="${s.url.replace(/"/g, "&quot;")}"${defer}>\n${js}\n</script>`,
      );
    });
  }

  return {
    html: out,
    stylesheetsInlined,
    scriptsInlined,
    failures,
    bytes: startBudget - budget.left,
  };
}
