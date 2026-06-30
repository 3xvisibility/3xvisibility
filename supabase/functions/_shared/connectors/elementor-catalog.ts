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
  /** CSS recovered from legacy HTML/CSS widgets that were removed from the native tree. */
  extractedCss: string;
  /** Final visual-fidelity score (0-100). */
  similarity: number;
  /** Field keys that were truncated to satisfy the budget. */
  truncatedFields: string[];
}

const stripTags = (s: string): string =>
  s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

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
 * Extract CSS from legacy HTML widgets, then remove every HTML widget from the
 * native Elementor tree. WordPress publishing is native Elementor only; CSS is
 * sent separately to the connector plugin and enqueued by WordPress, never
 * embedded through Elementor HTML widgets.
 */
function stripHtmlWidgets(tree: ElementorElement[]): { tree: ElementorElement[]; css: string } {
  const cssBlocks: string[] = [];
  const cleanElement = (el: ElementorElement): ElementorElement | null => {
    if (el.elType === "widget" && el.widgetType === "html") {
      const html = typeof el.settings?.html === "string" ? el.settings.html : "";
      const css = extractTemplateCss(html);
      if (css) cssBlocks.push(css);
      return null;
    }
    return {
      ...el,
      elements: (el.elements || []).map(cleanElement).filter(Boolean) as ElementorElement[],
    };
  };
  return {
    tree: tree.map(cleanElement).filter(Boolean) as ElementorElement[],
    css: cssBlocks.join("\n"),
  };
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
  const rawTree = coerceTree(elementorJson);
  const { tree, css: extractedCss } = stripHtmlWidgets(rawTree);
  if (tree.length === 0) return null;

  const fields = extractEditableFields(tree);
  // No editable fields detected: still publish the resolved Elementor tree as-is
  // so the design renders 1:1 rather than blocking.
  if (fields.length === 0) {
    return { data: JSON.stringify(tree), extractedCss, similarity: 100, truncatedFields: [] };
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
    data: JSON.stringify(applied),
    extractedCss,
    similarity: report.similarity,
    truncatedFields,
  };
}
