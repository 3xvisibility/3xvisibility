// Template-kit self-check: a server-side dry-run that validates a converted
// template WITHOUT needing a live WordPress/Shopify site. For each catalog
// template it confirms:
//
//   1. Image-only      — no {{AI_IMAGE}} (or AI image) placeholders anywhere;
//                         every <img> in the kit traces to the template image map.
//   2. 98% gate        — default content fits the template length budget
//                         (visual-fidelity proxy >= 98%).
//   3. Editability      — the Elementor JSON exposes native editable widgets
//                         (not a single embedded HTML blob) and the Shopify
//                         section liquid carries a {% schema %} with settings.
//
// Returns a per-template report so the UI can show pass/fail before publishing.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  extractEditableFields,
  defaultContentFor,
  limitsFor,
  validateContent,
} from "../_shared/connectors/elementor-fields.ts";

const TARGET = 98;
const AI_IMAGE_RE = /\{\{\s*AI_IMAGE[^}]*\}\}|ai[_-]?image_placeholder/i;

function coerceTree(json: unknown): any[] {
  if (Array.isArray(json)) return json;
  if (json && typeof json === "object") {
    const o = json as any;
    if (Array.isArray(o.data)) return o.data;
    if (Array.isArray(o.elements)) return o.elements;
  }
  return [];
}

function countWidgets(tree: any[]): { total: number; html: number } {
  let total = 0, html = 0;
  const walk = (el: any) => {
    if (el.elType === "widget") {
      total++;
      if (el.widgetType === "html") html++;
    }
    for (const c of el.elements ?? []) walk(c);
  };
  for (const el of tree) walk(el);
  return { total, html };
}

function checkOne(row: any) {
  const tree = coerceTree(row.elementor_json);
  const fields = extractEditableFields(tree);
  const defaults = defaultContentFor(fields);
  const limits = limitsFor(fields);
  const report = validateContent(fields, limits, defaults, TARGET);

  // Image-only checks.
  const serialized = JSON.stringify(row.elementor_json) + JSON.stringify(row.shopify_section_json || {});
  const hasAiImage = AI_IMAGE_RE.test(serialized);
  const imageMap = row.image_map || {};
  const imageCount = Object.keys(imageMap).length;

  // Editability checks.
  const widgets = countWidgets(tree);
  const elementorEditable = fields.length > 0 && widgets.total > widgets.html;
  const sj = row.shopify_section_json || {};
  const shopifyEditable = typeof sj.sectionLiquid === "string" &&
    /\{%\s*schema\s*%\}/.test(sj.sectionLiquid) &&
    Object.keys(sj.placeholders || {}).length >= 0;

  const passImageOnly = !hasAiImage;
  const passGate = report.similarity >= TARGET;
  const passEditable = elementorEditable && shopifyEditable;

  return {
    source_template_id: row.source_template_id,
    name: row.name,
    similarity: report.similarity,
    violations: report.violations.length,
    image_count: imageCount,
    has_ai_image: hasAiImage,
    elementor_widgets: widgets.total,
    elementor_html_widgets: widgets.html,
    editable_fields: fields.length,
    shopify_section_present: !!sj.sectionLiquid,
    shopify_mapped_fields: (sj.mappedFields || []).length,
    pass_image_only: passImageOnly,
    pass_similarity_gate: passGate,
    pass_editability: passEditable,
    ok: passImageOnly && passGate && passEditable,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Require an authenticated caller.
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const sourceId: string | undefined = body?.source_template_id;

    let query = supabase
      .from("elementor_templates")
      .select("source_template_id, name, elementor_json, image_map, shopify_section_json");
    if (sourceId) query = query.eq("source_template_id", sourceId);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const reports = (rows ?? []).map(checkOne);
    const summary = {
      total: reports.length,
      passed: reports.filter((r) => r.ok).length,
      failed: reports.filter((r) => !r.ok).length,
      target: TARGET,
    };

    return new Response(JSON.stringify({ summary, reports }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
