/**
 * Shopify Theme Adapter
 *
 * Normalizes generated HTML so it inherits the active Shopify theme's
 * typography, spacing, and layout. Goal: a published page/product looks
 * indistinguishable from one a merchant created natively in Shopify admin —
 * no manual cleanup required.
 *
 * Strategy:
 *  - Strip outer document wrappers (<html>/<head>/<body>) – Shopify embeds
 *    body_html INSIDE the theme's page.liquid / product.liquid template,
 *    so any document-level chrome conflicts with the theme.
 *  - Remove fixed page backgrounds, full-viewport widths, hard-coded fonts
 *    and color resets on the OUTER container so the theme's CSS variables
 *    (--color-foreground, font-body, etc.) bleed through.
 *  - Make all images responsive (themes assume max-width:100%).
 *  - Wrap the result in `page-width rte` — the two utility classes shipped
 *    by every Shopify reference theme (Dawn, Sense, Studio, Refresh, Origin,
 *    Crave, Colorblock, Taste, Ride, Craft, Spotlight) and inherited by the
 *    vast majority of community themes. `page-width` applies the theme's
 *    container max-width + side padding; `rte` applies the rich-text styles
 *    so headings, lists, blockquotes etc. match the theme.
 *  - For products, also wrap in `product__description` so themes that scope
 *    description CSS (Dawn, Sense) still pick it up.
 */

import { injectThemeAssets, type ThemeAssets } from "./theme-assets.ts";

export type ShopifyAdaptKind = "page" | "product";

const STRIP_TAGS = ["html", "head", "body", "script", "title", "meta", "link"] as const;

function stripDocumentChrome(html: string): string {
  let out = html;
  // Remove DOCTYPE
  out = out.replace(/<!doctype[^>]*>/gi, "");
  // Strip <head>...</head> entirely (styles inside fight the theme)
  out = out.replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, "");
  // Pull contents out of <html> and <body>
  for (const tag of STRIP_TAGS) {
    if (tag === "head") continue;
    const open = new RegExp(`<${tag}\\b[^>]*>`, "gi");
    const close = new RegExp(`<\\/${tag}>`, "gi");
    out = out.replace(open, "").replace(close, "");
  }
  return out.trim();
}

/** Remove inline declarations that hijack the theme's design. */
function sanitizeOuterStyles(html: string): string {
  // Remove background / background-color / min-height:100vh / width:100vw / max-width:Npx
  // declarations from any element's inline style attribute, plus theme-fighting fonts.
  return html.replace(/style="([^"]*)"/gi, (_m, css: string) => {
    const filtered = css
      .split(";")
      .map((d) => d.trim())
      .filter((d) => d.length > 0)
      .filter((d) => {
        const lower = d.toLowerCase();
        if (/^background(-color)?\s*:/.test(lower)) return false;
        if (/^min-height\s*:\s*100vh/.test(lower)) return false;
        if (/^height\s*:\s*100vh/.test(lower)) return false;
        if (/^width\s*:\s*100vw/.test(lower)) return false;
        if (/^max-width\s*:\s*\d+px/.test(lower)) return false; // let theme decide width
        if (/^font-family\s*:/.test(lower)) return false;       // inherit theme font
        if (/^color\s*:\s*(#000|#fff|rgb\(0,\s*0,\s*0\)|rgb\(255,\s*255,\s*255\))/.test(lower)) return false;
        return true;
      })
      .join("; ");
    return filtered ? `style="${filtered}"` : "";
  });
}

/** Make images responsive so they don't overflow theme containers. */
function makeImagesResponsive(html: string): string {
  return html.replace(/<img\b([^>]*)>/gi, (_m, attrs: string) => {
    let a = attrs;
    // Add loading="lazy" if missing
    if (!/\bloading\s*=/.test(a)) a += ' loading="lazy"';
    if (!/\bdecoding\s*=/.test(a)) a += ' decoding="async"';
    // Ensure responsive style
    if (/\bstyle\s*=/.test(a)) {
      a = a.replace(/style="([^"]*)"/i, (_s, css) => {
        const has = /max-width\s*:/.test(css);
        return `style="${css.trim().replace(/;?\s*$/, "")}${has ? "" : "; max-width:100%; height:auto"}"`;
      });
    } else {
      a += ' style="max-width:100%;height:auto"';
    }
    return `<img${a}>`;
  });
}

/** Replace heavy <style> blocks at root scope but keep scoped ones (e.g. Elementor). */
function trimRootStyleBlocks(html: string): string {
  // Drop style blocks that target html/body/* with global resets — they break theme tokens.
  return html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (m, css: string) => {
    const lower = css.toLowerCase();
    if (/(^|[^.\w])(html|body)\s*[,{]/.test(lower)) return ""; // strip global resets
    if (/[*]\s*\{[^}]*box-sizing/.test(lower)) return "";
    return m; // keep scoped/component CSS
  });
}

export function adaptHtmlForShopifyTheme(
  html: string,
  kind: ShopifyAdaptKind = "page",
  assets?: ThemeAssets | null,
): string {
  if (!html || typeof html !== "string") return html;

  let out = html;

  // v1 HTML/CSS publishing bundles the page design into external CSS/JS files
  // referenced with data-xxxv-asset tags. Those must survive the theme adapter
  // (which otherwise strips every <link>/<script>), so pull them out first and
  // re-attach them to the wrapped output.
  const bundled: string[] = [];
  out = out.replace(
    /<link\b[^>]*data-xxxv-asset[^>]*>|<script\b[^>]*data-xxxv-asset[^>]*>[\s\S]*?<\/script>/gi,
    (tag) => {
      bundled.push(tag);
      return "";
    },
  );

  out = stripDocumentChrome(out);
  out = trimRootStyleBlocks(out);
  out = sanitizeOuterStyles(out);
  out = makeImagesResponsive(out);

  const prefix = bundled.filter((t) => /^<link/i.test(t)).join("\n");
  const suffix = bundled.filter((t) => /^<script/i.test(t)).join("\n");
  const withAssets = (body: string) =>
    [prefix, body, suffix].filter((part) => part && part.trim()).join("\n");

  // If already wrapped, leave alone.
  if (/class="[^"]*\bshopify-themed-content\b[^"]*"/.test(out)) {
    return injectThemeAssets(withAssets(out), assets);
  }

  const productClass = kind === "product" ? " product__description" : "";
  const wrapped = `<div class="page-width rte shopify-themed-content${productClass}">\n${out}\n</div>`;
  return injectThemeAssets(withAssets(wrapped), assets);
}

