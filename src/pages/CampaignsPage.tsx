import { useState, useMemo, useEffect } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { logAudit } from "@/lib/audit";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Plus, Play, Trash2, Pause, RotateCcw, Clock, Loader2, MoreHorizontal, Eye, Search as SearchIconLucide, Copy, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { InternalLinkDialog } from "@/components/campaigns/InternalLinkDialog";
import { GenerationJobDialog } from "@/components/campaigns/GenerationJobDialog";
import { CreateCampaignWizard } from "@/components/campaigns/CreateCampaignWizard";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useSubscription } from "@/hooks/use-subscription";
import { UsageLimitBanner } from "@/components/UpgradePrompt";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useDragReorder } from "@/hooks/use-drag-reorder";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Campaign = Tables<"campaigns"> & {
  templates?: { name: string } | null;
  websites?: { name: string } | null;
};

const statusConfigClasses: Record<string, string> = {
  completed: "bg-success/10 text-success border-success/20",
  processing: "bg-primary/10 text-primary border-primary/20",
  draft: "bg-muted text-muted-foreground border-border",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
  queued: "bg-warning/10 text-warning border-warning/20",
};

export default function CampaignsPage() {
  const { t } = useLanguage();
  const statusConfig: Record<string, { class: string; label: string }> = {
    completed: { class: statusConfigClasses.completed, label: t("common.completed") },
    processing: { class: statusConfigClasses.processing, label: t("common.processing") },
    draft: { class: statusConfigClasses.draft, label: t("common.draft") },
    failed: { class: statusConfigClasses.failed, label: t("common.failed") },
    queued: { class: statusConfigClasses.queued, label: t("common.queued") },
  };
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentWorkspace, basePath } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const [wizardOpen, setWizardOpen] = useState(false);
  const [linkDialogCampaign, setLinkDialogCampaign] = useState<Campaign | null>(null);
  const [jobDialogCampaign, setJobDialogCampaign] = useState<Campaign | null>(null);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "seo" | "sea" | "geo">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("campaign-progress")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "campaigns" }, () => {
        queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "generation_jobs" }, () => {
        queryClient.invalidateQueries({ queryKey: ["campaigns"] });
        queryClient.invalidateQueries({ queryKey: ["generation-jobs", wsId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient, wsId]);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*, templates(name), websites(name)")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Campaign[];
    },
  });

  const { data: generationJobs = [] } = useQuery({
    queryKey: ["generation-jobs", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generation_jobs")
        .select("id, campaign_id, status, total_rows, processed_rows, success_count, error_count")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const getLatestJob = (campaignId: string) => generationJobs.find((j: any) => j.campaign_id === campaignId);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, id) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({ title: "Campaign deleted" });
      if (wsId) logAudit(wsId, "campaign_deleted", "campaign", id);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (campaign: Campaign) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !wsId) throw new Error("Not authenticated");
      const { data: newCampaign, error } = await supabase.from("campaigns").insert({
        name: `${campaign.name} (Copy)`,
        language: (campaign as any).language || "en",
        country: (campaign as any).country || "US",
        campaign_type: campaign.campaign_type,
        campaign_types: (campaign as any).campaign_types || [campaign.campaign_type],
        user_id: user.id, workspace_id: wsId,
        template_id: campaign.template_id, website_id: campaign.website_id,
        csv_data: campaign.csv_data, mapping: campaign.mapping,
        publish_mode: campaign.publish_mode, max_rows: campaign.max_rows,
        batch_size: campaign.batch_size, total_rows: campaign.total_rows,
        utm_settings: campaign.utm_settings, geo_settings: campaign.geo_settings,
        directory_structure: campaign.directory_structure,
        author_rotation: campaign.author_rotation,
        drip_feed_settings: campaign.drip_feed_settings,
        generation_method: campaign.generation_method,
        status: "draft" as const,
      }).select("id").single();
      if (error) throw error;

      // Duplicate CSV
      const { data: csvFile } = await supabase.from("campaign_csv_files").select("*").eq("campaign_id", campaign.id).maybeSingle();
      if (csvFile && newCampaign) {
        await supabase.from("campaign_csv_files").insert({
          campaign_id: newCampaign.id, user_id: user.id, workspace_id: wsId,
          raw_content: csvFile.raw_content, headers: csvFile.headers,
          file_name: csvFile.file_name, file_size: csvFile.file_size, row_count: csvFile.row_count,
        });
      }

      // Duplicate mappings
      const { data: mappings } = await supabase.from("mappings").select("*").eq("campaign_id", campaign.id);
      if (mappings?.length && newCampaign) {
        await supabase.from("mappings").insert(mappings.map(m => ({
          campaign_id: newCampaign.id, workspace_id: wsId, user_id: user.id,
          source_column: m.source_column, target_field: m.target_field,
          field_category: m.field_category, sort_order: m.sort_order,
          is_required: m.is_required, transform_expression: m.transform_expression,
        })));
      }
      return campaign.name;
    },
    onSuccess: (name) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({ title: "Campaign duplicated", description: `"${name}" cloned.` });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const executeMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action?: string }) => {
      const { data, error } = await supabase.functions.invoke("generate-pages", { body: { campaign_id: id, action } });
      if (error) {
        try { const ctx = (error as any).context; if (ctx?.json) { const body = await ctx.json(); if (body?.error) throw new Error(body.error); } } catch (e) { if (e instanceof Error && e.message !== error.message) throw e; }
        throw new Error(error.message || "Generation failed");
      }
      if (data?.error) throw new Error(data.error);
      return { ...data, campaign_id: id };
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-page-count"] });
      if (data.paused) { toast({ title: "Paused", description: `${data.generated} generated.` }); return; }
      if (data.action === "paused") { toast({ title: "Paused" }); return; }
      toast({ title: "Pages generated", description: `${data.generated} created, ${data.failed} failed.` });
      // Auto internal links
      try {
        const { data: settings } = await supabase.from("internal_link_settings").select("enabled, auto_build").eq("campaign_id", data.campaign_id).maybeSingle();
        if (settings?.enabled && (settings as any).auto_build) {
          const { data: linkData } = await supabase.functions.invoke("build-internal-links", { body: { campaign_id: data.campaign_id } });
          if (linkData?.links_created) toast({ title: "Internal links built", description: `${linkData.links_created} links.` });
        }
      } catch {}
    },
    onError: (err: Error) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    },
  });

  const stuckCampaignIds = useMemo(() => {
    return campaigns.filter(c => {
      if (c.status !== "processing") return false;
      const lj = getLatestJob(c.id);
      return !(lj && (lj.status === "running" || lj.status === "pending"));
    }).map(c => c.id);
  }, [campaigns, generationJobs]);

  const resetStuckMutation = useMutation({
    mutationFn: async () => {
      if (stuckCampaignIds.length === 0) return;
      const { error } = await supabase.from("campaigns").update({ status: "draft" as any, is_paused: false, updated_at: new Date().toISOString() }).in("id", stuckCampaignIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({ title: "Reset stuck campaigns" });
    },
  });

  const { pagesUsed, pagesLimit } = useSubscription();

  const filteredCampaigns = useMemo(() => {
    let result = campaigns;
    if (typeFilter !== "all") result = result.filter(c => c.campaign_type === typeFilter || ((c as any).campaign_types || []).includes(typeFilter));
    if (statusFilter !== "all") result = result.filter(c => c.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(q) || c.templates?.name?.toLowerCase().includes(q) || c.websites?.name?.toLowerCase().includes(q));
    }
    return result;
  }, [campaigns, typeFilter, statusFilter, searchQuery]);

  const { ordered: orderedCampaigns, getDragProps: getCampaignDragProps } = useDragReorder(filteredCampaigns, `camp-order-${wsId}`);

  const getProgressInfo = (c: Campaign) => {
    const total = (c as any).total_rows || 0;
    const processed = (c as any).processed_rows || 0;
    const failed = (c as any).failed_rows || 0;
    const percent = total > 0 ? Math.round((processed / total) * 100) : 0;
    return { total, processed, failed, percent, generated: processed - failed };
  };

  const handleCampaignCreated = (campaignId: string) => {
    // Auto-run if published mode
    // The wizard already set the campaign status appropriately
    queryClient.invalidateQueries({ queryKey: ["campaigns"] });
  };

  return (
    <div className="space-y-6">
      <UsageLimitBanner type="pages" used={pagesUsed} limit={pagesLimit} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-display">{t("campaigns.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("campaigns.description")}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            {(["card", "table"] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === m ? "bg-card shadow-surface text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {m === "card" ? "Cards" : "Table"}
              </button>
            ))}
          </div>
          {stuckCampaignIds.length > 0 && (
            <Button variant="outline" size="sm" className="rounded-xl gap-1.5 text-warning border-warning/30 hover:bg-warning/10"
              onClick={() => resetStuckMutation.mutate()} disabled={resetStuckMutation.isPending}>
              <RotateCcw className={cn("h-3.5 w-3.5", resetStuckMutation.isPending && "animate-spin")} />
              Reset {stuckCampaignIds.length} stuck
            </Button>
          )}
          <Button onClick={() => setWizardOpen(true)} className="rounded-xl bg-gradient-primary hover:brightness-110 shadow-sm">
            <Plus className="mr-2 h-4 w-4" /> {t("campaigns.newCampaign")}
          </Button>
        </div>
      </div>

      {/* Filters */}
      {!isLoading && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <SearchIconLucide className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t("campaigns.searchCampaigns")} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
            {(["all", "seo", "sea", "geo"] as const).map(f => (
              <button key={f} onClick={() => setTypeFilter(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${typeFilter === f ? "bg-card shadow-surface text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {f === "all" ? "All" : f.toUpperCase()}
              </button>
            ))}
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("campaigns.allStatuses")}</SelectItem>
              <SelectItem value="draft">{t("common.draft")}</SelectItem>
              <SelectItem value="queued">{t("common.queued")}</SelectItem>
              <SelectItem value="processing">{t("common.processing")}</SelectItem>
              <SelectItem value="completed">{t("common.completed")}</SelectItem>
              <SelectItem value="failed">{t("common.failed")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Campaign List */}
      {isLoading ? (
        <div className="grid gap-4">{[1,2,3].map(i => <Card key={i} className="border-0 shadow-surface"><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>)}</div>
      ) : filteredCampaigns.length === 0 ? (
        <Card className="border-0 shadow-surface">
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center gap-3">
              {campaigns.length === 0 ? (
                <>
                  <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center"><Plus className="h-8 w-8 text-muted-foreground/50" /></div>
                  <h3 className="font-semibold">{t("campaigns.noCampaigns")}</h3>
                  <p className="text-muted-foreground text-sm max-w-sm">{t("campaigns.description")}</p>
                </>
              ) : (
                <>
                  <SearchIconLucide className="h-10 w-10 text-muted-foreground/40" />
                  <h3 className="font-semibold">{t("campaigns.noCampaignsSearch")}</h3>
                  <p className="text-muted-foreground text-sm">{t("common.tryAdjustingFilters")}</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : viewMode === "table" ? (
        <Card className="border-0 shadow-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground bg-muted/30">
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Template</th>
                  <th className="text-left p-3 font-medium hidden lg:table-cell">Website</th>
                  <th className="text-right p-3 font-medium">Rows</th>
                  <th className="text-right p-3 font-medium hidden md:table-cell">Progress</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orderedCampaigns.map((c) => {
                  const s = statusConfig[c.status] || statusConfig.draft;
                  const p = getProgressInfo(c);
                  return (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`${basePath}/campaigns/${c.id}`)}>
                      <td className="p-3">
                        <p className="font-medium text-sm truncate max-w-[200px]">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">{format(new Date(c.created_at), "PP")}</p>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          {((c as any).campaign_types?.length ? (c as any).campaign_types : [c.campaign_type]).map((t: string) => (
                            <Badge key={t} variant="outline" className="uppercase text-[9px] font-semibold">{t}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-3"><Badge variant="secondary" className={`${s.class} border text-[10px]`}>{s.label}</Badge></td>
                      <td className="p-3 hidden md:table-cell text-xs text-muted-foreground truncate max-w-[120px]">{c.templates?.name || "—"}</td>
                      <td className="p-3 hidden lg:table-cell text-xs text-muted-foreground truncate max-w-[120px]">{c.websites?.name || "—"}</td>
                      <td className="p-3 text-right text-xs tabular-nums">{p.total}</td>
                      <td className="p-3 text-right hidden md:table-cell">
                        {p.total > 0 && c.status !== "draft" && (
                          <div className="flex items-center gap-2 justify-end">
                            <Progress value={p.percent} className="w-16 h-1.5" />
                            <span className="text-[10px] tabular-nums text-muted-foreground">{p.percent}%</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`${basePath}/campaigns/${c.id}`)}><Eye className="h-3.5 w-3.5 mr-2" /> View</DropdownMenuItem>
                            {c.status === "draft" && <DropdownMenuItem onClick={() => executeMutation.mutate({ id: c.id })}><Play className="h-3.5 w-3.5 mr-2" /> Run</DropdownMenuItem>}
                            {c.status === "processing" && <DropdownMenuItem onClick={() => executeMutation.mutate({ id: c.id, action: "pause" })}><Pause className="h-3.5 w-3.5 mr-2" /> Pause</DropdownMenuItem>}
                            <DropdownMenuItem onClick={() => duplicateMutation.mutate(c)}><Copy className="h-3.5 w-3.5 mr-2" /> Duplicate</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => { if (window.confirm(`Delete "${c.name}"?`)) deleteMutation.mutate(c.id); }}><Trash2 className="h-3.5 w-3.5 mr-2" /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* Card View */
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {orderedCampaigns.map((c) => {
            const s = statusConfig[c.status] || statusConfig.draft;
            const p = getProgressInfo(c);
            const job = getLatestJob(c.id);
            return (
              <Card key={c.id} className="border-0 shadow-surface hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => navigate(`${basePath}/campaigns/${c.id}`)}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{c.name}</h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(c.created_at), "PP")}</p>
                    </div>
                    <div onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`${basePath}/campaigns/${c.id}`)}><Eye className="h-3.5 w-3.5 mr-2" /> View</DropdownMenuItem>
                          {c.status === "draft" && <DropdownMenuItem onClick={() => executeMutation.mutate({ id: c.id })}><Play className="h-3.5 w-3.5 mr-2" /> Run</DropdownMenuItem>}
                          <DropdownMenuItem onClick={() => duplicateMutation.mutate(c)}><Copy className="h-3.5 w-3.5 mr-2" /> Duplicate</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => { if (window.confirm(`Delete "${c.name}"?`)) deleteMutation.mutate(c.id); }}><Trash2 className="h-3.5 w-3.5 mr-2" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary" className={`${s.class} border text-[10px]`}>{s.label}</Badge>
                    {((c as any).campaign_types?.length ? (c as any).campaign_types : [c.campaign_type]).map((t: string) => (
                      <Badge key={t} variant="outline" className="uppercase text-[9px] font-semibold">{t}</Badge>
                    ))}
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    {c.templates?.name && <div className="flex items-center gap-1.5 truncate"><span className="text-muted-foreground/60">Template:</span> {c.templates.name}</div>}
                    {c.websites?.name && <div className="flex items-center gap-1.5 truncate"><Globe className="h-3 w-3 shrink-0" /> {c.websites.name}</div>}
                  </div>

                  {p.total > 0 && c.status !== "draft" && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">{p.processed}/{p.total} rows</span>
                        <span className="font-medium tabular-nums">{p.percent}%</span>
                      </div>
                      <Progress value={p.percent} className="h-1.5" />
                      {p.failed > 0 && <p className="text-[10px] text-destructive">{p.failed} failed</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Wizard */}
      <CreateCampaignWizard open={wizardOpen} onOpenChange={setWizardOpen} onCreated={handleCampaignCreated} />

      {/* Dialogs */}
      {linkDialogCampaign && <InternalLinkDialog open={!!linkDialogCampaign} onOpenChange={() => setLinkDialogCampaign(null)} campaignId={linkDialogCampaign.id} campaignName={linkDialogCampaign.name} templateVariables={(linkDialogCampaign as any).templates?.variables || []} />}
      {jobDialogCampaign && <GenerationJobDialog open={!!jobDialogCampaign} onOpenChange={() => setJobDialogCampaign(null)} campaignId={jobDialogCampaign.id} campaignName={jobDialogCampaign.name} />}
    </div>
  );
}
