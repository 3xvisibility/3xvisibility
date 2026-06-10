import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { injectNicheImages } from "../_shared/niche-images.ts";
import { aiGenerate } from "../_shared/ai-service.ts";

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

    // PrestaShop is not available yet (Coming Soon) — block on every plan.
    if (platform === "prestashop") {
      return new Response(JSON.stringify({ error: "PrestaShop is coming soon and not available yet. Please choose another platform." }), {
        status: 403,
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

    // ─── DESIGN DIRECTION PLAYBOOK ──────────────────────────────────────────
    // Each generation randomly picks ONE bold aesthetic so two pages never
    // look the same. Inspired by Awwwards/SiteInspire winners and Lovable
    // landing pages.
    const DESIGN_DIRECTIONS = [
      {
        name: "Aurora Glass",
        vibe: "Glassmorphism with animated aurora gradient mesh background. Frosted-glass cards (backdrop-filter:blur(24px)), soft pastel glows (indigo→fuchsia→cyan), 3+ floating animated orb decorations behind content.",
        palette: "Aurora gradients #6366f1 → #8b5cf6 → #d946ef → #06b6d4. Cards: linear-gradient(145deg,rgba(255,255,255,.08),rgba(255,255,255,.02)) + backdrop-blur.",
        hero: "Full-bleed hero, multi-layered conic + radial gradient mesh bg, 3 floating animated blobs, centered glass card with the headline floating on top.",
      },
      {
        name: "Neon Brutalist",
        vibe: "Bold brutalist layout. Thick black borders (3px solid), hard offset shadows (8px 8px 0 #000), oversized display typography, neon accent splashes on near-black.",
        palette: "Background near-black #0a0a0a, text white, neon accents #c4f000 / #ff00aa / #00d9ff. Hard offset box-shadows, near-zero border-radius.",
        hero: "Asymmetric hero, massive (clamp(3rem, 12vw, 9rem)) display headline, marquee scrolling tagline strip, brutal divider lines, neon CTA with hard 8px offset shadow.",
      },
      {
        name: "Editorial Magazine",
        vibe: "Refined editorial like The New Yorker / Vogue. Serif display headlines, generous whitespace, drop caps, hairline dividers, multi-column intro paragraph.",
        palette: "Cream/off-white bg #faf7f2, deep ink text #1a1a1a, single accent (rich burgundy #7a1e1e OR forest #1f4d3a). Import 'Playfair Display' for headings.",
        hero: "Classic split editorial — large serif headline left, framed image right with thin border, hairline rule beneath, byline-style metadata below.",
      },
      {
        name: "Retro Futurism",
        vibe: "80s synthwave / Y2K revival. Chrome gradients, scanline overlays, perspective grid horizons, glowing terminal text, vaporwave palette.",
        palette: "Deep purple bg #1a0033, magenta/cyan accents #ff006e / #00f5ff, chrome silver gradients on headings. Monospace + bold geometric sans.",
        hero: "Retro grid horizon (perspective:1000px CSS grid floor), glowing sun/orb behind headline, chrome gradient text, scanline overlay (repeating-linear-gradient).",
      },
      {
        name: "Liquid Gradient",
        vibe: "Smooth flowing animated gradient backgrounds. Soft rounded everything (32px+ radius), buttery shadows, no hard edges, organic blob shapes, animated background-position shift.",
        palette: "Pastel gradients peach #ffb88c → coral #ff6b9d → lavender #c084fc → sky #60a5fa. Animate background-position over 12s.",
        hero: "Hero is one huge animated gradient mesh canvas, centered minimalist text, no photo needed — pure color motion.",
      },
      {
        name: "Bento Grid",
        vibe: "Apple-style bento boxes everywhere. Mixed-size rounded tiles (some 2x1, some square, some tall), each tile a distinct content type, generous gap, soft shadows.",
        palette: "Light neutral bg #f5f5f7, white tiles with subtle inner shadow, ONE featured tile with vivid gradient (blue→purple).",
        hero: "Hero IS a bento grid — 6-8 tiles of varying sizes, headline tile spans 2 cols, smaller tiles show stats / image / quote / CTA / video thumbnail.",
      },
      {
        name: "Dark Luxury",
        vibe: "Premium dark theme like Linear / Vercel / Arc. Subtle dot/grid background, single accent color, ultra-refined typography, tasteful micro-interactions.",
        palette: "Bg gradient #0b0b0f → #1a1a24, text #f5f5f7, accent #d4af37 (gold) OR #10b981 (emerald). Subtle radial-dot grid overlay.",
        hero: "Centered minimalist hero, small gradient eyebrow badge, huge clean headline, ONE subtle CTA. Background: faint grid pattern + 2 large soft glow blobs in accent color.",
      },
      {
        name: "Organic Soft",
        vibe: "Hand-drawn organic feel. Wavy SVG section dividers, soft blob shapes as decorations, warm earthy palette, friendly rounded sans-serif.",
        palette: "Warm cream #fef9f3 bg, terracotta #d97757 + sage #87a878 + mustard #e0a458 accents.",
        hero: "Asymmetric hero with floating organic blob shapes behind text (SVG morphing blobs), hand-drawn underline accent on key word, illustrated decorative element.",
      },
    ];

    const direction = DESIGN_DIRECTIONS[Math.floor(Math.random() * DESIGN_DIRECTIONS.length)];

    const directionRule = `

🎨 DESIGN DIRECTION FOR THIS GENERATION (mandatory — fully commit, do NOT blend):
DIRECTION NAME: "${direction.name}"
VIBE: ${direction.vibe}
PALETTE & TEXTURE: ${direction.palette}
HERO TREATMENT: ${direction.hero}

The output must be unmistakably "${direction.name}". Two of your generations must NEVER look the same — own this aesthetic with conviction.`;

    const systemPrompt = `You are an award-winning senior web designer (Awwwards / SiteInspire / Site of the Day caliber) building magazine-quality, conversion-optimized landing pages. Output must look like a TOP design agency built it — never AI-looking, never generic, never blocky. Two pages from you must NEVER look the same.

OUTPUT RULES:
1. Output ONLY raw HTML. Start with a single <style> block (all CSS scoped under .pgp-page), then the body markup. No markdown fences, no commentary.
2. Wrap the entire page in <div class="pgp-page">. Every selector MUST start with .pgp-page so styles can't leak into the host site.
3. THEME INHERITANCE for default body text — h1/h2/h3/h4/p/li in normal sections use color: inherit; font-family: inherit;. EXCEPTION: hero, CTA bands and dark-themed overlay sections may use explicit colors (#fff etc.) because the overlay guarantees contrast. The chosen DESIGN DIRECTION'S palette CAN and SHOULD override this for backgrounds, decorative gradients, gradient-text headings, and accent elements — that's the whole point.

${directionRule}

VISUAL EXECUTION (vibrant maximalist baseline, then layer the direction on top):
4. HERO must be cinematic. Multi-layered backgrounds (gradient mesh + animated blobs + optional photo with overlay). Headline clamp(2.4rem, 6vw, 5.5rem), font-weight 800-900, letter-spacing -0.03em, line-height 1.05. Two CTAs (primary glowing gradient + ghost outline).
5. ANIMATED DECORATIONS REQUIRED — define keyframes in the <style> block:
   @keyframes pgp-float { 0%,100%{transform:translateY(0) translateX(0)} 50%{transform:translateY(-18px) translateX(8px)} }
   @keyframes pgp-float-2 { 0%,100%{transform:translateY(0) translateX(0)} 50%{transform:translateY(20px) translateX(-12px)} }
   @keyframes pgp-fade-up { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
   @keyframes pgp-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
   @keyframes pgp-pulse-glow { 0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,.35)} 50%{box-shadow:0 0 0 14px rgba(99,102,241,0)} }
   Use at least 2 floating gradient orbs (radial-gradient + filter:blur(80px) + pgp-float animation). Apply pgp-fade-up on sections, pgp-shimmer sweep on primary buttons, pgp-pulse-glow on the main hero CTA.
6. Cards: 24px+ border-radius, layered gradient backgrounds, 1px gradient border via mask trick, hover translateY(-6px) + colored glow shadow + border color shift.
7. Typography: fluid clamp() everywhere. Section headlines should use gradient-text effect (background:linear-gradient(...);-webkit-background-clip:text;background-clip:text;color:transparent). Eyebrow labels: pill-shaped with glowing dot indicator + backdrop blur.
8. Section padding clamp(4rem, 8vw, 7rem). Generous whitespace.
9. Use CSS Grid creatively — not always 3 equal cols. Try bento, asymmetric splits (1fr 1.6fr), staggered staircase grids when the direction calls for it.

REQUIRED SECTIONS (in order, but visual treatment must match the chosen direction):
10. (a) Hero, (b) Trust strip / animated stat row, (c) Features/Services grid (3-6 cards with gradient icon tiles), (d) About with side image + text split, (e) Visual showcase / gallery / bento, (f) Testimonials horizontal scroll-snap carousel, (g) FAQ using styled <details>/<summary> with smooth open animation, (h) Final CTA band with bg image + dramatic overlay, (i) Contact section.

TESTIMONIALS — pure-CSS horizontal carousel:
11. <div class="pgp-carousel" style="display:flex;gap:1.5rem;overflow-x:auto;scroll-snap-type:x mandatory;padding:1rem .5rem 2rem;scrollbar-width:thin">. Each card: flex 0 0 min(360px, 85vw); scroll-snap-align: start; glass-style background; ★★★★★; quote; footer with avatar + name + role.
12. Avatars: https://i.pravatar.cc/80?img=N where N varies (1..70). 4-6 cards.

IMAGES — FREE niche-relevant stock (no AI credits):
13. Use https://picsum.photos/<width>/<height>?random=N for ALL images. Backend swaps these for niche-relevant photos automatically. Vary N so each slot is unique. Include 4-8 images total (hero bg, about, gallery, CTA band).
14. NEVER use {{AI_IMAGE:...}} blocks.

CONTENT VARIABLES:
15. Include 5-9 meaningful content variables using {variable_name} (lowercase_snake_case). DATA only: {company_name}, {service_name}, {product_name}, {location}, {price}, {phone}, {email}, {description}, {category}, {brand_name}, {rating}, {address}, {hours}, {website_url}, {tagline}.
16. NEVER create design/style variables ({primary_color}, {font_family}, etc.).
17. For per-page unique AI copy use {{AI:short instruction referencing {variables}}}. Include at least 2 such blocks (hero subtitle, about paragraph).

${headerFooterRule}

${platformRule}${themeRule}

QUALITY BAR: Output must look like a flagship landing page from a Series-B startup or premium agency portfolio — Linear, Vercel, Stripe, Arc, Framer, Cron, Raycast, Notion caliber. Bold. Confident. Unmistakable. Never amateur. Never the same as last time.`;

    console.log(`generate-template: chosen direction = "${direction.name}"`);

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Use the next-gen flash preview for richer design quality at low cost.
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `${prompt}\n\n(Aesthetic for this build: ${direction.name})` },
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
      JSON.stringify({ content, variables: vars, suggestedName, designDirection: direction.name }),
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
