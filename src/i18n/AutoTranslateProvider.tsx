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
import { supabase } from "@/integrations/supabase/client";

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

interface PendingNode {
  node: Text;
  original: string;
}

export function AutoTranslateProvider({ children }: { children: React.ReactNode }) {
  const { language } = useLanguage();
  const langRef = useRef(language);
  const scanScheduledRef = useRef(false);
  // Map original text -> nodes that need it translated
  const inFlightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    langRef.current = language;
  }, [language]);

  useEffect(() => {
    if (language === "en") return;

    let observer: MutationObserver | null = null;
    let debounceTimer: number | null = null;
    let cancelled = false;

    const collectTextNodes = (root: Node): PendingNode[] => {
      const out: PendingNode[] = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => {
          const parent = n.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
          if (parent.closest("[data-no-translate]")) return NodeFilter.FILTER_REJECT;
          if (parent.isContentEditable) return NodeFilter.FILTER_REJECT;
          const text = n.nodeValue || "";
          if (SHOULD_SKIP_TEXT(text)) return NodeFilter.FILTER_REJECT;
          // Already translated (marked)
          if ((n as any).__autoTrLang === langRef.current) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const t = node as Text;
        out.push({ node: t, original: (t.nodeValue || "").trim() });
      }
      return out;
    };

    const applyTranslation = (n: Text, original: string, translated: string) => {
      // Preserve surrounding whitespace
      const raw = n.nodeValue || "";
      const leading = raw.match(/^\s*/)?.[0] ?? "";
      const trailing = raw.match(/\s*$/)?.[0] ?? "";
      n.nodeValue = `${leading}${translated}${trailing}`;
      (n as any).__autoTrLang = langRef.current;
      (n as any).__autoTrOriginal = original;
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
      const pending = collectTextNodes(document.body);
      if (pending.length === 0) return;

      // Group by original text → list of nodes
      const groups = new Map<string, Text[]>();
      for (const p of pending) {
        if (!groups.has(p.original)) groups.set(p.original, []);
        groups.get(p.original)!.push(p.node);
      }

      const needRequest: string[] = [];
      for (const [original, nodes] of groups) {
        const cached = getCached(lang, original);
        if (cached) {
          nodes.forEach((n) => applyTranslation(n, original, cached));
          continue;
        }
        if (inFlightRef.current.has(`${lang}:${original}`)) continue;
        needRequest.push(original);
      }

      if (needRequest.length === 0) return;

      // Mark in-flight
      needRequest.forEach((o) => inFlightRef.current.add(`${lang}:${o}`));

      // Batch
      for (let i = 0; i < needRequest.length; i += BATCH_SIZE) {
        const slice = needRequest.slice(i, i + BATCH_SIZE);
        const map = await translateBatch(slice);
        if (cancelled || langRef.current !== lang) {
          slice.forEach((o) => inFlightRef.current.delete(`${lang}:${o}`));
          return;
        }
        // Re-collect (DOM may have changed) and apply
        const fresh = collectTextNodes(document.body);
        for (const { node, original } of fresh) {
          const tr = map[original];
          if (tr) applyTranslation(node, original, tr);
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
      // Skip mutations triggered solely by our own text replacements
      let relevant = false;
      for (const m of mutations) {
        if (m.type === "childList" && (m.addedNodes.length || m.removedNodes.length)) {
          relevant = true;
          break;
        }
        if (m.type === "characterData") {
          // Ignore if it's our own translation
          const t = m.target as Text;
          if ((t as any).__autoTrLang !== langRef.current) {
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
    });

    return () => {
      cancelled = true;
      if (debounceTimer) window.clearTimeout(debounceTimer);
      observer?.disconnect();
    };
  }, [language]);

  return <>{children}</>;
}
