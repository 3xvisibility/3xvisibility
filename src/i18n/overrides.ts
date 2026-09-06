import { supabase } from "@/integrations/supabase/client";

export type OverrideMap = Record<string, Record<string, string>>;

let cache: OverrideMap | null = null;
let inflight: Promise<OverrideMap> | null = null;

export function getCachedOverrides(): OverrideMap {
  return cache ?? {};
}

export function clearOverridesCache() {
  cache = null;
  inflight = null;
}

export async function fetchOverrides(): Promise<OverrideMap> {
  if (cache) return cache;
  if (inflight) return inflight;

  inflight = (async () => {
    const map: OverrideMap = {};
    try {
      const { data, error } = await supabase
        .from("translation_overrides")
        .select("language, key, value")
        .limit(5000);
      if (error) throw error;
      for (const row of data ?? []) {
        if (!row.language || !row.key) continue;
        map[row.language] = map[row.language] ?? {};
        map[row.language][row.key] = row.value ?? "";
      }
    } catch {
      // Overrides are optional — fall back to bundled translations.
    }
    cache = map;
    inflight = null;
    return map;
  })();

  return inflight;
}
