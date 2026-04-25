/**
 * Centralized language code → human-readable name map shared across edge
 * functions, so AI prompts always receive a clear language name regardless of
 * whether the caller passes a 2-letter code ("fr"), a localized full name
 * ("Français"), or an English name ("French").
 *
 * Use `resolveLanguageName(code)` everywhere AI is invoked so niche/services
 * generation, SEO meta, AI rewrites, and AI defaults all stay in the page's
 * target language.
 */

export const LANGUAGE_NAME_BY_CODE: Record<string, string> = {
  en: "English", es: "Spanish", fr: "French", de: "German",
  pt: "Portuguese", it: "Italian", nl: "Dutch", ja: "Japanese",
  zh: "Chinese", ko: "Korean", ar: "Arabic", hi: "Hindi",
  ru: "Russian", tr: "Turkish", pl: "Polish", sv: "Swedish",
  da: "Danish", fi: "Finnish", no: "Norwegian", el: "Greek",
  cs: "Czech", ro: "Romanian", id: "Indonesian", th: "Thai",
  vi: "Vietnamese", uk: "Ukrainian", hu: "Hungarian", ms: "Malay",
  tl: "Filipino", bn: "Bengali", he: "Hebrew", fa: "Persian",
  bg: "Bulgarian", sk: "Slovak", sr: "Serbian", hr: "Croatian",
  lt: "Lithuanian", lv: "Latvian", et: "Estonian", sl: "Slovenian",
  ca: "Catalan", gl: "Galician", eu: "Basque", is: "Icelandic",
  mt: "Maltese", ga: "Irish", cy: "Welsh", af: "Afrikaans",
  sw: "Swahili", ur: "Urdu", ta: "Tamil", te: "Telugu",
  mr: "Marathi", gu: "Gujarati", pa: "Punjabi", kn: "Kannada",
  ml: "Malayalam", si: "Sinhala", km: "Khmer", lo: "Lao",
  my: "Burmese", ne: "Nepali", mn: "Mongolian", ka: "Georgian",
  am: "Amharic", az: "Azerbaijani", be: "Belarusian", bs: "Bosnian",
  mk: "Macedonian", sq: "Albanian", hy: "Armenian", kk: "Kazakh",
  uz: "Uzbek", ky: "Kyrgyz",
};

/**
 * Normalize whatever the caller passed (code, English name, localized name,
 * "Français (French)", uppercase, mixed case) into the canonical English
 * language name to embed in AI system prompts.
 */
export function resolveLanguageName(input: string | null | undefined): string {
  const raw = (input || "").trim();
  if (!raw) return "English";

  const lower = raw.toLowerCase();

  // 1) Exact 2-letter / 3-letter ISO code lookup.
  if (LANGUAGE_NAME_BY_CODE[lower]) return LANGUAGE_NAME_BY_CODE[lower];

  // 2) "Français (French)" or "French (fr)" → grab the parenthetical or first token.
  const inParen = raw.match(/\(([^)]+)\)/)?.[1]?.trim();
  if (inParen) {
    const innerLower = inParen.toLowerCase();
    if (LANGUAGE_NAME_BY_CODE[innerLower]) return LANGUAGE_NAME_BY_CODE[innerLower];
    // If parenthetical IS already an English name we recognize, use it.
    for (const name of Object.values(LANGUAGE_NAME_BY_CODE)) {
      if (name.toLowerCase() === innerLower) return name;
    }
  }

  // 3) If the input matches a known English name (case-insensitive), return canonical casing.
  for (const name of Object.values(LANGUAGE_NAME_BY_CODE)) {
    if (name.toLowerCase() === lower) return name;
  }

  // 4) Fallback: return whatever the user provided so the AI still gets a hint.
  return raw;
}
