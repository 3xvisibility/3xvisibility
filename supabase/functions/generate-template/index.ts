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

DESIGN REQUIREMENTS — make it look like a premium $5,000 landing page:
1. Output ONLY raw HTML. Start with a <style> tag containing all CSS, then the HTML body content. No markdown fences, no explanation.
2. The <style> block MUST include a complete embedded stylesheet scoped to .pgp-page class. Define all styles here — do NOT rely on external stylesheets.
3. Use a modern design system: clean typography, generous whitespace, subtle shadows, smooth hover transitions, gradient accents, rounded corners (12-20px).
4. Typography: Use Google Fonts — import ONE premium font pair (e.g. 'Plus Jakarta Sans', 'DM Sans', 'Outfit', 'Manrope', 'Space Grotesk'). Set font-size with clamp() for fluid responsive sizing.
5. Color palette: Pick a cohesive 3-color palette (primary, accent, neutral) that fits the business type. Use CSS custom properties inside the style block (--pgp-primary, --pgp-accent, --pgp-text, --pgp-bg, --pgp-muted).
6. Layout: Use CSS Grid and Flexbox. Cards in 3-column grid on desktop, single column on mobile. Include proper @media breakpoints at 768px and 480px.
7. Hero section: Full-width gradient or image background, large bold headline, subtitle, and prominent CTA button with hover animation.
8. Cards: White background, subtle border, rounded corners, box-shadow, hover lift effect with transition.
9. CTA buttons: Bold gradient or solid background, rounded, shadow, hover scale/lift effect.
10. Testimonials: Quote styling with star ratings (★), author name, role. Use a subtle background.
11. Contact/form section: Clean inputs with focus states, proper spacing.
12. Add micro-interactions: hover transforms, subtle color transitions on cards and buttons.

CONTENT VARIABLE RULES:
13. Include 3-8 content variables using {variable_name} syntax. Variables must be real DATA fields only: {product_name}, {company_name}, {location}, {price}, {phone}, {email}, {description}, {category}, {brand_name}, {rating}, {address}, {hours}, {website_url}, {service_name}, {tagline}. 
14. ABSOLUTELY NEVER create variables for ANY design/styling properties — no {font_family}, {background_color}, {primary_color}, {text_color}, {font_size}, {border_radius}, {shadow}, {gradient}, {overlay}, {btn_color}, {hero_bg}, etc. All visual styling must be hardcoded in the <style> block using CSS custom properties (--pgp-primary, --pgp-accent, etc.) — NEVER expose them as template {variables}.
15. Variable names must be lowercase_snake_case. NEVER use CSS variables as template variables.
14. For AI-generated unique content per page: {{AI:instruction using {variables}}}
15. For AI-generated images per page: {{AI_IMAGE:description using {variables}}}
16. Include at least one {{AI:...}} block.
17. Use https://picsum.photos/800/400?random=N for placeholder images.

WEBSITE INHERITANCE (CRITICAL):
18. For text properties (font-family, color on h1/h2/h3/p), use "inherit" as the FIRST value in font-family stacks and do NOT set hardcoded colors on .pgp-page h1, h2, h3, p, li — instead let them inherit from the parent website. Only set colors on special elements like hero sections, badges, and buttons.
19. The .pgp-page container should set: font-family: inherit, sans-serif; color: inherit; — so when embedded in a WordPress/Shopify theme, text matches the site's branding automatically.

STRUCTURE:
20. Wrap all content in a <div class="pgp-page"> container.
21. Include: hero section, features/services grid, testimonials, FAQ (use <details>/<summary>), CTA section, contact section.
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
