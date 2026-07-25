/**
 * Bundle a generated page's CSS + JS into external files and reference them from
 * the published HTML with real <link rel="stylesheet"> / <script src> tags.
 *
 * Why: every CMS sanitizes page content. WordPress runs `wp_kses_post()` on REST
 * content (drops <style>/<script>), and Shopify's theme adapter strips document
 * chrome from `body_html`. External assets loaded from a stable URL survive both,
 * so the live page renders exactly like the SaaS preview.
 *
 * The assets are content-addressed (SHA-256 of the payload), stored once in
 * `public.page_assets`, and served publicly by the `page-asset` edge function.
 */

// Structurally compatible with the Supabase JS client (kept loose so both the
// service client and test doubles can be passed in).
// deno-lint-ignore no-explicit-any
type MinimalClient = { from: (table: string) => any };

export interface BundledPageAssets {
  /** HTML with inline <style>/<script> replaced by external <link>/<script src>. */
  html: string;
  cssUrl: string | null;
  jsUrl: string | null;
  /** The extracted CSS/JS payloads, kept for the inline fallback mode. */
  css?: string;
  js?: string;
}


const ASSET_MARK = "data-xxxv-asset";

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 40);
}

/**
 * Cache-busting: the filename is content-addressed AND a `?v=` version token is
 * appended. Any content change produces a new hash -> new URL, so browsers, CDNs
 * and CMS caches can never serve a stale stylesheet or script for a page, while
 * unchanged assets still hit the immutable long-lived cache.
 */
function publicAssetUrl(hash: string, kind: "css" | "js"): string {
  const base = (Deno.env.get("SUPABASE_URL") || "").replace(/\/+$/, "");
  return `${base}/functions/v1/page-asset/${hash}.${kind}?v=${assetVersion(hash)}`;
}

/** Short, stable version token derived from the asset content hash. */
export function assetVersion(hash: string): string {
  return hash.slice(0, 12);
}

/** Collect inline CSS/JS from the HTML and remove those inline blocks. */
function splitInlineAssets(html: string): { html: string; css: string; js: string } {
  const cssParts: string[] = [];
  const jsParts: string[] = [];

  let out = html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (tag, body: string) => {
    if (tag.includes(ASSET_MARK)) return tag;
    if (body && body.trim()) cssParts.push(body.trim());
    return "";
  });

  out = out.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (tag, attrs: string, body: string) => {
    if (tag.includes(ASSET_MARK)) return tag;
    // JSON-LD / data blocks belong to the CMS or the page, not the bundle.
    if (/type\s*=\s*["'][^"']*(ld\+json|application\/json|text\/template)/i.test(attrs)) return tag;
    // Keep third-party <script src> tags as-is; they already load externally.
    if (/\bsrc\s*=/i.test(attrs)) return tag;
    if (body && body.trim()) jsParts.push(body.trim());
    return "";
  });

  return { html: out, css: cssParts.join("\n\n").trim(), js: jsParts.join("\n;\n").trim() };
}

/**
 * Fold <link rel="stylesheet"> hrefs already present in the HTML into the CSS
 * bundle as @import rules, so a single stylesheet carries the whole design.
 */
function absorbStylesheetLinks(html: string): { html: string; imports: string[] } {
  const imports: string[] = [];
  const out = html.replace(/<link\b[^>]*>/gi, (tag) => {
    if (tag.includes(ASSET_MARK)) return tag;
    if (!/rel\s*=\s*["']?stylesheet/i.test(tag)) return tag;
    const href = tag.match(/href\s*=\s*("([^"]*)"|'([^']*)')/i);
    const url = href ? (href[2] ?? href[3] ?? "") : "";
    if (!url || /\{[^}]*\}/.test(url)) return "";
    imports.push(`@import url("${url.replace(/"/g, "%22")}");`);
    return "";
  });
  return { html: out, imports: [...new Set(imports)] };
}

async function storeAsset(
  supabase: MinimalClient,
  kind: "css" | "js",
  content: string,
  workspaceId?: string | null,
): Promise<string | null> {
  if (!content.trim()) return null;
  const hash = await sha256Hex(`${kind}:${content}`);
  const { error } = await supabase
    .from("page_assets")
    .upsert(
      { hash, kind, content, workspace_id: workspaceId || null },
      { onConflict: "hash,kind", ignoreDuplicates: true },
    );
  if (error) {
    console.error(`page-assets: failed to store ${kind}`, error.message);
    return null;
  }
  return publicAssetUrl(hash, kind);
}

/**
 * Turn a generated page's inline design into external assets.
 * Falls back to the original HTML (inline assets intact) if storage fails, so
 * publishing never breaks because of the bundling step.
 */
export async function bundlePageAssetsToUrls(
  supabase: MinimalClient,
  html: string,
  workspaceId?: string | null,
): Promise<BundledPageAssets> {
  if (!html || typeof html !== "string") return { html, cssUrl: null, jsUrl: null };

  try {
    const absorbed = absorbStylesheetLinks(html);
    const split = splitInlineAssets(absorbed.html);
    const css = [...absorbed.imports, split.css].filter(Boolean).join("\n\n").trim();
    const js = split.js;

    if (!css && !js) return { html, cssUrl: null, jsUrl: null };

    const [cssUrl, jsUrl] = await Promise.all([
      storeAsset(supabase, "css", css, workspaceId),
      storeAsset(supabase, "js", js, workspaceId),
    ]);

    // Storage unavailable → keep the original inline markup rather than shipping
    // a page with no styles at all.
    if ((css && !cssUrl) || (js && !jsUrl)) return { html, cssUrl, jsUrl, css, js };

    const tags: string[] = [];
    if (cssUrl) tags.push(`<link ${ASSET_MARK}="css" rel="stylesheet" href="${cssUrl}" />`);
    const trailing = jsUrl ? `\n<script ${ASSET_MARK}="js" src="${jsUrl}" defer></script>` : "";

    return {
      html: `${tags.join("\n")}${tags.length ? "\n" : ""}${split.html.trim()}${trailing}`,
      cssUrl,
      jsUrl,
      css,
      js,
    };
  } catch (e) {
    console.error("page-assets: bundling failed", e);
    return { html, cssUrl: null, jsUrl: null };
  }
}

/**
 * Inline CSS/JS fallback mode.
 *
 * Some WordPress installs (aggressive security plugins, `wp_kses_post()` on
 * hosts where the connector plugin is missing, or themes that filter
 * `the_content`) drop the external <link>/<script src> tags entirely. When the
 * site has the "force inline CSS/JS fallback" setting enabled we additionally
 * embed the bundle inline — marked with `data-xxxv-asset` so every connector
 * sanitizer keeps it — so the live page still carries the full design even if
 * the external tags never make it through.
 */
export function applyInlineAssetFallback(bundle: BundledPageAssets): string {
  const css = (bundle.css || "").trim();
  const js = (bundle.js || "").trim();
  if (!css && !js) return bundle.html;

  let html = bundle.html;
  if (css && !new RegExp(`<style[^>]*${ASSET_MARK}`, "i").test(html)) {
    html = `<style ${ASSET_MARK}="css-inline">
${css}
</style>
${html}`;
  }
  if (js && !new RegExp(`<script[^>]*${ASSET_MARK}="js-inline"`, "i").test(html)) {
    html = `${html}
<script ${ASSET_MARK}="js-inline">
${js}
</script>`;
  }
  return html;
}

export const PAGE_ASSET_MARK = ASSET_MARK;
