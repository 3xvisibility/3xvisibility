// Bulk "Reconvert + Rebox" for every template owned by the caller's workspace(s).
//
// For each template that has source HTML, this reconverts it into fresh native
// Elementor JSON with the CURRENT converter and enforces the boxed content-width
// layout: every section becomes a FULL-WIDTH main container whose inner content
// is wrapped in a centered boxed container (default 1140px — Elementor's default
// content width) so backgrounds bleed edge-to-edge while content stays boxed.
//
// Persists to BOTH templates.elementor_data and the elementor_templates catalog.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { htmlToElementor, enforceBoxedContentWidth } from "../_shared/connectors/elementor-engine.ts";
import {
  extractEditableFields,
  defaultContentFor,
  limitsFor,
} from "../_shared/connectors/elementor-fields.ts";
import { buildTemplatePackage } from "../_shared/connectors/elementor-package.ts";

// Elementor's default boxed content width.
const DEFAULT_BOX_WIDTH = 1140;

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

const clampW = (raw: unknown): number => {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(Math.max(Math.round(n), 320), 1920);
};

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
    const workspaceId = (body?.workspace_id as string | undefined) || null;

    // Cache workspace default width lookups.
    const wsWidthCache = new Map<string, number>();
    const resolveWsWidth = async (wsId: string | null | undefined): Promise<number> => {
      if (!wsId) return DEFAULT_BOX_WIDTH;
      if (wsWidthCache.has(wsId)) return wsWidthCache.get(wsId)!;
      let width = DEFAULT_BOX_WIDTH;
      try {
        const { data: ws } = await supabase
          .from("workspaces")
          .select("elementor_container_width")
          .eq("id", wsId)
          .maybeSingle();
        const raw = (ws as { elementor_container_width?: number } | null)?.elementor_container_width;
        width = typeof raw === "number" && raw > 0 ? raw : DEFAULT_BOX_WIDTH;
      } catch {
        width = DEFAULT_BOX_WIDTH;
      }
      wsWidthCache.set(wsId, width);
      return width;
    };

    // Load candidate templates. Scope to the caller's own templates (and the
    // requested workspace when provided).
    let query = supabase
      .from("templates")
      .select("id, name, content, schema_type, source_marketplace_id, container_width, container_width_tablet, container_width_mobile, gutter_desktop, gutter_tablet, gutter_mobile, workspace_id, user_id");
    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    } else {
      query = query.eq("user_id", user.id);
    }
    const { data: templates, error: tplErr } = await query;
    if (tplErr) throw new Error(`templates.select: ${tplErr.message}`);

    const rows = (templates || []) as Array<{
      id: string;
      name: string;
      content?: string | null;
      schema_type?: string | null;
      source_marketplace_id?: string | null;
      container_width?: number | null;
      container_width_tablet?: number | null;
      container_width_mobile?: number | null;
      gutter_desktop?: number | null;
      gutter_tablet?: number | null;
      gutter_mobile?: number | null;
      workspace_id?: string | null;
      user_id?: string | null;
    }>;

    const results: Array<{ id: string; name: string; ok: boolean; widgets?: number; width?: number; error?: string }> = [];
    let updated = 0;

    for (const tplRow of rows) {
      // Only the owner (or a platform admin) may rebox. When workspace-scoped,
      // ensure the caller is a member.
      if (tplRow.user_id !== user.id) {
        const { data: roleRow } = await supabase
          .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
        if (!roleRow) {
          const { data: member } = await supabase
            .from("workspace_members").select("user_id")
            .eq("user_id", user.id).eq("workspace_id", tplRow.workspace_id).maybeSingle();
          if (!member) {
            results.push({ id: tplRow.id, name: tplRow.name, ok: false, error: "forbidden" });
            continue;
          }
        }
      }

      if (!tplRow.content || !tplRow.content.trim()) {
        results.push({ id: tplRow.id, name: tplRow.name, ok: false, error: "no source HTML" });
        continue;
      }

      try {
        const cleanContent = stripAiImagePlaceholders(tplRow.content);
        let tree = htmlToElementor(cleanContent);
        if (!Array.isArray(tree) || tree.length === 0) {
          results.push({ id: tplRow.id, name: tplRow.name, ok: false, error: "empty conversion" });
          continue;
        }

        // Resolve width: template override -> workspace default -> 1140.
        let containerWidth = DEFAULT_BOX_WIDTH;
        if (tplRow.container_width !== null && tplRow.container_width !== undefined) {
          containerWidth = clampW(tplRow.container_width) || DEFAULT_BOX_WIDTH;
        } else {
          containerWidth = await resolveWsWidth(tplRow.workspace_id);
        }
        if (containerWidth > 0) {
          const clampG = (raw: unknown): number | null => {
            if (raw === null || raw === undefined) return null;
            const n = Number(raw);
            if (!Number.isFinite(n) || n < 0) return null;
            return Math.min(Math.round(n), 200);
          };
          try {
            const boxed = enforceBoxedContentWidth(JSON.stringify(tree), {
              width: containerWidth,
              widthTablet: tplRow.container_width_tablet ?? null,
              widthMobile: tplRow.container_width_mobile ?? null,
              gutterDesktop: clampG(tplRow.gutter_desktop),
              gutterTablet: clampG(tplRow.gutter_tablet),
              gutterMobile: clampG(tplRow.gutter_mobile),
            });
            const parsed = JSON.parse(boxed);
            if (Array.isArray(parsed) && parsed.length > 0) tree = parsed;
          } catch {
            // keep unboxed tree on failure
          }
        }

        const fields = extractEditableFields(tree);
        const defaults = defaultContentFor(fields);
        const limits = limitsFor(fields);
        const pkg = buildTemplatePackage(tree, fields);
        const widgets = countWidgets(tree);

        const { error: upErr } = await supabase
          .from("templates").update({ elementor_data: tree }).eq("id", tplRow.id);
        if (upErr) throw new Error(upErr.message);

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
        if (catErr) throw new Error(`catalog: ${catErr.message}`);

        updated++;
        results.push({ id: tplRow.id, name: tplRow.name, ok: true, widgets, width: containerWidth });
      } catch (e) {
        results.push({ id: tplRow.id, name: tplRow.name, ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    }

    const reboxedIds = results.filter((r: any) => r.ok).map((r: any) => r.id);
    return json({ ok: true, total: rows.length, updated, reboxedIds, results });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
