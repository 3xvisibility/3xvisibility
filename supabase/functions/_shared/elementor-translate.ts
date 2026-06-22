// Elementor JSON translation.
//
// Walks a native Elementor `_elementor_data` tree and translates the *static*
// user-visible widget text (headings, paragraphs, button labels, list items…)
// into the target language. The Elementor structure, IDs, CSS classes, URLs and
// `{variable}` placeholders are kept 100% intact so the published page stays
// pixel-identical and fully editable inside Elementor.
//
// Cost strategy mirrors translate-template: free LibreTranslate first, Lovable
// AI gateway only as a fallback when the free service is unreachable.

const SUPPORTED: Record<string, string> = {
  en: "English", fr: "French", de: "German", es: "Spanish",
};

// Settings keys that hold user-visible, translatable text.
const TRANSLATABLE_KEYS = new Set([
  "title", "editor", "text", "html", "caption", "description_text",
  "button_text", "text_button", "sub_heading", "heading", "title_text",
  "before_text", "after_text", "highlighted_text", "rotating_text",
  "tab_title", "tab_content", "question", "answer", "alert_title",
  "alert_description", "testimonial_content", "testimonial_name",
  "testimonial_job", "price", "period", "feature_text", "ribbon_title",
  "inner_text", "blockquote_content", "author_name", "label", "placeholder",
  "field_label", "form_name", "button_text_yes", "step_title",
]);

// Keys we must never translate even if they contain letters.
const SKIP_KEY_HINTS = ["url", "src", "href", "link", "id", "class", "css", "selector", "icon", "key", "type", "_id", "color", "size", "align", "tag", "anchor", "name_attr"];

const PLACEHOLDER_RE = /\{([a-z0-9_]+)\}/gi;

function shouldTranslateKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (SKIP_KEY_HINTS.some((h) => lower.includes(h))) return false;
  return TRANSLATABLE_KEYS.has(lower);
}

function isTranslatableValue(v: string): boolean {
  const t = v.trim();
  if (!t) return false;
  if (!/[a-zA-Z]/.test(t)) return false;          // no letters → numbers/symbols
  if (/^https?:\/\//i.test(t)) return false;       // url
  if (/^[#.][a-z0-9_-]+$/i.test(t)) return false;  // css selector/color
  if (/^\{[a-z0-9_]+\}$/i.test(t)) return false;   // pure {variable}
  if (/^[a-z0-9_-]+$/i.test(t) && !/\s/.test(t) && t.length < 3) return false;
  return true;
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
        body: JSON.stringify({ q: text, source: "en", target: targetLang, format: "text" }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const data = await res.json();
      if (data?.translatedText) return data.translatedText as string;
    } catch (_e) { /* try next endpoint */ }
  }
  return null;
}

function preserveSpacing(original: string, translated: string): string {
  const leading = original.match(/^\s*/)?.[0] ?? "";
  const trailing = original.match(/\s*$/)?.[0] ?? "";
  return leading + translated.trim() + trailing;
}

const SENTINEL = "\n@@SPLIT@@\n";

async function libreBatch(values: string[], targetLang: string): Promise<string[] | null> {
  if (values.length === 0) return [];
  const joined = values.join(SENTINEL);
  const translated = await libreTranslate(joined, targetLang);
  if (translated == null) return null;
  const split = translated.split(/\n?@@SPLIT@@\n?/);
  if (split.length === values.length) return values.map((v, i) => preserveSpacing(v, split[i]));
  return null;
}

async function aiBatch(values: string[], langName: string): Promise<string[] | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY || values.length === 0) return null;
  const joined = values.join(SENTINEL);
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: `Translate each segment to ${langName}. Segments are separated by the exact marker "@@SPLIT@@". Keep the same number of segments and the markers in place. Preserve any HTML tags, {variables}, URLs and brand/proper names. Return only the translated text with markers, nothing else.` },
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
  } catch (_e) {
    return null;
  }
}

/**
 * Translate all static, user-visible text inside an Elementor tree into the
 * target language. Returns the same tree (mutated clone) with text replaced.
 * On any failure it returns the original tree unchanged.
 */
export async function translateElementorTree(data: unknown, targetLang: string): Promise<unknown> {
  if (!targetLang || targetLang === "en" || !SUPPORTED[targetLang]) return data;

  const cloned = JSON.parse(JSON.stringify(data));

  // 1️⃣ Collect every translatable string with a reference to its location.
  type Slot = { setter: (v: string) => void; value: string };
  const slots: Slot[] = [];

  const walk = (node: unknown) => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    const settings = obj.settings as Record<string, unknown> | undefined;
    if (settings && typeof settings === "object") {
      for (const [k, v] of Object.entries(settings)) {
        if (typeof v === "string" && shouldTranslateKey(k) && isTranslatableValue(v)) {
          slots.push({ value: v, setter: (nv) => { settings[k] = nv; } });
        } else if (Array.isArray(v)) {
          // Repeater fields (tabs, accordions, lists, testimonials…)
          v.forEach((item) => {
            if (item && typeof item === "object") {
              const it = item as Record<string, unknown>;
              for (const [ik, iv] of Object.entries(it)) {
                if (typeof iv === "string" && shouldTranslateKey(ik) && isTranslatableValue(iv)) {
                  slots.push({ value: iv, setter: (nv) => { it[ik] = nv; } });
                }
              }
            }
          });
        }
      }
    }
    if (Array.isArray(obj.elements)) walk(obj.elements);
  };
  walk(cloned);

  if (slots.length === 0) return cloned;

  // 2️⃣ Translate in chunks (free first, AI fallback).
  const langName = SUPPORTED[targetLang];
  const CHUNK = 20;
  for (let start = 0; start < slots.length; start += CHUNK) {
    const slice = slots.slice(start, start + CHUNK);
    const values = slice.map((s) => s.value);
    let out = await libreBatch(values, targetLang);
    if (!out) out = await aiBatch(values, langName);
    if (!out) continue; // leave this chunk untranslated on failure
    slice.forEach((s, i) => s.setter(out![i]));
  }

  return cloned;
}
