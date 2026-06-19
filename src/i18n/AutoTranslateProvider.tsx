/**
 * AutoTranslateProvider
 *
 * All supported languages (en, fr, de, es) are fully covered by the built-in
 * `t()` dictionary, so no runtime DOM translation is required. The previous
 * DOM-based translator mutated React-managed text nodes directly and captured
 * already-translated text as the "original", which caused the sidebar (and
 * other t() content) to get stuck on a previously selected language when
 * switching between languages.
 *
 * This provider now only:
 *  - clears any legacy DOM translations left over from older sessions, and
 *  - resets the translating overlay flag.
 */

import { useEffect } from "react";
import { useLanguage } from "./LanguageContext";

const TRANSLATABLE_ATTRS = ["placeholder", "title", "aria-label", "alt"] as const;

// One-time cleanup of any DOM text/attributes that were mutated by the old
// runtime translator in a prior session. Reverts them to their captured
// original so React's t() rendering is authoritative again.
function clearLegacyTranslations() {
  if (typeof document === "undefined") return;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const textNode = node as Text & { __autoTrOriginal?: string; __autoTrLang?: string };
    if (!textNode.__autoTrOriginal) continue;
    delete textNode.__autoTrOriginal;
    delete textNode.__autoTrLang;
  }

  const selector = TRANSLATABLE_ATTRS.map((a) => `[${a}]`).join(",");
  document.body.querySelectorAll(selector).forEach((el) => {
    for (const attr of TRANSLATABLE_ATTRS) {
      delete (el as any)[`__autoTr_${attr}_orig`];
      delete (el as any)[`__autoTr_${attr}_lang`];
    }
  });
}

export function AutoTranslateProvider({ children }: { children: React.ReactNode }) {
  const { setTranslating } = useLanguage();

  useEffect(() => {
    clearLegacyTranslations();
    setTranslating(false);
  }, [setTranslating]);

  return <>{children}</>;
}
