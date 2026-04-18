import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Action = "suggest_name" | "smart_mapping" | "readiness_check" | "optimize_tips" | "suggest_settings";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, context } = await req.json() as {
      action: Action;
      context: Record<string, any>;
    };

    if (!action) {
      return new Response(JSON.stringify({ error: "action is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompts: Record<Action, { system: string; user: string }> = {
      suggest_name: {
        system: `You are a marketing campaign naming expert. Generate 5 concise, professional campaign names based on the context. Return ONLY a JSON array of strings. Each name should be 3-8 words, descriptive, and memorable.`,
        user: `Template: "${context.template_name || ""}"\nData columns: ${(context.csv_headers || []).join(", ")}\nCampaign type: ${context.campaign_type || "seo"}\nLanguage: ${context.language || "en"}\nNiche/Business: ${context.niche || "general"}\nSample data: ${JSON.stringify(context.sample_row || {})}\n\nGenerate 5 campaign name suggestions.`,
      },
      smart_mapping: {
        system: `You are a data mapping expert. Given template variables and CSV column headers, suggest the best mapping. Consider semantic meaning, not just exact matches. Return ONLY a JSON object where keys are template variable names and values are the best matching CSV column name, or null if no good match. Also include a "confidence" object with variable names as keys and "high"/"medium"/"low" as values.`,
        user: `Template variables: ${JSON.stringify(context.template_vars || [])}\nCSV columns: ${JSON.stringify(context.csv_headers || [])}\nSample row: ${JSON.stringify(context.sample_row || {})}\nCampaign type: ${context.campaign_type || "seo"}\n\nSuggest the best mapping.`,
      },
      readiness_check: {
        system: `You are a campaign quality assurance expert. Analyze the campaign configuration and identify issues, warnings, and suggestions. Return ONLY a JSON object with: {"issues": [{"type": "error"|"warning"|"tip", "message": string, "fix": string}], "score": number (0-100), "ready": boolean}`,
        user: `Campaign name: "${context.name || ""}"\nTemplate: "${context.template_name || "None"}"\nData rows: ${context.row_count || 0}\nData columns: ${(context.csv_headers || []).join(", ")}\nMapped variables: ${JSON.stringify(context.mapped_vars || {})}\nUnmapped variables: ${JSON.stringify(context.unmapped_vars || [])}\nCampaign type: ${(context.campaign_types || []).join(", ")}\nWebsite: "${context.website_name || "None"}"\nPublish mode: ${context.publish_mode || "draft"}\nHas SEO title pattern: ${!!context.seo_title_pattern}\nHas SEO desc pattern: ${!!context.seo_description_pattern}\n\nCheck readiness and identify all issues.`,
      },
      optimize_tips: {
        system: `You are an SEO and content optimization expert. Analyze the campaign's generated pages and provide actionable improvement tips. Return ONLY a JSON object: {"tips": [{"category": "seo"|"content"|"performance"|"conversion", "title": string, "description": string, "priority": "high"|"medium"|"low", "action": string}], "overall_grade": "A"|"B"|"C"|"D"|"F"}`,
        user: `Campaign: "${context.name || ""}"\nType: ${(context.campaign_types || []).join(", ")}\nTotal pages: ${context.total_pages || 0}\nPublished: ${context.published_count || 0}\nFailed: ${context.failed_count || 0}\nAvg SEO score: ${context.avg_seo_score || "N/A"}\nSample titles: ${JSON.stringify((context.sample_titles || []).slice(0, 5))}\nSample descriptions: ${JSON.stringify((context.sample_descriptions || []).slice(0, 3))}\nTemplate variables: ${JSON.stringify(context.template_vars || [])}\nHas canonical URLs: ${context.has_canonicals || false}\nHas JSON-LD: ${context.has_jsonld || false}\n\nProvide optimization tips.`,
      },
      suggest_settings: {
        system: `You are a programmatic SEO expert. Based on the campaign context, suggest optimal generation settings. Return ONLY a JSON object: {"publish_mode": "draft"|"published", "generation_method": "all"|"sequential"|"random", "batch_size": number, "seo_title_format": string, "tips": string[]}`,
        user: `Campaign type: ${(context.campaign_types || []).join(", ")}\nData rows: ${context.row_count || 0}\nTemplate: "${context.template_name || ""}"\nWebsite type: ${context.website_type || "unknown"}\nLanguage: ${context.language || "en"}\n\nSuggest optimal settings.`,
      },
    };

    const prompt = prompts[action];
    if (!prompt) {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Cheap model — assistant tips/suggestions don't need a heavy model
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    let content = aiResult.choices?.[0]?.message?.content ?? "";
    content = content.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

    return new Response(
      JSON.stringify({ result: content, action }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("ai-campaign-assistant error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
