import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { translations, type Language } from "./translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem("language") as Language | null;
    return stored && translations[stored] ? stored : "en";
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
