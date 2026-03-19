import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPPORTED_LANGUAGES: Record<string, string> = {
  en: "English", fr: "French", de: "German", es: "Spanish", it: "Italian",
  pt: "Portuguese", nl: "Dutch", pl: "Polish", sv: "Swedish", da: "Danish",
  ja: "Japanese", ko: "Korean", zh: "Chinese (Simplified)", ar: "Arabic",
  ru: "Russian", tr: "Turkish", hi: "Hindi",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { page_ids, target_language } = await req.json();

    if (!page_ids?.length || !target_language) {
      return new Response(JSON.stringify({ error: "page_ids and target_language are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const langName = SUPPORTED_LANGUAGES[target_language];
    if (!langName) {
      return new Response(JSON.stringify({ error: `Unsupported language: ${target_language}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch pages
    const { data: pages, error: fetchErr } = await supabase
      .from("generated_pages")
      .select("id, title, content, slug, seo_title, seo_description, seo_keywords, campaign_id, website_id, workspace_id, user_id, status")
      .in("id", page_ids);

    if (fetchErr || !pages?.length) {
      return new Response(JSON.stringify({ error: "No pages found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { original_id: string; translated_id: string; title: string }[] = [];
    const errors: { page_id: string; error: string }[] = [];

    for (const page of pages) {
      try {
        const systemPrompt = `You are a professional translator. Translate the following content to ${langName}. 
Rules:
- Preserve all HTML tags and structure exactly
- Translate all visible text content
- Keep URLs, variable placeholders like {variable_name}, and code unchanged
- Maintain the same tone and style
- Return ONLY the translated HTML, no explanations`;

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Title: "${page.title}"\n\nHTML content:\n${page.content}` },
            ],
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            errors.push({ page_id: page.id, error: "Rate limited" });
            continue;
          }
          if (response.status === 402) {
            errors.push({ page_id: page.id, error: "AI credits exhausted" });
            continue;
          }
          errors.push({ page_id: page.id, error: `AI error: ${response.status}` });
          continue;
        }

        const aiResult = await response.json();
        const translatedContent = aiResult.choices?.[0]?.message?.content;
        if (!translatedContent) {
          errors.push({ page_id: page.id, error: "Empty AI response" });
          continue;
        }

        // Also translate title and SEO fields
        const metaResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: `Translate the following metadata fields to ${langName}. Return valid JSON only.` },
              {
                role: "user",
                content: JSON.stringify({
                  title: page.title,
                  seo_title: page.seo_title || "",
                  seo_description: page.seo_description || "",
                  seo_keywords: page.seo_keywords || [],
                }),
              },
            ],
            tools: [{
              type: "function",
              function: {
                name: "translate_metadata",
                description: "Return translated metadata",
                parameters: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    seo_title: { type: "string" },
                    seo_description: { type: "string" },
                    seo_keywords: { type: "array", items: { type: "string" } },
                  },
                  required: ["title", "seo_title", "seo_description", "seo_keywords"],
                  additionalProperties: false,
                },
              },
            }],
            tool_choice: { type: "function", function: { name: "translate_metadata" } },
          }),
        });

        let translatedTitle = page.title + ` [${target_language.toUpperCase()}]`;
        let translatedSeoTitle = page.seo_title;
        let translatedSeoDesc = page.seo_description;
        let translatedKeywords = page.seo_keywords;

        if (metaResponse.ok) {
          const metaResult = await metaResponse.json();
          const toolCall = metaResult.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            try {
              const meta = JSON.parse(toolCall.function.arguments);
              translatedTitle = meta.title || translatedTitle;
              translatedSeoTitle = meta.seo_title || translatedSeoTitle;
              translatedSeoDesc = meta.seo_description || translatedSeoDesc;
              translatedKeywords = meta.seo_keywords?.length ? meta.seo_keywords : translatedKeywords;
            } catch { /* keep defaults */ }
          }
        }

        // Insert translated page as a new page
        const translatedSlug = `${page.slug}-${target_language}`;
        const { data: newPage, error: insertErr } = await supabase
          .from("generated_pages")
          .insert({
            title: translatedTitle,
            slug: translatedSlug,
            content: translatedContent,
            seo_title: translatedSeoTitle,
            seo_description: translatedSeoDesc,
            seo_keywords: translatedKeywords,
            campaign_id: page.campaign_id,
            website_id: page.website_id,
            workspace_id: page.workspace_id,
            user_id: page.user_id,
            status: "pending",
          })
          .select("id")
          .single();

        if (insertErr) {
          errors.push({ page_id: page.id, error: insertErr.message });
          continue;
        }

        results.push({ original_id: page.id, translated_id: newPage.id, title: translatedTitle });
      } catch (e: any) {
        errors.push({ page_id: page.id, error: e.message });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      translated: results.length,
      failed: errors.length,
      results,
      errors,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("translate-content error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
