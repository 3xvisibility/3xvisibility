import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ScanLine, AlertTriangle, CheckCircle2, Loader2, RefreshCw, Wrench, ExternalLink, ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { logAudit } from "@/lib/audit";
import { scanCssIssues, type CssIssue } from "@/lib/invalid-css-scan";
import type { Tables } from "@/integrations/supabase/types";

type GeneratedPage = Tables<"generated_pages">;

interface ScannedPage {
  page: GeneratedPage;
  count: number;
  issues: CssIssue[];
}

export default function CssScanFixPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [fixingId, setFixingId] = useState<string | null>(null);

  const { data: pages = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["css-scan-pages", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_pages")
        .select("id, title, slug, content, status, external_url, website_id, workspace_id")
        .eq("workspace_id", wsId as string)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as unknown as GeneratedPage[];
    },
  });

  // Scan happens client-side over fetched content.
  const scanned = useMemo<ScannedPage[]>(() => {
    return pages
      .map((page) => {
        const result = scanCssIssues(page.content || "");
        return { page, count: result.count, issues: result.issues };
      })
      .filter((s) => s.count > 0);
  }, [pages]);

  const totalIssues = scanned.reduce((sum, s) => sum + s.count, 0);

  const toggle = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelectedIds((prev) =>
      prev.size === scanned.length ? new Set() : new Set(scanned.map((s) => s.page.id)),
    );

  const republish = async (ids: string[]) => {
    if (!ids.length) return;
    // Reset to pending so publish-pages re-processes, then republish with the
    // native template pipeline and failed-widget re-import so invalid CSS gets
    // regenerated cleanly by the connector.
    const { error: resetErr } = await supabase
      .from("generated_pages")
      .update({ status: "pending" as never, error_message: null })
      .in("id", ids);
    if (resetErr) throw resetErr;

    const { data, error } = await supabase.functions.invoke("publish-pages", {
      body: {
        page_ids: ids,
        publish_type: "page",
        elementor_mode: "native",
        overwrite_design: true,
        reimport_failed_widgets: true,
        force_native: true,
      },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const fixMutation = useMutation({
    mutationFn: republish,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["css-scan-pages"] });
      queryClient.invalidateQueries({ queryKey: ["generated-pages"] });
      setSelectedIds(new Set());
      setFixingId(null);
      toast({
        title: "Reimport complete",
        description: `${data?.published ?? 0} republished, ${data?.failed ?? 0} failed.`,
      });
      if (wsId) logAudit(wsId, "pages_css_fixed", "page", null, { published: data?.published });
    },
    onError: (err: Error) => {
      setFixingId(null);
      toast({ title: "Fix failed", description: err.message, variant: "destructive" });
    },
  });

  const fixOne = (id: string) => {
    setFixingId(id);
    fixMutation.mutate([id]);
  };

  const fixSelected = () => fixMutation.mutate([...selectedIds]);
  const fixAll = () => fixMutation.mutate(scanned.map((s) => s.page.id));

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ScanLine className="h-6 w-6 text-primary" /> CSS Scan &amp; Fix
        </h1>
        <p className="text-sm text-muted-foreground">
          Scan published pages for invalid CSS (e.g. <code>margin:0px px 0px px</code>) and
          automatically reimport &amp; republish them with clean native Elementor styles.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Rescan
        </Button>
        {scanned.length > 0 && (
          <>
            <Button onClick={fixSelected} disabled={selectedIds.size === 0 || fixMutation.isPending}>
              {fixMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
              Fix selected ({selectedIds.size})
            </Button>
            <Button variant="secondary" onClick={fixAll} disabled={fixMutation.isPending}>
              <Wrench className="h-4 w-4" /> Fix all ({scanned.length})
            </Button>
          </>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : scanned.length === 0 ? (
        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>No invalid CSS found</AlertTitle>
          <AlertDescription>
            All {pages.length} published pages passed the CSS validation scan.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>
              {scanned.length} page{scanned.length > 1 ? "s" : ""} with {totalIssues} invalid CSS declaration{totalIssues > 1 ? "s" : ""}
            </AlertTitle>
            <AlertDescription>
              Reimporting republishes each page through the native template pipeline so broken
              inline styles are regenerated as editable widget controls.
            </AlertDescription>
          </Alert>

          <div className="flex items-center gap-2 px-1">
            <Checkbox
              checked={selectedIds.size === scanned.length && scanned.length > 0}
              onCheckedChange={toggleAll}
              id="select-all"
            />
            <label htmlFor="select-all" className="text-sm text-muted-foreground cursor-pointer">
              Select all
            </label>
          </div>

          <div className="space-y-3">
            {scanned.map(({ page, count, issues }) => (
              <Card key={page.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <Checkbox
                        className="mt-1"
                        checked={selectedIds.has(page.id)}
                        onCheckedChange={() => toggle(page.id)}
                      />
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{page.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="destructive">{count} issue{count > 1 ? "s" : ""}</Badge>
                          <span className="text-xs text-muted-foreground truncate">/{page.slug}</span>
                          {page.external_url && (
                            <a
                              href={page.external_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                            >
                              View <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => fixOne(page.id)}
                      disabled={fixMutation.isPending}
                    >
                      {fixingId === page.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Wrench className="h-4 w-4" />
                      )}
                      Fix
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-1">
                    {issues.map((issue, i) => (
                      <li key={i} className="text-xs font-mono flex items-start gap-2">
                        <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                        <span className="text-destructive break-all">{issue.snippet}</span>
                        <span className="text-muted-foreground">— {issue.reason}</span>
                      </li>
                    ))}
                    {count > issues.length && (
                      <li className="text-xs text-muted-foreground pl-5">
                        +{count - issues.length} more…
                      </li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
