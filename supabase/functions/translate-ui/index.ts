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

function isBadText(value: unknown): boolean {
  if (typeof value !== "string") return true;
  const normalized = value.trim();
  return !normalized || normalized === "[object Object]" || /\[object Object\]/i.test(normalized);
}

/** Coerce any provider response item into a plain string (never "[object Object]"). */
function toText(v: unknown, fallback: string, depth = 0): string {
  if (depth > 4) return fallback;
  if (typeof v === "string") return isBadText(v) ? fallback : v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) {
    const joined = v.map((x) => toText(x, "", depth + 1)).filter((x) => !isBadText(x)).join(" ").trim();
    return joined || fallback;
  }
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    for (const k of ["translatedText", "translation", "translated_text", "text", "value", "result", "output", "content", "message"]) {
      const coerced = toText(o[k], "", depth + 1);
      if (!isBadText(coerced)) return coerced;
    }
    return fallback;
  }
  return fallback;
}

/** Query one LibreTranslate endpoint with a short timeout. */
async function libreOnce(url: string, texts: string[], target: string, timeoutMs: number): Promise<string[] | null> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: texts, source: "auto", target, format: "text" }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data?.translatedText) && data.translatedText.length === texts.length) {
      return (data.translatedText as unknown[]).map((v, i) => toText(v, texts[i] ?? ""));
    }
    if (Array.isArray(data) && data.length === texts.length) {
      return data.map((d: unknown, i: number) => toText(d, texts[i] ?? ""));
    }
    return null;
  } catch (_e) {
    return null;
  } finally {
    clearTimeout(to);
  }
}

/**
 * Ask every endpoint at once and keep the first usable answer.
 * Sequential probing with 15s timeouts used to make a single request take ~17s.
 */
async function libreBatch(texts: string[], target: string): Promise<string[] | null> {
  const TIMEOUT_MS = 1_200;
  return await new Promise<string[] | null>((resolve) => {
    let pending = LIBRE_ENDPOINTS.length;
    let settled = false;
    for (const url of LIBRE_ENDPOINTS) {
      libreOnce(url, texts, target, TIMEOUT_MS).then((out) => {
        if (!settled && out) {
          settled = true;
          resolve(out);
          return;
        }
        if (--pending === 0 && !settled) {
          settled = true;
          resolve(null);
        }
      });
    }
  });
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
    if (Array.isArray(arr) && arr.length === texts.length) return arr.map((v: unknown, i: number) => toText(v, texts[i] ?? ""));
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
    const capped = texts.slice(0, 100).map((t) => toText(t, ""));
    const hasLetters = (s: string) => /[A-Za-z\u00C0-\u024F]/.test(s);
    let translations = await libreBatch(capped, target);
    let via = "libre";
    if (!translations) {
      translations = await aiBatch(capped, target);
      via = "ai";
    } else {
      // LibreTranslate often returns some strings unchanged (untranslated).
      // Fill those gaps with the AI translator so no item stays in English.
      const gapIdx: number[] = [];
      translations.forEach((tr, i) => {
        const orig = capped[i];
        if (hasLetters(orig) && tr.trim().toLowerCase() === orig.trim().toLowerCase()) {
          gapIdx.push(i);
        }
      });
      if (gapIdx.length > 0) {
        const aiFixed = await aiBatch(gapIdx.map((i) => capped[i]), target);
        if (aiFixed && aiFixed.length === gapIdx.length) {
          gapIdx.forEach((origIdx, k) => {
            translations![origIdx] = aiFixed[k];
          });
          via = "libre+ai";
        }
      }
    }
    if (!translations) {
      return new Response(JSON.stringify({ translations: capped, via: "fallback-original" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const safe = translations.map((tr, i) => {
      const s2 = toText(tr, capped[i]);
      return isBadText(s2) ? capped[i] : s2;
    });
    return new Response(JSON.stringify({ translations: safe, via }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
