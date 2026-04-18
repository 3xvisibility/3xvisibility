// Edge function: AI-generate CSV-like rows for a template's variables.
// Input: { variables: string[], count: number, business?, niche?, service?, language?, country? }
// Output: { rows: Record<string,string>[] }

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }), {
        status: 500,
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

    const systemPrompt = `You generate realistic dataset rows for a programmatic SEO page generator.
Each row must contain ONE value for every requested variable. Values must be:
- Specific, realistic, locally relevant where possible
- Distinct across rows (no duplicates)
- Concise: short fields = 1-5 words, long fields (description/excerpt) = 1-2 sentences
- In the requested language
- Plain text only (no markdown, no quotes, no escapes)
Return through the provided tool function, never as free text.`;

    const userPrompt = `Generate ${count} unique rows.
Variables (column names): ${variables.join(", ")}

Context:
${ctx || "(no extra context — be sensible)"}

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

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "emit_rows" } },
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResp.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("AI gateway error", aiResp.status, txt);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await aiResp.json();
    const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments;
    if (!args) {
      return new Response(JSON.stringify({ error: "AI returned no rows" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = typeof args === "string" ? JSON.parse(args) : args;
    const rows: Record<string, string>[] = Array.isArray(parsed.rows) ? parsed.rows : [];

    // Coerce all values to strings & ensure every variable is present.
    const normalized = rows.slice(0, count).map((r) => {
      const out: Record<string, string> = {};
      for (const v of variables) out[v] = String(r?.[v] ?? "").trim();
      return out;
    });

    return new Response(JSON.stringify({ rows: normalized }), {
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
