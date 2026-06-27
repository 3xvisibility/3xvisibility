// Gutenberg (WordPress block editor) conversion engine.
//
// Converts resolved template HTML into NATIVE Gutenberg block markup so the
// published page is fully editable in the block editor (no opaque core/html
// wrapper for mappable elements). The mapping covers the elements that carry
// the template's content and design:
//
//   h1..h6            -> core/heading   (level preserved)
//   p / span / text   -> core/paragraph
//   img               -> core/image
//   a.button / button -> core/button (wrapped in core/buttons)
//   ul / ol           -> core/list (+ core/list-item)
//   blockquote        -> core/quote
//   hr                -> core/separator
//   figure>img        -> core/image
//   section/div/...    -> core/group (recurses into children)
//
// Anything that cannot be mapped cleanly (inline styled markup, tables, SVG,
// embeds) is preserved 1:1 inside a core/html block so nothing is lost and the
// design still renders exactly.
//
// IMPORTANT: this never generates or inserts images. Images come only from the
// template HTML; the WordPress connector uploads them to the Media Library and
// rewrites the URLs before this markup is published.

/** HTML tag → Gutenberg block name (informational / for tooling). */
export const GUTENBERG_BLOCK_MAP: Record<string, string> = {
  h1: "core/heading",
  h2: "core/heading",
  h3: "core/heading",
  h4: "core/heading",
  h5: "core/heading",
  h6: "core/heading",
  p: "core/paragraph",
  img: "core/image",
  a: "core/button",
  button: "core/button",
  ul: "core/list",
  ol: "core/list",
  blockquote: "core/quote",
  hr: "core/separator",
};

/* ----------------------------- HTML tokenizer ----------------------------- */

interface HtmlNode {
  tag: string; // "" for text nodes
  attrs: Record<string, string>;
  children: HtmlNode[];
  text?: string;
}

const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

const IGNORED_TAGS = new Set(["script", "style", "head", "meta", "link", "title", "noscript"]);

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? "";
  }
  return attrs;
}

function parseHtml(html: string): HtmlNode[] {
  const root: HtmlNode = { tag: "#root", attrs: {}, children: [] };
  const stack: HtmlNode[] = [root];
  const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)\/?>/g;
  let last = 0;
  let m: RegExpExecArray | null;

  const pushText = (text: string) => {
    if (!text.replace(/\s+/g, " ").trim()) return;
    stack[stack.length - 1].children.push({ tag: "", attrs: {}, children: [], text });
  };

  while ((m = tagRe.exec(html)) !== null) {
    if (m.index > last) pushText(html.slice(last, m.index));
    last = tagRe.lastIndex;

    const full = m[0];
    const tag = m[1].toLowerCase();
    const isClose = full.startsWith("</");
    const selfClose = full.endsWith("/>") || VOID_TAGS.has(tag);

    if (IGNORED_TAGS.has(tag)) {
      if (!isClose && !selfClose) {
        const closeRe = new RegExp(`</${tag}\\s*>`, "i");
        const rest = html.slice(last);
        const cm = rest.match(closeRe);
        if (cm && cm.index !== undefined) {
          last = last + cm.index + cm[0].length;
          tagRe.lastIndex = last;
        }
      }
      continue;
    }

    if (isClose) {
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === tag) { stack.length = i; break; }
      }
    } else {
      const node: HtmlNode = { tag, attrs: parseAttrs(m[2] || ""), children: [] };
      stack[stack.length - 1].children.push(node);
      if (!selfClose) stack.push(node);
    }
  }
  if (last < html.length) pushText(html.slice(last));
  return root.children;
}

/* ------------------------------- helpers --------------------------------- */

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escAttr(s: string): string {
  return esc(s).replace(/"/g, "&quot;");
}

function escapeHtmlComment(html: string): string {
  // Gutenberg block delimiters are HTML comments; a literal "-->" inside wrapped
  // HTML would prematurely close the block comment. Neutralise it.
  return html.replace(/--+>/g, (m) => m.replace(/>/g, "&gt;"));
}

function textContent(node: HtmlNode): string {
  if (node.text) return node.text.replace(/\s+/g, " ").trim();
  return node.children.map(textContent).join(" ").replace(/\s+/g, " ").trim();
}

/** Serialize a node back to raw HTML (used for core/html fallback + inline runs). */
function serialize(node: HtmlNode): string {
  if (node.text != null) return esc(node.text);
  const attrs = Object.entries(node.attrs)
    .map(([k, v]) => (v === "" ? ` ${k}` : ` ${k}="${escAttr(v)}"`))
    .join("");
  if (VOID_TAGS.has(node.tag)) return `<${node.tag}${attrs}>`;
  return `<${node.tag}${attrs}>${node.children.map(serialize).join("")}</${node.tag}>`;
}

/** Inline HTML (keeps <strong>/<em>/<a> etc.) for rich text blocks. */
function inlineHtml(node: HtmlNode): string {
  return node.children.map(serialize).join("").replace(/\s+/g, " ").trim();
}

function hasClass(node: HtmlNode, ...names: string[]): boolean {
  const cls = (node.attrs.class || "").toLowerCase();
  return names.some((n) => cls.includes(n));
}

const CONTAINER_TAGS = new Set(["div", "section", "article", "main", "header", "footer", "aside", "figure", "nav"]);
const STRUCTURE_PASSTHROUGH = new Set(["html", "body", "#root"]);

/* ------------------------------- mapping --------------------------------- */

function findFirstImg(node: HtmlNode): HtmlNode | null {
  if (node.tag === "img") return node;
  for (const c of node.children) {
    const f = findFirstImg(c);
    if (f) return f;
  }
  return null;
}

function imageBlock(img: HtmlNode): string {
  const src = img.attrs.src || "";
  if (!src) return "";
  const alt = img.attrs.alt || "";
  return (
    `<!-- wp:image -->\n` +
    `<figure class="wp-block-image">` +
    `<img src="${escAttr(src)}" alt="${escAttr(alt)}"/>` +
    `</figure>\n` +
    `<!-- /wp:image -->`
  );
}

function headingBlock(node: HtmlNode): string {
  const level = Number(node.tag.slice(1)) || 2;
  const content = inlineHtml(node);
  if (!content) return "";
  return (
    `<!-- wp:heading {"level":${level}} -->\n` +
    `<h${level} class="wp-block-heading">${content}</h${level}>\n` +
    `<!-- /wp:heading -->`
  );
}

function paragraphBlock(node: HtmlNode): string {
  const content = inlineHtml(node);
  if (!content) return "";
  return `<!-- wp:paragraph -->\n<p>${content}</p>\n<!-- /wp:paragraph -->`;
}

function buttonBlock(node: HtmlNode): string {
  const label = textContent(node);
  if (!label) return "";
  const href = node.attrs.href || "#";
  return (
    `<!-- wp:buttons -->\n` +
    `<div class="wp-block-buttons">` +
    `<!-- wp:button -->` +
    `<div class="wp-block-button">` +
    `<a class="wp-block-button__link wp-element-button" href="${escAttr(href)}">${esc(label)}</a>` +
    `</div>` +
    `<!-- /wp:button -->` +
    `</div>\n` +
    `<!-- /wp:buttons -->`
  );
}

function listBlock(node: HtmlNode): string {
  const ordered = node.tag === "ol";
  const items = node.children.filter((c) => c.tag === "li");
  if (items.length === 0) return "";
  const itemMarkup = items
    .map((li) => `<!-- wp:list-item -->\n<li>${inlineHtml(li)}</li>\n<!-- /wp:list-item -->`)
    .join("\n");
  const tag = ordered ? "ol" : "ul";
  const attr = ordered ? ' {"ordered":true}' : "";
  return (
    `<!-- wp:list${attr} -->\n` +
    `<${tag} class="wp-block-list">\n${itemMarkup}\n</${tag}>\n` +
    `<!-- /wp:list -->`
  );
}

function quoteBlock(node: HtmlNode): string {
  const inner = mapChildren(node);
  if (!inner.trim()) return "";
  return `<!-- wp:quote -->\n<blockquote class="wp-block-quote">${inner}</blockquote>\n<!-- /wp:quote -->`;
}

/** Wrap raw markup we cannot map natively so it still renders exactly. */
function htmlBlock(raw: string): string {
  const clean = raw.trim();
  if (!clean) return "";
  return `<!-- wp:html -->\n${escapeHtmlComment(clean)}\n<!-- /wp:html -->`;
}

/** A node is "purely inline content" if it has no block-level descendants. */
function isInlineOnly(node: HtmlNode): boolean {
  const BLOCK = new Set([
    ...CONTAINER_TAGS, "h1", "h2", "h3", "h4", "h5", "h6", "p", "ul", "ol",
    "li", "blockquote", "table", "img", "hr",
  ]);
  for (const c of node.children) {
    if (c.tag === "") continue;
    if (BLOCK.has(c.tag)) return false;
    if (!isInlineOnly(c)) return false;
  }
  return true;
}

function mapNode(node: HtmlNode): string {
  if (node.text != null) {
    const t = node.text.replace(/\s+/g, " ").trim();
    return t ? `<!-- wp:paragraph -->\n<p>${esc(t)}</p>\n<!-- /wp:paragraph -->` : "";
  }

  const tag = node.tag;

  if (/^h[1-6]$/.test(tag)) return headingBlock(node);
  if (tag === "p") return paragraphBlock(node);
  if (tag === "img") return imageBlock(node);
  if (tag === "hr") return "<!-- wp:separator -->\n<hr class=\"wp-block-separator has-alpha-channel-opacity\"/>\n<!-- /wp:separator -->";
  if (tag === "ul" || tag === "ol") return listBlock(node);
  if (tag === "blockquote") return quoteBlock(node);

  // Buttons: <a> styled as a button, or a real <button>.
  if (tag === "button" || (tag === "a" && hasClass(node, "button", "btn", "wp-block-button"))) {
    return buttonBlock(node);
  }

  // Standalone link that is the only child → treat as button-like CTA.
  if (tag === "a") {
    // Inline anchor inside flowing text is handled by inlineHtml of its parent;
    // a top-level anchor becomes a paragraph with the link preserved.
    return `<!-- wp:paragraph -->\n<p>${inlineHtml({ ...node, children: [node] })}</p>\n<!-- /wp:paragraph -->`;
  }

  // figure with an image inside.
  if (tag === "figure") {
    const img = findFirstImg(node);
    if (img) return imageBlock(img);
  }

  // Containers: recurse. Inline-only containers (e.g. a styled <div> of text)
  // are preserved as a single core/html block to keep their styling intact.
  if (CONTAINER_TAGS.has(tag) || STRUCTURE_PASSTHROUGH.has(tag)) {
    if (isInlineOnly(node)) {
      // Pure inline/text container with styling → preserve exactly.
      const inner = inlineHtml(node);
      if (!inner) return "";
      // If it carries no class/style worth keeping, emit a clean paragraph.
      if (!node.attrs.class && !node.attrs.style) {
        return `<!-- wp:paragraph -->\n<p>${inner}</p>\n<!-- /wp:paragraph -->`;
      }
      return htmlBlock(serialize(node));
    }
    const inner = mapChildren(node);
    if (!inner.trim()) return "";
    // Wrap structural containers in a core/group so nesting is preserved/editable.
    if (STRUCTURE_PASSTHROUGH.has(tag)) return inner;
    return (
      `<!-- wp:group {"layout":{"type":"constrained"}} -->\n` +
      `<div class="wp-block-group">\n${inner}\n</div>\n` +
      `<!-- /wp:group -->`
    );
  }

  // Tables and anything else we don't map: preserve exactly.
  return htmlBlock(serialize(node));
}

function mapChildren(node: HtmlNode): string {
  return node.children
    .map(mapNode)
    .filter((s) => s.trim().length > 0)
    .join("\n\n");
}

/** Pull every <style> block out of the HTML so we can re-inject the CSS. */
function extractStyleCss(html: string): string {
  const blocks: string[] = [];
  const re = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const css = (m[1] || "").trim();
    if (css) blocks.push(css);
  }
  return blocks.join("\n");
}

/**
 * Convert resolved template HTML to NATIVE Gutenberg block markup.
 * Falls back to a single core/html block only if parsing yields nothing.
 * The template's <style> CSS is preserved in a leading core/html block so the
 * class-based design renders 1:1 on the published page.
 */
export function htmlToGutenberg(html: string): string {
  const clean = (html || "").trim();
  if (!clean) return "";

  const css = extractStyleCss(clean);
  const cssBlock = css ? htmlBlock(`<style>\n${css}\n</style>`) : "";

  try {
    const nodes = parseHtml(clean);
    const blocks = nodes
      .map(mapNode)
      .filter((s) => s.trim().length > 0)
      .join("\n\n");
    if (blocks.trim()) return [cssBlock, blocks].filter(Boolean).join("\n\n");
  } catch (_e) {
    // fall through to safe wrapper
  }


  // Safety net: never lose the template — wrap it whole.
  return htmlBlock(clean);
}
