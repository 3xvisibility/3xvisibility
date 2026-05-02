import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { aiGenerate } from "../_shared/ai-service.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // AI key check removed — aiGenerate handles provider selection internally

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { page_id, instruction, auto_republish } = await req.json();

    if (!page_id) {
      return new Response(JSON.stringify({ error: "page_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the page
    const { data: page, error: pageError } = await supabase
      .from("generated_pages")
      .select("id, title, content, slug, seo_title, seo_description, status, external_id, website_id")
      .eq("id", page_id)
      .maybeSingle();

    if (pageError || !page) {
      return new Response(JSON.stringify({ error: "Page not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve target language from the connected website (locks rewrites to the
    // site's primary language so French sites stay French, etc.).
    let targetLanguage: string | null = null;
    if (page.website_id) {
      try {
        const { data: site } = await supabase
          .from("websites")
          .select("language")
          .eq("id", page.website_id)
          .maybeSingle();
        const siteLang = (site as { language?: string | null } | null)?.language;
        if (typeof siteLang === "string" && siteLang.trim().length > 0) {
          targetLanguage = siteLang.trim();
        }
      } catch (_) { /* non-critical */ }
    }

    const userInstruction = instruction || "Refresh and improve this content while keeping the same structure, topic, and HTML tags. Make it more current, engaging, and SEO-friendly.";

    const languageInstruction = targetLanguage
      ? `\n- CRITICAL: ALL rewritten visible text MUST be written in ${targetLanguage}. If any source text is in another language (e.g. English), translate it into ${targetLanguage}. Never output English unless the target language IS English.`
      : `\n- Keep the visible text in the SAME language as the original page. Detect from the existing content. Never translate to English unless the original is English.`;

    const systemPrompt = `You are an expert content editor and SEO specialist. You rewrite HTML content to make it fresher, more engaging, and better optimized for search engines.

CRITICAL RULES - You MUST follow these exactly:
- Keep ALL CSS classes, IDs, data attributes, and inline styles EXACTLY as they are
- Keep ALL <style> blocks and <!-- STYLES --> sections completely untouched
- Keep the EXACT same HTML structure: same tags, same nesting, same containers
- Keep all <div>, <section>, <article> wrappers and their class names unchanged
- Only rewrite the TEXT CONTENT inside elements (paragraphs, headings, spans, lists)
- Do NOT add, remove, or rename any CSS classes or HTML attributes
- Do NOT change any image sources, links, or media references
- Maintain the same approximate content length per section
- Return ONLY the rewritten HTML content, no explanations
- If the content has classes like "pgp-page", "elementor-*", "wp-*", "shopify-*", preserve them exactly${languageInstruction}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Page title: "${page.title}"\nSlug: "${page.slug}"\n${targetLanguage ? `Target language: ${targetLanguage}\n` : ""}\nInstruction: ${userInstruction}\n\nOriginal HTML content:\n${page.content}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    let rewrittenContent = aiResult.choices?.[0]?.message?.content;

    if (!rewrittenContent) {
      return new Response(JSON.stringify({ error: "AI returned empty content" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Strip markdown fences if AI wrapped the output
    rewrittenContent = rewrittenContent.replace(/^```(?:html)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

    // Update the page with rewritten content
    const { error: updateError } = await supabase
      .from("generated_pages")
      .update({ content: rewrittenContent })
      .eq("id", page_id);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auto-republish if the page was already published and has an external_id
    let republished = false;
    if (auto_republish !== false && page.status === "published" && page.external_id && page.website_id) {
      try {
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const serviceClient = createClient(supabaseUrl, serviceKey);

        // Call publish-pages to update the CMS
        const publishUrl = `${supabaseUrl}/functions/v1/publish-pages`;
        const publishResp = await fetch(publishUrl, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            page_ids: [page_id],
            publish_type: "page",
            website_id: page.website_id,
            // Rewrite-content explicitly changes the body, so design overwrite IS desired here.
            overwrite_design: true,
          }),
        });

        if (publishResp.ok) {
          const publishData = await publishResp.json();
          republished = publishData?.published > 0;
        } else {
          console.error("Auto-republish failed:", await publishResp.text());
        }
      } catch (pubErr) {
        console.error("Auto-republish error:", pubErr);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      page_id,
      original_length: page.content.length,
      rewritten_length: rewrittenContent.length,
      republished,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("rewrite-content error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
