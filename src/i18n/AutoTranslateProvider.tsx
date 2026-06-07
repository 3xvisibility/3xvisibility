/**
 * AutoTranslateProvider
 *
 * Runtime DOM-based translator for the entire UI.
 * Activates whenever `language` is not "en". Walks visible text nodes,
 * batches strings to the `translate-ui` edge function, caches results in
 * localStorage, and replaces text content in place.
 *
 * Skips: SCRIPT, STYLE, NOSCRIPT, CODE, PRE, TEXTAREA, INPUT, SELECT,
 * elements with [data-no-translate] / [contenteditable], and pure
 * numeric / symbol-only strings.
 *
 * This guarantees that pages without explicit t() calls (PGP, dashboards,
 * etc.) are still translated when the user switches language.
 */

import { useEffect, useRef } from "react";
import { useLanguage } from "./LanguageContext";
import { translations } from "./translations";
import { supabase } from "@/integrations/supabase/client";

// Languages that already ship full t() translations. For these, React + t()
// are the single source of truth — running the DOM translator on top of them
// fights React and leaves content stuck when switching. Only translate the
// DOM for languages that have NO built-in t() coverage.
const hasBuiltinCoverage = (lang: string) =>
  Object.prototype.hasOwnProperty.call(translations, lang);

const CACHE_PREFIX = "auto-tr:";
const BATCH_SIZE = 40;
const DEBOUNCE_MS = 250;

const SKIP_TAGS = new Set([
  "SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "TEXTAREA",
  "INPUT", "SELECT", "OPTION", "SVG", "PATH", "CANVAS",
]);

// Text we never translate
const SHOULD_SKIP_TEXT = (s: string): boolean => {
  const t = s.trim();
  if (!t) return true;
  if (t.length < 2) return true;
  // Only digits, punctuation, currency, etc.
  if (!/[A-Za-z\u00C0-\u024F]/.test(t)) return true;
  return false;
};

const cacheKey = (lang: string, text: string) => `${CACHE_PREFIX}${lang}:${text}`;

function getCached(lang: string, text: string): string | null {
  try {
    return localStorage.getItem(cacheKey(lang, text));
  } catch {
    return null;
  }
}

function setCached(lang: string, text: string, translation: string) {
  try {
    localStorage.setItem(cacheKey(lang, text), translation);
  } catch {
    // storage full — best effort prune
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX));
      keys.slice(0, 200).forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(cacheKey(lang, text), translation);
    } catch { /* ignore */ }
  }
}

type TextTarget = { kind: "text"; node: Text; original: string };
type AttrTarget = { kind: "attr"; el: Element; attr: string; original: string };
type Target = TextTarget | AttrTarget;

const TRANSLATABLE_ATTRS = ["placeholder", "title", "aria-label", "alt"] as const;

export function AutoTranslateProvider({ children }: { children: React.ReactNode }) {
  const { language } = useLanguage();
  const langRef = useRef(language);
  const scanScheduledRef = useRef(false);
  const inFlightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    langRef.current = language;
  }, [language]);

  useEffect(() => {
    // Built-in languages (incl. English) are fully handled by t(); undo any
    // leftover DOM translations so React stays the source of truth.
    if (!hasBuiltinCoverage(language)) return;

    const restoreEnglish = () => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const textNode = node as Text & { __autoTrOriginal?: string; __autoTrLang?: string };
        if (!textNode.__autoTrOriginal) continue;
        const raw = textNode.nodeValue || "";
        const leading = raw.match(/^\s*/)?.[0] ?? "";
        const trailing = raw.match(/\s*$/)?.[0] ?? "";
        textNode.nodeValue = `${leading}${textNode.__autoTrOriginal}${trailing}`;
        textNode.__autoTrLang = "en";
      }

      const selector = TRANSLATABLE_ATTRS.map((a) => `[${a}]`).join(",");
      document.body.querySelectorAll(selector).forEach((el) => {
        for (const attr of TRANSLATABLE_ATTRS) {
          const original = (el as any)[`__autoTr_${attr}_orig`];
          if (!original) continue;
          el.setAttribute(attr, original);
          (el as any)[`__autoTr_${attr}_lang`] = "en";
        }
      });
    };

    restoreEnglish();
  }, [language]);

  useEffect(() => {
    // English is the source language — nothing to translate.
    if (language === "en") return;

    // For languages with built-in t() coverage, React handles the UI. Only
    // translate explicitly opted-in subtrees ([data-auto-translate]) such as
    // marketing pages that have no t() calls. For languages without built-in
    // coverage, translate the whole document.
    const builtin = hasBuiltinCoverage(language);
    const getRoots = (): ParentNode[] => {
      if (builtin) {
        return Array.from(document.querySelectorAll<HTMLElement>("[data-auto-translate]"));
      }
      return [document.body];
    };
    const collectAll = (): Target[] => {
      const out: Target[] = [];
      for (const root of getRoots()) {
        out.push(...collectTextTargets(root));
        out.push(...collectAttrTargets(root));
      }
      return out;
    };

    let observer: MutationObserver | null = null;
    let debounceTimer: number | null = null;
    let cancelled = false;

    const isSkippedAncestor = (el: Element | null): boolean => {
      if (!el) return true;
      if (SKIP_TAGS.has(el.tagName) && el.tagName !== "INPUT" && el.tagName !== "TEXTAREA" && el.tagName !== "SELECT") {
        return true;
      }
      if (el.closest("[data-no-translate]")) return true;
      return false;
    };

    const collectTextTargets = (root: Node): TextTarget[] => {
      const out: TextTarget[] = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => {
          const parent = n.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
          if (parent.closest("[data-no-translate]")) return NodeFilter.FILTER_REJECT;
          if (parent.isContentEditable) return NodeFilter.FILTER_REJECT;
          const text = n.nodeValue || "";
          if (SHOULD_SKIP_TEXT(text)) return NodeFilter.FILTER_REJECT;
          if ((n as any).__autoTrLang === langRef.current) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const t = node as Text;
        out.push({ kind: "text", node: t, original: ((t as any).__autoTrOriginal || t.nodeValue || "").trim() });
      }
      return out;
    };

    const collectAttrTargets = (root: ParentNode): AttrTarget[] => {
      const out: AttrTarget[] = [];
      const selector = TRANSLATABLE_ATTRS.map((a) => `[${a}]`).join(",");
      const elements = root.querySelectorAll(selector);
      const lang = langRef.current;
      elements.forEach((el) => {
        if (isSkippedAncestor(el)) return;
        for (const attr of TRANSLATABLE_ATTRS) {
          const value = el.getAttribute(attr);
          if (!value) continue;
          if (SHOULD_SKIP_TEXT(value)) continue;
          // Already translated to current language?
          const cacheTag = `__autoTr_${attr}_lang`;
          if ((el as any)[cacheTag] === lang) continue;
          out.push({ kind: "attr", el, attr, original: ((el as any)[`__autoTr_${attr}_orig`] || value).trim() });
        }
      });
      return out;
    };

    const applyTranslation = (target: Target, original: string, translated: string) => {
      const lang = langRef.current;
      if (target.kind === "text") {
        const raw = target.node.nodeValue || "";
        const leading = raw.match(/^\s*/)?.[0] ?? "";
        const trailing = raw.match(/\s*$/)?.[0] ?? "";
        target.node.nodeValue = `${leading}${translated}${trailing}`;
        (target.node as any).__autoTrLang = lang;
        (target.node as any).__autoTrOriginal = original;
      } else {
        target.el.setAttribute(target.attr, translated);
        (target.el as any)[`__autoTr_${target.attr}_lang`] = lang;
        (target.el as any)[`__autoTr_${target.attr}_orig`] = original;
      }
    };

    const translateBatch = async (originals: string[]): Promise<Record<string, string>> => {
      const lang = langRef.current;
      const result: Record<string, string> = {};
      try {
        const { data, error } = await supabase.functions.invoke("translate-ui", {
          body: { texts: originals, target: lang },
        });
        if (error || !data?.translations) {
          originals.forEach((o) => (result[o] = o));
          return result;
        }
        const translations = data.translations as string[];
        originals.forEach((o, i) => {
          const tr = translations[i] || o;
          result[o] = tr;
          setCached(lang, o, tr);
        });
      } catch {
        originals.forEach((o) => (result[o] = o));
      }
      return result;
    };

    const processPending = async () => {
      if (cancelled) return;
      const lang = langRef.current;
      const targets: Target[] = [
        ...collectTextTargets(document.body),
        ...collectAttrTargets(document.body),
      ];
      if (targets.length === 0) return;

      // Group by original
      const groups = new Map<string, Target[]>();
      for (const t of targets) {
        if (!groups.has(t.original)) groups.set(t.original, []);
        groups.get(t.original)!.push(t);
      }

      const needRequest: string[] = [];
      for (const [original, ts] of groups) {
        const cached = getCached(lang, original);
        if (cached) {
          ts.forEach((t) => applyTranslation(t, original, cached));
          continue;
        }
        if (inFlightRef.current.has(`${lang}:${original}`)) continue;
        needRequest.push(original);
      }

      if (needRequest.length === 0) return;
      needRequest.forEach((o) => inFlightRef.current.add(`${lang}:${o}`));

      for (let i = 0; i < needRequest.length; i += BATCH_SIZE) {
        const slice = needRequest.slice(i, i + BATCH_SIZE);
        const map = await translateBatch(slice);
        if (cancelled || langRef.current !== lang) {
          slice.forEach((o) => inFlightRef.current.delete(`${lang}:${o}`));
          return;
        }
        // Re-collect to handle DOM changes
        const fresh: Target[] = [
          ...collectTextTargets(document.body),
          ...collectAttrTargets(document.body),
        ];
        for (const t of fresh) {
          const tr = map[t.original];
          if (tr) applyTranslation(t, t.original, tr);
        }
        slice.forEach((o) => inFlightRef.current.delete(`${lang}:${o}`));
      }
    };

    const scheduleScan = () => {
      if (scanScheduledRef.current) return;
      scanScheduledRef.current = true;
      if (debounceTimer) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        scanScheduledRef.current = false;
        debounceTimer = null;
        processPending();
      }, DEBOUNCE_MS);
    };

    // Initial scan
    scheduleScan();

    // Observe DOM changes (route changes, dialogs, async content)
    observer = new MutationObserver((mutations) => {
      let relevant = false;
      for (const m of mutations) {
        if (m.type === "childList" && (m.addedNodes.length || m.removedNodes.length)) {
          relevant = true;
          break;
        }
        if (m.type === "characterData") {
          const t = m.target as Text;
          if ((t as any).__autoTrLang !== langRef.current) {
            relevant = true;
            break;
          }
        }
        if (m.type === "attributes" && m.attributeName) {
          const el = m.target as Element;
          const tag = `__autoTr_${m.attributeName}_lang`;
          // Ignore self-applied translations
          if ((el as any)[tag] !== langRef.current) {
            relevant = true;
            break;
          }
        }
      }
      if (relevant) scheduleScan();
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
      if (debounceTimer) window.clearTimeout(debounceTimer);
      observer?.disconnect();
    };
  }, [language]);

  return <>{children}</>;
}
