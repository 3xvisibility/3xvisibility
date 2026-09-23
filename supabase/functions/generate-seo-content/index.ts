import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { injectNicheImages } from "../_shared/niche-images.ts";
import { aiGenerate, extractAuthToken } from "../_shared/ai-service.ts";

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
    const { keywords, contentType, language, prompt, type, niche, platform } = body;

    // AI Batch Pages mode
    if (type === "batch_pages" && prompt) {
      const result = await aiGenerate({
      authToken: extractAuthToken(req),
      promptType: "seo_optimization",
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a professional SEO page generator. Return only a valid JSON array. No markdown fences." },
          { role: "user", content: prompt },
        ],
      });

      if (!result.success) {
        const statusCode = result.content.includes("429") ? 429 : result.content.includes("402") ? 402 : 500;
        return new Response(JSON.stringify({ error: result.content }),
          { status: statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ result: result.content }),
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

    const systemPrompt = `You are an expert SEO content writer and web designer. Generate a complete, production-ready HTML template that scores 90+ on Rank Math / Yoast SEO, SEA (paid landing), and GEO (local search).

OUTPUT FORMAT: Raw HTML only. No markdown fences, no explanations. Use {variable_name} for dynamic placeholders.

DESIGN REQUIREMENTS:
- Use semantic HTML with CSS classes: hero-section, card, feature-card, service-card, grid, features-grid, testimonial, stars, badge, pricing, price, contact-info, btn, cta
- Structure: hero area, features/services grid, testimonials, FAQ section, CTA, contact/form
- Use professional stock images from https://picsum.photos/800/400?random=N (increment N)
- Use responsive grid layouts with class="grid" or class="features-grid"
- Add star ratings in testimonial sections
- Use class="btn cta" on call-to-action links/buttons
- Include a hero section with class="hero-section" or class="hero"

MANDATORY SEO REQUIREMENTS (Rank Math / Yoast aligned — MUST match engine scoring):
1. EXACTLY ONE <h1> — never zero and never two or more
2. <h1> must contain the exact primary keyword as its first 1-3 words (e.g. "<h1>Lead Generation Paris — ...")
3. 700+ words (tool-measured after tags stripped) — target 800+ to survive connector asset stripping
4. At least 3 <h2> subheadings, sequential hierarchy (H1→H2→H3, never skip levels). At least ONE H2 must contain the exact primary keyword
5. <img> alt with primary keyword (at least 1, all images have alt, none lazy for first image)
6. At least 1 internal link (<a href="/...">) and 1 outbound authoritative link (<a href="https://...">)
7. Keyword density 0.8–2.0% (use keyword 6–10 times naturally in 700+ words). FIRST PARAGRAPH must contain it
8. Every <p> must stay under 130 words — add multiple short paragraphs
9. Transition words (however, additionally, furthermore, therefore, for example) — at least 3 occurrences
10. Active voice — maximum 20% passive sentences
11. JSON-LD BreadcrumbList + WebPage + Organization and, for campaigns, an auto FAQ block (added server-side so do not hand-write FAQPage — the pipeline will generate it from headings)

SEA REQUIREMENTS:
- CTA words: buy, get, shop, order, contact, call, book, reserve, discover, subscribe
- Benefit words in intro: save, fast, easy, reliable, premium, trusted, affordable, results
- Trust signals: trusted, guarantee, certified, proven, rated, verified, satisfaction
- Offer language: free, discount, deal, plan, package, pricing, trial
- Urgency cues: today, now, limited, same-day, fast, instant

GEO REQUIREMENTS:
- Local cues: local, nearby, near you, serving, community, neighborhood, in your area
- Service area language: serving, available in, coverage, throughout, local service
- Availability: open, available, today, same-day, hours, contact us, call us
- Local credibility: trusted locally, local team, area specialists, nearby support
- Use {city}/{state}/{region} variables for dynamic location targeting

CONTENT TYPE: "${cType}"
KEYWORDS: ${kwList}
LANGUAGE: ${language || "en"}
${niche ? `BUSINESS NICHE: ${niche} — tailor copy, tone and visual style to this industry.` : ""}
${platform === "wordpress" ? "PLATFORM: WordPress — wrap each block in a semantic section <section class=\"pgp-section\"><div class=\"pgp-container\">...</div></section> using clean CSS flexbox/grid for columns. The markup MUST stay editable in the WordPress block editor." : ""}
${platform === "shopify" ? "PLATFORM: Shopify — use clean Online Store 2.0 compatible HTML, no Liquid tags, kebab-case classes." : ""}
${platform === "prestashop" ? "PLATFORM: PrestaShop — use Bootstrap container/row/col-md classes, no inline scripts." : ""}`;

    const result = await aiGenerate({
      authToken: extractAuthToken(req),
      promptType: "seo_optimization",
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Generate a high-scoring SEO/SEA/GEO optimized HTML page template for: ${kwList}. Type: "${cType}". REQUIREMENTS FOR 100%:\nAEO: single question in first paragraph answered in sentence two; every H2 phrased as a question users actually ask; FAQ section with 3-6 Q&A pairs; stats/numbers in at least 3 paragraphs (e.g. %, dates, €). GEO: every paragraph answerable in 25-120 words (self-contained). SEO: unified-engine 100% on first generation. Scores above 90.`,
        },
      ],
    });

    if (!result.success) {
      const statusCode = result.content.includes("429") ? 429 : result.content.includes("402") ? 402 : 500;
      return new Response(JSON.stringify({ error: result.content }),
        { status: statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let content = result.content;
    content = content.replace(/^```html?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

    // Replace generic placeholder images with niche-relevant free images
    try {
      const kwString = Array.isArray(keywords) ? keywords.join(", ") : String(keywords || "");
      content = await injectNicheImages(content, { niche, businessType: cType, keywords: kwString }, "unused");
    } catch (imgErr) {
      console.error("Niche image injection failed (non-fatal):", imgErr);
    }

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
