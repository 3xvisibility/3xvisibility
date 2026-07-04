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

import { StyleResolver, styleButton, styleContainer, styleContainerResponsive, styleHeading, styleImage, styleText, styleTypographyResponsive, type NodeLike, type StyleProps } from "./style-extract.ts";
import type { SiteContext } from "./wp-site-context.ts";

// Module-scoped style baking state. Set by `htmlToElementor` so the widget
// builders can bake the template's CSS into native Elementor settings without
// changing every builder signature. Null when styling is unavailable.
let CURRENT_RESOLVER: StyleResolver | null = null;
let CURRENT_CTX: SiteContext | undefined = undefined;
// Ancestor text-color stack. Normal HTML text inherits `color` from its nearest
// styled ancestor (e.g. a hero <section style="color:#fff">). Native Elementor
// widgets do NOT inherit container colors, so we propagate the nearest ancestor
// color down and bake it onto text/heading widgets that declare no own color —
// otherwise light-on-dark hero copy renders as invisible dark-on-dark text.
let CURRENT_COLOR_STACK: string[] = [];

function inheritedColor(): string | undefined {
  return CURRENT_COLOR_STACK.length ? CURRENT_COLOR_STACK[CURRENT_COLOR_STACK.length - 1] : undefined;
}

function bakedSettings(
  node: HtmlNode | undefined,
  apply: (settings: Record<string, unknown>, props: ReturnType<StyleResolver["resolve"]>, ctx?: SiteContext) => void,
  settings: Record<string, unknown>,
): Record<string, unknown> {
  if (!CURRENT_RESOLVER || !node) return settings;
  const devices = CURRENT_RESOLVER.resolveDevices(node as NodeLike);
  const props = devices.desktop;
  // Inherit text color from the nearest styled ancestor for text/heading widgets
  // that don't set their own color, mirroring the CSS cascade.
  if ((apply === styleText || apply === styleHeading) && !props.color) {
    const inherited = inheritedColor();
    if (inherited) props.color = inherited;
  }
  apply(settings, props, CURRENT_CTX);

  // Bake tablet/mobile overrides so the published page is responsive in Elementor.
  if (apply === styleContainer) {
    styleContainerResponsive(settings, props, devices.tablet as StyleProps, "_tablet");
    styleContainerResponsive(settings, props, devices.mobile as StyleProps, "_mobile");
  } else if (apply === styleText || apply === styleHeading) {
    styleTypographyResponsive(settings, props, devices.tablet as StyleProps, "_tablet");
    styleTypographyResponsive(settings, props, devices.mobile as StyleProps, "_mobile");
  }
  return settings;
}


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

function sanitizeAttrValue(value: string): string {
  // Malformed source templates (unterminated quotes, stray `<`) must never let
  // raw markup leak into an attribute value (e.g. href="#c</div></div>...").
  // Cut the value at the first angle bracket OR URL/entity-encoded angle bracket
  // so structure can't be swallowed after WordPress encodes the bad value.
  const cut = value.search(/[<>]|%3c|%3e|&lt;|&gt;/i);
  return (cut === -1 ? value : value.slice(0, cut)).trim();
}

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const name = m[1].toLowerCase();
    const value = m[2] ?? m[3] ?? m[4] ?? "";
    attrs[name] = sanitizeAttrValue(value);
  }
  return attrs;
}

function parseHtml(html: string): HtmlNode[] {
  const root: HtmlNode = { tag: "#root", attrs: {}, children: [] };
  const stack: HtmlNode[] = [root];
  // NOTE: attributes are matched non-greedily up to the first `>` so an
  // unterminated quote in a malformed source template cannot consume the rest
  // of the document into a single tag.
  const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9-]*)([^>]*?)\/?>/g;
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

/** Whole-token class match (avoids "grid-item" matching "grid"). */
function hasClassToken(node: HtmlNode, ...names: string[]): boolean {
  const tokens = (node.attrs.class || "").toLowerCase().split(/\s+/).filter(Boolean);
  return names.some((n) => tokens.includes(n));
}

function hashInlineStyle(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).slice(0, 8);
}

/**
 * Deterministic class used to preserve inline CSS from generated HTML while
 * still publishing native Elementor widgets. `extractTemplateCss()` emits the
 * matching CSS rules and this converter attaches the same class to the native
 * Elementor element, so complex AI-builder styles (gradient/flex/grid/shadow)
 * survive WordPress publishing without an HTML widget.
 */
export function inlineStyleClassFor(tag: string | undefined, style: string | undefined): string {
  const normalized = (style || "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([:;,()])\s*/g, "$1")
    .trim()
    .toLowerCase();
  if (!normalized) return "";
  return `xxxv-s-${hashInlineStyle(`${(tag || "div").toLowerCase()}|${normalized}`)}`;
}

function nativeIdentitySettings(node?: HtmlNode): Record<string, unknown> {
  if (!node) return {};
  const settings: Record<string, unknown> = {};
  const autoStyleClass = inlineStyleClassFor(node.tag, node.attrs.style);
  const cssClasses = [node.attrs.class || "", autoStyleClass]
    .filter(Boolean)
    .join(" ")
    .split(/\s+/)
    .map((c) => c.trim())
    .filter((c) => /^[a-zA-Z_-][\w-]*$/.test(c))
    .slice(0, 24)
    .join(" ");
  if (cssClasses) settings._css_classes = cssClasses;
  const elementId = (node.attrs.id || "").trim();
  if (/^[a-zA-Z][\w-]*$/.test(elementId)) settings._element_id = elementId;
  return settings;
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
    settings: bakedSettings(node, styleHeading, {
      ...nativeIdentitySettings(node),
      title: textContent(node),
      header_size: node.tag,
    }),
    elements: [],
  };
}

function textEditor(html: string, node?: HtmlNode): ElementorElement {
  return {
    id: genId(),
    elType: "widget",
    widgetType: "text-editor",
    settings: bakedSettings(node, styleText, { ...nativeIdentitySettings(node), editor: html.trim().startsWith("<") ? html : `<p>${html}</p>` }),
    elements: [],
  };
}

function image(node: HtmlNode): ElementorElement {
  return {
    id: genId(),
    elType: "widget",
    widgetType: "image",
    settings: bakedSettings(node, (s, p) => styleImage(s, p, {
      className: node.attrs.class || "",
      widthAttr: node.attrs.width || "",
      heightAttr: node.attrs.height || "",
    }), {
      ...nativeIdentitySettings(node),
      image: { url: node.attrs.src || "", alt: node.attrs.alt || "" },
    }),
    elements: [],
  };
}

function button(node: HtmlNode): ElementorElement {
  return {
    id: genId(),
    elType: "widget",
    widgetType: "button",
    settings: bakedSettings(node, styleButton, {
      ...nativeIdentitySettings(node),
      text: textContent(node) || "Button",
      link: node.attrs.href ? { url: node.attrs.href, is_external: "", nofollow: "" } : { url: "#" },
    }),
    elements: [],
  };
}

/* ------------------- primitive native widget builders -------------------- */

/** `<hr>` -> native Elementor Divider widget. */
function divider(node?: HtmlNode): ElementorElement {
  return {
    id: genId(),
    elType: "widget",
    widgetType: "divider",
    settings: { ...nativeIdentitySettings(node) },
    elements: [],
  };
}

/** Map a Font Awesome / generic icon class to an Elementor selected_icon value. */
function resolveIconValue(node: HtmlNode): { value: string; library: string } {
  const cls = (node.attrs.class || "").toLowerCase();
  // Preserve an explicit Font Awesome icon class ("fas fa-star", "fab fa-x").
  const styleToken = cls.match(/\bfa[bsrl]?\b/)?.[0] || "fas";
  const iconToken = cls.match(/\bfa-[a-z0-9-]+\b/)?.[0];
  if (iconToken) {
    const library = styleToken === "fab" ? "fa-brands" : styleToken === "far" ? "fa-regular" : "fa-solid";
    return { value: `${styleToken} ${iconToken}`, library };
  }
  return { value: "fas fa-star", library: "fa-solid" };
}

/** Standalone `<i>` / `<svg>` icon -> native Elementor Icon widget. */
function iconWidget(node: HtmlNode): ElementorElement {
  return {
    id: genId(),
    elType: "widget",
    widgetType: "icon",
    settings: {
      ...nativeIdentitySettings(node),
      selected_icon: resolveIconValue(node),
    },
    elements: [],
  };
}

/** Extract a YouTube/Vimeo id or a hosted file URL from an embed node. */
function video(node: HtmlNode): ElementorElement {
  const src = node.attrs.src || (findNode(node, (n) => n.tag === "source")?.attrs.src ?? "");
  const settings: Record<string, unknown> = { ...nativeIdentitySettings(node) };
  const yt = src.match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([\w-]{6,})/i);
  const vimeo = src.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (yt) {
    settings.video_type = "youtube";
    settings.youtube_url = `https://www.youtube.com/watch?v=${yt[1]}`;
  } else if (vimeo) {
    settings.video_type = "vimeo";
    settings.vimeo_url = `https://vimeo.com/${vimeo[1]}`;
  } else {
    settings.video_type = "hosted";
    settings.hosted_url = { url: src };
  }
  return {
    id: genId(),
    elType: "widget",
    widgetType: "video",
    settings,
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

  // Composition probes so we can classify a block by its own contents.
  const directImg = findNode(node, (n) => n.tag === "img");
  const iconNode = findNode(
    node,
    (n) => n.tag === "i" || n.tag === "svg" || hasClass(n, "icon", "fa", "feature-icon", "service-icon"),
  );
  const titleNode = findNode(node, (n) => HEADINGS.has(n.tag) || hasClass(n, "title", "heading", "name"));
  const descNode = findNode(node, (n) => n.tag === "p" || hasClass(n, "desc", "text", "description", "subtitle"));
  const hasText = !!titleNode || !!descNode;
  const hasLink = !!findNode(node, (n) => isButton(n));

  // A repeating list of icon+text rows -> native icon-list (feature / service
  // lists), even when built from plain <div>s rather than <ul><li>.
  const itemChildren = node.children.filter((c) => c.tag);
  if (itemChildren.length >= 3) {
    const iconTextItems = itemChildren.filter(
      (c) =>
        !!findNode(c, (n) => n.tag === "i" || n.tag === "svg" || hasClass(n, "icon", "fa")) &&
        !findNode(c, (n) => n.tag === "img") &&
        !findNode(c, (n) => HEADINGS.has(n.tag)),
    );
    if (iconTextItems.length >= Math.ceil(itemChildren.length * 0.6)) {
      const items = iconTextItems.map((c) => ({
        _id: genId(),
        text: textContent(c),
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
  }

  // Structural single-card fallbacks: map recognizable compositions to native
  // widgets instead of yet another nested container.
  if (hasClass(node, "card", "box", "tile", "feature", "service", "item") || (hasText && (directImg || iconNode))) {
    // image + title/text -> image-box (unless it's a CTA card with a button).
    if (directImg && hasText && !hasLink) return imageBox(node);
    // icon + title/text -> icon-box.
    if (iconNode && !directImg && hasText) return iconBox(node);
  }
  return null;
}

function container(children: ElementorElement[], node?: HtmlNode, topLevel = false): ElementorElement {
  const settings: Record<string, unknown> = {
    ...nativeIdentitySettings(node),
    // Use full containers at every level. The source HTML/CSS already carries
    // max-width/margins; Elementor's boxed containers insert an extra
    // `.e-con-inner` wrapper, which breaks converted CSS selectors/layouts
    // (grid/flex children become grandchildren). Full containers preserve the
    // source DOM shape much more closely while staying fully editable.
    content_width: "full",
    width: "100%",
    flex_direction: "column",
  };
  if (node && ["section", "header", "footer", "main", "article", "aside", "nav", "div"].includes(node.tag)) {
    settings.html_tag = node.tag;
  }
  // Top-level sections stretch edge-to-edge so the page matches the template
  // 1:1 (no theme gutters / boxed wrapper around each section).
  if (topLevel) {
    settings.content_width = "full";
    settings.width = "100%";
    settings.flex_align_items = "center";
  }
  // Bake the template's section background/padding/margin/layout into the
  // container FIRST, so real CSS (display:flex / display:grid + column count)
  // decides the layout type.
  const props = node && CURRENT_RESOLVER ? CURRENT_RESOLVER.resolve(node as NodeLike) : undefined;
  if (props) styleContainer(settings, props, CURRENT_CTX);

  // Only fall back to framework class hints (Bootstrap-style .row/.columns) when
  // the CSS declared no explicit flex/grid layout. This prevents forcing a
  // flex-row (or a spurious grid) onto containers that are really plain column
  // stacks — the root cause of "too many grid/row containers".
  const cssDeclaredLayout =
    settings.container_type === "grid" || (props && props.display === "flex");
  if (!cssDeclaredLayout && node && hasClassToken(node, "row", "columns", "d-flex", "flex-row")) {
    settings.flex_direction = "row";
    settings.flex_wrap = "wrap";
  }
  return { id: genId(), elType: "container", settings, elements: children };
}

/* --------------------- hero / background layers -------------------------- */

interface BackgroundLayers {
  bgImage?: string;
  overlay?: string; // raw CSS color or gradient
  overlayOpacity?: number; // 0..1 from the overlay layer's own opacity
  skip: Set<HtmlNode>;
}

const COLOR_RE = /#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)/g;

/** Is a positioned element stretched to cover its parent (inset:0 / all sides 0)? */
function isFullBleed(p: StyleProps): boolean {
  const zero = (v?: string) => v !== undefined && /^-?0(px|%|rem|em)?$/.test(v.trim());
  if (p.inset !== undefined) {
    const parts = p.inset.trim().split(/\s+/);
    return parts.every((v) => /^-?0/.test(v));
  }
  const sides = [p.top, p.right, p.bottom, p.left];
  const defined = sides.filter((v) => v !== undefined);
  if (defined.length >= 2 && defined.every(zero)) return true;
  return false;
}

/** Convert a CSS gradient direction ("to right", "to bottom", "45deg") to degrees. */
function gradientAngle(grad: string): number {
  const degM = grad.match(/(-?\d+(?:\.\d+)?)deg/);
  if (degM) return parseFloat(degM[1]);
  const dir = grad.match(/to\s+([a-z\s]+?)[,)]/i);
  if (dir) {
    const d = dir[1].trim().toLowerCase();
    const map: Record<string, number> = {
      "top": 0, "right": 90, "bottom": 180, "left": 270,
      "top right": 45, "right top": 45,
      "bottom right": 135, "right bottom": 135,
      "bottom left": 225, "left bottom": 225,
      "top left": 315, "left top": 315,
    };
    if (map[d] !== undefined) return map[d];
  }
  return 135;
}

function zIndexOf(p: StyleProps): number {
  const z = parseInt(p.zIndex ?? "", 10);
  return Number.isFinite(z) ? z : 0;
}

/**
 * Detect full-bleed background images and overlay layers among a container's
 * direct children. Templates commonly build heroes as:
 *   <section class="hero">           position:relative
 *     <img class="hero-bg">          position:absolute; inset:0; object-fit:cover; z-index:0
 *     <div class="hero-ov"></div>    position:absolute; inset:0; background:gradient; z-index:1
 *     <div class="hero-in">...</div> the real content; z-index:2
 * Native Elementor widgets do NOT honor absolute positioning or z-index, so an
 * absolute cover <img> becomes a stacked image widget and the whole hero
 * collapses. We instead hoist those layers onto the container's own background +
 * overlay (exactly how Elementor models hero sections), respecting z-index order
 * (lowest = background image, higher content-less layer = overlay), and drop the
 * source nodes.
 */
function extractBackgroundLayers(node: HtmlNode): BackgroundLayers {
  const layers: BackgroundLayers = { skip: new Set() };
  if (!CURRENT_RESOLVER) return layers;
  const kids = node.children.filter((c) => c.tag);
  const parentProps = CURRENT_RESOLVER.resolve(node as NodeLike);
  const looksHero = parentProps.position === "relative" ||
    parentProps.position === "absolute" ||
    parentProps.overflow === "hidden" ||
    hasClassToken(node, "hero") ||
    /hero/.test(node.attrs.class || "");
  if (!looksHero) return layers;

  // Resolve every child once and order positioned layers back-to-front by
  // z-index so the deepest layer becomes the background and shallower
  // content-less layers become overlays.
  const resolved = kids.map((child) => ({ child, p: CURRENT_RESOLVER!.resolve(child as NodeLike) }));
  const positioned = resolved
    .filter(({ p }) => p.position === "absolute" || p.position === "fixed")
    .sort((a, b) => zIndexOf(a.p) - zIndexOf(b.p));

  for (const { child, p } of positioned) {
    const covers = isFullBleed(p) || p.objectFit === "cover";
    // Full-bleed cover image -> container background image.
    if (
      child.tag === "img" &&
      (covers || hasClass(child, "-bg", "hero-bg", "bg-image", "cover")) &&
      !layers.bgImage
    ) {
      const src = child.attrs.src || p.backgroundImage;
      if (src) { layers.bgImage = src; layers.skip.add(child); continue; }
    }
    // Absolute, content-less layer with a background -> overlay.
    if (
      !textContent(child).trim() &&
      !findNode(child, (n) => n.tag === "img") &&
      (p.background || p.backgroundColor || p.backgroundImage) &&
      !layers.overlay
    ) {
      if (p.backgroundImage && !layers.bgImage) {
        // A content-less full-bleed div using background-image is the bg image.
        layers.bgImage = p.backgroundImage;
        if (p.background && /gradient\s*\(/i.test(p.background)) layers.overlay = p.background;
      } else {
        layers.overlay = p.background || p.backgroundColor;
      }
      const op = parseFloat(p.opacity ?? "");
      if (Number.isFinite(op) && op >= 0 && op <= 1) layers.overlayOpacity = op;
      layers.skip.add(child);
    }
  }
  return layers;
}

/** Apply hoisted hero background + overlay onto an Elementor container. */
function applyBackgroundLayers(settings: Record<string, unknown>, layers: BackgroundLayers): void {
  if (layers.bgImage) {
    settings.background_background = "classic";
    settings.background_image = { url: layers.bgImage, id: "" };
    settings.background_size = "cover";
    settings.background_position = "center center";
  }
  if (layers.overlay) {
    const ov = layers.overlay;
    if (/gradient\s*\(/i.test(ov)) {
      const colors = ov.match(COLOR_RE) || [];
      settings.background_overlay_background = "gradient";
      if (colors[0]) settings.background_overlay_color = colors[0];
      if (colors[colors.length - 1]) settings.background_overlay_color_b = colors[colors.length - 1];
      settings.background_overlay_gradient_type = "linear";
      settings.background_overlay_gradient_angle = { unit: "deg", size: gradientAngle(ov), sizes: [] };
    } else {
      settings.background_overlay_background = "classic";
      settings.background_overlay_color = ov;
    }
    const opacity = layers.overlayOpacity ?? 1;
    settings.background_overlay_opacity = { unit: "px", size: opacity, sizes: [] };
  }
  // A hero with a background needs height to be visible.
  if ((layers.bgImage || layers.overlay) && !settings.min_height) {
    settings.min_height = { unit: "px", size: 560 };
  }
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
    } else if (node.tag === "hr") {
      flush();
      out.push(divider(node));
    } else if (node.tag === "iframe" || node.tag === "video") {
      flush();
      out.push(video(node));
    } else if ((node.tag === "i" || node.tag === "svg") && !textContent(node)) {
      flush();
      out.push(iconWidget(node));
    } else if (isButton(node)) {
      flush();
      out.push(button(node));
    } else if (CONTAINER_TAGS.has(node.tag)) {

      flush();
      // Hoist full-bleed hero background images + overlays onto the container
      // itself (native Elementor hero pattern) instead of emitting stacked,
      // absolutely-positioned image widgets that collapse the layout.
      const layers = extractBackgroundLayers(node);
      const contentNodes = layers.skip.size
        ? node.children.filter((c) => !layers.skip.has(c))
        : node.children;
      // Track this container's own text color so descendant text/heading widgets
      // inherit it (CSS cascade parity) when they declare no color of their own.
      const ownColor = CURRENT_RESOLVER ? CURRENT_RESOLVER.resolve(node as NodeLike).color : undefined;
      if (ownColor) CURRENT_COLOR_STACK.push(ownColor);
      const inner = convertChildren(contentNodes);
      if (ownColor) CURRENT_COLOR_STACK.pop();
      if (inner.length > 0 || layers.bgImage || layers.overlay) {
        const c = container(inner, node);
        applyBackgroundLayers(c.settings, layers);
        out.push(c);
      }
    } else if (TEXT_TAGS.has(node.tag) && !["span", "strong", "em", "small", "label"].includes(node.tag)) {
      flush();
      out.push(textEditor(serialize(node), node));
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

// Settings that indicate a container carries real design intent (styling or
// identity) and must never be collapsed away.
const VISUAL_STYLE_KEYS = [
  "_css_classes", "_element_id", "background_background", "background_color", "background_image",
  "__xxxv_background", "__xxxv_box_shadow", "__xxxv_border", "padding", "margin", "min_height",
  "max_width", "border_radius", "overflow",
];

function hasVisualStyling(el: ElementorElement): boolean {
  if (el.elType !== "container") return false;
  const s = el.settings || {};
  return VISUAL_STYLE_KEYS.some((key) => key in s && s[key] !== undefined && s[key] !== "");
}

function isPlainWrapper(el: ElementorElement): boolean {
  if (el.elType !== "container") return false;
  // Never unwrap a container that carries visual styling or identity. AI Site
  // Builder sections often use simple column wrappers with inline CSS for
  // gradients, padding, max-width, shadows, etc. Treating those as "plain"
  // deleted the actual design and left published WordPress pages as unstyled
  // Elementor skeletons.
  if (hasVisualStyling(el)) return false;
  return !isLayoutContainer(el);
}

/**
 * Recursively remove redundant wrapper containers while preserving any
 * container that carries real layout meaning (grid / flex-row / columns) or
 * visual styling.
 *
 * Nested-grid hardening: a container (grid, flex, or plain) that has NO visual
 * styling of its own and only wraps a single child container is a pure nesting
 * level with no design meaning — a grid/flex wrapper holding exactly one item
 * adds nothing. We replace it with its child so grid-in-grid / flex-in-flex
 * stacks collapse to a single meaningful layout level instead of piling up.
 */
function unwrapRedundant(elements: ElementorElement[]): ElementorElement[] {
  const out: ElementorElement[] = [];
  for (const el of elements) {
    el.elements = unwrapRedundant(el.elements);

    // Collapse a redundant single-container nesting level. Applies to layout
    // AND plain containers, as long as the OUTER carries no styling/identity of
    // its own (the child keeps its own layout + styling). Loop to flatten deep
    // wrapper chains (grid > grid > grid > content) in one pass.
    while (
      el.elType === "container" &&
      !hasVisualStyling(el) &&
      el.elements.length === 1 &&
      el.elements[0].elType === "container"
    ) {
      const child = el.elements[0];
      // Adopt the child entirely — it already holds the meaningful layout,
      // styling, and grandchildren. This removes the empty outer wrapper.
      el.settings = child.settings;
      el.elements = child.elements;
    }

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
 * Defense-in-depth: clean an already-built Elementor tree so the stored MASTER
 * JSON can never carry malformed markup that breaks the live page. This runs on
 * every conversion AND can be applied to previously-stored masters to repair
 * them in place. It is idempotent.
 *
 * Rules:
 *  - plain-text widget fields (heading `title`, button `text`) must contain NO
 *    markup — cut at the first `<`/`>` so a truncated/unterminated source tag
 *    cannot leak structure into the text.
 *  - URL fields (`link.url`, `image.url`) must be a single token — cut at the
 *    first whitespace, quote, or angle bracket.
 *  - `text-editor` `editor` HTML is stripped of <script>/<style> and any stray
 *    angle-bracket fragment at the very end (the classic "unterminated tag"
 *    bug) is removed.
 *  - `header_size` is coerced to a valid h1-h6 tag.
 */
function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";
  const cut = value.search(/[<>]|%3c|%3e|&lt;|&gt;/i);
  return (cut === -1 ? value : value.slice(0, cut)).replace(/\s+/g, " ").trim();
}

function cleanUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const cut = value.search(/[\s"'<>]|%3c|%3e|&lt;|&gt;/i);
  return (cut === -1 ? value : value.slice(0, cut)).trim();
}

function closeUnbalancedInlineTags(html: string): string {
  const allowed = ["a", "span", "p", "strong", "em", "b", "i", "small", "ul", "ol", "li"];
  const stack: string[] = [];
  const tagRe = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html)) !== null) {
    const full = m[0];
    const tag = m[1].toLowerCase();
    if (!allowed.includes(tag) || /\/>$/.test(full)) continue;
    if (full.startsWith("</")) {
      const idx = stack.lastIndexOf(tag);
      if (idx !== -1) stack.splice(idx, 1);
    } else {
      stack.push(tag);
    }
  }
  return html + stack.reverse().map((tag) => `</${tag}>`).join("");
}

function cleanEditorHtml(value: unknown): string {
  if (typeof value !== "string") return "";
  let out = value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  // Text Editor widgets may contain inline rich text only. If an old malformed
  // conversion swallowed page structure into this field, cut before that block
  // markup so Elementor cannot render an open <span>/<p> across the whole page.
  const structuralCut = out.search(/<\/?(?:div|section|header|footer|main|article|nav|aside)\b|%3c\/?(?:div|section|header|footer|main|article|nav|aside)\b|&lt;\/?(?:div|section|header|footer|main|article|nav|aside)\b/i);
  if (structuralCut !== -1) out = out.slice(0, structuralCut);
  // Drop a trailing unterminated tag fragment (e.g. "...text <a href="#c").
  const lastOpen = out.lastIndexOf("<");
  if (lastOpen !== -1 && out.indexOf(">", lastOpen) === -1) {
    out = out.slice(0, lastOpen);
  }
  return closeUnbalancedInlineTags(out.trim());
}

export function sanitizeElementorTree(tree: ElementorElement[]): ElementorElement[] {
  const visit = (el: ElementorElement): ElementorElement => {
    const s: Record<string, unknown> = { ...(el.settings || {}) };
    if (el.elType === "widget") {
      if (el.widgetType === "heading") {
        if ("title" in s) s.title = cleanText(s.title);
        if (typeof s.header_size !== "string" || !/^h[1-6]$/.test(s.header_size as string)) {
          s.header_size = "h2";
        }
      } else if (el.widgetType === "button") {
        if ("text" in s) s.text = cleanText(s.text) || "Button";
      } else if (el.widgetType === "text-editor") {
        if ("editor" in s) s.editor = cleanEditorHtml(s.editor);
      } else if (el.widgetType === "image") {
        const img = s.image as { url?: unknown; alt?: unknown } | undefined;
        if (img && typeof img === "object") {
          s.image = { ...img, url: cleanUrl(img.url), alt: cleanText(img.alt) };
        }
      }
      const link = s.link as { url?: unknown } | undefined;
      if (link && typeof link === "object" && "url" in link) {
        s.link = { ...link, url: cleanUrl(link.url) || "#" };
      }
    }
    return {
      ...el,
      settings: s,
      elements: (el.elements || []).map(visit),
    };
  };
  return tree.map(visit);
}

/**
 * Convert an HTML string into a top-level array of native Elementor elements
 * (each visual section becomes its own full-width top-level Container). When a
 * `siteContext` is supplied, the template's CSS is baked into each widget's
 * native Elementor style settings — preferring the site's global color/font
 * tokens — so the page renders 1:1 with NO HTML widget and NO external CSS.
 */
export function htmlToElementor(html: string, siteContext?: SiteContext): ElementorElement[] {
  CURRENT_RESOLVER = new StyleResolver(html || "");
  CURRENT_CTX = siteContext;
  CURRENT_COLOR_STACK = [];
  try {
    const tree = parseHtml(html || "");
    const converted = flattenSections(convertChildren(tree));
    // Ensure every top-level element is a full-width container (Elementor sections).
    const normalized = converted.map((el) =>
      el.elType === "container"
        ? { ...el, settings: { ...el.settings, content_width: "full", width: "100%" } }
        : container([el], undefined, true)
    );
    // Guarantee the stored MASTER JSON is always clean.
    return sanitizeElementorTree(normalized);
  } finally {
    CURRENT_RESOLVER = null;
    CURRENT_CTX = undefined;
    CURRENT_COLOR_STACK = [];
  }
}

/**
 * Recursively walk an Elementor element tree and report any "html" widgets.
 * A published WordPress page must be made of native, editable Elementor
 * widgets — never a raw HTML block. This is the detection half of the
 * native-only guarantee enforced at publish time.
 */
export function findHtmlWidgets(tree: ElementorElement[]): ElementorElement[] {
  const found: ElementorElement[] = [];
  const walk = (els: ElementorElement[] | undefined) => {
    if (!Array.isArray(els)) return;
    for (const el of els) {
      if (el?.elType === "widget" && el?.widgetType === "html") found.push(el);
      if (Array.isArray(el?.elements)) walk(el.elements);
    }
  };
  walk(tree);
  return found;
}

/** Aggregate CSS-parity + background/overlay stats for a converted Elementor tree. */
export interface ElementorParityStats {
  /** Containers/widgets carrying a native background image. */
  background_layers: number;
  /** Containers carrying a native background overlay (color/gradient). */
  overlay_layers: number;
  /** Containers carrying a gradient background. */
  gradient_layers: number;
  /** Total container + widget nodes in the tree. */
  total_nodes: number;
  /** Nodes that carry at least one baked style setting. */
  styled_nodes: number;
  /**
   * 0-100 parity score: share of nodes that received baked CSS (typography,
   * color, background, spacing, layout) from the extracted stylesheet. Higher =
   * more of the template's design was reproduced natively.
   */
  parity_score: number;
}

const STYLE_SETTING_KEYS = [
  "title_color", "text_color", "typography_typography", "typography_font_size",
  "typography_font_family", "align", "background_background", "background_color",
  "background_image", "background_overlay_background", "padding", "margin",
  "min_height", "border_radius", "flex_direction", "flex_align_items",
  "flex_justify_content", "gap", "grid_columns_grid", "content_width", "width",
  "object_fit", "opacity", "mix_blend_mode", "background_size",
  "background_position", "background_repeat",
  "_transform_opacity", "_blend_mode", "_transform_rotate", "_transform_rotateZ_effect",
  "_transform_scale", "_transform_scale_effect", "_transform_translate",
  "_transform_translateX_effect", "_transform_translateY_effect", "_transform_skew",
  "__xxxv_background", "__xxxv_box_shadow", "__xxxv_border", "__xxxv_grid_template_columns",
  "__xxxv_transform", "__xxxv_mix_blend_mode", "__xxxv_background_blend_mode",
];

function nodeHasBakedStyle(settings: Record<string, unknown> | undefined): boolean {
  if (!settings) return false;
  if (settings.__globals__ && Object.keys(settings.__globals__ as object).length) return true;
  return STYLE_SETTING_KEYS.some((k) => settings[k] !== undefined && settings[k] !== null && settings[k] !== "");
}

export function computeElementorParityStats(tree: ElementorElement[]): ElementorParityStats {
  let background_layers = 0;
  let overlay_layers = 0;
  let gradient_layers = 0;
  let total_nodes = 0;
  let styled_nodes = 0;

  const walk = (els: ElementorElement[] | undefined) => {
    if (!Array.isArray(els)) return;
    for (const el of els) {
      if (!el) continue;
      total_nodes++;
      const s = el.settings as Record<string, unknown> | undefined;
      if (nodeHasBakedStyle(s)) styled_nodes++;
      if (s) {
        if (s.background_image && (s.background_image as { url?: string })?.url) background_layers++;
        if (s.background_overlay_background) overlay_layers++;
        if (s.background_background === "gradient" || s.__xxxv_background) gradient_layers++;
      }
      if (Array.isArray(el.elements)) walk(el.elements);
    }
  };
  walk(tree);

  const parity_score = total_nodes > 0 ? Math.round((styled_nodes / total_nodes) * 100) : 0;
  return { background_layers, overlay_layers, gradient_layers, total_nodes, styled_nodes, parity_score };
}

/** Per-section parity entry powering the post-publish heatmap. */
export interface SectionParity {
  /** Position of the section within the page (0-based). */
  index: number;
  /** Human label, e.g. "Hero", "Section 2". */
  label: string;
  /** True when this section looks like the hero (first, tall, has a background). */
  is_hero: boolean;
  total_nodes: number;
  styled_nodes: number;
  /** 0-100 share of nodes in this section that received baked styles. */
  parity_score: number;
  background_layers: number;
  overlay_layers: number;
  /** Widgets in this section that received NO baked style (the mismatches). */
  weak_widgets: { type: string; text: string }[];
}

/** Short readable label for a node used in the heatmap widget list. */
function nodeLabel(el: ElementorElement): string {
  if (el.elType === "widget") return el.widgetType || "widget";
  return "container";
}

/** First bit of visible text inside a node (for identifying which widget). */
function nodePreviewText(el: ElementorElement): string {
  const s = el.settings as Record<string, unknown> | undefined;
  if (!s) return "";
  const raw =
    (typeof s.title === "string" && s.title) ||
    (typeof s.editor === "string" && s.editor) ||
    (typeof s.text === "string" && s.text) ||
    (typeof s.title_text === "string" && s.title_text) ||
    "";
  return String(raw).replace(/<[^>]*>/g, "").trim().slice(0, 60);
}

/**
 * Compute per-section parity so the UI can render a heatmap that points at the
 * exact hero/section/widgets whose design did NOT convert to native styles.
 */
export function computeSectionParityHeatmap(tree: ElementorElement[]): SectionParity[] {
  if (!Array.isArray(tree)) return [];
  const sections: SectionParity[] = [];

  tree.forEach((section, i) => {
    if (!section) return;
    let total_nodes = 0;
    let styled_nodes = 0;
    let background_layers = 0;
    let overlay_layers = 0;
    const weak_widgets: { type: string; text: string }[] = [];

    const walk = (el: ElementorElement | undefined) => {
      if (!el) return;
      total_nodes++;
      const s = el.settings as Record<string, unknown> | undefined;
      const baked = nodeHasBakedStyle(s);
      if (baked) styled_nodes++;
      if (s) {
        if (s.background_image && (s.background_image as { url?: string })?.url) background_layers++;
        if (s.background_overlay_background) overlay_layers++;
      }
      // Only flag content-bearing widgets (not empty structural containers).
      if (!baked && el.elType === "widget") {
        if (weak_widgets.length < 12) {
          weak_widgets.push({ type: nodeLabel(el), text: nodePreviewText(el) });
        }
      }
      if (Array.isArray(el.elements)) el.elements.forEach(walk);
    };
    walk(section);

    const parity_score = total_nodes > 0 ? Math.round((styled_nodes / total_nodes) * 100) : 0;
    const s = section.settings as Record<string, unknown> | undefined;
    const hasBg =
      background_layers > 0 ||
      (s?.background_background === "classic" && !!(s?.background_image as { url?: string })?.url) ||
      s?.background_background === "gradient";
    const is_hero = i === 0 && (hasBg || total_nodes >= 3);

    sections.push({
      index: i,
      label: is_hero ? "Hero" : `Section ${i + 1}`,
      is_hero,
      total_nodes,
      styled_nodes,
      parity_score,
      background_layers,
      overlay_layers,
      weak_widgets,
    });
  });

  return sections;
}

/** Compute the section heatmap directly from an `_elementor_data` JSON string. */
export function sectionHeatmapFromData(dataStr: string | undefined | null): SectionParity[] {
  if (!dataStr) return [];
  try {
    const parsed = JSON.parse(dataStr);
    if (!Array.isArray(parsed)) return [];
    return computeSectionParityHeatmap(parsed);
  } catch {
    return [];
  }
}


/** Compute parity stats directly from an `_elementor_data` JSON string (safe). */
export function parityStatsFromData(dataStr: string | undefined | null): ElementorParityStats | null {
  if (!dataStr) return null;
  try {
    const parsed = JSON.parse(dataStr);
    if (!Array.isArray(parsed)) return null;
    return computeElementorParityStats(parsed);
  } catch {
    return null;
  }
}

/** True when the given `_elementor_data` JSON string contains any HTML widget. */
export function elementorDataHasHtmlWidget(dataStr: string | undefined | null): boolean {
  if (!dataStr) return false;
  try {
    const parsed = JSON.parse(dataStr);
    return Array.isArray(parsed) && findHtmlWidgets(parsed).length > 0;
  } catch {
    // Fast path: raw substring check when JSON is malformed.
    return /"widgetType"\s*:\s*"html"/.test(dataStr);
  }
}

/**
 * NATIVE-ONLY GUARANTEE. Given an `_elementor_data` JSON string, ensure it
 * contains ZERO raw HTML widgets. If a stray HTML widget is detected the whole
 * tree is rebuilt from its embedded markup into native Elementor containers +
 * widgets so the published page is always editable in Elementor (free).
 *
 * Returns the guaranteed-native JSON string. `onRebuilt` fires when a rebuild
 * was required (for timeline/logging). Throws if a native tree cannot be
 * produced — publishing a non-native page is never allowed.
 */
export function enforceNativeElementorData(
  dataStr: string,
  siteContext?: SiteContext,
  onRebuilt?: (count: number) => void,
): string {
  if (!dataStr) throw new Error("enforceNativeElementorData: empty elementor_data");
  let parsed: ElementorElement[];
  try {
    parsed = JSON.parse(dataStr);
  } catch {
    parsed = [];
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("enforceNativeElementorData: invalid elementor_data tree");
  }
  const htmlWidgets = findHtmlWidgets(parsed);
  if (htmlWidgets.length === 0) return dataStr;

  // Recover the embedded markup from every HTML widget and rebuild as native.
  const embedded = htmlWidgets
    .map((w) => (typeof w.settings?.html === "string" ? (w.settings.html as string) : ""))
    .filter(Boolean)
    .join("\n");
  const rebuilt = htmlToElementor(embedded, siteContext);
  if (!Array.isArray(rebuilt) || rebuilt.length === 0) {
    throw new Error(
      "enforceNativeElementorData: HTML widget detected and could not be converted to native Elementor widgets.",
    );
  }
  const rebuiltStr = JSON.stringify(rebuilt);
  if (elementorDataHasHtmlWidget(rebuiltStr)) {
    throw new Error(
      "enforceNativeElementorData: rebuilt tree still contains an HTML widget — refusing to publish.",
    );
  }
  onRebuilt?.(htmlWidgets.length);
  return rebuiltStr;
}

/**
 * Legacy helper retained for compatibility with old imports. It no longer builds
 * HTML widgets: WordPress publishing is native Elementor JSON only.
 */
export function buildEmbeddedElementorData(html: string, extraCss?: string): string {
  const css = (extraCss || "").trim();
  return JSON.stringify(htmlToElementor(`${css ? `<style>\n${css}\n</style>\n` : ""}${html || ""}`));
}

/**
 * Extract the renderable markup of a template: all <style> blocks (so the
 * design CSS, including background-image rules, is preserved) plus the <body>
 * markup, with <script>/<meta>/<link> removed. Returned as a single HTML string
 * that renders identically to the original template.
 */
/**
 * Collect external stylesheet hrefs (Google Fonts + theme CSS) from <link> tags
 * and convert them into @import rules so web fonts/typography keep working
 * inside the embedded Elementor HTML widget (where <link> tags are stripped).
 */
function extractStylesheetImports(html: string): string {
  const input = html || "";
  const imports: string[] = [];
  const seen = new Set<string>();
  const linkRe = /<link\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(input)) !== null) {
    const tag = m[0];
    if (!/rel\s*=\s*("|')?[^"'>]*stylesheet/i.test(tag)) continue;
    const hrefMatch = tag.match(/href\s*=\s*("([^"]*)"|'([^']*)')/i);
    let href = (hrefMatch ? (hrefMatch[2] ?? hrefMatch[3] ?? "") : "").trim();
    if (!href) continue;
    if (href.startsWith("//")) href = "https:" + href;
    if (seen.has(href)) continue;
    seen.add(href);
    imports.push(`@import url("${href}");`);
  }
  return imports.length ? `<style>\n${imports.join("\n")}\n</style>` : "";
}

function scopeExactHtml(html: string): string {
  const body = (html || "").trim();
  if (!body) return "";
  if (/^<div\b[^>]*\bclass\s*=\s*["'][^"']*\bxxxv-exact-scope\b/i.test(body)) return body;
  return `<div class="xxxv-exact-scope">${body}</div>`;
}

function scopeBodyCssSelectors(css: string): string {
  const input = css || "";
  // Duplicate common page-level selectors (`body`, `html body`) so CSS that was
  // written for a standalone HTML document still applies inside the Elementor
  // HTML widget wrapper.
  return input
    .replace(/(^|[,{}]\s*)(html\s+body|html|body)(?=\s*(?:[,>{:+~.#\[]|\{))/gi, (_m, prefix) => `${prefix}.xxxv-exact-scope`)
    .replace(/(^|[,{}]\s*)body(\.[a-zA-Z0-9_-]+)(?=\s*(?:[,>{:+~.#\[]|\{))/gi, (_m, prefix, cls) => `${prefix}.xxxv-exact-scope${cls}`);
}

function prepareExactStyleTags(input: string): string[] {
  const tags = input.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi) || [];
  return tags.map((tag) => {
    const m = tag.match(/<style\b([^>]*)>([\s\S]*?)<\/style>/i);
    if (!m) return tag;
    const attrs = m[1] || "";
    const css = m[2] || "";
    const scoped = scopeBodyCssSelectors(css);
    return scoped && scoped !== css ? `<style${attrs}>${css}\n${scoped}</style>` : tag;
  });
}

export function extractRenderableHtml(html: string): string {
  const input = html || "";
  // Preserve external fonts/CSS as @import (the <link> tags get stripped below).
  const fontImports = extractStylesheetImports(input);
  // Collect every <style> block (keeps fonts, layout, bg images), duplicating
  // standalone body/html selectors onto the exact-render wrapper.
  const styles = [fontImports, ...prepareExactStyleTags(input)].filter(Boolean).join("\n");
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
  return `${styles}\n${scopeExactHtml(body)}`.trim();
}

/**
 * Pixel-faithful Elementor fallback: keep the original template markup/CSS
 * intact inside one Elementor HTML widget. This is intentionally separate from
 * the native converter so production can choose exact visual parity when a
 * complex marketplace/AI design cannot be losslessly mapped to controls.
 */
export function buildExactElementorData(html: string, extraCss?: string): string {
  const bridgeCss = `
<style>
.elementor .xxxv-exact-template{width:100%!important;max-width:none!important;padding:0!important;margin:0!important;--width:100%;}
.elementor .xxxv-exact-template>.e-con-inner{width:100%!important;max-width:none!important;padding:0!important;}
.elementor .xxxv-exact-template .xxxv-exact-html,.elementor .xxxv-exact-template .elementor-widget-html,.elementor .xxxv-exact-template .elementor-widget-container{width:100%!important;max-width:none!important;margin:0!important;padding:0!important;}
.elementor .xxxv-exact-template .xxxv-exact-html>*{max-width:none;}
.elementor .xxxv-exact-template .xxxv-exact-scope{width:100%;max-width:none;}
</style>`;
  const source = `${bridgeCss}\n${extraCss ? `<style>\n${extraCss}\n</style>` : ""}\n${html || ""}`;
  const renderable = extractRenderableHtml(source);
  const data: ElementorElement[] = [{
    id: genId(),
    elType: "container",
    settings: {
      content_width: "full",
      width: "100%",
      flex_direction: "column",
      html_tag: "main",
      _css_classes: "xxxv-exact-template",
    },
    elements: [{
      id: genId(),
      elType: "widget",
      widgetType: "html",
      settings: {
        _css_classes: "xxxv-exact-html",
        html: renderable,
      },
      elements: [],
    }],
  }];
  return JSON.stringify(data);
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
export interface BuildElementorMetaOptions {
  /** Deprecated compatibility flag. WordPress publishing is native-only. */
  embedCss?: false;
  version?: string;
  /**
   * Pre-built `_elementor_data` JSON string (from the stored catalog with editable
   * content already applied). When set, it's used verbatim and the HTML is ignored.
   */
  prebuiltData?: string;
  /** Live site context so native widgets map to the site's global tokens. */
  siteContext?: SiteContext;
}

export function buildElementorMeta(
  html: string,
  options: BuildElementorMetaOptions | string = {},
): Record<string, unknown> {
  // Back-compat: allow passing version string as the 2nd arg.
  const opts: BuildElementorMetaOptions =
    typeof options === "string" ? { version: options } : options;
  const { version = "3.21.0", prebuiltData, siteContext } = opts;

  let dataStr: string;
  if (prebuiltData) {
    // Catalog path: stored Elementor JSON with editable content already applied.
    dataStr = prebuiltData;
  } else {
    let data: ElementorElement[];
    // Native Elementor widgets with the template CSS baked into settings.
    data = htmlToElementor(html, siteContext);
    dataStr = JSON.stringify(data);
  }
  return {
    _elementor_edit_mode: "builder",
    _elementor_template_type: "wp-page",
    _elementor_version: version,
    _elementor_data: dataStr,
    // NOTE: `_elementor_page_settings` is intentionally omitted. Elementor
    // registers it with an `object` REST schema, so sending a JSON string
    // triggers `rest_invalid_type` (HTTP 400). Forcing the "Full Width"
    // template via `_wp_page_template` already yields a full-width Elementor
    // content area while KEEPING the active theme's global header/footer and
    // site settings — matching the existing/old WordPress pages' layout.
    _wp_page_template: "elementor_header_footer",
  };
}
