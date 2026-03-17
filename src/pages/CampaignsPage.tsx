import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Upload, Play, ArrowRight, Trash2, Check, X, AlertTriangle, Link2, Pause, RotateCcw, Clock, FileText, Loader2, MoreHorizontal, Eye, MapPin, Target, Search as SearchIconLucide, Layers } from "lucide-react";
import { InternalLinkDialog } from "@/components/campaigns/InternalLinkDialog";
import { GenerationJobDialog } from "@/components/campaigns/GenerationJobDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, Database } from "@/integrations/supabase/types";
import { useSubscription } from "@/hooks/use-subscription";
import { UsageLimitBanner } from "@/components/UpgradePrompt";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Campaign = Tables<"campaigns"> & {
  templates?: { name: string } | null;
  websites?: { name: string } | null;
};

const statusConfig: Record<string, { class: string; label: string }> = {
  completed: { class: "bg-success/10 text-success border-success/20", label: "Completed" },
  processing: { class: "bg-primary/10 text-primary border-primary/20", label: "Processing" },
  draft: { class: "bg-muted text-muted-foreground border-border", label: "Draft" },
  failed: { class: "bg-destructive/10 text-destructive border-destructive/20", label: "Failed" },
  queued: { class: "bg-warning/10 text-warning border-warning/20", label: "Queued" },
};

export default function CampaignsPage() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [campaignName, setCampaignName] = useState("");
  const [campaignType, setCampaignType] = useState<"seo" | "sea" | "geo">("seo");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedWebsite, setSelectedWebsite] = useState("");
  const [linkDialogCampaign, setLinkDialogCampaign] = useState<Campaign | null>(null);
  const [logDialogCampaign, setLogDialogCampaign] = useState<string | null>(null);
  const [jobDialogCampaign, setJobDialogCampaign] = useState<Campaign | null>(null);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "seo" | "sea" | "geo">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "processing" | "completed" | "failed" | "queued">("all");
  // UTM fields
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [utmTerm, setUtmTerm] = useState("");
  const [utmContent, setUtmContent] = useState("");
  // GEO fields
  const [geoCountry, setGeoCountry] = useState("");
  const [geoRegion, setGeoRegion] = useState("");
  const [geoCity, setGeoCity] = useState("");
  const [geoPostcode, setGeoPostcode] = useState("");
  const [geoLat, setGeoLat] = useState("");
  const [geoLng, setGeoLng] = useState("");
  const [geoLanguage, setGeoLanguage] = useState("en");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

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

  // Fetch latest generation job per campaign for progress display
  const { data: generationJobs = [] } = useQuery({
    queryKey: ["generation-jobs", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generation_jobs")
        .select("id, campaign_id, status, total_rows, processed_rows, success_count, error_count, current_batch, batch_size, started_at, completed_at")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const getLatestJob = (campaignId: string) =>
    generationJobs.find((j: any) => j.campaign_id === campaignId);

  const { data: templates = [] } = useQuery({
    queryKey: ["templates", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase.from("templates").select("id, name, variables").eq("workspace_id", wsId!).order("name");
      if (error) throw error;
      return data;
    },
  });

  const selectedTemplateVars = useMemo(() => {
    if (!selectedTemplate) return [];
    const tpl = templates.find((t) => t.id === selectedTemplate);
    if (!tpl?.variables) return [];
    return (tpl.variables as string[]).map((v) => v.replace(/[{}]/g, ""));
  }, [selectedTemplate, templates]);

  const variableMapping = useMemo(() => {
    if (selectedTemplateVars.length === 0 || csvHeaders.length === 0) return null;
    const matched: { variable: string; column: string | null }[] = [];
    for (const v of selectedTemplateVars) {
      const vLower = v.toLowerCase();
      const exactMatch = csvHeaders.find((h) => h.toLowerCase() === vLower);
      if (exactMatch) {
        matched.push({ variable: v, column: exactMatch });
      } else {
        const fuzzy = csvHeaders.find(
          (h) => h.toLowerCase().includes(vLower) || vLower.includes(h.toLowerCase())
        );
        matched.push({ variable: v, column: fuzzy || null });
      }
    }
    const unmatchedColumns = csvHeaders.filter((h) => !matched.some((m) => m.column === h));
    return { matched, unmatchedColumns };
  }, [selectedTemplateVars, csvHeaders]);

  const { data: websites = [] } = useQuery({
    queryKey: ["websites", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase.from("websites").select("id, name").eq("workspace_id", wsId!).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: campaignLogs = [] } = useQuery({
    queryKey: ["campaign-logs", logDialogCampaign],
    enabled: !!logDialogCampaign,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_logs")
        .select("*")
        .eq("campaign_id", logDialogCampaign!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      if (!wsId) throw new Error("No workspace selected");
      const utmSettings = campaignType === "sea" ? {
        utm_source: utmSource, utm_medium: utmMedium, utm_campaign: utmCampaign,
        utm_term: utmTerm, utm_content: utmContent,
      } : null;
      const geoSettings = campaignType === "geo" ? {
        country: geoCountry, region: geoRegion, city: geoCity,
        postcode: geoPostcode, lat: geoLat ? parseFloat(geoLat) : null,
        lng: geoLng ? parseFloat(geoLng) : null, language: geoLanguage,
      } : null;
      const { data: campaign, error } = await supabase.from("campaigns").insert({
        name: campaignName,
        campaign_type: campaignType,
        template_id: selectedTemplate || null,
        website_id: selectedWebsite || null,
        csv_data: csvData as unknown as Database["public"]["Tables"]["campaigns"]["Insert"]["csv_data"],
        total_rows: csvData.length,
        user_id: user.id,
        workspace_id: wsId,
        utm_settings: utmSettings as any,
        geo_settings: geoSettings as any,
      }).select("id").single();
      if (error) throw error;

      // Persist DataSource
      if (csvFile && campaign) {
        await supabase.from("data_sources").insert({
          campaign_id: campaign.id,
          workspace_id: wsId,
          user_id: user.id,
          type: "csv",
          file_name: csvFile.name,
          file_size: csvFile.size,
          row_count: csvData.length,
          headers: csvHeaders as any,
        });
      }

      // Persist Mappings from variable mapping
      if (variableMapping && campaign) {
        const mappingRows = variableMapping.matched
          .filter((m) => m.column)
          .map((m, i) => ({
            campaign_id: campaign.id,
            workspace_id: wsId,
            user_id: user.id,
            source_column: m.column!,
            target_field: m.variable,
            field_category: "content",
            sort_order: i,
            is_required: true,
          }));
        if (mappingRows.length > 0) {
          await supabase.from("mappings").insert(mappingRows);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({ title: "Campaign created", description: `"${campaignName}" has been saved as a draft.` });
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({ title: "Campaign deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const executeMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action?: string }) => {
      const { data, error } = await supabase.functions.invoke("generate-pages", {
        body: { campaign_id: id, action },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return { ...data, campaign_id: id };
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-page-count"] });
      if (data.paused) {
        toast({ title: "Generation paused", description: `${data.generated} pages generated so far. ${data.remaining} remaining.` });
        return;
      }
      if (data.action === "paused") {
        toast({ title: "Generation paused" });
        return;
      }
      toast({ title: "Pages generated", description: `${data.generated} pages created, ${data.failed} failed.` });
      try {
        const { data: settings } = await supabase
          .from("internal_link_settings")
          .select("enabled, auto_build")
          .eq("campaign_id", data.campaign_id)
          .maybeSingle();
        if (settings?.enabled && (settings as any).auto_build) {
          toast({ title: "Building internal links...", description: "Auto-linking related pages." });
          const { data: linkData, error: linkErr } = await supabase.functions.invoke("build-internal-links", {
            body: { campaign_id: data.campaign_id },
          });
          if (linkErr || linkData?.error) {
            toast({ title: "Auto-linking failed", description: linkData?.error || linkErr?.message, variant: "destructive" });
          } else {
            toast({ title: "Internal links built", description: `${linkData.links_created} links created.` });
          }
        }
      } catch { /* Silent */ }
    },
    onError: (err: Error) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    },
  });

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      const headers = lines[0].split(",").map((h) => h.trim());
      setCsvHeaders(headers);
      const rows = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        return headers.reduce((acc, h, i) => ({ ...acc, [h]: values[i] || "" }), {} as Record<string, string>);
      });
      setCsvData(rows);
    };
    reader.readAsText(file);
  };

  const resetForm = () => {
    setOpen(false);
    setStep(1);
    setCampaignName("");
    setCampaignType("seo");
    setCsvFile(null);
    setCsvHeaders([]);
    setCsvData([]);
    setSelectedTemplate("");
    setSelectedWebsite("");
    setUtmSource(""); setUtmMedium(""); setUtmCampaign(""); setUtmTerm(""); setUtmContent("");
    setGeoCountry(""); setGeoRegion(""); setGeoCity(""); setGeoPostcode("");
    setGeoLat(""); setGeoLng(""); setGeoLanguage("en");
  };

  const getProgressInfo = (c: Campaign) => {
    const total = (c as any).total_rows || 0;
    const processed = (c as any).processed_rows || 0;
    const failed = (c as any).failed_rows || 0;
    const remaining = total - processed;
    const percent = total > 0 ? Math.round((processed / total) * 100) : 0;
    return { total, processed, failed, remaining, percent, generated: processed - failed };
  };

  const logEventIcon = (event: string) => {
    if (event === "started") return "🚀";
    if (event === "completed") return "✅";
    if (event.includes("error")) return "❌";
    if (event.includes("paused")) return "⏸️";
    if (event === "resumed") return "▶️";
    if (event.includes("batch")) return "📦";
    return "📝";
  };

  const canProceed = () => {
    if (step === 1) return !!campaignName;
    if (step === 2) return true; // type selection always valid
    if (step === 3) return csvData.length > 0;
    if (step === 4) return !!selectedTemplate;
    return true;
  };

  const totalSteps = campaignType === "seo" ? 5 : 6;

  const getWizardSteps = () => {
    const steps = [
      { num: 1, label: "Name" },
      { num: 2, label: "Type" },
      { num: 3, label: "CSV Data" },
      { num: 4, label: "Template" },
    ];
    if (campaignType === "sea") {
      steps.push({ num: 5, label: "UTM" });
    } else if (campaignType === "geo") {
      steps.push({ num: 5, label: "GEO" });
    }
    steps.push({ num: campaignType === "seo" ? 5 : 6, label: "Website" });
    return steps;
  };

  const wizardSteps = getWizardSteps();

  const { pagesUsed, pagesLimit } = useSubscription();

  const filteredCampaigns = useMemo(() => {
    let result = campaigns;
    if (typeFilter !== "all") {
      result = result.filter((c) => c.campaign_type === typeFilter);
    }
    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.templates?.name?.toLowerCase().includes(q) ||
        c.websites?.name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [campaigns, typeFilter, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      <UsageLimitBanner type="pages" used={pagesUsed} limit={pagesLimit} />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-display">Campaigns</h1>
          <p className="text-muted-foreground mt-1">Manage your page generation campaigns.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("card")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                viewMode === "card" ? "bg-card shadow-surface text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                viewMode === "table" ? "bg-card shadow-surface text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Table
            </button>
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-gradient-primary hover:brightness-110 transition-all duration-150 active:scale-[0.97] shadow-sm">
                <Plus className="mr-2 h-4 w-4" /> New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Campaign</DialogTitle>
                <DialogDescription>Follow the steps to set up your campaign.</DialogDescription>
              </DialogHeader>

              {/* Wizard Steps Indicator */}
              <div className="flex items-center justify-between mt-4 mb-6">
                {wizardSteps.map((s, i) => (
                  <div key={s.num} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200 ${
                          step >= s.num
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {step > s.num ? <Check className="h-4 w-4" /> : s.num}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1">{s.label}</span>
                    </div>
                    {i < wizardSteps.length - 1 && (
                      <div className={`h-0.5 w-8 sm:w-12 mx-1 rounded transition-colors duration-200 ${
                        step > s.num ? "bg-primary" : "bg-muted"
                      }`} />
                    )}
                  </div>
                ))}
              </div>

              {/* Step Content */}
              <div className="space-y-4 animate-fade-in">
                {step === 1 && (
                  <div>
                    <Label htmlFor="name" className="text-sm font-medium mb-2 block">Campaign Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Python Training Cities"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      className="rounded-xl h-11"
                    />
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium mb-2 block">Campaign Type</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: "seo" as const, label: "SEO", icon: SearchIconLucide, desc: "Organic search pages" },
                        { value: "sea" as const, label: "SEA", icon: Target, desc: "Paid landing pages" },
                        { value: "geo" as const, label: "GEO", icon: MapPin, desc: "Local / geo pages" },
                      ].map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setCampaignType(t.value)}
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                            campaignType === t.value
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-border hover:border-primary/30 hover:bg-muted/50"
                          }`}
                        >
                          <t.icon className={`h-6 w-6 ${campaignType === t.value ? "text-primary" : "text-muted-foreground"}`} />
                          <span className={`text-sm font-semibold ${campaignType === t.value ? "text-primary" : "text-foreground"}`}>{t.label}</span>
                          <span className="text-[10px] text-muted-foreground text-center">{t.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">CSV File</Label>
                    <div className="border-2 border-dashed rounded-2xl p-8 text-center hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 cursor-pointer">
                      <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" id="csv-upload" />
                      <label htmlFor="csv-upload" className="cursor-pointer">
                        <Upload className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
                        <p className="text-sm font-medium">
                          {csvFile ? csvFile.name : "Drop CSV file or click to upload"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {csvFile ? `${csvData.length} rows detected` : "Supports .csv files"}
                        </p>
                      </label>
                    </div>
                    {csvHeaders.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        <span className="text-xs text-muted-foreground">Columns:</span>
                        {csvHeaders.map((h) => (
                          <Badge key={h} variant="secondary" className="text-xs rounded-lg">{h}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Template</Label>
                      <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                        <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Select template" /></SelectTrigger>
                        <SelectContent>
                          {templates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {variableMapping && (
                      <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold">Variable Mapping</h4>
                          {variableMapping.matched.every((m) => m.column) ? (
                            <Badge variant="secondary" className="bg-success/10 text-success text-[10px] border-success/20 border">
                              <Check className="h-3 w-3 mr-1" /> All matched
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-destructive/10 text-destructive text-[10px] border-destructive/20 border">
                              <AlertTriangle className="h-3 w-3 mr-1" /> Unmatched
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          {variableMapping.matched.map(({ variable, column }) => (
                            <div key={variable} className="flex items-center gap-2 text-xs">
                              <Badge variant="outline" className="font-mono shrink-0 rounded-lg">{`{${variable}}`}</Badge>
                              <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                              {column ? (
                                <Badge variant="secondary" className="bg-success/10 text-success font-mono rounded-lg">
                                  <Check className="h-3 w-3 mr-1" /> {column}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-destructive/10 text-destructive font-mono rounded-lg">
                                  <X className="h-3 w-3 mr-1" /> No match
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {step === 5 && campaignType === "sea" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="h-4 w-4 text-primary" />
                      <Label className="text-sm font-semibold">UTM Parameters</Label>
                    </div>
                    <p className="text-xs text-muted-foreground -mt-2">
                      Use <code className="bg-muted px-1 py-0.5 rounded font-mono text-primary">{"{variable}"}</code> syntax to pull values from CSV columns.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">utm_source</Label>
                        <Input value={utmSource} onChange={(e) => setUtmSource(e.target.value)} placeholder="google" className="rounded-xl h-9 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">utm_medium</Label>
                        <Input value={utmMedium} onChange={(e) => setUtmMedium(e.target.value)} placeholder="cpc" className="rounded-xl h-9 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">utm_campaign</Label>
                        <Input value={utmCampaign} onChange={(e) => setUtmCampaign(e.target.value)} placeholder="{campaign_name}" className="rounded-xl h-9 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">utm_term</Label>
                        <Input value={utmTerm} onChange={(e) => setUtmTerm(e.target.value)} placeholder="{keyword}" className="rounded-xl h-9 text-sm" />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <Label className="text-xs">utm_content</Label>
                        <Input value={utmContent} onChange={(e) => setUtmContent(e.target.value)} placeholder="variant_a" className="rounded-xl h-9 text-sm" />
                      </div>
                    </div>
                  </div>
                )}

                {step === 5 && campaignType === "geo" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="h-4 w-4 text-primary" />
                      <Label className="text-sm font-semibold">Geographic Targeting</Label>
                    </div>
                    <p className="text-xs text-muted-foreground -mt-2">
                      Set default geo values. Use <code className="bg-muted px-1 py-0.5 rounded font-mono text-primary">{"{column}"}</code> to map from CSV.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Country</Label>
                        <Input value={geoCountry} onChange={(e) => setGeoCountry(e.target.value)} placeholder="{country} or US" className="rounded-xl h-9 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Region / State</Label>
                        <Input value={geoRegion} onChange={(e) => setGeoRegion(e.target.value)} placeholder="{region}" className="rounded-xl h-9 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">City</Label>
                        <Input value={geoCity} onChange={(e) => setGeoCity(e.target.value)} placeholder="{city}" className="rounded-xl h-9 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Postcode</Label>
                        <Input value={geoPostcode} onChange={(e) => setGeoPostcode(e.target.value)} placeholder="{postcode}" className="rounded-xl h-9 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Latitude</Label>
                        <Input value={geoLat} onChange={(e) => setGeoLat(e.target.value)} placeholder="{lat} or 48.8566" className="rounded-xl h-9 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Longitude</Label>
                        <Input value={geoLng} onChange={(e) => setGeoLng(e.target.value)} placeholder="{lng} or 2.3522" className="rounded-xl h-9 text-sm" />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <Label className="text-xs">Language</Label>
                        <Select value={geoLanguage} onValueChange={setGeoLanguage}>
                          <SelectTrigger className="rounded-xl h-9 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["en", "es", "fr", "de", "pt", "it", "nl", "ja", "zh", "ko", "ar"].map((l) => (
                              <SelectItem key={l} value={l}>{l.toUpperCase()}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {step === totalSteps && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Website (optional)</Label>
                    <Select value={selectedWebsite} onValueChange={setSelectedWebsite}>
                      <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Select website" /></SelectTrigger>
                      <SelectContent>
                        {websites.map((w) => (
                          <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-2">Optional — you can assign a website later.</p>
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-4 border-t mt-4">
                <Button
                  variant="outline"
                  onClick={() => step === 1 ? setOpen(false) : setStep(step - 1)}
                  className="rounded-xl"
                >
                  {step === 1 ? "Cancel" : "Back"}
                </Button>
                {step < totalSteps ? (
                  <Button
                    onClick={() => setStep(step + 1)}
                    disabled={!canProceed()}
                    className="rounded-xl bg-gradient-primary hover:brightness-110"
                  >
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => createMutation.mutate()}
                    disabled={!campaignName || createMutation.isPending}
                    className="rounded-xl bg-gradient-primary hover:brightness-110"
                  >
                    {createMutation.isPending ? "Creating..." : "Create Campaign"}
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Campaign List */}
      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-0 shadow-surface"><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <>
          {/* Search & Type Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <SearchIconLucide className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
              {(["all", "seo", "sea", "geo"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                    typeFilter === t
                      ? "bg-card shadow-surface text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "all" ? "All" : t.toUpperCase()}
                </button>
              ))}
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {!isLoading && campaigns.length > 0 && filteredCampaigns.length === 0 ? (
        <Card className="border-0 shadow-surface">
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <SearchIconLucide className="h-10 w-10 text-muted-foreground/40" />
              <h3 className="font-semibold">No matching campaigns</h3>
              <p className="text-muted-foreground text-sm">Try adjusting your search or filter.</p>
            </div>
          </CardContent>
        </Card>
      ) : filteredCampaigns.length === 0 && campaigns.length === 0 && !isLoading ? (
        <Card className="border-0 shadow-surface">
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                <Plus className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="font-semibold">No campaigns yet</h3>
              <p className="text-muted-foreground text-sm max-w-sm">Create your first campaign to start generating pages at scale.</p>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === "table" ? (
        /* TABLE VIEW */
        <Card className="border-0 shadow-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Campaign</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Pages</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Date</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.map((c, index) => {
                  const progress = getProgressInfo(c);
                  const isPaused = (c as any).is_paused === true || c.status === "queued" && progress.processed > 0;
                  const config = statusConfig[c.status] || statusConfig.draft;
                  return (
                    <tr key={c.id} className={`border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors ${index % 2 === 1 ? "bg-muted/10" : ""}`}>
                      <td className="py-3 px-4">
                        <div>
                          <span className="font-medium">{c.name}</span>
                          <div className="flex gap-2 mt-0.5 text-[11px] text-muted-foreground">
                            {c.templates?.name && <span>{c.templates.name}</span>}
                            {c.websites?.name && <span>• {c.websites.name}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="secondary" className={`${config.class} text-[11px] font-medium border`}>
                            {isPaused ? "Paused" : config.label}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] uppercase font-mono">
                            {(c as any).campaign_type || "seo"}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3 px-4 tabular-nums text-muted-foreground">{progress.generated}/{progress.total}</td>
                      <td className="py-3 px-4 tabular-nums text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-right">
                        <CampaignActions campaign={c} isPaused={isPaused} executeMutation={executeMutation} deleteMutation={deleteMutation} setLinkDialogCampaign={setLinkDialogCampaign} setLogDialogCampaign={setLogDialogCampaign} setJobDialogCampaign={setJobDialogCampaign} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* CARD VIEW */
        <div className="grid gap-4">
          {filteredCampaigns.map((c) => {
            const progress = getProgressInfo(c);
            const isProcessing = c.status === "processing";
            const isPaused = (c as any).is_paused === true || c.status === "queued" && progress.processed > 0;
            const startedAt = (c as any).generation_started_at;
            const completedAt = (c as any).generation_completed_at;
            const config = statusConfig[c.status] || statusConfig.draft;
            const latestJob = getLatestJob(c.id);

            return (
              <Card key={c.id} className="border-0 shadow-surface card-interactive overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-start justify-between p-5 gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="font-semibold truncate">{c.name}</h3>
                        <Badge variant="secondary" className={`${config.class} text-[11px] font-medium border shrink-0`}>
                          {isPaused ? "Paused" : config.label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] uppercase font-mono shrink-0">
                          {(c as any).campaign_type || "seo"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {c.templates?.name && (
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" /> {c.templates.name}
                          </span>
                        )}
                        {c.websites?.name && (
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" /> {c.websites.name}
                          </span>
                        )}
                        <span>{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <CampaignActions campaign={c} isPaused={isPaused} executeMutation={executeMutation} deleteMutation={deleteMutation} setLinkDialogCampaign={setLinkDialogCampaign} setLogDialogCampaign={setLogDialogCampaign} setJobDialogCampaign={setJobDialogCampaign} />
                  </div>

                  {progress.total > 0 && (
                    <div className="px-5 pb-5 space-y-2">
                      <Progress value={progress.percent} className="h-2" />
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex gap-4">
                          <span className="text-muted-foreground">
                            Generated: <span className="text-success font-medium tabular-nums">{progress.generated}</span>
                          </span>
                          <span className="text-muted-foreground">
                            Remaining: <span className="font-medium tabular-nums">{progress.remaining}</span>
                          </span>
                          {progress.failed > 0 && (
                            <span className="text-muted-foreground">
                              Failed: <span className="text-destructive font-medium tabular-nums">{progress.failed}</span>
                            </span>
                          )}
                        </div>
                        <span className="text-muted-foreground tabular-nums font-semibold">{progress.percent}%</span>
                      </div>
                      {(startedAt || completedAt) && (
                        <div className="flex gap-4 text-[11px] text-muted-foreground pt-1">
                          {startedAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> Started: {new Date(startedAt).toLocaleString()}
                            </span>
                          )}
                          {completedAt && (
                            <span className="flex items-center gap-1">
                              <Check className="h-3 w-3" /> Done: {new Date(completedAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}
                      {latestJob && (
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1 border-t border-border/50 mt-2 pt-2">
                          <span>Batch {latestJob.current_batch}/{Math.ceil(latestJob.total_rows / latestJob.batch_size)}</span>
                          <span className="text-success">{latestJob.success_count} ok</span>
                          {latestJob.error_count > 0 && <span className="text-destructive">{latestJob.error_count} errors</span>}
                          <Badge variant="outline" className="text-[9px] ml-auto capitalize">{latestJob.status}</Badge>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Campaign Logs Dialog */}
      <Dialog open={!!logDialogCampaign} onOpenChange={(v) => { if (!v) setLogDialogCampaign(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Campaign Logs</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px] mt-4">
            {campaignLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No logs yet for this campaign.</p>
            ) : (
              <div className="space-y-2">
                {campaignLogs.map((log: any) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl border border-border/50 bg-muted/20 text-sm">
                    <span className="text-base shrink-0 mt-0.5">{logEventIcon(log.event)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant="outline" className="text-[10px] font-mono rounded-lg">{log.event}</Badge>
                        {log.batch_number && (
                          <span className="text-[10px] text-muted-foreground">Batch #{log.batch_number}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{log.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {linkDialogCampaign && (
        <InternalLinkDialog
          campaignId={linkDialogCampaign.id}
          campaignName={linkDialogCampaign.name}
          templateVariables={
            (templates.find((t) => t.id === linkDialogCampaign.template_id)?.variables as string[]) || []
          }
          open={!!linkDialogCampaign}
          onOpenChange={(v) => { if (!v) setLinkDialogCampaign(null); }}
        />
      )}

      {jobDialogCampaign && (
        <GenerationJobDialog
          campaignId={jobDialogCampaign.id}
          campaignName={jobDialogCampaign.name}
          open={!!jobDialogCampaign}
          onOpenChange={(v) => { if (!v) setJobDialogCampaign(null); }}
        />
      )}
    </div>
  );
}

// Extracted actions component for reuse
function CampaignActions({
  campaign: c,
  isPaused,
  executeMutation,
  deleteMutation,
  setLinkDialogCampaign,
  setLogDialogCampaign,
  setJobDialogCampaign,
}: {
  campaign: any;
  isPaused: boolean;
  executeMutation: any;
  deleteMutation: any;
  setLinkDialogCampaign: (c: any) => void;
  setLogDialogCampaign: (id: string) => void;
  setJobDialogCampaign: (c: any) => void;
}) {
  const isProcessing = c.status === "processing";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg shrink-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {(c.status === "draft" || isPaused) && (
          <DropdownMenuItem
            onClick={() => executeMutation.mutate({ id: c.id, action: isPaused ? "resume" : undefined })}
            disabled={executeMutation.isPending}
          >
            {isPaused ? (
              <><RotateCcw className="h-4 w-4 mr-2" /> Resume</>
            ) : (
              <><Play className="h-4 w-4 mr-2" /> Execute</>
            )}
          </DropdownMenuItem>
        )}
        {isProcessing && !(c as any).is_paused && (
          <DropdownMenuItem onClick={() => executeMutation.mutate({ id: c.id, action: "pause" })}>
            <Pause className="h-4 w-4 mr-2" /> Pause
          </DropdownMenuItem>
        )}
        {c.status === "completed" && (
          <DropdownMenuItem onClick={() => setLinkDialogCampaign(c)}>
            <Link2 className="h-4 w-4 mr-2" /> Internal Links
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => setJobDialogCampaign(c)}>
          <Layers className="h-4 w-4 mr-2" /> View Jobs
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLogDialogCampaign(c.id)}>
          <FileText className="h-4 w-4 mr-2" /> View Logs
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => deleteMutation.mutate(c.id)} className="text-destructive focus:text-destructive">
          <Trash2 className="h-4 w-4 mr-2" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
