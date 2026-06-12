/**
 * PrestaShop Theme Adapter (browser mirror).
 * Keep in sync with supabase/functions/_shared/connectors/prestashop-theme-adapter.ts
 *
 * Normalizes generated HTML so a published PrestaShop CMS page / product
 * description inherits the active theme (Classic, Hummingbird, Warehouse, etc.)
 * typography, spacing and grid. PrestaShop themes (Bootstrap-based) style
 * rich-text inside `.rte`, lay out with `.container`/`.row`/`.col`, and render
 * CMS content inside `#cms .page-content.page-cms`.
 */

import { injectThemeAssets, type ThemeAssets } from "./theme-assets.ts";

export type PrestaAdaptKind = "page" | "product";

const STRIP_TAGS = ["html", "head", "body", "script", "title", "meta", "link"] as const;

function stripDocumentChrome(html: string): string {
  let out = html.replace(/<!doctype[^>]*>/gi, "");
  out = out.replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, "");
  for (const tag of STRIP_TAGS) {
    if (tag === "head") continue;
    out = out
      .replace(new RegExp(`<${tag}\\b[^>]*>`, "gi"), "")
      .replace(new RegExp(`<\\/${tag}>`, "gi"), "");
  }
  return out.trim();
}

function sanitizeOuterStyles(html: string): string {
  return html.replace(/style="([^"]*)"/gi, (_m, css: string) => {
    const filtered = css
      .split(";")
      .map((d) => d.trim())
      .filter(Boolean)
      .filter((d) => {
        const lower = d.toLowerCase();
        if (/^background(-color)?\s*:/.test(lower)) return false;
        if (/^min-height\s*:\s*100vh/.test(lower)) return false;
        if (/^height\s*:\s*100vh/.test(lower)) return false;
        if (/^width\s*:\s*100vw/.test(lower)) return false;
        if (/^max-width\s*:\s*\d+px/.test(lower)) return false;
        if (/^font-family\s*:/.test(lower)) return false;
        if (/^color\s*:\s*(#000|#fff|rgb\(0,\s*0,\s*0\)|rgb\(255,\s*255,\s*255\))/.test(lower)) return false;
        return true;
      })
      .join("; ");
    return filtered ? `style="${filtered}"` : "";
  });
}

function trimRootStyleBlocks(html: string): string {
  return html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (m, css: string) => {
    const lower = css.toLowerCase();
    if (/(^|[^.\w])(html|body)\s*[,{]/.test(lower)) return "";
    if (/[*]\s*\{[^}]*box-sizing/.test(lower)) return "";
    return m;
  });
}

function makeImagesResponsive(html: string): string {
  return html.replace(/<img\b([^>]*)>/gi, (_m, attrs: string) => {
    let a = attrs;
    if (!/\bloading\s*=/.test(a)) a += ' loading="lazy"';
    if (!/\bdecoding\s*=/.test(a)) a += ' decoding="async"';
    if (!/\bclass\s*=/.test(a)) {
      a += ' class="img-fluid"';
    } else if (!/img-fluid/.test(a)) {
      a = a.replace(/class\s*=\s*"([^"]*)"/i, (_s, c) => `class="${c.trim()} img-fluid"`);
    }
    if (/\bstyle\s*=/.test(a)) {
      a = a.replace(/style="([^"]*)"/i, (_s, css) =>
        `style="${css.trim().replace(/;?\s*$/, "")}${/max-width\s*:/.test(css) ? "" : "; max-width:100%; height:auto"}"`
      );
    } else {
      a += ' style="max-width:100%;height:auto"';
    }
    return `<img${a}>`;
  });
}

/** Add Bootstrap button classes to CTA links so they match the PrestaShop theme. */
function applyButtonClasses(html: string): string {
  return html.replace(/<a\b([^>]*\bclass="[^"]*\b(?:btn|button|cta)\b[^"]*"[^>]*)>/gi,
    (m, attrs: string) => {
      if (/\bbtn-primary\b/.test(attrs)) return m;
      return `<a${attrs.replace(/class\s*=\s*"([^"]*)"/i, (_s, c) => `class="${c.trim()} btn btn-primary"`)}>`;
    });
}

export function adaptHtmlForPrestaShopTheme(
  html: string,
  kind: PrestaAdaptKind = "page",
  assets?: ThemeAssets | null,
): string {
  if (!html || typeof html !== "string") return html;
  let out = html;
  out = stripDocumentChrome(out);
  out = trimRootStyleBlocks(out);
  out = sanitizeOuterStyles(out);
  out = makeImagesResponsive(out);
  out = applyButtonClasses(out);

  if (/class="[^"]*\bprestashop-themed-content\b[^"]*"/.test(out)) return injectThemeAssets(out, assets);

  const kindClass = kind === "product" ? " product-description" : " page-content page-cms";
  const wrapped = `<div class="rte${kindClass} prestashop-themed-content">\n${out}\n</div>`;
  return injectThemeAssets(wrapped, assets);
}
