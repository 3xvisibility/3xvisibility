// Automatic widget-engine sync.
//
// Converts EVERY template's HTML into fresh native Elementor JSON with the
// current engine and persists it to BOTH templates.elementor_data and the
// elementor_templates catalog — so any widget/layout fix propagates to all
// marketplace templates and connected pages without a manual per-template
// Republish.
//
// Records progress + per-template status into template_backfill_runs /
// template_backfill_items, retries failed conversions, and raises an admin
// notification with a clear reason when conversions fail.
//
// Callable:
//   - manually from the admin panel (supabase.functions.invoke)
//   - on a schedule via pg_cron (trigger_source = "scheduled")

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

const MAX_ATTEMPTS = 3;

function countWidgets(tree: any[]): number {
  let n = 0;
  const walk = (el: any) => {
    if (el.elType === "widget") n++;
    for (const c of el.elements ?? []) walk(c);
  };
  for (const el of tree) walk(el);
  return n;
}

/** True if the converted tree contains any icon-box / icon-list widget. */
function hasIconWidgets(tree: any[]): boolean {
  let found = false;
  const walk = (el: any) => {
    if (found) return;
    if (el.elType === "widget" && (el.widgetType === "icon-box" || el.widgetType === "icon-list")) {
      found = true;
      return;
    }
    for (const c of el.elements ?? []) walk(c);
  };
  for (const el of tree) walk(el);
  return found;
}

function stripAiImagePlaceholders(html: string): string {
  const TOKEN = /\{\{\s*AI_IMAGE[\s\S]*?\}\}/gi;
  return html
    .replace(/<img\b[^>]*\{\{\s*AI_IMAGE[\s\S]*?\}\}[^>]*>/gi, "")
    .replace(/background(-image)?\s*:\s*url\(\s*['"]?\{\{\s*AI_IMAGE[\s\S]*?\}\}['"]?\s*\)\s*;?/gi, "")
    .replace(TOKEN, "");
}

/** Convert + persist a single template. Throws on failure so the caller can retry. */
async function convertTemplate(supabase: any, t: any): Promise<{ widgets: number; fields: number; skipped: boolean }> {
  if (!t.content || typeof t.content !== "string" || !t.content.trim()) {
    throw new Error("no_html_content");
  }

  const cleanContent = stripAiImagePlaceholders(t.content);
  const tree = htmlToElementor(cleanContent);
  if (!tree.length) throw new Error("empty_conversion");

  const fields = extractEditableFields(tree);
  const defaults = defaultContentFor(fields);
  const limits = limitsFor(fields);
  const pkg = buildTemplatePackage(tree, fields);
  const sectionSlug = `lov-${String(t.source_marketplace_id || t.id).replace(/[^a-z0-9]+/gi, "").slice(0, 18)}`;
  const shopifyKit = buildShopifySectionKit(cleanContent, fields, {
    sectionId: sectionSlug,
    name: t.name,
  });

  const { error: upErr } = await supabase
    .from("templates")
    .update({ elementor_data: tree })
    .eq("id", t.id);
  if (upErr) throw new Error(`templates.update: ${upErr.message}`);

  const sourceId = t.source_marketplace_id || t.id;
  const { error: catErr } = await supabase
    .from("elementor_templates")
    .upsert(
      {
        source_template_id: sourceId,
        category: t.schema_type || "General",
        name: t.name,
        elementor_json: tree,
        template_structure: { widgetCount: countWidgets(tree), sectionCount: tree.length },
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

  return { widgets: countWidgets(tree), fields: fields.length, skipped: false };
}

/**
 * Record the connected pages linked to a template (via its campaigns) so admins
 * can see which published/draft pages are affected by this template's re-sync.
 */
async function recordConnectedPages(supabase: any, runId: string, t: any): Promise<number> {
  try {
    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("id")
      .eq("template_id", t.id);
    const campaignIds = (campaigns ?? []).map((c: any) => c.id);
    if (!campaignIds.length) return 0;

    const { data: pages } = await supabase
      .from("generated_pages")
      .select("id, title, slug, status")
      .in("campaign_id", campaignIds);

    const rows = (pages ?? []).map((p: any) => ({
      run_id: runId,
      template_id: t.id,
      template_name: t.name,
      page_id: p.id,
      page_title: p.title,
      page_slug: p.slug,
      page_status: p.status,
      // Published pages hold a snapshot and need a republish; drafts pick up the
      // new engine on next generation. Either way the page is "updated" to point
      // at the freshly-converted template.
      status: "updated",
    }));
    if (rows.length) await supabase.from("template_backfill_page_items").insert(rows);
    return rows.length;
  } catch {
    return 0;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let runId: string | null = null;

  try {
    const body = await req.json().catch(() => ({}));
    const force = body?.force === true;
    // When retry_run_id is provided, only reprocess the templates that FAILED in
    // that run — successful/skipped ones are left untouched.
    const retryRunId = typeof body?.retry_run_id === "string" ? body.retry_run_id : null;
    const triggerSource = retryRunId
      ? "retry"
      : (typeof body?.trigger_source === "string" ? body.trigger_source : "manual");

    // Resolve the calling admin (best-effort, for started_by / notifications).
    let startedBy: string | null = null;
    try {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data } = await supabase.auth.getUser(token);
        startedBy = data?.user?.id ?? null;
      }
    } catch { /* ignore */ }

    let all: any[] = [];

    if (retryRunId) {
      // Only the templates that failed in the referenced run.
      const { data: failedRows, error: failErr } = await supabase
        .from("template_backfill_items")
        .select("template_id")
        .eq("run_id", retryRunId)
        .eq("status", "failed");
      if (failErr) throw new Error(failErr.message);
      const ids = Array.from(new Set((failedRows ?? []).map((r: any) => r.template_id).filter(Boolean)));
      if (ids.length) {
        const { data: templates, error } = await supabase
          .from("templates")
          .select("id, name, content, schema_type, source_marketplace_id, elementor_data, user_id")
          .in("id", ids)
          .order("id", { ascending: true });
        if (error) throw new Error(error.message);
        all = (templates ?? []) as any[];
      }
    } else {
      const { data: templates, error } = await supabase
        .from("templates")
        .select("id, name, content, schema_type, source_marketplace_id, elementor_data, user_id")
        .order("id", { ascending: true });
      if (error) throw new Error(error.message);
      all = (templates ?? []) as any[];
    }

    // Create run header.
    const { data: run, error: runErr } = await supabase
      .from("template_backfill_runs")
      .insert({
        status: "running",
        trigger_source: triggerSource,
        force: retryRunId ? true : force,
        total_templates: all.length,
        started_by: startedBy,
        retry_of_run_id: retryRunId,
      })
      .select("id")
      .single();
    if (runErr) throw new Error(`run.insert: ${runErr.message}`);
    runId = run.id;

    let converted = 0, skipped = 0, failed = 0, processed = 0;
    const failedDetails: Array<{ name: string; error: string }> = [];

    const effectiveForce = force || !!retryRunId;
    for (const t of all) {
      processed++;
      const hasExisting = Array.isArray(t.elementor_data)
        ? t.elementor_data.length > 0
        : !!t.elementor_data;

      if (hasExisting && !effectiveForce) {
        skipped++;
        await supabase.from("template_backfill_items").insert({
          run_id: runId, template_id: t.id, template_name: t.name, status: "skipped", attempts: 0,
        });
        continue;
      }

      // Retry loop.
      let attempt = 0;
      let lastError = "";
      let ok = false;
      let widgets = 0, fields = 0;
      while (attempt < MAX_ATTEMPTS && !ok) {
        attempt++;
        try {
          const res = await convertTemplate(supabase, t);
          widgets = res.widgets;
          fields = res.fields;
          ok = true;
        } catch (e) {
          lastError = e instanceof Error ? e.message : String(e);
          // Non-retryable conditions: bail immediately.
          if (lastError === "no_html_content" || lastError === "empty_conversion") break;
        }
      }

      if (ok) {
        converted++;
        await supabase.from("template_backfill_items").insert({
          run_id: runId, template_id: t.id, template_name: t.name,
          status: "success", attempts: attempt, widgets, fields,
        });
        // Record which connected pages point at this freshly-converted template.
        await recordConnectedPages(supabase, runId, t);
      } else {
        failed++;
        failedDetails.push({ name: t.name || t.id, error: lastError });
        await supabase.from("template_backfill_items").insert({
          run_id: runId, template_id: t.id, template_name: t.name,
          status: "failed", attempts: attempt, error: lastError,
        });
      }

      // Keep run progress live for the admin panel.
      if (processed % 5 === 0 || processed === all.length) {
        await supabase.from("template_backfill_runs")
          .update({ processed, converted, skipped, failed })
          .eq("id", runId);
      }
    }

    await supabase.from("template_backfill_runs")
      .update({
        status: "completed",
        processed, converted, skipped, failed,
        finished_at: new Date().toISOString(),
      })
      .eq("id", runId);

    // Alert admins when conversions failed, with a clear reason.
    if (failed > 0) {
      const reason = failedDetails
        .slice(0, 5)
        .map((f) => `"${f.name}": ${f.error}`)
        .join("; ");
      const message = `Template engine sync finished with ${failed} failed conversion(s) out of ${all.length}. Reasons — ${reason}${failedDetails.length > 5 ? " …and more." : "."}`;

      // Notify every admin.
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      const rows = (admins ?? []).map((a: any) => ({
        user_id: a.user_id,
        title: "Template sync: conversions failed",
        message,
        type: "error",
      }));
      if (rows.length) await supabase.from("notifications").insert(rows);
    }

    return new Response(
      JSON.stringify({ run_id: runId, total: all.length, converted, skipped, failed, failedDetails }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (runId) {
      await supabase.from("template_backfill_runs")
        .update({ status: "failed", error: msg, finished_at: new Date().toISOString() })
        .eq("id", runId);
    }
    return new Response(JSON.stringify({ error: msg, run_id: runId }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
