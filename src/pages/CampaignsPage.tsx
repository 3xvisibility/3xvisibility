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
import { Plus, Upload, Play, ArrowRight, Trash2, Check, X, AlertTriangle, Link2, Pause, RotateCcw, Clock, FileText, Loader2, MoreHorizontal, Eye, MapPin, Target, Search as SearchIconLucide } from "lucide-react";
import { InternalLinkDialog } from "@/components/campaigns/InternalLinkDialog";
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
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedWebsite, setSelectedWebsite] = useState("");
  const [linkDialogCampaign, setLinkDialogCampaign] = useState<Campaign | null>(null);
  const [logDialogCampaign, setLogDialogCampaign] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
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
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

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
      const { error } = await supabase.from("campaigns").insert({
        name: campaignName,
        template_id: selectedTemplate || null,
        website_id: selectedWebsite || null,
        csv_data: csvData as unknown as Database["public"]["Tables"]["campaigns"]["Insert"]["csv_data"],
        total_rows: csvData.length,
        user_id: user.id,
        workspace_id: wsId,
      });
      if (error) throw error;
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
    setCsvFile(null);
    setCsvHeaders([]);
    setCsvData([]);
    setSelectedTemplate("");
    setSelectedWebsite("");
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
    if (step === 2) return csvData.length > 0;
    if (step === 3) return !!selectedTemplate;
    return true;
  };

  const wizardSteps = [
    { num: 1, label: "Name" },
    { num: 2, label: "CSV Data" },
    { num: 3, label: "Template" },
    { num: 4, label: "Website" },
  ];

  const { pagesUsed, pagesLimit } = useSubscription();

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

                {step === 3 && (
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

                {step === 4 && (
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
                {step < 4 ? (
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
      ) : campaigns.length === 0 ? (
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
                {campaigns.map((c, index) => {
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
                        <Badge variant="secondary" className={`${config.class} text-[11px] font-medium border`}>
                          {isPaused ? "Paused" : config.label}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 tabular-nums text-muted-foreground">{progress.generated}/{progress.total}</td>
                      <td className="py-3 px-4 tabular-nums text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-right">
                        <CampaignActions campaign={c} isPaused={isPaused} executeMutation={executeMutation} deleteMutation={deleteMutation} setLinkDialogCampaign={setLinkDialogCampaign} setLogDialogCampaign={setLogDialogCampaign} />
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
          {campaigns.map((c) => {
            const progress = getProgressInfo(c);
            const isProcessing = c.status === "processing";
            const isPaused = (c as any).is_paused === true || c.status === "queued" && progress.processed > 0;
            const startedAt = (c as any).generation_started_at;
            const completedAt = (c as any).generation_completed_at;
            const config = statusConfig[c.status] || statusConfig.draft;

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
                    <CampaignActions campaign={c} isPaused={isPaused} executeMutation={executeMutation} deleteMutation={deleteMutation} setLinkDialogCampaign={setLinkDialogCampaign} setLogDialogCampaign={setLogDialogCampaign} />
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
}: {
  campaign: any;
  isPaused: boolean;
  executeMutation: any;
  deleteMutation: any;
  setLinkDialogCampaign: (c: any) => void;
  setLogDialogCampaign: (id: string) => void;
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
