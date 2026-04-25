// Re-translate the most recently generated pages of a connected website into
// that site's locked language and re-publish them to the CMS.
//
// Body: { website_id: string, count?: number (3..10, default 5) }
//
// Flow per page:
// 1. Try free LibreTranslate for content + meta (zero AI cost)
// 2. Fallback to Lovable AI Gateway only if LibreTranslate is unreachable
// 3. UPDATE the existing generated_pages row in place (do NOT create duplicates)
// 4. Re-publish via the existing publish-pages function so the live site updates
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Same supported set as translate-content for consistency.
const SUPPORTED_LANGUAGES: Record<string, string> = {
  en: "English", fr: "French", de: "German", es: "Spanish", it: "Italian",
  pt: "Portuguese", nl: "Dutch", pl: "Polish", sv: "Swedish", da: "Danish",
  ja: "Japanese", ko: "Korean", zh: "Chinese (Simplified)", ar: "Arabic",
  ru: "Russian", tr: "Turkish", hi: "Hindi",
};

// Map full-name site language values (saved by WebsiteLanguageSelect, e.g. "French")
// back to the 2-letter codes that LibreTranslate expects.
const NAME_TO_CODE: Record<string, string> = {
  english: "en", french: "fr", german: "de", spanish: "es", italian: "it",
  portuguese: "pt", dutch: "nl", polish: "pl", swedish: "sv", danish: "da",
  japanese: "ja", korean: "ko", chinese: "zh", arabic: "ar", russian: "ru",
  turkish: "tr", hindi: "hi",
};

function resolveLangCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  if (SUPPORTED_LANGUAGES[v]) return v;
  // Strip parenthetical, e.g. "Français (French)" or "中文 (Chinese)"
  const innerMatch = v.match(/\(([^)]+)\)/);
  const candidates = [v, innerMatch?.[1] || "", v.split(/[\s(]/)[0]];
  for (const c of candidates) {
    const trimmed = c.trim();
    if (NAME_TO_CODE[trimmed]) return NAME_TO_CODE[trimmed];
    if (SUPPORTED_LANGUAGES[trimmed]) return trimmed;
  }
  return null;
}

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
      console.warn(`LibreTranslate ${url} failed:`, (e as Error).message);
    }
  }
  return null;
}

function preserveSpacing(original: string, translated: string): string {
  const leading = original.match(/^\s*/)?.[0] ?? "";
  const trailing = original.match(/\s*$/)?.[0] ?? "";
  return leading + translated.trim() + trailing;
}

async function translateHtmlFree(html: string, targetLang: string): Promise<string | null> {
  const parts = html.split(/(<[^>]+>)/g);
  const textIndices: number[] = [];
  const texts: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p.startsWith("<")) continue;
    const trimmed = p.trim();
    if (!trimmed) continue;
    if (/^\{[a-zA-Z0-9_]+\}$/.test(trimmed)) continue;
    textIndices.push(i);
    texts.push(p);
  }
  if (texts.length === 0) return html;

  const SENTINEL = "\n@@SPLIT@@\n";
  const CHUNK = 20;
  for (let start = 0; start < texts.length; start += CHUNK) {
    const slice = texts.slice(start, start + CHUNK);
    const joined = slice.join(SENTINEL);
    const translated = await libreTranslate(joined, targetLang);
    if (translated == null) return null;
    const split = translated.split(/\n?@@SPLIT@@\n?/);
    if (split.length !== slice.length) {
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

async function aiTranslateHtml(html: string, langName: string, apiKey: string): Promise<string | null> {
  const sysPrompt = `Translate the following HTML to ${langName}. STRICT RULES:
- Preserve every HTML tag, attribute, class, id, inline style, script and CDATA block exactly.
- Preserve {variable_name} placeholders verbatim.
- Translate ONLY visible text content and alt/title/aria-label/placeholder attribute values.
- Return ONLY the translated HTML, no commentary.`;
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        { role: "system", content: sysPrompt },
        { role: "user", content: html },
      ],
    }),
  });
  if (!response.ok) {
    if (response.status === 402) throw new Error("AI credits exhausted");
    if (response.status === 429) throw new Error("AI rate limit exceeded");
    throw new Error(`AI translation failed (${response.status})`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
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

    const body = await req.json().catch(() => ({}));
    const websiteId: string | undefined = body?.website_id;
    const rawCount = Number(body?.count ?? 5);
    const count = Math.min(10, Math.max(1, Number.isFinite(rawCount) ? Math.floor(rawCount) : 5));

    if (!websiteId) {
      return new Response(JSON.stringify({ error: "website_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Resolve the site's locked language
    const { data: site, error: siteErr } = await supabase
      .from("websites")
      .select("id, name, language")
      .eq("id", websiteId)
      .maybeSingle();

    if (siteErr || !site) {
      return new Response(JSON.stringify({ error: "Website not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const langCode = resolveLangCode(site.language as string | null);
    if (!langCode) {
      return new Response(JSON.stringify({
        error: "This website has no locked language. Open the site settings and choose a Site Language first.",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const langName = SUPPORTED_LANGUAGES[langCode];

    // 2. Fetch the most recent N pages for this website
    const { data: pages, error: pagesErr } = await supabase
      .from("generated_pages")
      .select("id, title, slug, content, seo_title, seo_description, seo_keywords, status, website_id, campaign_id")
      .eq("website_id", websiteId)
      .order("created_at", { ascending: false })
      .limit(count);

    if (pagesErr) {
      return new Response(JSON.stringify({ error: pagesErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!pages || pages.length === 0) {
      return new Response(JSON.stringify({
        success: true, target_language: langCode, retranslated: 0, republished: 0,
        message: "No generated pages found for this website yet.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const updated: { id: string; title: string; via: string }[] = [];
    const errors: { page_id: string; error: string }[] = [];

    for (const page of pages) {
      try {
        let translatedContent = await translateHtmlFree(page.content, langCode);
        let via = "libretranslate";

        if (translatedContent == null) {
          if (!LOVABLE_API_KEY) {
            errors.push({ page_id: page.id, error: "Free translator unreachable and AI not configured" });
            continue;
          }
          translatedContent = await aiTranslateHtml(page.content, langName, LOVABLE_API_KEY);
          via = "ai-fallback";
          if (!translatedContent) {
            errors.push({ page_id: page.id, error: "Empty AI translation response" });
            continue;
          }
        }

        const meta = await translateMetaFree({
          title: page.title,
          seo_title: page.seo_title || "",
          seo_description: page.seo_description || "",
          seo_keywords: page.seo_keywords || [],
        }, langCode);

        const { error: updateErr } = await supabase
          .from("generated_pages")
          .update({
            title: meta.title || page.title,
            content: translatedContent,
            seo_title: meta.seo_title || page.seo_title,
            seo_description: meta.seo_description || page.seo_description,
            seo_keywords: meta.seo_keywords?.length ? meta.seo_keywords : page.seo_keywords,
          })
          .eq("id", page.id);

        if (updateErr) {
          errors.push({ page_id: page.id, error: updateErr.message });
          continue;
        }

        updated.push({ id: page.id, title: meta.title || page.title, via });
      } catch (e) {
        errors.push({ page_id: page.id, error: (e as Error).message });
      }
    }

    // 3. Re-publish the successfully re-translated pages
    let republished = 0;
    let publishError: string | null = null;
    if (updated.length > 0) {
      try {
        const { data: pubData, error: pubErr } = await supabase.functions.invoke("publish-pages", {
          body: {
            page_ids: updated.map((u) => u.id),
            publish_type: "publish",
            website_id: websiteId,
          },
        });
        if (pubErr) {
          publishError = pubErr.message;
        } else {
          republished = (pubData as { published?: number; success_count?: number } | null)?.published
            ?? (pubData as { success_count?: number } | null)?.success_count
            ?? updated.length;
        }
      } catch (e) {
        publishError = (e as Error).message;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      target_language: langCode,
      target_language_name: langName,
      retranslated: updated.length,
      republished,
      publish_error: publishError,
      updated,
      errors,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("retranslate-site-pages error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
