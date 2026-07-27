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
import { coerceToEnglishOriginal, rememberTranslationPair, resolveEnglishOriginal } from "./translationOriginals";

const TRANSLATABLE_ATTRS = ["placeholder", "title", "aria-label", "alt"] as const;
const CACHE_PREFIX = "autotr:v2:";
const MAX_BATCH = 100;
const MAX_CONCURRENCY = 4;

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
    const cached = localStorage.getItem(`${CACHE_PREFIX}${lang}:${hash(text)}`);
    return isBadTranslation(cached) ? null : cached;
  } catch {
    return null;
  }
}
function cacheSet(lang: string, text: string, translation: string) {
  if (isBadTranslation(translation)) return;
  try {
    localStorage.setItem(`${CACHE_PREFIX}${lang}:${hash(text)}`, translation);
  } catch {
    /* quota — ignore */
  }
}

function isBadTranslation(value: unknown): boolean {
  if (typeof value !== "string") return !value;
  const normalized = value.trim();
  return !normalized || normalized === "[object Object]" || /\[object Object\]/i.test(normalized);
}

// Text worth translating: has at least one alphabetic character, not just
// numbers/punctuation/symbols, and not code-like.
function shouldTranslate(text: string): boolean {
  const t = text.trim();
  if (isBadTranslation(t)) return false;
  if (t.length < 2 || t.length > 500) return false;
  if (!/[A-Za-z]/.test(t)) return false;
  // Skip pure identifiers/urls/emails.
  if (/^https?:\/\//i.test(t)) return false;
  if (/^[\w.-]+@[\w.-]+$/.test(t)) return false;
  if (/^[A-Z_][A-Z0-9_]{2,}$/.test(t)) return false; // SCREAMING_SNAKE
  return true;
}

function getNodeOriginal(node: TrTextNode, targetLang?: string): string {
  const current = node.nodeValue ?? "";
  if (!node.__autoTrOriginal) {
    node.__autoTrOriginal = coerceToEnglishOriginal(current, targetLang);
  } else {
    const restored = resolveEnglishOriginal(node.__autoTrOriginal, node.__autoTrLang ?? targetLang);
    if (restored) node.__autoTrOriginal = restored;
  }
  return node.__autoTrOriginal;
}

function getAttrOriginal(el: HTMLElement, attr: (typeof TRANSLATABLE_ATTRS)[number], targetLang?: string): string | null {
  const value = el.getAttribute(attr);
  if (!value) return null;

  const origKey = `__autoTr_${attr}_orig` as const;
  const langKey = `__autoTr_${attr}_lang` as const;
  const stored = (el as TrElement)[origKey];
  if (!stored) {
    const original = coerceToEnglishOriginal(value, targetLang);
    (el as TrElement)[origKey] = original;
    return original;
  }

  const restored = resolveEnglishOriginal(stored, (el as TrElement)[langKey] ?? targetLang);
  if (restored) (el as TrElement)[origKey] = restored;
  return (el as TrElement)[origKey] ?? stored;
}

const SKIP_TAGS = new Set([
  "SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "SVG", "PATH",
  "TEXTAREA", "INPUT", "SELECT", "OPTION",
]);

function isInsideSkipped(node: Node): boolean {
  let el: Node | null = node.nodeType === 1 ? node : node.parentNode;
  while (el && el !== document.body) {
    if (el.nodeType === 1) {
      const tag = (el as Element).tagName;
      if (SKIP_TAGS.has(tag)) return true;
      if ((el as Element).getAttribute("data-no-autotranslate") !== null) return true;
      if ((el as Element).getAttribute("data-no-translate") !== null) return true;
      if ((el as Element).getAttribute("translate") === "no") return true;
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
    const original = getNodeOriginal(node, targetLang);
    if (!shouldTranslate(original)) continue;
    // Skip if already applied for this language.
    if (node.__autoTrLang === targetLang && node.nodeValue !== original && !isBadTranslation(node.nodeValue)) continue;
    jobs.push({
      text: original,
      apply: (translated) => {
        rememberTranslationPair(targetLang, original, translated);
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
      const original = getAttrOriginal(el, attr, targetLang);
      if (!original) continue;
      const langKey = `__autoTr_${attr}_lang` as const;
      if (!shouldTranslate(original)) continue;
      if ((el as TrElement)[langKey] === targetLang && el.getAttribute(attr) !== original && !isBadTranslation(el.getAttribute(attr))) continue;
      jobs.push({
        text: original,
        apply: (translated) => {
          rememberTranslationPair(targetLang, original, translated);
          el.setAttribute(attr, translated);
          (el as TrElement)[langKey] = targetLang;
        },
      });
    }
  });

  return jobs;
}

function restoreOriginals(root: Node = typeof document !== "undefined" ? document.body : (null as unknown as Node)) {
  if (typeof document === "undefined" || !root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null = root.nodeType === 3 ? root : walker.nextNode();
  while (n) {
    const node = n as TrTextNode;
    if (!node.__autoTrOriginal) {
      const restored = resolveEnglishOriginal(node.nodeValue ?? "", node.__autoTrLang);
      if (restored) node.__autoTrOriginal = restored;
    } else {
      const restored = resolveEnglishOriginal(node.__autoTrOriginal, node.__autoTrLang);
      if (restored) node.__autoTrOriginal = restored;
    }
    if (node.__autoTrOriginal && node.nodeValue !== node.__autoTrOriginal) {
      node.nodeValue = node.__autoTrOriginal;
    }
    node.__autoTrLang = "en";
    n = walker.nextNode();
  }
  const selector = TRANSLATABLE_ATTRS.map((a) => `[${a}]`).join(",");
  const scope: ParentNode | null =
    root.nodeType === 1 ? (root as Element) : root.nodeType === 9 || root === document.body ? document.body : root.parentElement;
  const els: HTMLElement[] = [];
  if (scope && typeof (scope as ParentNode).querySelectorAll === "function") {
    els.push(...Array.from((scope as ParentNode).querySelectorAll<HTMLElement>(selector)));
  }
  if (root.nodeType === 1 && (root as Element).matches?.(selector)) els.push(root as HTMLElement);
  els.forEach((el) => {
    for (const attr of TRANSLATABLE_ATTRS) {
      const origKey = `__autoTr_${attr}_orig` as const;
      const langKey = `__autoTr_${attr}_lang` as const;
      const stored = (el as TrElement)[origKey];
      const current = el.getAttribute(attr) ?? "";
      const restored = resolveEnglishOriginal(stored ?? current, (el as TrElement)[langKey]);
      const orig = restored ?? stored;
      if (restored) (el as TrElement)[origKey] = restored;
      if (orig && el.getAttribute(attr) !== orig) el.setAttribute(attr, orig);
      (el as TrElement)[langKey] = "en";
    }
  });
}

/** Never let a non-string provider payload leak into the DOM as "[object Object]". */
function coerceTranslation(value: unknown, fallback: string): string {
  if (typeof value === "string") return isBadTranslation(value) ? fallback : value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const joined = value.map((item) => coerceTranslation(item, "")).filter((item) => !isBadTranslation(item)).join(" ").trim();
    return joined || fallback;
  }
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    for (const k of ["translatedText", "translation", "translated_text", "text", "value", "result", "output"]) {
      const coerced = coerceTranslation(o[k], "");
      if (!isBadTranslation(coerced)) return coerced;
    }
  }
  return fallback;
}

async function translateBatch(texts: string[], target: string): Promise<string[] | null> {
  try {
    const { data, error } = await supabase.functions.invoke("translate-ui", {
      body: { texts, target },
    });
    if (error) throw error;
    const out = (data as { translations?: unknown[] } | null)?.translations;
    if (!Array.isArray(out) || out.length !== texts.length) return null;
    return out.map((v, i) => coerceTranslation(v, texts[i]));
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

    // English → restore any prior translations immediately, then re-run a few
    // times (and watch the DOM briefly) because React re-renders after the
    // language change can re-mount nodes that still hold translated text.
    if (language === "en") {
      ++runIdRef.current;
      setTranslationError(null);
      setTranslationProgress({ done: 0, total: 1 });

      // Synchronous first pass so the UI flips back to English right away.
      restoreOriginals();
      setTranslationProgress({ done: 1, total: 1 });

      const timers: number[] = [];
      [0, 60, 150, 300, 600].forEach((delay) => {
        timers.push(window.setTimeout(() => restoreOriginals(), delay));
      });

      // Catch nodes mounted by late re-renders / route transitions.
      const enObserver = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.type === "childList") {
            m.addedNodes.forEach((node) => {
              if (node.nodeType === 1 || node.nodeType === 3) restoreOriginals(node);
            });
          } else if (m.target) {
            restoreOriginals(m.target);
          }
        }
      });
      enObserver.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: [...TRANSLATABLE_ATTRS],
      });
      const stopObserver = window.setTimeout(() => enObserver.disconnect(), 1500);

      const done = window.setTimeout(() => {
        setTranslating(false);
        setTranslationProgress({ done: 0, total: 0 });
      }, 350);
      return () => {
        timers.forEach((t) => window.clearTimeout(t));
        window.clearTimeout(stopObserver);
        window.clearTimeout(done);
        enObserver.disconnect();
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

      const chunks: string[][] = [];
      for (let i = 0; i < misses.length; i += MAX_BATCH) chunks.push(misses.slice(i, i + MAX_BATCH));

      let completed = 0;
      let failed = false;
      let next = 0;

      const worker = async () => {
        while (!failed) {
          const idx = next++;
          if (idx >= chunks.length) return;
          if (cancelled || runId !== runIdRef.current) return;
          const chunk = chunks[idx];
          const translated = await translateBatch(chunk, language);
          if (cancelled || runId !== runIdRef.current) return;
          if (!translated) {
            failed = true;
            return;
          }
          chunk.forEach((text, k) => {
            const tr = translated[k] || text;
            cacheSet(language, text, tr);
            (byText.get(text) || []).forEach((j) => j.apply(tr));
          });
          completed++;
          setTranslationProgress({ done: Math.min(total, completed), total });
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(MAX_CONCURRENCY, chunks.length) }, () => worker())
      );

      if (cancelled || runId !== runIdRef.current) return;
      if (failed) {
        setTranslationError("Translation service is unavailable. Please retry.");
        setTranslating(false);
        return;
      }

      setTranslating(false);
      setTranslationError(null);
    }

    setTranslationError(null);
    setTranslating(true);
    const startedAt = Date.now();
    void processRoot(document.body).finally(() => {
      // Keep the spinner up briefly (even when everything is served from cache)
      // so the switch is always visibly acknowledged.
      const wait = Math.max(0, 350 - (Date.now() - startedAt));
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
          data-no-autotranslate
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/70 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-[min(20rem,90vw)] rounded-2xl border border-border/60 bg-card/95 px-7 py-8 text-center shadow-2xl animate-scale-in">
            <div className="relative mx-auto h-16 w-16">
              <span className="absolute inset-0 rounded-full border-2 border-primary/20" />
              <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary border-r-primary animate-spin" />
              <span
                className="absolute inset-2 rounded-full border-2 border-transparent border-b-primary/60 animate-spin"
                style={{ animationDirection: "reverse", animationDuration: "1.4s" }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums text-primary">
                {total > 0 ? `${percent}%` : ""}
              </span>
            </div>
            <p className="mt-5 text-sm font-semibold text-foreground">Translating…</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {total > 0
                ? `Batch ${Math.min(done + (done < total ? 1 : 0), total)} of ${total}`
                : "Preparing your language"}
            </p>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-300"
                style={{ width: total > 0 ? `${Math.max(percent, 8)}%` : "35%" }}
              />
            </div>
          </div>
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
