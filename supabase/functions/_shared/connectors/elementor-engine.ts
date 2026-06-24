/**
 * WordPress Template Compatibility Engine.
 *
 * Converts an HTML template into a native Elementor data structure so the
 * published WordPress page is fully editable inside Elementor. Layout is mapped
 * to flexbox Containers, and common elements are mapped to native widgets:
 *   - h1..h6           -> heading
 *   - p / text         -> text-editor
 *   - img              -> image
 *   - a.button/button  -> button
 *   - rows / columns   -> Containers (responsive preserved)
 *
 * The engine intentionally has no DOM dependency (Deno edge runtime), so it uses
 * a small, tolerant HTML tokenizer.
 */

export interface ElementorElement {
  id: string;
  elType: "container" | "widget";
  settings: Record<string, unknown>;
  elements: ElementorElement[];
  widgetType?: string;
}

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

function genId(): string {
  return Math.random().toString(16).slice(2, 9).padEnd(7, "0");
}

/* ----------------------------- HTML tokenizer ----------------------------- */

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const name = m[1].toLowerCase();
    const value = m[2] ?? m[3] ?? m[4] ?? "";
    attrs[name] = value;
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
    const cleaned = text.replace(/\s+/g, " ");
    if (!cleaned.trim()) return;
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
        // skip to matching close tag
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
        if (stack[i].tag === tag) {
          stack.length = i;
          break;
        }
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

/* --------------------------- helpers ------------------------------------- */

function textContent(node: HtmlNode): string {
  if (node.text) return node.text;
  return node.children.map(textContent).join(" ").replace(/\s+/g, " ").trim();
}

function innerHtml(node: HtmlNode): string {
  return node.children.map(serialize).join("");
}

function serialize(node: HtmlNode): string {
  if (node.text !== undefined) return node.text;
  const attrs = Object.entries(node.attrs)
    .map(([k, v]) => (v === "" ? ` ${k}` : ` ${k}="${v}"`))
    .join("");
  if (VOID_TAGS.has(node.tag)) return `<${node.tag}${attrs}>`;
  return `<${node.tag}${attrs}>${innerHtml(node)}</${node.tag}>`;
}

function hasClass(node: HtmlNode, ...names: string[]): boolean {
  const cls = (node.attrs.class || "").toLowerCase();
  return names.some((n) => cls.includes(n));
}

function isButton(node: HtmlNode): boolean {
  if (node.tag === "button") return true;
  if (node.tag === "a" && (hasClass(node, "btn", "button") || node.attrs.role === "button")) return true;
  return false;
}

const HEADINGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);
const TEXT_TAGS = new Set(["p", "span", "blockquote", "ul", "ol", "li", "small", "strong", "em", "label"]);
const CONTAINER_TAGS = new Set(["div", "section", "header", "footer", "main", "article", "aside", "nav", "form"]);

/* --------------------------- widget builders ----------------------------- */

function heading(node: HtmlNode): ElementorElement {
  return {
    id: genId(),
    elType: "widget",
    widgetType: "heading",
    settings: {
      title: textContent(node),
      header_size: node.tag,
    },
    elements: [],
  };
}

function textEditor(html: string): ElementorElement {
  return {
    id: genId(),
    elType: "widget",
    widgetType: "text-editor",
    settings: { editor: html.trim().startsWith("<") ? html : `<p>${html}</p>` },
    elements: [],
  };
}

function image(node: HtmlNode): ElementorElement {
  return {
    id: genId(),
    elType: "widget",
    widgetType: "image",
    settings: {
      image: { url: node.attrs.src || "", alt: node.attrs.alt || "" },
    },
    elements: [],
  };
}

function button(node: HtmlNode): ElementorElement {
  return {
    id: genId(),
    elType: "widget",
    widgetType: "button",
    settings: {
      text: textContent(node) || "Button",
      link: node.attrs.href ? { url: node.attrs.href, is_external: "", nofollow: "" } : { url: "#" },
    },
    elements: [],
  };
}

/* --------------------- advanced widget builders -------------------------- */

function findNode(node: HtmlNode, pred: (n: HtmlNode) => boolean): HtmlNode | undefined {
  for (const child of node.children) {
    if (child.tag && pred(child)) return child;
    const nested = findNode(child, pred);
    if (nested) return nested;
  }
  return undefined;
}

function findAll(node: HtmlNode, pred: (n: HtmlNode) => boolean): HtmlNode[] {
  const out: HtmlNode[] = [];
  for (const child of node.children) {
    if (child.tag && pred(child)) out.push(child);
    else out.push(...findAll(child, pred));
  }
  return out;
}

function iconList(node: HtmlNode): ElementorElement {
  const items = node.children
    .filter((c) => c.tag === "li")
    .map((li) => ({
      _id: genId(),
      text: textContent(li),
      selected_icon: { value: "fas fa-check", library: "fa-solid" },
    }));
  return {
    id: genId(),
    elType: "widget",
    widgetType: "icon-list",
    settings: { icon_list: items },
    elements: [],
  };
}

function counter(node: HtmlNode): ElementorElement {
  const numNode = findNode(node, (n) => /\d/.test(textContent(n)) && n.children.every((c) => !c.tag));
  const raw = textContent(numNode || node);
  const ending = parseInt(raw.replace(/[^\d]/g, ""), 10) || 0;
  const titleNode = findNode(node, (n) => HEADINGS.has(n.tag) || hasClass(n, "title", "label"));
  return {
    id: genId(),
    elType: "widget",
    widgetType: "counter",
    settings: {
      starting_number: 0,
      ending_number: ending,
      title: titleNode ? textContent(titleNode) : "",
    },
    elements: [],
  };
}

function testimonial(node: HtmlNode): ElementorElement {
  const img = findNode(node, (n) => n.tag === "img");
  const nameNode = findNode(node, (n) => hasClass(n, "name", "author") || HEADINGS.has(n.tag));
  const jobNode = findNode(node, (n) => hasClass(n, "role", "job", "title", "position"));
  const contentNode = findNode(node, (n) => n.tag === "p" || hasClass(n, "content", "text", "quote"));
  return {
    id: genId(),
    elType: "widget",
    widgetType: "testimonial",
    settings: {
      testimonial_content: contentNode ? textContent(contentNode) : textContent(node),
      testimonial_name: nameNode ? textContent(nameNode) : "",
      testimonial_job: jobNode ? textContent(jobNode) : "",
      testimonial_image: img ? { url: img.attrs.src || "" } : { url: "" },
    },
    elements: [],
  };
}

function iconBox(node: HtmlNode): ElementorElement {
  const titleNode = findNode(node, (n) => HEADINGS.has(n.tag) || hasClass(n, "title"));
  const descNode = findNode(node, (n) => n.tag === "p" || hasClass(n, "desc", "text", "description"));
  return {
    id: genId(),
    elType: "widget",
    widgetType: "icon-box",
    settings: {
      title_text: titleNode ? textContent(titleNode) : "",
      description_text: descNode ? textContent(descNode) : "",
      selected_icon: { value: "fas fa-star", library: "fa-solid" },
    },
    elements: [],
  };
}

function imageBox(node: HtmlNode): ElementorElement {
  const img = findNode(node, (n) => n.tag === "img");
  const titleNode = findNode(node, (n) => HEADINGS.has(n.tag) || hasClass(n, "title"));
  const descNode = findNode(node, (n) => n.tag === "p" || hasClass(n, "desc", "text", "description"));
  return {
    id: genId(),
    elType: "widget",
    widgetType: "image-box",
    settings: {
      image: img ? { url: img.attrs.src || "", alt: img.attrs.alt || "" } : { url: "" },
      title_text: titleNode ? textContent(titleNode) : "",
      description_text: descNode ? textContent(descNode) : "",
    },
    elements: [],
  };
}

function accordion(node: HtmlNode): ElementorElement {
  const items = findAll(node, (n) => hasClass(n, "accordion-item", "accordion__item", "faq-item")).map((item) => {
    const head = findNode(item, (n) => HEADINGS.has(n.tag) || hasClass(n, "title", "header", "question"));
    const bodyNode = findNode(item, (n) => hasClass(n, "content", "body", "answer", "panel"));
    return {
      _id: genId(),
      tab_title: head ? textContent(head) : textContent(item).slice(0, 60),
      tab_content: bodyNode ? innerHtml(bodyNode) : "",
    };
  });
  return {
    id: genId(),
    elType: "widget",
    widgetType: "accordion",
    settings: { tabs: items },
    elements: [],
  };
}

function tabs(node: HtmlNode): ElementorElement {
  const panels = findAll(node, (n) => hasClass(n, "tab-pane", "tab-panel", "tabs__panel", "tab-content"));
  const titles = findAll(node, (n) => hasClass(n, "tab-title", "tab-link", "nav-link", "tabs__title"));
  const items = panels.map((panel, i) => ({
    _id: genId(),
    tab_title: titles[i] ? textContent(titles[i]) : `Tab ${i + 1}`,
    tab_content: innerHtml(panel),
  }));
  return {
    id: genId(),
    elType: "widget",
    widgetType: "tabs",
    settings: { tabs: items },
    elements: [],
  };
}

/**
 * Detect rich UI patterns by class names and structure, returning the matching
 * native Elementor widget (or null to fall back to generic conversion).
 */
function detectSpecialWidget(node: HtmlNode): ElementorElement | null {
  if (node.tag === "ul" || node.tag === "ol") return iconList(node);
  if (hasClass(node, "accordion", "faq")) return accordion(node);
  if (hasClass(node, "tabs", "tab-wrapper", "tabbed")) return tabs(node);
  if (hasClass(node, "counter", "stat", "stats", "countup")) return counter(node);
  if (hasClass(node, "testimonial", "review", "quote-card")) return testimonial(node);
  if (hasClass(node, "image-box", "img-box")) return imageBox(node);
  if (hasClass(node, "icon-box", "feature-box", "feature-card", "service-box")) return iconBox(node);
  return null;
}

function container(children: ElementorElement[], node?: HtmlNode, topLevel = false): ElementorElement {
  const settings: Record<string, unknown> = {
    content_width: "boxed",
    flex_direction: "column",
  };
  // Top-level sections stretch edge-to-edge so the page matches the template
  // 1:1 (no theme gutters / boxed wrapper around each section).
  if (topLevel) {
    settings.content_width = "full";
    settings.width = "100%";
    settings.flex_align_items = "center";
  }
  // Detect column/row layouts to preserve responsive grids.
  if (node && hasClass(node, "row", "columns", "flex", "grid", "d-flex")) {
    settings.flex_direction = "row";
    settings.flex_wrap = "wrap";
  }
  return { id: genId(), elType: "container", settings, elements: children };
}

/* --------------------------- tree conversion ----------------------------- */

function convertChildren(nodes: HtmlNode[]): ElementorElement[] {
  const out: ElementorElement[] = [];
  let textBuffer = "";

  const flush = () => {
    if (textBuffer.trim()) out.push(textEditor(textBuffer));
    textBuffer = "";
  };

  for (const node of nodes) {
    if (node.text !== undefined) {
      textBuffer += node.text;
      continue;
    }
    if (IGNORED_TAGS.has(node.tag)) continue;

    const special = detectSpecialWidget(node);
    if (special) {
      flush();
      out.push(special);
      continue;
    }

    if (HEADINGS.has(node.tag)) {
      flush();
      out.push(heading(node));
    } else if (node.tag === "img") {
      flush();
      out.push(image(node));
    } else if (isButton(node)) {
      flush();
      out.push(button(node));
    } else if (CONTAINER_TAGS.has(node.tag)) {
      flush();
      const inner = convertChildren(node.children);
      if (inner.length > 0) out.push(container(inner, node));
    } else if (TEXT_TAGS.has(node.tag) || node.tag === "a") {
      // Inline/textual content -> accumulate as rich text editor block.
      textBuffer += serialize(node);
    } else {
      // Unknown element: recurse so we don't drop content.
      const inner = convertChildren(node.children);
      if (inner.length > 0) {
        flush();
        out.push(...inner);
      } else {
        textBuffer += serialize(node);
      }
    }
  }
  flush();
  return out;
}

/**
 * A container is treated as a pure layout wrapper when it only groups other
 * elements without meaningful grid/row structure. We unwrap such wrappers so
 * each real visual section becomes its own top-level Elementor Container
 * instead of being nested inside one giant page container.
 */
function isLayoutContainer(el: ElementorElement): boolean {
  return (
    el.elType === "container" &&
    (el.settings.container_type === "grid" || el.settings.flex_direction === "row")
  );
}

function isPlainWrapper(el: ElementorElement): boolean {
  if (el.elType !== "container") return false;
  return !isLayoutContainer(el);
}

/**
 * Recursively remove redundant wrapper containers while preserving any
 * container that carries real layout meaning (grid / flex-row / columns).
 */
function unwrapRedundant(elements: ElementorElement[]): ElementorElement[] {
  const out: ElementorElement[] = [];
  for (const el of elements) {
    el.elements = unwrapRedundant(el.elements);
    if (isLayoutContainer(el)) {
      out.push(el);
      continue;
    }
    if (isPlainWrapper(el)) {
      if (el.elements.length === 1 && el.elements[0].elType === "container") {
        out.push(el.elements[0]);
        continue;
      }
      if (el.elements.length > 1 && el.elements.every((c) => c.elType === "container")) {
        out.push(...el.elements);
        continue;
      }
    }
    out.push(el);
  }
  return out;
}

/**
 * Promote nested sections to the top level. If converting produced a single
 * wrapper container (the page/body wrapper) holding multiple section
 * containers, lift those sections out so they sit as independent top-level
 * Containers, mirroring the original template structure.
 */
function flattenSections(elements: ElementorElement[]): ElementorElement[] {
  let current = unwrapRedundant(elements);
  while (current.length === 1 && isPlainWrapper(current[0]) && current[0].elements.length > 1) {
    current = current[0].elements;
  }
  return current;
}

/**
 * Convert an HTML string into a top-level array of Elementor elements
 * (each visual section becomes its own full-width top-level Container).
 */
export function htmlToElementor(html: string): ElementorElement[] {
  const tree = parseHtml(html || "");
  const converted = flattenSections(convertChildren(tree));
  // Ensure every top-level element is a full-width container (Elementor sections).
  return converted.map((el) =>
    el.elType === "container"
      ? { ...el, settings: { ...el.settings, content_width: "full", width: "100%" } }
      : container([el], undefined, true)
  );
}

/**
 * Extract the renderable markup of a template: all <style> blocks (so the
 * design CSS, including background-image rules, is preserved) plus the <body>
 * markup, with <script>/<meta>/<link> removed. Returned as a single HTML string
 * that renders identically to the original template.
 */
function extractRenderableHtml(html: string): string {
  const input = html || "";
  // Collect every <style> block verbatim (keeps fonts, layout, bg images).
  const styles = (input.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi) || []).join("\n");
  // Prefer the <body> inner markup; fall back to the whole document.
  const bodyMatch = input.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  let body = bodyMatch ? bodyMatch[1] : input;
  body = body
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<meta\b[^>]*>/gi, "")
    .replace(/<link\b[^>]*>/gi, "")
    .replace(/<\/?(?:html|head|body)\b[^>]*>/gi, "")
    .trim();
  return `${styles}\n${body}`.trim();
}

/**
 * Build the WordPress post meta needed to render the template 1:1 inside
 * Elementor. The entire template (markup + its <style> CSS + background images)
 * is embedded in a single Elementor "html" widget so it renders verbatim —
 * independent of Elementor's per-page CSS generation (which never runs when a
 * page is created via the REST API) and immune to WordPress kses stripping
 * <style> tags from post_content.
 *
 * The Elementor "Canvas" page template is forced so the page renders with NO
 * theme header/footer/sidebar and full width — matching the original design.
 */
export function buildElementorMeta(html: string, version = "3.21.0"): Record<string, unknown> {
  const renderable = extractRenderableHtml(html);
  const htmlWidget: ElementorElement = {
    id: genId(),
    elType: "widget",
    widgetType: "html",
    settings: { html: renderable },
    elements: [],
  };
  const data: ElementorElement[] = [
    container([htmlWidget], undefined, true),
  ];
  return {
    _elementor_edit_mode: "builder",
    _elementor_template_type: "wp-page",
    _elementor_version: version,
    _elementor_data: JSON.stringify(data),
    // NOTE: `_elementor_page_settings` is intentionally omitted. Elementor
    // registers it with an `object` REST schema, so sending a JSON string
    // triggers `rest_invalid_type` (HTTP 400). Forcing the canvas template via
    // `_wp_page_template` already yields the full-width, header/footer-less
    // layout we need, so the page-settings meta is unnecessary.
    _wp_page_template: "elementor_canvas",
  };
}
