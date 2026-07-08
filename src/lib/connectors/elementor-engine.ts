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

/** Strip template placeholders like {var}, {{var}}, %var%, [var] so their
 *  internal characters (e.g. the "1" in {stat_1_num}) don't get mistaken for
 *  real content such as a counter number. */
function stripPlaceholders(text: string): string {
  return (text || "")
    .replace(/\{\{[\s\S]*?\}\}/g, " ")
    .replace(/\{[^{}]*\}/g, " ")
    .replace(/%[a-z0-9_]+%/gi, " ")
    .replace(/\[[a-z0-9_]+\]/gi, " ");
}

/** True when the text contains a REAL digit (ignoring digits inside template
 *  variable placeholders like {stat_1_num}). */
function hasRealDigit(text: string): boolean {
  return /\d/.test(stripPlaceholders(text));
}

/** True when the text is (or contains) a value that looks like a stat number,
 *  including placeholder-driven numbers such as {stat_1_num}, {count} etc. */
function looksLikeStatValue(text: string): boolean {
  const t = (text || "").trim();
  if (hasRealDigit(t)) return true;
  // Placeholder whose name hints at a number (num, count, stat, total, value…).
  return /\{\{?\s*[^{}]*(num|count|total|value|amount|number|percent|qty|rate)[^{}]*\}?\}/i.test(t);
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

/** Read a pixel length (e.g. "40px", "3rem") from an inline style declaration. */
function readPxLength(style: string, prop: string): number | null {
  const m = style.match(new RegExp(`${prop}\\s*:\\s*([\\d.]+)\\s*(px|rem|em)?`, "i"));
  if (!m) return null;
  const value = parseFloat(m[1]);
  if (!Number.isFinite(value)) return null;
  const unit = (m[2] || "px").toLowerCase();
  return unit === "px" ? value : Math.round(value * 16);
}

/** An empty spacing element -> native Elementor Spacer widget. */
function spacer(size: number): ElementorElement {
  return {
    id: genId(),
    elType: "widget",
    widgetType: "spacer",
    settings: { space: { unit: "px", size, sizes: [] } },
    elements: [],
  };
}

/**
 * Detect an element whose only purpose is vertical spacing: no text, no media,
 * and either a spacer-style class or an explicit height/margin/padding.
 */
function detectSpacer(node: HtmlNode): ElementorElement | null {
  if (node.tag !== "div" && node.tag !== "span" && node.tag !== "p") return null;
  if (textContent(node)) return null;
  if (findNode(node, (n) => ["img", "svg", "i", "a", "video", "iframe", "hr", "input", "button"].includes(n.tag))) {
    return null;
  }
  const style = (node.attrs.style || "").toLowerCase();
  const isSpacerClass = hasClass(node, "spacer", "spacing", "space", "gap", "vspace", "height");
  const height = readPxLength(style, "height")
    ?? readPxLength(style, "min-height")
    ?? readPxLength(style, "margin-top")
    ?? readPxLength(style, "margin-bottom")
    ?? readPxLength(style, "padding-top")
    ?? readPxLength(style, "padding-bottom");
  if (height && height > 0) return spacer(Math.round(height));
  if (isSpacerClass) return spacer(50);
  return null;
}

/** Pull a 0-100 percentage from aria/style/data/text on a progress element. */
function readPercent(node: HtmlNode): number | null {
  const aria = node.attrs["aria-valuenow"];
  if (aria && Number.isFinite(parseFloat(aria))) return clampPercent(parseFloat(aria));
  const data = node.attrs["data-percent"] || node.attrs["data-value"] || node.attrs["data-progress"];
  if (data && Number.isFinite(parseFloat(data))) return clampPercent(parseFloat(data));
  const style = (node.attrs.style || "").toLowerCase();
  const width = style.match(/width\s*:\s*([\d.]+)\s*%/);
  if (width) return clampPercent(parseFloat(width[1]));
  const inner = findNode(node, (n) => {
    const s = (n.attrs.style || "").toLowerCase();
    return /width\s*:\s*[\d.]+\s*%/.test(s) || Boolean(n.attrs["aria-valuenow"]);
  });
  if (inner) {
    const s = (inner.attrs.style || "").toLowerCase();
    const w = s.match(/width\s*:\s*([\d.]+)\s*%/);
    if (w) return clampPercent(parseFloat(w[1]));
    const a = inner.attrs["aria-valuenow"];
    if (a && Number.isFinite(parseFloat(a))) return clampPercent(parseFloat(a));
  }
  return null;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** A progress-bar element -> native Elementor Progress widget. */
function progressBar(node: HtmlNode, percent: number): ElementorElement {
  const title = textContent(node).replace(/\s*\d+\s*%\s*$/, "").trim();
  return {
    id: genId(),
    elType: "widget",
    widgetType: "progress",
    settings: {
      title: title || undefined,
      percent: { unit: "%", size: percent, sizes: [] },
      display_percentage: "show",
      inner_text: `${percent}%`,
    },
    elements: [],
  };
}

/** Detect a progress-bar structure and convert it to a native Progress widget. */
function detectProgressBar(node: HtmlNode): ElementorElement | null {
  const role = (node.attrs.role || "").toLowerCase();
  const isProgress = node.tag === "progress"
    || role === "progressbar"
    || hasClass(node, "progress", "progress-bar", "skill-bar", "meter");
  if (!isProgress) return null;
  const percent = readPercent(node);
  if (percent === null) return null;
  return progressBar(node, percent);
}



/**
 * When enabled, `<form>` and star-rating markup convert to native Elementor Pro
 * widgets ("form"/"rating"). Off by default so non-Pro sites keep the safe
 * container/heading fallback. Toggled per-run by htmlToElementor(options).
 */
let PRO_WIDGETS = false;

/**
 * Map of `className -> concatenated CSS declarations` parsed from the
 * template's <style> blocks. Class-scoped layout rules (e.g.
 * `.hero{display:grid;grid-template-columns:1fr 1fr}`) live in stylesheets,
 * not inline styles — without resolving them every container collapses to the
 * default flex-column and the published layout stacks/half-widths. Populated
 * per-run by htmlToElementor() and cleared afterwards.
 */
let CSS_CLASS_STYLES: Map<string, string> = new Map();

/** Layout-relevant declarations we care about when resolving class styles. */
const LAYOUT_DECL_RE =
  /(display|grid-template-columns|flex-direction|flex-wrap|grid-auto-flow)\s*:\s*[^;]+/gi;

/**
 * Parse the template's <style> blocks into a `className -> declarations` map.
 * @media blocks are stripped first so responsive overrides never mask the base
 * desktop layout. Only layout declarations are retained.
 */
function parseStylesheetLayout(html: string): Map<string, string> {
  const map = new Map<string, string>();
  const styleBlocks = html.match(/<style\b[^>]*>([\s\S]*?)<\/style>/gi) || [];
  let css = styleBlocks
    .map((b) => b.replace(/<style\b[^>]*>/i, "").replace(/<\/style>/i, ""))
    .join("\n");
  // Drop @media / @supports blocks (with their nested braces) — desktop base only.
  css = css.replace(/@(?:media|supports)[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/gi, "");
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = ruleRe.exec(css)) !== null) {
    const selectors = m[1];
    const body = (m[2] || "").toLowerCase();
    const decls = (body.match(LAYOUT_DECL_RE) || []).join(";");
    if (!decls) continue;
    // Attribute the declarations to the LAST class token in each selector
    // (the element the rule targets, e.g. `.wrap .hero` -> `hero`).
    for (const sel of selectors.split(",")) {
      const classes = sel.trim().match(/\.[a-z0-9_-]+/gi);
      if (!classes || !classes.length) continue;
      const key = classes[classes.length - 1].slice(1).toLowerCase();
      const prev = map.get(key);
      map.set(key, prev ? `${prev};${decls}` : decls);
    }
  }
  return map;
}

/**
 * Combine a node's inline style with any layout declarations from its classes
 * (inline wins). Returns a lowercased declaration string suitable for the
 * regex probes in container().
 */
function resolveNodeStyle(node?: HtmlNode): string {
  if (!node) return "";
  const inline = (node.attrs.style || "").toLowerCase();
  if (!CSS_CLASS_STYLES.size) return inline;
  const classes = (node.attrs.class || "").toLowerCase().split(/\s+/).filter(Boolean);
  const parts: string[] = [];
  for (const c of classes) {
    const decl = CSS_CLASS_STYLES.get(c);
    if (decl) parts.push(decl);
  }
  // Inline last so it overrides class rules in the combined string.
  if (inline) parts.push(inline);
  return parts.join(";");
}

/** Count grid columns from a `grid-template-columns` value, handling repeat(). */
function countGridColumns(value: string): number {
  const v = value.trim();
  const repeat = v.match(/repeat\(\s*(\d+)\s*,/i);
  if (repeat) return parseInt(repeat[1], 10) || 1;
  return v.split(/\s+/).filter(Boolean).length || 1;
}

/** Map an HTML input type to an Elementor Pro form field type. */
function mapFormFieldType(node: HtmlNode): string {
  if (node.tag === "textarea") return "textarea";
  if (node.tag === "select") return "select";
  const t = (node.attrs.type || "text").toLowerCase();
  const allowed = ["text", "email", "tel", "textarea", "url", "password", "number", "date", "time", "checkbox", "radio", "acceptance", "hidden"];
  if (t === "submit" || t === "button" || t === "reset") return "";
  return allowed.includes(t) ? t : "text";
}

/** Collect form fields (input/textarea/select) inside a `<form>`. */
function collectFormFields(node: HtmlNode): Array<Record<string, unknown>> {
  const fields: Array<Record<string, unknown>> = [];
  const walk = (n: HtmlNode) => {
    for (const child of n.children) {
      if (child.tag === "input" || child.tag === "textarea" || child.tag === "select") {
        const fieldType = mapFormFieldType(child);
        if (fieldType) {
          const label = child.attrs["aria-label"] || child.attrs.placeholder || child.attrs.name || "";
          const field: Record<string, unknown> = {
            _id: genId().slice(0, 7),
            field_type: fieldType,
            field_label: label,
            placeholder: child.attrs.placeholder || "",
            required: child.attrs.required !== undefined ? "true" : "",
          };
          if (fieldType === "select") {
            const opts = child.children
              .filter((o) => o.tag === "option")
              .map((o) => textContent(o))
              .filter(Boolean);
            if (opts.length) field.field_options = opts.join("\n");
          }
          fields.push(field);
        }
      }
      if (child.tag) walk(child);
    }
  };
  walk(node);
  return fields;
}

/** `<form>` -> native Elementor Pro Form widget. */
function formWidget(node: HtmlNode): ElementorElement | null {
  const fields = collectFormFields(node);
  if (fields.length === 0) return null;
  const submit = findNode(node, (n) => (n.tag === "button" && (n.attrs.type || "submit") !== "button")
    || (n.tag === "input" && (n.attrs.type || "").toLowerCase() === "submit"));
  const buttonText = submit ? (textContent(submit) || submit.attrs.value || "Send") : "Send";
  return {
    id: genId(),
    elType: "widget",
    widgetType: "form",
    settings: {
      form_name: node.attrs.name || "Form",
      form_fields: fields,
      button_text: buttonText,
    },
    elements: [],
  };
}

/** Count filled stars in a rating widget and its scale. */
function readRating(node: HtmlNode): { rating: number; scale: number } | null {
  const aria = node.attrs["aria-valuenow"] || node.attrs["data-rating"] || node.attrs["data-value"];
  const maxAttr = node.attrs["aria-valuemax"] || node.attrs["data-max"];
  if (aria && Number.isFinite(parseFloat(aria))) {
    const scale = maxAttr && Number.isFinite(parseFloat(maxAttr)) ? Math.round(parseFloat(maxAttr)) : 5;
    return { rating: Math.min(parseFloat(aria), scale), scale };
  }
  const icons: HtmlNode[] = [];
  const walk = (n: HtmlNode) => {
    for (const child of n.children) {
      if ((child.tag === "i" || child.tag === "svg" || child.tag === "span") && hasClass(child, "star", "fa-star", "rating")) {
        icons.push(child);
      }
      if (child.tag) walk(child);
    }
  };
  walk(node);
  if (icons.length === 0) return null;
  const filled = icons.filter((i) => {
    const cls = (i.attrs.class || "").toLowerCase();
    const style = (i.attrs.style || "").toLowerCase();
    const isEmpty = cls.includes("far") || cls.includes("empty") || cls.includes("-o") || cls.includes("outline");
    return !isEmpty && !style.includes("opacity:0") ;
  }).length;
  const scale = icons.length || 5;
  return { rating: Math.max(0, Math.min(filled, scale)), scale };
}

/** Star-rating markup -> native Elementor Pro Rating widget. */
function ratingWidget(node: HtmlNode): ElementorElement | null {
  const info = readRating(node);
  if (!info) return null;
  return {
    id: genId(),
    elType: "widget",
    widgetType: "rating",
    settings: {
      rating_scale: info.scale,
      rating: info.rating,
    },
    elements: [],
  };
}

/** Detect star-rating structures (class-based, aria, or data attributes). */
function detectRating(node: HtmlNode): ElementorElement | null {
  if (!PRO_WIDGETS) return null;
  const role = (node.attrs.role || "").toLowerCase();
  const looksLikeRating = role === "img" && /\d\s*(out of|\/)\s*\d/.test(node.attrs["aria-label"] || "")
    || hasClass(node, "rating", "star-rating", "stars", "rate");
  if (!looksLikeRating) return null;
  return ratingWidget(node);
}

/** Detect a `<form>` and convert it to a native Elementor Pro Form widget. */
function detectForm(node: HtmlNode): ElementorElement | null {
  if (!PRO_WIDGETS || node.tag !== "form") return null;
  return formWidget(node);
}

/**
 * Keyword → Elementor free (Font Awesome Solid) icon map. Used when the source
 * markup carries a themed/custom icon class (or an <svg>) with no direct `fa-*`
 * token, so the converted icon still shows a meaningful free icon.
 */
const ICON_KEYWORD_MAP: Array<{ re: RegExp; icon: string }> = [
  { re: /\b(rocket|launch|boost|startup)\b/, icon: "fa-rocket" },
  { re: /\b(shield|secure|security|protect|guard|safe)\b/, icon: "fa-shield-halved" },
  { re: /\b(check|tick|done|complete|success|verified)\b/, icon: "fa-circle-check" },
  { re: /\b(chart|graph|analytic|report|stat|growth|trend)\b/, icon: "fa-chart-line" },
  { re: /\b(bulb|idea|lightbulb|innovat|creative)\b/, icon: "fa-lightbulb" },
  { re: /\b(gear|cog|setting|config|tool|wrench)\b/, icon: "fa-gear" },
  { re: /\b(clock|time|fast|speed|quick|deliver)\b/, icon: "fa-clock" },
  { re: /\b(phone|call|contact|support|headset)\b/, icon: "fa-phone" },
  { re: /\b(mail|email|envelope|message|newsletter)\b/, icon: "fa-envelope" },
  { re: /\b(user|person|people|customer|account)\b/, icon: "fa-user" },
  { re: /\b(users|group|team|community|audience)\b/, icon: "fa-users" },
  { re: /\b(heart|love|like|favorite|care)\b/, icon: "fa-heart" },
  { re: /\b(star|rating|quality|premium|best)\b/, icon: "fa-star" },
  { re: /\b(globe|world|global|web|internet|language)\b/, icon: "fa-globe" },
  { re: /\b(cart|shop|store|buy|ecommerce|commerce|bag)\b/, icon: "fa-cart-shopping" },
  { re: /\b(dollar|price|money|payment|cost|billing|finance)\b/, icon: "fa-dollar-sign" },
  { re: /\b(lock|privacy|password|encrypt)\b/, icon: "fa-lock" },
  { re: /\b(cloud|hosting|server|storage|backup)\b/, icon: "fa-cloud" },
  { re: /\b(mobile|app|responsive|device)\b/, icon: "fa-mobile-screen" },
  { re: /\b(code|develop|program|api|integration)\b/, icon: "fa-code" },
  { re: /\b(paint|design|brush|palette|ui|ux)\b/, icon: "fa-paintbrush" },
  { re: /\b(search|seo|find|magnif)\b/, icon: "fa-magnifying-glass" },
  { re: /\b(location|map|pin|address|place)\b/, icon: "fa-location-dot" },
  { re: /\b(calendar|schedule|event|booking|date)\b/, icon: "fa-calendar" },
  { re: /\b(gift|reward|bonus|offer)\b/, icon: "fa-gift" },
  { re: /\b(award|trophy|win|achievement|medal)\b/, icon: "fa-trophy" },
  { re: /\b(thumbs|approve)\b/, icon: "fa-thumbs-up" },
  { re: /\b(handshake|deal|partner|agreement)\b/, icon: "fa-handshake" },
  { re: /\b(fire|hot|trending|popular)\b/, icon: "fa-fire" },
  { re: /\b(bolt|flash|power|energy|electric)\b/, icon: "fa-bolt" },
  { re: /\b(book|learn|read|course|guide|doc)\b/, icon: "fa-book" },
  { re: /\b(play|video|media|watch)\b/, icon: "fa-play" },
  { re: /\b(camera|photo|image|gallery)\b/, icon: "fa-camera" },
  { re: /\b(comment|chat|talk|discuss|feedback)\b/, icon: "fa-comment" },
  { re: /\b(truck|ship|delivery|logistic)\b/, icon: "fa-truck" },
  { re: /\b(headphone|music|audio|sound)\b/, icon: "fa-headphones" },
  { re: /\b(home|house|property|estate)\b/, icon: "fa-house" },
  { re: /\b(target|goal|aim|mission|focus)\b/, icon: "fa-bullseye" },
  { re: /\b(infinity|unlimited)\b/, icon: "fa-infinity" },
  { re: /\b(sync|refresh|update|reload)\b/, icon: "fa-arrows-rotate" },
  // ── Extended fallbacks ──────────────────────────────────────────────
  { re: /\b(envelope-open|inbox|subscribe)\b/, icon: "fa-envelope-open" },
  { re: /\b(bell|alert|notification|reminder)\b/, icon: "fa-bell" },
  { re: /\b(flag|milestone|country|report-issue)\b/, icon: "fa-flag" },
  { re: /\b(tag|label|category|badge|coupon|discount|sale)\b/, icon: "fa-tag" },
  { re: /\b(key|access|unlock|license|activation)\b/, icon: "fa-key" },
  { re: /\b(database|db|data|records)\b/, icon: "fa-database" },
  { re: /\b(network|nodes|topology|connections)\b/, icon: "fa-network-wired" },
  { re: /\b(wifi|wireless|signal|hotspot)\b/, icon: "fa-wifi" },
  { re: /\b(plug|connect|integration-plug|power-cord)\b/, icon: "fa-plug" },
  { re: /\b(desktop|monitor|computer|pc)\b/, icon: "fa-desktop" },
  { re: /\b(laptop|notebook|macbook)\b/, icon: "fa-laptop" },
  { re: /\b(tablet|ipad)\b/, icon: "fa-tablet-screen-button" },
  { re: /\b(print|printer)\b/, icon: "fa-print" },
  { re: /\b(save|floppy|disk)\b/, icon: "fa-floppy-disk" },
  { re: /\b(download|import|receive)\b/, icon: "fa-download" },
  { re: /\b(upload|export|publish-arrow|send-up)\b/, icon: "fa-upload" },
  { re: /\b(share|social|distribute)\b/, icon: "fa-share-nodes" },
  { re: /\b(link|url|chain|hyperlink)\b/, icon: "fa-link" },
  { re: /\b(copy|duplicate|clone)\b/, icon: "fa-copy" },
  { re: /\b(paste|clipboard|checklist|task)\b/, icon: "fa-clipboard-check" },
  { re: /\b(edit|pencil|write|compose)\b/, icon: "fa-pen" },
  { re: /\b(trash|delete|remove|bin)\b/, icon: "fa-trash" },
  { re: /\b(filter|sort|funnel)\b/, icon: "fa-filter" },
  { re: /\b(sliders|controls|adjust|equalizer)\b/, icon: "fa-sliders" },
  { re: /\b(list|menu|bullet|items)\b/, icon: "fa-list" },
  { re: /\b(grid|layout|dashboard|blocks|table-cells)\b/, icon: "fa-table-cells" },
  { re: /\b(columns|kanban|board)\b/, icon: "fa-table-columns" },
  { re: /\b(pie|piechart|distribution)\b/, icon: "fa-chart-pie" },
  { re: /\b(bar|barchart|column-chart|metrics)\b/, icon: "fa-chart-column" },
  { re: /\b(coins|savings|budget|wallet-coins)\b/, icon: "fa-coins" },
  { re: /\b(wallet|balance|funds)\b/, icon: "fa-wallet" },
  { re: /\b(credit|card|visa|mastercard|checkout)\b/, icon: "fa-credit-card" },
  { re: /\b(receipt|invoice|bill|order)\b/, icon: "fa-receipt" },
  { re: /\b(percent|percentage|rate)\b/, icon: "fa-percent" },
  { re: /\b(scale|balance-scale|law|legal|justice|compliance)\b/, icon: "fa-scale-balanced" },
  { re: /\b(briefcase|business|work|job|portfolio|corporate)\b/, icon: "fa-briefcase" },
  { re: /\b(building|company|office|enterprise|agency)\b/, icon: "fa-building" },
  { re: /\b(industry|factory|manufacturing|plant)\b/, icon: "fa-industry" },
  { re: /\b(warehouse|inventory|stock)\b/, icon: "fa-warehouse" },
  { re: /\b(box|package|product|parcel)\b/, icon: "fa-box" },
  { re: /\b(boxes|bulk|multiple-products)\b/, icon: "fa-boxes-stacked" },
  { re: /\b(tags|pricing|plans)\b/, icon: "fa-tags" },
  { re: /\b(graduation|education|academy|degree|school|training)\b/, icon: "fa-graduation-cap" },
  { re: /\b(certificate|diploma|accredited)\b/, icon: "fa-certificate" },
  { re: /\b(lightbulb-on|tip|hint)\b/, icon: "fa-lightbulb" },
  { re: /\b(brain|smart|ai|intelligence|think)\b/, icon: "fa-brain" },
  { re: /\b(robot|automation|bot|machine)\b/, icon: "fa-robot" },
  { re: /\b(microchip|processor|cpu|hardware|chip)\b/, icon: "fa-microchip" },
  { re: /\b(gears|cogs|process|workflow|operations)\b/, icon: "fa-gears" },
  { re: /\b(screwdriver|repair|maintenance|fix|toolbox)\b/, icon: "fa-screwdriver-wrench" },
  { re: /\b(hammer|build|construct|craft)\b/, icon: "fa-hammer" },
  { re: /\b(compass|navigate|direction|explore)\b/, icon: "fa-compass" },
  { re: /\b(map-signs|route|path|roadmap|journey)\b/, icon: "fa-map-location-dot" },
  { re: /\b(plane|flight|travel|airline|trip)\b/, icon: "fa-plane" },
  { re: /\b(car|auto|vehicle|drive|rental)\b/, icon: "fa-car" },
  { re: /\b(bicycle|bike|cycle)\b/, icon: "fa-bicycle" },
  { re: /\b(anchor|marine|port|ship-anchor)\b/, icon: "fa-anchor" },
  { re: /\b(leaf|eco|green|nature|organic|sustainable)\b/, icon: "fa-leaf" },
  { re: /\b(tree|forest|environment)\b/, icon: "fa-tree" },
  { re: /\b(seedling|grow|plant|startup-grow)\b/, icon: "fa-seedling" },
  { re: /\b(sun|solar|sunny|bright|daylight)\b/, icon: "fa-sun" },
  { re: /\b(moon|night|dark|sleep)\b/, icon: "fa-moon" },
  { re: /\b(water|drop|droplet|liquid|hydration)\b/, icon: "fa-droplet" },
  { re: /\b(recycle|reuse|renew)\b/, icon: "fa-recycle" },
  { re: /\b(heartbeat|pulse|health|vital|monitor-health)\b/, icon: "fa-heart-pulse" },
  { re: /\b(medical|medkit|firstaid|clinic)\b/, icon: "fa-kit-medical" },
  { re: /\b(doctor|physician|nurse|md)\b/, icon: "fa-user-doctor" },
  { re: /\b(hospital|healthcare|emergency)\b/, icon: "fa-hospital" },
  { re: /\b(pills|medicine|pharmacy|drug|prescription)\b/, icon: "fa-pills" },
  { re: /\b(stethoscope|checkup|diagnosis)\b/, icon: "fa-stethoscope" },
  { re: /\b(tooth|dental|dentist)\b/, icon: "fa-tooth" },
  { re: /\b(dumbbell|fitness|gym|workout|exercise)\b/, icon: "fa-dumbbell" },
  { re: /\b(running|run|jog|sport|active)\b/, icon: "fa-person-running" },
  { re: /\b(spa|wellness|relax|zen|meditation)\b/, icon: "fa-spa" },
  { re: /\b(utensils|food|restaurant|dining|menu-food|eat)\b/, icon: "fa-utensils" },
  { re: /\b(coffee|cafe|mug|espresso)\b/, icon: "fa-mug-hot" },
  { re: /\b(pizza|fastfood|slice)\b/, icon: "fa-pizza-slice" },
  { re: /\b(cake|birthday|celebration|party)\b/, icon: "fa-cake-candles" },
  { re: /\b(wine|drink|bar|glass)\b/, icon: "fa-wine-glass" },
  { re: /\b(scissors|cut|barber|salon|haircut)\b/, icon: "fa-scissors" },
  { re: /\b(tshirt|clothing|apparel|fashion|wear)\b/, icon: "fa-shirt" },
  { re: /\b(gem|diamond|jewelry|luxury|premium-gem)\b/, icon: "fa-gem" },
  { re: /\b(crown|vip|royal|elite)\b/, icon: "fa-crown" },
  { re: /\b(ribbon|badge-award|winner)\b/, icon: "fa-ribbon" },
  { re: /\b(medal|honor|rank)\b/, icon: "fa-medal" },
  { re: /\b(bullhorn|megaphone|announce|marketing|promo|advertis)\b/, icon: "fa-bullhorn" },
  { re: /\b(newspaper|news|press|article|blog)\b/, icon: "fa-newspaper" },
  { re: /\b(quote|testimonial|review-quote)\b/, icon: "fa-quote-left" },
  { re: /\b(question|faq|help|support-question|ask)\b/, icon: "fa-circle-question" },
  { re: /\b(info|information|about|details)\b/, icon: "fa-circle-info" },
  { re: /\b(exclamation|warning|caution|important)\b/, icon: "fa-triangle-exclamation" },
  { re: /\b(ban|blocked|forbidden|denied|stop)\b/, icon: "fa-ban" },
  { re: /\b(eye|view|preview|visible|watch-eye|visibility)\b/, icon: "fa-eye" },
  { re: /\b(fingerprint|biometric|identity)\b/, icon: "fa-fingerprint" },
  { re: /\b(user-shield|privacy-user|secure-account)\b/, icon: "fa-user-shield" },
  { re: /\b(user-check|verified-user|approved-user)\b/, icon: "fa-user-check" },
  { re: /\b(user-plus|signup|register|add-user|join)\b/, icon: "fa-user-plus" },
  { re: /\b(id|card-id|badge-id|profile-card)\b/, icon: "fa-id-card" },
  { re: /\b(comments|conversation|forum|threads)\b/, icon: "fa-comments" },
  { re: /\b(paper-plane|send|submit|telegram-send)\b/, icon: "fa-paper-plane" },
  { re: /\b(thumbs-down|dislike|reject)\b/, icon: "fa-thumbs-down" },
  { re: /\b(hand|touch|palm|wave)\b/, icon: "fa-hand" },
  { re: /\b(handshake-simple|deal-simple|partnership)\b/, icon: "fa-handshake-simple" },
  { re: /\b(hands-helping|help-hand|charity|volunteer|donate|support-hands)\b/, icon: "fa-hands-helping" },
  { re: /\b(peace|calm|harmony)\b/, icon: "fa-hand-peace" },
  { re: /\b(magic|wand|sparkle|enhance|beautify)\b/, icon: "fa-wand-magic-sparkles" },
  { re: /\b(puzzle|piece|solution|extension|plugin)\b/, icon: "fa-puzzle-piece" },
  { re: /\b(layer|layers|stack|clone-layer)\b/, icon: "fa-layer-group" },
  { re: /\b(sitemap|hierarchy|structure|org)\b/, icon: "fa-sitemap" },
  { re: /\b(diagram|project|flowchart)\b/, icon: "fa-diagram-project" },
  { re: /\b(calculator|compute|math|estimate)\b/, icon: "fa-calculator" },
  { re: /\b(clipboard-list|checklist-tasks|todo)\b/, icon: "fa-clipboard-list" },
  { re: /\b(file|document|page|paper-file)\b/, icon: "fa-file" },
  { re: /\b(file-pdf|pdf)\b/, icon: "fa-file-pdf" },
  { re: /\b(folder|directory|files-folder)\b/, icon: "fa-folder" },
  { re: /\b(archive|box-archive|records-archive)\b/, icon: "fa-box-archive" },
  { re: /\b(hourglass|waiting|pending|timer)\b/, icon: "fa-hourglass-half" },
  { re: /\b(stopwatch|timing|countdown|performance)\b/, icon: "fa-stopwatch" },
  { re: /\b(route-signs|signpost|guidance)\b/, icon: "fa-signs-post" },
  { re: /\b(thumbtack|pin-note|pinned|sticky)\b/, icon: "fa-thumbtack" },
  { re: /\b(bookmark|save-later|favorite-mark)\b/, icon: "fa-bookmark" },
  { re: /\b(magnet|attract|lead-magnet)\b/, icon: "fa-magnet" },
  { re: /\b(chess|strategy|planning|tactic)\b/, icon: "fa-chess" },
  { re: /\b(dice|random|game|luck|chance)\b/, icon: "fa-dice" },
  { re: /\b(gamepad|gaming|controller|play-game)\b/, icon: "fa-gamepad" },
  { re: /\b(trophy-star|champion|leaderboard)\b/, icon: "fa-trophy" },
  { re: /\b(mountain|peak|summit|goal-high|challenge)\b/, icon: "fa-mountain" },
  { re: /\b(road|highway|street|drive-road)\b/, icon: "fa-road" },
  { re: /\b(flag-checkered|finish|complete-race)\b/, icon: "fa-flag-checkered" },
  { re: /\b(atom|science|physics|research-lab)\b/, icon: "fa-atom" },
  { re: /\b(flask|lab|experiment|chemistry|testing)\b/, icon: "fa-flask" },
  { re: /\b(microscope|analysis|inspect|examine)\b/, icon: "fa-microscope" },
  { re: /\b(dna|genetic|biology)\b/, icon: "fa-dna" },
  { re: /\b(satellite|gps|tracking|signal-dish)\b/, icon: "fa-satellite-dish" },
  { re: /\b(broadcast|tower|radio|transmit)\b/, icon: "fa-tower-broadcast" },
  { re: /\b(server-rack|datacenter|infrastructure)\b/, icon: "fa-server" },
  { re: /\b(shield-check|verified-secure|trusted|protection-check)\b/, icon: "fa-shield-halved" },
  { re: /\b(lock-open|granted|open-access)\b/, icon: "fa-lock-open" },
  { re: /\b(user-gear|account-settings|manage-user)\b/, icon: "fa-user-gear" },
  { re: /\b(headset-support|live-support|helpdesk)\b/, icon: "fa-headset" },
  { re: /\b(life-ring|rescue|assistance|lifebuoy)\b/, icon: "fa-life-ring" },
  { re: /\b(umbrella|insurance|coverage|shelter)\b/, icon: "fa-umbrella" },
  { re: /\b(piggy|savings-bank|deposit)\b/, icon: "fa-piggy-bank" },
  { re: /\b(landmark|bank|institution|government)\b/, icon: "fa-landmark" },
  { re: /\b(hand-holding|offer-hand|give|provide)\b/, icon: "fa-hand-holding" },
  { re: /\b(hand-holding-dollar|roi|earnings|payout|investment)\b/, icon: "fa-hand-holding-dollar" },
  { re: /\b(arrow-trend|increase|growth-arrow|scale-up)\b/, icon: "fa-arrow-trend-up" },
  { re: /\b(expand|maximize|fullscreen|grow-arrows)\b/, icon: "fa-up-right-and-down-left-from-center" },
  { re: /\b(circle-nodes|cluster|mesh|distributed)\b/, icon: "fa-circle-nodes" },
  // ── Home services / trades / plumbing / HVAC domain ─────────────────────
  { re: /\b(leak|drip|leakage|leaking)\b/, icon: "fa-faucet-drip" },
  { re: /\b(drain|drainage|unclog|clog|sewer)\b/, icon: "fa-sink" },
  { re: /\b(pipe|piping|plumb|plumbing|plumber)\b/, icon: "fa-wrench" },
  { re: /\b(faucet|tap|valve|fitting)\b/, icon: "fa-faucet" },
  { re: /\b(bath|bathroom|bathtub|shower|toilet|washroom)\b/, icon: "fa-bath" },
  { re: /\b(kitchen|sink|basin)\b/, icon: "fa-sink" },
  { re: /\b(heater|boiler|furnace|heating|thermostat|geyser)\b/, icon: "fa-temperature-high" },
  { re: /\b(cooling|hvac|ventilation|airflow|fan)\b/, icon: "fa-fan" },
  { re: /\b(filter|filtration|purify|purification)\b/, icon: "fa-filter" },
  { re: /\b(gas|flame|burner|combustion)\b/, icon: "fa-fire-flame-simple" },
  { re: /\b(wiring|outlet|socket|electrician|electrical)\b/, icon: "fa-plug-circle-bolt" },
  { re: /\b(renovation|remodel|paint-roller|refurbish)\b/, icon: "fa-paint-roller" },
  { re: /\b(broom|janitor|sweep|housekeeping)\b/, icon: "fa-broom" },
  { re: /\b(spray|pressure-wash|washing)\b/, icon: "fa-spray-can-sparkles" },
  { re: /\b(snow|frost|freeze|winter)\b/, icon: "fa-snowflake" },
  { re: /\b(temperature|thermometer|climate|degrees)\b/, icon: "fa-temperature-half" },
  { re: /\b(toolbox|handyman|installation|install|repair-kit)\b/, icon: "fa-toolbox" },
  { re: /\b(drop|droplet|water|hydration|liquid|moisture)\b/, icon: "fa-droplet" },
];


/** Map a keyword string (class names / svg id) to a free FA solid icon token. */
function keywordIconToken(text: string): string | null {
  const t = text.toLowerCase();
  for (const { re, icon } of ICON_KEYWORD_MAP) {
    if (re.test(t)) return icon;
  }
  return null;
}

/**
 * Gather icon hint text from a node AND its descendants — SVG icons (lucide /
 * heroicons / feather) carry meaning in a `lucide-*` class, a `data-icon`/
 * `data-lucide` attr, or a `<use xlink:href="#water">` ref, not an FA class.
 */
function collectIconHints(node: HtmlNode): string {
  const parts: string[] = [];
  const visit = (n: HtmlNode) => {
    parts.push(
      n.attrs.class || "",
      n.attrs["data-icon"] || "",
      n.attrs["data-lucide"] || "",
      n.attrs["data-feather"] || "",
      n.attrs["aria-label"] || "",
      n.attrs.id || "",
      n.attrs.href || "",
      n.attrs["xlink:href"] || "",
      n.attrs.name || "",
    );
    for (const c of n.children) visit(c);
  };
  visit(node);
  return parts.join(" ");
}

/** Map an icon class (or SVG + `contextHint` label) to an Elementor free icon. */
function resolveIconValue(node: HtmlNode, contextHint = ""): { value: string; library: string } {
  const cls = (node.attrs.class || "").toLowerCase();
  const styleToken = cls.match(/\bfa[bsrl]?\b/)?.[0] || "fas";
  const iconToken = cls.match(/\bfa-[a-z0-9-]+\b/)?.[0];
  if (iconToken) {
    const library = styleToken === "fab" ? "fa-brands" : styleToken === "far" ? "fa-regular" : "fa-solid";
    return { value: `${styleToken} ${iconToken}`, library };
  }
  const eicon = cls.match(/\beicon-[a-z0-9-]+\b/)?.[0];
  if (eicon) return { value: eicon, library: "elementor-icons" };
  const guessed =
    keywordIconToken(collectIconHints(node)) || keywordIconToken((contextHint || "").toLowerCase());
  if (guessed) return { value: `fas ${guessed}`, library: "fa-solid" };
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
    .map((li) => {
      const iconNode = findNode(li, (n) => n.tag === "i" || n.tag === "svg" || hasClass(n, "icon", "fa"));
      const text = textContent(li);
      return {
        _id: genId(),
        text,
        selected_icon: iconNode
          ? resolveIconValue(iconNode, text)
          : (keywordIconToken(text.toLowerCase())
              ? { value: `fas ${keywordIconToken(text.toLowerCase())}`, library: "fa-solid" }
              : { value: "fas fa-check", library: "fa-solid" }),
      };

    });
  return {
    id: genId(),
    elType: "widget",
    widgetType: "icon-list",
    settings: { icon_list: items },
    elements: [],
  };
}

function counter(node: HtmlNode): ElementorElement {
  // Prefer a leaf node that holds a real number or a number-like placeholder
  // ({stat_1_num}) so template variables survive conversion untouched.
  const numNode =
    findNode(node, (n) => looksLikeStatValue(textContent(n)) && n.children.every((c) => !c.tag)) ||
    findNode(node, (n) => /\d/.test(textContent(n)) && n.children.every((c) => !c.tag));
  const raw = textContent(numNode || node);
  const cleaned = raw.trim();
  const hasPlaceholder = /\{\{?[^{}]*\}?\}|%[a-z0-9_]+%|\[[a-z0-9_]+\]/i.test(cleaned);
  const numMatch = hasRealDigit(cleaned) ? stripPlaceholders(cleaned).match(/[\d.,]+/) : null;
  // ending_number: use the real number when present; otherwise keep the raw
  // placeholder so it is resolved at generation time.
  const ending = numMatch ? parseInt(numMatch[0].replace(/[^\d]/g, ""), 10) || 0 : (hasPlaceholder ? cleaned : 0);
  // Preserve any non-numeric prefix/suffix (e.g. "15+", "%", "k").
  let prefix = "";
  let suffix = "";
  if (numMatch) {
    const idx = cleaned.indexOf(numMatch[0]);
    if (idx >= 0) {
      prefix = cleaned.slice(0, idx).trim();
      suffix = cleaned.slice(idx + numMatch[0].length).trim();
    }
  }
  // Title/label: an explicit heading/.title/.label, or the non-number sibling
  // text of a "<b>42</b><span>Members</span>" style stat card.
  let titleNode = findNode(node, (n) => HEADINGS.has(n.tag) || hasClass(n, "title", "label", "desc", "text"));
  if (!titleNode) {
    titleNode = findNode(
      node,
      (n) =>
        n !== numNode &&
        n.children.every((c) => !c.tag) &&
        !!textContent(n).trim() &&
        !looksLikeStatValue(textContent(n)),
    );
  }
  const settings: Record<string, unknown> = {
    starting_number: 0,
    ending_number: ending,
    prefix,
    suffix,
    title: titleNode ? textContent(titleNode) : "",
  };
  // Count-up animation: map duration (ms) to Elementor's native `duration` and
  // easing to a bridge key so both marketplace preview and published pages match.
  const durAttr =
    node.attrs["data-duration"] ||
    node.attrs["data-count-duration"] ||
    node.attrs["data-speed"] ||
    node.attrs["data-aos-duration"];
  if (durAttr) {
    const m = durAttr.trim().toLowerCase().match(/([\d.]+)\s*(ms|s)?/);
    if (m) {
      const n = parseFloat(m[1]);
      if (isFinite(n) && n > 0) {
        settings.duration = Math.round(m[2] === "s" || (!m[2] && n <= 60) ? n * 1000 : n);
      }
    }
  }
  const easeAttr = node.attrs["data-easing"] || node.attrs["data-ease"] || node.attrs["data-aos-easing"];
  if (easeAttr && easeAttr.trim() && easeAttr.trim().toLowerCase() !== "none") {
    settings.__xxxv_counter_easing = easeAttr.trim().toLowerCase();
  }
  return {
    id: genId(),
    elType: "widget",
    widgetType: "counter",
    settings,
    elements: [],
  };
}

function testimonialFields(node: HtmlNode): { content: string; name: string; job: string; image: string } {
  const img = findNode(node, (n) => n.tag === "img");
  const nameNode = findNode(node, (n) => hasClass(n, "name", "author") || HEADINGS.has(n.tag));
  const jobNode = findNode(node, (n) => hasClass(n, "role", "job", "title", "position", "company"));
  const contentNode = findNode(node, (n) => n.tag === "p" || hasClass(n, "content", "text", "quote", "message"));
  return {
    content: contentNode ? textContent(contentNode) : textContent(node),
    name: nameNode ? textContent(nameNode) : "",
    job: jobNode ? textContent(jobNode) : "",
    image: img ? (img.attrs.src || "") : "",
  };
}

function testimonial(node: HtmlNode): ElementorElement {
  const f = testimonialFields(node);
  return {
    id: genId(),
    elType: "widget",
    widgetType: "testimonial",
    settings: {
      testimonial_content: f.content,
      testimonial_name: f.name,
      testimonial_job: f.job,
      testimonial_image: { url: f.image },
    },
    elements: [],
  };
}

function findTestimonialCards(node: HtmlNode): HtmlNode[] {
  let cards = findAll(node, (n) =>
    hasClass(
      n,
      "testimonial-card", "testimonial__card", "testimonial-item", "testimonial__item",
      "review-card", "review-item", "quote-card", "swiper-slide", "slick-slide",
      "splide__slide", "carousel-item", "testimonial-slide",
    ),
  );
  if (cards.length < 2) {
    const bq = findAll(node, (n) => n.tag === "blockquote");
    if (bq.length >= 2) cards = bq;
  }
  if (cards.length < 2) {
    cards = node.children.filter((c) => c.tag && hasClass(c, "testimonial", "review", "quote"));
  }
  return cards;
}

function testimonialCarousel(node: HtmlNode): ElementorElement {
  const cards = findTestimonialCards(node);
  const slides = cards.map((card) => {
    const f = testimonialFields(card);
    return { _id: genId(), content: f.content, name: f.name, title: f.job, image: { url: f.image, id: "" } };
  });
  return {
    id: genId(),
    elType: "widget",
    widgetType: "testimonial-carousel",
    settings: {
      slides,
      skin: "default",
      layout: "image_inline",
      slides_to_show: Math.min(Math.max(slides.length, 1), 3),
      slides_to_show_tablet: 2,
      slides_to_show_mobile: 1,
      navigation: "both",
      pause_on_hover: "yes",
    },
    elements: [],
  };
}


function iconBox(node: HtmlNode): ElementorElement {
  const titleNode = findNode(node, (n) => HEADINGS.has(n.tag) || hasClass(n, "title", "heading", "name"));
  const descNode = findNode(node, (n) => n.tag === "p" || hasClass(n, "desc", "text", "description", "subtitle"));
  const iconNode = findNode(
    node,
    (n) => n.tag === "i" || n.tag === "svg" || hasClass(n, "icon", "fa", "feature-icon", "service-icon"),
  );
  // Icon position from the source box layout so the preview matches the design.
  const style = resolveNodeStyle(node);
  const isFlex = /display\s*:\s*flex/.test(style);
  const isRow = isFlex && /flex-direction\s*:\s*row/.test(style);
  const isRowReverse = /flex-direction\s*:\s*row-reverse/.test(style);
  const position = isRowReverse ? "right" : isRow ? "left" : "top";
  return {
    id: genId(),
    elType: "widget",
    widgetType: "icon-box",
    settings: {
      title_text: titleNode ? textContent(titleNode) : "",
      description_text: descNode ? textContent(descNode) : "",
      selected_icon: resolveIconValue(
        iconNode ?? node,
        [titleNode ? textContent(titleNode) : "", descNode ? textContent(descNode) : ""].join(" "),
      ),
      view: "default",
      position,
    },
    elements: [],
  };
}

function imageBox(node: HtmlNode): ElementorElement {
  const img = findNode(node, (n) => n.tag === "img");
  const titleNode = findNode(node, (n) => HEADINGS.has(n.tag) || hasClass(n, "title", "heading", "name"));
  const descNode = findNode(node, (n) => n.tag === "p" || hasClass(n, "desc", "text", "description", "subtitle"));
  return {
    id: genId(),
    elType: "widget",
    widgetType: "image-box",
    settings: {
      image: img ? { url: img.attrs.src || "", alt: img.attrs.alt || "", id: "" } : { url: "" },
      title_text: titleNode ? textContent(titleNode) : "",
      description_text: descNode ? textContent(descNode) : "",
      position: "top",
      title_size: "h3",
    },
    elements: [],
  };
}

function accordion(node: HtmlNode): ElementorElement {
  // 1) Native <details>/<summary> disclosure lists.
  let items = findAll(node, (n) => n.tag === "details").map((det) => {
    const summary = findNode(det, (n) => n.tag === "summary");
    return {
      _id: genId(),
      tab_title: summary ? textContent(summary) : textContent(det).slice(0, 80),
      tab_content: innerHtml(det).replace(/<summary[\s\S]*?<\/summary>/i, ""),
    };
  });

  // 2) Class-based FAQ / accordion items (broad naming conventions).
  if (!items.length) {
    items = findAll(node, (n) =>
      hasClass(
        n,
        "accordion-item", "accordion__item", "accordion-entry",
        "faq-item", "faq__item", "faq-entry", "faq-row", "faq-question-wrap",
        "qa-item", "qa-block", "question-item",
      ),
    ).map((item) => {
      const head = findNode(item, (n) =>
        HEADINGS.has(n.tag) ||
        hasClass(n, "title", "header", "question", "faq-question", "accordion-header", "accordion-title", "toggle", "summary"),
      );
      const bodyNode = findNode(item, (n) =>
        hasClass(n, "content", "body", "answer", "panel", "faq-answer", "accordion-content", "accordion-body", "collapse"),
      );
      return {
        _id: genId(),
        tab_title: head ? textContent(head) : textContent(item).slice(0, 80),
        tab_content: bodyNode ? innerHtml(bodyNode) : "",
      };
    });
  }

  // 3) Last resort: heading + following paragraph pairs.
  if (!items.length) {
    const kids = node.children.filter((c) => c.tag);
    for (let i = 0; i < kids.length; i++) {
      if (HEADINGS.has(kids[i].tag) || hasClass(kids[i], "question", "faq-question")) {
        const next = kids[i + 1];
        items.push({
          _id: genId(),
          tab_title: textContent(kids[i]),
          tab_content: next && !HEADINGS.has(next.tag) ? innerHtml(next) : "",
        });
      }
    }
  }

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
  const social = detectSocialIcons(node);
  if (social) return social;
  if (node.tag === "ul" || node.tag === "ol") return iconList(node);

  // Multi-item sections/grids must stay containers so each child maps to its
  // OWN native widget (see server engine for rationale). Prevents a whole grid
  // of cards / stats / a 2-column layout section collapsing into one widget.
  const headingCountTop = findAll(node, (n) => HEADINGS.has(n.tag)).length;
  const imgCountTop = findAll(node, (n) => n.tag === "img").length;
  const bigHeading = findAll(node, (n) => n.tag === "h1" || n.tag === "h2").length > 0;
  const statChildren = node.children.filter(
    (c) => c.tag && (hasClass(c, "stat", "counter") || hasRealDigit(textContent(c))),
  ).length;
  const isMultiGroup =
    node.tag === "section" || bigHeading || headingCountTop >= 2 || imgCountTop >= 2 || statChildren >= 2;

  if (hasClass(node, "accordion", "faq")) {
    const acc = accordion(node);
    if ((acc.settings.tabs as unknown[])?.length) return acc;
  }
  if (hasClass(node, "tabs", "tab-wrapper", "tabbed")) return tabs(node);
  if (!isMultiGroup && hasClass(node, "counter", "stat", "stats", "countup")) return counter(node);
  if (!isMultiGroup && hasClass(node, "testimonial", "review", "quote-card")) return testimonial(node);
  if (!isMultiGroup && hasClass(node, "image-box", "img-box")) return imageBox(node);
  if (!isMultiGroup && hasClass(node, "icon-box", "feature-box", "feature-card", "service-box")) return iconBox(node);

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
      const items = iconTextItems.map((c) => {
        const iconNode = findNode(c, (n) => n.tag === "i" || n.tag === "svg" || hasClass(n, "icon", "fa"));
        const text = textContent(c);
        return {
          _id: genId(),
          text,
          selected_icon: iconNode
            ? resolveIconValue(iconNode, text)
            : (keywordIconToken(text.toLowerCase())
                ? { value: `fas ${keywordIconToken(text.toLowerCase())}`, library: "fa-solid" }
                : { value: "fas fa-check", library: "fa-solid" }),
        };

      });
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
  if (!isMultiGroup && (hasClass(node, "card", "box", "tile", "feature", "service", "item") || (hasText && (directImg || iconNode)))) {
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
  const style = resolveNodeStyle(node);
  const displayGrid = /display\s*:\s*grid/.test(style);
  const displayFlex = /display\s*:\s*flex/.test(style);
  const flexRow = displayFlex && !/flex-direction\s*:\s*column/.test(style);
  // Prefer explicit CSS `display` (matches the publish engine) and fall back to
  // framework class hints so preview parity holds either way.
  if (displayGrid || (node && hasClass(node, "grid", "services", "features", "team", "pricing", "cards"))) {
    // Native Elementor Grid Container (responsive, mobile-optimized).
    settings.container_type = "grid";
    const colsMatch = style.match(/grid-template-columns\s*:\s*([^;]+)/);
    const colCount = colsMatch ? countGridColumns(colsMatch[1]) : 3;
    settings.grid_columns = { unit: "fr", size: colCount || 3, sizes: [] };
    settings.grid_columns_tablet = { unit: "fr", size: 2, sizes: [] };
    settings.grid_columns_mobile = { unit: "fr", size: 1, sizes: [] };
    // Force a single explicit grid row (+ auto-flow) so Elementor doesn't reserve
    // its default empty 2nd row, which was producing large blank white space.
    // Overflowing items wrap into implicit rows sized to their content.
    settings.grid_rows_grid = { unit: "fr", size: 1, sizes: [] };
    settings.grid_auto_flow = "row";
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
    } else if (detectForm(node)) {
      flush();
      out.push(detectForm(node)!);
    } else if (detectRating(node)) {
      flush();
      out.push(detectRating(node)!);
    } else if (detectProgressBar(node)) {
      flush();
      out.push(detectProgressBar(node)!);
    } else if (detectSpacer(node)) {
      flush();
      out.push(detectSpacer(node)!);
    } else if (CONTAINER_TAGS.has(node.tag)) {
      flush();
      const social = detectSocialIcons(node);
      if (social) {
        out.push(social);
      } else {
        const inner = convertChildren(node.children);
        if (inner.length > 0) out.push(container(inner, node));
      }
    } else if (TEXT_TAGS.has(node.tag) || node.tag === "a") {
      const social = (node.tag === "ul" || node.tag === "ol") ? detectSocialIcons(node) : null;
      if (social) {
        flush();
        out.push(social);
      } else {
        // Inline/textual content -> accumulate as rich text editor block.
        textBuffer += serialize(node);
      }
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

export interface HtmlToElementorOptions {
  /** Enable Elementor Pro-only widgets (form, rating). Requires Pro on the target site. */
  proWidgets?: boolean;
}

export function htmlToElementor(html: string, options?: HtmlToElementorOptions): ElementorElement[] {
  PRO_WIDGETS = options?.proWidgets === true;
  CSS_CLASS_STYLES = parseStylesheetLayout(html || "");
  try {
    const tree = parseHtml(html || "");
    const converted = convertChildren(tree);
    return sanitizeElementorTree(flattenSections(converted));
  } finally {
    PRO_WIDGETS = false;
    CSS_CLASS_STYLES = new Map();
  }
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

/**
 * Collect `@import` rules declared inside <style> blocks so they can be hoisted
 * to a leading block (an out-of-order @import is silently ignored by browsers).
 */
function collectInlineImports(html: string, seen: Set<string>): string[] {
  const imports: string[] = [];
  const styleRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let block: RegExpExecArray | null;
  const importRe = /@import\s+(?:url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"]+))\s*\)|(?:"([^"]*)"|'([^']*)'))([^;]*);/gi;
  while ((block = styleRe.exec(html)) !== null) {
    const css = block[1] || "";
    let im: RegExpExecArray | null;
    while ((im = importRe.exec(css)) !== null) {
      let url = (im[1] ?? im[2] ?? im[3] ?? im[4] ?? im[5] ?? "").trim();
      const media = (im[6] || "").trim();
      if (!url) continue;
      if (url.startsWith("//")) url = "https:" + url;
      const key = url + "|" + media;
      if (seen.has(key)) continue;
      seen.add(key);
      imports.push(`@import url("${url}")${media ? " " + media : ""};`);
    }
  }
  return imports;
}

function stripImports(css: string): string {
  return css.replace(/@import\s+[^;]+;/gi, "");
}

export function extractRenderableHtml(html: string): string {
  const input = html || "";
  const seen = new Set<string>();
  const linkImports = extractStylesheetImports(input);
  const linkImportUrls = [...linkImports.matchAll(/@import url\("([^"]*)"\)/g)].map((mm) => mm[1]);
  for (const u of linkImportUrls) seen.add(u + "|");
  const inlineImports = collectInlineImports(input, seen);
  const allImportRules = [
    ...linkImportUrls.map((u) => `@import url("${u}");`),
    ...inlineImports,
  ];
  const importBlock = allImportRules.length ? `<style data-xxxv-imports>\n${allImportRules.join("\n")}\n</style>` : "";
  const styleBlocks = (input.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi) || []).map((tag) => {
    const mm = tag.match(/<style\b([^>]*)>([\s\S]*?)<\/style>/i);
    if (!mm) return tag;
    return `<style${mm[1] || ""}>${stripImports(mm[2] || "")}</style>`;
  });
  const styles = [importBlock, ...styleBlocks].filter(Boolean).join("\n");
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

/**
 * Enforce an Elementor-style fixed content width on a native `_elementor_data`
 * tree. Each top-level section stays full-width (backgrounds edge-to-edge) while
 * its content is wrapped in a centered "boxed" inner container of the given pixel
 * width — exactly how Elementor's boxed containers behave. Idempotent and a no-op
 * when `widthPx <= 0`. Kept in sync with the edge-function engine copy.
 */
export type BoxContentOptions = {
  /** Desktop boxed content width in px (required, > 0). */
  width: number;
  /** Tablet content width in px, or null/0 to stay fluid (100%). */
  widthTablet?: number | null;
  /** Mobile content width in px, or null/0 to stay fluid (100%). */
  widthMobile?: number | null;
  /** Horizontal gutter (px) inside the boxed container per breakpoint. */
  gutterDesktop?: number | null;
  gutterTablet?: number | null;
  gutterMobile?: number | null;
};

export function enforceBoxedContentWidth(
  dataStr: string,
  widthOrOpts: number | BoxContentOptions,
): string {
  const opts: BoxContentOptions =
    typeof widthOrOpts === "number" ? { width: widthOrOpts } : widthOrOpts;
  if (!dataStr || !opts || !Number.isFinite(opts.width) || opts.width <= 0) return dataStr;
  let tree: ElementorElement[];
  try {
    tree = JSON.parse(dataStr);
  } catch {
    return dataStr;
  }
  if (!Array.isArray(tree) || tree.length === 0) return dataStr;

  const px = (n: number) => ({ unit: "px", size: Math.round(n), sizes: [] });
  const fluidDim = { unit: "%", size: 100, sizes: [] };
  const gutter = (n: number) => ({
    unit: "px",
    top: "0",
    right: String(Math.max(Math.round(n), 0)),
    bottom: "0",
    left: String(Math.max(Math.round(n), 0)),
    isLinked: false,
  });

  const boxedDim = px(opts.width);
  // Fixed px on desktop; per-breakpoint px if provided, else fluid (100%).
  const tabletDim = opts.widthTablet && opts.widthTablet > 0 ? px(opts.widthTablet) : fluidDim;
  const mobileDim = opts.widthMobile && opts.widthMobile > 0 ? px(opts.widthMobile) : fluidDim;
  // Centered inner box (matches Elementor's boxed container: fixed width + auto margins).
  const marginAuto = { unit: "px", top: "0", right: "auto", bottom: "0", left: "auto", isLinked: false };
  const zeroPad = { unit: "px", top: "0", right: "0", bottom: "0", left: "0", isLinked: false };
  // Editable responsive gutters so content never touches the screen edge.
  const padDesktop = gutter(opts.gutterDesktop ?? 0);
  const padTablet = gutter(opts.gutterTablet ?? 20);
  const padMobile = gutter(opts.gutterMobile ?? 16);
  // Settings applied to the inner boxed container.
  const boxedSettings = {
    content_width: "boxed",
    width: boxedDim,
    width_tablet: tabletDim,
    width_mobile: mobileDim,
    boxed_width: boxedDim,
    margin: marginAuto,
    padding: padDesktop,
    padding_tablet: padTablet,
    padding_mobile: padMobile,
  };
  // Settings applied to full-width section bands / wrappers.
  const fullSettings = { content_width: "full", width: "100%", padding: zeroPad };

  const isBoxed = (el: ElementorElement): boolean =>
    el?.elType === "container" &&
    (el.settings as Record<string, unknown>)?.content_width === "boxed" &&
    (el.settings as Record<string, unknown>)?.width !== undefined &&
    (el.settings as Record<string, unknown>)?.width !== "";

  // A container carries its own background band and must stay FULL width so the
  // background bleeds edge-to-edge.
  const hasBackground = (el: ElementorElement): boolean => {
    const s = (el?.settings as Record<string, unknown>) || {};
    return (
      !!s.background_background ||
      !!s.background_color ||
      !!s.background_image ||
      !!s.background_gradient_color ||
      !!(s as Record<string, unknown>).__xxxv_background
    );
  };

  const rescale = (el: ElementorElement) => {
    el.settings = { ...el.settings, ...boxedSettings };
  };

  // Box a leaf SECTION band: keep the band full width (backgrounds stay
  // edge-to-edge) and constrain its content to the target width.
  const boxSection = (section: ElementorElement) => {
    const kids = Array.isArray(section.elements) ? section.elements : [];
    section.settings = { ...section.settings, ...fullSettings, flex_align_items: "center" };
    if (kids.length === 0) return;

    const boxedKids = kids.filter(isBoxed);
    if (boxedKids.length) {
      boxedKids.forEach(rescale);
      return;
    }

    if (kids.length === 1 && (kids[0].settings as Record<string, unknown>)?._xxxvBoxed === true) {
      rescale(kids[0]);
      return;
    }

    const inner: ElementorElement = {
      id: genId(),
      elType: "container",
      settings: {
        ...boxedSettings,
        flex_direction: (section.settings as Record<string, unknown>)?.flex_direction ?? "column",
        _xxxvBoxed: true,
      },
      elements: kids,
    };
    section.elements = [inner];
  };

  // Wrapper vs. section-band detection (see edge-function copy for rationale):
  // a shell around a single full-width background section must recurse, not box.
  const process = (el: ElementorElement) => {
    if (!el || el.elType !== "container") return;
    const kids = el.elements || [];
    const childContainers = kids.filter((c) => c?.elType === "container");
    const hasDirectWidget = kids.some((c) => c?.elType === "widget");
    const wrapsBackgroundSection =
      childContainers.length >= 1 && childContainers.some(hasBackground) && !hasDirectWidget;
    if (childContainers.length >= 2 || wrapsBackgroundSection) {
      el.settings = { ...el.settings, ...fullSettings };
      for (const c of el.elements) process(c);
    } else {
      boxSection(el);
    }
  };

  for (const top of tree) process(top);
  return JSON.stringify(tree);
}

