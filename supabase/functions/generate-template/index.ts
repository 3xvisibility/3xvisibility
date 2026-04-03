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

    const systemPrompt = `You are a world-class web designer specializing in high-converting landing pages for programmatic SEO. Generate a stunning, fully responsive HTML template with embedded <style> block and {variable} syntax for dynamic content.

DESIGN REQUIREMENTS — professional, theme-adaptive:
1. Output ONLY raw HTML. Start with a <style> tag containing all CSS, then the HTML body content. No markdown fences, no explanation.
2. The <style> block MUST include a complete embedded stylesheet scoped to .pgp-page class.
3. CRITICAL — THEME INHERITANCE: The template will be embedded inside the client's existing website (WordPress, Shopify, PrestaShop). All text styling MUST inherit from the host site:
   - .pgp-page: font-family: inherit; color: inherit;
   - h1, h2, h3, h4, p, li, span: color: inherit; font-family: inherit; — NEVER hardcode colors like #333, #000, #2563eb on text elements.
   - Links: color: inherit or currentColor — not hardcoded blue.
   - Backgrounds: use transparent, rgba(128,128,128,.04), or rgba(128,128,128,.08) — NEVER white (#fff) as it clashes with dark themes.
   - Borders: use rgba(128,128,128,.2) — NEVER hardcoded colors.
   - Buttons: use background: currentColor with color: #fff for the text, or a very subtle background.
4. Layout: Use CSS Grid and Flexbox. Cards in 3-column grid on desktop, single column on mobile. @media breakpoints at 768px and 480px.
5. Typography: Use clamp() for fluid responsive sizing. Do NOT import Google Fonts — the host site already has its own fonts.
6. Spacing: Generous whitespace, clean sections, professional structure.
7. Cards: transparent background, subtle border (rgba), rounded corners, hover effect.
8. Hero: subtle background tint using rgba, large headline, subtitle, CTA.
9. CTA buttons: padding, border-radius, font-weight 600, hover opacity change.
10. Testimonials: subtle background, quote marks, star ratings.
11. FAQ: Use <details>/<summary> elements.

CONTENT VARIABLE RULES:
12. Include 3-8 content variables using {variable_name} syntax. Variables must be real DATA fields only: {product_name}, {company_name}, {location}, {price}, {phone}, {email}, {description}, {category}, {brand_name}, {rating}, {address}, {hours}, {website_url}, {service_name}, {tagline}. 
13. ABSOLUTELY NEVER create variables for ANY design/styling properties — no {font_family}, {background_color}, {primary_color}, {text_color}, etc. All visual styling must be hardcoded in CSS.
14. Variable names must be lowercase_snake_case.
15. For AI-generated unique content per page: {{AI:instruction using {variables}}}
16. For AI-generated images per page: {{AI_IMAGE:description using {variables}}}
17. Include at least one {{AI:...}} block.
18. Use https://picsum.photos/800/400?random=N for placeholder images.

STRUCTURE:
19. Wrap all content in a <div class="pgp-page"> container.
20. Include: hero section, features/services grid, testimonials, FAQ (use <details>/<summary>), CTA section, contact section.
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

    // Extract variables — filter out design/CSS-related ones
    const DESIGN_VARS = new Set([
      "font_family","font_size","font_weight","font_color","font_style",
      "text_color","text_size","text_weight","text_transform","text_align",
      "background","background_color","background_image","background_gradient",
      "bg_color","bg_image","bg_gradient",
      "primary_color","accent_color","secondary_color","color","heading_color",
      "border_color","border_radius","border_width","border_style",
      "shadow","box_shadow","text_shadow",
      "margin","padding","gap","spacing",
      "width","height","max_width","min_height",
      "opacity","z_index","display","position",
      "line_height","letter_spacing","word_spacing",
      "gradient","overlay","overlay_color","overlay_opacity",
      "radius","rounded","transition","animation",
      "icon_color","icon_size","btn_color","btn_bg","button_color","button_bg",
      "header_bg","footer_bg","section_bg","card_bg","hero_bg",
      "link_color","hover_color",
    ]);
    const vars = [...new Set((content.match(/\{([a-z_]+)\}/gi) || []))]
      .filter(v => !DESIGN_VARS.has(v.replace(/[{}]/g, "").toLowerCase()));

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
