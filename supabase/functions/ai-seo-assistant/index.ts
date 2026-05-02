import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { aiGenerate, extractAuthToken } from "../_shared/ai-service.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Action = "titles" | "meta" | "headings" | "body" | "faq" | "keywords" | "full_rewrite";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { page_id, action, instruction, context } = (await req.json()) as {
      page_id: string;
      action: Action;
      instruction?: string;
      context?: { campaign_name?: string; keywords?: string[]; language?: string };
    };

    if (!page_id || !action) {
      return new Response(JSON.stringify({ error: "page_id and action are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch page
    const { data: page, error: pageErr } = await supabase
      .from("generated_pages")
      .select("id, title, slug, content, seo_title, seo_description, seo_keywords, campaign_id")
      .eq("id", page_id)
      .maybeSingle();

    if (pageErr || !page) {
      return new Response(JSON.stringify({ error: "Page not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lang = context?.language || "en";
    const kw = context?.keywords?.join(", ") || page.seo_keywords?.join(", ") || "";
    const campaignCtx = context?.campaign_name ? `Campaign: "${context.campaign_name}".` : "";
    const userNote = instruction ? `\nUser instruction: ${instruction}` : "";

    const contentSnippet = (page.content || "").slice(0, 3000);

    const designPreservationRule = `\nCRITICAL: You MUST preserve ALL CSS classes, IDs, data attributes, inline styles, <style> blocks, and <!-- STYLES --> sections EXACTLY as they are. Do NOT add, remove, or rename any CSS classes or HTML attributes. Only change the TEXT CONTENT inside elements. Keep all structural wrappers (div, section, article) and their class names unchanged. Preserve classes like "pgp-page", "elementor-*", "wp-*", "shopify-*" exactly.`;

    const prompts: Record<Action, { system: string; user: string }> = {
      titles: {
        system: `You are an expert SEO copywriter. Generate 5 optimized title variations for a web page. Each title must be 20-70 characters. Include the primary keyword naturally. Return ONLY a JSON array of strings.`,
        user: `Page: "${page.title}"\nKeywords: ${kw}\n${campaignCtx}${userNote}\nLanguage: ${lang}\n\nGenerate 5 SEO-optimized title variations.`,
      },
      meta: {
        system: `You are an expert SEO copywriter. Generate 3 meta description variations for a web page. Each must be 120-160 characters, include a call to action, and use the primary keyword. Return ONLY a JSON object: {"descriptions": string[], "suggested_title": string}`,
        user: `Title: "${page.seo_title || page.title}"\nCurrent meta: "${page.seo_description || ""}"\nKeywords: ${kw}\n${campaignCtx}${userNote}\nLanguage: ${lang}`,
      },
      headings: {
        system: `You are an SEO content editor. Rewrite ONLY the headings (h1, h2, h3) text to be more keyword-rich, engaging, and SEO-optimized. Return the FULL HTML with improved heading text. Keep ALL other content, classes, styles, and structure unchanged.${designPreservationRule}`,
        user: `Keywords: ${kw}\n${campaignCtx}${userNote}\nLanguage: ${lang}\n\nHTML:\n${contentSnippet}`,
      },
      body: {
        system: `You are an expert content writer. Rewrite the body TEXT content to be more engaging, SEO-optimized, and comprehensive. Add relevant details, improve readability, and naturally incorporate keywords. Return the FULL updated HTML.${designPreservationRule}`,
        user: `Title: "${page.title}"\nKeywords: ${kw}\n${campaignCtx}${userNote}\nLanguage: ${lang}\n\nHTML:\n${contentSnippet}`,
      },
      faq: {
        system: `You are an SEO content specialist. Generate a FAQ section in HTML format with 5-7 relevant questions and answers based on the page content and keywords. Use <div class="faq-section"> with <details>/<summary> tags for each Q&A. Include schema-friendly markup. Return ONLY the HTML.`,
        user: `Title: "${page.title}"\nKeywords: ${kw}\n${campaignCtx}${userNote}\nLanguage: ${lang}\n\nPage context:\n${contentSnippet.slice(0, 1500)}`,
      },
      keywords: {
        system: `You are an SEO keyword researcher. Analyze the page content and suggest relevant keywords. Return ONLY a JSON object: {"primary": string[], "secondary": string[], "long_tail": string[], "lsi": string[]}. Each array should have 3-5 items.`,
        user: `Title: "${page.title}"\nCurrent keywords: ${kw}\n${campaignCtx}${userNote}\nLanguage: ${lang}\n\nContent:\n${contentSnippet.slice(0, 2000)}`,
      },
      full_rewrite: {
        system: `You are an expert SEO content editor. Fully rewrite the page TEXT content to be fresher, more engaging, better structured, and more SEO-optimized. Maintain the same topic. Return the FULL rewritten HTML.${designPreservationRule}`,
        user: `Title: "${page.title}"\nKeywords: ${kw}\n${campaignCtx}${userNote}\nLanguage: ${lang}\n\nHTML:\n${contentSnippet}`,
      },
    };

    const prompt = prompts[action];

    const result = await aiGenerate({
      model: action === "full_rewrite" || action === "rewrite" as any
        ? "google/gemini-3-flash-preview"
        : "google/gemini-2.5-flash-lite",
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
    });

    if (!result.success) {
      const statusCode = result.content.includes("Rate limit") || result.content.includes("429") ? 429
        : result.content.includes("credits") || result.content.includes("402") ? 402 : 500;
      return new Response(JSON.stringify({ error: result.content }), {
        status: statusCode,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let content = result.content;
    // Strip markdown fences
    content = content.replace(/^```(?:json|html)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

    // Log AI action in audit_logs
    const workspaceId = (
      await supabase.from("generated_pages").select("workspace_id").eq("id", page_id).single()
    ).data?.workspace_id;

    if (workspaceId) {
      await supabase.from("audit_logs").insert({
        workspace_id: workspaceId,
        user_id: user.id,
        action: `ai_seo_${action}`,
        entity_type: "generated_page",
        entity_id: page_id,
        details: { action, source: "ai", instruction: instruction || null },
      });
    }

    return new Response(
      JSON.stringify({ result: content, action, page_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("ai-seo-assistant error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
