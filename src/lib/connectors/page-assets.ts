/**
 * Page asset bundling (browser mirror).
 * Keep in sync with supabase/functions/_shared/connectors/page-assets.ts
 *
 * Turns a generated page's inline <style>/<script> into content-addressed rows in
 * `public.page_assets` and references them with external <link>/<script src> tags
 * that survive CMS sanitization (WordPress kses, Shopify body_html adaptation),
 * so live pages render exactly like the preview.
 */
import { supabase } from "@/integrations/supabase/client";

export const PAGE_ASSET_MARK = "data-xxxv-asset";

export interface BundledPageAssets {
  html: string;
  cssUrl: string | null;
  jsUrl: string | null;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 40);
}

/** Short, stable version token derived from the asset content hash (cache-busting). */
export function assetVersion(hash: string): string {
  return hash.slice(0, 12);
}

function publicAssetUrl(hash: string, kind: "css" | "js"): string {
  const base = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
  return `${base}/functions/v1/page-asset/${hash}.${kind}?v=${assetVersion(hash)}`;
}

function splitInlineAssets(html: string): { html: string; css: string; js: string } {
  const cssParts: string[] = [];
  const jsParts: string[] = [];

  let out = html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (tag, body: string) => {
    if (tag.includes(PAGE_ASSET_MARK)) return tag;
    if (body && body.trim()) cssParts.push(body.trim());
    return "";
  });

  out = out.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (tag, attrs: string, body: string) => {
    if (tag.includes(PAGE_ASSET_MARK)) return tag;
    if (/type\s*=\s*["'][^"']*(ld\+json|application\/json|text\/template)/i.test(attrs)) return tag;
    if (/\bsrc\s*=/i.test(attrs)) return tag;
    if (body && body.trim()) jsParts.push(body.trim());
    return "";
  });

  return { html: out, css: cssParts.join("\n\n").trim(), js: jsParts.join("\n;\n").trim() };
}

function absorbStylesheetLinks(html: string): { html: string; imports: string[] } {
  const imports: string[] = [];
  const out = html.replace(/<link\b[^>]*>/gi, (tag) => {
    if (tag.includes(PAGE_ASSET_MARK)) return tag;
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

export async function bundlePageAssetsToUrls(
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
      storeAsset("css", css, workspaceId),
      storeAsset("js", js, workspaceId),
    ]);

    // Storage unavailable → keep the inline markup rather than an unstyled page.
    if ((css && !cssUrl) || (js && !jsUrl)) return { html, cssUrl, jsUrl };

    const link = cssUrl ? `<link ${PAGE_ASSET_MARK}="css" rel="stylesheet" href="${cssUrl}" />\n` : "";
    const trailing = jsUrl ? `\n<script ${PAGE_ASSET_MARK}="js" src="${jsUrl}" defer></script>` : "";

    return { html: `${link}${split.html.trim()}${trailing}`, cssUrl, jsUrl };
  } catch (e) {
    console.error("page-assets: bundling failed", e);
    return { html, cssUrl: null, jsUrl: null };
  }
}
