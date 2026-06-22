/**
 * WordPress Theme Adapter (browser mirror).
 * Keep in sync with supabase/functions/_shared/connectors/wordpress-theme-adapter.ts
 *
 * Design-fidelity mode: the generated page should look EXACTLY like the
 * template. We preserve the template's own CSS (inline styles + <style>
 * blocks) and only scope global selectors to the page wrapper so they don't
 * leak into the rest of the site. We still add lightweight WP/Gutenberg
 * classes and image attributes, but never remove the template's design.
 */

import { injectThemeAssets, type ThemeAssets } from "./theme-assets";

export type WpAdaptKind = "page" | "post" | "product";

const WRAPPER = "wp-themed-content";

/** Pull every <style> block out of the document (head + body) so we can re-emit it scoped. */
function extractStyleBlocks(html: string): { styles: string[]; rest: string } {
  const styles: string[] = [];
  const rest = html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_m, css: string) => {
    if (css && css.trim()) styles.push(css.trim());
    return "";
  });
  return { styles, rest };
}

/** Remove document scaffolding but KEEP the design (styles already extracted). */
function stripDocumentChrome(html: string): string {
  let out = html.replace(/<!doctype[^>]*>/gi, "");
  out = out.replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, "");
  for (const tag of ["html", "body", "script", "title", "meta", "link"]) {
    out = out
      .replace(new RegExp(`<${tag}\\b[^>]*>`, "gi"), "")
      .replace(new RegExp(`<\\/${tag}>`, "gi"), "");
  }
  return out.trim();
}

/** Scope global selectors (html/body/*) to the wrapper so the template CSS stays self-contained. */
function scopeStyles(styles: string[]): string {
  if (!styles.length) return "";
  const scoped = styles
    .join("\n")
    .replace(/(^|[}])\s*(html|body)\b/gi, (_m, pre: string) => `${pre} .${WRAPPER}`)
    .replace(/(^|[}])\s*\*(\s*[,{])/g, (_m, pre: string, post: string) => `${pre} .${WRAPPER} *${post}`);
  return `<style>\n${scoped}\n</style>\n`;
}

/** Add WP/Gutenberg classes + responsive image attrs without removing existing design. */
function applyGutenbergClasses(html: string): string {
  let out = html;

  out = out.replace(/<img\b([^>]*)>/gi, (_m, attrs: string) => {
    let a = attrs;
    if (!/\bloading\s*=/.test(a)) a += ' loading="lazy"';
    if (!/\bdecoding\s*=/.test(a)) a += ' decoding="async"';
    if (!/\bclass\s*=/.test(a)) {
      a += ' class="wp-image size-full"';
    } else if (!/wp-image/.test(a)) {
      a = a.replace(/class\s*=\s*"([^"]*)"/i, (_s, c) => `class="${c.trim()} wp-image size-full"`);
    }
    if (!/\bstyle\s*=/.test(a)) {
      a += ' style="max-width:100%;height:auto"';
    } else if (!/max-width\s*:/.test(a)) {
      a = a.replace(/style="([^"]*)"/i, (_s, css) => `style="${css.trim().replace(/;?\s*$/, "")}; max-width:100%; height:auto"`);
    }
    return `<img${a}>`;
  });

  out = out.replace(/<a\b([^>]*\bclass="[^"]*\b(?:btn|button|cta)\b[^"]*"[^>]*)>([\s\S]*?)<\/a>/gi,
    (_m, attrs: string, inner: string) => {
      const a = /wp-block-button__link/.test(attrs)
        ? attrs
        : attrs.replace(/class\s*=\s*"([^"]*)"/i, (_s, c) => `class="${c.trim()} wp-block-button__link wp-element-button"`);
      return `<div class="wp-block-button">${`<a${a}>${inner}</a>`}</div>`;
    });

  return out;
}

export function adaptHtmlForWordPressTheme(
  html: string,
  kind: WpAdaptKind = "page",
  assets?: ThemeAssets | null,
): string {
  if (!html || typeof html !== "string") return html;

  const { styles, rest } = extractStyleBlocks(html);
  let out = stripDocumentChrome(rest);
  out = applyGutenbergClasses(out);

  const styleTag = scopeStyles(styles);

  if (/class="[^"]*\bwp-themed-content\b[^"]*"/.test(out)) {
    return injectThemeAssets(styleTag + out, assets);
  }

  const kindClass = kind === "product" ? " woocommerce-product-details__short-description" : "";
  const wrapped = `${styleTag}<div class="entry-content wp-block-post-content ${WRAPPER}${kindClass}">\n${out}\n</div>`;
  return injectThemeAssets(wrapped, assets);
}
