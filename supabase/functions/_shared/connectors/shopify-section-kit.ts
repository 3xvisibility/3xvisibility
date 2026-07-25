// Shopify Online Store 2.0 section template kit.
//
// The Shopify counterpart to the Elementor Template Kit. Turns a master template
// (rendered HTML + the editable-field map derived for Elementor) into a NATIVE
// Shopify OS 2.0 package — using the EXACT same placeholder + image mapping
// rules as `elementor-package.ts`:
//
//   - placeholders   : { "{{HERO_TITLE}}": "heading_1", ... }  (token -> field key)
//   - image_map      : { "img_1": { url, alt, role } }          (original images)
//   - section_liquid : a real `sections/<id>.liquid` file with a {% schema %}
//                      so every mapped text field is editable in the theme
//                      customizer, the template CSS ships in {% stylesheet %},
//                      and the design renders 1:1.
//   - template       : the OS 2.0 JSON template ({ sections, order }) that
//                      references the section with its default settings.
//
// Publishing only swaps placeholder settings + uploads images to Shopify Files
// (the connector rewrites <img> src to the Shopify CDN), never the structure.

import type { EditableField } from "./elementor-fields.ts";
import { buildPlaceholderMap } from "./elementor-package.ts";

export interface ShopifyImageEntry {
  url: string;
  alt: string;
  role: string;
}

export interface ShopifySectionKit {
  /** Stable section id used for the liquid filename + template reference. */
  sectionId: string;
  /** Full `sections/<id>.liquid` file contents (markup + stylesheet + schema). */
  sectionLiquid: string;
  /** OS 2.0 JSON template: { sections: {...}, order: [...] }. */
  template: Record<string, unknown>;
  /** {{TOKEN}} -> field key (parity with Elementor kit). */
  placeholders: Record<string, string>;
  /** img_1 -> { url, alt, role } (original template images). */
  imageMap: Record<string, ShopifyImageEntry>;
  /** Field keys that were successfully wired to editable section settings. */
  mappedFields: string[];
}

/** Extract concatenated CSS from every <style> block. */
function extractCss(html: string): string {
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
 * Collect bundled asset tags (data-xxxv-asset <link>/<script src>) so they can be
 * re-emitted inside the section liquid — Shopify must keep loading the page's
 * external CSS/JS for the live output to match the preview.
 */
function extractBundledAssetTags(html: string): string[] {
  return html.match(
    /<link\b[^>]*data-xxxv-asset[^>]*>|<script\b[^>]*data-xxxv-asset[^>]*>[\s\S]*?<\/script>/gi,
  ) || [];
}

/** Remove <style>/<script>/<head> noise, leaving renderable body markup. */
function stripNonBody(html: string): string {
  return html
    .replace(/<link\b[^>]*data-xxxv-asset[^>]*>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?(html|head|body)\b[^>]*>/gi, "")
    .trim();
}


function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Liquid schema id from a field key (lowercase, snake, ascii). */
function settingId(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

/** Map a field kind to a Shopify schema setting type. */
function schemaType(kind: string): "text" | "textarea" | "richtext" {
  if (kind === "text" || kind === "accordion_content" || kind === "iconbox_desc" ||
      kind === "testimonial_content") return "richtext";
  if (kind === "heading" || kind === "button" || kind === "counter_title" ||
      kind === "counter_number") return "text";
  return "textarea";
}

const RICH = new Set(["richtext"]);

/** Collect every <img src> and inline background-image url into the image map. */
function collectImages(html: string): Record<string, ShopifyImageEntry> {
  const out: Record<string, ShopifyImageEntry> = {};
  let n = 0;
  const add = (url: string, alt: string, role: string) => {
    const u = (url || "").trim();
    if (!u || u.startsWith("data:")) return;
    n += 1;
    out[`img_${n}`] = { url: u, alt: alt || "", role };
  };
  const imgRe = /<img\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html)) !== null) {
    const tag = m[0];
    const src = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1] || "";
    const alt = tag.match(/\balt\s*=\s*["']([^"']*)["']/i)?.[1] || "";
    add(src, alt, "image");
  }
  const bgRe = /background-image\s*:\s*url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  while ((m = bgRe.exec(html)) !== null) add(m[1], "", "background");
  return out;
}

/**
 * Build a Shopify OS 2.0 section template kit from a master HTML template and
 * the editable fields already derived for the Elementor kit. Placeholder + image
 * mapping rules are identical to `buildTemplatePackage`.
 */
export function buildShopifySectionKit(
  masterHtml: string,
  fields: EditableField[],
  opts: { sectionId?: string; name?: string } = {},
): ShopifySectionKit {
  const sectionId = opts.sectionId || "lov-kit-template";
  const css = extractCss(masterHtml);
  let body = stripNonBody(masterHtml);

  const placeholders = buildPlaceholderMap(fields);
  const imageMap = collectImages(masterHtml);

  // Wire each text-bearing field to an editable section setting by replacing the
  // FIRST occurrence of its original text with a liquid variable. This keeps the
  // surrounding design identical while making the content editable + swappable
  // in the Shopify theme customizer.
  const settings: Array<Record<string, unknown>> = [];
  const defaults: Record<string, unknown> = {};
  const mappedFields: string[] = [];
  const usedIds = new Set<string>();

  for (const f of fields) {
    if (f.kind === "counter_number") continue; // numeric, brittle to swap
    const original = (f.originalText || "").trim();
    if (!original || original.length < 2) continue;

    let id = settingId(f.key);
    while (usedIds.has(id)) id = `${id}_x`;

    // Try to inject into the body markup at the first textual occurrence.
    const re = new RegExp(escapeRegExp(original));
    if (!re.test(body)) continue;
    body = body.replace(re, `{{ section.settings.${id} }}`);
    usedIds.add(id);

    const type = schemaType(f.kind);
    const label = f.key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    settings.push({
      type,
      id,
      label,
      default: RICH.has(type) ? `<p>${original}</p>` : original,
    });
    defaults[id] = RICH.has(type) ? `<p>${original}</p>` : original;
    mappedFields.push(f.key);
  }

  // Assemble the native section liquid file: markup + scoped stylesheet + schema.
  const schema = {
    name: (opts.name || "Template Kit").slice(0, 25),
    tag: "section",
    class: "lov-kit-section",
    settings,
    presets: [{ name: opts.name || "Template Kit" }],
  };

  const sectionLiquid = [
    `<div class="lov-kit-wrapper" id="shopify-section-{{ section.id }}">`,
    body,
    `</div>`,
    css ? `{% stylesheet %}\n${css}\n{% endstylesheet %}` : "",
    `{% schema %}\n${JSON.stringify(schema, null, 2)}\n{% endschema %}`,
  ].filter(Boolean).join("\n");

  const template = {
    sections: {
      main: { type: sectionId, settings: defaults },
    },
    order: ["main"],
  };

  return { sectionId, sectionLiquid, template, placeholders, imageMap, mappedFields };
}

/**
 * Apply new content onto a stored Shopify section kit's template settings,
 * placeholder-only — never touching the section structure/liquid. Returns the
 * updated OS 2.0 JSON template object.
 */
export function applyShopifyKitContent(
  kit: { template: Record<string, unknown>; placeholders: Record<string, string> },
  content: Record<string, string>,
): Record<string, unknown> {
  const tpl = JSON.parse(JSON.stringify(kit.template)) as Record<string, any>;
  const main = tpl?.sections?.main;
  if (!main || !main.settings) return tpl;

  // placeholders: { "{{TOKEN}}": fieldKey }. content is keyed by field key.
  for (const fieldKey of Object.values(kit.placeholders)) {
    if (!(fieldKey in content)) continue;
    const id = settingId(fieldKey);
    if (id in main.settings) main.settings[id] = content[fieldKey];
  }
  return tpl;
}
