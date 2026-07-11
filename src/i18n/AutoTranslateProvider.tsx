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
  const { translating } = useLanguage();

  useEffect(() => {
    clearLegacyTranslations();
  }, []);

  return (
    <>
      {children}
      {translating && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2 rounded-full border border-primary/30 bg-background/90 px-4 py-2 shadow-lg backdrop-blur"
        >
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-xs font-medium text-foreground">Translating…</span>
        </div>
      )}
    </>
  );
}
