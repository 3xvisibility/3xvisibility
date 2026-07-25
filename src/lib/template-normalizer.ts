/**
 * Browser-side twin of `supabase/functions/_shared/template-normalizer.ts`.
 *
 * Every template — marketplace, imported HTML, scanned URL, connected site —
 * is normalized into the same shape before it is saved:
 *
 *   <link rel="stylesheet" …>          design-carrying links only
 *   <style data-tpl-css>…</style>      one merged, de-duplicated sheet
 *   <div class="tpl-root">…</div>      single predictable wrapper
 *   <script data-tpl-js>…</script>     only when scripts are kept
 */

export interface NormalizeTemplateOptions {
  baseUrl?: string | null;
  keepScripts?: boolean;
  wrapperClass?: string;
}

export interface NormalizedTemplate {
  html: string;
  css: string;
  js: string;
  links: string[];
  warnings: string[];
  stats: { assetsRewritten: number; styleBlocks: number; scriptBlocks: number; dropped: number };
}

const TRACKER_RE =
  /(googletagmanager|google-analytics|gtag\/js|facebook\.net|connect\.facebook|hotjar|clarity\.ms|segment\.(com|io)|mixpanel|intercom|drift\.com|tawk\.to|crisp\.chat|matomo|yandex\.ru\/metrika|doubleclick|adservice|fullstory|amplitude|heap(analytics)?\.com)/i;

const DESIGN_LINK_RELS = /\b(stylesheet|preload|preconnect|dns-prefetch|modulepreload)\b/i;
const META_LINK_RELS =
  /\b(canonical|alternate|amphtml|shortlink|manifest|icon|apple-touch-icon|profile|pingback|edituri)\b/i;

const ASSET_URL_ATTRS = ["src", "href", "poster", "data-src", "data-lazy-src", "data-original"];
const WRAPPER_STRIP_RE = /^\s*<div\s+class=["']tpl-root["']\s*>([\s\S]*)<\/div>\s*$/i;
const REVEAL_CSS =
  `[data-aos],[class*="fade-"],[class*="reveal"],[class*="animate-"]{opacity:1 !important;visibility:visible !important;transform:none !important;}`;

export function isDesignLinkTag(tag: string): boolean {
  const rel = tag.match(/\brel\s*=\s*["']([^"']+)["']/i)?.[1] || "";
  if (!rel || META_LINK_RELS.test(rel)) return false;
  return DESIGN_LINK_RELS.test(rel);
}

function absolutize(url: string, base: URL): string {
  const u = (url || "").trim();
  if (!u) return url;
  if (/^(https?:|data:|blob:|mailto:|tel:|javascript:|#)/i.test(u)) return u;
  if (u.startsWith("//")) return `https:${u.slice(2)}`;
  try { return new URL(u, base).toString(); } catch { return url; }
}

function rewriteSrcset(value: string, base: URL): string {
  return value
    .split(",")
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return "";
      const [url, ...rest] = trimmed.split(/\s+/);
      return [absolutize(url, base), ...rest].join(" ");
    })
    .filter(Boolean)
    .join(", ");
}

function rewriteCssUrls(css: string, base: URL): string {
  return css
    .replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (_m, q, url) => `url(${q}${absolutize(url, base)}${q})`)
    .replace(/@import\s+(["'])([^"']+)\1/gi, (_m, q, url) => `@import ${q}${absolutize(url, base)}${q}`);
}

function resolveAssets(html: string, baseUrl?: string | null): { html: string; rewritten: number } {
  let out = html.replace(/<base\b[^>]*>/gi, "");
  let rewritten = 0;
  out = out.replace(
    /(\s(?:src|href|poster|data-src|data-lazy-src)\s*=\s*["'])\/\//gi,
    (_m, p1) => { rewritten++; return `${p1}https://`; },
  );

  let base: URL | null = null;
  const candidate = baseUrl || html.match(/<base\b[^>]*href\s*=\s*["']([^"']+)["']/i)?.[1] || null;
  if (candidate) {
    try { base = new URL(candidate.startsWith("//") ? `https:${candidate}` : candidate); } catch { base = null; }
  }
  if (!base) return { html: out, rewritten };

  const bump = (before: string, after: string) => { if (before !== after) rewritten++; return after; };
  for (const attr of ASSET_URL_ATTRS) {
    const re = new RegExp(`(\\s${attr}\\s*=\\s*)(["'])([^"']*)\\2`, "gi");
    out = out.replace(re, (m, lead, q, url) => bump(m, `${lead}${q}${absolutize(url, base as URL)}${q}`));
  }
  out = out.replace(/(\s(?:srcset|imagesrcset)\s*=\s*)(["'])([^"']*)\2/gi,
    (m, lead, q, v) => bump(m, `${lead}${q}${rewriteSrcset(v, base as URL)}${q}`));
  out = out.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi,
    (m, open, css, close) => bump(m, `${open}${rewriteCssUrls(css, base as URL)}${close}`));
  out = out.replace(/(\sstyle\s*=\s*)(["'])([^"']*)\2/gi,
    (m, lead, q, css) => bump(m, `${lead}${q}${rewriteCssUrls(css, base as URL)}${q}`));
  return { html: out, rewritten };
}

function collect(html: string, re: RegExp): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(m[0]);
  return out;
}

function neutralizeHiddenStates(html: string): string {
  let out = html.replace(/style=(["'])([^"']*)\1/gi, (full, q, css: string) => {
    if (!/opacity|visibility|transform/i.test(css)) return full;
    const fixed = css
      .replace(/opacity\s*:\s*0(\.0+)?\s*(!important)?/gi, "opacity:1")
      .replace(/visibility\s*:\s*hidden\s*(!important)?/gi, "visibility:visible")
      .replace(/transform\s*:\s*[^;]*(translate|scale|rotate)[^;]*/gi, "transform:none");
    return `style=${q}${fixed}${q}`;
  });
  return out.replace(/\bopacity-0\b/g, "opacity-100").replace(/\binvisible\b/g, "visible");
}

function dedupe(parts: string[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const key = p.replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(p.trim());
  }
  return out.join("\n");
}

export function normalizeTemplateHtml(
  input: string,
  options: NormalizeTemplateOptions = {},
): NormalizedTemplate {
  const warnings: string[] = [];
  const wrapperClass = options.wrapperClass || "tpl-root";
  if (!input || !input.trim()) {
    return { html: "", css: "", js: "", links: [], warnings: ["empty template"], stats: { assetsRewritten: 0, styleBlocks: 0, scriptBlocks: 0, dropped: 0 } };
  }

  const bundled = resolveAssets(input, options.baseUrl);
  let html = bundled.html;
  let dropped = 0;

  html = html
    .replace(/<!--[\s\S]*?-->/g, () => { dropped++; return ""; })
    .replace(/<\/?(?:html|head|body)\b[^>]*>/gi, "")
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "")
    .replace(/<meta\b[^>]*\/?>/gi, () => { dropped++; return ""; })
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, () => { dropped++; return ""; });

  const links: string[] = [];
  html = html.replace(/<link\b[^>]*\/?>/gi, (tag) => {
    if (isDesignLinkTag(tag) && !TRACKER_RE.test(tag)) links.push(tag.trim());
    else dropped++;
    return "";
  });

  const styleBlocks = collect(html, /<style\b[^>]*>[\s\S]*?<\/style>/gi);
  const cssParts = styleBlocks.map((b) => b.replace(/^<style\b[^>]*>/i, "").replace(/<\/style>$/i, ""));
  html = html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");

  const scriptBlocks = collect(html, /<script\b[^>]*>[\s\S]*?<\/script>|<script\b[^>]*\/>/gi);
  const jsParts: string[] = [];
  // External `<script src>` tags must stay standalone — nesting them inside the
  // merged inline block would silently disable them.
  const externalScripts: string[] = [];
  for (const block of scriptBlocks) {
    const isTracker = TRACKER_RE.test(block);
    const isJsonLd = /type\s*=\s*["']application\/ld\+json["']/i.test(block);
    if (isTracker || isJsonLd || !options.keepScripts) { dropped++; continue; }
    if (/\bsrc\s*=/.test(block)) { externalScripts.push(block.trim()); continue; }
    jsParts.push(block.replace(/^<script\b[^>]*>/i, "").replace(/<\/script>$/i, ""));
  }
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>|<script\b[^>]*\/>/gi, "");
  if (!options.keepScripts && scriptBlocks.length) {
    warnings.push(`${scriptBlocks.length} script block(s) removed (HTML/CSS-only mode)`);
  }

  html = html.replace(/\son[a-z]+\s*=\s*(["'])[\s\S]*?\1/gi, () => { dropped++; return ""; });
  // With the source JS kept, the site's own reveal logic runs — forcing the
  // visible state would change the intended design.
  html = (options.keepScripts ? html : neutralizeHiddenStates(html)).replace(/\n{3,}/g, "\n\n").trim();

  const already = html.match(WRAPPER_STRIP_RE);
  const body = already ? already[1].trim() : html;
  // Never nest wrappers when the markup already went through the normalizer.
  const needsWrapper = !/<div\s+class=["']tpl-root["']/i.test(body);
  // Drop any previously injected reveal rule so repeat normalization is stable.
  const cleanedCss = cssParts.map((c) => c.split(REVEAL_CSS).join("").trim()).filter(Boolean);
  const css = dedupe(options.keepScripts ? cleanedCss : [...cleanedCss, REVEAL_CSS]);
  const js = dedupe(jsParts);

  const out = [
    links.join("\n"),
    css ? `<style data-tpl-css>\n${css}\n</style>` : "",
    needsWrapper ? `<div class="${wrapperClass}">\n${body}\n</div>` : body,
    externalScripts.join("\n"),
    js ? `<script data-tpl-js>\n${js}\n</script>` : "",
  ].filter(Boolean).join("\n");


  if (!body) warnings.push("template body is empty after normalization");

  return {
    html: out,
    css,
    js,
    links,
    warnings,
    stats: { assetsRewritten: bundled.rewritten, styleBlocks: styleBlocks.length, scriptBlocks: scriptBlocks.length, dropped },
  };
}

export function isNormalizedTemplate(html: string): boolean {
  return /<div\s+class=["']tpl-root["']/i.test(html || "");
}
