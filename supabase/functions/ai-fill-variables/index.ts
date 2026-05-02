// On-demand AI fill for unmapped template variables.
// Called from the Variable Mapping step — generates one default value per
// variable using the campaign's business / niche / services context.

import { resolveLanguageName } from "../_shared/languages.ts";
import { aiGenerate, extractAuthToken } from "../_shared/ai-service.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface FillContext {
  business?: string;
  niche?: string;
  service?: string;
}

interface FillSettings {
  tone?: string;
  contentLength?: string;
  language?: string;
}

async function generateAiVarDefaults(
  variables: string[],
  context: FillContext,
  settings: Required<FillSettings>,
): Promise<Record<string, string>> {
  if (variables.length === 0) return {};
  const langName = resolveLanguageName(settings.language);
  const ctxLine = [
    context.business && `Business: ${context.business}`,
    context.niche && `Niche: ${context.niche}`,
    context.service && `Services / products: ${context.service}`,
  ].filter(Boolean).join("\n") || "(no extra context provided — infer reasonable values)";

  const systemPrompt = `You generate default values for template variables of a programmatic SEO page.

CRITICAL LANGUAGE RULE: ALL values MUST be written in ${langName}. This is non-negotiable.
- Translate any English business / niche / services context above into ${langName} before generating.
- Brand names stay in their original form, but every other word MUST be in ${langName}.
- Never mix languages within a single value.

TONE: ${settings.tone}.
Each value must be short, natural, and directly usable as a substitution in HTML. No markdown, no quotes, no labels, no language tags.`;

  const userPrompt = `${ctxLine}

For each variable name below, return a concise, realistic default value that fits the niche/services above, written in ${langName}.
Variables: ${variables.join(", ")}

Return ONLY a JSON object, no prose, no code fences. Example:
{"variable_name": "value in ${langName}", "another": "value in ${langName}"}`;

  const result = await aiGenerate({
      authToken: extractAuthToken(req),
      promptType: "short_content",
    model: "google/gemini-2.5-flash-lite",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  });

  if (!result.success) {
    if (result.content.includes("429") || result.content.includes("Rate limit")) {
      throw new Response(JSON.stringify({
        error: "Rate limit exceeded — please try again in a moment.",
      }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (result.content.includes("402") || result.content.includes("credits")) {
      throw new Response(JSON.stringify({
        error: "AI credits exhausted — top up your workspace usage to continue.",
      }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    console.error("[AI-FILL] generation failed:", result.content);
    return {};
  }

  const cleaned = result.content.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(cleaned); } catch { parsed = {}; }
  const out: Record<string, string> = {};
  for (const v of variables) {
    const val = parsed[v] ?? parsed[v.toLowerCase()];
    if (typeof val === "string" && val.trim()) out[v] = val.trim();
    else if (typeof val === "number" || typeof val === "boolean") out[v] = String(val);
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json() as {
      variables?: string[];
      context?: FillContext;
      settings?: FillSettings;
    };
    const variables = (body.variables || []).filter((v) => typeof v === "string" && v.trim()).slice(0, 50);
    if (variables.length === 0) {
      return new Response(JSON.stringify({ error: "No variables provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ctx = body.context || {};
    if (!ctx.business && !ctx.niche && !ctx.service) {
      return new Response(JSON.stringify({
        error: "Add business, niche, or services context first so the AI knows what to generate.",
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const settings = {
      tone: body.settings?.tone || "professional",
      contentLength: body.settings?.contentLength || "medium",
      language: body.settings?.language || "en",
    };

    try {
      const values = await generateAiVarDefaults(variables, ctx, settings);
      return new Response(JSON.stringify({ values, count: Object.keys(values).length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e) {
      if (e instanceof Response) return e;
      throw e;
    }
  } catch (e) {
    console.error("[AI-FILL] fatal", e);
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : "Unknown error",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
