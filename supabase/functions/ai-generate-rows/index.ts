// Edge function: AI-generate CSV-like rows for a template's variables.
import { aiGenerate, extractAuthToken } from "../_shared/ai-service.ts";
import {
  analyzeTemplateBudget,
  analyzeTemplateContentBudget,
  buildBudgetPromptHints,
  enforceRowBudget,
} from "../_shared/template-length-budget.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Body {
  variables: string[];
  count: number;
  business?: string;
  niche?: string;
  service?: string;
  language?: string;
  country?: string;
  /** Original template sample values used to derive per-field length budgets. */
  defaultValues?: Record<string, string>;
  /** Template HTML fallback used when sample values are unavailable. */
  templateContent?: string;
  /** Template Safe Mode: enforce length budgets so content never breaks layout. */
  templateSafeMode?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    const variables = (body.variables || []).filter((v) => typeof v === "string" && v.trim().length > 0);
    const count = Math.min(Math.max(1, Number(body.count) || 10), 200);

    if (variables.length === 0) {
      return new Response(JSON.stringify({ error: "At least one variable is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ctx = [
      body.business ? `Business: ${body.business}` : null,
      body.niche ? `Niche / Industry: ${body.niche}` : null,
      body.service ? `Service / Product: ${body.service}` : null,
      body.country ? `Country: ${body.country}` : null,
      body.language ? `Language for values: ${body.language}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const safeMode = body.templateSafeMode !== false; // default ON
    const sampleBudget = analyzeTemplateBudget(body.defaultValues);
    const budget = Object.keys(sampleBudget).length > 0 ? sampleBudget : analyzeTemplateContentBudget(body.templateContent);
    const budgetHints = safeMode ? buildBudgetPromptHints(budget) : "";

    const systemPrompt = `You generate realistic dataset rows for a programmatic SEO page generator.
Each row must contain ONE value for every requested variable. Values must be:
- Specific, realistic, locally relevant where possible
- DISTINCT ACROSS ROWS for EVERY field — no two rows may share the same value for the same field. This includes headings like hero_title / hero_subtitle / about_title / cta_title / services_title: rewrite each in a completely different phrasing, angle, wording, tone and structure per row.
- Never copy the sample/default values verbatim — treat samples only as a length/style reference, then invent fresh wording.
- Concise: match each template field's original word count; never expand descriptions
- In the requested language
- Plain text only (no markdown, no quotes, no escapes)
${budgetHints ? "\nTEMPLATE SAFE MODE — design integrity is more important than content length. Keep every title/description within the exact listed word and character budget. " + budgetHints + "\n" : ""}Return through the provided tool function, never as free text.`;

    const sampleHint = body.defaultValues && Object.keys(body.defaultValues).length > 0
      ? `\n\nReference sample values (DO NOT COPY — only use them to gauge tone and length; rewrite every field with fresh, distinct wording per row):\n${Object.entries(body.defaultValues).slice(0, 40).map(([k, v]) => `- ${k}: ${String(v).slice(0, 160)}`).join("\n")}`
      : "";

    const userPrompt = `Generate ${count} unique rows.
Variables (column names): ${variables.join(", ")}

Context:
${ctx || "(no extra context — be sensible)"}${sampleHint}

Diversity rules (STRICT):
- For every field, all ${count} rows must have DIFFERENT values. No repeats, no near-duplicates.
- Vary sentence openings, verbs, adjectives and structure between rows.
- Do NOT echo the reference sample values — those are just style/length hints.
Make every row meaningfully different so each generated page is unique.`;

    const tool = {
      type: "function",
      function: {
        name: "emit_rows",
        description: "Return the generated dataset rows.",
        parameters: {
          type: "object",
          properties: {
            rows: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                properties: Object.fromEntries(variables.map((v) => [v, { type: "string" }])),
                required: variables,
                additionalProperties: false,
              },
            },
          },
          required: ["rows"],
          additionalProperties: false,
        },
      },
    };

    const result = await aiGenerate({
      authToken: extractAuthToken(req),
      promptType: "medium_content",
      model: "google/gemini-2.5-flash",
      temperature: 0.95,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [tool],
      tool_choice: { type: "function", function: { name: "emit_rows" } },
    });


    if (!result.success) {
      const statusCode = result.content.includes("429") ? 429 : result.content.includes("402") ? 402 : 500;
      return new Response(JSON.stringify({ error: result.content }), {
        status: statusCode,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse tool call result
    const args = result.content;
    let parsed: any;
    try {
      parsed = typeof args === "string" ? JSON.parse(args) : args;
    } catch {
      return new Response(JSON.stringify({ error: "AI returned invalid rows" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows: Record<string, string>[] = Array.isArray(parsed.rows) ? parsed.rows : [];

    // Coerce all values to strings & ensure every variable is present.
    const normalized = rows.slice(0, count).map((r) => {
      const out: Record<string, string> = {};
      for (const v of variables) out[v] = String(r?.[v] ?? "").trim();
      // Design protection: clamp every field to its template length budget.
      return safeMode ? enforceRowBudget(out, budget) : out;
    });

    // Diversity repair: for each field, detect rows that share the same value
    // (or match the reference sample) and ask the AI to rewrite ONLY those cells
    // with fresh distinct wording. Runs up to 2 passes.
    const norm = (s: string) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
    const findDupFields = (rowsIn: Record<string, string>[]) => {
      const fields: string[] = [];
      for (const v of variables) {
        const seen = new Map<string, number>();
        for (const r of rowsIn) {
          const key = norm(r[v]);
          if (!key) continue;
          seen.set(key, (seen.get(key) || 0) + 1);
        }
        const sampleKey = norm(String(body.defaultValues?.[v] || ""));
        const hasDup = Array.from(seen.values()).some((n) => n > 1);
        const echoesSample = sampleKey && rowsIn.filter((r) => norm(r[v]) === sampleKey).length >= Math.max(2, Math.ceil(rowsIn.length / 2));
        if (hasDup || echoesSample) fields.push(v);
      }
      return fields;
    };

    let final = normalized;
    for (let pass = 0; pass < 2; pass++) {
      const dupFields = findDupFields(final);
      if (dupFields.length === 0) break;
      const repairPrompt = `The following fields have duplicate or sample-echoing values across rows: ${dupFields.join(", ")}.
Rewrite ONLY these fields so every one of the ${final.length} rows has a completely different, freshly-worded value for each listed field. Keep the same length budget.
Return the FULL set of ${final.length} rows with EVERY variable populated (unchanged fields may keep their current value, but must still be returned).
Current rows (JSON):
${JSON.stringify(final)}`;
      const repair = await aiGenerate({
        authToken: extractAuthToken(req),
        promptType: "medium_content",
        model: "google/gemini-2.5-flash",
        temperature: 1.0,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
          { role: "user", content: repairPrompt },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "emit_rows" } },
      });
      if (!repair.success) break;
      let repaired: any;
      try { repaired = typeof repair.content === "string" ? JSON.parse(repair.content) : repair.content; } catch { break; }
      const nextRows: Record<string, string>[] = Array.isArray(repaired?.rows) ? repaired.rows : [];
      if (nextRows.length === 0) break;
      final = nextRows.slice(0, final.length).map((r, i) => {
        const out: Record<string, string> = {};
        for (const v of variables) {
          const nv = String(r?.[v] ?? "").trim();
          out[v] = dupFields.includes(v) && nv ? nv : (final[i]?.[v] ?? nv);
        }
        return safeMode ? enforceRowBudget(out, budget) : out;
      });
    }

    return new Response(JSON.stringify({ rows: final }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-generate-rows error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
