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
  /** Optional parent link so descendant selectors can match ancestors. */
  parent?: NodeLike | null;
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
  height?: string;
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
  objectPosition?: string;
  opacity?: string;
  fill?: string;
  position?: string;
  zIndex?: string;
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  inset?: string;
  order?: string;
  transitionDuration?: string;
  transitionTimingFunction?: string;
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

interface SimpleSel {
  tag?: string;
  classes: string[];
  id?: string;
}

interface ParsedSelector {
  tag?: string;
  classes: string[];
  id?: string;
  /**
   * Ancestor compounds to the LEFT of the rightmost simple selector, in
   * document (outermost-last) order as written. Each must match some ancestor
   * of the node for the rule to apply. This makes descendant selectors like
   * `.pl-rate .avs img` only target their real subtree instead of every `img`,
   * which is the difference between a faithful clone and cross-section style
   * bleed. All combinators (` `, `>`, `+`, `~`) are treated as descendant here.
   */
  ancestors?: SimpleSel[];
  /**
   * Interactive STATE pseudo-class (hover/focus/active/…) this selector targets,
   * if any. State rules are baked as Elementor hover controls, never merged into
   * the element's base style.
   */
  state?: string;
  /** True when the selector targets a pseudo-ELEMENT (::before, ::after, …). */
  pseudoElement?: boolean;
  /** Higher = wins. (id*100 + class*10 + tag), summed across all compounds. */
  specificity: number;
}


/**
 * Pseudo-classes that represent an interactive STATE. They must not pollute the
 * element's base style (otherwise a button permanently renders in its hover
 * colour); instead they are routed to Elementor's native hover controls.
 */
const STATE_PSEUDOS = new Set([
  "hover",
  "focus",
  "active",
  "focus-visible",
  "focus-within",
  "visited",
]);


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

/** Parse one compound (no combinators) into tag/classes/id. */
function parseCompound(raw: string): SimpleSel | null {
  const simple = raw.replace(/::?[\w-]+(?:\([^)]*\))?/g, "");
  const classes = [...simple.matchAll(/\.([\w-]+)/g)].map((m) => m[1].toLowerCase());
  const idMatch = simple.match(/#([\w-]+)/);
  const tagMatch = simple.match(/^([a-zA-Z][\w-]*)/);
  const id = idMatch ? idMatch[1].toLowerCase() : undefined;
  const tag = tagMatch ? tagMatch[1].toLowerCase() : undefined;
  if (!tag && !id && classes.length === 0) return null;
  return { tag, classes, id };
}

/** Does a single compound match one ancestor descriptor? */
function simpleMatches(s: SimpleSel, a: { tag: string; classes: string[]; id: string }): boolean {
  if (s.tag && s.tag !== a.tag) return false;
  if (s.id && s.id !== a.id) return false;
  if (s.classes.length && !s.classes.every((c) => a.classes.includes(c))) return false;
  return true;
}

/**
 * Verify a selector's ancestor compounds (written outer→inner) each match some
 * ancestor of the node, in order. `ancestry` is innermost-first. All combinators
 * are treated as descendant, which is a safe superset of `>`/`+`/`~`.
 */
function ancestorsMatch(
  anc: SimpleSel[],
  ancestry: { tag: string; classes: string[]; id: string }[],
): boolean {
  const need = [...anc].reverse(); // innermost requirement first
  let ai = 0;
  for (const req of need) {
    let found = false;
    while (ai < ancestry.length) {
      const cur = ancestry[ai];
      ai++;
      if (simpleMatches(req, cur)) { found = true; break; }
    }
    if (!found) return false;
  }
  return true;
}

function compoundSpecificity(s: SimpleSel): number {
  return (s.id ? 100 : 0) + s.classes.length * 10 + (s.tag ? 1 : 0);
}

function parseSelector(sel: string): ParsedSelector | null {
  // Split into compounds, dropping combinator tokens (` `, `>`, `+`, `~`). The
  // rightmost compound is the match target; the rest are ancestor requirements.
  const tokens = sel.trim().split(/\s+/).filter((t) => t && !/^[>+~]$/.test(t));
  const simpleRaw = tokens.length ? tokens[tokens.length - 1] : "";
  if (!simpleRaw || simpleRaw === "*") return null;

  // Detect a pseudo-ELEMENT (::before / legacy :before / ::placeholder …). These
  // can't map onto a base widget control, so we tag them and exclude from base.
  const pseudoElement = /::[\w-]+|:(?:before|after|first-line|first-letter|placeholder|selection|marker|backdrop)\b/i.test(simpleRaw);

  // Detect an interactive STATE pseudo-class (the first one wins for routing).
  let state: string | undefined;
  const stateMatch = simpleRaw.match(/:([\w-]+)/g);
  if (stateMatch) {
    for (const raw of stateMatch) {
      const name = raw.replace(/^:+/, "").replace(/\(.*$/, "").toLowerCase();
      if (STATE_PSEUDOS.has(name)) { state = name; break; }
    }
  }

  const target = parseCompound(simpleRaw);
  if (!target) return null;

  // Ancestor compounds (everything left of the target), skipping ones that only
  // carry `*` or fail to parse.
  const ancestors: SimpleSel[] = [];
  for (let k = 0; k < tokens.length - 1; k++) {
    if (tokens[k] === "*") continue;
    const c = parseCompound(tokens[k]);
    if (c) ancestors.push(c);
  }

  let specificity = compoundSpecificity(target);
  for (const a of ancestors) specificity += compoundSpecificity(a);

  return {
    tag: target.tag,
    classes: target.classes,
    id: target.id,
    ancestors: ancestors.length ? ancestors : undefined,
    state,
    pseudoElement,
    specificity,
  };


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

/**
 * Replace `var(--name, fallback)` references in a CSS value with the resolved
 * custom-property value (or the fallback when the variable is unknown). Runs a
 * few passes so variables that reference other variables collapse fully.
 */
function substituteVars(value: string, vars: Record<string, string>): string {
  let v = value;
  for (let i = 0; i < 5 && v.includes("var("); i++) {
    v = v.replace(/var\(\s*(--[a-z0-9-]+)\s*(?:,\s*([^()]*))?\)/gi, (whole, name, fallback) => {
      const key = String(name).toLowerCase();
      if (vars[key] !== undefined) return vars[key];
      return fallback !== undefined ? String(fallback).trim() : whole;
    });
  }
  return v;
}


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
  if (d["height"]) p.height = d["height"];
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
  if (d["object-position"]) p.objectPosition = d["object-position"].trim();
  if (d["opacity"]) p.opacity = d["opacity"];
  if (d["fill"]) p.fill = d["fill"].trim();
  if (d["position"]) p.position = d["position"];
  if (d["z-index"]) p.zIndex = d["z-index"];
  if (d["top"]) p.top = d["top"];
  if (d["right"]) p.right = d["right"];
  if (d["bottom"]) p.bottom = d["bottom"];
  if (d["left"]) p.left = d["left"];
  if (d["inset"]) p.inset = d["inset"];
  if (d["order"]) p.order = d["order"];
  if (d["transition-duration"]) p.transitionDuration = d["transition-duration"].trim();
  if (d["transition-timing-function"]) p.transitionTimingFunction = d["transition-timing-function"].trim();

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
  private vars: Record<string, string>;
  constructor(html: string) {
    this.rules = parseStylesheet(html);
    this.vars = this.collectVars();
  }

  /**
   * Collect CSS custom property definitions (`--name: value`) from every rule
   * (`:root`, `.pl`, etc.) into a flat map so `var(--x)` references can be
   * resolved to literal values. Later declarations win. Values that themselves
   * reference other variables are resolved in a second pass.
   */
  private collectVars(): Record<string, string> {
    const vars: Record<string, string> = {};
    for (const rule of this.rules) {
      for (const [prop, value] of Object.entries(rule.decls)) {
        if (prop.startsWith("--")) vars[prop.toLowerCase()] = value.trim();
      }
    }
    // Resolve nested var() references between custom properties.
    for (let pass = 0; pass < 5; pass++) {
      let changed = false;
      for (const key of Object.keys(vars)) {
        const next = substituteVars(vars[key], vars);
        if (next !== vars[key]) { vars[key] = next; changed = true; }
      }
      if (!changed) break;
    }
    return vars;
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

    // Snapshot the ancestor chain once (outermost last) for descendant matching.
    const ancestry: { tag: string; classes: string[]; id: string }[] = [];
    for (let p = node.parent; p; p = p.parent) {
      ancestry.push({
        tag: (p.tag || "").toLowerCase(),
        classes: (p.attrs?.class || "").toLowerCase().split(/\s+/).filter(Boolean),
        id: (p.attrs?.id || "").toLowerCase(),
      });
    }

    const matched: { spec: number; order: number; decls: Record<string, string> }[] = [];
    for (const rule of this.rules) {
      if (!mediaActiveAt(rule.media, width)) continue;
      for (const sel of rule.selectors) {
        // Base style only: interactive-state and pseudo-element rules are baked
        // separately (see resolveHover) so they never pollute the resting state.
        if (sel.state || sel.pseudoElement) continue;
        if (sel.tag && sel.tag !== tag) continue;
        if (sel.id && sel.id !== id) continue;
        if (sel.classes.length && !sel.classes.every((c) => classes.includes(c))) continue;
        if (sel.ancestors && !ancestorsMatch(sel.ancestors, ancestry)) continue;
        matched.push({ spec: sel.specificity, order: rule.order, decls: rule.decls });
      }
    }


    matched.sort((a, b) => (a.spec - b.spec) || (a.order - b.order));
    const merged: Record<string, string> = {};
    for (const mm of matched) Object.assign(merged, mm.decls);

    // Inline style="" wins over everything.
    if (node.attrs?.style) Object.assign(merged, parseDecls(node.attrs.style));
    // Substitute CSS custom properties (`var(--x)`) with their literal values so
    // backgrounds, colors and borders resolve even when the source wrapper that
    // defined the variables is flattened away during conversion.
    for (const key of Object.keys(merged)) {
      if (key.startsWith("--")) continue;
      if (merged[key].includes("var(")) merged[key] = substituteVars(merged[key], this.vars);
    }
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

  /**
   * Resolve interactive-state (`:hover` / `:focus` / `:active`) styles for a node.
   * Only rules whose rightmost simple selector carries a STATE pseudo-class AND
   * matches this node's tag/class/id participate. Returns both the resolved
   * StyleProps (for mapping onto native Elementor hover controls) and the raw
   * winning declarations (so any unmapped property can still be emitted as a
   * `selector:hover{…}` fallback). Returns `undefined` when the node has no
   * interactive-state styling, so callers can cheaply skip it.
   */
  resolveHover(
    node: NodeLike,
    width: number = DEVICE_WIDTHS.desktop,
  ): { props: StyleProps; decls: Record<string, string>; states: string[] } | undefined {
    const tag = (node.tag || "").toLowerCase();
    const classes = (node.attrs?.class || "").toLowerCase().split(/\s+/).filter(Boolean);
    const id = (node.attrs?.id || "").toLowerCase();

    const matched: { spec: number; order: number; decls: Record<string, string>; state: string }[] = [];
    for (const rule of this.rules) {
      if (!mediaActiveAt(rule.media, width)) continue;
      for (const sel of rule.selectors) {
        if (!sel.state || sel.pseudoElement) continue;
        if (sel.tag && sel.tag !== tag) continue;
        if (sel.id && sel.id !== id) continue;
        if (sel.classes.length && !sel.classes.every((c) => classes.includes(c))) continue;
        matched.push({ spec: sel.specificity, order: rule.order, decls: rule.decls, state: sel.state });
      }
    }
    if (!matched.length) return undefined;

    matched.sort((a, b) => (a.spec - b.spec) || (a.order - b.order));
    const merged: Record<string, string> = {};
    const states = new Set<string>();
    for (const mm of matched) {
      states.add(mm.state);
      for (const [k, v] of Object.entries(mm.decls)) {
        if (k.startsWith("--")) continue;
        merged[k] = v.includes("var(") ? substituteVars(v, this.vars) : v;
      }
    }
    if (!Object.keys(merged).length) return undefined;
    return { props: declsToProps(merged), decls: merged, states: [...states] };
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
  // Strict numeric extraction with safe "0" coercion so we never emit a box
  // with an empty side (which serialises to invalid CSS like "0px px 0px px").
  // The Elementor box control emits a single unit for all four sides, so we
  // normalise every side to px — converting rem/em (×16) instead of dropping
  // the unit (which turned `8rem` into a broken `8px`).
  const num = (v?: string): string => {
    if (v === undefined || v === null) return "0";
    const m = String(v).match(/(-?\d*\.?\d+)\s*(px|rem|em|%|vw|vh)?/i);
    if (!m) return "0";
    let n = parseFloat(m[1]);
    if (!Number.isFinite(n)) return "0";
    const unit = (m[2] || "px").toLowerCase();
    if (unit === "rem" || unit === "em") n = n * 16;
    return String(Math.round(n * 100) / 100);
  };
  const top = num(sides.top);
  const right = num(sides.right ?? sides.top);
  const bottom = num(sides.bottom ?? sides.top);
  const left = num(sides.left ?? sides.right);
  // Nothing meaningful was set — omit the box entirely.
  if (sides.top === undefined && sides.right === undefined && sides.bottom === undefined && sides.left === undefined) {
    return undefined;
  }
  return { unit: "px", top, right, bottom, left, isLinked: false };
}

/**
 * Parse a CSS `border-radius` shorthand into an Elementor per-corner box.
 * Supports 1–4 value shorthands (`8px`, `8px 16px`, `8px 16px 4px 12px`) and
 * the `50%` / `9999px` pill/circle idioms. Returns undefined when nothing
 * meaningful is present so callers can fall back to their own defaults.
 * Elementor corner order is top / right / bottom / left = TL / TR / BR / BL.
 */
function cornerRadius(v?: string): Record<string, unknown> | undefined {
  if (!v) return undefined;
  const val = v.trim().toLowerCase();
  if (!val || val === "0" || val === "none" || val === "initial" || val === "inherit") return undefined;
  // Circle / pill idioms — emit a linked 50% (Elementor clamps to a pill).
  if (/(^|\s)(50%|9999px|999px|100vmax)/.test(val)) {
    return { unit: "%", top: "50", right: "50", bottom: "50", left: "50", isLinked: true };
  }
  // Ignore elliptical radii (the part after "/") — take the first value set.
  const primary = val.split("/")[0].trim();
  const parts = primary.split(/\s+/).map((t) => pxSize(t)).filter(Boolean) as { unit: string; size: number }[];
  if (!parts.length) return undefined;
  // CSS corner order: TL, TR, BR, BL with the usual 1–4 value expansion.
  const [tl, tr = tl, br = tl, bl = tr] = parts;
  const unit = tl.unit || "px";
  const isLinked = parts.every((p) => p.size === tl.size);
  return {
    unit,
    top: String(tl.size),
    right: String(tr.size),
    bottom: String(br.size),
    left: String(bl.size),
    isLinked,
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

/**
 * Bake counter widget styles. The number and the title can carry different
 * colors/typography in the source, so each is resolved independently and mapped
 * onto Elementor's `number_color` / `typography_number` and
 * `title_color` / `typography_title` controls. Without this the counter falls
 * back to the Elementor kit defaults (usually a large light-blue number).
 */
 export function styleCounter(
   settings: Record<string, unknown>,
   numberProps: StyleProps | undefined,
   titleProps: StyleProps | undefined,
   ctx?: SiteContext,
   boxProps?: StyleProps,
   anim?: { duration?: number; easing?: string },
 ): void {
   // Count-up animation: Elementor's counter has a native `duration` control (ms).
   // Easing is not a native counter control, so it is emitted via a bridge key that
   // our plugin turns into the count-up easing on the frontend.
   if (anim) {
     if (typeof anim.duration === "number" && anim.duration > 0) {
       settings.duration = Math.round(anim.duration);
     }
     if (anim.easing) settings.__xxxv_counter_easing = anim.easing;
   }
  const globals: Record<string, string> = (settings.__globals__ as Record<string, string>) ?? {};

  const toAlign = (v?: string): string | undefined => {
    if (!v) return undefined;
    const a = v.trim().toLowerCase();
    if (a === "left" || a === "start" || a === "flex-start") return "left";
    if (a === "right" || a === "end" || a === "flex-end") return "right";
    if (a === "center" || a === "justify") return "center";
    return undefined;
  };

  if (numberProps) {
    const numColorGlobal = globalColorId(numberProps.color, ctx);
    if (numColorGlobal) globals["number_color"] = `globals/colors?id=${numColorGlobal}`;
    else if (numberProps.color) settings.number_color = numberProps.color;
    applyTypography(settings, globals, numberProps, ctx, "typography_number");
    // Gap between the prefix/number/suffix parts. Source often uses `gap` on the
    // flex number wrapper; map it to a bridge key our plugin turns into horizontal
    // margins on `.elementor-counter-number-prefix/-suffix`.
    if (numberProps.gap) {
      const g = pxSize(numberProps.gap);
      if (g && g.size >= 0) settings.__xxxv_counter_affix_space = `${g.size}${g.unit}`;
    }
  }
  if (titleProps) {
    const titleColorGlobal = globalColorId(titleProps.color, ctx);
    if (titleColorGlobal) globals["title_color"] = `globals/colors?id=${titleColorGlobal}`;
    else if (titleProps.color) settings.title_color = titleProps.color;
    applyTypography(settings, globals, titleProps, ctx, "typography_title");
    // Space between the number and the title (from title's top margin).
    const topMargin = titleProps.margin?.top;
    const titleGap = pxSize(typeof topMargin === "string" ? topMargin : undefined);
    if (titleGap && titleGap.size >= 0) {
      settings.__xxxv_counter_title_space = `${titleGap.size}${titleGap.unit}`;
    }
  }

  // Box-level styling so the counter card mirrors the source: alignment,
  // background, padding and rounded corners. Elementor's counter has no native
  // align control, so alignment is emitted via a bridge key + our plugin CSS.
  if (boxProps) {
    const bAlign = toAlign(boxProps.textAlign) || toAlign(boxProps.justifyContent);
    if (bAlign) settings.__xxxv_counter_align = bAlign;
    if (boxProps.backgroundColor) {
      settings.__xxxv_background = boxProps.backgroundColor;
      settings.background_background = "classic";
      settings.background_color = boxProps.backgroundColor;
    }
    const pad = sidesToElementorSafe(boxProps.padding);
    if (pad) settings._padding = pad;
    const boxCorner = cornerRadius(boxProps.borderRadius);
    if (boxCorner) settings._border_radius = boxCorner;
  }

  if (Object.keys(globals).length) settings.__globals__ = globals;
}

/**
 * Bake icon-box widget styles. The icon, title and description can each carry
 * their own color/typography in the source. Elementor's icon-box controls are:
 *   - `primary_color` / `icon_size` for the icon glyph
 *   - `title_color` / `title_typography_typography` for the title
 *   - `description_color` / `description_typography_typography` for the text
 * Also maps the icon vertical position (top/left/right) and text alignment so
 * the converted widget mirrors the source layout instead of the kit default.
 */
export function styleIconBox(
  settings: Record<string, unknown>,
  iconProps: StyleProps | undefined,
  titleProps: StyleProps | undefined,
  descProps: StyleProps | undefined,
  ctx?: SiteContext,
  boxProps?: StyleProps,
): void {
  const globals: Record<string, string> = (settings.__globals__ as Record<string, string>) ?? {};

  const toAlign = (v?: string): string | undefined => {
    if (!v) return undefined;
    const a = v.trim().toLowerCase();
    if (a === "left" || a === "start" || a === "flex-start") return "left";
    if (a === "right" || a === "end" || a === "flex-end") return "right";
    if (a === "center" || a === "justify" || a === "space-between" || a === "space-around") return "center";
    return undefined;
  };

  if (iconProps) {
    // Icon color comes from `color` or `fill` on the <i>/<svg>.
    const iconColor = iconProps.color || iconProps.fill;
    const iconColorGlobal = globalColorId(iconColor, ctx);
    if (iconColorGlobal) globals["primary_color"] = `globals/colors?id=${iconColorGlobal}`;
    else if (iconColor) settings.primary_color = iconColor;
    // Icon size from font-size (icon fonts) or width/height (svg).
    const size = pxSize(iconProps.fontSize) || pxSize(iconProps.width) || pxSize(iconProps.height);
    if (size && size.unit === "px" && size.size > 0) {
      settings.icon_size = { unit: "px", size: size.size, sizes: [] };
      settings.__xxxv_icon_size = `${size.size}px`;
    }
    // Icon background => stacked "chip" view; border => framed view. Elementor
    // honours these natively, and the bridge keys guarantee identical published CSS.
    if (iconProps.backgroundColor) {
      settings.icon_secondary_color = iconProps.backgroundColor;
      settings.view = "stacked";
      settings.__xxxv_icon_bg = iconProps.backgroundColor;
    } else if (iconProps.border) {
      settings.view = "framed";
      settings.__xxxv_icon_border = iconProps.border;
    }
    // Icon chip shape: rounded corners / circle from border-radius.
    const iconCorner = cornerRadius(iconProps.borderRadius);
    if (iconCorner) {
      settings.icon_border_radius = iconCorner;
      const br = (iconProps.borderRadius || "").trim().toLowerCase();
      settings.shape = (br === "50%" || br.startsWith("999") || br === "9999px") ? "circle" : "square";
      settings.__xxxv_icon_radius = iconProps.borderRadius;
    }
    // Icon chip padding (space between glyph and its background/border).
    const ipad = sidesToElementorSafe(iconProps.padding);
    if (ipad) {
      settings.icon_padding = ipad;
      if (iconProps.padding) settings.__xxxv_icon_padding = sidesToCss(iconProps.padding);
    }
  }
  if (titleProps) {
    const titleColorGlobal = globalColorId(titleProps.color, ctx);
    if (titleColorGlobal) globals["title_color"] = `globals/colors?id=${titleColorGlobal}`;
    else if (titleProps.color) settings.title_color = titleProps.color;
    applyTypography(settings, globals, titleProps, ctx, "title_typography");
    if (titleProps.textAlign) settings.text_align = titleProps.textAlign;
    // Spacing under the title before the description.
    const tGap = pxSize(typeof titleProps.margin?.bottom === "string" ? titleProps.margin?.bottom : undefined);
    if (tGap && tGap.size >= 0) settings.title_bottom_space = { unit: tGap.unit, size: tGap.size, sizes: [] };
  }
  if (descProps) {
    const descColorGlobal = globalColorId(descProps.color, ctx);
    if (descColorGlobal) globals["description_color"] = `globals/colors?id=${descColorGlobal}`;
    else if (descProps.color) settings.description_color = descProps.color;
    applyTypography(settings, globals, descProps, ctx, "description_typography");
  }

  // Box layout => icon position (top/left/right) + spacing + alignment. Elementor's
  // icon-box `position` control is native; bridge keys keep the published page
  // pixel-identical even when the theme/kit tries to override the wrapper flex.
  if (boxProps) {
    const disp = (boxProps.display || "").toLowerCase();
    const dir = (boxProps.flexDirection || "").toLowerCase();
    let pos = "top";
    if (disp.includes("flex") && dir.startsWith("row")) {
      pos = dir.includes("reverse") ? "right" : "left";
    } else if (disp.includes("flex") && (dir === "" || dir.startsWith("column"))) {
      pos = "top";
    }
    settings.position = pos;
    settings.__xxxv_icon_position = pos;
    // Spacing between icon and content (flex gap).
    const gap = pxSize(boxProps.gap);
    if (gap && gap.size >= 0) {
      settings.icon_space = { unit: gap.unit, size: gap.size, sizes: [] };
      settings.__xxxv_icon_space = `${gap.size}${gap.unit}`;
    }
    // Overall box text alignment.
    const bAlign = toAlign(boxProps.textAlign) || toAlign(boxProps.alignItems) || toAlign(boxProps.justifyContent);
    if (bAlign) {
      settings.text_align = bAlign;
      settings.__xxxv_iconbox_align = bAlign;
    }
  }

  if (Object.keys(globals).length) settings.__globals__ = globals;
}

/**
 * Bake Image Box styles so the widget matches the source design instead of the
 * Elementor kit defaults: image size/radius, title & description colours and
 * typography, spacing between image and content, alignment, and box padding.
 */
export function styleImageBox(
  settings: Record<string, unknown>,
  imgProps: StyleProps | undefined,
  titleProps: StyleProps | undefined,
  descProps: StyleProps | undefined,
  boxProps: StyleProps | undefined,
  ctx?: SiteContext,
): void {
  const globals: Record<string, string> = (settings.__globals__ as Record<string, string>) ?? {};

  // Normalise a CSS text-align keyword to an Elementor alignment token.
  const toAlign = (v?: string): string | undefined => {
    if (!v) return undefined;
    const a = v.trim().toLowerCase();
    if (a === "left" || a === "start") return "left";
    if (a === "right" || a === "end") return "right";
    if (a === "center" || a === "justify") return a === "justify" ? "justify" : "center";
    return undefined;
  };

  if (imgProps) {
    // Width: prefer an explicit CSS width, then max-width.
    const w = pxSize(imgProps.width) || pxSize(imgProps.maxWidth);
    if (w && w.size > 0) {
      settings.image_size = { unit: w.unit, size: w.size, sizes: [] };
    }
    // Per-corner rounded / circular images (handles 1–4 value shorthands + pills).
    const imgCorner = cornerRadius(imgProps.borderRadius);
    if (imgCorner) settings.image_border_radius = imgCorner;
    if (imgProps.objectFit) {
      settings.object_fit = imgProps.objectFit;
      // Elementor only honours object-position when a fit is set.
      if (imgProps.objectPosition) settings.object_position = imgProps.objectPosition;
    }
  }

  if (titleProps) {
    const titleColorGlobal = globalColorId(titleProps.color, ctx);
    if (titleColorGlobal) globals["title_color"] = `globals/colors?id=${titleColorGlobal}`;
    else if (titleProps.color) settings.title_color = titleProps.color;
    applyTypography(settings, globals, titleProps, ctx, "title_typography");
    const tAlign = toAlign(titleProps.textAlign);
    if (tAlign) settings.text_align = tAlign;
    // Spacing under the title before the description (margin-bottom).
    const titleGap = pxSize(titleProps.margin?.bottom);
    if (titleGap && titleGap.size > 0) {
      settings.title_bottom_space = { unit: titleGap.unit, size: titleGap.size, sizes: [] };
    }
  }

  if (descProps) {
    const descColorGlobal = globalColorId(descProps.color, ctx);
    if (descColorGlobal) globals["description_color"] = `globals/colors?id=${descColorGlobal}`;
    else if (descProps.color) settings.description_color = descProps.color;
    applyTypography(settings, globals, descProps, ctx, "description_typography");
    // Independent description alignment when it differs from the title.
    const dAlign = toAlign(descProps.textAlign);
    if (dAlign && dAlign !== settings.text_align) settings.__xxxv_description_align = dAlign;
  }

  if (boxProps) {
    // Spacing between the image and the text content.
    const gap = pxSize(boxProps.gap);
    if (gap && gap.size > 0) {
      settings.image_space = { unit: gap.unit, size: gap.size, sizes: [] };
    }
    // Overall text alignment when the box centres its content.
    if (!settings.text_align) {
      const bAlign = toAlign(boxProps.textAlign);
      if (bAlign) settings.text_align = bAlign;
    }
    // Side-by-side layout: a flex row means the image sits left/right of text.
    if (boxProps.display === "flex" && (boxProps.flexDirection === "row" || boxProps.flexDirection === "row-reverse")) {
      settings.position = boxProps.flexDirection === "row-reverse" ? "right" : "left";
      // Vertical alignment of the image against the text column.
      const ai = (boxProps.alignItems || "").toLowerCase();
      if (ai === "center") settings.image_vertical_alignment = "middle";
      else if (ai === "flex-end" || ai === "end") settings.image_vertical_alignment = "bottom";
      else if (ai === "flex-start" || ai === "start") settings.image_vertical_alignment = "top";
    }
    // Box background + padding so cards keep their surface styling.
    if (boxProps.backgroundColor) {
      settings.background_background = "classic";
      settings.background_color = boxProps.backgroundColor;
    }
    const pad = sidesToElementorSafe(boxProps.padding);
    if (pad) settings._padding = pad;
    // Per-corner box border radius (falls back to per-corner shorthand parsing).
    const boxCorner = cornerRadius(boxProps.borderRadius);
    if (boxCorner) settings._border_radius = boxCorner;
    if (boxProps.border) settings.__xxxv_box_border = boxProps.border;
    if (boxProps.boxShadow) settings.__xxxv_box_shadow = boxProps.boxShadow;
  }

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

export type HoverKind = "button" | "container" | "text" | "heading" | "image" | "link";

/**
 * Bake interactive-state (`:hover` / `:focus` / `:active`) styles onto native
 * Elementor hover controls for the widget kind, and always attach a raw
 * `__xxxv_hover` declaration bridge so the plugin can render a guaranteed
 * `selector:hover{…}` block for any property not covered by a native control.
 */
export function styleHover(
  settings: Record<string, unknown>,
  hover: { props: StyleProps; decls: Record<string, string>; states: string[] },
  kind: HoverKind,
): void {
  const p = hover.props;

  if (kind === "button" || kind === "link") {
    // Elementor Button widget hover tab.
    if (p.color) settings.hover_color = p.color;
    if (p.backgroundColor) settings.button_background_hover_color = p.backgroundColor;
    if (p.border) settings.__xxxv_button_hover_border = p.border;
    // Only add a motion preset when the template's hover actually transforms.
    if (p.transform && p.transform !== "none" && !settings.hover_animation) {
      settings.hover_animation = "grow";
    }
  } else {
    // Containers / text / headings / images: background + text colour hover.
    if (p.backgroundColor) {
      settings.background_hover_background = "classic";
      settings.background_hover_color = p.backgroundColor;
    }
    if (p.color) settings.__xxxv_hover_color = p.color;
  }

  const br = pxSize(p.borderRadius);
  if (br) settings.__xxxv_hover_border_radius = `${br.size}${br.unit}`;
  if (p.boxShadow) settings.__xxxv_hover_box_shadow = p.boxShadow;
  if (p.transform && p.transform !== "none") settings.__xxxv_hover_transform = p.transform;

  // Guaranteed fallback: the full winning hover declaration block. The connector
  // plugin emits this as `selector:hover{…}` so EVERY hover property survives,
  // including ones with no dedicated Elementor control.
  const raw: Record<string, string> = {};
  for (const [k, v] of Object.entries(hover.decls)) {
    if (!k.startsWith("--")) raw[k] = v;
  }
  if (Object.keys(raw).length) settings.__xxxv_hover = raw;
}


/** Bake image styles (width / radius). */
export function styleImage(
  settings: Record<string, unknown>,
  p: StyleProps,
  hint?: { className?: string; widthAttr?: string; heightAttr?: string },
): void {
  const cls = (hint?.className || "").toLowerCase();
  const isSmallGraphic = /\b(logo|icon|avatar|badge|favicon|thumb|thumbnail|social|emoji|flag)\b/.test(cls);

  // Distinguish a *deliberate* CSS width (author intent) from fallback sources.
  // An explicit `width` declaration is honoured at any size, because that is the
  // size the template author chose (e.g. 42px rating avatars). Only widths that
  // come from `max-width` or the HTML width attribute get the "ignore tiny px"
  // guard, which exists to stop hero images collapsing to a stray thumbnail size.
  const explicitW = pxSize(p.width);
  const raw = p.width || p.maxWidth || (hint?.widthAttr ? `${hint.widthAttr}px` : undefined);
  const w = pxSize(raw);
  if (w) {
    if (w.unit === "%") {
      // Percentage widths are inherently responsive — keep them as-is.
      settings.width = { unit: "%", size: w.size };
    } else if (w.unit === "px") {
      if (explicitW || isSmallGraphic || w.size >= 240) {
        // Honour an explicit CSS px width verbatim (author intent), and keep the
        // existing guard for deliberate small graphics or genuinely large images.
        settings.width = w;
      } else {
        // A stray small px width from max-width / attr only — stay fluid so
        // heroes fill their container after publish.
        settings.width = { unit: "%", size: 100 };
      }
    } else {
      settings.width = w;
    }
  } else if (!isSmallGraphic) {
    // No reliable width extracted — default content/hero images to fluid width
    // so they never render at Elementor's tiny default thumbnail size.
    settings.width = { unit: "%", size: 100 };
  }
  // Preserve an explicit fixed px height when the image is cropped/contained
  // (object-fit) — this keeps square avatars square and circular crops circular.
  // Otherwise let height follow the image intrinsically (no distortion).
  const explicitH = pxSize(p.height);
  if (explicitH && explicitH.unit === "px" && explicitW && (p.objectFit === "cover" || p.objectFit === "contain")) {
    settings.height = { unit: "px", size: explicitH.size };
  } else {
    settings.height = { unit: "px", size: "" };
  }
  const br = pxSize(p.borderRadius);
  if (br) settings.image_border_radius = { unit: br.unit, top: String(br.size), right: String(br.size), bottom: String(br.size), left: String(br.size), isLinked: true };
  else if (/(^|\s)50%|9999px/.test(p.borderRadius || "")) settings.image_border_radius = { unit: "%", top: "50", right: "50", bottom: "50", left: "50", isLinked: true };
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
    // Elementor grid containers default to grid_rows_grid = 2, which reserves an
    // empty second row (grid-template-rows: repeat(2, 1fr)) and produces a large
    // block of extra white space whenever the real content is a single row of
    // cards. Force ONE explicit row + auto-flow so the grid is always exactly one
    // row tall and any overflowing items wrap into implicit rows that grow to fit
    // their content instead of being pre-allocated as blank space.
    settings.grid_rows_grid = { unit: "fr", size: 1, sizes: [] };
    settings.grid_auto_flow = "row";
    // Preserve the EXACT track sizing (e.g. "1.1fr 0.9fr") so two-column heroes
    // keep their real proportions instead of collapsing to a single column.
    if (p.gridTemplateColumns && p.gridTemplateColumns !== "none") {
      settings.__xxxv_grid_template_columns = p.gridTemplateColumns;
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

/**
 * Bake responsive VISIBILITY (hide on desktop/tablet/mobile) and ORDERING onto an
 * element's Elementor settings from the per-device resolved styles.
 *
 * Visibility: a `display:none` active at a device width maps to Elementor's
 * `hide_desktop` / `hide_tablet` / `hide_mobile` = "hidden" responsive controls.
 * Ordering: a CSS `order` value maps to Elementor's flex `_order` custom control
 * (`_order` = "custom" + numeric `_order_custom{suffix}`), per device.
 */
export function styleResponsiveVisibilityAndOrder(
  settings: Record<string, unknown>,
  devices: { desktop: StyleProps; tablet: StyleProps; mobile: StyleProps },
): void {
  const map: Array<{ dev: StyleProps; hide: string; suffix: "" | "_tablet" | "_mobile" }> = [
    { dev: devices.desktop, hide: "hide_desktop", suffix: "" },
    { dev: devices.tablet, hide: "hide_tablet", suffix: "_tablet" },
    { dev: devices.mobile, hide: "hide_mobile", suffix: "_mobile" },
  ];

  // --- Responsive visibility -------------------------------------------------
  for (const { dev, hide } of map) {
    if (dev.display === "none") settings[hide] = "hidden";
  }

  // --- Responsive ordering ---------------------------------------------------
  const baseOrder = parseOrder(devices.desktop.order);
  if (baseOrder !== null) {
    settings["_order"] = "custom";
    settings["_order_custom"] = { unit: "px", size: baseOrder, sizes: [] };
  }
  for (const { dev, suffix } of map) {
    if (suffix === "") continue;
    const o = parseOrder(dev.order);
    if (o !== null && o !== baseOrder) {
      settings["_order"] = "custom";
      settings[`_order_custom${suffix}`] = { unit: "px", size: o, sizes: [] };
    }
  }
}

function parseOrder(value?: string): number | null {
  if (!value) return null;
  const n = parseInt(String(value).trim(), 10);
  return Number.isFinite(n) ? n : null;
}



function sidesToElementorSafe(sides?: Partial<BoxSides>): Record<string, unknown> | undefined {
  return sidesToElementor(sides);
}

/** Build a CSS `padding`/`margin` shorthand string from box sides. */
function sidesToCss(sides?: Partial<BoxSides>): string | undefined {
  if (!sides) return undefined;
  const t = sides.top ?? "0";
  const r = sides.right ?? "0";
  const b = sides.bottom ?? "0";
  const l = sides.left ?? "0";
  const val = `${t} ${r} ${b} ${l}`.trim();
  return val && val !== "0 0 0 0" ? val : undefined;
}
