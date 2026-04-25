import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { injectNicheImages } from "../_shared/niche-images.ts";

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
    const { prompt, includeHeaderFooter, platform, niche, businessType, keywords, themeColors, themeFonts, backgroundImage } = await req.json();
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

    // Platform-specific guidance
    const platformRules: Record<string, string> = {
      wordpress: `PLATFORM: WordPress + Elementor.
- Structure each section as <section class="elementor-section elementor-top-section pgp-section"> with inner <div class="elementor-container"> and column wrappers <div class="elementor-column elementor-col-100"> (or 50/33).
- Wrap headings in <h2 class="elementor-heading-title"></h2>, paragraphs in <div class="elementor-widget-text-editor"><p>...</p></div>, buttons in <a class="elementor-button elementor-button-link"><span class="elementor-button-text">...</span></a>, images in <img class="elementor-image"/>.
- This ensures the imported template stays editable inside Elementor's drag-and-drop editor on the client's WordPress site.`,
      shopify: `PLATFORM: Shopify.
- Use semantic HTML compatible with Shopify Online Store 2.0 sections.
- Wrap product placeholders in <div class="product-card"> blocks. Use Shopify-friendly class naming (kebab-case, no Liquid tags).
- Keep markup clean enough that it can be pasted into a Custom Liquid section or Page Template.`,
      prestashop: `PLATFORM: PrestaShop.
- Use Bootstrap-style class names (container, row, col-md-*) since PrestaShop's default theme is Bootstrap-based.
- Keep HTML compatible with the TinyMCE editor used in PrestaShop CMS pages — no inline <script> tags.`,
      generic: `PLATFORM: Universal HTML — keep markup framework-agnostic.`,
    };
    const platformRule = platformRules[platform as string] || platformRules.generic;

    // Theme override: when explicit colors/fonts are provided, force the AI to use them
    // instead of the default "inherit" rule.
    const hasTheme = themeColors && (themeColors.primary || themeColors.background);
    const themeRule = hasTheme
      ? `\n\nTHEME OVERRIDE (HIGHEST PRIORITY — replaces rule 3):
- Use these EXACT colors throughout the design (do NOT use 'inherit' when these are provided):
  • Primary / brand color: ${themeColors.primary || "#2563eb"} — use for CTAs, links, key accents.
  • Accent color: ${themeColors.accent || themeColors.primary || "#2563eb"} — use for secondary highlights.
  • Background color: ${themeColors.background || "#ffffff"} — use as the .pgp-page background.
  • Body text color: ${themeColors.text || "#111827"} — use for paragraphs and default text.
- .pgp-page { background: ${themeColors.background || "#ffffff"}; color: ${themeColors.text || "#111827"}; }
- .pgp-btn-primary { background: ${themeColors.primary || "#2563eb"}; color: #fff; }
- Hero overlay must still darken background images so white text stays readable.
${themeFonts && themeFonts.length ? `- Use "${themeFonts[0]}" as the primary font. If it's a Google Font, add @import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(themeFonts[0]).replace(/%20/g, "+")}:wght@400;600;700;800&display=swap'); at the top of the <style> block.` : ""}`
      : "";


    const systemPrompt = `You are an award-winning senior web designer (think Awwwards / SiteInspire level) specializing in high-converting, visually stunning landing pages for programmatic SEO. Generate a fully responsive, magazine-quality HTML template with an embedded <style> block and {variable} syntax for dynamic content. The output must look like it was crafted by a top design agency — never generic, never AI-looking.

OUTPUT RULES:
1. Output ONLY raw HTML. Start with a <style> tag containing all CSS, then the HTML body content. No markdown fences, no explanation.
2. The <style> block MUST include a complete embedded stylesheet scoped to .pgp-page class so it never conflicts with the host site.
3. CRITICAL — THEME INHERITANCE (so it matches the connected website's color/font when published):
   - .pgp-page: font-family: inherit; color: inherit;
   - h1, h2, h3, h4, p, li, span, a (in body text): color: inherit; font-family: inherit; — NEVER hardcode colors like #333, #000, #2563eb on text elements.
   - Section backgrounds: use transparent, rgba(128,128,128,.04), or rgba(128,128,128,.08) — NEVER solid white (#fff) or solid black, they clash with dark/light host themes.
   - Borders: use rgba(128,128,128,.18) — NEVER hardcoded colors.
   - Accent / CTA buttons: use background: currentColor with color: #fff (so the button picks up the host site's text color as the brand color automatically). Hover: opacity .88, translateY(-2px).
   - On hero/CTA sections that use a dark background image overlay, text inside that section CAN be color: #fff (because the overlay guarantees dark background) — this is the only allowed exception.

HERO SECTION (MUST be stunning — this is the most important part):
4. Hero MUST use a full-width background image with a dark gradient overlay so text is perfectly readable. Use this exact pattern:
   <section class="pgp-hero">
     <div class="pgp-hero-overlay"></div>
     <div class="pgp-hero-content">
       <h1>...headline...</h1>
       <p class="pgp-hero-sub">...subtitle...</p>
       <div class="pgp-hero-cta"><a href="#contact" class="pgp-btn pgp-btn-primary">Primary CTA</a> <a href="#services" class="pgp-btn pgp-btn-ghost">Learn more</a></div>
     </div>
   </section>
   CSS for hero:
   .pgp-hero { position: relative; min-height: clamp(420px, 70vh, 680px); display: flex; align-items: center; justify-content: center; text-align: center; background-image: url('https://picsum.photos/1920/1080?random=1'); background-size: cover; background-position: center; background-attachment: fixed; overflow: hidden; }
   .pgp-hero-overlay { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(0,0,0,.65) 0%, rgba(0,0,0,.45) 100%); z-index: 1; }
   .pgp-hero-content { position: relative; z-index: 2; max-width: 900px; padding: 4rem 1.5rem; color: #fff; }
   .pgp-hero h1 { font-size: clamp(2.2rem, 5vw, 4rem); font-weight: 800; line-height: 1.1; margin: 0 0 1rem; color: #fff; letter-spacing: -.02em; }
   .pgp-hero-sub { font-size: clamp(1rem, 1.4vw, 1.25rem); opacity: .92; margin: 0 0 2rem; color: #fff; }
   .pgp-btn { display: inline-block; padding: .9rem 2rem; border-radius: 999px; font-weight: 600; text-decoration: none; transition: all .25s ease; }
   .pgp-btn-primary { background: currentColor; color: #fff; }
   .pgp-btn-primary span, .pgp-btn-primary { color: #fff; }
   .pgp-btn-ghost { border: 2px solid rgba(255,255,255,.6); color: #fff; }
   .pgp-btn:hover { transform: translateY(-2px); opacity: .9; }

LAYOUT & POLISH:
5. Use CSS Grid + Flexbox. Cards 3-col desktop / 2-col tablet / 1-col mobile. Breakpoints @ 992px, 768px, 480px.
6. Typography: clamp() for fluid sizing. Headings font-weight: 700-800 with letter-spacing: -.01em. Body line-height: 1.7.
7. Generous whitespace: section padding clamp(4rem, 8vw, 7rem) 1.5rem.
8. Cards: subtle background rgba(128,128,128,.05), border rgba(128,128,128,.15), border-radius 16px, padding 2rem, hover: translateY(-4px) + box-shadow 0 12px 32px rgba(0,0,0,.08).
9. Each section MUST have a centered eyebrow label (small uppercase text), an H2 heading, and a short intro paragraph above the grid.
10. Section images: use realistic 16:9 or 4:3 ratios with border-radius: 12px and object-fit: cover.

TESTIMONIALS — MUST be a horizontal scroll carousel (no JS needed, pure CSS):
11. Use this exact structure:
    <section class="pgp-testimonials"><div class="pgp-section-head">...</div>
      <div class="pgp-carousel">
        <article class="pgp-tcard">★★★★★<p>"...quote..."</p><footer><img src="https://i.pravatar.cc/80?img=12" alt=""><div><strong>Name</strong><span>Role</span></div></footer></article>
        <!-- 4 to 6 testimonial cards total -->
      </div>
    </section>
12. CSS: .pgp-carousel { display: flex; gap: 1.5rem; overflow-x: auto; scroll-snap-type: x mandatory; padding: 1rem .5rem 2rem; scrollbar-width: thin; }
    .pgp-tcard { flex: 0 0 min(360px, 85vw); scroll-snap-align: start; background: rgba(128,128,128,.06); border: 1px solid rgba(128,128,128,.15); border-radius: 16px; padding: 2rem; }
    .pgp-tcard footer { display: flex; gap: .75rem; align-items: center; margin-top: 1rem; }
    .pgp-tcard footer img { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; }
13. Use https://i.pravatar.cc/80?img=N (N = 1..70) for testimonial avatars — these are FREE and load fast.

IMAGES — niche-relevant FREE stock photos (no AI credits used):
14. Use https://picsum.photos/<width>/<height>?random=N for ALL stock photos. The backend will automatically replace these with niche-relevant Unsplash photos based on the business type/keywords. Always vary the random=N number so each slot gets a unique image.
15. Include at least 4-6 images across the page (hero bg, feature icons/illustrations, about/team photo, gallery section).

CONTENT VARIABLES:
16. Include 4-8 content variables using {variable_name} (lowercase_snake_case). Real DATA only: {product_name}, {company_name}, {location}, {price}, {phone}, {email}, {description}, {category}, {brand_name}, {rating}, {address}, {hours}, {website_url}, {service_name}, {tagline}.
17. NEVER create variables for design/styling properties (no {font_family}, {primary_color}, etc.).
18. For AI-generated per-page unique copy use {{AI:instruction using {variables}}}. Include at least 2 such blocks (one for hero subtitle/intro, one for the about section).
19. NEVER use {{AI_IMAGE:...}} — always use picsum URLs (rule 14).

REQUIRED SECTIONS (in this order):
20. Wrap everything in <div class="pgp-page">.
21. Sections: (a) Hero with background image + overlay, (b) Trust strip / quick stats, (c) Features or Services grid (3-6 cards with icons or images), (d) About section with side image and text, (e) Gallery / showcase (2-4 images grid), (f) Testimonials carousel, (g) FAQ using <details>/<summary>, (h) Final CTA section with bg image + overlay, (i) Contact section.
${headerFooterRule}

${platformRule}${themeRule}

QUALITY BAR: The result must look like a premium agency-built landing page — clean typography, strong visual hierarchy, beautiful imagery, generous whitespace, smooth hover states. Never amateur, never blocky, never generic.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Cost optimization: use cheaper flash model — sufficient for HTML/CSS template scaffolding
          model: "google/gemini-2.5-flash",
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
          JSON.stringify({ error: "AI credits exhausted. Please top up in Settings → Cloud & AI balance, then try again." }),
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

    // Replace generic placeholder images with niche-relevant AI-generated images
    try {
      content = await injectNicheImages(content, { niche, businessType, keywords }, LOVABLE_API_KEY);
    } catch (imgErr) {
      console.error("Niche image injection failed (non-fatal):", imgErr);
    }

    // Inject background image aspect ratio + focal point overrides so the
    // user's choices reliably apply to every .pgp-hero / .pgp-cta-band block.
    if (backgroundImage && typeof backgroundImage === "object") {
      const aspectDesktop = String(backgroundImage.aspectDesktop || "auto");
      const aspectMobile = String(backgroundImage.aspectMobile || "4/3");
      const fx = Math.max(0, Math.min(100, Number(backgroundImage.focalX ?? 50)));
      const fy = Math.max(0, Math.min(100, Number(backgroundImage.focalY ?? 40)));
      const desktopRule =
        aspectDesktop === "auto"
          ? "min-height: clamp(420px, 70vh, 680px); aspect-ratio: auto;"
          : `aspect-ratio: ${aspectDesktop}; min-height: 0; height: auto;`;
      const mobileRule =
        aspectMobile === "auto"
          ? "min-height: clamp(360px, 80vh, 560px); aspect-ratio: auto;"
          : `aspect-ratio: ${aspectMobile}; min-height: 0; height: auto;`;
      const overrideStyle = `<style data-pgp-bg-override>
.pgp-page .pgp-hero,
.pgp-page .pgp-cta-band,
.pgp-page section[class*="hero"],
.pgp-page section[class*="cta"] {
  background-position: ${fx}% ${fy}% !important;
  background-size: cover !important;
  background-repeat: no-repeat !important;
  ${desktopRule}
  width: 100%;
}
@media (max-width: 768px) {
  .pgp-page .pgp-hero,
  .pgp-page .pgp-cta-band,
  .pgp-page section[class*="hero"],
  .pgp-page section[class*="cta"] {
    ${mobileRule}
    background-attachment: scroll !important;
  }
}
</style>`;
      // Append override at the end so it wins the cascade.
      content = content + "\n" + overrideStyle;
    }

    // Extract variables — only simple {identifier} tokens, skip CSS blocks
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
    const isDesignVar = (v: string) => {
      const c = v.replace(/[{}]/g, "").toLowerCase().trim();
      if (DESIGN_VARS.has(c)) return true;
      if (/[:;]/.test(c)) return true;
      if (/\b(inherit|auto|none|rgba?\(|hsla?\(|transparent|px|rem|em|%)\b/i.test(c)) return true;
      if (/\s/.test(c) && c.length > 20) return true;
      return false;
    };
    // Only match simple {word} tokens — not CSS blocks
    const vars = [...new Set((content.match(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g) || []))]
      .filter((v): v is string => typeof v === "string" && !isDesignVar(v));

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
