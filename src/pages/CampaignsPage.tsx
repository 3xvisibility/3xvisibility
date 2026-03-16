import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Upload, Play, ArrowRight, Trash2, Check, X, AlertTriangle, Link2 } from "lucide-react";
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Get the selected template's variables
  const selectedTemplateVars = useMemo(() => {
    if (!selectedTemplate) return [];
    const tpl = templates.find((t) => t.id === selectedTemplate);
    if (!tpl?.variables) return [];
    return (tpl.variables as string[]).map((v) => v.replace(/[{}]/g, ""));
  }, [selectedTemplate, templates]);

  // Auto-match CSV columns to template variables
  const variableMapping = useMemo(() => {
    if (selectedTemplateVars.length === 0 || csvHeaders.length === 0) return null;
    const matched: { variable: string; column: string | null }[] = [];
    for (const v of selectedTemplateVars) {
      const vLower = v.toLowerCase();
      const exactMatch = csvHeaders.find((h) => h.toLowerCase() === vLower);
      if (exactMatch) {
        matched.push({ variable: v, column: exactMatch });
      } else {
        // fuzzy: check if column contains variable or vice versa
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
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke("generate-pages", {
        body: { campaign_id: id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-page-count"] });
      toast({ title: "Pages generated", description: `${data.generated} pages created successfully.` });
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
              {/* Variable Mapping Preview */}
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
        <Card className="shadow-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium text-muted-foreground">Campaign</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Template</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Website</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Progress</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors duration-150">
                    <td className="p-4 font-medium">{c.name}</td>
                    <td className="p-4">
                      <Badge variant="secondary" className={statusColors[c.status]}>{c.status}</Badge>
                    </td>
                    <td className="p-4 text-muted-foreground">{c.templates?.name || "—"}</td>
                    <td className="p-4 text-muted-foreground">{c.websites?.name || "—"}</td>
                    <td className="p-4 tabular-nums">{c.processed_rows || 0}/{c.total_rows || 0}</td>
                    <td className="p-4 tabular-nums text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        {c.status === "draft" && (
                          <Button size="sm" variant="ghost" className="text-primary" disabled={executeMutation.isPending} onClick={() => executeMutation.mutate(c.id)}>
                            <Play className="h-3 w-3 mr-1" /> {executeMutation.isPending ? "Generating..." : "Execute"}
                          </Button>
                        )}
                        {c.status === "processing" && (
                          <span className="text-xs text-muted-foreground animate-pulse">Processing...</span>
                        )}
                        {c.status === "completed" && (
                          <>
                            <Button size="sm" variant="ghost" className="text-primary" onClick={() => setLinkDialogCampaign(c)} title="Internal Linking">
                              <Link2 className="h-3 w-3 mr-1" /> Links
                            </Button>
                            <Button size="sm" variant="ghost" className="text-muted-foreground">
                              <ArrowRight className="h-3 w-3 mr-1" /> View
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(c.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

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
