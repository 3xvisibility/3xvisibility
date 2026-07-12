// AI Site Builder — Novamira-style in-app agent.
// User provides brand/category/niche, a reference link, a template, or free text.
// The AI plans + generates a full page (copy + design) and returns a preview-ready
// HTML page that can be published to WordPress/Shopify via the existing publish flow.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { aiGenerate, extractAuthToken } from "../_shared/ai-service.ts";
import { htmlToElementor } from "../_shared/connectors/elementor-engine.ts";
import { extractTemplateCss } from "../_shared/connectors/elementor-catalog.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface BuildInput {
  brand?: string;
  category?: string;
  niche?: string;
  referenceUrl?: string;
  templateName?: string;
  freeText?: string;
  language?: string;
  /** Target platform the AI should build for: "wordpress" (Elementor) or "shopify". */
  platform?: "wordpress" | "shopify";
  /** Optional manual brand theme that overrides AI-chosen colors/typography/gradient. */
  brandTheme?: BrandTheme;
  /** Names of the pages the user wants to build (e.g. ["Home", "About", "Contact"]). */
  pages?: string[];
  /** The specific page currently being generated (drives page-appropriate copy). */
  pageName?: string;
  /**
   * How faithfully to follow the reference site:
   *  - "replicate" → copy the reference layout/structure/palette as closely as possible.
   *  - "fresh"     → use the reference only as inspiration and design the best original page.
   */
  designMode?: "replicate" | "fresh";
  /** Output format: "elementor" (native JSON) or "gutenberg" (HTML blocks) for WordPress, or "shopify". */
  buildFormat?: "elementor" | "gutenberg" | "shopify";
}

interface BrandTheme {
  primary?: string;
  accent?: string;
  bg?: string;
  text?: string;
  /** Font preset key — see FONT_PRESETS. */
  font?: string;
  /** Gradient style for hero/CTA backgrounds. */
  gradientStyle?: "diagonal" | "vertical" | "radial" | "conic" | "solid";
}

interface PageJson {
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  theme: { primary: string; accent: string; bg: string; text: string; font?: string; gradientStyle?: string };
  hero: { headline: string; subheadline: string; cta: string; eyebrow?: string; image?: string };
  stats?: { value: string; label: string }[];
  sections: { title: string; body: string; image?: string }[];
  features?: { title: string; body: string; image?: string }[];
  faqs?: { q: string; a: string }[];
}

// Strict JSON Schema for structured outputs. Passing this to the AI gateway via
// response_format forces the model to emit JSON that matches this shape exactly,
// eliminating the "AI returned invalid JSON" failures from prose-wrapped or
// malformed responses.
const PAGE_JSON_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "landing_page",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["title", "slug", "metaTitle", "metaDescription", "theme", "hero", "stats", "sections", "features", "faqs"],
      properties: {
        title: { type: "string" },
        slug: { type: "string" },
        metaTitle: { type: "string" },
        metaDescription: { type: "string" },
        theme: {
          type: "object",
          additionalProperties: false,
          required: ["primary", "accent", "bg", "text"],
          properties: {
            primary: { type: "string" },
            accent: { type: "string" },
            bg: { type: "string" },
            text: { type: "string" },
          },
        },
        hero: {
          type: "object",
          additionalProperties: false,
          required: ["eyebrow", "headline", "subheadline", "cta", "image"],
          properties: {
            eyebrow: { type: "string" },
            headline: { type: "string" },
            subheadline: { type: "string" },
            cta: { type: "string" },
            image: { type: "string" },
          },
        },
        stats: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["value", "label"],
            properties: { value: { type: "string" }, label: { type: "string" } },
          },
        },
        sections: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["title", "body", "image"],
            properties: { title: { type: "string" }, body: { type: "string" }, image: { type: "string" } },
          },
        },
        features: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["title", "body", "image"],
            properties: { title: { type: "string" }, body: { type: "string" }, image: { type: "string" } },
          },
        },
        faqs: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["q", "a"],
            properties: { q: { type: "string" }, a: { type: "string" } },
          },
        },
      },
    },
  },
} as const;

// Strict JSON Schema for the conversational "chat" step.
const CHAT_JSON_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "chat_turn",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["reply", "collected", "ready"],
      properties: {
        reply: { type: "string" },
        collected: {
          type: "object",
          additionalProperties: false,
          required: ["brand", "category", "niche", "referenceUrl", "freeText"],
          properties: {
            brand: { type: ["string", "null"] },
            category: { type: ["string", "null"] },
            niche: { type: ["string", "null"] },
            referenceUrl: { type: ["string", "null"] },
            freeText: { type: ["string", "null"] },
          },
        },
        ready: { type: "boolean" },
      },
    },
  },
} as const;


const slugify = (s: string) =>
  (s || "page")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "page";

const esc = (s: string) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// Structured analysis of a reference site so generated sections map 1:1.
interface ReferenceAnalysis {
  text: string;
  hero?: { headline?: string; subheadline?: string; cta?: string };
  sectionTitles: string[];
  featureTitles: string[];
  faqs: string[];
  colors: string[];
}

// Decode a handful of common HTML entities for cleaner extracted copy.
const decodeEntities = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const stripTags = (s: string) => decodeEntities(s.replace(/<[^>]+>/g, " "));

// Fetch a reference site and extract its structural outline + palette so the
// AI can produce Elementor sections that match the reference brand/niche.
async function fetchReference(url: string): Promise<ReferenceAnalysis> {
  const empty: ReferenceAnalysis = { text: "", sectionTitles: [], featureTitles: [], faqs: [], colors: [] };
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12_000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; 3xVisibilityBot/1.0)" },
    });
    clearTimeout(t);
    if (!res.ok) return empty;
    const html = await res.text();
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ");

    const grab = (re: RegExp, max: number) => {
      const out: string[] = [];
      let m: RegExpExecArray | null;
      while ((m = re.exec(cleaned)) && out.length < max) {
        const v = stripTags(m[1]);
        if (v && v.length > 1 && v.length < 160 && !out.includes(v)) out.push(v);
      }
      return out;
    };

    const h1s = grab(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, 3);
    const h2s = grab(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, 12);
    const h3s = grab(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, 12);

    // Hero: first H1 + the paragraph closest to it + first button/CTA.
    const heroHeadline = h1s[0];
    const firstP = stripTags((cleaned.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1]) || "");
    const ctaMatch = stripTags(
      (cleaned.match(/<(?:a|button)[^>]*class="[^"]*(?:btn|button|cta)[^"]*"[^>]*>([\s\S]*?)<\/(?:a|button)>/i)?.[1]) || "",
    );

    // FAQ heuristic: H3 lines ending in "?" plus questions inside summary/dt tags.
    const summaries = grab(/<(?:summary|dt)[^>]*>([\s\S]*?)<\/(?:summary|dt)>/gi, 8);
    const faqs = [...h3s.filter((x) => x.includes("?")), ...summaries.filter((x) => x.includes("?"))]
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 6);

    // Features are short H3s that are not questions; sections are H2s.
    const featureTitles = h3s.filter((x) => !x.includes("?") && x.length <= 60).slice(0, 6);

    // Extract a small color palette from inline styles / hex codes.
    const colors = (cleaned.match(/#[0-9a-fA-F]{6}\b/g) || [])
      .map((c) => c.toLowerCase())
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 6);

    const text = stripTags(cleaned).slice(0, 3500);

    return {
      text,
      hero: { headline: heroHeadline, subheadline: firstP.slice(0, 200), cta: ctaMatch.slice(0, 40) },
      sectionTitles: h2s.slice(0, 10),
      featureTitles,
      faqs,
      colors,
    };
  } catch {
    return empty;
  }
}

// Typography presets: key -> { family (CSS stack), import (Google Fonts URL) }.
const FONT_PRESETS: Record<string, { family: string; import: string }> = {
  "plus-jakarta": {
    family: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    import: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
  },
  inter: {
    family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    import: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
  },
  poppins: {
    family: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    import: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap",
  },
  "space-grotesk": {
    family: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    import: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap",
  },
  sora: {
    family: "'Sora', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    import: "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap",
  },
  playfair: {
    family: "'Playfair Display', Georgia, 'Times New Roman', serif",
    import: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800&display=swap",
  },
};

// Build a CSS background for hero/CTA bands given the two theme colors + style.
function gradientCss(primary: string, accent: string, style?: string): string {
  switch (style) {
    case "vertical":
      return `linear-gradient(180deg,${primary} 0%,${accent} 100%)`;
    case "radial":
      return `radial-gradient(circle at 30% 20%,${primary} 0%,${accent} 100%)`;
    case "conic":
      return `conic-gradient(from 210deg at 50% 50%,${primary},${accent},${primary})`;
    case "solid":
      return primary;
    case "diagonal":
    default:
      return `linear-gradient(135deg,${primary} 0%,${accent} 100%)`;
  }
}

// Build a keyword-relevant photo URL. LoremFlickr's tag matching is unreliable
// and frequently returns random, off-topic photos (e.g. a street statue for
// "landscape"). Instead we use Pollinations, which generates a photo that
// literally depicts the requested subject — so every image is 100% on-topic
// without burning AI credits. `query` should be a short, specific subject.
function imgUrl(query: string, seed: number, w = 1200, h = 800): string {
  const subject = (query || "professional business")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "professional business";
  const prompt = `professional high quality photograph of ${subject}, realistic, clean, well lit, no text, no watermark`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&seed=${seed}&nologo=true&model=flux`;
}


// Resolve the best image keyword for a slot: prefer the AI-provided per-slot
// keyword, else combine the slot title with the page-level niche query.
function slotImg(slotKeyword: string | undefined, fallbackTitle: string, baseQuery: string): string {
  const kw = (slotKeyword || "").trim();
  if (kw) return kw;
  const title = (fallbackTitle || "").trim();
  return [title, baseQuery].filter(Boolean).join(" ").trim() || baseQuery;
}

function renderHtml(p: PageJson, imgQuery = ""): string {
  const t = p.theme || { primary: "#6d28d9", accent: "#f59e0b", bg: "#ffffff", text: "#0f172a" };
  // Derive a soft surface + subtle border from the text color for depth.
  const surface = "#ffffff";
  const softBg = "#f6f7fb";
  const border = "rgba(15,23,42,0.08)";
  const muted = "rgba(15,23,42,0.62)";
  const fontPreset = FONT_PRESETS[t.font || "plus-jakarta"] || FONT_PRESETS["plus-jakarta"];
  const font = fontPreset.family;
  const heroGradient = gradientCss(esc(t.primary), esc(t.accent), t.gradientStyle);


  const stats = (p.stats && p.stats.length)
    ? `
    <section style="max-width:1120px;margin:-40px auto 0;padding:0 24px;position:relative;z-index:2;">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:1px;background:${border};border:1px solid ${border};border-radius:20px;overflow:hidden;box-shadow:0 24px 60px -28px rgba(15,23,42,0.35);">
        ${p.stats.map((s) => `<div style="background:${surface};padding:28px 20px;text-align:center;">
          <div style="font-size:34px;font-weight:800;letter-spacing:-0.02em;background:${heroGradient};-webkit-background-clip:text;background-clip:text;color:transparent;">${esc(s.value)}</div>
          <div style="margin-top:6px;font-size:14px;font-weight:600;color:${muted};">${esc(s.label)}</div>
        </div>`).join("")}
      </div>
    </section>`
    : "";

  const q = imgQuery || p.title || "business modern";


  const sections = (p.sections || [])
    .map(
      (s, i) => {
        const img = `<div style="flex:1 1 320px;min-width:280px;"><img src="${imgUrl(slotImg(s.image, s.title, q), 100 + i)}" alt="${esc(s.title)}" loading="lazy" style="width:100%;height:340px;object-fit:cover;border-radius:24px;box-shadow:0 30px 60px -30px rgba(15,23,42,0.5);"/></div>`;
        const text = `<div style="flex:1 1 320px;min-width:280px;">
          <div style="font-size:13px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${esc(t.primary)};margin:0 0 12px;">0${i + 1}</div>
          <h2 style="font-size:clamp(26px,3.4vw,36px);line-height:1.15;margin:0 0 16px;color:${esc(t.text)};font-weight:800;letter-spacing:-0.02em;">${esc(s.title)}</h2>
          <p style="font-size:18px;line-height:1.75;color:${muted};margin:0;">${esc(s.body)}</p>
        </div>`;
        return `
    <section style="padding:56px 24px;max-width:1120px;margin:0 auto;">
      <div style="display:flex;flex-wrap:wrap;gap:48px;align-items:center;${i % 2 === 1 ? "flex-direction:row-reverse;" : ""}">
        ${text}
        ${img}
      </div>
    </section>`;
      },
    )
    .join("");

  const features = (p.features && p.features.length)
    ? `
    <section style="padding:72px 24px;background:${softBg};">
      <div style="max-width:1120px;margin:0 auto;">
        <h2 style="text-align:center;font-size:clamp(26px,3.4vw,38px);font-weight:800;letter-spacing:-0.02em;margin:0 0 12px;color:${esc(t.text)};">Why choose us</h2>
        <p style="text-align:center;font-size:18px;color:${muted};max-width:560px;margin:0 auto 48px;">Everything you need, crafted with care.</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px;">
          ${p.features
            .map(
              (f, i) => `<div style="background:${surface};border:1px solid ${border};border-radius:20px;overflow:hidden;box-shadow:0 18px 40px -30px rgba(15,23,42,0.5);transition:transform .2s ease;">
            <img src="${imgUrl(slotImg(f.image, f.title, q), 200 + i, 800, 480)}" alt="${esc(f.title)}" loading="lazy" style="width:100%;height:170px;object-fit:cover;"/>
            <div style="padding:28px 32px 32px;">
              <h3 style="margin:0 0 10px;font-size:20px;color:${esc(t.text)};font-weight:700;letter-spacing:-0.01em;">${esc(f.title)}</h3>
              <p style="margin:0;font-size:16px;line-height:1.65;color:${muted};">${esc(f.body)}</p>
            </div>
          </div>`,
            )
            .join("")}
        </div>
      </div>
    </section>`
    : "";

  const faqs = (p.faqs && p.faqs.length)
    ? `
    <section style="padding:72px 24px;max-width:760px;margin:0 auto;">
      <h2 style="text-align:center;font-size:clamp(26px,3.4vw,38px);margin:0 0 40px;color:${esc(t.text)};font-weight:800;letter-spacing:-0.02em;">Frequently asked questions</h2>
      ${p.faqs
        .map(
          (f) => `<div style="background:${surface};border:1px solid ${border};border-radius:16px;padding:24px 26px;margin-bottom:14px;">
        <h3 style="margin:0 0 8px;font-size:18px;color:${esc(t.text)};font-weight:700;">${esc(f.q)}</h3>
        <p style="margin:0;font-size:16px;line-height:1.65;color:${muted};">${esc(f.a)}</p>
      </div>`,
        )
        .join("")}
    </section>`
    : "";

  const eyebrow = p.hero.eyebrow
    ? `<div style="display:inline-block;padding:8px 18px;border-radius:999px;background:rgba(255,255,255,0.16);border:1px solid rgba(255,255,255,0.28);color:#fff;font-size:13px;font-weight:600;letter-spacing:0.04em;margin:0 0 24px;backdrop-filter:blur(6px);">${esc(p.hero.eyebrow)}</div>`
    : "";

  return `<div style="font-family:${font};background:${esc(t.bg)};color:${esc(t.text)};overflow:hidden;">
  <style>@import url('${fontPreset.import}');</style>
  <section style="position:relative;padding:120px 24px 96px;text-align:center;background:${heroGradient};color:#fff;">
    <div style="position:absolute;inset:0;background:radial-gradient(circle at 20% 20%,rgba(255,255,255,0.18),transparent 45%),radial-gradient(circle at 80% 0%,rgba(255,255,255,0.12),transparent 40%);pointer-events:none;"></div>
    <div style="position:relative;max-width:860px;margin:0 auto;">
      ${eyebrow}
      <h1 style="font-size:clamp(36px,6vw,60px);line-height:1.05;margin:0 0 22px;font-weight:800;letter-spacing:-0.03em;">${esc(p.hero.headline)}</h1>
      <p style="font-size:clamp(17px,2.4vw,21px);line-height:1.6;margin:0 auto 36px;max-width:620px;opacity:.95;">${esc(p.hero.subheadline)}</p>
      <a href="#contact" style="display:inline-block;background:#fff;color:${esc(t.primary)};padding:16px 38px;border-radius:999px;font-weight:700;text-decoration:none;font-size:17px;box-shadow:0 16px 40px -12px rgba(0,0,0,0.4);">${esc(p.hero.cta)}</a>
    </div>
    <div style="position:relative;max-width:1040px;margin:56px auto 0;">
      <img src="${imgUrl(slotImg(p.hero.image, p.hero.headline, q), 1, 1600, 900)}" alt="${esc(p.hero.headline)}" loading="lazy" style="width:100%;height:auto;border-radius:24px;box-shadow:0 40px 80px -30px rgba(0,0,0,0.55);border:6px solid rgba(255,255,255,0.18);"/>
    </div>
  </section>
  ${stats}
  ${sections}
  ${features}
  ${faqs}
  <section style="padding:80px 24px;text-align:center;background:${heroGradient};color:#fff;">
    <div style="max-width:680px;margin:0 auto;">
      <h2 style="font-size:clamp(28px,4vw,42px);font-weight:800;letter-spacing:-0.02em;margin:0 0 16px;">${esc(p.hero.headline)}</h2>
      <p style="font-size:19px;line-height:1.6;opacity:.95;margin:0 0 32px;">${esc(p.hero.subheadline)}</p>
      <a href="#contact" style="display:inline-block;background:#fff;color:${esc(t.primary)};padding:16px 38px;border-radius:999px;font-weight:700;text-decoration:none;font-size:17px;">${esc(p.hero.cta)}</a>
    </div>
  </section>
</div>`;
}

// Build the publish-ready page payload from a generated PageJson.
// Routes through the native Elementor master: the rendered HTML is converted to
// a native Elementor JSON tree (full-width Containers + native widgets) so the
// WordPress publish flow ships an editable, 1:1 page — never a raw HTML widget.

// Build the publish-ready page payload from a generated PageJson.
// Routing priority: (1) a matching stored master Elementor template, content
// overlaid onto its editable fields for a 1:1 native design; (2) HTML→native
// Elementor conversion; (3) raw HTML fallback.
async function buildPagePayload(p: PageJson, input: BuildInput, sectionHints: string[]) {
  const imgQuery = [input.niche, input.category, input.brand]
    .filter(Boolean)
    .join(" ")
    .trim() || p.title;
  const html = renderHtml(p, imgQuery);
  const platform = input.platform === "shopify" ? "shopify" : "wordpress";

  // Shopify pages do NOT use Elementor — they publish into Shopify's own
  // section/page template (rich HTML body). Skip all Elementor routing so the
  // page lands in the Shopify-style template instead of the WordPress one.
  if (platform === "shopify") {
    return {
      title: p.title,
      slug: p.slug,
      seo_title: p.metaTitle,
      seo_description: p.metaDescription,
      content: html,
      publish_format: "shopify",
      platform,
    };
  }

  // Gutenberg format: publish the rendered HTML directly as Gutenberg blocks —
  // no Elementor conversion. The WordPress connector wraps the HTML into blocks.
  if (input.buildFormat === "gutenberg") {
    return {
      title: p.title,
      slug: p.slug,
      seo_title: p.metaTitle,
      seo_description: p.metaDescription,
      content: html,
      publish_format: "gutenberg",
      platform,
    };
  }

  let elementorData: string | undefined;
  let elementorCss: string | undefined;

  // The AI-generated design IS the source of truth. Convert the freshly
  // rendered HTML directly into a native Elementor JSON tree so the published
  // WordPress page is 1:1 with what the user built — never an old marketplace
  // master template matched by category.
  try {
    const tree = htmlToElementor(html);
    if (Array.isArray(tree) && tree.length) {
      elementorData = JSON.stringify(tree);
      elementorCss = extractTemplateCss(html) || undefined;
    }
  } catch (e) {
    console.warn("[ai-site-builder] native Elementor conversion failed; falling back to HTML", e);
  }

  return {
    title: p.title,
    slug: p.slug,
    seo_title: p.metaTitle,
    seo_description: p.metaDescription,
    content: html,
    elementor_data: elementorData,
    elementor_css: elementorCss,
    elementor_mode: elementorData ? "native" : undefined,
    publish_format: "elementor",
    platform,
  };
}

async function generatePage(input: BuildInput, authToken?: string, refOverride?: ReferenceAnalysis | null): Promise<{ ok: boolean; page?: PageJson; hints?: string[]; error?: string }> {
  let ref: ReferenceAnalysis | null = refOverride ?? null;
  if (!ref && input.referenceUrl) ref = await fetchReference(input.referenceUrl);

  // Build a structured brief so generated Elementor sections map to the
  // reference outline AND the brand/category/niche inputs.
  let referenceBrief = "";
  if (ref && (ref.sectionTitles.length || ref.featureTitles.length || ref.text)) {
    const parts: string[] = [];
    if (ref.hero?.headline) parts.push(`Hero headline: "${ref.hero.headline}"`);
    if (ref.hero?.subheadline) parts.push(`Hero subheadline: "${ref.hero.subheadline}"`);
    if (ref.hero?.cta) parts.push(`Primary CTA label: "${ref.hero.cta}"`);
    if (ref.sectionTitles.length) parts.push(`Section headings (mirror these as "sections", one per heading, same order): ${ref.sectionTitles.map((s) => `"${s}"`).join(", ")}`);
    if (ref.featureTitles.length) parts.push(`Feature/card titles (map these into "features"): ${ref.featureTitles.map((s) => `"${s}"`).join(", ")}`);
    if (ref.faqs.length) parts.push(`FAQ questions (reuse as "faqs"): ${ref.faqs.map((s) => `"${s}"`).join(", ")}`);
    if (ref.colors.length) parts.push(`Reference brand colors (derive theme from these): ${ref.colors.join(", ")}`);
    if (ref.text) parts.push(`Reference body copy for tone:\n"""${ref.text.slice(0, 2000)}"""`);
    referenceBrief = parts.join("\n");
  }



  const lang = input.language || "en";

  // Page-specific guidance so each requested page (Home, About, Services,
  // Contact, etc.) gets purpose-fit copy and sections instead of a generic clone.
  const pageName = (input.pageName || "").trim();
  const isHome = !pageName || /^(home|homepage|landing|main|index)$/i.test(pageName);
  const pageBrief = isHome
    ? "This is the HOME / landing page — lead with the strongest value proposition, a hero, key stats, primary services and a strong CTA."
    : `This is the "${pageName}" page of a multi-page website. Design the hero, sections, features and FAQs specifically for a "${pageName}" page — its purpose, tone and content must fit that page (e.g. About = story/team/mission, Services = offerings/pricing, Contact = how to reach + FAQ, Blog = articles overview). Do NOT repeat the home page; make this page distinct and self-contained.`;

  // Design fidelity toward the reference site.
  const designMode = input.designMode === "replicate" ? "replicate" : "fresh";
  const designBrief = !ref
    ? "No reference site was given — design the most beautiful, original, high-converting page you can for this brand and niche."
    : designMode === "replicate"
      ? "REPLICATE MODE: reproduce the reference site as closely as possible — same section order, same layout rhythm, same style of hero/features/FAQ, and derive the exact color theme from the reference brand colors. Match it 1:1 visually while rewriting the copy for this brand."
      : "INSPIRATION MODE: use the reference only as loose inspiration for tone and structure, but design a fresh, original, best-in-class page that is clearly better than the reference. Do not copy its layout verbatim.";

  const system = `You are an award-winning web designer and conversion copywriter (think Awwwards-level landing pages). Generate a complete, polished landing page as STRICT JSON only (no markdown, no commentary).
Schema:
{
  "title": string,
  "slug": string,
  "metaTitle": string (<=60 chars),
  "metaDescription": string (<=158 chars),
  "theme": { "primary": hex, "accent": hex, "bg": hex, "text": hex },
  "hero": { "eyebrow": string (2-4 words badge), "headline": string (punchy, <=9 words), "subheadline": string (1-2 sentences), "cta": string (action label), "image": string (2-4 word concrete photo subject for the hero image) },
  "stats": [ { "value": string (e.g. "10k+", "98%", "24/7"), "label": string } ] (exactly 3-4 items),
  "sections": [ { "title": string, "body": string, "image": string (2-4 word concrete photo subject for THIS section) } ] (3-5 items, body 2-4 sentences),
  "features": [ { "title": string, "body": string, "image": string (2-4 word concrete photo subject for THIS feature) } ] (3-6 items, body 1-2 sentences),
  "faqs": [ { "q": string, "a": string } ] (3-5 items)
}
Image rules (CRITICAL — images MUST match the content 100%):
- Every "image" field is a SHORT, CONCRETE, photographable subject (2-4 words) that literally depicts what the section/feature is about — e.g. "modern dental clinic", "barista pouring coffee", "yoga studio class", "solar panels rooftop".
- Always include the niche/industry in the keyword so the photo is on-topic (e.g. for a dentist: "dentist examining patient", not just "doctor").
- Use real photographable nouns, never abstract words ("success", "quality", "trust") and never brand names.
Design rules:
- Pick a bold, cohesive, modern color theme that fits the brand/niche. "primary" and "accent" should be two harmonious colors that look great in a gradient (avoid generic blue+orange unless it truly fits). "bg" should be a near-white or soft tinted background; "text" a dark slate.
- Choose colors with real contrast and personality — luxury = deep + gold, wellness = sage + cream, tech = indigo + cyan, food = warm terracotta, etc.
- Copy must be specific, confident and benefit-driven. Never generic placeholder text. Always fill "eyebrow" and "stats".
Write all text in language code "${lang}".
Page context: ${pageBrief}
Design fidelity: ${designBrief}
When a reference brief is provided, mirror its section structure and ordering closely (one "sections" item per reference section heading), reuse its feature and FAQ topics, and derive the theme from its brand colors — but rewrite ALL copy to fit the given brand, category and niche. Do not copy the reference text verbatim.`;

  const user = `Brand: ${input.brand || "(not given)"}
Category: ${input.category || "(not given)"}
Niche / industry: ${input.niche || "(not given)"}
Page to build: ${pageName || "Home"}
Extra instructions: ${input.freeText || "(none)"}
${referenceBrief ? `\nReference brief (structure + palette to match, content to re-write for this brand):\n${referenceBrief}` : ""}

Generate the ${pageName || "landing"} page JSON now.`;

  const result = await aiGenerate({
    authToken,
    promptType: "full_page",
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: PAGE_JSON_SCHEMA,

  });

  if (!result.success) return { ok: false, error: result.content };

  let raw = result.content.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
  let parsed: PageJson;
  try {
    parsed = JSON.parse(raw) as PageJson;
  } catch {
    // The model sometimes wraps JSON in prose or emits trailing commas /
    // control chars. Extract the outermost object and clean common issues.
    try {
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start === -1 || end === -1 || end <= start) throw new Error("no object");
      const slice = raw
        .slice(start, end + 1)
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]")
        .replace(/[\u0000-\u001F\u007F]/g, " ");
      parsed = JSON.parse(slice) as PageJson;
    } catch {
      return { ok: false, error: "AI returned invalid JSON. Please try again." };
    }
  }


  parsed.slug = slugify(parsed.slug || parsed.title || input.brand || "page");
  parsed.theme = parsed.theme || { primary: "#2563eb", accent: "#f59e0b", bg: "#ffffff", text: "#0f172a" };
  // Apply a manual brand theme override on top of the AI-chosen palette.
  const bt = input.brandTheme;
  if (bt) {
    if (bt.primary) parsed.theme.primary = bt.primary;
    if (bt.accent) parsed.theme.accent = bt.accent;
    if (bt.bg) parsed.theme.bg = bt.bg;
    if (bt.text) parsed.theme.text = bt.text;
    if (bt.font) parsed.theme.font = bt.font;
    if (bt.gradientStyle) parsed.theme.gradientStyle = bt.gradientStyle;
  }
  parsed.hero = parsed.hero || { headline: parsed.title || "Welcome", subheadline: "", cta: "Get Started" };
  parsed.sections = Array.isArray(parsed.sections) ? parsed.sections : [];
  const hints = [
    ...(ref?.sectionTitles ?? []),
    ...(ref?.featureTitles ?? []),
    ...parsed.sections.map((s) => s.title),
  ].filter(Boolean);
  return { ok: true, page: parsed, hints };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const action: string = body.action || "build";
    const authToken = extractAuthToken(req);

    if (action === "build") {
      const input: BuildInput = body.input || {};
      if (!input.brand && !input.niche && !input.freeText && !input.referenceUrl) {
        return new Response(
          JSON.stringify({ error: "Provide at least a brand, niche, reference link, or description." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const out = await generatePage(input, authToken);
      if (!out.ok) {
        const code = out.error?.includes("429") ? 429 : out.error?.includes("402") ? 402 : 500;
        return new Response(JSON.stringify({ error: out.error }), {
          status: code,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const page = out.page!;
      return new Response(
        JSON.stringify({
          page: await buildPagePayload(page, input, out.hints ?? []),
          plan: page,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "chat") {
      const messages = Array.isArray(body.messages) ? body.messages : [];
      const system = `You are the 3xVisibility AI Site Builder assistant. You help users build and publish landing pages for WordPress/Shopify.
Have a short, friendly conversation in the user's language to collect: brand name, category, and niche/industry (and optionally a reference website link or specific instructions).
Respond ONLY with STRICT JSON (no markdown):
{
  "reply": string (your conversational message to the user),
  "collected": { "brand": string|null, "category": string|null, "niche": string|null, "referenceUrl": string|null, "freeText": string|null },
  "ready": boolean (true ONLY when you have enough to build: at least brand AND niche, or a clear description, or a reference link)
}
When ready is true, your reply should tell the user you'll build a preview now.`;

      const result = await aiGenerate({
        authToken,
        promptType: "short_content",
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: system }, ...messages],
        response_format: CHAT_JSON_SCHEMA,
      });

      if (!result.success) {
        const code = result.content.includes("429") ? 429 : result.content.includes("402") ? 402 : 500;
        return new Response(JSON.stringify({ error: result.content }), {
          status: code,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let raw = result.content.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = { reply: result.content, collected: {}, ready: false };
      }

      let pageResult: any = null;
      if (parsed.ready && parsed.collected) {
        // Carry the platform choice from the request into the collected input.
        if (body.platform === "shopify" || body.platform === "wordpress") {
          parsed.collected.platform = body.platform;
        }
        // Carry the manual brand theme into the collected input.
        if (body.brandTheme) parsed.collected.brandTheme = body.brandTheme;
        const out = await generatePage(parsed.collected, authToken);
        if (out.ok && out.page) {
          pageResult = {
            page: await buildPagePayload(out.page, parsed.collected, out.hints ?? []),
            plan: out.page,
          };
        }
      }

      return new Response(
        JSON.stringify({ reply: parsed.reply || "", collected: parsed.collected || {}, ready: !!parsed.ready, result: pageResult }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
