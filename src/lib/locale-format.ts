/**
 * Locale-aware text formatting for translated strings.
 *
 * Provides slug generation and title/sentence case helpers that respect
 * language-specific rules (German umlauts, Turkish dotted i, CJK graphemes,
 * Cyrillic / Arabic / Devanagari preservation, etc.).
 *
 * This file is mirrored at supabase/functions/_shared/locale-format.ts
 * so both client and edge runtimes use identical rules.
 */

// ─── Locale registry ─────────────────────────────────────────────────

/** Languages that should keep their native script in slugs (no transliteration). */
const UNICODE_SLUG_LANGS = new Set([
  "zh", "ja", "ko", "th", "ar", "he", "fa", "ur", "hi", "bn", "ta", "te",
  "ml", "kn", "gu", "pa", "mr", "ne", "ru", "uk", "bg", "sr", "mk", "be",
  "el", "ka", "hy", "am",
]);

/** Languages that need explicit lower-case locale (e.g. Turkish dotted i). */
const LOWERCASE_LOCALE_OVERRIDES: Record<string, string> = {
  tr: "tr-TR",
  az: "az-AZ",
};

/** German-style transliteration of accented Latin chars used as fallback. */
const GERMAN_TRANSLITERATION: Record<string, string> = {
  "ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss",
  "Ä": "ae", "Ö": "oe", "Ü": "ue",
};

/** Per-language single-char overrides applied before NFD stripping. */
const LANG_TRANSLITERATION: Record<string, Record<string, string>> = {
  de: GERMAN_TRANSLITERATION,
  da: { "æ": "ae", "ø": "oe", "å": "aa", "Æ": "ae", "Ø": "oe", "Å": "aa" },
  no: { "æ": "ae", "ø": "oe", "å": "aa", "Æ": "ae", "Ø": "oe", "Å": "aa" },
  sv: { "å": "aa", "ä": "ae", "ö": "oe", "Å": "aa", "Ä": "ae", "Ö": "oe" },
  fi: { "å": "aa", "ä": "ae", "ö": "oe", "Å": "aa", "Ä": "ae", "Ö": "oe" },
};

/** Articles / small words excluded from English title-case. */
const EN_TITLE_LOWERCASE = new Set([
  "a", "an", "and", "as", "at", "but", "by", "en", "for", "if", "in", "of",
  "on", "or", "the", "to", "v", "vs", "via", "with",
]);

/** Languages that use sentence case (only first word capitalized) for titles. */
const SENTENCE_CASE_LANGS = new Set([
  "fr", "es", "it", "pt", "ca", "nl", "pl", "cs", "sk", "ro", "hu", "ru",
  "uk", "bg", "sr", "tr", "vi", "id", "ms",
]);

/** Languages with no concept of letter case (skip case transforms). */
const NO_CASE_LANGS = new Set([
  "zh", "ja", "ko", "th", "ar", "he", "fa", "ur", "hi", "bn", "ta", "te",
  "ml", "kn", "gu", "pa", "mr", "ne", "ka", "am",
]);

// ─── Helpers ─────────────────────────────────────────────────────────

function normalizeLocale(locale?: string | null): string {
  if (!locale) return "en";
  return String(locale).toLowerCase().split(/[-_]/)[0];
}

export function lowerLocale(text: string, locale?: string): string {
  const lang = normalizeLocale(locale);
  if (NO_CASE_LANGS.has(lang)) return text;
  const override = LOWERCASE_LOCALE_OVERRIDES[lang];
  try {
    return override ? text.toLocaleLowerCase(override) : text.toLocaleLowerCase(lang);
  } catch {
    return text.toLowerCase();
  }
}

export function upperLocale(text: string, locale?: string): string {
  const lang = normalizeLocale(locale);
  if (NO_CASE_LANGS.has(lang)) return text;
  const override = LOWERCASE_LOCALE_OVERRIDES[lang];
  try {
    return override ? text.toLocaleUpperCase(override) : text.toLocaleUpperCase(lang);
  } catch {
    return text.toUpperCase();
  }
}

function applyLangTransliteration(text: string, lang: string): string {
  const map = LANG_TRANSLITERATION[lang];
  if (!map) return text;
  let out = "";
  for (const ch of text) out += map[ch] ?? ch;
  return out;
}

// ─── Slug ────────────────────────────────────────────────────────────

/**
 * Generate a URL-safe slug for the given locale.
 *
 * - Latin-script languages: NFD strip diacritics, ASCII slug
 * - German / Nordic: per-letter transliteration (ä→ae, ø→oe, ß→ss)
 * - Turkish: lowercase via tr-TR locale before transliteration
 * - CJK / Cyrillic / Arabic / Devanagari etc: keep native letters
 *   using \p{L}\p{N} and join with "-"
 */
export function slugifyLocale(text: string, locale?: string): string {
  if (!text) return "";
  const lang = normalizeLocale(locale);

  // Lowercase using locale-aware rules first (matters for tr/az)
  let s = lowerLocale(text, lang);

  // Apply per-language transliteration (German, Nordic, etc.)
  s = applyLangTransliteration(s, lang);

  if (UNICODE_SLUG_LANGS.has(lang)) {
    // Keep native script. Strip everything that isn't a letter/number,
    // collapse runs of separators into a single hyphen.
    try {
      s = s
        .replace(/[\s_]+/g, "-")
        .replace(/[^\p{L}\p{N}-]+/gu, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");
      return s;
    } catch {
      // Engine without Unicode property escapes — fall through to ASCII
    }
  }

  // ASCII fallback: NFD strip combining marks, keep [a-z0-9-]
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── Title / sentence case ───────────────────────────────────────────

/**
 * Locale-aware title formatter.
 *  - English: title-case with small-word exceptions
 *  - Romance / Slavic / Turkish / etc: sentence case (only first word + after .!?)
 *  - German: capitalize first word; preserve existing capitalization (nouns)
 *  - CJK / Arabic / Hebrew / Devanagari: returned unchanged (no case)
 */
export function titleCaseLocale(text: string, locale?: string): string {
  const trimmed = String(text || "").trim();
  if (!trimmed) return "";
  const lang = normalizeLocale(locale);

  if (NO_CASE_LANGS.has(lang)) return trimmed;

  if (lang === "de") {
    // Capitalize first letter only; preserve rest (German nouns are already capitalized in the source).
    return upperLocale(trimmed.charAt(0), lang) + trimmed.slice(1);
  }

  if (SENTENCE_CASE_LANGS.has(lang)) {
    const lower = lowerLocale(trimmed, lang);
    // Capitalize first letter of every sentence
    return lower.replace(/(^|[.!?¿¡]\s+)(\p{L})/gu, (_m, pre, ch) => pre + upperLocale(ch, lang));
  }

  // Default: English-style title case with small-word exclusions
  const words = trimmed.split(/(\s+|[-/])/);
  let firstWordSeen = false;
  return words
    .map((w) => {
      if (!w.trim() || /^[-/\s]+$/.test(w)) return w;
      const lower = lowerLocale(w, lang);
      if (firstWordSeen && EN_TITLE_LOWERCASE.has(lower)) return lower;
      firstWordSeen = true;
      return upperLocale(lower.charAt(0), lang) + lower.slice(1);
    })
    .join("");
}

// ─── Truncation ──────────────────────────────────────────────────────

/**
 * Truncate by grapheme count (so CJK / emoji aren't sliced mid-character).
 * Falls back to plain `slice` when Intl.Segmenter is unavailable.
 */
export function truncateByGrapheme(text: string, max: number, locale?: string): string {
  if (!text || max <= 0 || text.length <= max) return text || "";
  const lang = normalizeLocale(locale);
  try {
    // @ts-ignore — Segmenter may not be in older lib targets
    const seg = new Intl.Segmenter(lang, { granularity: "grapheme" });
    let out = "";
    let count = 0;
    // @ts-ignore
    for (const { segment } of seg.segment(text)) {
      if (count + segment.length > max) break;
      out += segment;
      count += segment.length;
    }
    return out;
  } catch {
    return text.slice(0, max);
  }
}
