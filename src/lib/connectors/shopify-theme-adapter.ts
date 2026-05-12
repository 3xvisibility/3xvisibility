/**
 * Shopify Theme Adapter (browser mirror).
 * Keep in sync with supabase/functions/_shared/connectors/shopify-theme-adapter.ts
 */
export type ShopifyAdaptKind = "page" | "product";

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

function makeImagesResponsive(html: string): string {
  return html.replace(/<img\b([^>]*)>/gi, (_m, attrs: string) => {
    let a = attrs;
    if (!/\bloading\s*=/.test(a)) a += ' loading="lazy"';
    if (!/\bdecoding\s*=/.test(a)) a += ' decoding="async"';
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

function trimRootStyleBlocks(html: string): string {
  return html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (m, css: string) => {
    const lower = css.toLowerCase();
    if (/(^|[^.\w])(html|body)\s*[,{]/.test(lower)) return "";
    if (/[*]\s*\{[^}]*box-sizing/.test(lower)) return "";
    return m;
  });
}

export function adaptHtmlForShopifyTheme(html: string, kind: ShopifyAdaptKind = "page"): string {
  if (!html || typeof html !== "string") return html;
  let out = html;
  out = stripDocumentChrome(out);
  out = trimRootStyleBlocks(out);
  out = sanitizeOuterStyles(out);
  out = makeImagesResponsive(out);
  if (/class="[^"]*\bshopify-themed-content\b[^"]*"/.test(out)) return out;
  const productClass = kind === "product" ? " product__description" : "";
  return `<div class="page-width rte shopify-themed-content${productClass}">\n${out}\n</div>`;
}
