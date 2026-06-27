// Catalog-driven Elementor publishing.
//
// Loads a stored Elementor template (from the `elementor_templates` catalog),
// overlays new generated content ONLY onto its editable fields, validates the
// result against the template's length budget, and safely truncates any
// overflowing field until the visual-fidelity target is met. The returned
// `_elementor_data` string is published verbatim so the live page matches the
// stored template design 1:1 while carrying new SEO content.

import type { ElementorElement } from "./elementor-engine.ts";
import {
  applyEditableContent,
  defaultContentFor,
  extractEditableFields,
  limitsFor,
  validateContent,
} from "./elementor-fields.ts";
import { enforceBudget } from "../template-length-budget.ts";

export interface CatalogBuildResult {
  /** Serialized Elementor tree ready for `_elementor_data`. */
  data: string;
  /** Final visual-fidelity score (0-100). */
  similarity: number;
  /** Field keys that were truncated to satisfy the budget. */
  truncatedFields: string[];
}

const stripTags = (s: string): string =>
  s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

let cssWidgetCounter = 0;
function genCssWidgetId(): string {
  cssWidgetCounter = (cssWidgetCounter + 1) % 0xffffff;
  return `css${cssWidgetCounter.toString(16).padStart(7, "0")}`.slice(0, 7);
}

/**
 * Extract every `<style>…</style>` block from raw template HTML and return the
 * concatenated CSS. This CSS carries the template's class-based design
 * (layout grids, colors, fonts, backgrounds, custom classes) that the Elementor
 * widget tree references but does not itself embed.
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

/**
 * Build an Elementor HTML widget (wrapped in a thin full-width container) that
 * injects the template's class-based CSS so the published page renders 1:1.
 * Placed at the very top of the tree so styles apply to all widgets below.
 */
function buildCssInjectionElement(css: string): ElementorElement {
  const widget: ElementorElement = {
    id: genCssWidgetId(),
    elType: "widget",
    widgetType: "html",
    elements: [],
    settings: { html: `<style>\n${css}\n</style>` },
  };
  return {
    id: genCssWidgetId(),
    elType: "container",
    elements: [widget],
    settings: { content_width: "full", padding: { unit: "px", top: "0", bottom: "0", left: "0", right: "0", isLinked: false } },
  } as unknown as ElementorElement;
}


/** Coerce stored `elementor_json` (array, {data:[]}, or {elements:[]}) into a tree. */
function coerceTree(json: unknown): ElementorElement[] {
  if (Array.isArray(json)) return json as ElementorElement[];
  if (json && typeof json === "object") {
    const o = json as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data as ElementorElement[];
    if (Array.isArray(o.elements)) return o.elements as ElementorElement[];
    if (typeof o.data === "string") {
      try {
        const parsed = JSON.parse(o.data);
        if (Array.isArray(parsed)) return parsed as ElementorElement[];
      } catch { /* ignore */ }
    }
  }
  if (typeof json === "string") {
    try {
      const parsed = JSON.parse(json);
      return coerceTree(parsed);
    } catch { /* ignore */ }
  }
  return [];
}

export interface CatalogOverrides {
  title?: string;
  description?: string;
  bodyHtml?: string;
  /** Template `<style>` CSS to inject so class-based design renders 1:1. */
  injectCss?: string;
}

/** Prepend a CSS-injection element to the tree when template CSS is provided. */
function withInjectedCss(tree: ElementorElement[], css?: string): ElementorElement[] {
  const clean = (css || "").trim();
  if (!clean) return tree;
  return [buildCssInjectionElement(clean), ...tree];
}

/**
 * Build a content-applied, validated Elementor `_elementor_data` string from a
 * stored catalog template. Returns null when the stored JSON has no editable
 * fields (caller should fall back to HTML conversion).
 */
export function buildElementorFromCatalog(
  elementorJson: unknown,
  overrides: CatalogOverrides,
  target = 98,
): CatalogBuildResult | null {
  const tree = coerceTree(elementorJson);
  if (tree.length === 0) return null;

  const fields = extractEditableFields(tree);
  // No editable fields detected: still publish the resolved Elementor tree as-is
  // (with template CSS injected) so the design renders 1:1 rather than blocking.
  if (fields.length === 0) {
    return { data: JSON.stringify(withInjectedCss(tree, overrides.injectCss)), similarity: 100, truncatedFields: [] };
  }

  const limits = limitsFor(fields);
  const content = defaultContentFor(fields);

  // Map the page title onto the first heading field.
  if (overrides.title) {
    const heading = fields.find((f) => f.kind === "heading");
    if (heading) content[heading.key] = overrides.title;
  }

  // Map the description / body text onto the largest text field.
  const bodyText = overrides.description ||
    (overrides.bodyHtml ? stripTags(overrides.bodyHtml) : "");
  if (bodyText) {
    const textField = fields
      .filter((f) => f.kind === "text")
      .sort((a, b) => b.originalText.length - a.originalText.length)[0];
    if (textField) content[textField.key] = bodyText;
  }

  // Validate; if it overflows, truncate offending fields safely and re-check.
  let report = validateContent(fields, limits, content, target);
  const truncatedFields: string[] = [];
  if (!report.ok) {
    for (const f of fields) {
      const budget = limits[f.key];
      if (!budget) continue;
      const capped = enforceBudget(content[f.key] ?? "", budget);
      if (capped !== (content[f.key] ?? "")) {
        content[f.key] = capped;
        truncatedFields.push(f.key);
      }
    }
    report = validateContent(fields, limits, content, target);
  }

  const applied = applyEditableContent(tree, fields, content);
  return {
    data: JSON.stringify(withInjectedCss(applied, overrides.injectCss)),
    similarity: report.similarity,
    truncatedFields,
  };
}
