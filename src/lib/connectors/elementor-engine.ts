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

function sanitizeAttrValue(value: string): string {
  // Malformed source templates (unterminated quotes, stray `<`) must never let
  // raw markup leak into an attribute value (e.g. href="#c</div></div>...").
  // Cut the value at the first angle bracket so structure can't be swallowed.
  const cut = value.search(/[<>]/);
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

/** `<hr>` -> native Elementor Divider widget. */
function divider(): ElementorElement {
  return { id: genId(), elType: "widget", widgetType: "divider", settings: {}, elements: [] };
}

/** Map an icon class to an Elementor selected_icon value. */
function resolveIconValue(node: HtmlNode): { value: string; library: string } {
  const cls = (node.attrs.class || "").toLowerCase();
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
    settings: { selected_icon: resolveIconValue(node) },
    elements: [],
  };
}

/* Known social networks: host fragments + Font Awesome brand icon token. */
const SOCIAL_NETWORKS: Array<{ key: string; hosts: string[]; icon: string }> = [
  { key: "facebook", hosts: ["facebook.com", "fb.com", "fb.me"], icon: "fa-facebook" },
  { key: "twitter", hosts: ["twitter.com", "x.com"], icon: "fa-twitter" },
  { key: "instagram", hosts: ["instagram.com"], icon: "fa-instagram" },
  { key: "linkedin", hosts: ["linkedin.com"], icon: "fa-linkedin-in" },
  { key: "youtube", hosts: ["youtube.com", "youtu.be"], icon: "fa-youtube" },
  { key: "pinterest", hosts: ["pinterest."], icon: "fa-pinterest" },
  { key: "tiktok", hosts: ["tiktok.com"], icon: "fa-tiktok" },
  { key: "github", hosts: ["github.com"], icon: "fa-github" },
  { key: "whatsapp", hosts: ["whatsapp.com", "wa.me"], icon: "fa-whatsapp" },
  { key: "telegram", hosts: ["t.me", "telegram."], icon: "fa-telegram" },
  { key: "dribbble", hosts: ["dribbble.com"], icon: "fa-dribbble" },
  { key: "behance", hosts: ["behance.net"], icon: "fa-behance" },
  { key: "reddit", hosts: ["reddit.com"], icon: "fa-reddit" },
  { key: "snapchat", hosts: ["snapchat.com"], icon: "fa-snapchat" },
  { key: "discord", hosts: ["discord.com", "discord.gg"], icon: "fa-discord" },
  { key: "medium", hosts: ["medium.com"], icon: "fa-medium" },
  { key: "vimeo", hosts: ["vimeo.com"], icon: "fa-vimeo-v" },
];

/** Identify the social network of a single anchor by URL host or its icon class. */
function matchSocialNetwork(node: HtmlNode): { key: string; icon: string } | null {
  const href = (node.attrs.href || "").toLowerCase();
  for (const net of SOCIAL_NETWORKS) {
    if (net.hosts.some((h) => href.includes(h))) return { key: net.key, icon: net.icon };
  }
  const iconNode = node.tag === "i" || node.tag === "svg" ? node : findNode(node, (n) => n.tag === "i" || n.tag === "svg");
  const cls = ((iconNode?.attrs.class || "") + " " + (node.attrs.class || "")).toLowerCase();
  for (const net of SOCIAL_NETWORKS) {
    if (cls.includes(net.icon)) return { key: net.key, icon: net.icon };
  }
  return null;
}

/** Collect anchors that resolve to a known social network within a node. */
function collectSocialLinks(node: HtmlNode): Array<{ url: string; key: string; icon: string }> {
  const anchors: HtmlNode[] = [];
  const walk = (n: HtmlNode) => {
    for (const child of n.children) {
      if (child.tag === "a") anchors.push(child);
      else if (child.tag) walk(child);
    }
  };
  walk(node);
  const links: Array<{ url: string; key: string; icon: string }> = [];
  const seen = new Set<string>();
  for (const a of anchors) {
    const match = matchSocialNetwork(a);
    if (!match || seen.has(match.key)) continue;
    seen.add(match.key);
    links.push({ url: a.attrs.href || "#", key: match.key, icon: match.icon });
  }
  return links;
}

/** A container of social links -> native Elementor Social Icons widget. */
function socialIcons(links: Array<{ url: string; key: string; icon: string }>): ElementorElement {
  return {
    id: genId(),
    elType: "widget",
    widgetType: "social-icons",
    settings: {
      social_icon_list: links.map((l) => ({
        _id: genId().slice(0, 7),
        social_icon: { value: `fab ${l.icon}`, library: "fa-brands" },
        link: { url: l.url, is_external: "on", nofollow: "" },
      })),
    },
    elements: [],
  };
}

/** Detect a container whose meaningful content is a set of >=2 social links. */
function detectSocialIcons(node: HtmlNode): ElementorElement | null {
  if (!CONTAINER_TAGS.has(node.tag) && node.tag !== "ul" && node.tag !== "ol") return null;
  const links = collectSocialLinks(node);
  if (links.length < 2) return null;
  // Guard: the container must be predominantly social links, not mixed content.
  if (textContent(node).replace(/\s+/g, "").length > links.length * 24) return null;
  return socialIcons(links);
}

/** `<iframe>` / `<video>` -> native Elementor Video widget. */
function video(node: HtmlNode): ElementorElement {
  const src = node.attrs.src || (findNode(node, (n) => n.tag === "source")?.attrs.src ?? "");
  const settings: Record<string, unknown> = {};
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
  return { id: genId(), elType: "widget", widgetType: "video", settings, elements: [] };
}

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

  // Guard: when this node is really a container wrapping MULTIPLE card-like
  // children (a grid/list of cards), do NOT collapse it into a single widget.
  // Return null so it becomes a layout container and each child is mapped to
  // its own native widget (image-box / icon-box / testimonial / ...).
  //
  // A helper matching the node itself OR any descendant (findNode only probes
  // descendants), used to count independent card compositions.
  const selfOrDescendant = (c: HtmlNode, pred: (n: HtmlNode) => boolean) =>
    pred(c) || !!findNode(c, pred);
  const cardLikeChildren = itemChildren.filter((c) =>
    selfOrDescendant(
      c,
      (n) =>
        n.tag === "img" ||
        n.tag === "i" ||
        n.tag === "svg" ||
        hasClass(n, "icon", "fa", "feature-icon", "service-icon"),
    ) && selfOrDescendant(c, (n) => n.tag === "p" || hasClass(n, "desc", "text", "description")),
  );
  // Multiple sibling cards, or several headings scattered across the subtree
  // (a section wrapping a grid of cards), both mean this is a group — not one
  // card. Let it become a container so each card is mapped individually.
  const headingCount = findAll(node, (n) => HEADINGS.has(n.tag)).length;
  if (cardLikeChildren.length >= 2 || headingCount >= 2) return null;


  // Structural single-card fallbacks: map recognizable compositions to native
  // widgets instead of yet another nested container.
  if (hasClass(node, "card", "box", "tile", "feature", "service", "item") || (hasText && (directImg || iconNode))) {
    if (directImg && hasText && !hasLink) return imageBox(node);
    if (iconNode && !directImg && hasText) return iconBox(node);
  }
  return null;

}

function container(children: ElementorElement[], node?: HtmlNode): ElementorElement {
  const settings: Record<string, unknown> = {
    content_width: "boxed",
    flex_direction: "column",
  };
  const style = (node?.attrs.style || "").toLowerCase();
  const displayGrid = /display\s*:\s*grid/.test(style);
  const displayFlex = /display\s*:\s*flex/.test(style);
  const flexRow = displayFlex && !/flex-direction\s*:\s*column/.test(style);
  // Prefer explicit CSS `display` (matches the publish engine) and fall back to
  // framework class hints so preview parity holds either way.
  if (displayGrid || (node && hasClass(node, "grid", "services", "features", "team", "pricing", "cards"))) {
    // Native Elementor Grid Container (responsive, mobile-optimized).
    settings.container_type = "grid";
    const colsMatch = style.match(/grid-template-columns\s*:\s*([^;]+)/);
    const colCount = colsMatch ? colsMatch[1].trim().split(/\s+/).filter(Boolean).length : 3;
    settings.grid_columns = { unit: "fr", size: colCount || 3, sizes: [] };
    settings.grid_columns_tablet = { unit: "fr", size: 2, sizes: [] };
    settings.grid_columns_mobile = { unit: "fr", size: 1, sizes: [] };
    settings.grid_gaps = { column: "24", row: "24", unit: "px" };
  } else if (flexRow || (node && hasClass(node, "row", "columns", "flex", "d-flex"))) {
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
    } else if (node.tag === "hr") {
      flush();
      out.push(divider());
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
  if (hasVisualStyling(el)) return false;
  // Grid / row / column containers are REQUIRED for layout — never unwrap.
  return !isLayoutContainer(el);
}

/**
 * Recursively remove redundant wrapper containers while preserving any
 * container that carries real layout meaning (grid / flex-row / columns).
 *
 * Heuristics:
 *   1. A container (grid, flex, or plain) with NO visual styling of its own
 *      that wraps a single child container is a redundant nesting level — a
 *      grid/flex wrapper holding exactly one item adds nothing. Collapse it
 *      into its child, looping to flatten deep grid-in-grid chains.
 *   2. A plain wrapper holding multiple children where ALL siblings are
 *      containers is a pure grouping shell — unwrap into its children.
 *   3. Layout containers (grid/row) that carry real content are kept intact;
 *      only their descendants are cleaned recursively.
 */
function unwrapRedundant(elements: ElementorElement[]): ElementorElement[] {
  const out: ElementorElement[] = [];
  for (const el of elements) {
    // Clean children first (depth-first).
    const cleanedChildren = unwrapRedundant(el.elements);
    el.elements = cleanedChildren;

    // Collapse redundant single-container nesting (grid-in-grid / flex-in-flex
    // / plain-in-plain) as long as the OUTER carries no styling of its own.
    while (
      el.elType === "container" &&
      !hasVisualStyling(el) &&
      el.elements.length === 1 &&
      el.elements[0].elType === "container"
    ) {
      const child = el.elements[0];
      el.settings = child.settings;
      el.elements = child.elements;
    }

    if (isLayoutContainer(el)) {
      out.push(el); // required wrapper, keep as-is
      continue;
    }

    if (isPlainWrapper(el)) {
      // Collapse single-child redundant wrapper.
      if (el.elements.length === 1 && el.elements[0].elType === "container") {
        out.push(el.elements[0]);
        continue;
      }
      // Pure grouping shell (all children are containers) -> dissolve.
      if (
        el.elements.length > 1 &&
        el.elements.every((c) => c.elType === "container")
      ) {
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
 * containers, we lift those sections out so they sit as independent top-level
 * Containers, mirroring the original template structure.
 */
function flattenSections(elements: ElementorElement[]): ElementorElement[] {
  let current = unwrapRedundant(elements);
  while (current.length === 1 && isPlainWrapper(current[0]) && current[0].elements.length > 1) {
    current = current[0].elements;
  }
  // Ensure every top-level element is a container (Elementor sections).
  return current.map((el) =>
    el.elType === "container" ? el : container([el])
  );
}

/**
 * Convert an HTML string into a top-level array of Elementor elements
 * (each visual section becomes its own top-level Container).
 */
function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";
  const cut = value.search(/[<>]/);
  return (cut === -1 ? value : value.slice(0, cut)).replace(/\s+/g, " ").trim();
}

function cleanUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const cut = value.search(/[\s"'<>]/);
  return (cut === -1 ? value : value.slice(0, cut)).trim();
}

function cleanEditorHtml(value: unknown): string {
  if (typeof value !== "string") return "";
  let out = value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  const lastOpen = out.lastIndexOf("<");
  if (lastOpen !== -1 && out.indexOf(">", lastOpen) === -1) out = out.slice(0, lastOpen);
  return out.trim();
}

/** Idempotent cleaner that guarantees a stored master JSON carries no malformed markup. */
export function sanitizeElementorTree(tree: ElementorElement[]): ElementorElement[] {
  const visit = (el: ElementorElement): ElementorElement => {
    const s: Record<string, unknown> = { ...(el.settings || {}) };
    if (el.elType === "widget") {
      if (el.widgetType === "heading") {
        if ("title" in s) s.title = cleanText(s.title);
        if (typeof s.header_size !== "string" || !/^h[1-6]$/.test(s.header_size as string)) s.header_size = "h2";
      } else if (el.widgetType === "button") {
        if ("text" in s) s.text = cleanText(s.text) || "Button";
      } else if (el.widgetType === "text-editor") {
        if ("editor" in s) s.editor = cleanEditorHtml(s.editor);
      } else if (el.widgetType === "image") {
        const img = s.image as { url?: unknown; alt?: unknown } | undefined;
        if (img && typeof img === "object") s.image = { ...img, url: cleanUrl(img.url), alt: cleanText(img.alt) };
      }
      const link = s.link as { url?: unknown } | undefined;
      if (link && typeof link === "object" && "url" in link) s.link = { ...link, url: cleanUrl(link.url) || "#" };
    }
    return { ...el, settings: s, elements: ((el.elements as ElementorElement[]) || []).map(visit) };
  };
  return tree.map(visit);
}

export function htmlToElementor(html: string): ElementorElement[] {
  const tree = parseHtml(html || "");
  const converted = convertChildren(tree);
  return sanitizeElementorTree(flattenSections(converted));
}

/* --------------------- visual regression workflow ------------------------ */

export interface VisualSignature {
  /** number of top-level sections */
  sections: number;
  /** counts of each widget/container type */
  widgets: Record<string, number>;
  /** ordered heading levels (h1..h6) used for typography comparison */
  headings: string[];
  /** number of grid/flex layout containers (width/spacing structure) */
  layoutContainers: number;
}

function collectSignature(elements: ElementorElement[]): VisualSignature {
  const sig: VisualSignature = { sections: elements.length, widgets: {}, headings: [], layoutContainers: 0 };
  const walk = (els: ElementorElement[]) => {
    for (const el of els) {
      const key = el.elType === "widget" ? el.widgetType || "widget" : "container";
      sig.widgets[key] = (sig.widgets[key] || 0) + 1;
      if (isLayoutContainer(el)) sig.layoutContainers++;
      if (el.widgetType === "heading") {
        const lvl = String((el.settings as { header_size?: string }).header_size || "h2");
        sig.headings.push(lvl);
      }
      walk(el.elements);
    }
  };
  walk(elements);
  return sig;
}

/** Build a visual signature directly from the source HTML template. */
function htmlSignature(html: string): VisualSignature {
  const tree = parseHtml(html || "");
  const sig: VisualSignature = { sections: 0, widgets: {}, headings: [], layoutContainers: 0 };
  const walk = (nodes: HtmlNode[]) => {
    for (const n of nodes) {
      if (!n.tag) continue;
      if (HEADINGS.has(n.tag)) sig.headings.push(n.tag);
      if (n.tag === "img") sig.widgets.image = (sig.widgets.image || 0) + 1;
      if (isButton(n)) sig.widgets.button = (sig.widgets.button || 0) + 1;
      if (hasClass(n, "grid", "row", "columns", "flex", "d-flex")) sig.layoutContainers++;
      walk(n.children);
    }
  };
  walk(tree);
  sig.sections = tree.filter((n) => n.tag === "section").length || tree.filter((n) => n.tag).length;
  return sig;
}

export interface VisualRegressionReport {
  match: boolean;
  score: number; // 0..1
  differences: string[];
  html: VisualSignature;
  elementor: VisualSignature;
}

/**
 * Compare the rendered HTML template against the generated Elementor structure
 * to confirm spacing/width (layout containers), structure (sections/widgets)
 * and typography (heading hierarchy) match.
 */
export function compareVisualRegression(html: string): VisualRegressionReport {
  const htmlSig = htmlSignature(html);
  const elementorSig = collectSignature(htmlToElementor(html));
  const differences: string[] = [];

  // Typography: heading hierarchy must be preserved.
  if (htmlSig.headings.join(",") !== elementorSig.headings.join(",")) {
    differences.push(
      `Typography mismatch: HTML headings [${htmlSig.headings.join(", ")}] vs Elementor [${elementorSig.headings.join(", ")}]`,
    );
  }
  // Width/spacing: layout container count should roughly match.
  if (Math.abs(htmlSig.layoutContainers - elementorSig.layoutContainers) > 1) {
    differences.push(
      `Layout (width/spacing) mismatch: HTML ${htmlSig.layoutContainers} grid/flex blocks vs Elementor ${elementorSig.layoutContainers}`,
    );
  }
  // Structure: images & buttons preserved.
  for (const key of ["image", "button"] as const) {
    const h = htmlSig.widgets[key] || 0;
    const e = elementorSig.widgets[key] || 0;
    if (h !== e) differences.push(`${key} count mismatch: HTML ${h} vs Elementor ${e}`);
  }

  const checks = 4;
  const score = Math.max(0, (checks - differences.length) / checks);
  return { match: differences.length === 0, score, differences, html: htmlSig, elementor: elementorSig };
}

/**
 * Build the WordPress post meta needed to make a page render & edit natively in
 * Elementor. Returns meta keys to merge into the REST `meta` payload.
 */
/**
 * Collect external stylesheet hrefs (Google Fonts + theme CSS) from <link> tags
 * and convert them into @import rules. Because extractRenderableHtml strips
 * <link> tags, this keeps web fonts (typography) and any external CSS working
 * inside the embedded Elementor HTML widget.
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

export function extractRenderableHtml(html: string): string {
  const input = html || "";
  const fontImports = extractStylesheetImports(input);
  const styles = [fontImports, ...(input.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi) || [])].filter(Boolean).join("\n");
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

export interface BuildElementorMetaOptions {
  /** Deprecated compatibility flag. WordPress publishing is native Elementor only. */
  embedCss?: false;
  version?: string;
}

export function buildElementorMeta(
  html: string,
  options: BuildElementorMetaOptions | string = {},
): Record<string, unknown> {
  // Back-compat: allow passing version string as the 2nd arg.
  const opts: BuildElementorMetaOptions =
    typeof options === "string" ? { version: options } : options;
  const { version = "3.21.0" } = opts;

  let data: ElementorElement[];
  data = htmlToElementor(html);

  return {
    _elementor_edit_mode: "builder",
    _elementor_template_type: "wp-page",
    _elementor_version: version,
    _elementor_data: JSON.stringify(data),
    _wp_page_template: "elementor_header_footer",
  };
}

/**
 * Extract all `<style>` CSS blocks from a template HTML string, concatenated.
 * Mirrors the server-side `extractTemplateCss` so the in-app preview shows the
 * same CSS that gets embedded into the Elementor JSON at publish time.
 */
export function extractTemplateCss(html: string | null | undefined): string {
  if (!html) return "";
  const blocks: string[] = [];
  const re = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const css = (m[1] || "").trim();
    if (css) blocks.push(css);
  }
  return blocks.join("\n");
}

export type ElementorWidgetMode = "native";

export interface ElementorMapNode {
  /** Nesting depth (0 = top-level section). */
  depth: number;
  elType: "container" | "widget";
  /** Native Elementor widget type (heading, image, testimonial, ...). */
  widgetType?: string;
  /** Human label: for widgets a content snippet; for containers a layout hint. */
  label: string;
  /** How many direct children this node has. */
  childCount: number;
}

export interface ElementorDebugReport {
  /** Selected widget mode. */
  mode: ElementorWidgetMode;
  /** CSS that travels into the Elementor JSON (concatenated <style> blocks). */
  css: string;
  /** The renderable markup (styles + body) that an iframe can render 1:1. */
  renderable: string;
  /** The serialized `_elementor_data` JSON string written to WordPress. */
  elementorData: string;
  /** Byte length of the `_elementor_data` string. */
  dataLength: number;
  /** Number of widgets produced in the Elementor tree. */
  widgetCount: number;
  /** Number of top-level containers/sections. */
  containerCount: number;
  /** Flattened, depth-ordered map of every element -> native widget. */
  mapping: ElementorMapNode[];
  /** Count of each native widget type produced (e.g. { heading: 4, image: 3 }). */
  widgetSummary: Record<string, number>;
}

function countNodes(nodes: ElementorElement[]): { widgets: number; containers: number } {
  let widgets = 0;
  let containers = 0;
  const walk = (list: ElementorElement[]) => {
    for (const n of list) {
      if (n.elType === "widget") widgets++;
      else containers++;
      if (n.elements?.length) walk(n.elements);
    }
  };
  walk(nodes);
  return { widgets, containers };
}

/** Short human label describing a node's content or layout intent. */
function mapNodeLabel(el: ElementorElement): string {
  const s = el.settings || {};
  if (el.elType === "widget") {
    switch (el.widgetType) {
      case "heading": return String(s.title || "").slice(0, 60);
      case "text-editor": return String(s.editor || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
      case "button": return String(s.text || "").slice(0, 60);
      case "image": return String((s.image as { url?: string })?.url || "").split("/").pop() || "image";
      case "image-box":
      case "icon-box": return String(s.title_text || "").slice(0, 60);
      case "testimonial": return String(s.testimonial_name || s.testimonial_content || "").slice(0, 60);
      case "counter": return String(s.ending_number ?? "") + (s.title ? ` · ${s.title}` : "");
      case "icon-list": return `${(s.icon_list as unknown[])?.length || 0} items`;
      case "accordion":
      case "tabs": return `${(s.tabs as unknown[])?.length || 0} sections`;
      default: return "";
    }
  }
  // Container layout hint.
  if (s.container_type === "grid") {
    const cols = (s.grid_columns_grid as { size?: number })?.size;
    return cols ? `grid · ${cols} cols` : "grid";
  }
  if (s.flex_direction === "row") return "flex · row";
  return "flex · column";
}

function buildMapping(nodes: ElementorElement[]): { mapping: ElementorMapNode[]; summary: Record<string, number> } {
  const mapping: ElementorMapNode[] = [];
  const summary: Record<string, number> = {};
  const walk = (list: ElementorElement[], depth: number) => {
    for (const n of list) {
      mapping.push({
        depth,
        elType: n.elType,
        widgetType: n.widgetType,
        label: mapNodeLabel(n),
        childCount: n.elements?.length || 0,
      });
      if (n.elType === "widget") {
        const key = n.widgetType || "widget";
        summary[key] = (summary[key] || 0) + 1;
      }
      if (n.elements?.length) walk(n.elements, depth + 1);
    }
  };
  walk(nodes, 0);
  return { mapping, summary };
}

/**
 * Produce a full debug report describing exactly what CSS + HTML get embedded
 * into the Elementor JSON for a generated page, in the selected widget mode.
 * Used by the in-app publish preview & debug panel (no network calls).
 */
export function buildElementorDebugReport(
  html: string,
  mode: ElementorWidgetMode = "native",
): ElementorDebugReport {
  const css = extractTemplateCss(html);
  const renderable = extractRenderableHtml(html);
  const meta = buildElementorMeta(html, { embedCss: false });
  const elementorData = String(meta._elementor_data || "[]");
  let tree: ElementorElement[] = [];
  try {
    tree = JSON.parse(elementorData) as ElementorElement[];
  } catch {
    tree = [];
  }
  const counts = countNodes(tree);
  const { mapping, summary } = buildMapping(tree);
  return {
    mode,
    css,
    renderable,
    elementorData,
    dataLength: elementorData.length,
    widgetCount: counts.widgets,
    containerCount: counts.containers,
    mapping,
    widgetSummary: summary,
  };
}

