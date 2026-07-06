// One-time backfill: convert every stored template's HTML into native Elementor
// JSON and persist it so WordPress publishing NEVER converts HTML at publish
// time. Conversion at seed/backfill time is allowed; conversion at publish time
// is forbidden. Writes to BOTH:
//   - templates.elementor_data (per-template master JSON)
//   - elementor_templates catalog (id, category, json, fields, defaults, limits)
//
// Idempotent: safe to re-run. Pass { force: true } to overwrite templates that
// already have elementor_data.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { htmlToElementor } from "../_shared/connectors/elementor-engine.ts";
import {
  extractEditableFields,
  defaultContentFor,
  limitsFor,
} from "../_shared/connectors/elementor-fields.ts";
import { buildTemplatePackage } from "../_shared/connectors/elementor-package.ts";
import { buildShopifySectionKit } from "../_shared/connectors/shopify-section-kit.ts";

function countWidgets(tree: any[]): number {
  let n = 0;
  const walk = (el: any) => {
    if (el.elType === "widget") n++;
    for (const c of el.elements ?? []) walk(c);
  };
  for (const el of tree) walk(el);
  return n;
}

/**
 * Remove every {{AI_IMAGE}} placeholder (and any <img> whose src is one) from
 * the master HTML. Template-only image policy: missing images stay blank,
 * never AI/stock — and never trip the publish-time fail-safe.
 */
function stripAiImagePlaceholders(html: string): string {
  // Tokens look like {{AI_IMAGE: ... {location} ...}} and may contain inner
  // single braces, so match non-greedily up to the first closing "}}".
  const TOKEN = /\{\{\s*AI_IMAGE[\s\S]*?\}\}/gi;
  return html
    // <img ... src="{{AI_IMAGE...}}" ...> -> removed entirely
    .replace(/<img\b[^>]*\{\{\s*AI_IMAGE[\s\S]*?\}\}[^>]*>/gi, "")
    // background[-image]:url({{AI_IMAGE...}}) -> drop the whole declaration
    .replace(/background(-image)?\s*:\s*url\(\s*['"]?\{\{\s*AI_IMAGE[\s\S]*?\}\}['"]?\s*\)\s*;?/gi, "")
    // any remaining bare tokens (in text, alt, url settings, etc.)
    .replace(TOKEN, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const force = body?.force === true;
    // Batch controls so large catalogs don't exceed the worker compute limit.
    const limit = Math.min(Math.max(Number(body?.limit) || 10, 1), 50);
    const offset = Math.max(Number(body?.offset) || 0, 0);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: templates, error } = await supabase
      .from("templates")
      .select("id, name, content, schema_type, source_marketplace_id, elementor_data")
      .order("id", { ascending: true })
      .range(offset, offset + limit - 1);
    if (error) throw new Error(error.message);

    const results: Array<{
      id: string;
      ok: boolean;
      skipped?: boolean;
      widgets?: number;
      fields?: number;
      error?: string;
    }> = [];

    for (const t of (templates ?? []) as any[]) {
      try {
        if (!t.content || typeof t.content !== "string" || !t.content.trim()) {
          results.push({ id: t.id, ok: false, error: "no_html_content" });
          continue;
        }
        const hasExisting = Array.isArray(t.elementor_data)
          ? t.elementor_data.length > 0
          : !!t.elementor_data;
        if (hasExisting && !force) {
          results.push({ id: t.id, ok: true, skipped: true });
          continue;
        }

        // Strip any {{AI_IMAGE}} placeholders from the master markup so the
        // stored kit only ever references real template images. Missing images
        // stay blank (never AI/stock) and never trip the publish fail-safe.
        const cleanContent = stripAiImagePlaceholders(t.content);
        const tree = htmlToElementor(cleanContent);
        if (!tree.length) {
          results.push({ id: t.id, ok: false, error: "empty_conversion" });
          continue;
        }
        const fields = extractEditableFields(tree);
        const defaults = defaultContentFor(fields);
        const limits = limitsFor(fields);
        const pkg = buildTemplatePackage(tree, fields);
        // Shopify Online Store 2.0 section kit (same placeholder/image rules).
        const sectionSlug = `lov-${String(t.source_marketplace_id || t.id).replace(/[^a-z0-9]+/gi, "").slice(0, 18)}`;
        const shopifyKit = buildShopifySectionKit(cleanContent, fields, {
          sectionId: sectionSlug,
          name: t.name,
        });

        // 1) Per-template master JSON.
        const { error: upErr } = await supabase
          .from("templates")
          .update({ elementor_data: tree })
          .eq("id", t.id);
        if (upErr) throw new Error(`templates.update: ${upErr.message}`);

        // 2) Catalog row (keyed by marketplace id when present, else template id).
        const sourceId = t.source_marketplace_id || t.id;
        const { error: catErr } = await supabase
          .from("elementor_templates")
          .upsert(
            {
              source_template_id: sourceId,
              category: t.schema_type || "General",
              name: t.name,
              elementor_json: tree,
              template_structure: {
                widgetCount: countWidgets(tree),
                sectionCount: tree.length,
              },
              editable_fields: fields,
              default_content: defaults,
              default_limits: limits,
              placeholders: pkg.placeholders,
              image_map: pkg.imageMap,
              responsive_rules: pkg.responsiveRules,
              shopify_section_json: {
                sectionId: shopifyKit.sectionId,
                sectionLiquid: shopifyKit.sectionLiquid,
                template: shopifyKit.template,
                placeholders: shopifyKit.placeholders,
                image_map: shopifyKit.imageMap,
                mappedFields: shopifyKit.mappedFields,
              },
              status: "active",
              version: 1,
            },
            { onConflict: "source_template_id" },
          );
        if (catErr) throw new Error(`catalog.upsert: ${catErr.message}`);

        results.push({ id: t.id, ok: true, widgets: countWidgets(tree), fields: fields.length });
      } catch (e) {
        results.push({ id: t.id, ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    }

    const converted = results.filter((r) => r.ok && !r.skipped).length;
    const skipped = results.filter((r) => r.skipped).length;
    const failed = results.filter((r) => !r.ok).length;

    return new Response(
      JSON.stringify({ total: results.length, converted, skipped, failed, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
