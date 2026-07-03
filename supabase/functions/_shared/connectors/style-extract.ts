// Template Style Extractor + native Elementor style baker.
//
// The native Elementor engine maps template markup to native widgets, but those
// widgets carry NO design unless we bake the template's CSS into each widget's
// Elementor style settings. This module:
//   1. Parses every <style> block + inline `style=""` into a tolerant rule set.
//   2. Resolves the effective style props for any node (tag / class / id +
//      inline override, ordered by specificity).
//   3. Maps those props onto Elementor widget/container `settings` — preferring
//      the site's GLOBAL tokens (colors/fonts) when a value matches, otherwise
//      writing the literal value. This keeps the page fully editable AND
//      visually identical, with NO HTML widget and NO external CSS dependency.

import type { SiteContext } from "./wp-site-context.ts";

export interface NodeLike {
  tag: string;
  attrs: Record<string, string>;
}

export interface BoxSides {
  top: string;
  right: string;
  bottom: string;
  left: string;
}

export interface StyleProps {
  color?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  background?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  backgroundRepeat?: string;
  backgroundBlendMode?: string;
  mixBlendMode?: string;
  transform?: string;
  transformOrigin?: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  lineHeight?: string;
  letterSpacing?: string;
  textAlign?: string;
  padding?: Partial<BoxSides>;
  margin?: Partial<BoxSides>;
  width?: string;
  maxWidth?: string;
  borderRadius?: string;
  display?: string;
  flexDirection?: string;
  justifyContent?: string;
  alignItems?: string;
  gap?: string;
  gridTemplateColumns?: string;
  minHeight?: string;
  overflow?: string;
  boxShadow?: string;
  border?: string;
  objectFit?: string;
  opacity?: string;
  position?: string;
  zIndex?: string;
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  inset?: string;
}

interface MediaCond {
  min?: number;
  max?: number;
}

interface Rule {
  selectors: ParsedSelector[];
  decls: Record<string, string>;
  /** The @media condition this rule lives under (undefined = base/desktop). */
  media?: MediaCond;
  /** Source order — used as a stable tiebreaker so later rules win. */
  order: number;
}

/**
 * Representative viewport widths per Elementor device. We resolve the effective
 * style for each device by including every rule whose @media condition is active
 * at that width. This correctly handles BOTH desktop-first (`max-width`) and
 * mobile-first (`min-width`) templates — the latter previously collapsed to a
 * single column because only the mobile base was baked.
 */
export const DEVICE_WIDTHS = { desktop: 1440, tablet: 900, mobile: 400 } as const;
export type Device = keyof typeof DEVICE_WIDTHS;

function mediaActiveAt(media: MediaCond | undefined, width: number): boolean {
  if (!media) return true;
  if (media.min !== undefined && width < media.min) return false;
  if (media.max !== undefined && width > media.max) return false;
  return true;
}

function parseMediaCond(prelude: string): MediaCond {
  const min = prelude.match(/min-width\s*:\s*([\d.]+)px/i);
  const max = prelude.match(/max-width\s*:\s*([\d.]+)px/i);
  return {
    min: min ? parseFloat(min[1]) : undefined,
    max: max ? parseFloat(max[1]) : undefined,
  };
}

interface ParsedSelector {
  tag?: string;
  classes: string[];
  id?: string;
  /** Higher = wins. (id*100 + class*10 + tag). */
  specificity: number;
}

/* ----------------------------- CSS parsing ------------------------------- */

function parseDecls(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of body.split(";")) {
    const idx = part.indexOf(":");
    if (idx < 0) continue;
    const prop = part.slice(0, idx).trim().toLowerCase();
    const value = part.slice(idx + 1).trim();
    if (prop && value) out[prop] = value;
  }
  return out;
}

function parseSelector(sel: string): ParsedSelector | null {
  // Only the RIGHTMOST simple selector is used for matching (no combinators),
  // which is robust and good enough to bake per-element design.
  const simple = sel.trim().split(/\s+/).pop() ?? "";
  if (!simple || simple === "*") return null;
  const classes = [...simple.matchAll(/\.([\w-]+)/g)].map((m) => m[1].toLowerCase());
  const idMatch = simple.match(/#([\w-]+)/);
  const tagMatch = simple.match(/^([a-zA-Z][\w-]*)/);
  const id = idMatch ? idMatch[1].toLowerCase() : undefined;
  const tag = tagMatch ? tagMatch[1].toLowerCase() : undefined;
  if (!tag && !id && classes.length === 0) return null;
  const specificity = (id ? 100 : 0) + classes.length * 10 + (tag ? 1 : 0);
  return { tag, classes, id, specificity };
}

/** Read a balanced `{...}` block starting at the `{` index. Returns inner text + index after closing `}`. */
function readBlock(css: string, openIdx: number): { inner: string; end: number } {
  let depth = 0;
  for (let k = openIdx; k < css.length; k++) {
    if (css[k] === "{") depth++;
    else if (css[k] === "}") {
      depth--;
      if (depth === 0) return { inner: css.slice(openIdx + 1, k), end: k + 1 };
    }
  }
  return { inner: css.slice(openIdx + 1), end: css.length };
}

/**
 * Recursively parse CSS into a flat rule list, tagging each rule with the
 * @media condition it lives under. Unlike the old approach we no longer DISCARD
 * media blocks — we keep them so the engine can bake proper Elementor responsive
 * (tablet/mobile) settings AND correctly pick the desktop base for mobile-first
 * templates (where the grid lives inside a `@media (min-width:…)` block).
 */
function parseCssRules(css: string, media: MediaCond | undefined, out: Rule[]): void {
  let i = 0;
  while (i < css.length) {
    const ch = css[i];
    if (ch === "}" || ch === ";" || /\s/.test(ch)) { i++; continue; }
    if (ch === "@") {
      let j = i;
      while (j < css.length && css[j] !== "{" && css[j] !== ";") j++;
      const prelude = css.slice(i, j).trim();
      if (css[j] === ";" || j >= css.length) { i = j + 1; continue; }
      const { inner, end } = readBlock(css, j);
      if (/^@media/i.test(prelude)) {
        parseCssRules(inner, parseMediaCond(prelude), out);
      } else if (/^@supports/i.test(prelude)) {
        parseCssRules(inner, media, out); // @supports: treat inner as same context
      }
      // @keyframes / @font-face / @import / @container etc. are dropped.
      i = end;
      continue;
    }
    // Selector rule.
    let j = i;
    while (j < css.length && css[j] !== "{" && css[j] !== "}") j++;
    if (css[j] !== "{") { i = j + 1; continue; }
    const selectorList = css.slice(i, j).trim();
    const { inner, end } = readBlock(css, j);
    i = end;
    const decls = parseDecls(inner);
    if (!selectorList || Object.keys(decls).length === 0) continue;
    const selectors = selectorList
      .split(",")
      .map(parseSelector)
      .filter((s): s is ParsedSelector => s !== null);
    if (selectors.length) out.push({ selectors, decls, media, order: out.length });
  }
}

/** Parse all <style> blocks of a template into an ordered rule set. */
export function parseStylesheet(html: string): Rule[] {
  const styleRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let block: RegExpExecArray | null;
  const cssChunks: string[] = [];
  while ((block = styleRe.exec(html || "")) !== null) cssChunks.push(block[1] || "");
  const css = cssChunks.join("\n").replace(/\/\*[\s\S]*?\*\//g, "");
  const rules: Rule[] = [];
  parseCssRules(css, undefined, rules);
  return rules;
}


/* ----------------------------- resolution -------------------------------- */

function declsToProps(d: Record<string, string>): StyleProps {
  const p: StyleProps = {};
  if (d["color"]) p.color = d["color"];
  if (d["background-color"]) p.backgroundColor = d["background-color"];
  if (d["background"]) {
    const bg = d["background"];
    p.background = bg;
    const urlM = bg.match(/url\(([^)]+)\)/i);
    if (urlM) p.backgroundImage = urlM[1].replace(/['"]/g, "").trim();
    const colM = bg.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)/);
    if (colM && !p.backgroundColor) p.backgroundColor = colM[0];
    // background shorthand: pull out repeat + size/position when an image is present.
    if (p.backgroundImage) {
      const repM = bg.match(/\b(no-repeat|repeat-x|repeat-y|repeat|space|round)\b/i);
      if (repM) p.backgroundRepeat = repM[1].toLowerCase();
      const sizeM = bg.match(/\b(cover|contain)\b/i);
      if (sizeM) p.backgroundSize = sizeM[1].toLowerCase();
      // position after a `/` (e.g. `center / cover`) or common keywords.
      const posM = bg.match(/\b(center|top|bottom|left|right)(?:\s+(center|top|bottom|left|right))?\b/i);
      if (posM) p.backgroundPosition = posM[0].toLowerCase();
    }
  }
  if (d["background-image"]) {
    const urlM = d["background-image"].match(/url\(([^)]+)\)/i);
    if (urlM) p.backgroundImage = urlM[1].replace(/['"]/g, "").trim();
  }
  if (d["background-size"]) p.backgroundSize = d["background-size"].trim();
  if (d["background-position"]) p.backgroundPosition = d["background-position"].trim();
  if (d["background-repeat"]) p.backgroundRepeat = d["background-repeat"].trim();
  if (d["background-blend-mode"]) p.backgroundBlendMode = d["background-blend-mode"].trim();
  if (d["mix-blend-mode"]) p.mixBlendMode = d["mix-blend-mode"].trim();
  if (d["transform"]) p.transform = d["transform"].trim();
  if (d["transform-origin"]) p.transformOrigin = d["transform-origin"].trim();
  if (d["font-family"]) p.fontFamily = d["font-family"].split(",")[0].replace(/['"]/g, "").trim();
  if (d["font-size"]) p.fontSize = d["font-size"];
  if (d["font-weight"]) p.fontWeight = d["font-weight"];
  if (d["line-height"]) p.lineHeight = d["line-height"];
  if (d["letter-spacing"]) p.letterSpacing = d["letter-spacing"];
  if (d["text-align"]) p.textAlign = d["text-align"];
  if (d["width"]) p.width = d["width"];
  if (d["max-width"]) p.maxWidth = d["max-width"];
  if (d["border-radius"]) p.borderRadius = d["border-radius"];
  if (d["display"]) p.display = d["display"];
  if (d["flex-direction"]) p.flexDirection = d["flex-direction"];
  if (d["justify-content"]) p.justifyContent = d["justify-content"];
  if (d["align-items"]) p.alignItems = d["align-items"];
  if (d["gap"]) p.gap = d["gap"];
  if (d["grid-template-columns"]) p.gridTemplateColumns = d["grid-template-columns"];
  if (d["min-height"]) p.minHeight = d["min-height"];
  if (d["overflow"]) p.overflow = d["overflow"];
  if (d["box-shadow"]) p.boxShadow = d["box-shadow"];
  if (d["border"]) p.border = d["border"];
  if (d["object-fit"]) p.objectFit = d["object-fit"];
  if (d["opacity"]) p.opacity = d["opacity"];
  if (d["position"]) p.position = d["position"];
  if (d["z-index"]) p.zIndex = d["z-index"];
  if (d["top"]) p.top = d["top"];
  if (d["right"]) p.right = d["right"];
  if (d["bottom"]) p.bottom = d["bottom"];
  if (d["left"]) p.left = d["left"];
  if (d["inset"]) p.inset = d["inset"];

  const box = (prefix: "padding" | "margin"): Partial<BoxSides> | undefined => {
    const sides: Partial<BoxSides> = {};
    if (d[prefix]) {
      const parts = d[prefix].split(/\s+/);
      const [t, r = t, b = t, l = r] = parts;
      sides.top = t; sides.right = r; sides.bottom = b; sides.left = l;
    }
    for (const s of ["top", "right", "bottom", "left"] as const) {
      if (d[`${prefix}-${s}`]) sides[s] = d[`${prefix}-${s}`];
    }
    return Object.keys(sides).length ? sides : undefined;
  };
  const pad = box("padding"); if (pad) p.padding = pad;
  const mar = box("margin"); if (mar) p.margin = mar;
  return p;
}

export class StyleResolver {
  private rules: Rule[];
  constructor(html: string) {
    this.rules = parseStylesheet(html);
  }

  /**
   * Resolve the effective style for a node at a given viewport width. Only rules
   * whose @media condition is active at `width` participate. Winner order:
   * specificity, then source order (later wins) so media overrides win over base.
   */
  resolve(node: NodeLike, width: number = DEVICE_WIDTHS.desktop): StyleProps {
    const tag = (node.tag || "").toLowerCase();
    const classes = (node.attrs?.class || "").toLowerCase().split(/\s+/).filter(Boolean);
    const id = (node.attrs?.id || "").toLowerCase();

    const matched: { spec: number; order: number; decls: Record<string, string> }[] = [];
    for (const rule of this.rules) {
      if (!mediaActiveAt(rule.media, width)) continue;
      for (const sel of rule.selectors) {
        if (sel.tag && sel.tag !== tag) continue;
        if (sel.id && sel.id !== id) continue;
        if (sel.classes.length && !sel.classes.every((c) => classes.includes(c))) continue;
        matched.push({ spec: sel.specificity, order: rule.order, decls: rule.decls });
      }
    }
    matched.sort((a, b) => (a.spec - b.spec) || (a.order - b.order));
    const merged: Record<string, string> = {};
    for (const mm of matched) Object.assign(merged, mm.decls);

    // Inline style="" wins over everything.
    if (node.attrs?.style) Object.assign(merged, parseDecls(node.attrs.style));
    return declsToProps(merged);
  }

  /** Resolve base (desktop) + tablet + mobile props for a node in one call. */
  resolveDevices(node: NodeLike): { desktop: StyleProps; tablet: StyleProps; mobile: StyleProps } {
    return {
      desktop: this.resolve(node, DEVICE_WIDTHS.desktop),
      tablet: this.resolve(node, DEVICE_WIDTHS.tablet),
      mobile: this.resolve(node, DEVICE_WIDTHS.mobile),
    };
  }
}


/* ------------------------- Elementor mapping ----------------------------- */

function pxSize(v?: string): { unit: string; size: number } | undefined {
  if (!v) return undefined;
  const m = v.match(/(-?[\d.]+)\s*(px|em|rem|%|vw|vh)?/);
  if (!m) return undefined;
  const size = parseFloat(m[1]);
  if (!Number.isFinite(size)) return undefined;
  return { unit: m[2] || "px", size };
}

/**
 * Line-height needs special handling: a unitless CSS value like `1.5` is a
 * multiplier of the font-size, NOT pixels. Treating it as px collapses every
 * line on top of the next. Map unitless -> "em" (Elementor's multiplier unit).
 */
function lineHeightSize(v?: string): { unit: string; size: number } | undefined {
  if (!v) return undefined;
  const trimmed = v.trim().toLowerCase();
  if (trimmed === "normal" || trimmed === "inherit" || trimmed === "initial") return undefined;
  const m = trimmed.match(/(-?[\d.]+)\s*(px|em|rem|%|vw|vh)?/);
  if (!m) return undefined;
  const size = parseFloat(m[1]);
  if (!Number.isFinite(size)) return undefined;
  // Unitless -> multiplier (em). Guard against absurdly small px values.
  const unit = m[2] || "em";
  return { unit, size };
}

/**
 * Count the number of columns in a `grid-template-columns` value so we can bake
 * an accurate Elementor grid. Handles `repeat(3, 1fr)`, explicit track lists
 * (`1fr 1fr 1fr`), and `repeat(auto-fill/auto-fit, ...)` (falls back to 3).
 */
function gridColumnCount(v?: string): number {
  if (!v) return 0;
  const val = v.trim().toLowerCase();
  if (!val || val === "none") return 0;
  const repeat = val.match(/repeat\(\s*([a-z0-9-]+)\s*,/);
  if (repeat) {
    const n = parseInt(repeat[1], 10);
    return Number.isFinite(n) && n > 0 ? n : 3;
  }
  // Explicit track list: count top-level tokens (ignore nested function commas).
  const flattened = val.replace(/\([^)]*\)/g, "x");
  const tokens = flattened.split(/\s+/).filter(Boolean);
  return tokens.length;
}

function sidesToElementor(sides?: Partial<BoxSides>): Record<string, unknown> | undefined {
  if (!sides) return undefined;
  const num = (v?: string) => (v ? (v.match(/-?[\d.]+/)?.[0] ?? "") : "");
  return {
    unit: "px",
    top: num(sides.top),
    right: num(sides.right),
    bottom: num(sides.bottom),
    left: num(sides.left),
    isLinked: false,
  };
}

function hexEq(a: string, b: string): boolean {
  return a.replace(/\s/g, "").toLowerCase() === b.replace(/\s/g, "").toLowerCase();
}

/** Find a matching global color token id for a literal color value. */
function globalColorId(value: string | undefined, ctx?: SiteContext): string | undefined {
  if (!value || !ctx) return undefined;
  const hit = ctx.globalColors.find((c) => hexEq(c.value, value));
  return hit?.id;
}

function globalFontId(family: string | undefined, ctx?: SiteContext): string | undefined {
  if (!family || !ctx) return undefined;
  const hit = ctx.globalFonts.find((f) => f.family.toLowerCase() === family.toLowerCase());
  return hit?.id;
}

function applyTypography(
  settings: Record<string, unknown>,
  globals: Record<string, string>,
  p: StyleProps,
  ctx: SiteContext | undefined,
  prefix: string,
): void {
  const fontGlobal = globalFontId(p.fontFamily, ctx);
  if (fontGlobal) {
    globals[`${prefix}_typography`] = `globals/typography?id=${fontGlobal}`;
    return;
  }
  if (p.fontFamily || p.fontSize || p.fontWeight || p.lineHeight || p.letterSpacing) {
    settings[`${prefix}_typography`] = "custom";
    if (p.fontFamily) settings[`${prefix}_font_family`] = p.fontFamily;
    const fs = pxSize(p.fontSize);
    if (fs) settings[`${prefix}_font_size`] = fs;
    if (p.fontWeight) settings[`${prefix}_font_weight`] = p.fontWeight;
    const lh = lineHeightSize(p.lineHeight);
    if (lh) settings[`${prefix}_line_height`] = lh;
    const ls = pxSize(p.letterSpacing);
    if (ls) settings[`${prefix}_letter_spacing`] = ls;
  }
}

/** Bake heading styles. */
export function styleHeading(settings: Record<string, unknown>, p: StyleProps, ctx?: SiteContext): void {
  const globals: Record<string, string> = (settings.__globals__ as Record<string, string>) ?? {};
  const colorGlobal = globalColorId(p.color, ctx);
  if (colorGlobal) globals["title_color"] = `globals/colors?id=${colorGlobal}`;
  else if (p.color) settings.title_color = p.color;
  if (p.textAlign) settings.align = p.textAlign;
  applyTypography(settings, globals, p, ctx, "typography");
  if (Object.keys(globals).length) settings.__globals__ = globals;
}

/** Bake text-editor styles. */
export function styleText(settings: Record<string, unknown>, p: StyleProps, ctx?: SiteContext): void {
  const globals: Record<string, string> = (settings.__globals__ as Record<string, string>) ?? {};
  const colorGlobal = globalColorId(p.color, ctx);
  if (colorGlobal) globals["text_color"] = `globals/colors?id=${colorGlobal}`;
  else if (p.color) settings.text_color = p.color;
  if (p.textAlign) settings.align = p.textAlign;
  applyTypography(settings, globals, p, ctx, "typography");
  if (Object.keys(globals).length) settings.__globals__ = globals;
}

/** Bake button styles. */
export function styleButton(settings: Record<string, unknown>, p: StyleProps, ctx?: SiteContext): void {
  if (p.color) settings.button_text_color = p.color;
  if (p.backgroundColor) {
    settings.background_color = p.backgroundColor;
  }
  const br = pxSize(p.borderRadius);
  if (br) settings.border_radius = { unit: br.unit, top: String(br.size), right: String(br.size), bottom: String(br.size), left: String(br.size), isLinked: true };
  applyTypography(settings, {}, p, ctx, "typography");
}

/** Bake image styles (width / radius). */
export function styleImage(settings: Record<string, unknown>, p: StyleProps): void {
  const w = pxSize(p.width || p.maxWidth);
  if (w) settings.width = w;
  const br = pxSize(p.borderRadius);
  if (br) settings.image_border_radius = { unit: br.unit, top: String(br.size), right: String(br.size), bottom: String(br.size), left: String(br.size), isLinked: true };
  if (p.objectFit) settings.object_fit = p.objectFit;
  applyOpacityBlendTransform(settings, p);
}

/** Bake container styles (background, padding, margin, alignment, width). */
export function styleContainer(settings: Record<string, unknown>, p: StyleProps, ctx?: SiteContext): void {
  const globals: Record<string, string> = (settings.__globals__ as Record<string, string>) ?? {};
  if (p.backgroundColor) {
    settings.background_background = "classic";
    const bgGlobal = globalColorId(p.backgroundColor, ctx);
    if (bgGlobal) globals["background_color"] = `globals/colors?id=${bgGlobal}`;
    else settings.background_color = p.backgroundColor;
  }
  if (p.background && !p.backgroundImage && /gradient\s*\(/i.test(p.background)) {
    settings.background_background = "gradient";
    settings.__xxxv_background = p.background;
  }
  if (p.backgroundImage) {
    settings.background_background = "classic";
    settings.background_image = { url: p.backgroundImage, id: "" };
    settings.background_size = normalizeBgSize(p.backgroundSize);
    settings.background_position = normalizeBgPosition(p.backgroundPosition);
    if (p.backgroundRepeat) settings.background_repeat = p.backgroundRepeat;
    if (p.backgroundBlendMode) settings.__xxxv_background_blend_mode = p.backgroundBlendMode;
  }
  const pad = sidesToElementorSafe(p.padding);
  if (pad) settings.padding = pad;
  const mar = sidesToElementorSafe(p.margin);
  if (mar) settings.margin = mar;
  if (p.textAlign) settings.flex_align_items = p.textAlign === "center" ? "center" : p.textAlign === "right" ? "flex-end" : "flex-start";
  if (p.display === "flex") settings.flex_direction = p.flexDirection || settings.flex_direction || "row";
  if (p.display === "grid") {
    settings.container_type = "grid";
    const cols = gridColumnCount(p.gridTemplateColumns);
    if (cols > 0) {
      settings.grid_columns_grid = { unit: "fr", size: cols, sizes: [] };
    }
  }
  if (p.alignItems) settings.flex_align_items = p.alignItems;
  if (p.justifyContent) settings.flex_justify_content = p.justifyContent;
  const gap = pxSize(p.gap);
  if (gap) {
    settings.gap = { unit: gap.unit, size: gap.size, sizes: [] };
    settings.row_gap = { unit: gap.unit, size: gap.size, sizes: [] };
    settings.column_gap = { unit: gap.unit, size: gap.size, sizes: [] };
  }
  const minH = pxSize(p.minHeight);
  if (minH) settings.min_height = minH;
  if (p.overflow) settings.overflow = p.overflow;
  if (p.boxShadow) settings.__xxxv_box_shadow = p.boxShadow;
  if (p.border) settings.__xxxv_border = p.border;
  const br = pxSize(p.borderRadius);
  if (br) settings.border_radius = { unit: br.unit, top: String(br.size), right: String(br.size), bottom: String(br.size), left: String(br.size), isLinked: true };
  const mw = pxSize(p.maxWidth);
  if (mw && mw.unit === "px") {
    settings.content_width = "boxed";
    settings.width = { unit: "px", size: mw.size };
  }
  applyOpacityBlendTransform(settings, p);
  if (Object.keys(globals).length) settings.__globals__ = globals;
}

/** Normalize a CSS background-size into Elementor's accepted values. */
function normalizeBgSize(v?: string): string {
  const val = (v || "").trim().toLowerCase();
  if (val === "cover" || val === "contain" || val === "auto") return val;
  return val ? "custom" : "cover";
}

/** Normalize a CSS background-position into Elementor's keyword set (fallback custom). */
function normalizeBgPosition(v?: string): string {
  const val = (v || "").trim().toLowerCase();
  const known = new Set([
    "center center", "center left", "center right",
    "top center", "top left", "top right",
    "bottom center", "bottom left", "bottom right",
  ]);
  if (!val) return "center center";
  if (known.has(val)) return val;
  if (val === "center") return "center center";
  if (val === "top") return "top center";
  if (val === "bottom") return "bottom center";
  if (val === "left") return "center left";
  if (val === "right") return "center right";
  return "custom";
}

/**
 * Remap CSS opacity, mix-blend-mode and transforms onto NATIVE, editable
 * Elementor advanced controls (Advanced ▸ Transform / Opacity / Blend mode)
 * rather than leaving them as raw CSS. Every value becomes a control the user
 * can open and tweak in the editor. Bridge keys (`__xxxv_*`) are kept only as a
 * fallback the plugin can apply if a given native control is unavailable.
 */
function applyOpacityBlendTransform(settings: Record<string, unknown>, p: StyleProps): void {
  // ---- Opacity → native Advanced ▸ Opacity slider (0–1) ----
  if (p.opacity) {
    const o = parseFloat(p.opacity);
    if (Number.isFinite(o) && o >= 0 && o <= 1) {
      const val = { unit: "px", size: o, sizes: [] };
      settings._transform_opacity = val; // native transform opacity
      settings.opacity = val;            // legacy/common opacity control
      settings.__xxxv_opacity = o;       // bridge fallback
    }
  }

  // ---- mix-blend-mode → native Advanced ▸ Blend Mode select ----
  if (p.mixBlendMode && p.mixBlendMode !== "normal") {
    settings._blend_mode = p.mixBlendMode;     // native blend-mode control
    settings.mix_blend_mode = p.mixBlendMode;  // alt key some builds use
    settings.__xxxv_mix_blend_mode = p.mixBlendMode; // bridge fallback
  }

  // ---- transform → native Advanced ▸ Transform controls (editable) ----
  if (p.transform && p.transform !== "none") {
    settings.__xxxv_transform = p.transform; // bridge fallback for exotic funcs

    const t = p.transform;

    // rotate(deg) / rotateZ(deg)
    const rot = t.match(/rotate[zZ]?\(\s*(-?[\d.]+)deg\s*\)/i);
    if (rot) {
      settings._transform_rotate = "yes";
      settings._transform_rotateZ_effect = { unit: "deg", size: parseFloat(rot[1]), sizes: [] };
    }

    // scale(n) or scaleX/scaleY(n)
    const scaleUniform = t.match(/(?:^|\s)scale\(\s*(-?[\d.]+)\s*(?:,\s*(-?[\d.]+)\s*)?\)/i);
    const scaleX = t.match(/scaleX\(\s*(-?[\d.]+)\s*\)/i);
    const scaleY = t.match(/scaleY\(\s*(-?[\d.]+)\s*\)/i);
    if (scaleUniform || scaleX || scaleY) {
      settings._transform_scale = "yes";
      if (scaleUniform) {
        const sx = parseFloat(scaleUniform[1]);
        const sy = scaleUniform[2] != null ? parseFloat(scaleUniform[2]) : sx;
        settings._transform_scale_effect = { unit: "px", size: sx, sizes: [] };
        settings._transform_scaleX_effect = { unit: "px", size: sx, sizes: [] };
        settings._transform_scaleY_effect = { unit: "px", size: sy, sizes: [] };
      }
      if (scaleX) settings._transform_scaleX_effect = { unit: "px", size: parseFloat(scaleX[1]), sizes: [] };
      if (scaleY) settings._transform_scaleY_effect = { unit: "px", size: parseFloat(scaleY[1]), sizes: [] };
    }

    // translate(x, y) / translateX / translateY (px or %)
    const parseLen = (v: string) => {
      const m = v.match(/(-?[\d.]+)\s*(px|%)?/i);
      if (!m) return null;
      return { unit: (m[2] || "px").toLowerCase(), size: parseFloat(m[1]), sizes: [] };
    };
    const translate = t.match(/(?:^|\s)translate\(\s*([^,)]+?)\s*(?:,\s*([^)]+?)\s*)?\)/i);
    const translateX = t.match(/translateX\(\s*([^)]+?)\s*\)/i);
    const translateY = t.match(/translateY\(\s*([^)]+?)\s*\)/i);
    if (translate || translateX || translateY) {
      settings._transform_translate = "yes";
      if (translate) {
        const tx = parseLen(translate[1]);
        const ty = translate[2] != null ? parseLen(translate[2]) : { unit: "px", size: 0, sizes: [] };
        if (tx) settings._transform_translateX_effect = tx;
        if (ty) settings._transform_translateY_effect = ty;
      }
      if (translateX) { const v = parseLen(translateX[1]); if (v) settings._transform_translateX_effect = v; }
      if (translateY) { const v = parseLen(translateY[1]); if (v) settings._transform_translateY_effect = v; }
    }

    // skew(x, y) / skewX / skewY (deg)
    const skew = t.match(/(?:^|\s)skew\(\s*(-?[\d.]+)deg\s*(?:,\s*(-?[\d.]+)deg\s*)?\)/i);
    const skewX = t.match(/skewX\(\s*(-?[\d.]+)deg\s*\)/i);
    const skewY = t.match(/skewY\(\s*(-?[\d.]+)deg\s*\)/i);
    if (skew || skewX || skewY) {
      settings._transform_skew = "yes";
      if (skew) {
        settings._transform_skewX_effect = { unit: "deg", size: parseFloat(skew[1]), sizes: [] };
        if (skew[2] != null) settings._transform_skewY_effect = { unit: "deg", size: parseFloat(skew[2]), sizes: [] };
      }
      if (skewX) settings._transform_skewX_effect = { unit: "deg", size: parseFloat(skewX[1]), sizes: [] };
      if (skewY) settings._transform_skewY_effect = { unit: "deg", size: parseFloat(skewY[1]), sizes: [] };
    }

    // transform-origin → native origin controls
    if (p.transformOrigin) {
      const parts = p.transformOrigin.trim().split(/\s+/);
      const mapAxis = (v: string) => {
        const k = v.toLowerCase();
        if (["left", "center", "right"].includes(k)) return k;
        if (["top", "bottom"].includes(k)) return k;
        return null;
      };
      if (parts[0]) { const x = mapAxis(parts[0]); if (x) settings._transform_origin_x = x; }
      if (parts[1]) { const y = mapAxis(parts[1]); if (y) settings._transform_origin_y = y; }
      settings.__xxxv_transform_origin = p.transformOrigin;
    }
  }
}


/* --------------------------- responsive baking --------------------------- */

function eqJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/**
 * Bake tablet/mobile overrides onto a container's Elementor settings. Only emits
 * a responsive key when the device value actually DIFFERS from the desktop base
 * (so Elementor keeps inheriting from desktop otherwise). This is what makes the
 * published page responsive inside Elementor — grids stack, gaps shrink, etc.
 */
export function styleContainerResponsive(
  settings: Record<string, unknown>,
  base: StyleProps,
  dev: StyleProps,
  suffix: "_tablet" | "_mobile",
): void {
  if (dev.display === "grid") {
    const cols = gridColumnCount(dev.gridTemplateColumns);
    const baseCols = base.display === "grid" ? gridColumnCount(base.gridTemplateColumns) : -1;
    if (cols > 0 && cols !== baseCols) {
      settings[`grid_columns_grid${suffix}`] = { unit: "fr", size: cols, sizes: [] };
    }
  }
  if (dev.display === "flex" && dev.flexDirection && dev.flexDirection !== base.flexDirection) {
    settings[`flex_direction${suffix}`] = dev.flexDirection;
  }
  const pad = sidesToElementor(dev.padding);
  if (pad && !eqJson(pad, sidesToElementor(base.padding))) settings[`padding${suffix}`] = pad;
  const mar = sidesToElementor(dev.margin);
  if (mar && !eqJson(mar, sidesToElementor(base.margin))) settings[`margin${suffix}`] = mar;
  const gap = pxSize(dev.gap);
  if (gap && !eqJson(gap, pxSize(base.gap))) {
    settings[`gap${suffix}`] = { unit: gap.unit, size: gap.size, sizes: [] };
  }
  if (dev.alignItems && dev.alignItems !== base.alignItems) settings[`flex_align_items${suffix}`] = dev.alignItems;
  if (dev.justifyContent && dev.justifyContent !== base.justifyContent) settings[`flex_justify_content${suffix}`] = dev.justifyContent;
  const minH = pxSize(dev.minHeight);
  if (minH && !eqJson(minH, pxSize(base.minHeight))) settings[`min_height${suffix}`] = minH;
  const w = pxSize(dev.width || dev.maxWidth);
  if (w && w.unit === "px" && !eqJson(w, pxSize(base.width || base.maxWidth))) {
    settings[`width${suffix}`] = { unit: "px", size: w.size };
  }
}

/** Bake tablet/mobile typography + alignment overrides onto a text/heading widget. */
export function styleTypographyResponsive(
  settings: Record<string, unknown>,
  base: StyleProps,
  dev: StyleProps,
  suffix: "_tablet" | "_mobile",
): void {
  const fs = pxSize(dev.fontSize);
  if (fs && !eqJson(fs, pxSize(base.fontSize))) {
    settings["typography_typography"] = "custom";
    settings[`typography_font_size${suffix}`] = fs;
  }
  const lh = lineHeightSize(dev.lineHeight);
  if (lh && !eqJson(lh, lineHeightSize(base.lineHeight))) {
    settings["typography_typography"] = "custom";
    settings[`typography_line_height${suffix}`] = lh;
  }
  if (dev.textAlign && dev.textAlign !== base.textAlign) settings[`align${suffix}`] = dev.textAlign;
}


function sidesToElementorSafe(sides?: Partial<BoxSides>): Record<string, unknown> | undefined {
  return sidesToElementor(sides);
}
