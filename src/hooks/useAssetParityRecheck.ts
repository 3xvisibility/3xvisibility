import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ParityPageResult {
  page_id: string;
  title?: string;
  url?: string;
  status: "passed" | "failed" | "skipped" | "error";
  score?: number;
  reason?: string;
  error?: string;
  asset_parity?: {
    ok: boolean;
    score: number;
    issues: { kind: string; detail: string; hint: string }[];
    counts?: Record<string, number>;
  };
}

/**
 * Runs the automatic HTML asset parity re-check (preview vs. live page) right
 * after a republish, so the user immediately sees whether the CSS/JS actually
 * survived on the published site. `auto_republish` is disabled — this is a
 * verification pass, not another publish.
 */
export function useAssetParityRecheck() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<ParityPageResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const run = useCallback(async (pageIds: string[], opts?: { delayMs?: number }) => {
    const ids = Array.from(new Set(pageIds.filter(Boolean))).slice(0, 25);
    if (ids.length === 0) return;

    setRunning(true);
    setError(null);
    setResults(null);
    setOpen(true);

    // Give the CMS/CDN a moment to serve the freshly published markup.
    const delay = opts?.delayMs ?? 4000;
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));

    try {
      const { data, error: fnError } = await supabase.functions.invoke("html-fidelity-check", {
        body: { page_ids: ids, auto_republish: false },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setResults((data?.results as ParityPageResult[]) || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Asset parity check failed");
    } finally {
      setRunning(false);
    }
  }, []);

  return { run, running, results, error, open, setOpen };
}
