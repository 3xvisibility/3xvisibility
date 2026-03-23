import { useState, useMemo, useEffect, useCallback } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { friendlyError } from "@/lib/friendly-errors";
import { logAudit } from "@/lib/audit";
import { ALL_COUNTRIES } from "@/lib/countries";
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
import { Plus, Upload, Play, ArrowRight, Trash2, Check, X, AlertTriangle, Link2, Pause, RotateCcw, Clock, FileText, Loader2, MoreHorizontal, Eye, MapPin, Target, Search as SearchIconLucide, Layers, CalendarIcon, Settings2, Copy, GripVertical, Globe, CheckSquare, Database as DatabaseIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { InternalLinkDialog } from "@/components/campaigns/InternalLinkDialog";
import { LocationDatabaseDialog } from "@/components/campaigns/LocationDatabaseDialog";
import { GenerationJobDialog } from "@/components/campaigns/GenerationJobDialog";
import { TestPagePreviewDialog } from "@/components/campaigns/TestPagePreviewDialog";
import { MappingStep } from "@/components/campaigns/MappingStep";
import { renderPage, type RenderResult, type TemplateConfig, type RenderContext } from "@/lib/renderer";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, Database } from "@/integrations/supabase/types";
import { useSubscription } from "@/hooks/use-subscription";
import { UsageLimitBanner } from "@/components/UpgradePrompt";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useDragReorder } from "@/hooks/use-drag-reorder";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvRawText, setCsvRawText] = useState<string>("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [campaignName, setCampaignName] = useState("");
  const [campaignLanguage, setCampaignLanguage] = useState("en");
  const [campaignCountry, setCampaignCountry] = useState("US");
  const [campaignTypes, setCampaignTypes] = useState<("seo" | "sea" | "geo")[]>(["seo"]);
  const campaignType = campaignTypes[0] || "seo";
  const toggleCampaignType = (val: "seo" | "sea" | "geo") => {
    setCampaignTypes(prev => {
      if (prev.includes(val)) {
        if (prev.length === 1) return prev; // must keep at least one
        return prev.filter(t => t !== val);
      }
      return [...prev, val];
    });
  };
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedWebsite, setSelectedWebsite] = useState("");
  const [linkDialogCampaign, setLinkDialogCampaign] = useState<Campaign | null>(null);
  const [logDialogCampaign, setLogDialogCampaign] = useState<string | null>(null);
  const [jobDialogCampaign, setJobDialogCampaign] = useState<Campaign | null>(null);
  const [replaceCsvCampaignId, setReplaceCsvCampaignId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDraggingCsv, setIsDraggingCsv] = useState(false);
  const [dataSource, setDataSource] = useState<"csv" | "website" | "locations">("csv");
  const [locationData, setLocationData] = useState<Record<string, string>[]>([]);
  const [locationDbOpen, setLocationDbOpen] = useState(false);
  const [websiteForPages, setWebsiteForPages] = useState("");
  const [websiteContentType, setWebsiteContentType] = useState<"pages" | "products" | "all">("all");
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set());
  const [websitePagesSearch, setWebsitePagesSearch] = useState("");
  const [manualMappings, setManualMappings] = useState<Record<string, string>>({});
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [transforms, setTransforms] = useState<Record<string, string>>({});
  const [targetFieldMappings, setTargetFieldMappings] = useState<Record<string, string>>({});
  const [typeFilter, setTypeFilter] = useState<"all" | "seo" | "sea" | "geo">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "processing" | "completed" | "failed" | "queued">("all");
  // Generation settings
  const [publishMode, setPublishMode] = useState<"draft" | "published">("draft");
  const [maxRows, setMaxRows] = useState<string>("");
  const [generationMethod, setGenerationMethod] = useState<"all" | "sequential" | "random">("all");
  const [scheduleMode, setScheduleMode] = useState<"now" | "later" | "recurring">("now");
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [recurringInterval, setRecurringInterval] = useState<"daily" | "weekly" | "biweekly" | "monthly">("weekly");
  const [seoTitleFormat, setSeoTitleFormat] = useState<string>("{title} | {brand}");
  const [recurringEndDate, setRecurringEndDate] = useState<Date | undefined>(undefined);
  // UTM fields
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [utmTerm, setUtmTerm] = useState("");
  const [utmContent, setUtmContent] = useState("");
  // SEA fields
  const [adCampaignId, setAdCampaignId] = useState("");
  const [adGroupId, setAdGroupId] = useState("");
  const [seaDirectoryLevels, setSeaDirectoryLevels] = useState("");
  // GEO fields
  const [geoCountry, setGeoCountry] = useState("{country}");
  const [geoRegion, setGeoRegion] = useState("{region}");
  const [geoCity, setGeoCity] = useState("{city}");
  const [geoPostcode, setGeoPostcode] = useState("{zip_code}");
  const [geoLat, setGeoLat] = useState("{latitude}");
  const [geoLng, setGeoLng] = useState("{longitude}");
  const [geoLanguage, setGeoLanguage] = useState("en");
  const [testPreviewOpen, setTestPreviewOpen] = useState(false);
  const [testPreviewResult, setTestPreviewResult] = useState<RenderResult | null>(null);
  const [testGenerating, setTestGenerating] = useState(false);
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
      const { data, error } = await supabase.from("templates").select("id, name, variables, content, seo_title_pattern, seo_description_pattern, schema_type, schema_config").eq("workspace_id", wsId!).order("name");
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

  // variableMapping moved below websitePagesAsCsv

  const { data: websites = [] } = useQuery({
    queryKey: ["websites", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase.from("websites").select("id, name, type").eq("workspace_id", wsId!).order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch website content (pages + products) for import
  const { data: websitePages = [], isLoading: loadingWebPages } = useQuery({
    queryKey: ["site-content-for-campaign", websiteForPages, websiteContentType],
    enabled: !!websiteForPages && dataSource === "website",
    queryFn: async () => {
      type ContentItem = { id: string; title: string; slug: string; url: string; type: string; status: string; content: string; excerpt: string; modified: string };
      if (websiteContentType === "all") {
        const [pagesRes, productsRes] = await Promise.all([
          supabase.functions.invoke("fetch-site-content", { body: { website_id: websiteForPages, content_type: "pages" } }),
          supabase.functions.invoke("fetch-site-content", { body: { website_id: websiteForPages, content_type: "products" } }),
        ]);
        const pages = (pagesRes.data?.items || []) as ContentItem[];
        const products = (productsRes.data?.items || []) as ContentItem[];
        return [...pages, ...products];
      }
      const { data, error } = await supabase.functions.invoke("fetch-site-content", {
        body: { website_id: websiteForPages, content_type: websiteContentType },
      });
      if (error) throw error;
      if (data?.error) throw new Error(friendlyError(data.error));
      return (data.items || []) as ContentItem[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const filteredWebPages = useMemo(() => {
    if (!websitePagesSearch) return websitePages;
    const q = websitePagesSearch.toLowerCase();
    return websitePages.filter((p: any) => p.title?.toLowerCase().includes(q) || p.slug?.toLowerCase().includes(q));
  }, [websitePages, websitePagesSearch]);

  // Convert selected website pages/products to CSV-like data
  const websitePagesAsCsv = useMemo(() => {
    if (dataSource !== "website" || selectedPageIds.size === 0) return { headers: [] as string[], rows: [] as Record<string, string>[] };
    const selected = websitePages.filter((p: any) => selectedPageIds.has(p.id));
    const headers = ["title", "slug", "url", "type", "status", "excerpt"];
    const rows = selected.map((p: any) => ({
      title: p.title || "",
      slug: p.slug || "",
      url: p.url || "",
      type: p.type || "page",
      status: p.status || "",
      excerpt: (p.excerpt || "").replace(/<[^>]*>/g, "").slice(0, 500),
    }));
    return { headers, rows };
  }, [dataSource, selectedPageIds, websitePages]);

  const locationHeaders = ["city", "county", "state", "state_code", "zip_code", "country", "latitude", "longitude", "population", "timezone", "region"];
  const variableMapping = useMemo(() => {
    const headers = dataSource === "website" ? websitePagesAsCsv.headers : dataSource === "locations" ? locationHeaders : csvHeaders;
    if (selectedTemplateVars.length === 0 || headers.length === 0) return null;
    const matched: { variable: string; column: string | null; customValue?: string }[] = [];
    for (const v of selectedTemplateVars) {
      // Custom value takes priority
      if (customValues[v] !== undefined && customValues[v] !== "") {
        matched.push({ variable: v, column: null, customValue: customValues[v] });
        continue;
      }
      // Check manual override first
      if (manualMappings[v] && headers.includes(manualMappings[v])) {
        matched.push({ variable: v, column: manualMappings[v] });
        continue;
      }
      const vLower = v.toLowerCase();
      const exactMatch = headers.find((h) => h.toLowerCase() === vLower);
      if (exactMatch) {
        matched.push({ variable: v, column: exactMatch });
      } else {
        const fuzzy = headers.find(
          (h) => h.toLowerCase().includes(vLower) || vLower.includes(h.toLowerCase())
        );
        matched.push({ variable: v, column: fuzzy || null });
      }
    }
    const unmatchedColumns = headers.filter((h) => !matched.some((m) => m.column === h));
    return { matched, unmatchedColumns };
  }, [selectedTemplateVars, csvHeaders, dataSource, websitePagesAsCsv.headers, manualMappings, customValues]);

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
      const utmSettings = campaignTypes.includes("sea") ? {
        utm_source: utmSource, utm_medium: utmMedium, utm_campaign: utmCampaign,
        utm_term: utmTerm, utm_content: utmContent,
        ad_campaign_id: adCampaignId || null, ad_group_id: adGroupId || null,
      } : null;
      const geoSettings = campaignTypes.includes("geo") ? {
        country: geoCountry, region: geoRegion, city: geoCity,
        postcode: geoPostcode, lat: geoLat ? parseFloat(geoLat) : null,
        lng: geoLng ? parseFloat(geoLng) : null, language: geoLanguage,
      } : null;
      const dirStructure = campaignTypes.includes("sea") && seaDirectoryLevels
        ? { levels: seaDirectoryLevels.split(",").map(s => s.trim()).filter(Boolean), separator: "/" }
        : null;
      // Resolve effective data based on data source
      const effectiveData = dataSource === "website" ? websitePagesAsCsv.rows : dataSource === "locations" ? locationData : csvData;
      const effectiveHeaders = dataSource === "website" ? websitePagesAsCsv.headers : dataSource === "locations" ? locationHeaders : csvHeaders;
      const effectiveRowCount = effectiveData.length;

      // Store full CSV data inline as fallback; also upload to campaign_csv_files
      const { data: campaign, error } = await supabase.from("campaigns").insert({
        name: campaignName,
        language: campaignLanguage,
        country: campaignCountry,
        campaign_type: campaignType,
        campaign_types: campaignTypes as any,
        template_id: selectedTemplate || null,
        website_id: selectedWebsite || (dataSource === "website" ? websiteForPages : null) || null,
        csv_data: effectiveData as unknown as Database["public"]["Tables"]["campaigns"]["Insert"]["csv_data"],
        total_rows: maxRows ? Math.min(parseInt(maxRows), effectiveRowCount) : effectiveRowCount,
        user_id: user.id,
         workspace_id: wsId,
         utm_settings: utmSettings as any,
         geo_settings: geoSettings as any,
         directory_structure: dirStructure as any,
         mapping: { seo_title_format: seoTitleFormat } as any,
         publish_mode: publishMode,
         generation_method: generationMethod,
        max_rows: maxRows ? parseInt(maxRows) : null,
        scheduled_at: (scheduleMode === "later" || scheduleMode === "recurring") && scheduledDate ? scheduledDate.toISOString() : null,
        status: (scheduleMode === "later" || scheduleMode === "recurring") && scheduledDate ? "queued" as any : publishMode === "published" ? "queued" as any : "draft" as any,
        recurring_schedule: scheduleMode === "recurring" ? { interval: recurringInterval, end_date: recurringEndDate?.toISOString() || null, enabled: true } as any : null,
      } as any).select("id").single();
      if (error) throw error;

      const campaignId = campaign?.id;

      // Upload data to dedicated CSV table
      if (campaignId) {
        const rawContent = dataSource === "csv" && csvRawText
          ? csvRawText
          : [effectiveHeaders.join(","), ...effectiveData.map(r => effectiveHeaders.map(h => `"${(r[h] || "").replace(/"/g, '""')}"`).join(","))].join("\n");

        await supabase.from("campaign_csv_files" as any).insert({
          campaign_id: campaignId,
          workspace_id: wsId,
          user_id: user.id,
          file_name: dataSource === "csv" ? (csvFile?.name || "data.csv") : dataSource === "locations" ? "locations.csv" : "website-pages.csv",
          file_size: rawContent.length,
          raw_content: rawContent,
          headers: effectiveHeaders as any,
          row_count: effectiveRowCount,
        }).then(({ error: csvErr }) => { if (csvErr) console.error("CSV upload failed:", csvErr); });

        // Persist DataSource
        await supabase.from("data_sources").insert({
          campaign_id: campaignId,
          workspace_id: wsId,
          user_id: user.id,
          type: dataSource,
          file_name: dataSource === "csv" ? (csvFile?.name || "data.csv") : dataSource === "locations" ? "locations" : "website-pages",
          file_size: dataSource === "csv" ? (csvFile?.size || rawContent.length) : rawContent.length,
          row_count: effectiveRowCount,
          headers: effectiveHeaders as any,
        });

        // Persist Mappings from variable mapping
        if (variableMapping) {
          const mappingRows = variableMapping.matched
            .filter((m) => m.column || m.customValue)
            .map((m, i) => ({
              campaign_id: campaignId,
              workspace_id: wsId,
              user_id: user.id,
              source_column: m.customValue ? `__custom__:${m.customValue}` : m.column!,
              target_field: m.variable,
              field_category: m.customValue ? "custom_value" : "content",
              sort_order: i,
              is_required: true,
            }));
          if (mappingRows.length > 0) {
            await supabase.from("mappings").insert(mappingRows);
          }
        }
      }

      return campaignId;
    },
    onSuccess: (campaignId) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      const shouldAutoRun = publishMode === "published" && scheduleMode === "now";
      if (shouldAutoRun && campaignId) {
        toast({ title: "Campaign created", description: `"${campaignName}" is now generating and publishing pages...` });
        resetForm();
        executeMutation.mutate({ id: campaignId });
      } else {
        toast({ title: "Campaign created", description: `"${campaignName}" has been saved as a draft.` });
        resetForm();
      }
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
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({ title: "Campaign deleted" });
      if (wsId) logAudit(wsId, "campaign_deleted", "campaign", id);
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
        language: (campaign as any).language || "en",
        country: (campaign as any).country || "US",
        campaign_type: campaign.campaign_type,
        campaign_types: (campaign as any).campaign_types || [campaign.campaign_type],
        user_id: user.id,
        workspace_id: wsId,
        template_id: campaign.template_id,
        website_id: campaign.website_id,
        csv_data: campaign.csv_data,
        mapping: campaign.mapping,
        publish_mode: campaign.publish_mode,
        max_rows: campaign.max_rows,
        batch_size: campaign.batch_size,
        total_rows: campaign.total_rows,
        utm_settings: campaign.utm_settings,
        geo_settings: campaign.geo_settings,
        directory_structure: campaign.directory_structure,
        author_rotation: campaign.author_rotation,
        drip_feed_settings: campaign.drip_feed_settings,
        generation_method: campaign.generation_method,
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

      // Duplicate internal link settings
      if (newCampaign) {
        const { data: linkSettings } = await supabase
          .from("internal_link_settings")
          .select("*")
          .eq("campaign_id", campaign.id)
          .maybeSingle();
        if (linkSettings) {
          await supabase.from("internal_link_settings").insert({
            campaign_id: newCampaign.id,
            user_id: user.id,
            workspace_id: wsId,
            enabled: linkSettings.enabled,
            auto_build: linkSettings.auto_build,
            max_links_per_page: linkSettings.max_links_per_page,
            section_title: linkSettings.section_title,
            anchor_format: linkSettings.anchor_format,
            grouping_variable: linkSettings.grouping_variable,
          });
        }
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

      // Update campaign with full CSV data as fallback
      await supabase.from("campaigns").update({
        csv_data: rows as any,
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
  const stuckCampaignIds = useMemo(() => {
    return campaigns
      .filter((c) => {
        if (c.status !== "processing") return false;
        const latestJob = getLatestJob(c.id);
        const hasActiveJob = latestJob && (latestJob.status === "running" || latestJob.status === "pending");
        return !hasActiveJob;
      })
      .map((c) => c.id);
  }, [campaigns, generationJobs]);

  const resetStuckMutation = useMutation({
    mutationFn: async () => {
      if (stuckCampaignIds.length === 0) return;
      const { error } = await supabase
        .from("campaigns")
        .update({ status: "draft" as any, is_paused: false, updated_at: new Date().toISOString() })
        .in("id", stuckCampaignIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({ title: "Stuck campaigns reset", description: `${stuckCampaignIds.length} campaign(s) set back to draft.` });
    },
    onError: (err: Error) => {
      toast({ title: "Reset failed", description: err.message, variant: "destructive" });
    },
  });

  const processCsvFile = (file: File) => {
    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvRawText(text);
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length === 0) return;

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

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processCsvFile(file);
  };

  const handleCsvDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingCsv(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith(".csv") || file.type === "text/csv")) {
      processCsvFile(file);
    } else {
      toast({ title: "Invalid file", description: "Please drop a .csv file.", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setOpen(false);
    setStep(1);
    setCampaignName("");
    setCampaignLanguage("en");
    setCampaignCountry("US");
    setCampaignTypes(["seo"]);
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
    setRecurringInterval("weekly");
    setRecurringEndDate(undefined);
    setUtmSource(""); setUtmMedium(""); setUtmCampaign(""); setUtmTerm(""); setUtmContent("");
    setAdCampaignId(""); setAdGroupId(""); setSeaDirectoryLevels("");
    setGeoCountry(""); setGeoRegion(""); setGeoCity(""); setGeoPostcode("");
    setGeoLat(""); setGeoLng(""); setGeoLanguage("en");
    setDataSource("csv");
    setLocationData([]);
    setWebsiteForPages("");
    setWebsiteContentType("all");
    setSelectedPageIds(new Set());
    setWebsitePagesSearch("");
    setManualMappings({});
    setCustomValues({});
    setTransforms({});
    setTargetFieldMappings({});
  };

  // locationHeaders defined above
  const effectiveCsvData = dataSource === "website" ? websitePagesAsCsv.rows : dataSource === "locations" ? locationData : csvData;
  const effectiveCsvHeaders = dataSource === "website" ? websitePagesAsCsv.headers : dataSource === "locations" ? locationHeaders : csvHeaders;

  const handleTestOnePage = useCallback(async () => {
    if (!selectedTemplate || effectiveCsvData.length === 0) {
      toast({ title: "Cannot test", description: "Select a template and add data first.", variant: "destructive" });
      return;
    }
    setTestGenerating(true);
    try {
      const tpl = templates.find((t) => t.id === selectedTemplate);
      if (!tpl) throw new Error("Template not found");
      const templateConfig: TemplateConfig = {
        content: tpl.content || "",
        seo_title_pattern: tpl.seo_title_pattern || "",
        seo_description_pattern: tpl.seo_description_pattern || "",
        schema_type: tpl.schema_type || "WebPage",
        schema_config: (tpl.schema_config as Record<string, string>) || {},
      };
      const firstRow = effectiveCsvData[0];
      // Build row with mapping applied
      const mappedRow: Record<string, string> = {};
      if (variableMapping) {
        for (const m of variableMapping.matched) {
          if (m.customValue) {
            mappedRow[m.variable] = m.customValue;
          } else if (m.column && firstRow[m.column] !== undefined) {
            mappedRow[m.variable] = firstRow[m.column];
          }
        }
      } else {
        Object.assign(mappedRow, firstRow);
      }
      const ws = websites.find(w => w.id === (selectedWebsite || websiteForPages));
      const ctx: RenderContext = {
        row: mappedRow,
        extraVars: campaignTypes.includes("geo") ? {
          country: geoCountry, region: geoRegion, city: geoCity,
          postcode: geoPostcode, lat: geoLat, lng: geoLng,
        } : undefined,
        website: ws ? { name: ws.name } : undefined,
        campaignType: campaignType,
        rowIndex: 0,
      };
      const result = renderPage(templateConfig, ctx);
      setTestPreviewResult(result);
      setTestPreviewOpen(true);
    } catch (err: any) {
      toast({ title: "Test failed", description: err.message, variant: "destructive" });
    } finally {
      setTestGenerating(false);
    }
  }, [selectedTemplate, effectiveCsvData, templates, variableMapping, websites, selectedWebsite, websiteForPages, campaignTypes, campaignType, geoCountry, geoRegion, geoCity, geoPostcode, geoLat, geoLng, toast]);

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


  const mappingWarning = !hasTitleMapping && effectiveCsvData.length > 0 && selectedTemplate
    ? "⚠️ No title/name variable is mapped. Pages may have generic titles."
    : null;

  const canProceed = () => {
    if (step === 1) return !!campaignName;
    if (step === 2) return true;
    if (step === 3) return dataSource === "csv" ? csvData.length > 0 : dataSource === "locations" ? locationData.length > 0 : selectedPageIds.size > 0;
    if (step === 4) return !!selectedTemplate;
    return true;
  };

  const getWizardSteps = () => {
    const steps = [
      { num: 1, label: "Name" },
      { num: 2, label: "Type" },
      { num: 3, label: "Data" },
      { num: 4, label: "Template" },
    ];
    let nextNum = 5;
    if (campaignTypes.includes("sea")) {
      steps.push({ num: nextNum++, label: "UTM" });
    }
    if (campaignTypes.includes("geo")) {
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
      result = result.filter((c) => c.campaign_type === typeFilter || ((c as any).campaign_types || []).includes(typeFilter));
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

  const { ordered: orderedCampaigns, getDragProps: getCampaignDragProps, hasCustomOrder: hasCampaignCustomOrder, resetOrder: resetCampaignOrder } = useDragReorder(
    filteredCampaigns,
    `camp-order-${wsId}`
  );

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
          {stuckCampaignIds.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl gap-1.5 text-warning border-warning/30 hover:bg-warning/10"
              onClick={() => resetStuckMutation.mutate()}
              disabled={resetStuckMutation.isPending}
            >
              <RotateCcw className={cn("h-3.5 w-3.5", resetStuckMutation.isPending && "animate-spin")} />
              {resetStuckMutation.isPending ? "Resetting..." : `Reset ${stuckCampaignIds.length} stuck`}
            </Button>
          )}
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-gradient-primary hover:brightness-110 transition-all duration-150 active:scale-[0.97] shadow-sm">
                <Plus className="mr-2 h-4 w-4" /> {t("campaigns.newCampaign")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] md:max-w-[680px] w-[calc(100%-1rem)] max-w-[calc(100%-1rem)] sm:max-w-[600px] h-[calc(100dvh-1rem)] sm:h-auto max-h-[calc(100dvh-1rem)] sm:max-h-[85vh] rounded-xl sm:rounded-2xl p-0 gap-0 overflow-hidden fixed top-2 left-2 right-2 bottom-2 sm:inset-auto sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] flex flex-col">
              <div className="px-4 sm:px-6 pt-5 sm:pt-6 pb-0 shrink-0">
                <DialogHeader className="pb-0">
                   <DialogTitle className="text-base sm:text-lg font-bold">{t("campaigns.createCampaign")}</DialogTitle>
                   <DialogDescription className="text-xs sm:text-sm text-muted-foreground">{t("campaigns.description")}</DialogDescription>
                </DialogHeader>
              </div>

              {/* Wizard Steps Indicator */}
              <div className="px-4 sm:px-6 pt-5 pb-2 overflow-x-auto shrink-0">
                <div className="flex items-start justify-between min-w-0">
                  {wizardSteps.map((s, i) => (
                    <div key={s.num} className="flex items-center flex-1 last:flex-none">
                      <div className="flex flex-col items-center min-w-[32px] sm:min-w-[40px]">
                        <div
                          className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold transition-all duration-200 ring-2 ring-offset-2 ring-offset-background ${
                            step > s.num
                              ? "bg-primary text-primary-foreground ring-primary"
                              : step === s.num
                                ? "bg-primary text-primary-foreground ring-primary shadow-sm"
                                : "bg-muted text-muted-foreground ring-border"
                          }`}
                        >
                          {step > s.num ? <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : s.num}
                        </div>
                        <span className={`text-[9px] sm:text-[10px] mt-1 sm:mt-1.5 font-medium transition-colors truncate max-w-[40px] sm:max-w-none text-center ${
                          step >= s.num ? "text-foreground" : "text-muted-foreground"
                        }`}>{s.label}</span>
                      </div>
                      {i < wizardSteps.length - 1 && (
                        <div className="flex-1 flex items-center px-0.5 sm:px-1 -mt-3">
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
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
              <div className="px-4 sm:px-6 py-4 min-h-[180px]">
                <div className="space-y-4 animate-fade-in">
                  {step === 1 && (
                    <div className="space-y-4">
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
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm font-semibold mb-2.5 block">Language</Label>
                          <Select value={campaignLanguage} onValueChange={setCampaignLanguage}>
                            <SelectTrigger className="rounded-xl h-11 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {[
                                { code: "en", label: "English" }, { code: "es", label: "Spanish" }, { code: "fr", label: "French" },
                                { code: "de", label: "German" }, { code: "pt", label: "Portuguese" }, { code: "it", label: "Italian" },
                                { code: "nl", label: "Dutch" }, { code: "ja", label: "Japanese" }, { code: "zh", label: "Chinese" },
                                { code: "ko", label: "Korean" }, { code: "ar", label: "Arabic" }, { code: "hi", label: "Hindi" },
                                { code: "ru", label: "Russian" }, { code: "tr", label: "Turkish" }, { code: "pl", label: "Polish" },
                                { code: "sv", label: "Swedish" }, { code: "da", label: "Danish" }, { code: "fi", label: "Finnish" },
                                { code: "no", label: "Norwegian" }, { code: "el", label: "Greek" }, { code: "cs", label: "Czech" },
                                { code: "ro", label: "Romanian" }, { code: "id", label: "Indonesian" }, { code: "th", label: "Thai" },
                                { code: "vi", label: "Vietnamese" }, { code: "uk", label: "Ukrainian" }, { code: "hu", label: "Hungarian" },
                                { code: "ms", label: "Malay" }, { code: "tl", label: "Filipino" }, { code: "bn", label: "Bengali" },
                              ].map((l) => (
                                <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm font-semibold mb-2.5 block">Country</Label>
                          <Select value={campaignCountry} onValueChange={setCampaignCountry}>
                            <SelectTrigger className="rounded-xl h-11 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent className="max-h-80">
                              {ALL_COUNTRIES.map((c) => (
                                <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-3">
                       <Label className="text-sm font-semibold mb-2 block">Campaign Type <span className="text-muted-foreground font-normal">(select one or more)</span></Label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { value: "seo" as const, label: "SEO", icon: SearchIconLucide, desc: "Organic search pages" },
                          { value: "sea" as const, label: "SEA", icon: Target, desc: "Paid landing pages" },
                          { value: "geo" as const, label: "GEO", icon: MapPin, desc: "Local / geo pages" },
                        ].map((t) => {
                          const isSelected = campaignTypes.includes(t.value);
                          return (
                          <button
                            key={t.value}
                            type="button"
                            onClick={() => toggleCampaignType(t.value)}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 relative ${
                              isSelected
                                ? "border-primary bg-primary/5 shadow-sm"
                                : "border-border hover:border-primary/30 hover:bg-muted/50"
                            }`}
                          >
                            {isSelected && (
                              <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                                <Check className="h-2.5 w-2.5 text-primary-foreground" />
                              </div>
                            )}
                            <t.icon className={`h-6 w-6 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                            <span className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}>{t.label}</span>
                            <span className="text-[10px] text-muted-foreground text-center">{t.desc}</span>
                          </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-4">
                      {/* Data Source Toggle */}
                      <div className="flex items-center gap-1 p-1 bg-muted rounded-xl">
                        <button
                          type="button"
                          onClick={() => setDataSource("csv")}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[11px] font-medium transition-all ${
                            dataSource === "csv" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Upload className="h-3.5 w-3.5" /> CSV
                        </button>
                        <button
                          type="button"
                          onClick={() => setDataSource("website")}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[11px] font-medium transition-all ${
                            dataSource === "website" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Globe className="h-3.5 w-3.5" /> Website
                        </button>
                        <button
                          type="button"
                          onClick={() => setDataSource("locations")}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[11px] font-medium transition-all ${
                            dataSource === "locations" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <MapPin className="h-3.5 w-3.5" /> Locations
                        </button>
                      </div>

                      {dataSource === "csv" && (
                        <>
                          <div
                            className={cn(
                              "border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 cursor-pointer",
                              isDraggingCsv
                                ? "border-primary bg-primary/10 scale-[1.01]"
                                : "hover:border-primary/50 hover:bg-primary/5"
                            )}
                            onDragOver={(e) => { e.preventDefault(); setIsDraggingCsv(true); }}
                            onDragEnter={(e) => { e.preventDefault(); setIsDraggingCsv(true); }}
                            onDragLeave={() => setIsDraggingCsv(false)}
                            onDrop={handleCsvDrop}
                          >
                            <input type="file" accept=".csv,text/csv,text/comma-separated-values,application/csv,application/vnd.ms-excel" onChange={handleCsvUpload} className="hidden" id="csv-upload" />
                            <label htmlFor="csv-upload" className="cursor-pointer">
                              <Upload className={cn("mx-auto h-10 w-10 mb-3 transition-colors", isDraggingCsv ? "text-primary" : "text-muted-foreground/50")} />
                              <p className="text-sm font-medium">
                                {csvFile ? csvFile.name : isDraggingCsv ? "Drop your CSV here" : "Drop CSV file or click to upload"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {csvFile
                                  ? `${csvData.length} rows · ${csvFile.size < 1024 ? csvFile.size + " B" : csvFile.size < 1048576 ? (csvFile.size / 1024).toFixed(1) + " KB" : (csvFile.size / 1048576).toFixed(1) + " MB"}`
                                  : "Supports .csv files up to 20 MB"}
                              </p>
                            </label>
                          </div>
                          <p className="text-xs text-muted-foreground text-center">
                            Need a template?{" "}
                            <a href="/sample-data.csv" download="sample-data.csv" className="text-primary hover:underline font-medium">
                              Download sample CSV
                            </a>
                          </p>
                          {csvHeaders.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              <span className="text-xs text-muted-foreground">Columns:</span>
                              {csvHeaders.map((h) => (
                                <Badge key={h} variant="secondary" className="text-xs rounded-lg">{h}</Badge>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                      {dataSource === "website" && (
                        <>
                          {/* Website selector */}
                          <Select value={websiteForPages} onValueChange={(v) => { setWebsiteForPages(v); setSelectedPageIds(new Set()); }}>
                            <SelectTrigger className="rounded-xl h-10 text-sm">
                              <SelectValue placeholder="Select a website to import from" />
                            </SelectTrigger>
                            <SelectContent>
                              {websites.map((w) => (
                                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Content type toggle */}
                          <div className="flex items-center gap-1 p-0.5 bg-muted rounded-lg">
                            {([
                              { value: "all", label: "All" },
                              { value: "pages", label: "Pages" },
                              { value: "products", label: "Products" },
                            ] as const).map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => { setWebsiteContentType(opt.value); setSelectedPageIds(new Set()); }}
                                className={`flex-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                                  websiteContentType === opt.value ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>

                          {websiteForPages && (
                            <>
                              {/* Search */}
                              <div className="relative">
                                <SearchIconLucide className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                  value={websitePagesSearch}
                                  onChange={(e) => setWebsitePagesSearch(e.target.value)}
                                  placeholder="Search pages..."
                                  className="h-8 pl-8 text-xs rounded-xl"
                                />
                              </div>

                              {loadingWebPages ? (
                                <div className="flex items-center justify-center py-8">
                                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                  <span className="ml-2 text-xs text-muted-foreground">Loading pages...</span>
                                </div>
                              ) : filteredWebPages.length === 0 ? (
                                <div className="text-center py-6 text-muted-foreground">
                                  <Globe className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                  <p className="text-xs">No content found on this website.</p>
                                </div>
                              ) : (
                                <>
                                  {/* Select all / count */}
                                  <div className="flex items-center justify-between">
                                    <button
                                      type="button"
                                      className="text-xs text-primary hover:underline font-medium"
                                      onClick={() => {
                                        if (selectedPageIds.size === filteredWebPages.length) {
                                          setSelectedPageIds(new Set());
                                        } else {
                                          setSelectedPageIds(new Set(filteredWebPages.map((p: any) => p.id)));
                                        }
                                      }}
                                    >
                                      {selectedPageIds.size === filteredWebPages.length ? "Deselect all" : "Select all"}
                                    </button>
                                    <span className="text-xs text-muted-foreground">
                                      {selectedPageIds.size} / {filteredWebPages.length} selected
                                    </span>
                                  </div>

                                  {/* Pages list */}
                                  <ScrollArea className="h-[180px] rounded-xl border border-border">
                                    <div className="space-y-0.5 p-1">
                                      {filteredWebPages.map((page: any) => {
                                        const isSelected = selectedPageIds.has(page.id);
                                        return (
                                          <button
                                            key={page.id}
                                            type="button"
                                            onClick={() => {
                                              const next = new Set(selectedPageIds);
                                              if (isSelected) next.delete(page.id); else next.add(page.id);
                                              setSelectedPageIds(next);
                                            }}
                                            className={cn(
                                              "w-full flex items-start gap-2 px-2.5 py-2 rounded-lg text-left transition-colors",
                                              isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"
                                            )}
                                          >
                                            <Checkbox checked={isSelected} className="shrink-0 pointer-events-none mt-0.5" />
                                            <div className="min-w-0 flex-1">
                                              <p className="text-xs font-medium truncate">{page.title || "(Untitled)"}</p>
                                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                <span className="text-[10px] text-muted-foreground truncate max-w-[100px] sm:max-w-[200px]">/{page.slug}</span>
                                                <Badge variant="outline" className={`text-[9px] shrink-0 ${
                                                  page.type === "product" ? "text-primary border-primary/30" : "text-muted-foreground border-border"
                                                }`}>
                                                  {page.type === "product" ? "product" : "page"}
                                                </Badge>
                                                <Badge variant="outline" className={`text-[9px] shrink-0 ${
                                                  page.status === "publish" || page.status === "published" ? "text-success border-success/30" : "text-muted-foreground"
                                                }`}>
                                                  {page.status}
                                                </Badge>
                                              </div>
                                            </div>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </ScrollArea>
                                </>
                              )}
                            </>
                          )}

                          {selectedPageIds.size > 0 && (
                            <div className="space-y-2">
                              <ScrollArea className="w-full">
                                <div className="flex items-center gap-1.5 pb-1">
                                  <span className="text-xs text-muted-foreground shrink-0">Columns:</span>
                                  {websitePagesAsCsv.headers.map((h) => (
                                    <Badge key={h} variant="secondary" className="text-xs rounded-lg shrink-0">{h}</Badge>
                                  ))}
                                </div>
                              </ScrollArea>

                              {/* Content preview table */}
                              <div className="rounded-xl border border-border overflow-hidden">
                                <div className="px-3 py-2 bg-muted/50 border-b border-border flex items-center justify-between">
                                  <span className="text-xs font-semibold">Preview ({selectedPageIds.size} items)</span>
                                </div>
                                <ScrollArea className="max-h-[200px]">
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-[11px]">
                                      <thead>
                                        <tr className="border-b border-border bg-muted/30">
                                          {websitePagesAsCsv.headers.map((h) => (
                                            <th key={h} className="px-2.5 py-1.5 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {websitePagesAsCsv.rows.slice(0, 20).map((row, idx) => (
                                          <tr key={idx} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                                            {websitePagesAsCsv.headers.map((h) => (
                                              <td key={h} className="px-2.5 py-1.5 max-w-[160px] truncate whitespace-nowrap">
                                                {h === "type" ? (
                                                  <Badge variant="outline" className={`text-[9px] ${row[h] === "product" ? "text-primary border-primary/30" : "text-muted-foreground"}`}>
                                                    {row[h]}
                                                  </Badge>
                                                ) : h === "url" ? (
                                                  <span className="text-primary">{row[h]}</span>
                                                ) : (
                                                  row[h] || "—"
                                                )}
                                              </td>
                                            ))}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                  {websitePagesAsCsv.rows.length > 20 && (
                                    <p className="text-[10px] text-muted-foreground text-center py-1.5">
                                      +{websitePagesAsCsv.rows.length - 20} more items
                                    </p>
                                  )}
                                </ScrollArea>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      {dataSource === "locations" && (
                        <>
                          <div className="text-center space-y-3">
                            <div className="flex items-center justify-center gap-3">
                              <MapPin className="h-8 w-8 text-primary/50" />
                              <div className="text-left">
                                <p className="text-sm font-semibold">Built-in Location Database</p>
                                <p className="text-xs text-muted-foreground">
                                  {locationData.length > 0
                                    ? `${locationData.length} cities selected`
                                    : "Select cities, counties & zip codes — no CSV needed"}
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant={locationData.length > 0 ? "outline" : "default"}
                              onClick={() => setLocationDbOpen(true)}
                              className="rounded-xl gap-2"
                            >
                              <DatabaseIcon className="h-4 w-4" />
                              {locationData.length > 0 ? "Change Selection" : "Browse Locations"}
                            </Button>
                          </div>

                          {locationData.length > 0 && (
                            <>
                              <div className="flex flex-wrap gap-1.5">
                                <span className="text-xs text-muted-foreground">Columns:</span>
                                {locationHeaders.map((h) => (
                                  <Badge key={h} variant="secondary" className="text-xs rounded-lg">{h}</Badge>
                                ))}
                              </div>
                              <div className="rounded-xl border border-border overflow-hidden">
                                <div className="px-3 py-2 bg-muted/50 border-b border-border flex items-center justify-between">
                                  <span className="text-xs font-semibold">Preview ({locationData.length} cities)</span>
                                </div>
                                <ScrollArea className="max-h-[200px]">
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-[11px]">
                                      <thead>
                                        <tr className="border-b border-border bg-muted/30">
                                          {["city", "state", "zip_code", "county", "latitude", "longitude", "population"].map((h) => (
                                            <th key={h} className="px-2.5 py-1.5 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {locationData.slice(0, 20).map((row, idx) => (
                                          <tr key={idx} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                                            <td className="px-2.5 py-1.5 font-medium whitespace-nowrap">{row.city}</td>
                                            <td className="px-2.5 py-1.5 whitespace-nowrap">
                                              <Badge variant="outline" className="text-[9px]">{row.state_code || row.state}</Badge>
                                            </td>
                                            <td className="px-2.5 py-1.5 whitespace-nowrap">{row.zip_code}</td>
                                            <td className="px-2.5 py-1.5 whitespace-nowrap text-muted-foreground">{row.county}</td>
                                            <td className="px-2.5 py-1.5 whitespace-nowrap tabular-nums">{row.latitude}</td>
                                            <td className="px-2.5 py-1.5 whitespace-nowrap tabular-nums">{row.longitude}</td>
                                            <td className="px-2.5 py-1.5 whitespace-nowrap tabular-nums">{row.population}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                  {locationData.length > 20 && (
                                    <p className="text-[10px] text-muted-foreground text-center py-1.5">
                                      +{locationData.length - 20} more cities
                                    </p>
                                  )}
                                </ScrollArea>
                              </div>
                            </>
                          )}

                          <LocationDatabaseDialog
                            open={locationDbOpen}
                            onOpenChange={setLocationDbOpen}
                            onSelect={(rows) => setLocationData(rows)}
                          />
                        </>
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
                      {selectedTemplate && effectiveCsvHeaders.length > 0 && (
                        <MappingStep
                          csvHeaders={effectiveCsvHeaders}
                          templateVars={selectedTemplateVars}
                          campaignTypes={campaignTypes}
                          websiteType={websites.find(w => w.id === (selectedWebsite || websiteForPages))?.type}
                          manualMappings={manualMappings}
                          setManualMappings={setManualMappings}
                          customValues={customValues}
                          setCustomValues={setCustomValues}
                          transforms={transforms}
                          setTransforms={setTransforms}
                          targetFieldMappings={targetFieldMappings}
                          setTargetFieldMappings={setTargetFieldMappings}
                          workspaceId={wsId!}
                        />
                      )}
                    </div>
                  )}

                  {wizardSteps[step - 1]?.label === "UTM" && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="h-4 w-4 text-primary" />
                        <Label className="text-sm font-semibold">Google Ads & UTM Settings</Label>
                      </div>
                      <p className="text-xs text-muted-foreground -mt-2">
                        Map ad identifiers and UTM params. Use <code className="bg-muted px-1 py-0.5 rounded font-mono text-primary">{"{variable}"}</code> to pull from CSV columns.
                      </p>
                      
                      {/* Ad Group Mapping */}
                      <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-3">
                        <h4 className="text-xs font-semibold flex items-center gap-1.5">
                          <Target className="h-3.5 w-3.5 text-primary" /> Ad Identifiers
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Ad Campaign ID</Label>
                            <Input value={adCampaignId} onChange={(e) => setAdCampaignId(e.target.value)} placeholder="{ad_campaign_id}" className="rounded-xl h-9 text-sm" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Ad Group ID</Label>
                            <Input value={adGroupId} onChange={(e) => setAdGroupId(e.target.value)} placeholder="{ad_group_id}" className="rounded-xl h-9 text-sm" />
                          </div>
                        </div>
                      </div>

                      {/* UTM Parameters */}
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

                      {/* Directory Structure for SEA */}
                      <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-3">
                        <h4 className="text-xs font-semibold flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-primary" /> Landing Page Paths
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          Optional: organize landing pages into a directory hierarchy (e.g. <code className="bg-muted px-1 rounded">/ads/{"{campaign}"}/{"{keyword}"}/</code>)
                        </p>
                        <Input
                          value={seaDirectoryLevels}
                          onChange={(e) => setSeaDirectoryLevels(e.target.value)}
                          placeholder="e.g. campaign_name, keyword"
                          className="rounded-xl h-9 text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {wizardSteps[step - 1]?.label === "GEO" && (
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
                              {[
                                { code: "en", label: "English" },
                                { code: "es", label: "Spanish" },
                                { code: "fr", label: "French" },
                                { code: "de", label: "German" },
                                { code: "pt", label: "Portuguese" },
                                { code: "it", label: "Italian" },
                                { code: "nl", label: "Dutch" },
                                { code: "ja", label: "Japanese" },
                                { code: "zh", label: "Chinese" },
                                { code: "ko", label: "Korean" },
                                { code: "ar", label: "Arabic" },
                                { code: "hi", label: "Hindi" },
                                { code: "bn", label: "Bengali" },
                                { code: "ru", label: "Russian" },
                                { code: "tr", label: "Turkish" },
                                { code: "vi", label: "Vietnamese" },
                                { code: "th", label: "Thai" },
                                { code: "pl", label: "Polish" },
                                { code: "uk", label: "Ukrainian" },
                                { code: "ro", label: "Romanian" },
                                { code: "sv", label: "Swedish" },
                                { code: "da", label: "Danish" },
                                { code: "fi", label: "Finnish" },
                                { code: "no", label: "Norwegian" },
                                { code: "el", label: "Greek" },
                                { code: "cs", label: "Czech" },
                                { code: "hu", label: "Hungarian" },
                                { code: "id", label: "Indonesian" },
                                { code: "ms", label: "Malay" },
                                { code: "tl", label: "Filipino" },
                              ].map((l) => (
                                <SelectItem key={l.code} value={l.code}>{l.label} ({l.code.toUpperCase()})</SelectItem>
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
                          placeholder={`All (${effectiveCsvData.length || "—"} rows)`}
                          className="rounded-xl h-9 text-sm w-48"
                        />
                        <p className="text-[11px] text-muted-foreground">Leave empty to process all rows.</p>
                      </div>

                      {/* Generation Method */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Generation Method</Label>
                        <RadioGroup value={generationMethod} onValueChange={(v) => setGenerationMethod(v as "all" | "sequential" | "random")} className="flex flex-col gap-2">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="all" id="method-all" />
                            <Label htmlFor="method-all" className="text-sm cursor-pointer">All Combinations</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="sequential" id="method-sequential" />
                            <Label htmlFor="method-sequential" className="text-sm cursor-pointer">Sequential</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="random" id="method-random" />
                            <Label htmlFor="method-random" className="text-sm cursor-pointer">Random</Label>
                          </div>
                        </RadioGroup>
                        <p className="text-[11px] text-muted-foreground">
                          {generationMethod === "all" ? "Generate pages for all possible combinations of terms." : generationMethod === "sequential" ? "Generate pages in the original CSV row order." : "Shuffle rows randomly before generating."}
                        </p>
                      </div>

                      {/* Schedule */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Schedule</Label>
                        <RadioGroup value={scheduleMode} onValueChange={(v) => setScheduleMode(v as "now" | "later" | "recurring")} className="flex flex-wrap gap-4">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="now" id="sched-now" />
                            <Label htmlFor="sched-now" className="text-sm cursor-pointer">Run now</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="later" id="sched-later" />
                            <Label htmlFor="sched-later" className="text-sm cursor-pointer">Schedule later</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="recurring" id="sched-recurring" />
                            <Label htmlFor="sched-recurring" className="text-sm cursor-pointer">Recurring</Label>
                          </div>
                        </RadioGroup>
                        {(scheduleMode === "later" || scheduleMode === "recurring") && (
                          <div className="space-y-3 mt-2">
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1 block">
                                {scheduleMode === "recurring" ? "First run date" : "Scheduled date"}
                              </Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-60 justify-start text-left font-normal rounded-xl h-9 text-sm",
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
                            </div>

                            {scheduleMode === "recurring" && (
                              <>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1 block">Repeat interval</Label>
                                  <Select value={recurringInterval} onValueChange={(v) => setRecurringInterval(v as any)}>
                                    <SelectTrigger className="w-48 h-9 text-sm rounded-xl">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="daily">Every day</SelectItem>
                                      <SelectItem value="weekly">Every week</SelectItem>
                                      <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                                      <SelectItem value="monthly">Every month</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1 block">End date (optional)</Label>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        className={cn(
                                          "w-60 justify-start text-left font-normal rounded-xl h-9 text-sm",
                                          !recurringEndDate && "text-muted-foreground"
                                        )}
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {recurringEndDate ? format(recurringEndDate, "PPP") : "No end date (runs indefinitely)"}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <Calendar
                                        mode="single"
                                        selected={recurringEndDate}
                                        onSelect={setRecurringEndDate}
                                        disabled={(date) => date < new Date()}
                                        initialFocus
                                        className={cn("p-3 pointer-events-auto")}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </div>
                                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-muted-foreground">
                                  <p className="font-medium text-foreground mb-1">🔄 Recurring generation</p>
                                  <p>This campaign will automatically re-generate pages <strong className="text-foreground">{recurringInterval}</strong> starting {scheduledDate ? format(scheduledDate, "PPP") : "on the selected date"}{recurringEndDate ? ` until ${format(recurringEndDate, "PPP")}` : ""}.</p>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* SEO Title Format */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">SEO Title Format</Label>
                        <Select value={seoTitleFormat} onValueChange={setSeoTitleFormat}>
                          <SelectTrigger className="rounded-xl h-9 text-sm w-full sm:w-72">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="{title} | {brand}">{"{title} | {brand}"}</SelectItem>
                            <SelectItem value="{brand} - {title}">{"{brand} - {title}"}</SelectItem>
                            <SelectItem value="{title} — {brand}">{"{title} — {brand}"}</SelectItem>
                            <SelectItem value="{brand} | {title}">{"{brand} | {title}"}</SelectItem>
                            <SelectItem value="{title}">{"{title}"} (no brand)</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-[11px] text-muted-foreground">
                          Controls how the SEO title is structured. <code className="font-mono bg-muted px-1 rounded">{"{brand}"}</code> = website name, <code className="font-mono bg-muted px-1 rounded">{"{title}"}</code> = page title.
                        </p>
                      </div>

                      {/* Summary */}
                      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-1.5 text-xs">
                        <h4 className="text-sm font-semibold mb-2">Summary</h4>
                        <div className="flex justify-between"><span className="text-muted-foreground">Data Source</span><span className="font-medium capitalize">{dataSource === "csv" ? "CSV File" : `Website Content (${websiteContentType})`}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Rows</span><span className="font-medium">{maxRows ? `${maxRows} / ${effectiveCsvData.length}` : `${effectiveCsvData.length || "—"} (all)`}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Site</span><span className="font-medium">{websites.find(w => w.id === (selectedWebsite || websiteForPages))?.name || "None"}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Template</span><span className="font-medium">{templates.find(t => t.id === selectedTemplate)?.name || "None"}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium uppercase">{campaignTypes.join(" + ")}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Language</span><span className="font-medium">{campaignLanguage.toUpperCase()}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Country</span><span className="font-medium">{campaignCountry}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span className="font-medium capitalize">{generationMethod}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Publish</span><span className="font-medium capitalize">{publishMode}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Schedule</span><span className="font-medium">{scheduleMode === "now" ? "Immediately" : scheduleMode === "recurring" ? `Recurring (${recurringInterval})` : scheduledDate ? format(scheduledDate, "PPP") : "Not set"}</span></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              </div>

              <div className="flex justify-between px-4 sm:px-6 py-4 border-t border-border bg-muted/30 shrink-0">
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
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={handleTestOnePage}
                      disabled={!selectedTemplate || effectiveCsvData.length === 0 || testGenerating}
                      className="rounded-xl h-10 px-4"
                    >
                      {testGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testing...</> : <><Eye className="mr-2 h-4 w-4" /> Test (1 Page)</>}
                    </Button>
                    <Button
                      onClick={() => createMutation.mutate()}
                      disabled={!campaignName || createMutation.isPending}
                      className="rounded-xl h-10 px-5 bg-gradient-primary hover:brightness-110"
                    >
                      {createMutation.isPending ? "Creating..." : scheduleMode === "recurring" ? "Set Up Recurring" : scheduleMode === "later" ? "Schedule Campaign" : publishMode === "published" ? "Generate & Publish" : "Create Campaign"}
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <TestPagePreviewDialog open={testPreviewOpen} onOpenChange={setTestPreviewOpen} result={testPreviewResult} />
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
                placeholder={t("campaigns.searchCampaigns")}
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
                <SelectItem value="all">{t("campaigns.allStatuses")}</SelectItem>
                <SelectItem value="draft">{t("common.draft")}</SelectItem>
                <SelectItem value="queued">{t("common.queued")}</SelectItem>
                <SelectItem value="processing">{t("common.processing")}</SelectItem>
                <SelectItem value="completed">{t("common.completed")}</SelectItem>
                <SelectItem value="failed">{t("common.failed")}</SelectItem>
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
              <h3 className="font-semibold">{t("campaigns.noCampaignsSearch")}</h3>
              <p className="text-muted-foreground text-sm">{t("common.tryAdjustingFilters")}</p>
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
              <h3 className="font-semibold">{t("campaigns.noCampaigns")}</h3>
              <p className="text-muted-foreground text-sm max-w-sm">{t("campaigns.description")}</p>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === "table" ? (
        /* TABLE VIEW */
        <Card className="border-0 shadow-surface overflow-hidden">
          <div className="overflow-hidden">
            <table className="w-full table-fixed text-sm">
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
                {orderedCampaigns.map((c, index) => {
                  const progress = getProgressInfo(c);
                  const isPaused = (c as any).is_paused === true || c.status === "queued" && progress.processed > 0;
                  const config = statusConfig[c.status] || statusConfig.draft;
                  const trDragProps = getCampaignDragProps(index);
                  return (
                    <tr key={c.id} className={`border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors ${index % 2 === 1 ? "bg-muted/10" : ""} ${trDragProps.className}`} draggable={trDragProps.draggable} onDragStart={trDragProps.onDragStart} onDragOver={trDragProps.onDragOver} onDrop={trDragProps.onDrop} onDragEnd={trDragProps.onDragEnd}>
                      <td className="py-3 px-4 max-w-0">
                        <div className="flex items-center gap-2">
                          <button className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors shrink-0">
                            <GripVertical className="h-4 w-4" />
                          </button>
                          <div>
                          <span className="font-medium cursor-pointer hover:text-primary transition-colors truncate block" onClick={() => navigate(`/campaigns/${c.id}`)}>{c.name}</span>
                          <div className="flex gap-2 mt-0.5 text-[11px] text-muted-foreground">
                            {c.templates?.name && <span>{c.templates.name}</span>}
                            {c.websites?.name && <span>• {c.websites.name}</span>}
                          </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="secondary" className={`${config.class} text-[11px] font-medium border`}>
                            {isPaused ? "Paused" : config.label}
                          </Badge>
                          {((c as any).campaign_types?.length ? (c as any).campaign_types : [(c as any).campaign_type || "seo"]).map((t: string) => (
                            <Badge key={t} variant="outline" className="text-[10px] uppercase font-mono">
                              {t}
                            </Badge>
                          ))}
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
          {hasCampaignCustomOrder && (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={resetCampaignOrder} className="text-xs text-muted-foreground">
                <RotateCcw className="h-3 w-3 mr-1.5" /> Reset order
              </Button>
            </div>
          )}
          {orderedCampaigns.map((c, idx) => {
            const progress = getProgressInfo(c);
            const latestJob = getLatestJob(c.id);
            const hasActiveJob = latestJob && (latestJob.status === "running" || latestJob.status === "pending");
            const isProcessing = c.status === "processing" && hasActiveJob;
            const isStuck = c.status === "processing" && !hasActiveJob && progress.percent < 100;
            const isPaused = (c as any).is_paused === true || c.status === "queued" && progress.processed > 0;
            const startedAt = (c as any).generation_started_at;
            const completedAt = (c as any).generation_completed_at;
            const config = statusConfig[c.status] || statusConfig.draft;
            // latestJob already declared above
            const dragProps = getCampaignDragProps(idx);

            return (
              <Card
                key={c.id}
                className={`border-0 shadow-surface card-interactive overflow-hidden ${dragProps.className}`}
                draggable={dragProps.draggable}
                onDragStart={dragProps.onDragStart}
                onDragOver={dragProps.onDragOver}
                onDrop={dragProps.onDrop}
                onDragEnd={dragProps.onDragEnd}
              >
                <CardContent className="p-0">
                  <div className="flex items-start justify-between p-5 gap-4">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors p-0.5 shrink-0 mt-0.5">
                            <GripVertical className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-xs">Drag to reorder</TooltipContent>
                      </Tooltip>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="font-semibold truncate cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/campaigns/${c.id}`)}>{c.name}</h3>
                        <Badge variant="secondary" className={`${config.class} text-[11px] font-medium border shrink-0`}>
                          {isPaused ? "Paused" : config.label}
                        </Badge>
                        {((c as any).campaign_types?.length ? (c as any).campaign_types : [(c as any).campaign_type || "seo"]).map((t: string) => (
                          <Badge key={t} variant="outline" className="text-[10px] uppercase font-mono shrink-0">
                            {t}
                          </Badge>
                        ))}
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
                  </div>

                   {(c.status === "queued" && progress.total === 0 && hasActiveJob) && (
                    <div className="px-5 pb-5">
                      <div className="flex items-center gap-2 text-xs text-primary">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span className="font-medium">Preparing generation...</span>
                      </div>
                      <Progress value={0} className="h-2 mt-2" />
                    </div>
                  )}
                  {isStuck && (
                    <div className="px-5 pb-5">
                      <div className="flex items-center gap-2 text-xs text-warning">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span className="font-medium">Generation stalled — retry or resume to continue</span>
                      </div>
                    </div>
                  )}
                  {progress.total > 0 && (
                    <div className="px-5 pb-5 space-y-2">
                      {isProcessing && (
                        <div className="flex items-center gap-2 text-xs text-primary mb-1">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span className="font-medium">Generating pages...</span>
                        </div>
                      )}
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
