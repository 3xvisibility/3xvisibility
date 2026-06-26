// Gutenberg (WordPress block editor) conversion engine.
//
// STRUCTURE-NOW baseline: we wrap the template HTML in a single `core/html`
// block so the page publishes correctly and renders the template design 1:1
// inside the block editor today. Native per-element block mapping (headings,
// paragraphs, images, buttons, columns) is a later iteration — the mapping
// table + TODO hooks below are where that work plugs in without changing the
// publish pipeline.
//
// IMPORTANT: this never generates or inserts images. Images come only from the
// template HTML; the WordPress connector uploads them to the Media Library and
// rewrites the URLs before this markup is published.

/** Future native block mapping table (HTML tag → Gutenberg block name). */
export const GUTENBERG_BLOCK_MAP: Record<string, string> = {
  h1: "core/heading",
  h2: "core/heading",
  h3: "core/heading",
  p: "core/paragraph",
  img: "core/image",
  a: "core/button",
  ul: "core/list",
  ol: "core/list",
};

function escapeHtmlComment(html: string): string {
  // Gutenberg block delimiters are HTML comments; a literal "-->" inside the
  // wrapped HTML would prematurely close the block comment. Neutralise it.
  return html.replace(/--+>/g, (m) => m.replace(/>/g, "&gt;"));
}

/**
 * Convert resolved template HTML to Gutenberg block markup.
 * Baseline implementation wraps the markup in a full-width `core/html` block.
 */
export function htmlToGutenberg(html: string): string {
  const clean = (html || "").trim();
  if (!clean) return "";

  // TODO(native-blocks): walk the DOM and emit native blocks using
  // GUTENBERG_BLOCK_MAP. Until then, a single core/html block preserves the
  // exact template design (styles + structure) inside the block editor.
  const safe = escapeHtmlComment(clean);
  return `<!-- wp:html -->\n${safe}\n<!-- /wp:html -->`;
}
