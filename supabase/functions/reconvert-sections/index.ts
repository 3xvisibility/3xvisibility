// Targeted section reconvert.
//
// Unlike rebox-all / reconvert-template-json (which regenerate the ENTIRE
// template JSON from source HTML), this endpoint only refreshes the FAQ
// (accordion) and/or Testimonial (testimonial + testimonial-carousel) widgets
// inside each selected template's EXISTING stored elementor_data. Every other
// widget, container, layout, spacing and manual edit is left exactly as-is.
//
// How it works per template:
//   1. Reconvert the source HTML with the current engine -> a "fresh" tree.
//   2. Collect the fresh widgets of the requested types, in document order.
//   3. Walk the EXISTING elementor_data and replace each widget of a requested
//      type with the next fresh widget of that same type (matched by order).
//   4. Persist the patched tree back to templates.elementor_data (+ catalog).
//
// If the existing tree has more/fewer target widgets than the fresh one, we
// replace as many as pair up and leave the remainder untouched.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { htmlToElementor } from "../_shared/connectors/elementor-engine.ts";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Remove {{AI_IMAGE}} placeholders so converted JSON only references real images. */
function stripAiImagePlaceholders(html: string): string {
  const TOKEN = /\{\{\s*AI_IMAGE[\s\S]*?\}\}/gi;
  return html
    .replace(/<img\b[^>]*\{\{\s*AI_IMAGE[\s\S]*?\}\}[^>]*>/gi, "")
    .replace(/background(-image)?\s*:\s*url\(\s*['"]?\{\{\s*AI_IMAGE[\s\S]*?\}\}['"]?\s*\)\s*;?/gi, "")
    .replace(TOKEN, "");
}

type El = { elType?: string; widgetType?: string; elements?: El[]; [k: string]: unknown };

/** Collect all widgets whose widgetType is in `types`, in document order. */
function collectWidgets(tree: El[], types: Set<string>): El[] {
  const out: El[] = [];
  const walk = (el: El) => {
    if (el.elType === "widget" && el.widgetType && types.has(el.widgetType)) out.push(el);
    for (const c of el.elements ?? []) walk(c);
  };
  for (const el of tree) walk(el);
  return out;
}

/**
 * Replace each widget of a requested type in `tree` with the next fresh widget
 * of the SAME type (matched by order). Mutates `tree` in place. Returns counts.
 */
function replaceWidgets(tree: El[], fresh: El[], types: Set<string>): { replaced: number; existing: number } {
  // Bucket fresh widgets by type, preserving order, so an accordion only ever
  // replaces an accordion and a testimonial only a testimonial.
  const queues = new Map<string, El[]>();
  for (const w of fresh) {
    const t = w.widgetType!;
    if (!queues.has(t)) queues.set(t, []);
    queues.get(t)!.push(w);
  }
  const cursor = new Map<string, number>();
  let replaced = 0;
  let existing = 0;

  const walk = (el: El) => {
    for (let i = 0; i < (el.elements?.length ?? 0); i++) {
      const child = el.elements![i];
      if (child.elType === "widget" && child.widgetType && types.has(child.widgetType)) {
        existing++;
        const q = queues.get(child.widgetType);
        const idx = cursor.get(child.widgetType) ?? 0;
        if (q && idx < q.length) {
          el.elements![i] = q[idx];
          cursor.set(child.widgetType, idx + 1);
          replaced++;
        }
      } else {
        walk(child);
      }
    }
  };

  // Handle top-level widgets too (tree root is an array).
  const root: El = { elements: tree };
  walk(root);
  return { replaced, existing };
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
    const templateIds: string[] = Array.isArray(body?.template_ids)
      ? body.template_ids.filter((v: unknown) => typeof v === "string")
      : [];
    const sections: string[] = Array.isArray(body?.sections)
      ? body.sections.filter((v: unknown) => typeof v === "string")
      : ["faq", "testimonial"];

    if (templateIds.length === 0) return json({ error: "template_ids is required" }, 400);

    // Map requested section kinds -> Elementor widget types.
    const types = new Set<string>();
    if (sections.includes("faq")) types.add("accordion");
    if (sections.includes("testimonial")) {
      types.add("testimonial");
      types.add("testimonial-carousel");
    }
    if (types.size === 0) return json({ error: "No valid sections requested" }, 400);

    // Platform admin bypasses ownership checks.
    const { data: adminRow } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    const isAdmin = !!adminRow;

    const { data: rows, error: tplErr } = await supabase
      .from("templates")
      .select("id, name, content, elementor_data, source_marketplace_id, workspace_id, user_id")
      .in("id", templateIds);
    if (tplErr) throw new Error(`templates.select: ${tplErr.message}`);

    const results: Array<{ id: string; name: string; ok: boolean; replaced?: number; existing?: number; error?: string }> = [];
    const updatedIds: string[] = [];

    for (const tplRow of (rows || []) as Array<{
      id: string; name: string; content?: string | null; elementor_data?: unknown;
      source_marketplace_id?: string | null; workspace_id?: string | null; user_id?: string | null;
    }>) {
      // Ownership / membership check.
      if (!isAdmin && tplRow.user_id !== user.id) {
        const { data: member } = await supabase
          .from("workspace_members").select("user_id")
          .eq("user_id", user.id).eq("workspace_id", tplRow.workspace_id).maybeSingle();
        if (!member) {
          results.push({ id: tplRow.id, name: tplRow.name, ok: false, error: "forbidden" });
          continue;
        }
      }

      if (!tplRow.content || !tplRow.content.trim()) {
        results.push({ id: tplRow.id, name: tplRow.name, ok: false, error: "no source HTML" });
        continue;
      }
      const existing = tplRow.elementor_data;
      if (!Array.isArray(existing) || existing.length === 0) {
        results.push({ id: tplRow.id, name: tplRow.name, ok: false, error: "no existing Elementor data — run a full reconvert first" });
        continue;
      }

      try {
        const freshTree = htmlToElementor(stripAiImagePlaceholders(tplRow.content)) as El[];
        const freshWidgets = collectWidgets(freshTree, types);

        // Deep-clone the existing tree so we mutate a copy, not the DB object.
        const patched = JSON.parse(JSON.stringify(existing)) as El[];
        const { replaced, existing: existingCount } = replaceWidgets(patched, freshWidgets, types);

        if (existingCount === 0) {
          results.push({ id: tplRow.id, name: tplRow.name, ok: true, replaced: 0, existing: 0 });
          continue;
        }

        const { error: upErr } = await supabase
          .from("templates").update({ elementor_data: patched }).eq("id", tplRow.id);
        if (upErr) throw new Error(upErr.message);

        // Keep the catalog copy in sync when present (best-effort).
        const sourceId = tplRow.source_marketplace_id || tplRow.id;
        await supabase
          .from("elementor_templates")
          .update({ elementor_json: patched })
          .eq("source_template_id", sourceId);

        updatedIds.push(tplRow.id);
        results.push({ id: tplRow.id, name: tplRow.name, ok: true, replaced, existing: existingCount });
      } catch (e) {
        results.push({ id: tplRow.id, name: tplRow.name, ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    }

    const updated = results.filter((r) => r.ok && (r.replaced ?? 0) > 0).length;
    return json({ ok: true, total: results.length, updated, updatedIds, results });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
