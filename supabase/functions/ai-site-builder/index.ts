// AI Site Builder — Novamira-style in-app agent.
// User provides brand/category/niche, a reference link, a template, or free text.
// The AI plans + generates a full page (copy + design) and returns a preview-ready
// HTML page that can be published to WordPress/Shopify via the existing publish flow.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { aiGenerate, extractAuthToken } from "../_shared/ai-service.ts";
import { htmlToElementor } from "../_shared/connectors/elementor-engine.ts";
import { buildElementorFromCatalog, extractTemplateCss } from "../_shared/connectors/elementor-catalog.ts";

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
}

interface PageJson {
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  theme: { primary: string; accent: string; bg: string; text: string };
  hero: { headline: string; subheadline: string; cta: string };
  sections: { title: string; body: string }[];
  features?: { title: string; body: string }[];
  faqs?: { q: string; a: string }[];
}

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


function renderHtml(p: PageJson): string {
  const t = p.theme || { primary: "#2563eb", accent: "#f59e0b", bg: "#ffffff", text: "#0f172a" };
  const sections = (p.sections || [])
    .map(
      (s) => `
    <section style="padding:56px 24px;max-width:1080px;margin:0 auto;">
      <h2 style="font-size:30px;line-height:1.2;margin:0 0 16px;color:${esc(t.text)};font-weight:700;">${esc(s.title)}</h2>
      <p style="font-size:18px;line-height:1.7;color:${esc(t.text)};opacity:.85;margin:0;">${esc(s.body)}</p>
    </section>`,
    )
    .join("");

  const features = (p.features && p.features.length)
    ? `
    <section style="padding:48px 24px;background:#f8fafc;">
      <div style="max-width:1080px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:24px;">
        ${p.features
          .map(
            (f) => `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:24px;">
          <h3 style="margin:0 0 8px;font-size:19px;color:${esc(t.text)};font-weight:700;">${esc(f.title)}</h3>
          <p style="margin:0;font-size:16px;line-height:1.6;color:${esc(t.text)};opacity:.8;">${esc(f.body)}</p>
        </div>`,
          )
          .join("")}
      </div>
    </section>`
    : "";

  const faqs = (p.faqs && p.faqs.length)
    ? `
    <section style="padding:56px 24px;max-width:880px;margin:0 auto;">
      <h2 style="font-size:28px;margin:0 0 24px;color:${esc(t.text)};font-weight:700;">FAQ</h2>
      ${p.faqs
        .map(
          (f) => `<div style="margin-bottom:18px;">
        <h3 style="margin:0 0 6px;font-size:18px;color:${esc(t.text)};font-weight:600;">${esc(f.q)}</h3>
        <p style="margin:0;font-size:16px;line-height:1.6;color:${esc(t.text)};opacity:.8;">${esc(f.a)}</p>
      </div>`,
        )
        .join("")}
    </section>`
    : "";

  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:${esc(t.bg)};color:${esc(t.text)};">
  <section style="padding:80px 24px;text-align:center;background:linear-gradient(135deg,${esc(t.primary)},${esc(t.accent)});color:#fff;">
    <div style="max-width:820px;margin:0 auto;">
      <h1 style="font-size:44px;line-height:1.1;margin:0 0 18px;font-weight:800;">${esc(p.hero.headline)}</h1>
      <p style="font-size:20px;line-height:1.6;margin:0 0 28px;opacity:.95;">${esc(p.hero.subheadline)}</p>
      <a href="#contact" style="display:inline-block;background:#fff;color:${esc(t.primary)};padding:14px 32px;border-radius:999px;font-weight:700;text-decoration:none;font-size:17px;">${esc(p.hero.cta)}</a>
    </div>
  </section>
  ${sections}
  ${features}
  ${faqs}
</div>`;
}

// Build the publish-ready page payload from a generated PageJson.
// Routes through the native Elementor master: the rendered HTML is converted to
// a native Elementor JSON tree (full-width Containers + native widgets) so the
// WordPress publish flow ships an editable, 1:1 page — never a raw HTML widget.
// Pick the stored master Elementor template whose category/name best matches the
// brand/category/niche inputs (and any reference section headings). Returns the
// raw `elementor_json` of the best match, or null when nothing scores.
async function pickMasterTemplate(
  input: BuildInput,
  hints: string[],
): Promise<unknown | null> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return null;
    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from("elementor_templates")
      .select("id, name, category, elementor_json")
      .eq("status", "active")
      .limit(200);
    if (error || !data?.length) return null;

    const needles = [input.category, input.niche, input.brand, ...hints]
      .filter(Boolean)
      .flatMap((s) => String(s).toLowerCase().split(/[^a-z0-9]+/))
      .filter((w) => w.length >= 3);
    if (!needles.length) return null;

    let best: { json: unknown; score: number } | null = null;
    for (const row of data) {
      const hay = `${row.category ?? ""} ${row.name ?? ""}`.toLowerCase();
      let score = 0;
      for (const n of needles) if (hay.includes(n)) score += 1;
      if (score > 0 && (!best || score > best.score)) best = { json: row.elementor_json, score };
    }
    return best?.json ?? null;
  } catch (e) {
    console.warn("[ai-site-builder] master template lookup failed", e);
    return null;
  }
}

// Build the publish-ready page payload from a generated PageJson.
// Routing priority: (1) a matching stored master Elementor template, content
// overlaid onto its editable fields for a 1:1 native design; (2) HTML→native
// Elementor conversion; (3) raw HTML fallback.
async function buildPagePayload(p: PageJson, input: BuildInput, sectionHints: string[]) {
  const html = renderHtml(p);
  let elementorData: string | undefined;
  let elementorCss: string | undefined;

  // (1) Master Elementor template routing.
  try {
    const master = await pickMasterTemplate(input, sectionHints);
    if (master) {
      const built = buildElementorFromCatalog(master, {
        title: p.hero?.headline || p.title,
        description: p.hero?.subheadline || p.sections?.[0]?.body || p.metaDescription,
        bodyHtml: html,
      });
      if (built && built.data) {
        elementorData = built.data;
        elementorCss = built.extractedCss || undefined;
      }
    }
  } catch (e) {
    console.warn("[ai-site-builder] master routing failed; falling back", e);
  }

  // (2) HTML → native Elementor conversion.
  if (!elementorData) {
    try {
      const tree = htmlToElementor(html);
      if (Array.isArray(tree) && tree.length) {
        elementorData = JSON.stringify(tree);
        elementorCss = extractTemplateCss(html) || undefined;
      }
    } catch (e) {
      console.warn("[ai-site-builder] native Elementor conversion failed; falling back to HTML", e);
    }
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
  };
}

async function generatePage(input: BuildInput, authToken?: string): Promise<{ ok: boolean; page?: PageJson; hints?: string[]; error?: string }> {
  let ref: ReferenceAnalysis | null = null;
  if (input.referenceUrl) ref = await fetchReference(input.referenceUrl);

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
  const system = `You are an expert web designer and conversion copywriter. Generate a complete, polished landing page as STRICT JSON only (no markdown, no commentary).
Schema:
{
  "title": string,
  "slug": string,
  "metaTitle": string (<=60 chars),
  "metaDescription": string (<=158 chars),
  "theme": { "primary": hex, "accent": hex, "bg": hex, "text": hex },
  "hero": { "headline": string, "subheadline": string, "cta": string },
  "sections": [ { "title": string, "body": string } ] (3-5 items, body 2-4 sentences),
  "features": [ { "title": string, "body": string } ] (3-6 items, body 1-2 sentences),
  "faqs": [ { "q": string, "a": string } ] (3-5 items)
}
Pick a tasteful, modern color theme that matches the brand/niche. Write all text in language code "${lang}". Be specific to the brand and niche, never generic placeholder text.
When a reference brief is provided, mirror its section structure and ordering closely (one "sections" item per reference section heading), reuse its feature and FAQ topics, and derive the theme from its brand colors — but rewrite ALL copy to fit the given brand, category and niche. Do not copy the reference text verbatim.`;

  const user = `Brand: ${input.brand || "(not given)"}
Category: ${input.category || "(not given)"}
Niche / industry: ${input.niche || "(not given)"}
Extra instructions: ${input.freeText || "(none)"}
${referenceBrief ? `\nReference brief (structure + palette to match, content to re-write for this brand):\n${referenceBrief}` : ""}

Generate the landing page JSON now.`;

  const result = await aiGenerate({
    authToken,
    promptType: "full_page",
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
  });

  if (!result.success) return { ok: false, error: result.content };

  let raw = result.content.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
  let parsed: PageJson;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "AI returned invalid JSON. Please try again." };
  }

  parsed.slug = slugify(parsed.slug || parsed.title || input.brand || "page");
  parsed.theme = parsed.theme || { primary: "#2563eb", accent: "#f59e0b", bg: "#ffffff", text: "#0f172a" };
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
        response_format: { type: "json_object" },
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
