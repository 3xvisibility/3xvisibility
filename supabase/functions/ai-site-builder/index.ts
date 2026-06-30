// AI Site Builder — Novamira-style in-app agent.
// User provides brand/category/niche, a reference link, a template, or free text.
// The AI plans + generates a full page (copy + design) and returns a preview-ready
// HTML page that can be published to WordPress/Shopify via the existing publish flow.

import { aiGenerate, extractAuthToken } from "../_shared/ai-service.ts";

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

// Fetch a reference site's visible text to inspire style/structure.
async function fetchReference(url: string): Promise<string> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12_000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; 3xVisibilityBot/1.0)" },
    });
    clearTimeout(t);
    if (!res.ok) return "";
    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.slice(0, 4000);
  } catch {
    return "";
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

async function generatePage(input: BuildInput, authToken?: string): Promise<{ ok: boolean; page?: PageJson; error?: string }> {
  let referenceText = "";
  if (input.referenceUrl) referenceText = await fetchReference(input.referenceUrl);

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
Pick a tasteful, modern color theme that matches the brand/niche. Write all text in language code "${lang}". Be specific to the brand and niche, never generic placeholder text.`;

  const user = `Brand: ${input.brand || "(not given)"}
Category: ${input.category || "(not given)"}
Niche / industry: ${input.niche || "(not given)"}
Extra instructions: ${input.freeText || "(none)"}
${referenceText ? `\nReference website content to match tone & structure:\n"""${referenceText}"""` : ""}

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
  return { ok: true, page: parsed };
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
          page: {
            title: page.title,
            slug: page.slug,
            seo_title: page.metaTitle,
            seo_description: page.metaDescription,
            content: renderHtml(page),
          },
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
            page: {
              title: out.page.title,
              slug: out.page.slug,
              seo_title: out.page.metaTitle,
              seo_description: out.page.metaDescription,
              content: renderHtml(out.page),
            },
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
