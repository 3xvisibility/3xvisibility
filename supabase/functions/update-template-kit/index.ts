// Persist per-template kit edits (placeholder mappings + character/word limits)
// made in the Template Kit editor UI. The catalog (elementor_templates) is a
// global read-only table for clients, so writes go through this service-role
// function, gated to authenticated users.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

interface Budget { maxWords: number; maxChars: number; maxLines?: number }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

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
    if (!sourceId || typeof sourceId !== "string") {
      return new Response(JSON.stringify({ error: "source_template_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const update: Record<string, unknown> = {};

    // Validated, sanitized limit map: { fieldKey: { maxWords, maxChars } }.
    if (body.default_limits && typeof body.default_limits === "object") {
      const clean: Record<string, Budget> = {};
      for (const [k, v] of Object.entries(body.default_limits as Record<string, any>)) {
        const mw = Number(v?.maxWords);
        const mc = Number(v?.maxChars);
        if (Number.isFinite(mw) && Number.isFinite(mc) && mw > 0 && mc > 0) {
          clean[k] = { maxWords: Math.min(mw, 500), maxChars: Math.min(mc, 5000) };
        }
      }
      update.default_limits = clean;
    }

    // Optional placeholder remap: { "{{TOKEN}}": "field_key" }.
    if (body.placeholders && typeof body.placeholders === "object") {
      const clean: Record<string, string> = {};
      for (const [k, v] of Object.entries(body.placeholders as Record<string, any>)) {
        if (typeof v === "string" && v.trim()) clean[k] = v.trim();
      }
      update.placeholders = clean;
    }

    if (Object.keys(update).length === 0) {
      return new Response(JSON.stringify({ error: "nothing to update" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error } = await supabase
      .from("elementor_templates")
      .update(update)
      .eq("source_template_id", sourceId);
    if (error) throw new Error(error.message);

    return new Response(JSON.stringify({ ok: true, updated: Object.keys(update) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
