// Seed / refresh the stored Elementor template catalog.
//
// Accepts a batch of HTML marketplace templates, converts each to native
// Elementor JSON, extracts the editable-field map + defaults + length limits,
// and upserts a row in public.elementor_templates. Publishing later loads these
// rows directly — no HTML conversion at publish time.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod";
import { htmlToElementor } from "../_shared/connectors/elementor-engine.ts";
import {
  extractEditableFields,
  defaultContentFor,
  limitsFor,
} from "../_shared/connectors/elementor-fields.ts";

const InputSchema = z.object({
  templates: z
    .array(
      z.object({
        sourceTemplateId: z.string().min(1),
        name: z.string().min(1),
        category: z.string().default("General"),
        previewImage: z.string().optional(),
        html: z.string().min(1),
      }),
    )
    .min(1)
    .max(100),
});

function countWidgets(tree: any[]): number {
  let n = 0;
  const walk = (el: any) => {
    if (el.elType === "widget") n++;
    for (const c of el.elements ?? []) walk(c);
  };
  for (const el of tree) walk(el);
  return n;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const parsed = InputSchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const results: Array<{ id: string; ok: boolean; widgets?: number; fields?: number; error?: string }> = [];

    for (const t of parsed.data.templates) {
      try {
        const tree = htmlToElementor(t.html);
        const fields = extractEditableFields(tree);
        const defaults = defaultContentFor(fields);
        const limits = limitsFor(fields);

        const { error } = await supabase
          .from("elementor_templates")
          .upsert(
            {
              source_template_id: t.sourceTemplateId,
              category: t.category,
              name: t.name,
              preview_image: t.previewImage ?? null,
              elementor_json: tree,
              template_structure: { widgetCount: countWidgets(tree), sectionCount: tree.length },
              editable_fields: fields,
              default_content: defaults,
              default_limits: limits,
            },
            { onConflict: "source_template_id" },
          );

        if (error) throw new Error(error.message);
        results.push({ id: t.sourceTemplateId, ok: true, widgets: countWidgets(tree), fields: fields.length });
      } catch (e) {
        results.push({ id: t.sourceTemplateId, ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    }

    const seeded = results.filter((r) => r.ok).length;
    return new Response(JSON.stringify({ seeded, total: results.length, results }), {
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
