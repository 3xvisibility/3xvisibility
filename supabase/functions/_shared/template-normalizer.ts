/**
 * Template normalizer — one consistent HTML/CSS/JS shape for every template
 * source (marketplace, imported HTML, scanned URL, connected website).
 *
 * Output contract (v1, HTML-only mode):
 *
 *   <link rel="stylesheet" ...>            (design-carrying links only)
 *   <style data-tpl-css>…</style>          (one merged, de-duplicated block)
 *   <div class="tpl-root">…body…</div>     (single predictable wrapper)
 *   <script data-tpl-js>…</script>         (only when scripts are kept)
 *
 * Because every template lands in this exact shape, preview and published
 * markup are identical and downstream passes (variables, SEO, fidelity check)
 * can rely on a stable structure.
 */
import { bundleTemplateAssets, isDesignLinkTag } from "./asset-bundler.ts";

export interface NormalizeTemplateOptions {
  /** Origin used to absolutise relative asset URLs. */
  baseUrl?: string | null;
  /** Keep template JS (behaviour like sliders/tabs). Trackers are always dropped. */
  keepScripts?: boolean;
  /** Wrapper class, defaults to `tpl-root`. */
  wrapperClass?: string;
}

export interface NormalizedTemplate {
  /** Final, ready-to-store / ready-to-publish markup. */
  html: string;
  /** Merged CSS (without the <style> wrapper). */
  css: string;
  /** Merged JS (without the <script> wrapper); empty when scripts are dropped. */
  js: string;
  /** Design-carrying <link> tags kept verbatim. */
  links: string[];
  warnings: string[];
  stats: { assetsRewritten: number; styleBlocks: number; scriptBlocks: number; dropped: number };
}

/** Third-party junk that must never be carried into a generated page. */
const TRACKER_RE =
  /(googletagmanager|google-analytics|gtag\/js|facebook\.net|connect\.facebook|hotjar|clarity\.ms|segment\.(com|io)|mixpanel|intercom|drift\.com|tawk\.to|crisp\.chat|matomo|yandex\.ru\/metrika|doubleclick|adservice|fullstory|amplitude|heap(analytics)?\.com)/i;

const WRAPPER_STRIP_RE = /^\s*<div\s+class=["']tpl-root["']\s*>([\s\S]*)<\/div>\s*$/i;

function collect(html: string, re: RegExp): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(m[0]);
  return out;
}

/**
 * Entrance-animation initial states (opacity:0 + transform) hide text when a
 * page is imported statically. Reset them so the content is visible.
 */
function neutralizeHiddenStates(html: string): string {
  let out = html.replace(/style=(["'])([^"']*)\1/gi, (full, q, css: string) => {
    if (!/opacity|visibility|transform/i.test(css)) return full;
    const fixed = css
      .replace(/opacity\s*:\s*0(\.0+)?\s*(!important)?/gi, "opacity:1")
      .replace(/visibility\s*:\s*hidden\s*(!important)?/gi, "visibility:visible")
      .replace(/transform\s*:\s*[^;]*(translate|scale|rotate)[^;]*/gi, "transform:none");
    return `style=${q}${fixed}${q}`;
  });
  out = out.replace(/\bopacity-0\b/g, "opacity-100").replace(/\binvisible\b/g, "visible");
  return out;
}

const REVEAL_CSS =
  `[data-aos],[class*="fade-"],[class*="reveal"],[class*="animate-"]{opacity:1 !important;visibility:visible !important;transform:none !important;}`;

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

  // 1. Absolutise every asset reference (CSS, JS, images, fonts, srcset, url()).
  const bundled = bundleTemplateAssets(input, { baseUrl: options.baseUrl });
  let html = bundled.html;

  // 2. Strip comments and CMS-owned metadata.
  let dropped = 0;
  html = html
    .replace(/<!--[\s\S]*?-->/g, () => { dropped++; return ""; })
    .replace(/<\/?(?:html|head|body)\b[^>]*>/gi, "")
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<base\b[^>]*>/gi, "")
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "")
    .replace(/<meta\b[^>]*\/?>/gi, () => { dropped++; return ""; })
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, () => { dropped++; return ""; });

  // 3. Keep only design-carrying <link> tags.
  const links: string[] = [];
  html = html.replace(/<link\b[^>]*\/?>/gi, (tag) => {
    if (isDesignLinkTag(tag) && !TRACKER_RE.test(tag)) links.push(tag.trim());
    else dropped++;
    return "";
  });

  // 4. Pull out <style> blocks into one merged sheet.
  const styleBlocks = collect(html, /<style\b[^>]*>[\s\S]*?<\/style>/gi);
  const cssParts = styleBlocks.map((b) => b.replace(/^<style\b[^>]*>/i, "").replace(/<\/style>$/i, ""));
  html = html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");

  // 5. Scripts: drop trackers + JSON-LD always; keep behaviour JS only on request.
  const scriptBlocks = collect(html, /<script\b[^>]*>[\s\S]*?<\/script>|<script\b[^>]*\/>/gi);
  const jsParts: string[] = [];
  // External `<script src>` tags must stay standalone tags — nesting them
  // inside the merged inline block would silently disable them.
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


  // 6. Inline event handlers are never safe to carry over.
  html = html.replace(/\son[a-z]+\s*=\s*(["'])[\s\S]*?\1/gi, () => { dropped++; return ""; });

  // 7. Reveal animation-hidden content and normalise whitespace.
  //    When the source JS is kept, the site's own reveal logic runs, so forcing
  //    the visible state would actually change the intended design.
  html = (options.keepScripts ? html : neutralizeHiddenStates(html)).replace(/\n{3,}/g, "\n\n").trim();

  // 8. Single predictable wrapper (never double-wrap an already-normalized doc).
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
    stats: {
      assetsRewritten: bundled.rewritten,
      styleBlocks: styleBlocks.length,
      scriptBlocks: scriptBlocks.length,
      dropped,
    },
  };
}

/** True when markup already went through the normalizer. */
export function isNormalizedTemplate(html: string): boolean {
  return /<div\s+class=["']tpl-root["']/i.test(html || "");
}
