import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const DAY = 24 * 60 * 60 * 1000;

interface Row {
  domain: string;
  label: string | null;
  keyword: string;
  position: number;
  previous_position: number;
  search_volume: number;
}

/**
 * Live keyword positions for every tracked competitor domain.
 * Cached for a day so the table refreshes on its own alongside the nightly
 * SEO job, with a manual refresh for an immediate check.
 */
export default function CompetitorKeywordPositionsPanel({
  workspaceId,
  database = "us",
}: {
  workspaceId?: string;
  database?: string;
}) {
  const qc = useQueryClient();

  const { data, isFetching } = useQuery({
    queryKey: ["competitor-keyword-positions", workspaceId, database],
    enabled: !!workspaceId,
    staleTime: DAY,
    gcTime: DAY,
    queryFn: async (): Promise<Row[]> => {
      const { data: competitors, error } = await supabase
        .from("competitors")
        .select("domain, label, is_self")
        .eq("workspace_id", workspaceId!)
        .limit(5);
      if (error) throw error;
      if (!competitors?.length) return [];

      const results = await Promise.all(
        competitors.map(async (c) => {
          const { data: res } = await supabase.functions.invoke("semrush-seo", {
            body: { action: "domain_overview", domain: c.domain, database },
          });
          const keywords = (res as any)?.top_keywords ?? [];
          return keywords.slice(0, 8).map((k: any) => ({
            domain: c.domain,
            label: c.label,
            keyword: k.keyword,
            position: k.position,
            previous_position: k.previous_position,
            search_volume: k.search_volume,
          })) as Row[];
        }),
      );
      return results.flat().sort((a, b) => a.position - b.position);
    },
  });

  const rows = data ?? [];

  return (
    <Card className="shadow-surface">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            Competitor keyword rankings
          </h2>
          <Button
            variant="outline"
            size="sm"
            disabled={isFetching || !workspaceId}
            onClick={() =>
              qc.invalidateQueries({ queryKey: ["competitor-keyword-positions", workspaceId, database] })
            }
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Where each tracked competitor ranks today. Updates automatically once a day.
        </p>

        {isFetching && rows.length === 0 ? (
          <Skeleton className="h-32 w-full" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add a competitor domain below and their ranking keywords will show up here.
          </p>
        ) : (
          <div className="overflow-x-auto" data-no-autotranslate>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Competitor</TableHead>
                  <TableHead className="text-xs">Keyword</TableHead>
                  <TableHead className="text-xs text-right">Position</TableHead>
                  <TableHead className="text-xs text-right">Change</TableHead>
                  <TableHead className="text-xs text-right">Volume</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => {
                  const delta = r.previous_position > 0 ? r.previous_position - r.position : 0;
                  return (
                    <TableRow key={`${r.domain}-${r.keyword}-${i}`}>
                      <TableCell className="text-xs font-medium">{r.label || r.domain}</TableCell>
                      <TableCell className="text-xs">{r.keyword}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{r.position}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">
                        {delta === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className={delta > 0 ? "text-emerald-500" : "text-destructive"}>
                            {delta > 0 ? `+${delta}` : delta}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">
                        {r.search_volume.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        <Badge variant="outline" className="text-[10px]">Source: Semrush</Badge>
      </CardContent>
    </Card>
  );
}
