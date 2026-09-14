import { useEffect, useRef } from "react";
import { isBrandOnlyText, restoreBrandName } from "@/lib/brand";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "./LanguageContext";
import { translations } from "./translations";
import { coerceToEnglishOriginal, rememberTranslationPair, resolveEnglishOriginal } from "./translationOriginals";

function isBadTranslation(value: unknown): boolean {
  if (typeof value !== "string") return !value;
  const normalized = value.trim();
  return !normalized || normalized === "[object Object]" || /\[object Object\]/i.test(normalized);
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

/**
 * usePageAutoTranslate
 *
 * Runtime translation for static/marketing/legal pages whose copy is not in the
 * built-in t() dictionary. Give it a ref to the page container; it snapshots the
 * ORIGINAL English text nodes once, then translates them to the active language
 * via the `translate-ui` edge function. Switching back to English restores the
 * captured originals.
 *
 * Key safety rules (these prevent the old translator's "stuck language" bug):
 *  - Originals are captured per Text node and translation is ALWAYS derived from
 *    the stored original, never from the currently displayed (already translated)
 *    text.
 *  - Results are cached in localStorage per (language + content hash) so we don't
 *    re-hit the network on every navigation.
 *  - Dictionary is checked first for instant 0ms result when the string exists
 *    in the bundled JSON (no network, no overlay).
 */

function hashStrings(strings: string[]): string {
  let h = 2166136261;
  const joined = strings.join("\u0001");
  for (let i = 0; i < joined.length; i++) {
    h ^= joined.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

// Instant dictionary path — same as AutoTranslateProvider
function normalizeForDict(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
const dictReverseCache = new Map<string, Map<string, string>>();
function getDictTranslation(text: string, lang: string): string | null {
  let map = dictReverseCache.get(lang);
  if (!map) {
    map = new Map();
    const locale = (translations as Record<string, Record<string, string>>)[lang];
    if (locale) {
      for (const [key, locVal] of Object.entries(locale)) {
        const enVal = translations.en[key];
        if (typeof enVal === "string" && typeof locVal === "string" && normalizeForDict(enVal) !== normalizeForDict(locVal)) {
          map.set(normalizeForDict(enVal), locVal);
        }
      }
    }
    dictReverseCache.set(lang, map);
  }
  const hit = map.get(normalizeForDict(text));
  return hit ? restoreBrandName(hit) : null;
}

function collectTextNodes(root: HTMLElement): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = (node as Text).parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      let el: HTMLElement | null = parent;
      while (el && el !== document.body) {
        const tag = el.tagName;
        if (tag === "SCRIPT" || tag === "STYLE" || tag === "CODE" || tag === "PRE") {
          return NodeFilter.FILTER_REJECT;
        }
        if (el.getAttribute("data-no-autotranslate") !== null) return NodeFilter.FILTER_REJECT;
        if (el.getAttribute("data-no-translate") !== null) return NodeFilter.FILTER_REJECT;
        if (el.getAttribute("translate") === "no") return NodeFilter.FILTER_REJECT;
        if (el.isContentEditable) return NodeFilter.FILTER_REJECT;
        el = el.parentElement;
      }
      const text = (node as Text).textContent ?? "";
      // Skip whitespace-only and tiny tokens; require at least one letter.
      if (isBadTranslation(text)) return NodeFilter.FILTER_REJECT;
      if (text.trim().length < 2) return NodeFilter.FILTER_REJECT;
      if (!/[A-Za-z\u00C0-\u024F]/.test(text)) return NodeFilter.FILTER_REJECT;
      if (/^[a-z]+(?:-[a-z0-9]+)+$/i.test(text.trim())) return NodeFilter.FILTER_REJECT;
      // Never send brand-only tokens to the translator.
      if (isBrandOnlyText(text)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) nodes.push(n as Text);
  return nodes;
}

/** Number of text nodes translated per network batch ("section"). */
const BATCH_SIZE = 20;
/** Retry attempts per batch before giving up (total tries = MAX_RETRIES + 1). */
export const MAX_RETRIES = 2;
/** Base delay (ms) for the exponential backoff between retries. */
export const BACKOFF_BASE_MS = 600;
/** Abort a single batch request if it hasn't responded in this window. */
const REQUEST_TIMEOUT_MS = 20000;

/**
 * Exponential backoff delay for a given zero-based retry attempt.
 * attempt 0 -> BACKOFF_BASE_MS, attempt 1 -> 2x, attempt 2 -> 4x, ...
 */
export function backoffDelay(attempt: number): number {
  return BACKOFF_BASE_MS * Math.pow(2, attempt);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


/** Rejects if the given promise doesn't settle within `ms`. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("The translation request timed out.")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}


export function usePageAutoTranslate(
  ref: React.RefObject<HTMLElement>,
  deps: unknown[] = [],
) {
  const { language, setTranslating, setTranslationProgress, setTranslationError, translationRetryNonce } = useLanguage();
  const originals = useRef<WeakMap<Text, string>>(new WeakMap());

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.setAttribute("data-page-autotranslate", "");

    let cancelled = false;
    const nodes = collectTextNodes(root);

    const sanitizeNode = (node: Text) => {
      if (!isBadTranslation(node.textContent)) return;
      const restored = originals.current.get(node) || resolveEnglishOriginal(node.textContent ?? "", language) || "";
      if (node.textContent !== restored) node.textContent = restored;
    };


    nodes.forEach(sanitizeNode);

    // Capture originals once per node.
    for (const node of nodes) {
      if (!originals.current.has(node)) {
        originals.current.set(node, coerceToEnglishOriginal(node.textContent ?? "", language));
      } else {
        const restored = resolveEnglishOriginal(originals.current.get(node) ?? "", language);
        if (restored) originals.current.set(node, restored);
      }
    }

    const origTexts = nodes.map((node) => originals.current.get(node) ?? node.textContent ?? "");

    if (language === "en") {
      nodes.forEach((node, i) => {
        const restored = resolveEnglishOriginal(origTexts[i], language) ?? resolveEnglishOriginal(node.textContent ?? "", language) ?? origTexts[i];
        originals.current.set(node, restored);
        if (node.textContent !== restored) node.textContent = restored;
      });
      setTranslating(false);
      setTranslationProgress({ done: 0, total: 0 });
      setTranslationError(null);
      return;
    }

    // Clear any prior error at the start of a fresh attempt.
    setTranslationError(null);

    // v3: brand name must stay "3x Visibility" (invalidate older mangled caches).
    const cacheKey = `autotr:v3:${language}:${hashStrings(origTexts)}`;

    const applyRange = (translationsArr: string[], start: number) => {
      if (cancelled) return;
      translationsArr.forEach((tr, offset) => {
        const node = nodes[start + offset];
        const original = origTexts[start + offset];
        if (node && typeof tr === "string" && tr.length > 0 && !isBadTranslation(tr)) {
          const safe = restoreBrandName(tr);
          rememberTranslationPair(language, original, safe);
          const raw = node.textContent ?? "";
          const lead = /^\s*/.exec(raw)?.[0] ?? "";
          const trail = /\s*$/.exec(raw)?.[0] ?? "";
          node.textContent = `${lead}${safe.trim()}${trail}`;
        }
      });
    };

    const applySingle = (idx: number, translated: string) => {
      if (cancelled) return;
      const node = nodes[idx];
      const original = origTexts[idx];
      if (node && typeof translated === "string" && translated.length > 0 && !isBadTranslation(translated)) {
        const safe = restoreBrandName(translated);
        rememberTranslationPair(language, original, safe);
        const raw = node.textContent ?? "";
        const lead = /^\s*/.exec(raw)?.[0] ?? "";
        const trail = /\s*$/.exec(raw)?.[0] ?? "";
        node.textContent = `${lead}${safe.trim()}${trail}`;
      }
    };

    // Serve from cache when available (instant — no spinner needed).
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as string[];
        if (Array.isArray(parsed) && parsed.length === origTexts.length && parsed.every((item) => !isBadTranslation(item))) {
          applyRange(parsed.map(restoreBrandName), 0);
          setTranslating(false);
          setTranslationProgress({ done: 0, total: 0 });
          return;
        }
      }
    } catch {
      /* ignore cache errors */
    }

    // Instant dictionary path: apply any string that exists in bundled JSON (0ms)
    const collected: string[] = new Array(origTexts.length);
    const pendingIndices: number[] = [];
    const pendingTexts: string[] = [];
    origTexts.forEach((text, idx) => {
      const dictTr = getDictTranslation(text, language);
      if (dictTr) {
        applySingle(idx, dictTr);
        collected[idx] = dictTr;
      } else {
        pendingIndices.push(idx);
        pendingTexts.push(text);
      }
    });

    if (pendingTexts.length === 0) {
      // Everything was served from dictionary — instant, no network, no overlay
      try {
        if (collected.every((item) => !isBadTranslation(item))) {
          localStorage.setItem(cacheKey, JSON.stringify(collected));
        }
      } catch { /* ignore */ }
      setTranslating(false);
      setTranslationProgress({ done: 0, total: 0 });
      setTranslationError(null);
      return;
    }

    // Some strings need network — only then show progress
    const totalBatches = Math.max(1, Math.ceil(pendingTexts.length / BATCH_SIZE));
    setTranslating(true);
    setTranslationProgress({ done: 0, total: totalBatches });

    (async () => {
      let anyFailure = false;
      let lastErrorMessage = "";

      for (let batch = 0; batch < totalBatches; batch++) {
        if (cancelled) return;
        const start = batch * BATCH_SIZE;
        const slice = pendingTexts.slice(start, start + BATCH_SIZE);
        const sliceIndices = pendingIndices.slice(start, start + BATCH_SIZE);

        let applied = false;
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          if (cancelled) return;
          try {
            const { data, error } = await withTimeout(
              supabase.functions.invoke("translate-ui", {
                body: { texts: slice, target: language },
              }),
              REQUEST_TIMEOUT_MS,
            );
            if (cancelled) return;

            const raw = (data as { translations?: unknown[] })?.translations;
            const translationsArr = Array.isArray(raw)
              ? raw.map((v, i) => coerceTranslation(v, slice[i]))
              : undefined;
            if (!error && Array.isArray(translationsArr) && translationsArr.length === slice.length) {
              const safeTranslations = translationsArr.map(restoreBrandName);
              safeTranslations.forEach((tr, offset) => {
                const globalIdx = sliceIndices[offset];
                applySingle(globalIdx, tr);
                collected[globalIdx] = tr;
              });
              applied = true;
              break;
            }
            lastErrorMessage = error?.message || "The translation service returned an unexpected response.";
          } catch (err) {
            lastErrorMessage = err instanceof Error ? err.message : "Network request failed.";
          }

          if (attempt < MAX_RETRIES) {
            await sleep(backoffDelay(attempt));
          }
        }

        if (!applied) {
          anyFailure = true;
          slice.forEach((orig, offset) => {
            const globalIdx = sliceIndices[offset];
            collected[globalIdx] = orig;
          });
        }

        setTranslationProgress({ done: batch + 1, total: totalBatches });
      }

      if (cancelled) return;

      if (!anyFailure) {
        try {
          if (collected.every((item) => !isBadTranslation(item))) {
            localStorage.setItem(cacheKey, JSON.stringify(collected));
          }
        } catch {
          /* storage full — ignore */
        }
        setTranslationError(null);
      } else {
        setTranslationError(
          lastErrorMessage
            ? `Some content couldn't be translated: ${lastErrorMessage}`
            : "Translation failed due to a network or service issue.",
        );
      }

      setTranslating(false);
      setTranslationProgress({ done: 0, total: 0 });
    })();


    return () => {
      cancelled = true;
      setTranslating(false);
      setTranslationProgress({ done: 0, total: 0 });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, ref, translationRetryNonce, ...deps]);
}
