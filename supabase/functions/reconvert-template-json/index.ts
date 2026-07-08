// On-demand "Repair / Reconvert" for a single generated page.
//
// Given a page_id, this finds the page's campaign → template, reconverts the
// template's source HTML into fresh native Elementor JSON with the CURRENT
// converter, and persists it to BOTH:
//   - templates.elementor_data (per-template master JSON)
//   - elementor_templates catalog (keyed by source_marketplace_id)
//
// This lets users repair stale/collapsed stored JSON without republishing.
// After reconvert, republishing the page uses the corrected JSON directly.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { htmlToElementor, enforceBoxedContentWidth } from "../_shared/connectors/elementor-engine.ts";
import {
  extractEditableFields,
  defaultContentFor,
  limitsFor,
} from "../_shared/connectors/elementor-fields.ts";
import { buildTemplatePackage } from "../_shared/connectors/elementor-package.ts";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function countWidgets(tree: any[]): number {
  let n = 0;
  const walk = (el: any) => {
    if (el.elType === "widget") n++;
    for (const c of el.elements ?? []) walk(c);
  };
  for (const el of tree) walk(el);
  return n;
}

/** Remove {{AI_IMAGE}} placeholders so stored JSON only references real images. */
function stripAiImagePlaceholders(html: string): string {
  const TOKEN = /\{\{\s*AI_IMAGE[\s\S]*?\}\}/gi;
  return html
    .replace(/<img\b[^>]*\{\{\s*AI_IMAGE[\s\S]*?\}\}[^>]*>/gi, "")
    .replace(/background(-image)?\s*:\s*url\(\s*['"]?\{\{\s*AI_IMAGE[\s\S]*?\}\}['"]?\s*\)\s*;?/gi, "")
    .replace(TOKEN, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const pageId = body?.page_id as string | undefined;
    if (!pageId) return json({ error: "page_id is required" }, 400);

    // Load the page and confirm the caller owns it (or is a platform admin).
    const { data: page } = await supabase
      .from("generated_pages")
      .select("id, user_id, campaign_id, workspace_id, container_width, container_width_tablet, container_width_mobile, gutter_desktop, gutter_tablet, gutter_mobile")
      .eq("id", pageId)
      .maybeSingle();
    if (!page) return json({ error: "Page not found" }, 404);

    if (page.user_id !== user.id) {
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!roleRow) return json({ error: "Forbidden" }, 403);
    }

    if (!page.campaign_id) {
      return json({ error: "This page is not linked to a campaign/template." }, 400);
    }

    const { data: campaign } = await supabase
      .from("campaigns")
      .select("template_id")
      .eq("id", page.campaign_id)
      .maybeSingle();
    const templateId = (campaign as { template_id?: string | null } | null)?.template_id;
    if (!templateId) return json({ error: "No template linked to this page's campaign." }, 400);

    const { data: tpl } = await supabase
      .from("templates")
      .select("id, name, content, schema_type, source_marketplace_id, container_width, container_width_tablet, container_width_mobile, gutter_desktop, gutter_tablet, gutter_mobile")
      .eq("id", templateId)
      .maybeSingle();
    const tplRow = tpl as
      | { id: string; name: string; content?: string | null; schema_type?: string | null; source_marketplace_id?: string | null }
      | null;
    if (!tplRow?.content || !tplRow.content.trim()) {
      return json({ error: "Template has no source HTML to reconvert." }, 400);
    }

    // Reconvert with the current converter.
    const cleanContent = stripAiImagePlaceholders(tplRow.content);
    let tree = htmlToElementor(cleanContent);
    if (!Array.isArray(tree) || tree.length === 0) {
      return json({ error: "Reconversion produced no Elementor elements." }, 422);
    }

    // Enforce the workspace's Elementor-style fixed content width (boxed
    // container) so the persisted JSON already carries centered, boxed content
    // inside full-width sections — matching what publish-pages applies.
    // Priority: page override -> template override -> workspace default.
    // A page/template value of 0 explicitly disables boxing (full width).
    const clampW = (raw: unknown): number => {
      const n = Number(raw);
      if (!Number.isFinite(n) || n <= 0) return 0;
      return Math.min(Math.max(Math.round(n), 320), 1920);
    };
    // Default boxed content width (standard Elementor boxed layout) applied when
    // neither the page, template, nor workspace configures one.
    const DEFAULT_BOX_WIDTH = 1140;
    let containerWidth = DEFAULT_BOX_WIDTH;
    const pageRaw = (page as { container_width?: number | null }).container_width;
    const tplRaw = (tplRow as { container_width?: number | null }).container_width;
    if (pageRaw !== null && pageRaw !== undefined) {
      containerWidth = clampW(pageRaw);
    } else if (tplRaw !== null && tplRaw !== undefined) {
      containerWidth = clampW(tplRaw);
    } else if (page.workspace_id) {
      const { data: ws } = await supabase
        .from("workspaces")
        .select("elementor_container_width")
        .eq("id", page.workspace_id)
        .maybeSingle();
      const raw = (ws as { elementor_container_width?: number } | null)?.elementor_container_width;
      if (typeof raw === "number" && raw > 0) {
        containerWidth = clampW(raw);
      }
    }
    if (containerWidth > 0) {
      const clampG = (raw: unknown): number | null => {
        if (raw === null || raw === undefined) return null;
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) return null;
        return Math.min(Math.round(n), 200);
      };
      const p = page as Record<string, number | null | undefined>;
      const t = tplRow as unknown as Record<string, number | null | undefined>;
      const boxOpts = {
        width: containerWidth,
        widthTablet: p.container_width_tablet ?? t.container_width_tablet ?? null,
        widthMobile: p.container_width_mobile ?? t.container_width_mobile ?? null,
        gutterDesktop: clampG(p.gutter_desktop ?? t.gutter_desktop),
        gutterTablet: clampG(p.gutter_tablet ?? t.gutter_tablet),
        gutterMobile: clampG(p.gutter_mobile ?? t.gutter_mobile),
      };
      try {
        const boxed = enforceBoxedContentWidth(JSON.stringify(tree), boxOpts);
        const parsed = JSON.parse(boxed);
        if (Array.isArray(parsed) && parsed.length > 0) tree = parsed;
      } catch {
        // keep the unboxed tree if enforcement fails
      }
    }

    const fields = extractEditableFields(tree);
    const defaults = defaultContentFor(fields);
    const limits = limitsFor(fields);
    const pkg = buildTemplatePackage(tree, fields);
    const widgets = countWidgets(tree);

    // 1) Persist per-template master JSON.
    const { error: upErr } = await supabase
      .from("templates")
      .update({ elementor_data: tree })
      .eq("id", tplRow.id);
    if (upErr) throw new Error(`templates.update: ${upErr.message}`);

    // 2) Upsert catalog row (keyed by marketplace id when present, else template id).
    const sourceId = tplRow.source_marketplace_id || tplRow.id;
    const { error: catErr } = await supabase
      .from("elementor_templates")
      .upsert(
        {
          source_template_id: sourceId,
          category: tplRow.schema_type || "General",
          name: tplRow.name,
          elementor_json: tree,
          template_structure: { widgetCount: widgets, sectionCount: tree.length },
          editable_fields: fields,
          default_content: defaults,
          default_limits: limits,
          placeholders: pkg.placeholders,
          image_map: pkg.imageMap,
          responsive_rules: pkg.responsiveRules,
          status: "active",
          version: 1,
        },
        { onConflict: "source_template_id" },
      );
    if (catErr) throw new Error(`catalog.upsert: ${catErr.message}`);

    return json({
      ok: true,
      template_id: tplRow.id,
      source_template_id: sourceId,
      widgets,
      fields: fields.length,
      sections: tree.length,
      container_width: containerWidth,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
