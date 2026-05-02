import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { aiGenerate } from "../_shared/ai-service.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPPORTED_LANGUAGES: Record<string, string> = {
  en: "English", fr: "French", de: "German", es: "Spanish", it: "Italian",
  pt: "Portuguese", nl: "Dutch", pl: "Polish", sv: "Swedish", da: "Danish",
  ja: "Japanese", ko: "Korean", zh: "Chinese (Simplified)", ar: "Arabic",
  ru: "Russian", tr: "Turkish", hi: "Hindi",
};

// Free public LibreTranslate-compatible endpoints (no API key required).
// We try them in order; if all fail we fall back to AI.
const LIBRE_ENDPOINTS = [
  "https://translate.disroot.org/translate",
  "https://lt.vern.cc/translate",
  "https://translate.terraprint.co/translate",
];

async function libreTranslate(text: string, targetLang: string): Promise<string | null> {
  if (!text.trim()) return text;
  for (const url of LIBRE_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text, source: "auto", target: targetLang, format: "text" }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const data = await res.json();
      if (data?.translatedText) return data.translatedText as string;
    } catch (e) {
      console.warn(`LibreTranslate endpoint ${url} failed:`, (e as Error).message);
    }
  }
  return null;
}

/**
 * Translate HTML by extracting text nodes, sending only the text to a free
 * translation API, then putting the translated text back into the original
 * HTML structure. This preserves all tags, classes, attributes, scripts, and
 * {variable} placeholders without spending any AI credits.
 */
async function translateHtmlFree(html: string, targetLang: string): Promise<string | null> {
  // Tokenize: split on tags so we keep tags intact
  const parts = html.split(/(<[^>]+>)/g);
  const textIndices: number[] = [];
  const texts: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    // Skip tags, scripts/styles handled below, empty/whitespace, and {variable} placeholders only
    if (p.startsWith("<")) continue;
    const trimmed = p.trim();
    if (!trimmed) continue;
    // Skip pure variable tokens like {city}
    if (/^\{[a-zA-Z0-9_]+\}$/.test(trimmed)) continue;
    textIndices.push(i);
    texts.push(p);
  }
  if (texts.length === 0) return html;

  // Translate in chunks of ~20 strings joined by a sentinel that survives translation
  const SENTINEL = "\n@@SPLIT@@\n";
  const CHUNK = 20;
  for (let start = 0; start < texts.length; start += CHUNK) {
    const slice = texts.slice(start, start + CHUNK);
    const joined = slice.join(SENTINEL);
    const translated = await libreTranslate(joined, targetLang);
    if (translated == null) return null; // bail out, caller will fallback
    const split = translated.split(/\n?@@SPLIT@@\n?/);
    if (split.length !== slice.length) {
      // Fallback: per-string translation for this chunk
      for (let j = 0; j < slice.length; j++) {
        const t = await libreTranslate(slice[j], targetLang);
        if (t == null) return null;
        parts[textIndices[start + j]] = preserveSpacing(slice[j], t);
      }
    } else {
      for (let j = 0; j < slice.length; j++) {
        parts[textIndices[start + j]] = preserveSpacing(slice[j], split[j]);
      }
    }
  }
  return parts.join("");
}

function preserveSpacing(original: string, translated: string): string {
  const leading = original.match(/^\s*/)?.[0] ?? "";
  const trailing = original.match(/\s*$/)?.[0] ?? "";
  return leading + translated.trim() + trailing;
}

async function translateMetaFree(
  meta: { title: string; seo_title: string; seo_description: string; seo_keywords: string[] },
  targetLang: string,
) {
  const t = async (s: string) => (s ? (await libreTranslate(s, targetLang)) ?? s : s);
  const title = await t(meta.title);
  const seo_title = await t(meta.seo_title);
  const seo_description = await t(meta.seo_description);
  const seo_keywords: string[] = [];
  for (const kw of meta.seo_keywords || []) {
    seo_keywords.push((await libreTranslate(kw, targetLang)) ?? kw);
  }
  return { title, seo_title, seo_description, seo_keywords };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { page_ids, target_language } = await req.json();

    if (!page_ids?.length || !target_language) {
      return new Response(JSON.stringify({ error: "page_ids and target_language are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!SUPPORTED_LANGUAGES[target_language]) {
      return new Response(JSON.stringify({ error: `Unsupported language: ${target_language}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: pages, error: fetchErr } = await supabase
      .from("generated_pages")
      .select("id, title, content, slug, seo_title, seo_description, seo_keywords, campaign_id, website_id, workspace_id, user_id, status")
      .in("id", page_ids);

    if (fetchErr || !pages?.length) {
      return new Response(JSON.stringify({ error: "No pages found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { original_id: string; translated_id: string; title: string; via: string }[] = [];
    const errors: { page_id: string; error: string }[] = [];

    for (const page of pages) {
      try {
        // 1. Try free translation first (zero AI cost)
        let translatedContent = await translateHtmlFree(page.content, target_language);
        let via = "libretranslate";

        // 2. Fallback to AI ONLY if free service is unreachable
        if (translatedContent == null) {
          const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
          if (!LOVABLE_API_KEY) {
            errors.push({ page_id: page.id, error: "Free translation unavailable and AI not configured" });
            continue;
          }
          const langName = SUPPORTED_LANGUAGES[target_language];
          const sysPrompt = `Translate to ${langName}. Preserve HTML tags, {variables}, URLs. Return only translated HTML.`;
          const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                { role: "system", content: sysPrompt },
                { role: "user", content: page.content },
              ],
            }),
          });
          if (!response.ok) {
            errors.push({ page_id: page.id, error: response.status === 402 ? "AI credits exhausted" : `Translation failed (${response.status})` });
            continue;
          }
          const aiResult = await response.json();
          translatedContent = aiResult.choices?.[0]?.message?.content?.trim() || null;
          via = "ai-fallback";
          if (!translatedContent) {
            errors.push({ page_id: page.id, error: "Empty translation response" });
            continue;
          }
        }

        // Translate metadata (free)
        const meta = await translateMetaFree({
          title: page.title,
          seo_title: page.seo_title || "",
          seo_description: page.seo_description || "",
          seo_keywords: page.seo_keywords || [],
        }, target_language);

        const translatedSlug = `${page.slug}-${target_language}`;
        const { data: newPage, error: insertErr } = await supabase
          .from("generated_pages")
          .insert({
            title: meta.title || `${page.title} [${target_language.toUpperCase()}]`,
            slug: translatedSlug,
            content: translatedContent,
            seo_title: meta.seo_title || page.seo_title,
            seo_description: meta.seo_description || page.seo_description,
            seo_keywords: meta.seo_keywords?.length ? meta.seo_keywords : page.seo_keywords,
            campaign_id: page.campaign_id,
            website_id: page.website_id,
            workspace_id: page.workspace_id,
            user_id: page.user_id,
            status: "pending",
          })
          .select("id")
          .single();

        if (insertErr) {
          errors.push({ page_id: page.id, error: insertErr.message });
          continue;
        }

        results.push({ original_id: page.id, translated_id: newPage.id, title: meta.title, via });
      } catch (e: any) {
        errors.push({ page_id: page.id, error: e.message });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      translated: results.length,
      failed: errors.length,
      results,
      errors,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("translate-content error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
