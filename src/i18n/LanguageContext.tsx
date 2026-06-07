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

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
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

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
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
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

const fallback: LanguageContextType = {
  language: "en",
  setLanguage: () => {},
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
