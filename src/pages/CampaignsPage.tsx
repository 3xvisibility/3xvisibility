import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Upload, Play, ArrowRight, Trash2, Check, X, AlertTriangle, Link2, Pause, RotateCcw, Clock, FileText, Loader2 } from "lucide-react";
import { InternalLinkDialog } from "@/components/campaigns/InternalLinkDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, Database } from "@/integrations/supabase/types";

type Campaign = Tables<"campaigns"> & {
  templates?: { name: string } | null;
  websites?: { name: string } | null;
};

const statusColors: Record<string, string> = {
  completed: "bg-success/10 text-success",
  processing: "bg-primary/10 text-primary",
  draft: "bg-muted text-muted-foreground",
  failed: "bg-destructive/10 text-destructive",
  queued: "bg-accent text-accent-foreground",
};

export default function CampaignsPage() {
  const [open, setOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [campaignName, setCampaignName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedWebsite, setSelectedWebsite] = useState("");
  const [linkDialogCampaign, setLinkDialogCampaign] = useState<Campaign | null>(null);
  const [logDialogCampaign, setLogDialogCampaign] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Realtime subscription for campaign progress
  useEffect(() => {
    const channel = supabase
      .channel("campaign-progress")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "campaigns" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["campaigns"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*, templates(name), websites(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Campaign[];
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("templates").select("id, name, variables").order("name");
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
    const unmatchedColumns = csvHeaders.filter(
      (h) => !matched.some((m) => m.column === h)
    );
    return { matched, unmatchedColumns };
  }, [selectedTemplateVars, csvHeaders]);

  const { data: websites = [] } = useQuery({
    queryKey: ["websites"],
    queryFn: async () => {
      const { data, error } = await supabase.from("websites").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Campaign logs query
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
      const { error } = await supabase.from("campaigns").insert({
        name: campaignName,
        template_id: selectedTemplate || null,
        website_id: selectedWebsite || null,
        csv_data: csvData as unknown as Database["public"]["Tables"]["campaigns"]["Insert"]["csv_data"],
        total_rows: csvData.length,
        user_id: user.id,
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

      // Auto-build internal links
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display">Campaigns</h1>
          <p className="text-muted-foreground mt-1">Manage your page generation campaigns.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="transition-all duration-150 hover:brightness-110 active:scale-[0.97]">
              <Plus className="mr-2 h-4 w-4" /> New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Campaign</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="name">Campaign Name</Label>
                <Input id="name" placeholder="e.g., Python Training Cities" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
              </div>
              {variableMapping && (
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold">Variable Mapping</h4>
                    {variableMapping.matched.every((m) => m.column) ? (
                      <Badge variant="secondary" className="bg-success/10 text-success text-xs">
                        <Check className="h-3 w-3 mr-1" /> All matched
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-destructive/10 text-destructive text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" /> Unmatched variables
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {variableMapping.matched.map(({ variable, column }) => (
                      <div key={variable} className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="font-mono shrink-0">{`{${variable}}`}</Badge>
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        {column ? (
                          <Badge variant="secondary" className="bg-success/10 text-success font-mono">
                            <Check className="h-3 w-3 mr-1" /> {column}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-destructive/10 text-destructive font-mono">
                            <X className="h-3 w-3 mr-1" /> No match
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                  {variableMapping.unmatchedColumns.length > 0 && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-1.5">Extra CSV columns (unused):</p>
                      <div className="flex flex-wrap gap-1">
                        {variableMapping.unmatchedColumns.map((c) => (
                          <Badge key={c} variant="outline" className="text-xs font-mono text-muted-foreground">{c}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div>
                <Label>Template</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>CSV File</Label>
                <div className="mt-1 border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 hover:bg-primary/5 transition-colors duration-150 cursor-pointer">
                  <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" id="csv-upload" />
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {csvFile ? `${csvFile.name} (${csvData.length} rows)` : "Drop CSV file or click to upload"}
                    </p>
                  </label>
                </div>
                {csvHeaders.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="text-xs text-muted-foreground">Detected columns:</span>
                    {csvHeaders.map((h) => (
                      <Badge key={h} variant="secondary" className="text-xs">{h}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label>Website</Label>
                <Select value={selectedWebsite} onValueChange={setSelectedWebsite}>
                  <SelectTrigger><SelectValue placeholder="Select website" /></SelectTrigger>
                  <SelectContent>
                    {websites.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={() => createMutation.mutate()} disabled={!campaignName || createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Campaign"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Card className="shadow-surface"><CardContent className="p-4 space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</CardContent></Card>
      ) : campaigns.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">No campaigns yet. Create your first campaign to start generating pages.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {campaigns.map((c) => {
            const progress = getProgressInfo(c);
            const isProcessing = c.status === "processing";
            const isPaused = (c as any).is_paused === true || c.status === "queued" && progress.processed > 0;
            const startedAt = (c as any).generation_started_at;
            const completedAt = (c as any).generation_completed_at;

            return (
              <Card key={c.id} className="shadow-surface overflow-hidden">
                <CardContent className="p-0">
                  {/* Header row */}
                  <div className="flex items-start justify-between p-4 gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm truncate">{c.name}</h3>
                        <Badge variant="secondary" className={statusColors[c.status]}>
                          {isPaused ? "paused" : c.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {c.templates?.name && <span>Template: {c.templates.name}</span>}
                        {c.websites?.name && <span>Site: {c.websites.name}</span>}
                        <span>{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {/* Execute / Resume */}
                      {(c.status === "draft" || isPaused) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-primary"
                          disabled={executeMutation.isPending}
                          onClick={() =>
                            executeMutation.mutate({
                              id: c.id,
                              action: isPaused ? "resume" : undefined,
                            })
                          }
                        >
                          {isPaused ? (
                            <><RotateCcw className="h-3 w-3 mr-1" /> Resume</>
                          ) : executeMutation.isPending ? (
                            <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Starting...</>
                          ) : (
                            <><Play className="h-3 w-3 mr-1" /> Execute</>
                          )}
                        </Button>
                      )}
                      {/* Pause */}
                      {isProcessing && !(c as any).is_paused && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground"
                          onClick={() => executeMutation.mutate({ id: c.id, action: "pause" })}
                        >
                          <Pause className="h-3 w-3 mr-1" /> Pause
                        </Button>
                      )}
                      {/* Links */}
                      {c.status === "completed" && (
                        <Button size="sm" variant="ghost" className="text-primary" onClick={() => setLinkDialogCampaign(c)} title="Internal Linking">
                          <Link2 className="h-3 w-3 mr-1" /> Links
                        </Button>
                      )}
                      {/* Logs */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground"
                        onClick={() => setLogDialogCampaign(c.id)}
                      >
                        <FileText className="h-3 w-3 mr-1" /> Logs
                      </Button>
                      {/* Delete */}
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(c.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress section - shown when has rows */}
                  {progress.total > 0 && (
                    <div className="px-4 pb-4 space-y-2">
                      <Progress value={progress.percent} className="h-2" />
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex gap-4">
                          <span className="text-muted-foreground">
                            Total: <span className="text-foreground font-medium tabular-nums">{progress.total}</span>
                          </span>
                          <span className="text-muted-foreground">
                            Generated: <span className="text-success font-medium tabular-nums">{progress.generated}</span>
                          </span>
                          <span className="text-muted-foreground">
                            Remaining: <span className="text-foreground font-medium tabular-nums">{progress.remaining}</span>
                          </span>
                          {progress.failed > 0 && (
                            <span className="text-muted-foreground">
                              Failed: <span className="text-destructive font-medium tabular-nums">{progress.failed}</span>
                            </span>
                          )}
                        </div>
                        <span className="text-muted-foreground tabular-nums font-medium">{progress.percent}%</span>
                      </div>
                      {/* Timing info */}
                      {(startedAt || completedAt) && (
                        <div className="flex gap-4 text-[11px] text-muted-foreground pt-1">
                          {startedAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Started: {new Date(startedAt).toLocaleString()}
                            </span>
                          )}
                          {completedAt && (
                            <span className="flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              Completed: {new Date(completedAt).toLocaleString()}
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
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-muted/20 text-sm">
                    <span className="text-base shrink-0 mt-0.5">{logEventIcon(log.event)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant="outline" className="text-[10px] font-mono">{log.event}</Badge>
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

      {/* Internal Linking Dialog */}
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
