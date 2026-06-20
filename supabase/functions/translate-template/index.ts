// translate-template
//
// Generic, stateless translation endpoint for marketplace templates. It takes
// an HTML `content` string plus an arbitrary map of short `strings` (name,
// description, SEO patterns, default values…) and returns translated versions
// in the requested language. Nothing is written to the database — the client
// caches the result.
//
// Cost strategy (matches translate-content): try the free LibreTranslate
// endpoints first; only fall back to Lovable AI when the free service is
// unreachable. {variable} placeholders, HTML tags, scripts and styles are
// preserved untouched.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPPORTED_LANGUAGES: Record<string, string> = {
  en: "English", fr: "French", de: "German", es: "Spanish",
};

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
        body: JSON.stringify({ q: text, source: "en", target: targetLang, format: "text" }),
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

const SENTINEL = "\n@@SPLIT@@\n";

// Translate many short strings in one batched request when possible.
async function translateBatch(values: string[], targetLang: string): Promise<string[] | null> {
  if (values.length === 0) return [];
  const joined = values.join(SENTINEL);
  const translated = await libreTranslate(joined, targetLang);
  if (translated == null) return null;
  const split = translated.split(/\n?@@SPLIT@@\n?/);
  if (split.length === values.length) {
    return values.map((v, i) => preserveSpacing(v, split[i]));
  }
  // Fallback: per-string
  const out: string[] = [];
  for (const v of values) {
    const t = await libreTranslate(v, targetLang);
    if (t == null) return null;
    out.push(preserveSpacing(v, t));
  }
  return out;
}

// Translate HTML by translating only visible text nodes, keeping tags,
// scripts, styles and {variable} placeholders intact.
async function translateHtmlFree(html: string, targetLang: string): Promise<string | null> {
  // Protect <script> and <style> blocks entirely.
  const protectedBlocks: string[] = [];
  const safe = html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, (m) => {
    protectedBlocks.push(m);
    return `\u0000B${protectedBlocks.length - 1}\u0000`;
  });

  const parts = safe.split(/(<[^>]+>)/g);
  const textIndices: number[] = [];
  const texts: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p.startsWith("<")) continue;
    const trimmed = p.trim();
    if (!trimmed) continue;
    if (/^[\u0000-\u001f]*$/.test(trimmed)) continue; // protected sentinels
    if (/^\{[a-zA-Z0-9_]+\}$/.test(trimmed)) continue; // pure {variable}
    textIndices.push(i);
    texts.push(p);
  }

  const CHUNK = 20;
  for (let start = 0; start < texts.length; start += CHUNK) {
    const slice = texts.slice(start, start + CHUNK);
    const translated = await translateBatch(slice, targetLang);
    if (translated == null) return null;
    for (let j = 0; j < slice.length; j++) {
      parts[textIndices[start + j]] = translated[j];
    }
  }

  let result = parts.join("");
  // Restore protected blocks.
  result = result.replace(/\u0000B(\d+)\u0000/g, (_, n) => protectedBlocks[Number(n)] ?? "");
  return result;
}

async function aiTranslateHtml(html: string, langName: string): Promise<string | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return null;
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        { role: "system", content: `Translate to ${langName}. Preserve all HTML tags, {variables}, URLs, scripts and styles. Return only the translated HTML, nothing else.` },
        { role: "user", content: html },
      ],
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

// AI fallback for a batch of short strings. Returns translations aligned to
// the input order, or null if AI is unavailable / misaligned.
async function aiTranslateBatch(values: string[], langName: string): Promise<string[] | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY || values.length === 0) return null;
  const joined = values.join(SENTINEL);
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        { role: "system", content: `Translate each segment to ${langName}. Segments are separated by the exact marker "@@SPLIT@@". Keep the same number of segments and the markers in place. Preserve {variables}, URLs and brand/proper names. Return only the translated text with markers, nothing else.` },
        { role: "user", content: joined },
      ],
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const out = data.choices?.[0]?.message?.content?.trim();
  if (!out) return null;
  const split = out.split(/\n?@@SPLIT@@\n?/);
  if (split.length !== values.length) return null;
  return values.map((v: string, i: number) => preserveSpacing(v, split[i]));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { content, strings, target_language } = await req.json();
    if (!target_language || !SUPPORTED_LANGUAGES[target_language]) {
      return new Response(JSON.stringify({ error: `Unsupported language: ${target_language}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (target_language === "en") {
      return new Response(JSON.stringify({ content, strings, via: "noop" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const langName = SUPPORTED_LANGUAGES[target_language];
    let via = "libretranslate";

    // Translate the short strings map (keys preserved).
    let translatedStrings: Record<string, string> = {};
    const stringMap = (strings && typeof strings === "object") ? strings as Record<string, string> : {};
    const keys = Object.keys(stringMap);
    if (keys.length > 0) {
      const values = keys.map((k) => stringMap[k] ?? "");
      const out = await translateBatch(values, target_language);
      if (out) {
        keys.forEach((k, i) => { translatedStrings[k] = out[i]; });
      } else {
        translatedStrings = stringMap; // keep originals on failure
      }
    }

    // Translate the HTML content.
    let translatedContent = content ?? "";
    if (typeof content === "string" && content.trim()) {
      let result = await translateHtmlFree(content, target_language);
      if (result == null) {
        result = await aiTranslateHtml(content, langName);
        via = "ai-fallback";
      }
      translatedContent = result ?? content;
      if (result == null) via = "failed";
    }

    return new Response(JSON.stringify({
      content: translatedContent,
      strings: translatedStrings,
      via,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
