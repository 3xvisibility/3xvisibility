/**
 * Lightweight, dependency-free language detector.
 *
 * Scans a sample of text for high-frequency stop-words from each supported
 * language (matching SITE_LANGUAGE_OPTIONS) and returns the dominant language
 * label, or `null` if confidence is too low (e.g. text is just variables/HTML).
 *
 * This is intentionally simple — it's not a full ML detector. Its only job
 * is to spot obvious mismatches like "English template + French site" so we
 * can warn the user before generating pages.
 */

type LanguageLabel =
  | "English"
  | "French"
  | "Spanish"
  | "German"
  | "Italian"
  | "Portuguese"
  | "Dutch"
  | "Polish"
  | "Turkish";

const STOPWORDS: Record<LanguageLabel, string[]> = {
  English: ["the", "and", "for", "with", "you", "your", "this", "that", "from", "are", "have", "our", "best", "more", "all"],
  French: ["le", "la", "les", "des", "une", "vous", "nous", "pour", "avec", "votre", "nos", "est", "sont", "dans", "sur", "ces", "cette", "aux", "qui", "que"],
  Spanish: ["el", "la", "los", "las", "una", "para", "con", "por", "que", "su", "sus", "es", "son", "este", "esta", "más", "muy", "como"],
  German: ["der", "die", "das", "und", "für", "mit", "von", "ist", "sind", "ein", "eine", "auch", "auf", "nicht", "wir", "ihr"],
  Italian: ["il", "la", "lo", "gli", "una", "per", "con", "che", "del", "della", "sono", "siamo", "molto", "anche", "questo"],
  Portuguese: ["o", "a", "os", "as", "uma", "para", "com", "que", "do", "da", "são", "muito", "também", "este", "esta"],
  Dutch: ["de", "het", "een", "en", "van", "voor", "met", "zijn", "ook", "deze", "onze", "uw", "wij"],
  Polish: ["i", "w", "na", "z", "do", "to", "jest", "się", "nie", "tak", "wszystkie", "nasza"],
  Turkish: ["ve", "bir", "için", "ile", "bu", "şu", "çok", "daha", "olan", "olarak", "var"],
};

/** Strip HTML tags, template variables, URLs, numbers and shortcodes. */
function cleanText(input: string): string {
  return input
    .replace(/<[^>]+>/g, " ")
    .replace(/\{[^}]*\}/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[0-9]+/g, " ")
    .toLowerCase();
}

export interface LanguageDetectionResult {
  language: LanguageLabel | null;
  confidence: number; // 0–1, how strongly the dominant language wins
  wordsScanned: number;
}

export function detectTextLanguage(text: string): LanguageDetectionResult {
  if (!text || typeof text !== "string") {
    return { language: null, confidence: 0, wordsScanned: 0 };
  }

  const cleaned = cleanText(text);
  const words = cleaned.split(/[^a-zA-Zàâçéèêëîïôûùüÿñæœßäöüğışç]+/u).filter((w) => w.length > 1);
  if (words.length < 8) {
    return { language: null, confidence: 0, wordsScanned: words.length };
  }

  const counts: Record<string, number> = {};
  for (const w of words) {
    for (const [lang, list] of Object.entries(STOPWORDS)) {
      if (list.includes(w)) {
        counts[lang] = (counts[lang] || 0) + 1;
      }
    }
  }

  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) return { language: null, confidence: 0, wordsScanned: words.length };

  const [topLang, topScore] = ranked[0];
  const secondScore = ranked[1]?.[1] ?? 0;
  const total = ranked.reduce((s, [, n]) => s + n, 0);

  // Need at least 3 stop-word hits and a clear winner over runner-up.
  if (topScore < 3 || topScore <= secondScore) {
    return { language: null, confidence: 0, wordsScanned: words.length };
  }

  const confidence = total > 0 ? topScore / total : 0;
  return { language: topLang as LanguageLabel, confidence, wordsScanned: words.length };
}

/**
 * Compares a detected language against the locked site language and returns
 * a mismatch flag. Returns null when no comparison is meaningful.
 */
export function compareWithSiteLanguage(
  detected: LanguageLabel | null,
  siteLanguage: string | null | undefined,
): { mismatch: boolean; detected: LanguageLabel; siteLanguage: string } | null {
  if (!detected || !siteLanguage) return null;
  const site = siteLanguage.trim();
  if (!site || site === "__auto__") return null;
  return {
    mismatch: detected.toLowerCase() !== site.toLowerCase(),
    detected,
    siteLanguage: site,
  };
}
