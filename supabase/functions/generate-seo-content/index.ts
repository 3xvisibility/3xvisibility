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

MANDATORY SEO REQUIREMENTS (Rank Math / Yoast aligned):
1. <h1> with the primary keyword in the first 3 words
2. 650+ words minimum of quality content
3. Multiple <h2>/<h3> subheadings — at least ONE must contain the primary keyword
4. <img> tags with alt text containing the primary keyword (at least 1 image)
5. Internal links (at least 1 <a href="/...">) and outbound links (at least 1 <a href="https://...">)
6. Keyword density 0.5-2.5% — use the keyword naturally 4-8 times in 650+ words
7. Short paragraphs (under 150 words each)
8. Transition words: use "however", "additionally", "furthermore", "moreover", "because", "for example", "therefore" (at least 3 occurrences)
9. Active voice predominantly — avoid "is/was/were + verb-ed" passive constructions
10. JSON-LD structured data: include <script type="application/ld+json"> with LocalBusiness or WebPage schema

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
${platform === "wordpress" ? "PLATFORM: WordPress + Elementor — wrap each block in <section class=\"elementor-section pgp-section\"> with .elementor-container and .elementor-column wrappers, headings as .elementor-heading-title, buttons as .elementor-button. The template MUST stay editable inside Elementor." : ""}
${platform === "shopify" ? "PLATFORM: Shopify — use clean Online Store 2.0 compatible HTML, no Liquid tags, kebab-case classes." : ""}
${platform === "prestashop" ? "PLATFORM: PrestaShop — use Bootstrap container/row/col-md classes, no inline scripts." : ""}`;

    const result = await aiGenerate({
      authToken: extractAuthToken(req),
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate a high-scoring SEO/SEA/GEO optimized HTML page template for: ${kwList}. Type: "${cType}". All scores above 80.` },
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
