// Elementor Template Kit packaging layer.
//
// Turns a stored Elementor JSON tree + its editable-field map into the extra
// package artifacts that make each catalog row a complete, self-contained kit —
// exactly like Envato/Astra/Kadence starter templates:
//
//   - placeholders     : { "{{HERO_TITLE}}": "heading_1", ... }  (token -> field key)
//   - image_map        : { "img_1": { url, alt, role } }          (original images)
//   - responsive_rules : { "<widgetId>": { tablet:{}, mobile:{} } } per widget
//
// These are derived at seed time and published verbatim — publishing only swaps
// placeholder tokens, never the surrounding structure.

import type { ElementorElement } from "./elementor-engine.ts";
import type { EditableField } from "./elementor-fields.ts";

/** Map an editable field to a stable {{PLACEHOLDER}} token name. */
function tokenFor(field: EditableField, heroAssigned: { done: boolean }): string {
  // Promote the very first heading to a clear PAGE/HERO title token.
  if (field.kind === "heading" && !heroAssigned.done) {
    heroAssigned.done = true;
    return "HERO_TITLE";
  }
  return field.key.toUpperCase();
}

/**
 * Build the placeholder map: `{{TOKEN}} -> field.key`. Tokens are stable and
 * derived from the field key (e.g. heading_2 -> {{HEADING_2}}), with the first
 * heading promoted to {{HERO_TITLE}} for readability.
 */
export function buildPlaceholderMap(fields: EditableField[]): Record<string, string> {
  const map: Record<string, string> = {};
  const heroAssigned = { done: false };
  for (const f of fields) {
    const token = tokenFor(f, heroAssigned);
    map[`{{${token}}}`] = f.key;
  }
  return map;
}

export interface ImageEntry {
  url: string;
  alt: string;
  role: string;
}

/** Collect every image referenced by image / image-box / testimonial widgets. */
export function buildImageMap(tree: ElementorElement[]): Record<string, ImageEntry> {
  const out: Record<string, ImageEntry> = {};
  let n = 0;
  const add = (url: unknown, alt: unknown, role: string) => {
    const u = typeof url === "string" ? url.trim() : "";
    if (!u || u.startsWith("data:")) return;
    n += 1;
    out[`img_${n}`] = { url: u, alt: typeof alt === "string" ? alt : "", role };
  };
  const visit = (el: ElementorElement) => {
    if (el.elType === "widget" && el.widgetType) {
      const s = (el.settings ?? {}) as Record<string, any>;
      if (el.widgetType === "image" || el.widgetType === "image-box") {
        add(s.image?.url, s.image?.alt, el.widgetType);
      } else if (el.widgetType === "testimonial") {
        add(s.testimonial_image?.url, "", "testimonial");
      }
      // CSS background images on containers/widgets.
      if (s.background_image?.url) add(s.background_image.url, "", "background");
    }
    for (const c of el.elements ?? []) visit(c);
  };
  for (const el of tree) visit(el);
  return out;
}

const RESPONSIVE_SUFFIX = /_(tablet|mobile)$/;

/**
 * Capture every responsive (tablet/mobile) setting present on each element so
 * the kit records desktop/tablet/mobile rules explicitly. Returns a map keyed
 * by widget/container id; elements with no responsive overrides are omitted.
 */
export function buildResponsiveRules(
  tree: ElementorElement[],
): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  const visit = (el: ElementorElement) => {
    const s = (el.settings ?? {}) as Record<string, unknown>;
    const overrides: Record<string, unknown> = {};
    for (const k of Object.keys(s)) {
      if (RESPONSIVE_SUFFIX.test(k)) overrides[k] = s[k];
    }
    if (Object.keys(overrides).length > 0) out[el.id] = overrides;
    for (const c of el.elements ?? []) visit(c);
  };
  for (const el of tree) visit(el);
  return out;
}

export interface TemplatePackage {
  placeholders: Record<string, string>;
  imageMap: Record<string, ImageEntry>;
  responsiveRules: Record<string, Record<string, unknown>>;
}

/** Build the full kit package artifacts from a tree + its editable fields. */
export function buildTemplatePackage(
  tree: ElementorElement[],
  fields: EditableField[],
): TemplatePackage {
  return {
    placeholders: buildPlaceholderMap(fields),
    imageMap: buildImageMap(tree),
    responsiveRules: buildResponsiveRules(tree),
  };
}
