import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { keywords, contentType, language, prompt, type } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // AI Batch Pages mode
    if (type === "batch_pages" && prompt) {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are a professional SEO page generator. Return only a valid JSON array. No markdown fences." },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const text = await response.text();
        console.error("AI gateway error:", response.status, text);
        throw new Error("AI gateway returned an error");
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content ?? "[]";
      return new Response(JSON.stringify({ result: content }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Standard single-template mode
    if (!keywords || (Array.isArray(keywords) && keywords.length === 0)) {
      return new Response(JSON.stringify({ error: "Keywords are required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const kwList = Array.isArray(keywords) ? keywords.join(", ") : keywords;
    const cType = contentType || "seo";

    const systemPrompt = `You are an expert SEO content writer and web designer. Generate a complete, production-ready HTML template that scores 80+ on ALL three metrics: SEO, SEA (paid landing), and GEO (local search).

OUTPUT FORMAT: Raw HTML only. No markdown fences, no explanations. Use {variable_name} for dynamic placeholders.

DESIGN REQUIREMENTS (CRITICAL):
- Use semantic HTML with CSS classes: hero-section, card, feature-card, service-card, grid, features-grid, testimonial, stars, badge, pricing, price, contact-info, btn, cta
- Structure with clear sections: hero area, features/services grid, testimonials, CTA, contact/form section
- Use professional stock images from https://picsum.photos/800/400?random=N (increment N for each image)
- Use responsive grid layouts with class="grid" or class="features-grid" for card-based sections
- Add star ratings in testimonial sections
- Use class="btn cta" on call-to-action links/buttons
- Include a hero section with class="hero-section" or class="hero"

MANDATORY REQUIREMENTS:

SEO: Include <h1> with keyword, 300+ words, <h2>/<h3> subheadings, <img> with alt text, <a> links
SEA: CTA with class="btn cta", <form> for leads, action words, trust signals, pricing
GEO: {city}/{state} variables, address, phone, map reference, hours, "near me" phrases

CONTENT TYPE: "${cType}"
KEYWORDS: ${kwList}
LANGUAGE: ${language || "en"}`;

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
          { role: "user", content: `Generate a high-scoring SEO/SEA/GEO optimized HTML page template for: ${kwList}. Type: "${cType}". All scores above 80.` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI gateway returned an error");
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content ?? "";
    content = content.replace(/^```html?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

    const vars = [...new Set((content.match(/\{([a-z_]+)\}/gi) || []))];
    const primaryKeyword = Array.isArray(keywords) ? keywords[0] : keywords.split(",")[0]?.trim();

    return new Response(
      JSON.stringify({
        content,
        variables: vars,
        seoTitle: `${primaryKeyword} in {city} | {company}`,
        seoDescription: `Looking for ${primaryKeyword} in {city}? {company} offers professional services. Call {phone} for a free quote!`,
        suggestedName: `${primaryKeyword} - AI Content`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-seo-content error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
