import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { translations, type Language, languages } from "./translations";

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
  t: (key: string, vars?: Record<string, string | number>) => string;
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

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem("language") as Language | null;
    if (stored && translations[stored]) return stored;
    const detected = detectBrowserLanguage();
    if (detected) {
      localStorage.setItem("language", detected);
      document.documentElement.lang = detected;
      return detected;
    }
    return "en";
  });

  const [translating, setTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState<TranslationProgress>({ done: 0, total: 0 });
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [translationRetryNonce, setTranslationRetryNonce] = useState(0);

  const retryTranslation = useCallback(() => {
    setTranslationError(null);
    setTranslationRetryNonce((n) => n + 1);
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    // Always show the spinner while the UI swaps language — including when
    // switching back to English (the DOM translator has to restore originals).
    setLanguageState((prev) => {
      if (prev !== lang) {
        setTranslationError(null);
        setTranslationProgress({ done: 0, total: 0 });
        setTranslating(true);
      }
      return lang;
    });
    localStorage.setItem("language", lang);
    document.documentElement.lang = lang;
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const template = translations[language]?.[key] ?? translations.en[key] ?? key;

      if (!vars) return template;

      return Object.entries(vars).reduce(
        (result, [name, value]) => result.split(`{${name}}`).join(String(value)),
        template
      );
    },
    [language]
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
  t: (key: string, vars?: Record<string, string | number>) => {
    const template = translations.en[key] ?? key;

    if (!vars) return template;

    return Object.entries(vars).reduce(
      (result, [name, value]) => result.split(`{${name}}`).join(String(value)),
      template
    );
  },
};

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  return ctx ?? fallback;
}
