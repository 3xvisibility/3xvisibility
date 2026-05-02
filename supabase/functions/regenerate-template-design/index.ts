// Regenerate a template's design (CSS) automatically based on a target niche
// and services. Keeps all HTML structure / variable placeholders intact and
// only swaps the leading <style> block for a fresh, modern, niche-aware one.
//
// Request body:
//   {
//     content: string,                // current template HTML
//     niche: string,                  // e.g. "dental clinic"
//     services?: string,              // e.g. "teeth whitening, implants"
//     business?: string,              // optional business / brand name
//     vibe?: { palette?, typography?, density? }, // optional override hints
//   }
//
// Response: { content: string, summary: string }

import { applyVariantsToTemplate, type SectionVariants } from "../_shared/section-variants.ts";
import { aiGenerate, extractAuthToken } from "../_shared/ai-service.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface VibeHint {
  palette?: string;
  typography?: string;
  density?: string;
}

function stripExistingStyles(html: string): { stripped: string; hadStyle: boolean } {
  const re = /<style\b[^>]*>[\s\S]*?<\/style>/gi;
  const hadStyle = re.test(html);
  return { stripped: html.replace(re, "").trim(), hadStyle };
}

async function generateDesignCss(
  niche: string,
  services: string,
  business: string,
  vibe: VibeHint,
  authToken?: string,
): Promise<string> {
  const vibeLine = [
    vibe.palette && `Color palette mood: ${vibe.palette}`,
    vibe.typography && `Typography mood: ${vibe.typography}`,
    vibe.density && `Layout density: ${vibe.density}`,
  ].filter(Boolean).join("\n") || "(designer's choice — pick a palette + font that fits the niche)";

  const systemPrompt = `You are a senior product designer producing a single self-contained <style> block for a programmatic SEO landing page.

OUTPUT RULES — non-negotiable:
- Return ONLY a single <style> ... </style> block. No HTML body, no markdown, no commentary.
- All CSS must be scoped via class selectors that already exist on the page (.pgp-hero, .pgp-section, .pgp-card, .pgp-btn, .pgp-grid, .pgp-faq, .pgp-cta, .pgp-nav, .pgp-footer, .pgp-container, h1/h2/h3, p, a). Do NOT invent globally aggressive selectors like *.
- The design MUST be modern, premium, responsive, accessible (WCAG AA contrast), and feel like a brand-new "Lovable-vibe" landing page tailored to the niche.
- Include: Google Fonts @import for the chosen typography pair (one display, one body), CSS custom properties (--brand, --brand-2, --bg, --fg, --muted, --radius), gradient mesh hero background, glassmorphic cards, subtle keyframe animations (pgp-float, pgp-fade-up), hover states, fluid typography with clamp(), and a sensible mobile breakpoint.
- Pick colors that fit the niche emotionally (e.g. dental → calming teal/white, restaurant → warm amber/burgundy, law → navy/gold, fitness → energetic orange/charcoal, tech/SaaS → indigo/violet).
- Keep total output under 6 KB.`;

  const userPrompt = `Niche: ${niche}
Services: ${services || "(none specified)"}
${business ? `Business: ${business}` : ""}
${vibeLine}

Generate the <style> block now.`;

  const result = await aiGenerate({
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    authToken,
    promptType: "template_scan",
  });

  if (!result.success) {
    const status = result.content.includes("429") ? 429 : result.content.includes("402") ? 402 : 500;
    throw new Response(JSON.stringify({
      error: status === 429
        ? "Rate limit exceeded — please try again in a moment."
        : status === 402
        ? "AI credits exhausted — top up your workspace usage to continue."
        : "AI gateway error",
    }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let raw = result.content;
  raw = raw.replace(/^```(?:html|css)?/i, "").replace(/```$/, "").trim();
  const m = raw.match(/<style\b[^>]*>[\s\S]*?<\/style>/i);
  if (m) return m[0];
  if (raw) return `<style>${raw}</style>`;
  throw new Error("AI returned empty design");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json() as {
      content?: string;
      niche?: string;
      services?: string;
      business?: string;
      vibe?: VibeHint;
      variants?: SectionVariants;
      mode?: "full" | "variants-only";
    };

    const content = (body.content || "").toString();
    const niche = (body.niche || "").trim();
    const services = (body.services || "").trim();
    const business = (body.business || "").trim();
    const vibe = body.vibe || {};
    const variants = body.variants || {};
    const mode = body.mode === "variants-only" ? "variants-only" : "full";

    if (!content) {
      return new Response(JSON.stringify({ error: "Template content is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "variants-only") {
      const newContent = applyVariantsToTemplate(content, variants);
      const summary = `Applied layout variants — ${
        Object.entries(variants).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(" · ") || "defaults"
      }.`;
      return new Response(JSON.stringify({ content: newContent, summary }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!niche) {
      return new Response(JSON.stringify({ error: "A target niche is required to regenerate the design." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let styleBlock: string;
    try {
      styleBlock = await generateDesignCss(niche, services, business, vibe, extractAuthToken(req));
    } catch (e) {
      if (e instanceof Response) return e;
      throw e;
    }

    const { stripped, hadStyle } = stripExistingStyles(content);
    let newContent = `${styleBlock}\n${stripped}`.trim();
    if (Object.values(variants).some(Boolean)) {
      newContent = applyVariantsToTemplate(newContent, variants);
    }

    const variantSummary = Object.entries(variants).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(" · ");
    const summary = `Regenerated design for niche "${niche}"${services ? ` (services: ${services})` : ""}${hadStyle ? " — replaced existing styles" : " — added a fresh style block"}${variantSummary ? ` · variants: ${variantSummary}` : ""}.`;

    return new Response(JSON.stringify({ content: newContent, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[REGEN-DESIGN] fatal", e);
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : "Unknown error",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
