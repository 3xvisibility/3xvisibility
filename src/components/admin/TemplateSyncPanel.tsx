import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { extractEdgeError } from "@/lib/edge-function-error";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Play, AlertCircle, CheckCircle2, MinusCircle } from "lucide-react";

interface Run {
  id: string;
  status: string;
  trigger_source: string;
  force: boolean;
  total_templates: number;
  processed: number;
  converted: number;
  skipped: number;
  failed: number;
  error: string | null;
  started_at: string;
  finished_at: string | null;
}

interface Item {
  id: string;
  template_name: string | null;
  status: string;
  attempts: number;
  widgets: number | null;
  fields: number | null;
  error: string | null;
}

interface PageItem {
  id: string;
  template_name: string | null;
  page_title: string | null;
  page_slug: string | null;
  page_status: string | null;
  status: string;
}

export function TemplateSyncPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);

  const { data: latestRun, isLoading: runLoading } = useQuery({
    queryKey: ["template-backfill-latest-run"],
    queryFn: async (): Promise<Run | null> => {
      const { data, error } = await supabase
        .from("template_backfill_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Run | null;
    },
    // Poll while a run is in progress so the progress bar stays live.
    refetchInterval: (q) => ((q.state.data as Run | null)?.status === "running" ? 2000 : false),
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["template-backfill-items", latestRun?.id],
    enabled: !!latestRun?.id,
    queryFn: async (): Promise<Item[]> => {
      const { data, error } = await supabase
        .from("template_backfill_items")
        .select("id, template_name, status, attempts, widgets, fields, error")
        .eq("run_id", latestRun!.id)
        .order("status", { ascending: true })
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Item[];
    },
    refetchInterval: latestRun?.status === "running" ? 2000 : false,
  });

  const runSync = async (force: boolean) => {
    setRunning(true);
    try {
      const { error } = await supabase.functions.invoke("sync-template-engine", {
        body: { force, trigger_source: "manual" },
      });
      if (error) throw error;
      toast({ title: "Sync started", description: "Converting templates with the latest widget engine." });
      queryClient.invalidateQueries({ queryKey: ["template-backfill-latest-run"] });
      queryClient.invalidateQueries({ queryKey: ["template-backfill-items"] });
    } catch (err) {
      const msg = await extractEdgeError(err, "Failed to start sync");
      toast({ title: "Sync failed", description: msg, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const failedItems = items.filter((i) => i.status === "failed");
  const otherItems = items.filter((i) => i.status !== "failed");
  const progressPct = latestRun && latestRun.total_templates > 0
    ? Math.round((latestRun.processed / latestRun.total_templates) * 100)
    : 0;

  const statusBadge = (status: string) => {
    if (status === "success") return <Badge className="bg-success/15 text-success border-success/30 gap-1"><CheckCircle2 className="h-3 w-3" />Success</Badge>;
    if (status === "failed") return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />Failed</Badge>;
    return <Badge variant="outline" className="gap-1 text-muted-foreground"><MinusCircle className="h-3 w-3" />Skipped</Badge>;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" /> Template Engine Sync
            </CardTitle>
            <CardDescription>
              Reconvert every template with the current widget engine so all marketplace
              templates and connected pages stay up to date. Failed conversions retry
              automatically and admins are notified with the reason.
            </CardDescription>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" onClick={() => runSync(false)} disabled={running || latestRun?.status === "running"} className="gap-2">
              <Play className="h-4 w-4" /> Sync new
            </Button>
            <Button onClick={() => runSync(true)} disabled={running || latestRun?.status === "running"} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Force re-sync all
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {runLoading ? (
            <Skeleton className="h-24 rounded-lg" />
          ) : !latestRun ? (
            <p className="text-sm text-muted-foreground py-4">No sync has been run yet.</p>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap text-sm">
                <Badge variant={latestRun.status === "running" ? "default" : latestRun.status === "failed" ? "destructive" : "outline"} className="capitalize">
                  {latestRun.status}
                </Badge>
                <span className="text-muted-foreground capitalize">{latestRun.trigger_source}</span>
                {latestRun.force && <Badge variant="outline" className="text-[10px]">Force</Badge>}
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(latestRun.started_at).toLocaleString()}
                </span>
              </div>

              <div className="space-y-1.5">
                <Progress value={progressPct} />
                <p className="text-xs text-muted-foreground">
                  {latestRun.processed}/{latestRun.total_templates} processed ({progressPct}%)
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatBox label="Converted" value={latestRun.converted} className="text-success" />
                <StatBox label="Skipped" value={latestRun.skipped} className="text-muted-foreground" />
                <StatBox label="Failed" value={latestRun.failed} className="text-destructive" />
                <StatBox label="Total" value={latestRun.total_templates} />
              </div>

              {latestRun.error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  {latestRun.error}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {latestRun && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Per-template status</CardTitle>
            <CardDescription>Failed conversions are shown first, with the error reason.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {itemsLoading ? (
              <Skeleton className="h-40 mx-6 rounded-lg" />
            ) : items.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">No items recorded.</p>
            ) : (
              <ScrollArea className="h-[420px]">
                <div className="divide-y divide-border">
                  {[...failedItems, ...otherItems].map((item) => (
                    <div key={item.id} className="flex items-start gap-3 px-6 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.template_name || "(unnamed)"}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {item.status === "success" && (
                            <span className="text-xs text-muted-foreground">
                              {item.widgets ?? 0} widgets · {item.fields ?? 0} fields
                            </span>
                          )}
                          {item.attempts > 1 && (
                            <span className="text-[10px] text-muted-foreground">{item.attempts} attempts</span>
                          )}
                          {item.error && (
                            <span className="text-xs text-destructive break-all">{item.error}</span>
                          )}
                        </div>
                      </div>
                      {statusBadge(item.status)}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatBox({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className={`text-2xl font-bold ${className ?? ""}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
