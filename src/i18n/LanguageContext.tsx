import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { translations, loadLocale, type Language, languages } from "./translations";
import { resetDictionaryReverse } from "./translationOriginals";
import { fetchOverrides, getCachedOverrides, type OverrideMap } from "./overrides";

function detectBrowserLanguage(): Language | null {
  if (typeof navigator === "undefined") return null;
  const browserLang = navigator.language || (navigator as unknown as Record<string, string>).userLanguage || "";
  const code = browserLang.toLowerCase();

  const supported = languages.map((l) => l.code);

  // Exact match
  if (supported.includes(code as Language)) return code as Language;

  // Prefix match (e.g. "fr-ca" -> "fr")
  const prefix = code.split("-")[0];
  if (supported.includes(prefix as Language)) return prefix as Language;

  return null;
}

interface TranslationProgress {
  /** Sections (batches) completed so far. */
  done: number;
  /** Total sections (batches) to translate. */
  total: number;
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, vars?: Record<string, unknown>) => string;
  /** True while the runtime DOM translator is processing a language switch. */
  translating: boolean;
  /** Internal — used by AutoTranslateProvider to signal completion. */
  setTranslating: (v: boolean) => void;
  /** Per-section translation progress for the loading indicator. */
  translationProgress: TranslationProgress;
  /** Internal — used by the runtime translator to report progress. */
  setTranslationProgress: (p: TranslationProgress) => void;
  /** Non-null when the last translation attempt failed (network/API). */
  translationError: string | null;
  /** Internal — used by the runtime translator to report failure. */
  setTranslationError: (msg: string | null) => void;
  /** Increments to re-trigger a translation attempt after a failure. */
  translationRetryNonce: number;
  /** Manually retry the failed translation. */
  retryTranslation: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function formatTranslationValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map(formatTranslationValue).filter(Boolean).join(", ");
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["label", "name", "title", "displayName", "plan", "value", "text", "id"]) {
      const formatted = formatTranslationValue(record[key]);
      if (formatted) return formatted;
    }
    return "";
  }
  return String(value);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem("language") as Language | null;
    if (stored && languages.some((l) => l.code === stored)) return stored;
    const detected = detectBrowserLanguage();
    if (detected) {
      localStorage.setItem("language", detected);
      document.documentElement.lang = detected;
      return detected;
    }
    return "en";
  });

  const [localeVersion, setLocaleVersion] = useState(0);
  const [overrides, setOverrides] = useState<OverrideMap>(() => getCachedOverrides());

  // Admin-defined text overrides replace bundled wording when present.
  useEffect(() => {
    let active = true;
    fetchOverrides().then((map) => {
      if (active) setOverrides(map);
    });
    return () => {
      active = false;
    };
  }, []);

  // Non-English locale bundles are fetched on demand to keep the first load light.
  useEffect(() => {
    if (language === "en" || translations[language]) return;
    let active = true;
    loadLocale(language).then(() => {
      if (!active) return;
      resetDictionaryReverse();
      setLocaleVersion((v) => v + 1);
    });
    return () => {
      active = false;
    };
  }, [language]);

  const [translating, setTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState<TranslationProgress>({ done: 0, total: 0 });
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [translationRetryNonce, setTranslationRetryNonce] = useState(0);

  const retryTranslation = useCallback(() => {
    setTranslationError(null);
    setTranslationRetryNonce((n) => n + 1);
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    const prev = (localStorage.getItem("language") as Language | null) ?? "en";
    localStorage.setItem("language", lang);
    document.documentElement.lang = lang;

    // Switching back to English is the one case the runtime DOM translator
    // can't fully recover from: nodes captured while the UI was already in a
    // non-English language have their "original" set to the translated text,
    // so restoring writes the same translated text back. React re-renders
    // from source (English literals + t()) — a fresh load is the reliable
    // reset. Skip the reload if we're already on English.
    if (lang === "en" && prev !== "en") {
      if (typeof window !== "undefined") window.location.reload();
      return;
    }

    setLanguageState((current) => {
      if (current !== lang) {
        setTranslationError(null);
        setTranslationProgress({ done: 0, total: 0 });
        setTranslating(true);
      }
      return lang;
    });
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, unknown>) => {
      const template =
        overrides[language]?.[key] ??
        translations[language]?.[key] ??
        overrides.en?.[key] ??
        translations.en[key] ??
        key;

      if (!vars) return template;

      return Object.entries(vars).reduce(
        (result, [name, value]) => result.split(`{${name}}`).join(formatTranslationValue(value)),
        template
      );
    },
    [language, localeVersion, overrides]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, translating, setTranslating, translationProgress, setTranslationProgress, translationError, setTranslationError, translationRetryNonce, retryTranslation }}>
      {children}
    </LanguageContext.Provider>
  );
}

const fallback: LanguageContextType = {
  language: "en",
  setLanguage: () => {},
  translating: false,
  setTranslating: () => {},
  translationProgress: { done: 0, total: 0 },
  setTranslationProgress: () => {},
  translationError: null,
  setTranslationError: () => {},
  translationRetryNonce: 0,
  retryTranslation: () => {},
  t: (key: string, vars?: Record<string, unknown>) => {
    const template = translations.en[key] ?? key;

    if (!vars) return template;

    return Object.entries(vars).reduce(
      (result, [name, value]) => result.split(`{${name}}`).join(formatTranslationValue(value)),
      template
    );
  },
};

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  return ctx ?? fallback;
}
