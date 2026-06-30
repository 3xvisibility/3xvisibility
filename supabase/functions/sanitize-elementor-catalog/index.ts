// One-shot / repeatable maintenance: re-clean every stored Elementor master in
// public.elementor_templates with the hardened sanitizer, so previously-seeded
// masters that contain malformed markup (the old tokenizer bug) are repaired in
// place. Idempotent — safe to run any number of times.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sanitizeElementorTree } from "../_shared/connectors/elementor-engine.ts";

function coerceTree(json: unknown): any[] {
  if (Array.isArray(json)) return json;
  if (json && typeof json === "object") {
    const o = json as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data as any[];
    if (Array.isArray(o.elements)) return o.elements as any[];
  }
  if (typeof json === "string") {
    try { return coerceTree(JSON.parse(json)); } catch { /* ignore */ }
  }
  return [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: rows, error } = await supabase
      .from("elementor_templates")
      .select("id, source_template_id, elementor_json");
    if (error) throw new Error(error.message);

    let cleaned = 0;
    let changed = 0;
    const failed: Array<{ id: string; error: string }> = [];

    for (const row of rows ?? []) {
      try {
        const tree = coerceTree((row as any).elementor_json);
        if (tree.length === 0) continue;
        const before = JSON.stringify(tree);
        const after = JSON.stringify(sanitizeElementorTree(tree as any));
        cleaned++;
        if (before !== after) {
          const { error: upErr } = await supabase
            .from("elementor_templates")
            .update({ elementor_json: JSON.parse(after) })
            .eq("id", (row as any).id);
          if (upErr) throw new Error(upErr.message);
          changed++;
        }
      } catch (e) {
        failed.push({ id: (row as any).id, error: e instanceof Error ? e.message : String(e) });
      }
    }

    return new Response(JSON.stringify({ scanned: rows?.length ?? 0, cleaned, changed, failed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
