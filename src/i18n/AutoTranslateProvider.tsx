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
  const { translating, translationProgress, translationError, retryTranslation } = useLanguage();

  useEffect(() => {
    clearLegacyTranslations();
  }, []);

  const { done, total } = translationProgress;
  const percent = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;

  return (
    <>
      {children}
      {translating && (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="fixed bottom-4 right-4 z-[9999] w-56 rounded-xl border border-primary/30 bg-background/90 px-4 py-3 shadow-lg backdrop-blur"
        >
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-xs font-medium text-foreground">Translating…</span>
            {total > 0 && (
              <span className="ml-auto text-xs font-semibold tabular-nums text-primary">{percent}%</span>
            )}
          </div>
          {total > 0 && (
            <>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Section {Math.min(done + (done < total ? 1 : 0), total)} of {total}
              </p>
            </>
          )}
        </div>
      )}
      {!translating && translationError && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed bottom-4 right-4 z-[9999] w-72 rounded-xl border border-destructive/40 bg-background/95 px-4 py-3 shadow-lg backdrop-blur"
        >
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              !
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">Translation failed</p>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground break-words">
                {translationError}
              </p>
              <button
                onClick={retryTranslation}
                className="mt-2 inline-flex items-center rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
