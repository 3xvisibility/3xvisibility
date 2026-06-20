import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MarketplaceTemplate } from "@/lib/marketplace-templates";
import type { Language } from "@/i18n/translations";

/** Languages the marketplace auto-translation supports. English is the source. */
const SUPPORTED = new Set(["en", "fr", "de", "es"]);

export interface TranslatedMeta {
  name: string;
  description: string;
}

/** Per-template cached card metadata translation (name + description). */
function cacheKey(id: string, language: Language): string {
  return `mkt-meta-tr:${id}:${language}`;
}

/**
 * Batch-translates the card metadata (name + description) for a list of
 * marketplace templates into `language`. Results are cached in localStorage so
 * each template's labels are translated only once per language. English (and
 * unsupported locales) return the originals untouched.
 *
 * Returns a map keyed by template id → { name, description } and a helper
 * `localize(tpl)` that falls back to the source strings while translating.
 */
export function useTranslatedTemplateList(
  templates: MarketplaceTemplate[],
  language: Language,
) {
  const [map, setMap] = useState<Record<string, TranslatedMeta>>({});

  // Stable signature of the visible template ids so the effect re-runs when the
  // filtered list changes (search / category / tab).
  const idsKey = useMemo(
    () => templates.map((t) => t.id).join(","),
    [templates],
  );

  useEffect(() => {
    if (language === "en" || !SUPPORTED.has(language)) {
      setMap({});
      return;
    }

    // Seed from cache first so labels appear instantly on revisit.
    const seeded: Record<string, TranslatedMeta> = {};
    const pending: MarketplaceTemplate[] = [];
    for (const tpl of templates) {
      try {
        const cached = localStorage.getItem(cacheKey(tpl.id, language));
        if (cached) {
          seeded[tpl.id] = JSON.parse(cached);
          continue;
        }
      } catch { /* ignore */ }
      pending.push(tpl);
    }
    setMap(seeded);

    if (pending.length === 0) return;

    let cancelled = false;
    (async () => {
      // One batched call: keys are `${id}:n` (name) and `${id}:d` (description).
      const strings: Record<string, string> = {};
      for (const tpl of pending) {
        if (tpl.name) strings[`${tpl.id}:n`] = tpl.name;
        if (tpl.description) strings[`${tpl.id}:d`] = tpl.description;
      }
      if (Object.keys(strings).length === 0) return;

      try {
        const { data, error } = await supabase.functions.invoke("translate-template", {
          body: { strings, target_language: language },
        });
        if (error || data?.error || cancelled) return;
        const ts = (data?.strings ?? {}) as Record<string, string>;

        const next: Record<string, TranslatedMeta> = {};
        for (const tpl of pending) {
          const meta: TranslatedMeta = {
            name: ts[`${tpl.id}:n`] || tpl.name,
            description: ts[`${tpl.id}:d`] || tpl.description,
          };
          next[tpl.id] = meta;
          try { localStorage.setItem(cacheKey(tpl.id, language), JSON.stringify(meta)); } catch { /* quota */ }
        }
        if (!cancelled) setMap((prev) => ({ ...prev, ...next }));
      } catch { /* keep originals on failure */ }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, language]);

  const localize = (tpl: MarketplaceTemplate): TranslatedMeta =>
    map[tpl.id] ?? { name: tpl.name, description: tpl.description };

  return { localize };
}
