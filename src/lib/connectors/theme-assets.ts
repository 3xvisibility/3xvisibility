/**
 * Theme Asset Fetcher + Cache (edge).
 * Keep in sync with src/lib/connectors/theme-assets.ts
 *
 * Two responsibilities:
 *  1. `fetchWithRetry` — a resilient fetch (timeout + retries + backoff) so
 *     publishing survives transient network hiccups and slow CMS hosts.
 *  2. `getThemeAssets` — fetches a live site's homepage once, extracts the
 *     theme's stylesheet + webfont URLs, and CACHES them (per host, TTL +
 *     in-flight dedup). The result is injected into generated pages so the
 *     theme's fonts/styles preconnect + preload early → faster first paint and
 *     a closer visual match to the live theme.
 */

export interface ThemeAssets {
  /** External stylesheet hrefs declared by the theme (absolute URLs). */
  stylesheets: string[];
  /** Webfont stylesheet URLs (Google Fonts, Typekit, Bunny, etc.). */
  fontStyles: string[];
  /** Hosts worth preconnecting to (font CDNs, theme asset CDNs). */
  preconnect: string[];
  /** When this snapshot was captured (epoch ms). */
  fetchedAt: number;
}

const EMPTY_ASSETS = (): ThemeAssets => ({
  stylesheets: [],
  fontStyles: [],
  preconnect: [],
  fetchedAt: Date.now(),
});

const TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_STYLESHEETS = 6;
const MAX_FONT_STYLES = 4;

const cache = new Map<string, ThemeAssets>();
const inflight = new Map<string, Promise<ThemeAssets>>();

/** Resilient fetch: aborts after `timeoutMs`, retries idempotent failures. */
export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  { timeoutMs = 15_000, retries = 2, backoffMs = 600 }: { timeoutMs?: number; retries?: number; backoffMs?: number } = {},
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: init.signal ?? ctrl.signal });
      // Retry only on transient server / rate-limit statuses.
      if ((res.status === 429 || res.status === 502 || res.status === 503 || res.status === 504) && attempt < retries) {
        const retryAfter = parseFloat(res.headers.get("Retry-After") || "0");
        const delay = retryAfter > 0 ? Math.min(retryAfter * 1000, 10_000) : backoffMs * (attempt + 1);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, backoffMs * (attempt + 1)));
        continue;
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("fetchWithRetry failed");
}

function normalizeBase(baseUrl: string): string | null {
  try {
    const u = new URL(/^https?:\/\//i.test(baseUrl) ? baseUrl : `https://${baseUrl}`);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

function isFontUrl(href: string): boolean {
  return /fonts\.googleapis\.com|use\.typekit|fonts\.bunny\.net|fast\.fonts|cloud\.typography|\.woff2?($|\?)/i.test(href);
}

function extractAssets(html: string, origin: string): ThemeAssets {
  const assets = EMPTY_ASSETS();
  const seen = new Set<string>();
  const hosts = new Set<string>();

  const linkRe = /<link\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html)) !== null) {
    const tag = m[0];
    const relMatch = tag.match(/\brel\s*=\s*["']([^"']+)["']/i);
    const rel = (relMatch?.[1] || "").toLowerCase();
    if (!/stylesheet|preconnect|preload/.test(rel)) continue;
    const hrefMatch = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i);
    let href = hrefMatch?.[1];
    if (!href) continue;
    if (href.startsWith("//")) href = `https:${href}`;
    else if (href.startsWith("/")) href = `${origin}${href}`;
    else if (!/^https?:\/\//i.test(href)) continue; // skip relative theme-local paths
    if (seen.has(href)) continue;
    seen.add(href);

    try {
      hosts.add(new URL(href).origin);
    } catch { /* ignore */ }

    if (isFontUrl(href)) {
      if (assets.fontStyles.length < MAX_FONT_STYLES && /stylesheet|preload/.test(rel)) {
        assets.fontStyles.push(href);
      }
    } else if (rel.includes("stylesheet") && assets.stylesheets.length < MAX_STYLESHEETS) {
      assets.stylesheets.push(href);
    }
  }

  assets.preconnect = [...hosts].filter((h) => h !== origin).slice(0, 6);
  return assets;
}

/** Fetch + cache a site's theme assets. Always resolves (never throws). */
export async function getThemeAssets(baseUrl: string): Promise<ThemeAssets> {
  const origin = normalizeBase(baseUrl);
  if (!origin) return EMPTY_ASSETS();

  const cached = cache.get(origin);
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) return cached;

  const existing = inflight.get(origin);
  if (existing) return existing;

  const task = (async (): Promise<ThemeAssets> => {
    try {
      const res = await fetchWithRetry(origin, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; LovablePublisher/1.0)" },
        redirect: "follow",
      }, { timeoutMs: 8000, retries: 1 });
      if (!res.ok) return EMPTY_ASSETS();
      const html = (await res.text()).slice(0, 400_000); // cap parse work
      const assets = extractAssets(html, origin);
      cache.set(origin, assets);
      return assets;
    } catch {
      const empty = EMPTY_ASSETS();
      // Cache empties briefly to avoid hammering an unreachable host.
      cache.set(origin, { ...empty, fetchedAt: Date.now() - (TTL_MS - 60_000) });
      return empty;
    } finally {
      inflight.delete(origin);
    }
  })();

  inflight.set(origin, task);
  return task;
}

/**
 * Build a small HTML head fragment (preconnect links + webfont stylesheets)
 * to prepend inside generated content so theme fonts load early.
 * Webfonts are emitted as a `<style>@import</style>` block so CMS sanitizers
 * that strip `<link>` (e.g. WordPress) still keep them.
 */
export function buildThemeAssetHead(assets?: ThemeAssets | null): string {
  if (!assets) return "";
  const parts: string[] = [];

  for (const host of assets.preconnect) {
    parts.push(`<link rel="preconnect" href="${host}" crossorigin>`);
  }
  if (assets.fontStyles.length > 0) {
    const imports = assets.fontStyles.map((u) => `@import url("${u}");`).join("\n");
    parts.push(`<style data-theme-fonts>\n${imports}\n</style>`);
  }
  if (parts.length === 0) return "";
  return `<!--theme-assets-->\n${parts.join("\n")}\n`;
}

/** Idempotently prepend the theme asset head fragment to content. */
export function injectThemeAssets(html: string, assets?: ThemeAssets | null): string {
  if (!html || !assets) return html;
  if (html.includes("<!--theme-assets-->")) return html;
  const head = buildThemeAssetHead(assets);
  return head ? `${head}${html}` : html;
}
