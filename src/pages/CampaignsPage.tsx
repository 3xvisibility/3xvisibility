import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
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
import { Plus, Upload, Play, ArrowRight, Trash2, Check, X, AlertTriangle, Link2, Pause, RotateCcw, Clock, FileText, Loader2, MoreHorizontal, Eye, MapPin, Target, Search as SearchIconLucide, Layers, CalendarIcon, Settings2, Copy } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvRawText, setCsvRawText] = useState<string>("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [campaignName, setCampaignName] = useState("");
  const [campaignType, setCampaignType] = useState<"seo" | "sea" | "geo">("seo");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedWebsite, setSelectedWebsite] = useState("");
  const [linkDialogCampaign, setLinkDialogCampaign] = useState<Campaign | null>(null);
  const [logDialogCampaign, setLogDialogCampaign] = useState<string | null>(null);
  const [jobDialogCampaign, setJobDialogCampaign] = useState<Campaign | null>(null);
  const [replaceCsvCampaignId, setReplaceCsvCampaignId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "seo" | "sea" | "geo">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "processing" | "completed" | "failed" | "queued">("all");
  // Generation settings
  const [publishMode, setPublishMode] = useState<"draft" | "published">("draft");
  const [maxRows, setMaxRows] = useState<string>("");
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
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
      // Store only a small sample inline for preview; full data goes to campaign_csv_files
      const sampleData = csvData.slice(0, 5);
      const { data: campaign, error } = await supabase.from("campaigns").insert({
        name: campaignName,
        campaign_type: campaignType,
        template_id: selectedTemplate || null,
        website_id: selectedWebsite || null,
        csv_data: sampleData as unknown as Database["public"]["Tables"]["campaigns"]["Insert"]["csv_data"],
        total_rows: maxRows ? Math.min(parseInt(maxRows), csvData.length) : csvData.length,
        user_id: user.id,
        workspace_id: wsId,
        utm_settings: utmSettings as any,
        geo_settings: geoSettings as any,
        publish_mode: publishMode,
        max_rows: maxRows ? parseInt(maxRows) : null,
        scheduled_at: scheduleMode === "later" && scheduledDate ? scheduledDate.toISOString() : null,
        status: scheduleMode === "later" && scheduledDate ? "queued" as any : "draft" as any,
      } as any).select("id").single();
      if (error) throw error;

      // Upload full CSV to dedicated table
      if (csvRawText && campaign) {
        await supabase.from("campaign_csv_files" as any).insert({
          campaign_id: campaign.id,
          workspace_id: wsId,
          user_id: user.id,
          file_name: csvFile?.name || "data.csv",
          file_size: csvRawText.length,
          raw_content: csvRawText,
          headers: csvHeaders as any,
          row_count: csvData.length,
        });
      }

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

  const duplicateMutation = useMutation({
    mutationFn: async (campaign: Campaign) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      if (!wsId) throw new Error("No workspace selected");

      const { data: newCampaign, error } = await supabase.from("campaigns").insert({
        name: `${campaign.name} (Copy)`,
        campaign_type: campaign.campaign_type,
        user_id: user.id,
        workspace_id: wsId,
        template_id: campaign.template_id,
        website_id: campaign.website_id,
        csv_data: campaign.csv_data,
        mapping: campaign.mapping,
        publish_mode: campaign.publish_mode,
        max_rows: campaign.max_rows,
        batch_size: campaign.batch_size,
        utm_settings: campaign.utm_settings,
        geo_settings: campaign.geo_settings,
        status: "draft" as const,
      }).select("id").single();
      if (error) throw error;

      // Duplicate CSV file if exists
      const { data: csvFile } = await supabase
        .from("campaign_csv_files")
        .select("*")
        .eq("campaign_id", campaign.id)
        .maybeSingle();
      if (csvFile && newCampaign) {
        await supabase.from("campaign_csv_files").insert({
          campaign_id: newCampaign.id,
          user_id: user.id,
          workspace_id: wsId,
          raw_content: csvFile.raw_content,
          headers: csvFile.headers,
          file_name: csvFile.file_name,
          file_size: csvFile.file_size,
          row_count: csvFile.row_count,
        });
      }

      // Duplicate mappings
      const { data: mappings } = await supabase
        .from("mappings")
        .select("*")
        .eq("campaign_id", campaign.id);
      if (mappings && mappings.length > 0 && newCampaign) {
        await supabase.from("mappings").insert(
          mappings.map((m) => ({
            campaign_id: newCampaign.id,
            workspace_id: wsId,
            user_id: user.id,
            source_column: m.source_column,
            target_field: m.target_field,
            field_category: m.field_category,
            sort_order: m.sort_order,
            is_required: m.is_required,
            transform_expression: m.transform_expression,
          }))
        );
      }

      return campaign.name;
    },
    onSuccess: (name) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({ title: "Campaign duplicated", description: `"${name}" has been cloned as a draft.` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const replaceCsvMutation = useMutation({
    mutationFn: async ({ campaignId, file }: { campaignId: string; file: File }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) throw new Error("CSV must have at least a header and one data row.");

      const firstLine = lines[0];
      let delimiter = ",";
      if (firstLine.includes("\t")) delimiter = "\t";
      else if (firstLine.split(";").length > firstLine.split(",").length) delimiter = ";";
      else if (firstLine.split("|").length > firstLine.split(",").length) delimiter = "|";

      const headers = firstLine.split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ""));
      const rows = lines.slice(1).map((line) => {
        const values = line.split(delimiter).map((v) => v.trim().replace(/^["']|["']$/g, ""));
        return headers.reduce((acc, h, i) => ({ ...acc, [h]: values[i] || "" }), {} as Record<string, string>);
      });

      const sampleData = rows.slice(0, 5);

      // Update campaign inline sample
      await supabase.from("campaigns").update({
        csv_data: sampleData as any,
        total_rows: rows.length,
        processed_rows: 0,
        failed_rows: 0,
      }).eq("id", campaignId);

      // Delete old csv file records, then insert new one
      await supabase.from("campaign_csv_files" as any).delete().eq("campaign_id", campaignId);
      await supabase.from("campaign_csv_files" as any).insert({
        campaign_id: campaignId,
        workspace_id: wsId,
        user_id: user.id,
        file_name: file.name,
        file_size: text.length,
        raw_content: text,
        headers: headers as any,
        row_count: rows.length,
      });

      // Update data_sources
      await supabase.from("data_sources").delete().eq("campaign_id", campaignId);
      await supabase.from("data_sources").insert({
        campaign_id: campaignId,
        workspace_id: wsId,
        user_id: user.id,
        type: "csv",
        file_name: file.name,
        file_size: file.size,
        row_count: rows.length,
        headers: headers as any,
      });

      return { fileName: file.name, rowCount: rows.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({ title: "CSV replaced", description: `"${data.fileName}" uploaded with ${data.rowCount} rows.` });
      setReplaceCsvCampaignId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error replacing CSV", description: err.message, variant: "destructive" });
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
      setCsvRawText(text);
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length === 0) return;

      // Auto-detect delimiter: try tab, semicolon, pipe, then comma
      const firstLine = lines[0];
      let delimiter = ",";
      if (firstLine.includes("\t")) delimiter = "\t";
      else if (firstLine.split(";").length > firstLine.split(",").length) delimiter = ";";
      else if (firstLine.split("|").length > firstLine.split(",").length) delimiter = "|";

      const headers = firstLine.split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ""));
      setCsvHeaders(headers);
      const rows = lines.slice(1).map((line) => {
        const values = line.split(delimiter).map((v) => v.trim().replace(/^["']|["']$/g, ""));
        return headers.reduce((acc, h, i) => ({ ...acc, [h]: values[i] || "" }), {} as Record<string, string>);
      });
      setCsvData(rows);
    };
    reader.readAsText(file, "utf-8");
  };

  const resetForm = () => {
    setOpen(false);
    setStep(1);
    setCampaignName("");
    setCampaignType("seo");
    setCsvRawText("");
    setCsvFile(null);
    setCsvHeaders([]);
    setCsvData([]);
    setSelectedTemplate("");
    setSelectedWebsite("");
    setPublishMode("draft");
    setMaxRows("");
    setScheduleMode("now");
    setScheduledDate(undefined);
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

  // Check required fields: at least title or h1 variable must be mapped
  const hasTitleMapping = useMemo(() => {
    if (!variableMapping) return true; // no mapping yet, allow proceeding
    const requiredVars = ["title", "name", "h1", "page_title"];
    return variableMapping.matched.some(
      (m) => m.column && requiredVars.includes(m.variable.toLowerCase())
    );
  }, [variableMapping]);

  const hasSlugSource = useMemo(() => {
    if (!variableMapping) return true;
    // Slug is auto-generated from title, so if title is mapped, slug is covered
    const slugVars = ["slug", "url", "handle"];
    const titleVars = ["title", "name", "h1", "page_title"];
    return variableMapping.matched.some(
      (m) => m.column && ([...slugVars, ...titleVars].includes(m.variable.toLowerCase()))
    );
  }, [variableMapping]);

  const mappingWarning = !hasTitleMapping && csvData.length > 0 && selectedTemplate
    ? "⚠️ No title/name variable is mapped. Pages may have generic titles."
    : null;

  const canProceed = () => {
    if (step === 1) return !!campaignName;
    if (step === 2) return true;
    if (step === 3) return csvData.length > 0;
    if (step === 4) return !!selectedTemplate;
    return true;
  };

  const getWizardSteps = () => {
    const steps = [
      { num: 1, label: "Name" },
      { num: 2, label: "Type" },
      { num: 3, label: "CSV Data" },
      { num: 4, label: "Template" },
    ];
    let nextNum = 5;
    if (campaignType === "sea") {
      steps.push({ num: nextNum++, label: "UTM" });
    } else if (campaignType === "geo") {
      steps.push({ num: nextNum++, label: "GEO" });
    }
    steps.push({ num: nextNum++, label: "Website" });
    steps.push({ num: nextNum++, label: "Settings" });
    return steps;
  };

  const totalSteps = getWizardSteps().length;

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
            <DialogContent className="sm:max-w-[540px] p-0 gap-0 overflow-hidden">
              <div className="px-6 pt-6 pb-0">
                <DialogHeader className="pb-0">
                  <DialogTitle className="text-lg font-bold">Create Campaign</DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">Follow the steps to set up your campaign.</DialogDescription>
                </DialogHeader>
              </div>

              {/* Wizard Steps Indicator */}
              <div className="px-6 pt-5 pb-2">
                <div className="flex items-start justify-between">
                  {wizardSteps.map((s, i) => (
                    <div key={s.num} className="flex items-center flex-1 last:flex-none">
                      <div className="flex flex-col items-center min-w-[40px]">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ring-2 ring-offset-2 ring-offset-background ${
                            step > s.num
                              ? "bg-primary text-primary-foreground ring-primary"
                              : step === s.num
                                ? "bg-primary text-primary-foreground ring-primary shadow-sm"
                                : "bg-muted text-muted-foreground ring-border"
                          }`}
                        >
                          {step > s.num ? <Check className="h-3.5 w-3.5" /> : s.num}
                        </div>
                        <span className={`text-[10px] mt-1.5 font-medium transition-colors ${
                          step >= s.num ? "text-foreground" : "text-muted-foreground"
                        }`}>{s.label}</span>
                      </div>
                      {i < wizardSteps.length - 1 && (
                        <div className="flex-1 flex items-center px-1 -mt-3.5">
                          <div className={`h-[2px] w-full rounded-full transition-colors duration-300 ${
                            step > s.num ? "bg-primary" : "bg-border"
                          }`} style={{ backgroundImage: step <= s.num ? 'repeating-linear-gradient(90deg, hsl(var(--border)) 0px, hsl(var(--border)) 4px, transparent 4px, transparent 8px)' : 'none', backgroundColor: step > s.num ? undefined : 'transparent' }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Step Content */}
              <div className="px-6 py-4 min-h-[180px]">
                <div className="space-y-4 animate-fade-in">
                  {step === 1 && (
                    <div>
                      <Label htmlFor="name" className="text-sm font-semibold mb-2.5 block">Campaign Name</Label>
                      <Input
                        id="name"
                        placeholder="e.g., Python Training Cities"
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                        className="rounded-xl h-11 text-sm"
                      />
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold mb-2 block">Campaign Type</Label>
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
                      <Label className="text-sm font-semibold mb-2.5 block">CSV File</Label>
                      <div className="border-2 border-dashed rounded-2xl p-8 text-center hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 cursor-pointer">
                        <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" id="csv-upload" />
                        <label htmlFor="csv-upload" className="cursor-pointer">
                          <Upload className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
                          <p className="text-sm font-medium">
                            {csvFile ? csvFile.name : "Drop CSV file or click to upload"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {csvFile
                              ? `${csvData.length} rows · ${csvFile.size < 1024 ? csvFile.size + " B" : csvFile.size < 1048576 ? (csvFile.size / 1024).toFixed(1) + " KB" : (csvFile.size / 1048576).toFixed(1) + " MB"}`
                              : "Supports .csv files up to 20 MB"}
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
                        <Label className="text-sm font-semibold mb-2.5 block">Template</Label>
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
                          {mappingWarning && (
                            <div className="flex items-center gap-2 text-xs text-warning bg-warning/10 border border-warning/20 rounded-lg px-3 py-2">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              <span>{mappingWarning}</span>
                            </div>
                          )}
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

                  {step === totalSteps - 1 && (
                    <div>
                      <Label className="text-sm font-semibold mb-2.5 block">Website (optional)</Label>
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

                  {step === totalSteps && (
                    <div className="space-y-5">
                      <div className="flex items-center gap-2 mb-1">
                        <Settings2 className="h-4 w-4 text-primary" />
                        <Label className="text-sm font-semibold">Generation Settings</Label>
                      </div>

                      {/* Publish Mode */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Publish Mode</Label>
                        <RadioGroup value={publishMode} onValueChange={(v) => setPublishMode(v as "draft" | "published")} className="flex gap-4">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="draft" id="mode-draft" />
                            <Label htmlFor="mode-draft" className="text-sm cursor-pointer">Draft</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="published" id="mode-published" />
                            <Label htmlFor="mode-published" className="text-sm cursor-pointer">Published</Label>
                          </div>
                        </RadioGroup>
                        <p className="text-[11px] text-muted-foreground">
                          {publishMode === "draft" ? "Pages will be saved as drafts for review before publishing." : "Pages will be published immediately to the connected site."}
                        </p>
                      </div>

                      {/* Max Rows */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Max Rows to Process</Label>
                        <Input
                          type="number"
                          min="1"
                          value={maxRows}
                          onChange={(e) => setMaxRows(e.target.value)}
                          placeholder={`All (${csvData.length || "—"} rows)`}
                          className="rounded-xl h-9 text-sm w-48"
                        />
                        <p className="text-[11px] text-muted-foreground">Leave empty to process all rows.</p>
                      </div>

                      {/* Schedule */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Schedule</Label>
                        <RadioGroup value={scheduleMode} onValueChange={(v) => setScheduleMode(v as "now" | "later")} className="flex gap-4">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="now" id="sched-now" />
                            <Label htmlFor="sched-now" className="text-sm cursor-pointer">Run now</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="later" id="sched-later" />
                            <Label htmlFor="sched-later" className="text-sm cursor-pointer">Schedule later</Label>
                          </div>
                        </RadioGroup>
                        {scheduleMode === "later" && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-60 justify-start text-left font-normal rounded-xl h-9 text-sm mt-1",
                                  !scheduledDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {scheduledDate ? format(scheduledDate, "PPP 'at' HH:mm") : "Pick a date & time"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={scheduledDate}
                                onSelect={setScheduledDate}
                                disabled={(date) => date < new Date()}
                                initialFocus
                                className={cn("p-3 pointer-events-auto")}
                              />
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>

                      {/* Summary */}
                      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-1.5 text-xs">
                        <h4 className="text-sm font-semibold mb-2">Summary</h4>
                        <div className="flex justify-between"><span className="text-muted-foreground">Rows</span><span className="font-medium">{maxRows ? `${maxRows} / ${csvData.length}` : `${csvData.length || "—"} (all)`}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Site</span><span className="font-medium">{websites.find(w => w.id === selectedWebsite)?.name || "None"}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Template</span><span className="font-medium">{templates.find(t => t.id === selectedTemplate)?.name || "None"}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium uppercase">{campaignType}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Publish</span><span className="font-medium capitalize">{publishMode}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Schedule</span><span className="font-medium">{scheduleMode === "now" ? "Immediately" : scheduledDate ? format(scheduledDate, "PPP") : "Not set"}</span></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between px-6 py-4 border-t border-border bg-muted/30">
                <Button
                  variant="outline"
                  onClick={() => step === 1 ? setOpen(false) : setStep(step - 1)}
                  className="rounded-xl h-10 px-5"
                >
                  {step === 1 ? "Cancel" : "Back"}
                </Button>
                {step < totalSteps ? (
                  <Button
                    onClick={() => setStep(step + 1)}
                    disabled={!canProceed()}
                    className="rounded-xl h-10 px-5 bg-gradient-primary hover:brightness-110"
                  >
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => createMutation.mutate()}
                    disabled={!campaignName || createMutation.isPending}
                    className="rounded-xl h-10 px-5 bg-gradient-primary hover:brightness-110"
                  >
                    {createMutation.isPending ? "Creating..." : scheduleMode === "later" ? "Schedule Campaign" : "Create Campaign"}
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
                          <span className="font-medium cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/campaigns/${c.id}`)}>{c.name}</span>
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
                        <CampaignActions campaign={c} isPaused={isPaused} executeMutation={executeMutation} deleteMutation={deleteMutation} duplicateMutation={duplicateMutation} setLinkDialogCampaign={setLinkDialogCampaign} setLogDialogCampaign={setLogDialogCampaign} setJobDialogCampaign={setJobDialogCampaign} onReplaceCsv={(id) => { setReplaceCsvCampaignId(id); document.getElementById("replace-csv-input")?.click(); }} />
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
                        <h3 className="font-semibold truncate cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/campaigns/${c.id}`)}>{c.name}</h3>
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
                    <CampaignActions campaign={c} isPaused={isPaused} executeMutation={executeMutation} deleteMutation={deleteMutation} duplicateMutation={duplicateMutation} setLinkDialogCampaign={setLinkDialogCampaign} setLogDialogCampaign={setLogDialogCampaign} setJobDialogCampaign={setJobDialogCampaign} onReplaceCsv={(id) => { setReplaceCsvCampaignId(id); document.getElementById("replace-csv-input")?.click(); }} />
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

      {/* Hidden file input for CSV replacement */}
      <input
        type="file"
        accept=".csv"
        className="hidden"
        id="replace-csv-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && replaceCsvCampaignId) {
            replaceCsvMutation.mutate({ campaignId: replaceCsvCampaignId, file });
          }
          e.target.value = "";
        }}
      />

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
  duplicateMutation,
  setLinkDialogCampaign,
  setLogDialogCampaign,
  setJobDialogCampaign,
  onReplaceCsv,
}: {
  campaign: any;
  isPaused: boolean;
  executeMutation: any;
  deleteMutation: any;
  duplicateMutation: any;
  setLinkDialogCampaign: (c: any) => void;
  setLogDialogCampaign: (id: string) => void;
  setJobDialogCampaign: (c: any) => void;
  onReplaceCsv?: (campaignId: string) => void;
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
        {c.status === "draft" && onReplaceCsv && (
          <DropdownMenuItem onClick={() => onReplaceCsv(c.id)}>
            <Upload className="h-4 w-4 mr-2" /> Replace CSV
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
        <DropdownMenuItem onClick={() => duplicateMutation.mutate(c)} disabled={duplicateMutation.isPending}>
          <Copy className="h-4 w-4 mr-2" /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => deleteMutation.mutate(c.id)} className="text-destructive focus:text-destructive">
          <Trash2 className="h-4 w-4 mr-2" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
