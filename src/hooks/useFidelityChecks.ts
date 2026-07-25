import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FidelityMismatch {
  kind: string;
  detail: string;
  hint: string;
}

export interface FidelityCheck {
  id: string;
  generated_page_id: string | null;
  score: number | null;
  structural_score: number | null;
  status: string;
  threshold: number;
  error_message: string | null;
  diff_regions: FidelityMismatch[];
  meta: Record<string, unknown>;
  created_at: string;
}

/**
 * Latest automatic preview → published HTML/CSS match check per page.
 * One query for every visible page, reduced to the newest row per page.
 */
export function useFidelityChecks(pageIds: string[]) {
  const key = [...pageIds].sort().join(",");
  return useQuery({
    queryKey: ["fidelity-checks", key],
    enabled: pageIds.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_render_checks")
        .select("id, generated_page_id, score, structural_score, status, threshold, error_message, diff_regions, meta, created_at")
        .eq("provider", "html-fidelity")
        .in("generated_page_id", pageIds)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const latest = new Map<string, FidelityCheck>();
      for (const row of (data || []) as unknown as FidelityCheck[]) {
        if (!row.generated_page_id) continue;
        if (!latest.has(row.generated_page_id)) latest.set(row.generated_page_id, row);
      }
      return latest;
    },
  });
}

export async function runFidelityCheck(pageIds: string[]) {
  const { data, error } = await supabase.functions.invoke("html-fidelity-check", {
    body: { page_ids: pageIds },
  });
  if (error) throw error;
  return data as { results: Array<Record<string, unknown>> };
}
