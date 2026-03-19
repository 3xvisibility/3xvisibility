import { useMemo, useState } from "react";
import { DirectoryStructureBuilder } from "@/components/campaigns/DirectoryStructureBuilder";
import { SpintaxPreview } from "@/components/campaigns/SpintaxPreview";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import {
  ArrowLeft, Play, Pause, RotateCcw, ExternalLink, Eye, AlertTriangle,
  Check, Clock, XCircle, FileText, Layers, RefreshCw, Download, ScrollText, SkipForward,
  Settings, FolderTree, Image, MapPin, BookOpen, Star, Users, CalendarClock, Code,
} from "lucide-react";
import { exportPagesCsv, exportPagesJson, exportLogsCsv, exportExecutionHistoryCsv } from "@/lib/export-csv";

const statusColors: Record<string, string> = {
  pending: "hsl(var(--muted-foreground))",
  published: "hsl(var(--primary))",
  failed: "hsl(var(--destructive))",
};

const statusBadge: Record<string, { class: string; label: string }> = {
  pending: { class: "bg-muted text-muted-foreground", label: "Pending" },
  published: { class: "bg-primary/10 text-primary", label: "Published" },
  failed: { class: "bg-destructive/10 text-destructive", label: "Failed" },
};

const campaignStatusBadge: Record<string, { class: string; label: string }> = {
  completed: { class: "bg-success/10 text-success border-success/20", label: "Completed" },
  processing: { class: "bg-primary/10 text-primary border-primary/20", label: "Processing" },
  draft: { class: "bg-muted text-muted-foreground border-border", label: "Draft" },
  failed: { class: "bg-destructive/10 text-destructive border-destructive/20", label: "Failed" },
  queued: { class: "bg-warning/10 text-warning border-warning/20", label: "Queued" },
};

const chartConfig: ChartConfig = {
  pending: { label: "Pending", color: "hsl(var(--muted-foreground))" },
  published: { label: "Published", color: "hsl(var(--primary))" },
  failed: { label: "Failed", color: "hsl(var(--destructive))" },
};

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [resumeIndex, setResumeIndex] = useState(0);
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set());
  const [overwriteFields, setOverwriteFields] = useState({
    title: true,
    content: true,
    seo: true,
    images: true,
  });

  // Fetch campaign
  const { data: campaign, isLoading: campaignLoading } = useQuery({
    queryKey: ["campaign-detail", id],
    enabled: !!id && !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*, templates(name), websites(name, url)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch generated pages
  const { data: pages = [], isLoading: pagesLoading } = useQuery({
    queryKey: ["campaign-pages", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_pages")
        .select("id, title, slug, status, external_url, external_id, error_message, created_at, seo_title, seo_description")
        .eq("campaign_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch generation jobs
  const { data: jobs = [] } = useQuery({
    queryKey: ["campaign-jobs", id],
    enabled: !!id,
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generation_jobs")
        .select("*")
        .eq("campaign_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch campaign logs
  const { data: campaignLogs = [] } = useQuery({
    queryKey: ["campaign-logs", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_logs")
        .select("*")
        .eq("campaign_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const latestJob = jobs[0];

  // Overview stats
  const statusCounts = useMemo(() => {
    const counts = { pending: 0, published: 0, failed: 0 };
    pages.forEach((p) => {
      if (p.status in counts) counts[p.status as keyof typeof counts]++;
    });
    return counts;
  }, [pages]);

  const pieData = useMemo(() => {
    return Object.entries(statusCounts)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({ name: key, value, fill: statusColors[key] }));
  }, [statusCounts]);

  // Errors
  const errorPages = useMemo(() => pages.filter((p) => p.status === "failed"), [pages]);
  const jobErrors = useMemo(() => {
    if (!latestJob?.error_log) return [];
    return Array.isArray(latestJob.error_log) ? latestJob.error_log : [];
  }, [latestJob]);

  // Recent executions
  const executionHistory = useMemo(() => {
    return jobs.map((j: any) => ({
      id: j.id,
      status: j.status,
      started: j.started_at ? new Date(j.started_at).toLocaleString() : "—",
      completed: j.completed_at ? new Date(j.completed_at).toLocaleString() : "—",
      duration: j.started_at && j.completed_at
        ? `${Math.round((new Date(j.completed_at).getTime() - new Date(j.started_at).getTime()) / 1000)}s`
        : "—",
      pages: j.success_count,
      errors: j.error_count,
      total: j.total_rows,
    }));
  }, [jobs]);

  // Execute mutation
  const executeMutation = useMutation({
    mutationFn: async (params?: { action?: string; overwrite_fields?: typeof overwriteFields }) => {
      const action = params?.action;
      const isTest = action === "test";
      const { data, error } = await supabase.functions.invoke("generate-pages", {
        body: {
          campaign_id: id,
          action: isTest ? undefined : action,
          test_mode: isTest,
          overwrite_fields: params?.overwrite_fields || undefined,
        },
      });
      if (error) {
        try {
          const ctx = (error as any).context;
          if (ctx && typeof ctx.json === 'function') {
            const body = await ctx.json();
            if (body?.error) throw new Error(body.error);
          }
        } catch (e) {
          if (e instanceof Error && e.message !== error.message) throw e;
        }
        throw new Error(error.message || "Generation failed");
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["campaign-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["campaign-pages", id] });
      queryClient.invalidateQueries({ queryKey: ["campaign-jobs", id] });
      toast({ title: data.paused ? "Generation paused" : "Generation complete", description: `${data.generated || 0} pages generated.` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const republishMutation = useMutation({
    mutationFn: async (pageId: string) => {
      const { error } = await supabase.from("generated_pages").update({ status: "pending" }).eq("id", pageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-pages", id] });
      toast({ title: "Page queued for republish" });
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const { error } = await supabase.from("generated_pages").update({ status: status as any }).in("id", ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (count, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["campaign-pages", id] });
      setSelectedPageIds(new Set());
      toast({ title: "Status updated", description: `${count} page${count !== 1 ? "s" : ""} set to ${status}.` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("generated_pages").delete().in("id", ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["campaign-pages", id] });
      setSelectedPageIds(new Set());
      toast({ title: "Pages deleted", description: `${count} page${count !== 1 ? "s" : ""} deleted.` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (campaignLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Campaign not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/campaigns")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Campaigns
        </Button>
      </div>
    );
  }

  const cStatus = campaignStatusBadge[campaign.status] || campaignStatusBadge.draft;
  const jobPercent = latestJob && latestJob.total_rows > 0
    ? Math.round((latestJob.processed_rows / latestJob.total_rows) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/campaigns")} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-display">{campaign.name}</h1>
              <Badge variant="secondary" className={`${cStatus.class} border text-xs`}>{cStatus.label}</Badge>
              <Badge variant="outline" className="uppercase text-[10px] font-semibold">{campaign.campaign_type}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {(campaign as any).websites?.name || "No site"} · {(campaign as any).templates?.name || "No template"} · {campaign.total_rows || 0} rows
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {campaign.status === "draft" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => executeMutation.mutate({ action: "test" })}
                disabled={executeMutation.isPending}
                className="rounded-xl"
              >
                <Eye className="mr-1.5 h-4 w-4" />
                Test
              </Button>
              <Button
                size="sm"
                onClick={() => executeMutation.mutate({})}
                disabled={executeMutation.isPending}
                className="rounded-xl bg-gradient-primary hover:brightness-110"
              >
                <Play className="mr-1.5 h-4 w-4" />
                {executeMutation.isPending ? "Running..." : "Run"}
              </Button>
            </>
          )}
          {campaign.status === "processing" && (
            <>
              <Button variant="outline" size="sm" onClick={() => executeMutation.mutate({ action: "pause" })} disabled={executeMutation.isPending} className="rounded-xl">
                <Pause className="mr-1.5 h-4 w-4" /> Pause
              </Button>
              <Button variant="destructive" size="sm" onClick={() => executeMutation.mutate({ action: "abort" })} disabled={executeMutation.isPending} className="rounded-xl">
                <XCircle className="mr-1.5 h-4 w-4" /> Abort
              </Button>
            </>
          )}
          {(campaign.status === "completed" || campaign.status === "failed") && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowOverwriteDialog(true)} disabled={executeMutation.isPending} className="rounded-xl">
                <RotateCcw className="mr-1.5 h-4 w-4" /> Re-generate
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setResumeIndex(campaign.processed_rows || 0); setShowResumeDialog(true); }} disabled={executeMutation.isPending} className="rounded-xl">
                <SkipForward className="mr-1.5 h-4 w-4" /> Resume from…
              </Button>
              <Button variant="outline" size="sm" onClick={() => executeMutation.mutate({})} disabled={executeMutation.isPending} className="rounded-xl">
                <Play className="mr-1.5 h-4 w-4" /> Re-run
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Progress Banner */}
      {latestJob && (latestJob.status === "running" || latestJob.status === "paused") && (
        <Card className="border-primary/20 bg-primary/5 border-0 shadow-surface">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Generation in progress</span>
              <span className="font-semibold tabular-nums">{jobPercent}%</span>
            </div>
            <Progress value={jobPercent} className="h-2" />
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>Processed: <span className="text-foreground font-medium tabular-nums">{latestJob.processed_rows}/{latestJob.total_rows}</span></span>
              <span>Success: <span className="text-success font-medium tabular-nums">{latestJob.success_count}</span></span>
              {latestJob.error_count > 0 && (
                <span>Errors: <span className="text-destructive font-medium tabular-nums">{latestJob.error_count}</span></span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-muted/50 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="overview" className="gap-1.5 text-xs"><Layers className="h-3.5 w-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="pages" className="gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" /> Pages <Badge variant="secondary" className="ml-1 text-[10px] h-5 px-1.5">{pages.length}</Badge></TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5 text-xs"><Settings className="h-3.5 w-3.5" /> Settings</TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5 text-xs"><ScrollText className="h-3.5 w-3.5" /> Logs <Badge variant="secondary" className="ml-1 text-[10px] h-5 px-1.5">{campaignLogs.length}</Badge></TabsTrigger>
          <TabsTrigger value="errors" className="gap-1.5 text-xs"><AlertTriangle className="h-3.5 w-3.5" /> Errors <Badge variant="secondary" className="ml-1 text-[10px] h-5 px-1.5 bg-destructive/10 text-destructive">{errorPages.length + jobErrors.length}</Badge></TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          {/* Status Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(["pending", "published", "failed"] as const).map((s) => (
              <Card key={s} className="border-0 shadow-surface">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                    s === "published" ? "bg-primary/10" : s === "failed" ? "bg-destructive/10" : "bg-muted"
                  }`}>
                    {s === "published" ? <Check className="h-5 w-5 text-primary" /> : s === "failed" ? <XCircle className="h-5 w-5 text-destructive" /> : <Clock className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums">{statusCounts[s]}</p>
                    <p className="text-xs text-muted-foreground capitalize">{s} pages</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Chart */}
          {pieData.length > 0 && (
            <Card className="border-0 shadow-surface">
              <CardHeader><CardTitle className="text-sm">Pages by Status</CardTitle></CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2} label={(props: any) => `${props.name}: ${props.value}`}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* Recent Executions */}
          {executionHistory.length > 0 && (
            <Card className="border-0 shadow-surface">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Execution History</CardTitle>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => exportExecutionHistoryCsv(jobs as any, campaign?.name || "campaign")}>
                  <Download className="h-3 w-3 mr-1" /> Export
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Started</th>
                        <th className="text-left p-3 font-medium">Duration</th>
                        <th className="text-right p-3 font-medium">Pages</th>
                        <th className="text-right p-3 font-medium">Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {executionHistory.map((ex) => (
                        <tr key={ex.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <Badge variant="secondary" className={`text-[10px] capitalize ${
                              ex.status === "completed" ? "bg-success/10 text-success" :
                              ex.status === "failed" ? "bg-destructive/10 text-destructive" :
                              ex.status === "running" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                            }`}>{ex.status}</Badge>
                          </td>
                          <td className="p-3 text-xs text-muted-foreground tabular-nums">{ex.started}</td>
                          <td className="p-3 text-xs font-medium tabular-nums">{ex.duration}</td>
                          <td className="p-3 text-right text-xs font-medium tabular-nums">{ex.pages}/{ex.total}</td>
                          <td className="p-3 text-right text-xs tabular-nums">{ex.errors > 0 ? <span className="text-destructive font-medium">{ex.errors}</span> : "0"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* GENERATED PAGES TAB */}
        <TabsContent value="pages" className="space-y-4">
          {pagesLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : pages.length === 0 ? (
            <Card className="border-0 shadow-surface">
              <CardContent className="py-16 text-center">
                <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">No pages generated yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Run the campaign to generate pages.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <div className="flex items-center gap-2">
                  {selectedPageIds.size > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/5 border border-primary/20">
                      <Check className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-medium">{selectedPageIds.size} selected</span>
                      <Separator orientation="vertical" className="h-4" />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] px-2 text-primary"
                        onClick={() => bulkStatusMutation.mutate({ ids: [...selectedPageIds], status: "pending" })}
                        disabled={bulkStatusMutation.isPending}
                      >
                        <Clock className="h-2.5 w-2.5 mr-1" /> Set Pending
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] px-2 text-primary"
                        onClick={() => bulkStatusMutation.mutate({ ids: [...selectedPageIds], status: "published" })}
                        disabled={bulkStatusMutation.isPending}
                      >
                        <Check className="h-2.5 w-2.5 mr-1" /> Set Published
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] px-2 text-destructive"
                        onClick={() => {
                          if (window.confirm(`Delete ${selectedPageIds.size} selected pages? This cannot be undone.`)) {
                            bulkDeleteMutation.mutate([...selectedPageIds]);
                          }
                        }}
                        disabled={bulkDeleteMutation.isPending}
                      >
                        <XCircle className="h-2.5 w-2.5 mr-1" /> Delete
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] px-2"
                        onClick={() => setSelectedPageIds(new Set())}
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => exportPagesCsv(pages, `${campaign?.name || "pages"}-export.csv`)}>
                    <Download className="h-3.5 w-3.5 mr-1.5" /> CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportPagesJson(pages, `${campaign?.name || "pages"}-export.json`)}>
                    <Download className="h-3.5 w-3.5 mr-1.5" /> JSON
                  </Button>
                </div>
              </div>
              <Card className="border-0 shadow-surface">
              <CardContent className="p-0">
                <ScrollArea className="max-h-[600px]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card z-10">
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="p-3 w-8">
                          <Checkbox
                            checked={selectedPageIds.size === pages.length && pages.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedPageIds(new Set(pages.map(p => p.id)));
                              } else {
                                setSelectedPageIds(new Set());
                              }
                            }}
                          />
                        </th>
                        <th className="text-left p-3 font-medium">Title</th>
                        <th className="text-left p-3 font-medium">Slug</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">CMS ID</th>
                        <th className="text-left p-3 font-medium">Created</th>
                        <th className="text-right p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pages.map((page) => {
                        const ps = statusBadge[page.status] || statusBadge.pending;
                        const isSelected = selectedPageIds.has(page.id);
                        return (
                          <tr key={page.id} className={`border-b border-border/50 transition-colors ${isSelected ? "bg-primary/5" : "hover:bg-muted/30"}`}>
                            <td className="p-3 w-8">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  const next = new Set(selectedPageIds);
                                  if (checked) next.add(page.id); else next.delete(page.id);
                                  setSelectedPageIds(next);
                                }}
                              />
                            </td>
                            <td className="p-3">
                              <div>
                                <p className="font-medium text-xs truncate max-w-[240px]">{page.title}</p>
                                {page.seo_title && page.seo_title !== page.title && (
                                  <p className="text-[10px] text-muted-foreground truncate max-w-[240px]">SEO: {page.seo_title}</p>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-xs text-muted-foreground font-mono truncate max-w-[160px]">/{page.slug}</td>
                            <td className="p-3">
                              <Badge variant="secondary" className={`${ps.class} text-[10px]`}>{ps.label}</Badge>
                            </td>
                            <td className="p-3 text-xs text-muted-foreground font-mono tabular-nums">{page.external_id || "—"}</td>
                            <td className="p-3 text-xs text-muted-foreground tabular-nums">{new Date(page.created_at).toLocaleDateString()}</td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {page.external_url && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                    <a href={page.external_url} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                  </Button>
                                )}
                                {page.status === "failed" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => republishMutation.mutate(page.id)}
                                  >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </ScrollArea>
              </CardContent>
            </Card>
            </>
          )}
        </TabsContent>

        {/* SETTINGS TAB */}
        <TabsContent value="settings" className="space-y-6">
          {/* Directory Structure Builder */}
          <DirectoryStructureBuilder
            campaignId={id!}
            directoryStructure={(campaign as any).directory_structure as any}
            csvHeaders={(() => {
              const csvData = campaign.csv_data as any[];
              if (csvData && csvData.length > 0) return Object.keys(csvData[0]);
              return [];
            })()}
            onSave={async (structure) => {
              await supabase.from("campaigns").update({
                directory_structure: structure,
              } as any).eq("id", id!);
              queryClient.invalidateQueries({ queryKey: ["campaign-detail", id] });
              toast({ title: structure ? "Directory structure saved" : "Directory structure cleared" });
            }}
          />

          {/* SEA Ad Group Mapping */}
          {campaign.campaign_type === "sea" && (
            <Card className="border-0 shadow-surface">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" /> Google Ads Mapping
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Map CSV columns to Google Ads identifiers for tracking. Use <code className="bg-muted px-1 rounded text-[11px]">{"{column}"}</code> syntax for dynamic values.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Ad Campaign ID</Label>
                    <Input
                      placeholder="{ad_campaign_id} or fixed value"
                      defaultValue={((campaign as any).utm_settings as any)?.ad_campaign_id || ""}
                      onBlur={async (e) => {
                        const current = ((campaign as any).utm_settings || {}) as any;
                        await supabase.from("campaigns").update({
                          utm_settings: { ...current, ad_campaign_id: e.target.value || null },
                        } as any).eq("id", id!);
                        queryClient.invalidateQueries({ queryKey: ["campaign-detail", id] });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Ad Group ID</Label>
                    <Input
                      placeholder="{ad_group_id} or fixed value"
                      defaultValue={((campaign as any).utm_settings as any)?.ad_group_id || ""}
                      onBlur={async (e) => {
                        const current = ((campaign as any).utm_settings || {}) as any;
                        await supabase.from("campaigns").update({
                          utm_settings: { ...current, ad_group_id: e.target.value || null },
                        } as any).eq("id", id!);
                        queryClient.invalidateQueries({ queryKey: ["campaign-detail", id] });
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">utm_source</Label>
                    <Input
                      placeholder="google"
                      defaultValue={((campaign as any).utm_settings as any)?.utm_source || ""}
                      onBlur={async (e) => {
                        const current = ((campaign as any).utm_settings || {}) as any;
                        await supabase.from("campaigns").update({
                          utm_settings: { ...current, utm_source: e.target.value || null },
                        } as any).eq("id", id!);
                        queryClient.invalidateQueries({ queryKey: ["campaign-detail", id] });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">utm_medium</Label>
                    <Input
                      placeholder="cpc"
                      defaultValue={((campaign as any).utm_settings as any)?.utm_medium || ""}
                      onBlur={async (e) => {
                        const current = ((campaign as any).utm_settings || {}) as any;
                        await supabase.from("campaigns").update({
                          utm_settings: { ...current, utm_medium: e.target.value || null },
                        } as any).eq("id", id!);
                        queryClient.invalidateQueries({ queryKey: ["campaign-detail", id] });
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Drip Feed / Scheduling */}
          <Card className="border-0 shadow-surface">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary" /> Drip Feed Scheduling
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Space out page publishing over time to appear more natural to search engines.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Interval (hours between pages)</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="24"
                    defaultValue={((campaign as any).drip_feed_settings as any)?.interval_hours || ""}
                    onBlur={async (e) => {
                      const hours = parseInt(e.target.value) || 0;
                      const current = ((campaign as any).drip_feed_settings || {}) as any;
                      await supabase.from("campaigns").update({
                        drip_feed_settings: hours > 0 ? { ...current, interval_hours: hours, enabled: true } : null,
                      } as any).eq("id", id!);
                      queryClient.invalidateQueries({ queryKey: ["campaign-detail", id] });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Start Date</Label>
                  <Input
                    type="datetime-local"
                    defaultValue={((campaign as any).drip_feed_settings as any)?.start_date || ""}
                    onBlur={async (e) => {
                      const current = ((campaign as any).drip_feed_settings || {}) as any;
                      await supabase.from("campaigns").update({
                        drip_feed_settings: { ...current, start_date: e.target.value || null },
                      } as any).eq("id", id!);
                      queryClient.invalidateQueries({ queryKey: ["campaign-detail", id] });
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Author Rotation */}
          <Card className="border-0 shadow-surface">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Author Rotation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Rotate page authorship across multiple WordPress authors for a more natural content footprint.
              </p>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Authors (one per line)</Label>
                <Textarea
                  placeholder={"admin\neditor1\neditor2"}
                  rows={3}
                  defaultValue={((campaign as any).author_rotation as any)?.authors?.join("\n") || ""}
                  onBlur={async (e) => {
                    const authors = e.target.value.split("\n").map((s: string) => s.trim()).filter(Boolean);
                    await supabase.from("campaigns").update({
                      author_rotation: authors.length > 0 ? { enabled: true, authors } : null,
                    } as any).eq("id", id!);
                    queryClient.invalidateQueries({ queryKey: ["campaign-detail", id] });
                    toast({ title: authors.length > 0 ? `${authors.length} authors configured` : "Author rotation cleared" });
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Dynamic Shortcode Reference */}
          <Card className="border-0 shadow-surface">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Code className="h-4 w-4 text-primary" /> Shortcode Reference
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-4">
                Use these shortcodes in your templates. Variables like <code className="bg-muted px-1 rounded text-[11px]">{"{city}"}</code> inside shortcodes are resolved automatically.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { icon: <MapPin className="h-3.5 w-3.5" />, code: "{{MAP:query}}", desc: "Google Maps embed" },
                  { icon: <MapPin className="h-3.5 w-3.5" />, code: "{{OSM:query}}", desc: "OpenStreetMap embed (free)" },
                  { icon: <Image className="h-3.5 w-3.5" />, code: "{{IMAGE:query}}", desc: "Unsplash stock photo" },
                  { icon: <Image className="h-3.5 w-3.5" />, code: "{{PEXELS:query}}", desc: "Pexels stock photo" },
                  { icon: <Image className="h-3.5 w-3.5" />, code: "{{PIXABAY:query}}", desc: "Pixabay stock photo" },
                  { icon: <BookOpen className="h-3.5 w-3.5" />, code: "{{WIKIPEDIA:topic}}", desc: "Wikipedia excerpt" },
                  { icon: <Star className="h-3.5 w-3.5" />, code: "{{YELP:category,location}}", desc: "Yelp business listings" },
                  { icon: <Play className="h-3.5 w-3.5" />, code: "{{YOUTUBE:search}}", desc: "YouTube video embed" },
                  { icon: <Code className="h-3.5 w-3.5" />, code: "{{WEATHER:location}}", desc: "Weather widget" },
                  { icon: <Code className="h-3.5 w-3.5" />, code: "{{AI:prompt}}", desc: "AI-generated text" },
                  { icon: <Image className="h-3.5 w-3.5" />, code: "{{AI_IMAGE:prompt}}", desc: "AI-generated image" },
                  { icon: <Code className="h-3.5 w-3.5" />, code: "{{GEO_BLOCKS}}", desc: "Auto address/phone/hours" },
                ].map(({ icon, code, desc }) => (
                  <div key={code} className="flex items-start gap-2 p-2.5 rounded-lg border border-border/50 bg-muted/30">
                    <span className="text-primary mt-0.5">{icon}</span>
                    <div className="min-w-0">
                      <code className="text-[11px] font-mono font-semibold text-foreground break-all">{code}</code>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <h4 className="text-xs font-semibold mb-2">Variable Transforms</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Apply transforms to variables with <code className="bg-muted px-1 rounded text-[11px]">{"{variable:transform}"}</code> syntax.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { code: "{city:uppercase}", desc: "LOS ANGELES" },
                  { code: "{city:lowercase}", desc: "los angeles" },
                  { code: "{city:capitalize}", desc: "Los Angeles" },
                  { code: "{city:slug}", desc: "los-angeles" },
                  { code: "{name:extract(1)}", desc: "First word only" },
                  { code: "{desc:truncate(50)}", desc: "First 50 chars + …" },
                ].map(({ code, desc }) => (
                  <div key={code} className="flex items-center gap-2 text-xs p-2 rounded bg-muted/40 border border-border/40">
                    <code className="font-mono text-[11px] text-foreground font-medium">{code}</code>
                    <span className="text-muted-foreground">→ {desc}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => exportLogsCsv(campaignLogs, campaign?.name || "campaign")} disabled={campaignLogs.length === 0}>
              <Download className="h-3.5 w-3.5 mr-1.5" /> Export Logs CSV
            </Button>
          </div>
          {campaignLogs.length === 0 ? (
            <Card className="border-0 shadow-surface">
              <CardContent className="py-16 text-center">
                <ScrollText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">No logs yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Logs will appear here once a generation runs.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-surface">
              <CardContent className="p-0">
                <ScrollArea className="max-h-[600px]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card z-10">
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="text-left p-3 font-medium">Timestamp</th>
                        <th className="text-left p-3 font-medium">Event</th>
                        <th className="text-left p-3 font-medium">Message</th>
                        <th className="text-right p-3 font-medium">Batch</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaignLogs.map((log: any) => (
                        <tr key={log.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="p-3 text-xs text-muted-foreground tabular-nums whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                          <td className="p-3">
                            <Badge variant="secondary" className={`text-[10px] ${
                              log.event.includes("error") || log.event.includes("failed") ? "bg-destructive/10 text-destructive" :
                              log.event.includes("completed") || log.event.includes("started") ? "bg-primary/10 text-primary" :
                              log.event.includes("paused") ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"
                            }`}>{log.event}</Badge>
                          </td>
                          <td className="p-3 text-xs text-muted-foreground max-w-[300px] truncate">{log.message || "—"}</td>
                          <td className="p-3 text-right text-xs tabular-nums text-muted-foreground">
                            {log.batch_number != null ? `#${log.batch_number}` : "—"}
                            {log.pages_in_batch != null && ` (${log.pages_in_batch}p)`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ERRORS TAB */}
        <TabsContent value="errors" className="space-y-4">
          {errorPages.length === 0 && jobErrors.length === 0 ? (
            <Card className="border-0 shadow-surface">
              <CardContent className="py-16 text-center">
                <Check className="h-10 w-10 mx-auto mb-3 text-success/40" />
                <p className="text-sm font-medium text-muted-foreground">No errors</p>
                <p className="text-xs text-muted-foreground/60 mt-1">All pages generated successfully.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Page-level errors */}
              {errorPages.length > 0 && (
                <Card className="border-0 shadow-surface">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      Failed Pages ({errorPages.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="max-h-[400px]">
                      <div className="divide-y divide-border/50">
                        {errorPages.map((page) => (
                          <div key={page.id} className="p-4 hover:bg-muted/30 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{page.title}</p>
                                <p className="text-xs text-muted-foreground font-mono mt-0.5">/{page.slug}</p>
                                {page.error_message && (
                                  <div className="mt-2 text-xs p-2.5 rounded-lg bg-destructive/5 border border-destructive/10 text-destructive">
                                    {page.error_message}
                                  </div>
                                )}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs shrink-0"
                                onClick={() => republishMutation.mutate(page.id)}
                              >
                                <RefreshCw className="h-3 w-3 mr-1" /> Retry
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {/* Job-level errors */}
              {jobErrors.length > 0 && (
                <Card className="border-0 shadow-surface">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      Generation Errors ({jobErrors.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="max-h-[300px]">
                      <div className="space-y-2">
                        {jobErrors.map((err: any, i: number) => (
                          <div key={i} className="text-xs p-3 rounded-lg bg-destructive/5 border border-destructive/10 text-destructive">
                            {typeof err === "object" && err !== null ? (
                              <div>
                                {err.row !== undefined && <span className="font-medium">Row {err.row}: </span>}
                                {err.message || err.error || JSON.stringify(err)}
                              </div>
                            ) : (
                              String(err)
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Selective Overwrite Dialog */}
      <Dialog open={showOverwriteDialog} onOpenChange={setShowOverwriteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Re-generate Pages</DialogTitle>
            <DialogDescription>
              Choose which fields to overwrite on existing pages. Unchecked fields will keep their current values.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {([
              { key: "title" as const, label: "Page Title & Slug", desc: "Regenerate the H1 title and URL slug" },
              { key: "content" as const, label: "Page Content", desc: "Regenerate the full HTML body content" },
              { key: "seo" as const, label: "SEO Metadata", desc: "Regenerate SEO title, description, keywords & schema" },
              { key: "images" as const, label: "Images & Media", desc: "Regenerate dynamic maps, YouTube embeds & images" },
            ]).map(({ key, label, desc }) => (
              <div key={key} className="flex items-start gap-3">
                <Checkbox
                  id={`overwrite-${key}`}
                  checked={overwriteFields[key]}
                  onCheckedChange={(checked) =>
                    setOverwriteFields((prev) => ({ ...prev, [key]: !!checked }))
                  }
                  className="mt-0.5"
                />
                <div className="grid gap-0.5 leading-none">
                  <Label htmlFor={`overwrite-${key}`} className="text-sm font-medium cursor-pointer">
                    {label}
                  </Label>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowOverwriteDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowOverwriteDialog(false);
                executeMutation.mutate({ overwrite_fields: overwriteFields });
              }}
              disabled={!Object.values(overwriteFields).some(Boolean)}
              className="bg-gradient-primary hover:brightness-110"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Re-generate ({Object.values(overwriteFields).filter(Boolean).length} fields)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resume from Index Dialog */}
      <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Resume Generation</DialogTitle>
            <DialogDescription>
              Start generating from a specific row index. Useful if a previous generation stopped partway.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="resume-index" className="text-sm font-medium">Start from row</Label>
              <Input
                id="resume-index"
                type="number"
                min={0}
                max={campaign?.total_rows || 0}
                value={resumeIndex}
                onChange={(e) => setResumeIndex(parseInt(e.target.value) || 0)}
                className="tabular-nums"
              />
              <p className="text-xs text-muted-foreground">
                Last processed: row {campaign?.processed_rows || 0} of {campaign?.total_rows || 0}
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowResumeDialog(false)}>Cancel</Button>
            <Button
              onClick={() => {
                setShowResumeDialog(false);
                executeMutation.mutate({ action: "resume" });
              }}
              className="bg-gradient-primary hover:brightness-110"
            >
              <SkipForward className="mr-2 h-4 w-4" />
              Resume from row {resumeIndex}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
