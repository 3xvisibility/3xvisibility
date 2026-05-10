// Public UI auto-translation endpoint.
// Accepts { texts: string[], target: string } and returns { translations: string[] }.
// Tries free LibreTranslate-compatible endpoints first, falls back to Lovable AI.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LIBRE_ENDPOINTS = [
  "https://translate.disroot.org/translate",
  "https://lt.vern.cc/translate",
  "https://translate.terraprint.co/translate",
];

const LANG_NAMES: Record<string, string> = {
  en: "English", fr: "French", de: "German", es: "Spanish", it: "Italian",
  pt: "Portuguese", nl: "Dutch", pl: "Polish", sv: "Swedish", da: "Danish",
  no: "Norwegian", fi: "Finnish", cs: "Czech", hu: "Hungarian", ro: "Romanian",
  el: "Greek", uk: "Ukrainian", ja: "Japanese", ko: "Korean",
  "zh": "Chinese (Simplified)", ar: "Arabic", he: "Hebrew", ru: "Russian",
  tr: "Turkish", hi: "Hindi", bn: "Bengali", id: "Indonesian", ms: "Malay",
  th: "Thai", vi: "Vietnamese",
};

async function libreBatch(texts: string[], target: string): Promise<string[] | null> {
  for (const url of LIBRE_ENDPOINTS) {
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 15_000);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: texts, source: "auto", target, format: "text" }),
        signal: ctrl.signal,
      });
      clearTimeout(to);
      if (!res.ok) continue;
      const data = await res.json();
      // Some endpoints return array, some return single object when q is array
      if (Array.isArray(data?.translatedText)) return data.translatedText as string[];
      if (Array.isArray(data) && data.every((d) => typeof d?.translatedText === "string")) {
        return data.map((d: any) => d.translatedText);
      }
      // Fallback: re-issue per item if batch unsupported
      const out: string[] = [];
      for (const q of texts) {
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q, source: "auto", target, format: "text" }),
        });
        if (!r.ok) return null;
        const d = await r.json();
        out.push(d?.translatedText || q);
      }
      return out;
    } catch (_e) {
      continue;
    }
  }
  return null;
}

async function aiBatch(texts: string[], target: string): Promise<string[] | null> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return null;
  const langName = LANG_NAMES[target] || target;
  const sys = `You are a translator. Translate each input string to ${langName}. Preserve placeholders like {variables}, URLs, numbers, and proper nouns. Return ONLY a JSON array of translated strings, same length and order as the input.`;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: JSON.stringify(texts) },
        ],
      }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const content = j.choices?.[0]?.message?.content?.trim() || "";
    const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    const arr = JSON.parse(cleaned);
    if (Array.isArray(arr) && arr.length === texts.length) return arr.map(String);
    return null;
  } catch (_e) {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { texts, target } = await req.json();
    if (!Array.isArray(texts) || !target || typeof target !== "string") {
      return new Response(JSON.stringify({ error: "texts[] and target required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (target === "en" || texts.length === 0) {
      return new Response(JSON.stringify({ translations: texts, via: "noop" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Cap batch size for safety
    const capped = texts.slice(0, 100).map((t) => String(t ?? ""));
    let translations = await libreBatch(capped, target);
    let via = "libre";
    if (!translations) {
      translations = await aiBatch(capped, target);
      via = "ai";
    }
    if (!translations) {
      return new Response(JSON.stringify({ translations: capped, via: "fallback-original" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ translations, via }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
