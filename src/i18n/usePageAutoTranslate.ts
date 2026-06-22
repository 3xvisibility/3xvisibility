import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "./LanguageContext";

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

function collectTextNodes(root: HTMLElement): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = (node as Text).parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName;
      if (tag === "SCRIPT" || tag === "STYLE" || tag === "CODE" || tag === "PRE") {
        return NodeFilter.FILTER_REJECT;
      }
      const text = (node as Text).textContent ?? "";
      // Skip whitespace-only and tiny tokens; require at least one letter.
      if (text.trim().length < 2) return NodeFilter.FILTER_REJECT;
      if (!/[A-Za-z\u00C0-\u024F]/.test(text)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) nodes.push(n as Text);
  return nodes;
}

export function usePageAutoTranslate(
  ref: React.RefObject<HTMLElement>,
  deps: unknown[] = [],
) {
  const { language } = useLanguage();
  const originals = useRef<WeakMap<Text, string>>(new WeakMap());

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    let cancelled = false;
    const nodes = collectTextNodes(root);

    // Capture originals once per node.
    for (const node of nodes) {
      if (!originals.current.has(node)) {
        originals.current.set(node, node.textContent ?? "");
      }
    }

    const origTexts = nodes.map((node) => originals.current.get(node) ?? node.textContent ?? "");

    if (language === "en") {
      nodes.forEach((node, i) => {
        if (node.textContent !== origTexts[i]) node.textContent = origTexts[i];
      });
      return;
    }

    const cacheKey = `autotr:${language}:${hashStrings(origTexts)}`;

    const apply = (translations: string[]) => {
      if (cancelled) return;
      nodes.forEach((node, i) => {
        const tr = translations[i];
        if (typeof tr === "string" && tr.length > 0) node.textContent = tr;
      });
    };

    // Serve from cache when available.
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as string[];
        if (Array.isArray(parsed) && parsed.length === origTexts.length) {
          apply(parsed);
          return;
        }
      }
    } catch {
      /* ignore cache errors */
    }

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("translate-ui", {
          body: { texts: origTexts, target: language },
        });
        if (error || cancelled) return;
        const translations = (data as { translations?: string[] })?.translations;
        if (Array.isArray(translations) && translations.length === origTexts.length) {
          apply(translations);
          try {
            localStorage.setItem(cacheKey, JSON.stringify(translations));
          } catch {
            /* storage full — ignore */
          }
        }
      } catch {
        /* network failure — leave original text */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [language, ref]);
}
