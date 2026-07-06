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
import { RefreshCw, Play, AlertCircle, CheckCircle2, MinusCircle, Rocket, Loader2, Star } from "lucide-react";

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
  page_id: string | null;
  template_name: string | null;
  page_title: string | null;
  page_slug: string | null;
  page_status: string | null;
  status: string;
  has_icon_widgets: boolean | null;
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

  const { data: pageItems = [], isLoading: pagesLoading } = useQuery({
    queryKey: ["template-backfill-page-items", latestRun?.id],
    enabled: !!latestRun?.id,
    queryFn: async (): Promise<PageItem[]> => {
      const { data, error } = await supabase
        .from("template_backfill_page_items")
        .select("id, page_id, template_name, page_title, page_slug, page_status, status, has_icon_widgets")
        .eq("run_id", latestRun!.id)
        .order("template_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PageItem[];
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

  const retryFailed = async () => {
    if (!latestRun) return;
    setRunning(true);
    try {
      const { error } = await supabase.functions.invoke("sync-template-engine", {
        body: { retry_run_id: latestRun.id },
      });
      if (error) throw error;
      toast({ title: "Retrying failed templates", description: "Only the failed templates from the last run are being reprocessed." });
      queryClient.invalidateQueries({ queryKey: ["template-backfill-latest-run"] });
      queryClient.invalidateQueries({ queryKey: ["template-backfill-items"] });
      queryClient.invalidateQueries({ queryKey: ["template-backfill-page-items"] });
    } catch (err) {
      const msg = await extractEdgeError(err, "Failed to retry");
      toast({ title: "Retry failed", description: msg, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };


  // ─── One-click republish of pages affected by this sync run ───────────────
  // Published pages hold a snapshot of the OLD engine output, so they must be
  // republished to render the refreshed widgets. Drafts pick up the new engine
  // on their next generation, so only "published" pages are targeted here.
  const [republishingAll, setRepublishingAll] = useState(false);
  const [republishingIds, setRepublishingIds] = useState<Record<string, boolean>>({});

  const publishablePages = pageItems.filter(
    (p) => !!p.page_id && (p.page_status || "").toLowerCase() === "published",
  );
  const publishablePageIds = Array.from(
    new Set(publishablePages.map((p) => p.page_id!).filter(Boolean)),
  );

  // Pages whose template contains icon-box / icon-list widgets — the ones
  // affected by an icon-widget fix. Only published pages need a republish.
  const [republishingIcons, setRepublishingIcons] = useState(false);
  const iconPageIds = Array.from(
    new Set(publishablePages.filter((p) => p.has_icon_widgets).map((p) => p.page_id!).filter(Boolean)),
  );

  const republishPages = async (ids: string[]) => {
    if (!ids.length) return;
    const { data, error } = await supabase.functions.invoke("publish-pages", {
      body: {
        page_ids: ids,
        publish_type: "page",
        as_admin: true,
        elementor_mode: "native",
        overwrite_design: true,
      },
    });
    if (error) throw error;
    if ((data as { error?: string })?.error) throw new Error((data as { error?: string }).error);
    return data as { published?: number; failed?: number };
  };

  const republishAll = async () => {
    if (!publishablePageIds.length) return;
    setRepublishingAll(true);
    try {
      const data = await republishPages(publishablePageIds);
      toast({
        title: "Republish started",
        description: `${data?.published ?? 0} republished, ${data?.failed ?? 0} failed.`,
      });
      queryClient.invalidateQueries({ queryKey: ["template-backfill-page-items"] });
    } catch (err) {
      const msg = await extractEdgeError(err, "Failed to republish pages");
      toast({ title: "Republish failed", description: msg, variant: "destructive" });
    } finally {
      setRepublishingAll(false);
    }
  };

  const republishIconPages = async () => {
    if (!iconPageIds.length) return;
    setRepublishingIcons(true);
    try {
      const data = await republishPages(iconPageIds);
      toast({
        title: "Icon-box/list pages republishing",
        description: `${data?.published ?? 0} republished, ${data?.failed ?? 0} failed.`,
      });
      queryClient.invalidateQueries({ queryKey: ["template-backfill-page-items"] });
    } catch (err) {
      const msg = await extractEdgeError(err, "Failed to republish icon pages");
      toast({ title: "Republish failed", description: msg, variant: "destructive" });
    } finally {
      setRepublishingIcons(false);
    }
  };



  const republishOne = async (pageId: string) => {
    setRepublishingIds((m) => ({ ...m, [pageId]: true }));
    try {
      const data = await republishPages([pageId]);
      toast({
        title: data?.published ? "Page republished" : "Republish finished",
        description: data?.failed ? "Republish failed for this page." : "The page now renders the refreshed engine.",
        variant: data?.failed ? "destructive" : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["template-backfill-page-items"] });
    } catch (err) {
      const msg = await extractEdgeError(err, "Failed to republish page");
      toast({ title: "Republish failed", description: msg, variant: "destructive" });
    } finally {
      setRepublishingIds((m) => ({ ...m, [pageId]: false }));
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
            {failedItems.length > 0 && (
              <Button variant="outline" onClick={retryFailed} disabled={running || latestRun?.status === "running"} className="gap-2 border-destructive/40 text-destructive hover:text-destructive">
                <AlertCircle className="h-4 w-4" /> Retry {failedItems.length} failed
              </Button>
            )}
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

      {latestRun && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">Connected pages updated</CardTitle>
              <CardDescription>
                Pages linked to each re-synced template that now point at the refreshed engine.
                Republish published pages to render the update — in one click below.
              </CardDescription>
            </div>
            <Button
              onClick={republishAll}
              disabled={republishingAll || publishablePageIds.length === 0}
              className="gap-2 shrink-0"
            >
              {republishingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              Republish all published ({publishablePageIds.length})
            </Button>
          </CardHeader>
          <CardContent className="px-0">
            {pagesLoading ? (
              <Skeleton className="h-40 mx-6 rounded-lg" />
            ) : pageItems.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">No connected pages recorded for this run.</p>
            ) : (
              <ScrollArea className="h-[360px]">
                <div className="divide-y divide-border">
                  {pageItems.map((p) => {
                    const canRepublish = !!p.page_id && (p.page_status || "").toLowerCase() === "published";
                    return (
                      <div key={p.id} className="flex items-center gap-3 px-6 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.page_title || p.page_slug || "(untitled page)"}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs text-muted-foreground truncate">
                              via {p.template_name || "template"}
                            </span>
                            {p.page_status && (
                              <Badge variant="outline" className="text-[10px] capitalize">{p.page_status}</Badge>
                            )}
                          </div>
                        </div>
                        {canRepublish ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => republishOne(p.page_id!)}
                            disabled={!!republishingIds[p.page_id!] || republishingAll}
                            className="gap-1.5 shrink-0"
                          >
                            {republishingIds[p.page_id!] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
                            Republish
                          </Button>
                        ) : (
                          <Badge className="bg-primary/15 text-primary border-primary/30 gap-1">
                            <CheckCircle2 className="h-3 w-3" />Updated
                          </Badge>
                        )}
                      </div>
                    );
                  })}
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
