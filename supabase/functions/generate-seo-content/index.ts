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
    const { keywords, contentType, language } = await req.json();
    if (!keywords || (Array.isArray(keywords) && keywords.length === 0)) {
      return new Response(JSON.stringify({ error: "Keywords are required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const kwList = Array.isArray(keywords) ? keywords.join(", ") : keywords;
    const type = contentType || "seo"; // seo | sea | geo

    const systemPrompt = `You are an expert SEO content writer and web designer. Generate a complete, production-ready HTML template that scores 80+ on ALL three metrics: SEO, SEA (paid landing), and GEO (local search).

OUTPUT FORMAT: Raw HTML only. No markdown fences, no explanations. Use {variable_name} for dynamic placeholders.

DESIGN REQUIREMENTS (CRITICAL):
- Use semantic HTML with CSS classes: hero-section, card, feature-card, service-card, grid, features-grid, testimonial, stars, badge, pricing, price, contact-info, btn, cta
- Structure with clear sections: hero area, features/services grid, testimonials, CTA, contact/form section
- Use professional stock images from https://picsum.photos/800/400?random=N (increment N for each image)
- Broken image tag example: <img src="https://picsum.photos/800/400?random=1" alt="descriptive alt text">
- Use responsive grid layouts with class="grid" or class="features-grid" for card-based sections
- Add star ratings (★★★★★) in testimonial sections
- Use class="btn cta" on call-to-action links/buttons
- Include a hero section with class="hero-section" or class="hero"
- Design must look professional, modern, and beautiful when published

MANDATORY REQUIREMENTS TO SCORE 80+:

SEO (8 checks — need 7+):
1. Include a compelling <h1> with the primary keyword and a {city}/{location} variable
2. Title length 20-70 chars equivalent
3. Content must be 300+ words
4. Use <h2> and <h3> subheadings with keywords
5. Include <img> tags with descriptive alt="..." attributes containing keywords
6. Include <a href="..."> internal/external links
7. Use descriptive slugs mentioning the keyword
8. Rich, detailed paragraphs

SEA (8 checks — need 7+):
1. Include a CTA link with class="btn cta" — e.g. <a href="tel:{phone}" class="btn cta">Get Free Quote</a>
2. Include a <form> with <input type="email"> or <input type="tel"> for lead capture
3. Use action words in headings: "Get", "Book", "Free", "Save", "Start", "Order"
4. Add trust signals: testimonials section, reviews, ratings with ★ stars, "Certified", "Guarantee"
5. Include pricing/offer section with $ amounts or {price}, "discount", "% off"
6. Keep content focused (300-1500 words)
7. Include images/media
8. Clean URL-friendly structure

GEO (8 checks — need 7+):
1. Include {city}, {state}, {region} in the title and headings
2. Include a street address pattern: "123 Main Street" or {address}
3. Include phone: "Phone: {phone}" or "Call us: {phone}"
4. Add Google Maps embed or "Get Directions" / "map" / "navigate" reference
5. Include LocalBusiness schema or mention "addressLocality", "GeoCoordinates", "latitude"
6. Include opening hours: "Monday-Friday", "Open", "Hours", "Schedule"
7. Location in URL slug pattern
8. Use geo phrases: "near me", "serving {city}", "in the area", "service area"

CONTENT TYPE EMPHASIS: "${type}"
- If SEO: Extra focus on keyword density, headings hierarchy, meta-worthy content
- If SEA: Extra focus on conversion elements, urgency, CTAs, lead forms
- If GEO: Extra focus on local signals, NAP info, map references, service areas

KEYWORDS TO TARGET: ${kwList}

LANGUAGE: ${language || "en"}

Generate comprehensive, unique, professional content. Every section should be detailed with real-value content, not filler text.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Generate a high-scoring SEO/SEA/GEO optimized HTML page template for these keywords: ${kwList}. The content type focus is "${type}". Make sure all three scores (SEO, SEA, GEO) are above 80.`,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI gateway returned an error");
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content ?? "";

    // Strip markdown fences if present
    content = content.replace(/^```html?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

    // Extract variables
    const vars = [...new Set((content.match(/\{([a-z_]+)\}/gi) || []))];

    // Generate suggested SEO patterns
    const primaryKeyword = Array.isArray(keywords) ? keywords[0] : keywords.split(",")[0]?.trim();
    const seoTitle = `${primaryKeyword} in {city} | {company}`;
    const seoDescription = `Looking for ${primaryKeyword} in {city}? {company} offers professional ${primaryKeyword} services. Call {phone} for a free quote today!`;

    return new Response(
      JSON.stringify({
        content,
        variables: vars,
        seoTitle,
        seoDescription,
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
