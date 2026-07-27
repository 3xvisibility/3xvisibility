/**
 * AutoTranslateProvider — runtime DOM translator.
 *
 * The built-in `t()` dictionary covers only a subset of UI strings; many
 * screens (wizards, dialogs, tables) still contain literal English. This
 * provider walks the DOM after every render/mutation and translates every
 * user-visible English text node + selected attributes into the currently
 * selected language via the `translate-ui` edge function.
 *
 * Design highlights:
 *  - Original English is captured once per node (`__autoTrOriginal`) so we can
 *    always restore it when the user switches back to `en`.
 *  - Translations are cached in `localStorage` keyed by `${lang}:${hash(text)}`
 *    so repeat visits are instant and offline-friendly.
 *  - A single `MutationObserver` debounces DOM changes and re-translates only
 *    the new/changed nodes.
 *  - Errors surface via the existing `translationError` state so the toast in
 *    the JSX below stays in sync.
 */

import { useEffect, useRef } from "react";
import { useLanguage } from "./LanguageContext";
import { supabase } from "@/integrations/supabase/client";

const TRANSLATABLE_ATTRS = ["placeholder", "title", "aria-label", "alt"] as const;
const CACHE_PREFIX = "autotr:v1:";
const MAX_BATCH = 60;

type TrTextNode = Text & { __autoTrOriginal?: string; __autoTrLang?: string };
type TrElement = HTMLElement & Record<string, string | undefined>;

// Very small djb2 hash for cache keys.
function hash(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function cacheGet(lang: string, text: string): string | null {
  try {
    return localStorage.getItem(`${CACHE_PREFIX}${lang}:${hash(text)}`);
  } catch {
    return null;
  }
}
function cacheSet(lang: string, text: string, translation: string) {
  try {
    localStorage.setItem(`${CACHE_PREFIX}${lang}:${hash(text)}`, translation);
  } catch {
    /* quota — ignore */
  }
}

// Text worth translating: has at least one alphabetic character, not just
// numbers/punctuation/symbols, and not code-like.
function shouldTranslate(text: string): boolean {
  const t = text.trim();
  if (t.length < 2 || t.length > 500) return false;
  if (!/[A-Za-z]/.test(t)) return false;
  // Skip pure identifiers/urls/emails.
  if (/^https?:\/\//i.test(t)) return false;
  if (/^[\w.-]+@[\w.-]+$/.test(t)) return false;
  if (/^[A-Z_][A-Z0-9_]{2,}$/.test(t)) return false; // SCREAMING_SNAKE
  return true;
}

const SKIP_TAGS = new Set([
  "SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "SVG", "PATH",
  "TEXTAREA", "INPUT", "SELECT", "OPTION",
]);

function isInsideSkipped(node: Node): boolean {
  let el: Node | null = node.parentNode;
  while (el && el !== document.body) {
    if (el.nodeType === 1) {
      const tag = (el as Element).tagName;
      if (SKIP_TAGS.has(tag)) return true;
      if ((el as Element).getAttribute("data-no-autotranslate") !== null) return true;
      const contentEditable = (el as HTMLElement).isContentEditable;
      if (contentEditable) return true;
    }
    el = el.parentNode;
  }
  return false;
}

interface Job {
  text: string;
  apply: (translated: string) => void;
}

function collectJobs(root: Node, targetLang: string): Job[] {
  const jobs: Job[] = [];

  // Text nodes.
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const node = n as TrTextNode;
    if (isInsideSkipped(node)) continue;
    const original = node.__autoTrOriginal ?? node.nodeValue ?? "";
    if (!shouldTranslate(original)) continue;
    // Skip if already applied for this language.
    if (node.__autoTrLang === targetLang && node.nodeValue !== original) continue;
    if (!node.__autoTrOriginal) node.__autoTrOriginal = original;
    jobs.push({
      text: original,
      apply: (translated) => {
        node.nodeValue = translated;
        node.__autoTrLang = targetLang;
      },
    });
  }

  // Attributes.
  const rootEl = root.nodeType === 1 ? (root as Element) : (root as ParentNode);
  const selector = TRANSLATABLE_ATTRS.map((a) => `[${a}]`).join(",");
  const els =
    rootEl && typeof (rootEl as ParentNode).querySelectorAll === "function"
      ? (rootEl as ParentNode).querySelectorAll<HTMLElement>(selector)
      : [];
  els.forEach((el) => {
    if (isInsideSkipped(el)) return;
    if (SKIP_TAGS.has(el.tagName)) return;
    for (const attr of TRANSLATABLE_ATTRS) {
      const value = el.getAttribute(attr);
      if (!value) continue;
      const origKey = `__autoTr_${attr}_orig` as const;
      const langKey = `__autoTr_${attr}_lang` as const;
      const stored = (el as TrElement)[origKey];
      const original = stored ?? value;
      if (!shouldTranslate(original)) continue;
      if ((el as TrElement)[langKey] === targetLang && el.getAttribute(attr) !== original) continue;
      if (!stored) (el as TrElement)[origKey] = original;
      jobs.push({
        text: original,
        apply: (translated) => {
          el.setAttribute(attr, translated);
          (el as TrElement)[langKey] = targetLang;
        },
      });
    }
  });

  return jobs;
}

function restoreOriginals() {
  if (typeof document === "undefined") return;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const node = n as TrTextNode;
    if (node.__autoTrOriginal && node.nodeValue !== node.__autoTrOriginal) {
      node.nodeValue = node.__autoTrOriginal;
    }
    node.__autoTrLang = "en";
  }
  const selector = TRANSLATABLE_ATTRS.map((a) => `[${a}]`).join(",");
  document.body.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    for (const attr of TRANSLATABLE_ATTRS) {
      const origKey = `__autoTr_${attr}_orig` as const;
      const langKey = `__autoTr_${attr}_lang` as const;
      const orig = (el as TrElement)[origKey];
      if (orig && el.getAttribute(attr) !== orig) el.setAttribute(attr, orig);
      (el as TrElement)[langKey] = "en";
    }
  });
}

async function translateBatch(texts: string[], target: string): Promise<string[] | null> {
  try {
    const { data, error } = await supabase.functions.invoke("translate-ui", {
      body: { texts, target },
    });
    if (error) throw error;
    const out = (data as { translations?: string[] } | null)?.translations;
    if (!Array.isArray(out) || out.length !== texts.length) return null;
    return out.map(String);
  } catch {
    return null;
  }
}

export function AutoTranslateProvider({ children }: { children: React.ReactNode }) {
  const {
    language,
    translating,
    translationProgress,
    translationError,
    retryTranslation,
    setTranslating,
    setTranslationProgress,
    setTranslationError,
    translationRetryNonce,
  } = useLanguage();

  const runIdRef = useRef(0);

  useEffect(() => {
    if (typeof document === "undefined") return;

    // English → restore any prior translations. Keep the spinner visible for a
    // brief moment so the user sees that the switch back is being applied.
    if (language === "en") {
      ++runIdRef.current;
      setTranslationError(null);
      setTranslationProgress({ done: 0, total: 1 });
      const raf = window.requestAnimationFrame(() => {
        restoreOriginals();
        setTranslationProgress({ done: 1, total: 1 });
      });
      const done = window.setTimeout(() => {
        setTranslating(false);
        setTranslationProgress({ done: 0, total: 0 });
      }, 600);
      return () => {
        window.cancelAnimationFrame(raf);
        window.clearTimeout(done);
      };
    }

    const runId = ++runIdRef.current;
    let cancelled = false;
    let observer: MutationObserver | null = null;
    let pendingTimer: number | null = null;

    async function processRoot(root: Node) {
      if (cancelled || runId !== runIdRef.current) return;
      const jobs = collectJobs(root, language);
      if (jobs.length === 0) return;

      // Group jobs by unique source text.
      const byText = new Map<string, Job[]>();
      jobs.forEach((j) => {
        const list = byText.get(j.text) ?? [];
        list.push(j);
        byText.set(j.text, list);
      });

      // Apply cached translations first, collect misses.
      const misses: string[] = [];
      byText.forEach((list, text) => {
        const cached = cacheGet(language, text);
        if (cached) {
          list.forEach((j) => j.apply(cached));
        } else {
          misses.push(text);
        }
      });

      if (misses.length === 0) return;

      setTranslating(true);
      const total = Math.ceil(misses.length / MAX_BATCH);
      setTranslationProgress({ done: 0, total });

      for (let i = 0; i < misses.length; i += MAX_BATCH) {
        if (cancelled || runId !== runIdRef.current) return;
        const chunk = misses.slice(i, i + MAX_BATCH);
        const translated = await translateBatch(chunk, language);
        if (cancelled || runId !== runIdRef.current) return;
        if (!translated) {
          setTranslationError("Translation service is unavailable. Please retry.");
          setTranslating(false);
          return;
        }
        chunk.forEach((text, k) => {
          const tr = translated[k] || text;
          cacheSet(language, text, tr);
          (byText.get(text) || []).forEach((j) => j.apply(tr));
        });
        setTranslationProgress({ done: Math.min(total, Math.ceil((i + chunk.length) / MAX_BATCH)), total });
      }

      setTranslating(false);
      setTranslationError(null);
    }

    setTranslationError(null);
    setTranslating(true);
    const startedAt = Date.now();
    void processRoot(document.body).finally(() => {
      // Keep the spinner up for at least 500ms (even when everything is served
      // from cache) so the switch is always visibly acknowledged.
      const wait = Math.max(0, 500 - (Date.now() - startedAt));
      window.setTimeout(() => {
        if (!cancelled && runId === runIdRef.current) setTranslating(false);
      }, wait);
    });

    // Watch for new content (route changes, dialogs, dynamic tables).
    observer = new MutationObserver((mutations) => {
      const roots = new Set<Node>();
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (node.nodeType === 1 || node.nodeType === 3) roots.add(node);
        });
        if (m.type === "characterData" && m.target) roots.add(m.target);
        if (m.type === "attributes" && m.target) roots.add(m.target);
      }
      if (roots.size === 0) return;
      if (pendingTimer) window.clearTimeout(pendingTimer);
      pendingTimer = window.setTimeout(() => {
        roots.forEach((r) => void processRoot(r));
      }, 250);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...TRANSLATABLE_ATTRS],
    });

    return () => {
      cancelled = true;
      if (observer) observer.disconnect();
      if (pendingTimer) window.clearTimeout(pendingTimer);
    };
  }, [language, translationRetryNonce, setTranslating, setTranslationProgress, setTranslationError]);

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
                Batch {Math.min(done + (done < total ? 1 : 0), total)} of {total}
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
