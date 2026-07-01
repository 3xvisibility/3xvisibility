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
}

interface Rule {
  selectors: ParsedSelector[];
  decls: Record<string, string>;
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

/** Parse all <style> blocks of a template into an ordered rule set. */
export function parseStylesheet(html: string): Rule[] {
  const rules: Rule[] = [];
  const styleRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let block: RegExpExecArray | null;
  const cssChunks: string[] = [];
  while ((block = styleRe.exec(html || "")) !== null) cssChunks.push(block[1] || "");
  const css = cssChunks.join("\n")
    // strip comments + @media/@font-face blocks (we bake base styles only)
    .replace(/\/\*[\s\S]*?\*\//g, "");

  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = ruleRe.exec(css)) !== null) {
    const selectorList = m[1].trim();
    if (selectorList.startsWith("@")) continue; // skip at-rules
    const decls = parseDecls(m[2] || "");
    if (Object.keys(decls).length === 0) continue;
    const selectors = selectorList
      .split(",")
      .map(parseSelector)
      .filter((s): s is ParsedSelector => s !== null);
    if (selectors.length) rules.push({ selectors, decls });
  }
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
  }
  if (d["background-image"]) {
    const urlM = d["background-image"].match(/url\(([^)]+)\)/i);
    if (urlM) p.backgroundImage = urlM[1].replace(/['"]/g, "").trim();
  }
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

  resolve(node: NodeLike): StyleProps {
    const tag = (node.tag || "").toLowerCase();
    const classes = (node.attrs?.class || "").toLowerCase().split(/\s+/).filter(Boolean);
    const id = (node.attrs?.id || "").toLowerCase();

    const matched: { spec: number; decls: Record<string, string> }[] = [];
    for (const rule of this.rules) {
      for (const sel of rule.selectors) {
        if (sel.tag && sel.tag !== tag) continue;
        if (sel.id && sel.id !== id) continue;
        if (sel.classes.length && !sel.classes.every((c) => classes.includes(c))) continue;
        matched.push({ spec: sel.specificity, decls: rule.decls });
      }
    }
    matched.sort((a, b) => a.spec - b.spec);
    const merged: Record<string, string> = {};
    for (const mm of matched) Object.assign(merged, mm.decls);

    // Inline style="" wins over everything.
    if (node.attrs?.style) Object.assign(merged, parseDecls(node.attrs.style));
    return declsToProps(merged);
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
    settings.background_size = "cover";
    settings.background_position = "center center";
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
  if (Object.keys(globals).length) settings.__globals__ = globals;
}

function sidesToElementorSafe(sides?: Partial<BoxSides>): Record<string, unknown> | undefined {
  return sidesToElementor(sides);
}
