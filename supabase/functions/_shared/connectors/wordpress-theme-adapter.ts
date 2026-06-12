/**
 * WordPress Theme Adapter (browser mirror).
 * Keep in sync with supabase/functions/_shared/connectors/wordpress-theme-adapter.ts
 *
 * Normalizes generated HTML so a published WordPress page inherits the active
 * theme + Gutenberg block styling instead of fighting it. Goal: pages look
 * native — like they were built with the block editor / a common page builder
 * (Elementor, Gutenberg, Astra, Kadence, GeneratePress, OceanWP, Divi).
 */

export type WpAdaptKind = "page" | "post" | "product";

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

/** Remove inline declarations that hijack the active theme's design tokens. */
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

/** Strip global resets that break theme tokens; keep scoped component CSS. */
function trimRootStyleBlocks(html: string): string {
  return html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (m, css: string) => {
    const lower = css.toLowerCase();
    if (/(^|[^.\w])(html|body)\s*[,{]/.test(lower)) return "";
    if (/[*]\s*\{[^}]*box-sizing/.test(lower)) return "";
    return m;
  });
}

/** Apply Gutenberg block classes so headings/paragraphs/buttons/images match the editor. */
function applyGutenbergClasses(html: string): string {
  let out = html;

  // Images → responsive + wp-image classes (themes assume max-width:100%)
  out = out.replace(/<img\b([^>]*)>/gi, (_m, attrs: string) => {
    let a = attrs;
    if (!/\bloading\s*=/.test(a)) a += ' loading="lazy"';
    if (!/\bdecoding\s*=/.test(a)) a += ' decoding="async"';
    if (!/\bclass\s*=/.test(a)) {
      a += ' class="wp-image aligncenter size-full"';
    } else if (!/wp-image/.test(a)) {
      a = a.replace(/class\s*=\s*"([^"]*)"/i, (_s, c) => `class="${c.trim()} wp-image size-full"`);
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

  // Buttons / CTA links → wp-block-button styling so they pick up theme button design
  out = out.replace(/<a\b([^>]*\bclass="[^"]*\b(?:btn|button|cta)\b[^"]*"[^>]*)>([\s\S]*?)<\/a>/gi,
    (_m, attrs: string, inner: string) => {
      const a = /wp-block-button__link/.test(attrs)
        ? attrs
        : attrs.replace(/class\s*=\s*"([^"]*)"/i, (_s, c) => `class="${c.trim()} wp-block-button__link wp-element-button"`);
      return `<div class="wp-block-button"><a${a}>${inner}</a></div>`;
    });

  return out;
}

export function adaptHtmlForWordPressTheme(html: string, kind: WpAdaptKind = "page"): string {
  if (!html || typeof html !== "string") return html;
  let out = html;
  out = stripDocumentChrome(out);
  out = trimRootStyleBlocks(out);
  out = sanitizeOuterStyles(out);
  out = applyGutenbergClasses(out);

  if (/class="[^"]*\bwp-themed-content\b[^"]*"/.test(out)) return out;

  const kindClass = kind === "product" ? " woocommerce-product-details__short-description" : "";
  return `<div class="entry-content wp-block-post-content is-layout-constrained wp-themed-content${kindClass}">\n${out}\n</div>`;
}
