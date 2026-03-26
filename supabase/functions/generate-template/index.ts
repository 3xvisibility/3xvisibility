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
    const { prompt, includeHeaderFooter } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "A prompt is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const headerFooterRule = includeHeaderFooter
      ? "13. Include a professional header with navigation and a footer with contact info and links."
      : "13. Do NOT include any <header>, <nav>, or <footer> elements — the user's connected website provides those. Only generate the main page body content.";

    const systemPrompt = `You are a professional web designer and template builder for programmatic SEO pages. Given a user description, generate a BEAUTIFUL, responsive HTML template that uses dynamic variables in {variable} syntax (e.g. {product_name}, {location}, {company_name}).

Rules:
1. Output ONLY the raw HTML template content. No markdown fences, no explanation.
2. Use semantic HTML tags (h1, h2, p, ul, li, section, div, etc.) with CSS CLASSES for styling.
3. Use these CSS classes for beautiful styling (a responsive stylesheet is automatically injected):
   - class="hero-section" or class="hero" for hero banners
   - class="grid" or class="features-grid" for responsive card grids
   - class="card" or class="feature-card" or class="service-card" for card containers
   - class="btn cta" for call-to-action buttons/links
   - class="testimonial" for testimonial blocks, with class="stars" for star ratings
   - class="badge" or class="tag" for small labels
   - class="pricing" with class="price" for pricing sections
   - class="contact-info" for contact details
4. Include 3-8 relevant CONTENT variables only. Variables must represent real data fields like {product_name}, {company_name}, {location}, {price}, {phone}, {email}, {description}, {category}, {brand_name}, {rating}, {address}, {hours}, {website_url}. NEVER use CSS or design variables like {--primary}, {--dark}, {--accent}, {--bg}, {--text}, {--shadow}, {--border}, {--font}, {--radius}, {--spacing}. Variable names must be lowercase_snake_case content identifiers only.
5. For sections that should have unique AI-generated content per page, use the syntax {{AI:instruction using {variables}}} — for example: {{AI:Write a paragraph about {product_name} in {location}}}.
6. For sections that should have a unique AI-generated image per page, use the syntax {{AI_IMAGE:description using {variables}}} — for example: {{AI_IMAGE:A professional photo of {product_name} in {location}}}.
7. Include at least one {{AI:...}} block for dynamic content generation.
8. Optionally include one {{AI_IMAGE:...}} block for a hero or section image.
9. Use professional stock images from https://picsum.photos/800/400?random=N (increment N for different images) for placeholder images.
10. Include a hero section, features/services grid with cards, testimonials with ★★★★★ ratings, a CTA section, and a contact form.
11. Include meta-relevant elements like a main heading (h1), subheadings (h2), and descriptive paragraphs.
12. The template must look PROFESSIONAL and MODERN when published — like a real business landing page. Use inline styles or class-based CSS only — never use CSS custom properties as template variables.
${headerFooterRule}`;

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
            { role: "user", content: prompt },
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

    // Suggest a name from the prompt
    const nameMatch = prompt.match(/for\s+(?:a\s+)?(.+?)(?:\s+company|\s+business|\s+website|\s+page)?\.?$/i);
    const suggestedName = nameMatch
      ? nameMatch[1].replace(/\b\w/g, (c: string) => c.toUpperCase()).slice(0, 60)
      : "AI Generated Template";

    return new Response(
      JSON.stringify({ content, variables: vars, suggestedName }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-template error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
