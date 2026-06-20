import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MarketplaceTemplate } from "@/lib/marketplace-templates";
import type { Language } from "@/i18n/translations";

/** Languages the marketplace auto-translation supports. English is the source. */
const SUPPORTED = new Set(["en", "fr", "de", "es"]);

// Don't waste translation on values that aren't human prose.
function isTranslatable(key: string, value: string): boolean {
  if (!value || !value.trim()) return false;
  if (/^https?:\/\//i.test(value.trim())) return false; // URLs
  if (/^\d+([.,]\d+)?$/.test(value.trim())) return false; // pure numbers
  if (/(image|photo|logo|avatar|url|src|icon|color|bg)/i.test(key)) return false;
  return true;
}

// Tiny stable hash so cached entries invalidate when template content changes.
function hash(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

interface TranslatedTemplateState {
  template: MarketplaceTemplate;
  translating: boolean;
  /** Set when auto-translation failed; the source-language template is shown. */
  error: string | null;
}

/**
 * Returns a copy of `template` with its content, name, description, SEO
 * patterns and default values auto-translated into `language`. English (or a
 * null template) is returned untouched. Results are cached in localStorage so
 * re-opening a template in the same language is instant and free.
 */
export function useTranslatedTemplate(
  template: MarketplaceTemplate | null,
  language: Language,
): TranslatedTemplateState {
  const [translated, setTranslated] = useState<MarketplaceTemplate | null>(template);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  useEffect(() => {
    if (!template) { setTranslated(null); return; }

    // No translation needed for the source language / unsupported locales.
    if (language === "en" || !SUPPORTED.has(language)) {
      setTranslated(template);
      setTranslating(false);
      setError(null);
      return;
    }

    const contentHash = hash(template.content || "");
    const cacheKey = `mkt-tr:${template.id}:${language}:${contentHash}`;
    // Cache invalidation: drop any stale entries for this template whose content
    // hash no longer matches (i.e. the template was updated) so we never serve
    // an out-of-date translation and localStorage doesn't grow unbounded.
    try {
      const prefix = `mkt-tr:${template.id}:`;
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix) && !k.endsWith(`:${contentHash}`)) {
          localStorage.removeItem(k);
        }
      }
    } catch { /* ignore */ }

    setError(null);
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setTranslated({ ...template, ...JSON.parse(cached) });
        setTranslating(false);
        return;
      }
    } catch { /* ignore */ }

    // Build the short-strings map (keys are stable identifiers).
    const strings: Record<string, string> = {};
    if (template.name) strings["__name"] = template.name;
    if (template.description) strings["__description"] = template.description;
    if (template.seo_title_pattern) strings["__seo_title"] = template.seo_title_pattern;
    if (template.seo_description_pattern) strings["__seo_description"] = template.seo_description_pattern;
    const dv = template.defaultValues ?? {};
    const dvKeys = Object.keys(dv).filter((k) => isTranslatable(k, dv[k]));
    for (const k of dvKeys) strings[`dv:${k}`] = dv[k];

    const myId = ++reqId.current;
    setTranslating(true);
    setTranslated(template); // show source while translating

    (async () => {
      try {
        const { data, error: invokeError } = await supabase.functions.invoke("translate-template", {
          body: { content: template.content, strings, target_language: language },
        });
        if (invokeError) throw invokeError;
        if (data?.error) throw new Error(data.error);
        if (data?.via === "failed") throw new Error("Translation service unavailable");
        if (myId !== reqId.current) return; // a newer request superseded this one

        const ts = (data?.strings ?? {}) as Record<string, string>;
        const newDefaults = { ...dv };
        for (const k of dvKeys) {
          if (ts[`dv:${k}`]) newDefaults[k] = ts[`dv:${k}`];
        }
        const patch: Partial<MarketplaceTemplate> = {
          content: data?.content || template.content,
          name: ts["__name"] || template.name,
          description: ts["__description"] || template.description,
          seo_title_pattern: ts["__seo_title"] || template.seo_title_pattern,
          seo_description_pattern: ts["__seo_description"] || template.seo_description_pattern,
          defaultValues: newDefaults,
        };
        try { localStorage.setItem(cacheKey, JSON.stringify(patch)); } catch { /* quota */ }
        setTranslated({ ...template, ...patch });
      } catch (e) {
        if (myId === reqId.current) {
          setTranslated(template); // fall back to source language
          setError(e instanceof Error ? e.message : "Translation failed");
        }
      } finally {
        if (myId === reqId.current) setTranslating(false);
      }
    })();
  }, [template, language]);

  return { template: translated ?? template!, translating, error };
}

