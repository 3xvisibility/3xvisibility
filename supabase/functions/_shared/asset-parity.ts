// asset-parity.ts — checks that every design asset present in the preview
// markup also reaches the live published page.
//
// It looks for three classes of loss caused by CMS sanitizers:
//   1. inline <style> blocks stripped
//   2. inline / external <script> blocks stripped
//   3. linked assets (<link rel=stylesheet>, <script src>) removed or 404
//
// Linked assets on the live page are actually fetched, so their content joins
// the CSS/JS corpus — an inline preview <style> that got bundled into an
// external file still counts as present.

export interface AssetParityIssue {
  kind: "style" | "script" | "link" | "asset";
  detail: string;
  hint: string;
}

export interface AssetParityReport {
  ok: boolean;
  score: number;
  issues: AssetParityIssue[];
  counts: {
    previewStyles: number;
    previewScripts: number;
    previewLinks: number;
    liveStyles: number;
    liveScripts: number;
    liveLinks: number;
    fetchedAssets: number;
  };
}

const FETCH_TIMEOUT_MS = 12_000;
const MAX_FETCHED_ASSETS = 12;

function matchAll(html: string, re: RegExp): string[] {
  return Array.from(html.matchAll(re)).map((m) => m[1] ?? m[0]);
}

const STYLE_RE = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
const INLINE_SCRIPT_RE = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
const SCRIPT_SRC_RE = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
const LINK_CSS_RE = /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi;

function isStylesheetLink(html: string, href: string): boolean {
  const tag = html.match(new RegExp(`<link\\b[^>]*${href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^>]*>`, "i"));
  if (!tag) return false;
  return /stylesheet/i.test(tag[0]) || /\.css(\?|$)/i.test(href);
}

/** Collapse whitespace/quotes so CSS + JS text can be substring-compared. */
function normalize(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, "").replace(/["']/g, "'").toLowerCase();
}

/** Distinctive fingerprints from a block of code: longest unique-ish chunks. */
function fingerprints(code: string, max = 6): string[] {
  const norm = normalize(code);
  if (norm.length < 24) return norm ? [norm] : [];
  const out: string[] = [];
  const step = Math.max(1, Math.floor(norm.length / max));
  for (let i = 0; i + 40 <= norm.length && out.length < max; i += step) {
    out.push(norm.slice(i, i + 40));
  }
  return out.length ? out : [norm.slice(0, 40)];
}

function resolveUrl(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

async function fetchText(url: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AssetParity/1.0)", "Cache-Control": "no-cache" },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function fileName(href: string): string {
  const clean = href.split("?")[0].split("#")[0];
  return clean.split("/").filter(Boolean).pop() || clean;
}

/**
 * Compare preview markup against the fetched live HTML.
 * `liveUrl` is used to resolve relative asset URLs.
 */
export async function compareAssetParity(
  previewHtml: string,
  liveHtml: string,
  liveUrl: string,
): Promise<AssetParityReport> {
  const previewStyles = matchAll(previewHtml, STYLE_RE).filter((s) => s.trim().length > 0);
  const previewInlineScripts = matchAll(previewHtml, INLINE_SCRIPT_RE).filter((s) => s.trim().length > 20);
  const previewScriptSrcs = matchAll(previewHtml, SCRIPT_SRC_RE);
  const previewLinks = matchAll(previewHtml, LINK_CSS_RE).filter((h) => isStylesheetLink(previewHtml, h));

  const liveStyles = matchAll(liveHtml, STYLE_RE);
  const liveInlineScripts = matchAll(liveHtml, INLINE_SCRIPT_RE);
  const liveScriptSrcs = matchAll(liveHtml, SCRIPT_SRC_RE);
  const liveLinks = matchAll(liveHtml, LINK_CSS_RE).filter((h) => isStylesheetLink(liveHtml, h));

  // Build the live CSS / JS corpus, including linked asset bodies.
  let cssCorpus = liveStyles.map(normalize).join("\n");
  let jsCorpus = liveInlineScripts.map(normalize).join("\n");
  const issues: AssetParityIssue[] = [];
  let fetchedAssets = 0;

  const linkedTargets = [
    ...liveLinks.slice(0, MAX_FETCHED_ASSETS).map((h) => ({ href: h, type: "css" as const })),
    ...liveScriptSrcs.slice(0, MAX_FETCHED_ASSETS).map((h) => ({ href: h, type: "js" as const })),
  ];

  for (const target of linkedTargets) {
    const abs = resolveUrl(target.href, liveUrl);
    if (!abs || !/^https?:/i.test(abs)) continue;
    const text = await fetchText(abs);
    if (text == null) {
      issues.push({
        kind: "asset",
        detail: `${target.type.toUpperCase()} asset not reachable: ${target.href}`,
        hint: "The live page links this file but it fails to load. Re-publish so the asset is re-uploaded, or enable the inline CSS/JS fallback for this site.",
      });
      continue;
    }
    fetchedAssets++;
    if (target.type === "css") cssCorpus += "\n" + normalize(text);
    else jsCorpus += "\n" + normalize(text);
  }

  const missingIn = (corpus: string, code: string) => {
    const fps = fingerprints(code);
    if (fps.length === 0) return false;
    const hits = fps.filter((f) => corpus.includes(f)).length;
    return hits / fps.length < 0.5;
  };

  previewStyles.forEach((css, i) => {
    if (missingIn(cssCorpus, css)) {
      issues.push({
        kind: "style",
        detail: `Preview <style> block #${i + 1} (${css.trim().length} chars) is missing on the live page`,
        hint: "The CMS stripped this stylesheet. Re-publish; if it keeps failing, turn on \"Force inline CSS/JS fallback\" for the site.",
      });
    }
  });

  previewInlineScripts.forEach((js, i) => {
    if (missingIn(jsCorpus, js)) {
      issues.push({
        kind: "script",
        detail: `Preview <script> block #${i + 1} (${js.trim().length} chars) is missing on the live page`,
        hint: "Inline JavaScript was removed during publishing. Re-publish so it is delivered as a bundled asset.",
      });
    }
  });

  const liveHrefNames = new Set([...liveLinks, ...liveScriptSrcs].map(fileName));
  [...previewLinks.map((h) => ({ h, t: "stylesheet" })), ...previewScriptSrcs.map((h) => ({ h, t: "script" }))]
    .forEach(({ h, t }) => {
      if (/^data:/i.test(h)) return;
      if (liveHrefNames.has(fileName(h))) return;
      // Content may have been folded into another asset — accept that too.
      const corpus = t === "stylesheet" ? cssCorpus : jsCorpus;
      if (corpus.includes(normalize(fileName(h)))) return;
      issues.push({
        kind: "link",
        detail: `Linked ${t} missing on live page: ${h}`,
        hint: "The published page does not reference this asset. Re-publish the page to restore the asset tag.",
      });
    });

  const totalChecked =
    previewStyles.length + previewInlineScripts.length + previewLinks.length + previewScriptSrcs.length;
  const score = totalChecked === 0 ? 1 : Math.max(0, 1 - issues.length / Math.max(totalChecked, 1));

  return {
    ok: issues.length === 0,
    score: Number(score.toFixed(4)),
    issues,
    counts: {
      previewStyles: previewStyles.length,
      previewScripts: previewInlineScripts.length + previewScriptSrcs.length,
      previewLinks: previewLinks.length,
      liveStyles: liveStyles.length,
      liveScripts: liveInlineScripts.length + liveScriptSrcs.length,
      liveLinks: liveLinks.length,
      fetchedAssets,
    },
  };
}
