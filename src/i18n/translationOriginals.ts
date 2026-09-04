import { languages, translations, type Language } from "./translations";

const REVERSE_CACHE_PREFIX = "autotr:rev:v1:";
const KEY_SEPARATOR = "\u0000";

const runtimeReverse = new Map<string, string>();
let dictionaryReverse: Map<string, string> | null = null;

function hash(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function isBadTranslation(value: unknown): boolean {
  if (typeof value !== "string") return true;
  const normalized = normalizeText(value);
  return !normalized || normalized === "[object Object]" || /\[object Object\]/i.test(normalized);
}

/** Clears the cached reverse dictionary after a locale bundle is loaded. */
export function resetDictionaryReverse() {
  dictionaryReverse = null;
}

function getDictionaryReverse(): Map<string, string> {
  if (dictionaryReverse) return dictionaryReverse;

  const map = new Map<string, string>();
  for (const { code } of languages) {
    if (code === "en") continue;
    const locale = translations[code] ?? {};
    for (const [key, localized] of Object.entries(locale)) {
      const english = translations.en[key];
      if (typeof localized !== "string" || typeof english !== "string") continue;
      const localizedKey = normalizeText(localized);
      if (!localizedKey || !normalizeText(english) || localizedKey === normalizeText(english)) continue;
      if (!map.has(localizedKey)) map.set(localizedKey, english);
    }
  }

  dictionaryReverse = map;
  return map;
}

function reverseKey(lang: string, translated: string): string {
  return `${lang}${KEY_SEPARATOR}${normalizeText(translated)}`;
}

function storageKey(lang: string, translated: string): string {
  return `${REVERSE_CACHE_PREFIX}${lang}:${hash(normalizeText(translated))}`;
}

export function rememberTranslationPair(lang: string, original: string, translated: string): void {
  const normalizedOriginal = normalizeText(original);
  const normalizedTranslated = normalizeText(translated);
  if (!lang || lang === "en" || !normalizedOriginal || !normalizedTranslated) return;
  if (isBadTranslation(original) || isBadTranslation(translated)) return;
  if (normalizedOriginal === normalizedTranslated) return;

  runtimeReverse.set(reverseKey(lang, translated), original);
  try {
    localStorage.setItem(storageKey(lang, translated), JSON.stringify({ translated: normalizedTranslated, original }));
  } catch {
    /* storage unavailable/quota — memory reverse still works for this session */
  }
}

function readRuntimeReverse(lang: string, text: string): string | null {
  const normalized = normalizeText(text);
  if (!normalized || lang === "en" || isBadTranslation(text)) return null;

  const inMemory = runtimeReverse.get(reverseKey(lang, text));
  if (inMemory) return inMemory;

  try {
    const raw = localStorage.getItem(storageKey(lang, text));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { translated?: string; original?: string };
    if (parsed.translated === normalized && typeof parsed.original === "string") {
      runtimeReverse.set(reverseKey(lang, text), parsed.original);
      return parsed.original;
    }
  } catch {
    /* ignore corrupt/unavailable cache */
  }

  return null;
}

export function resolveEnglishOriginal(text: string, preferredLang?: string): string | null {
  const normalized = normalizeText(text);
  if (!normalized) return null;

  const fromDictionary = getDictionaryReverse().get(normalized);
  if (fromDictionary) return fromDictionary;

  const orderedLangs: string[] = [];
  if (preferredLang && preferredLang !== "en") orderedLangs.push(preferredLang);
  for (const { code } of languages) {
    if (code !== "en" && !orderedLangs.includes(code)) orderedLangs.push(code);
  }

  for (const lang of orderedLangs) {
    const original = readRuntimeReverse(lang, text);
    if (original) return original;
  }

  return null;
}

export function coerceToEnglishOriginal(text: string, preferredLang?: Language | string): string {
  return resolveEnglishOriginal(text, preferredLang) ?? text;
}