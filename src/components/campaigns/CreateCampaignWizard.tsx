import { useState, useMemo, useCallback } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { friendlyError } from "@/lib/friendly-errors";
import { parseUploadedFile } from "@/lib/export-csv";
import { ALL_COUNTRIES } from "@/lib/countries";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { LocationDatabaseDialog } from "@/components/campaigns/LocationDatabaseDialog";
import { TestPagePreviewDialog } from "@/components/campaigns/TestPagePreviewDialog";
import { MappingStep } from "@/components/campaigns/MappingStep";
import { renderPage, type RenderResult, type TemplateConfig, type RenderContext } from "@/lib/renderer";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { isDesignVariable } from "@/lib/design-vars-filter";
import {
  Plus, Upload, ArrowRight, Check, AlertTriangle, Play, Loader2, Eye,
  MapPin, Target, Search as SearchIconLucide, Layers, CalendarIcon,
  Settings2, Globe, Database as DatabaseIcon,
} from "lucide-react";

const LANGUAGES = [
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
];

interface CreateCampaignWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (campaignId: string) => void;
}

export function CreateCampaignWizard({ open, onOpenChange, onCreated }: CreateCampaignWizardProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  // --- Wizard State ---
  const [step, setStep] = useState(1);
  const [campaignName, setCampaignName] = useState("");
  const [campaignLanguage, setCampaignLanguage] = useState("en");
  const [campaignCountry, setCampaignCountry] = useState("US");
  const [campaignTypes, setCampaignTypes] = useState<("seo" | "sea" | "geo")[]>(["seo"]);
  const campaignType = campaignTypes[0] || "seo";

  // Data source
  const [dataSource, setDataSource] = useState<"csv" | "website" | "locations">("csv");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvRawText, setCsvRawText] = useState("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [isDraggingCsv, setIsDraggingCsv] = useState(false);
  const [locationData, setLocationData] = useState<Record<string, string>[]>([]);
  const [locationDbOpen, setLocationDbOpen] = useState(false);
  const [websiteForPages, setWebsiteForPages] = useState("");
  const [websiteContentType, setWebsiteContentType] = useState<"pages" | "products" | "all">("all");
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set());
  const [websitePagesSearch, setWebsitePagesSearch] = useState("");

  // Template & mapping
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedWebsite, setSelectedWebsite] = useState("");
  const [manualMappings, setManualMappings] = useState<Record<string, string>>({});
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [transforms, setTransforms] = useState<Record<string, string>>({});
  const [targetFieldMappings, setTargetFieldMappings] = useState<Record<string, string>>({});

  // Settings
  const [publishMode, setPublishMode] = useState<"draft" | "published">("draft");
  const [maxRows, setMaxRows] = useState("");
  const [generationMethod, setGenerationMethod] = useState<"all" | "sequential" | "random">("all");
  const [scheduleMode, setScheduleMode] = useState<"now" | "later" | "recurring">("now");
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [recurringInterval, setRecurringInterval] = useState<"daily" | "weekly" | "biweekly" | "monthly">("weekly");
  const [recurringEndDate, setRecurringEndDate] = useState<Date | undefined>(undefined);
  const [seoTitleFormat, setSeoTitleFormat] = useState("{title} | {brand}");

  // UTM/SEA
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [utmTerm, setUtmTerm] = useState("");
  const [utmContent, setUtmContent] = useState("");
  const [adCampaignId, setAdCampaignId] = useState("");
  const [adGroupId, setAdGroupId] = useState("");
  const [seaDirectoryLevels, setSeaDirectoryLevels] = useState("");

  // GEO
  const [geoCountry, setGeoCountry] = useState("{country}");
  const [geoRegion, setGeoRegion] = useState("{region}");
  const [geoCity, setGeoCity] = useState("{city}");
  const [geoPostcode, setGeoPostcode] = useState("{zip_code}");
  const [geoLat, setGeoLat] = useState("{latitude}");
  const [geoLng, setGeoLng] = useState("{longitude}");
  const [geoLanguage, setGeoLanguage] = useState("en");

  // Test preview
  const [testPreviewOpen, setTestPreviewOpen] = useState(false);
  const [testPreviewResult, setTestPreviewResult] = useState<RenderResult | null>(null);
  const [testGenerating, setTestGenerating] = useState(false);

  const toggleCampaignType = (val: "seo" | "sea" | "geo") => {
    setCampaignTypes(prev => {
      if (prev.includes(val)) {
        if (prev.length === 1) return prev;
        return prev.filter(t => t !== val);
      }
      return [...prev, val];
    });
  };

  // --- Queries ---
  const { data: templates = [] } = useQuery({
    queryKey: ["templates", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase.from("templates").select("id, name, variables, content, seo_title_pattern, seo_description_pattern, schema_type, schema_config").eq("workspace_id", wsId!).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: websites = [] } = useQuery({
    queryKey: ["websites", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase.from("websites").select("id, name, type").eq("workspace_id", wsId!).order("name");
      if (error) throw error;
      return data;
    },
  });

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
        return [...(pagesRes.data?.items || []), ...(productsRes.data?.items || [])] as ContentItem[];
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

  // --- Computed ---
  const locationHeaders = ["city", "county", "state", "state_code", "zip_code", "country", "latitude", "longitude", "population", "timezone", "region"];

  const filteredWebPages = useMemo(() => {
    if (!websitePagesSearch) return websitePages;
    const q = websitePagesSearch.toLowerCase();
    return websitePages.filter((p: any) => p.title?.toLowerCase().includes(q) || p.slug?.toLowerCase().includes(q));
  }, [websitePages, websitePagesSearch]);

  const websitePagesAsCsv = useMemo(() => {
    if (dataSource !== "website" || selectedPageIds.size === 0) return { headers: [] as string[], rows: [] as Record<string, string>[] };
    const selected = websitePages.filter((p: any) => selectedPageIds.has(p.id));
    const headers = ["title", "slug", "url", "type", "status", "excerpt"];
    const rows = selected.map((p: any) => ({
      title: p.title || "", slug: p.slug || "", url: p.url || "",
      type: p.type || "page", status: p.status || "",
      excerpt: (p.excerpt || "").replace(/<[^>]*>/g, "").slice(0, 500),
    }));
    return { headers, rows };
  }, [dataSource, selectedPageIds, websitePages]);

  const effectiveCsvData = dataSource === "website" ? websitePagesAsCsv.rows : dataSource === "locations" ? locationData : csvData;
  const effectiveCsvHeaders = dataSource === "website" ? websitePagesAsCsv.headers : dataSource === "locations" ? locationHeaders : csvHeaders;

  const selectedTemplateVars = useMemo(() => {
    if (!selectedTemplate) return [];
    const tpl = templates.find(t => t.id === selectedTemplate);
    if (!tpl?.variables) return [];
    return (tpl.variables as string[]).map(v => v.replace(/[{}]/g, "")).filter(v => !isDesignVariable(v));
  }, [selectedTemplate, templates]);

  const variableMapping = useMemo(() => {
    const headers = effectiveCsvHeaders;
    if (selectedTemplateVars.length === 0 || headers.length === 0) return null;
    const matched: { variable: string; column: string | null; customValue?: string }[] = [];
    for (const v of selectedTemplateVars) {
      if (customValues[v] !== undefined && customValues[v] !== "") {
        matched.push({ variable: v, column: null, customValue: customValues[v] });
        continue;
      }
      if (manualMappings[v] && headers.includes(manualMappings[v])) {
        matched.push({ variable: v, column: manualMappings[v] });
        continue;
      }
      const vLower = v.toLowerCase();
      const exactMatch = headers.find(h => h.toLowerCase() === vLower);
      if (exactMatch) {
        matched.push({ variable: v, column: exactMatch });
      } else {
        const fuzzy = headers.find(h => h.toLowerCase().includes(vLower) || vLower.includes(h.toLowerCase()));
        matched.push({ variable: v, column: fuzzy || null });
      }
    }
    const unmatchedColumns = headers.filter(h => !matched.some(m => m.column === h));
    return { matched, unmatchedColumns };
  }, [selectedTemplateVars, effectiveCsvHeaders, manualMappings, customValues]);

  // --- Wizard steps ---
  const getWizardSteps = () => {
    const steps = [
      { num: 1, label: "Basics" },
      { num: 2, label: "Type" },
      { num: 3, label: "Data" },
      { num: 4, label: "Template" },
    ];
    let nextNum = 5;
    if (campaignTypes.includes("sea")) steps.push({ num: nextNum++, label: "UTM" });
    if (campaignTypes.includes("geo")) steps.push({ num: nextNum++, label: "GEO" });
    steps.push({ num: nextNum++, label: "Website" });
    steps.push({ num: nextNum++, label: "Settings" });
    return steps;
  };

  const wizardSteps = getWizardSteps();
  const totalSteps = wizardSteps.length;

  const canProceed = () => {
    if (step === 1) return !!campaignName;
    if (step === 2) return true;
    if (step === 3) return dataSource === "csv" ? csvData.length > 0 : dataSource === "locations" ? locationData.length > 0 : selectedPageIds.size > 0;
    if (step === 4) return !!selectedTemplate;
    return true;
  };

  // --- CSV Processing ---
  const processCsvFile = async (file: File) => {
    setCsvFile(file);
    try {
      const parsed = await parseUploadedFile(file);
      const rawText = parsed.rowData.map(r => parsed.headers.map(h => r[h]).join(",")).join("\n");
      setCsvRawText(parsed.headers.join(",") + "\n" + rawText);
      setCsvHeaders(parsed.headers);
      setCsvData(parsed.rowData);
    } catch (err: any) {
      toast({ title: "Parse error", description: err.message || "Failed to parse file", variant: "destructive" });
    }
  };

  const handleCsvDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingCsv(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (["csv", "tsv", "txt", "json", "xlsx", "xls"].includes(ext || "")) {
        processCsvFile(file);
      } else {
        toast({ title: "Invalid file", description: "Please drop a .csv, .json, .xlsx, or .xls file.", variant: "destructive" });
      }
    }
  };

  // --- Test preview ---
  const handleTestOnePage = useCallback(async () => {
    if (!selectedTemplate || effectiveCsvData.length === 0) return;
    setTestGenerating(true);
    try {
      const tpl = templates.find(t => t.id === selectedTemplate);
      if (!tpl) throw new Error("Template not found");
      const templateConfig: TemplateConfig = {
        content: tpl.content || "",
        seo_title_pattern: tpl.seo_title_pattern || "",
        seo_description_pattern: tpl.seo_description_pattern || "",
        schema_type: tpl.schema_type || "WebPage",
        schema_config: (tpl.schema_config as Record<string, string>) || {},
      };
      const firstRow = effectiveCsvData[0];
      const mappedRow: Record<string, string> = {};
      if (variableMapping) {
        for (const m of variableMapping.matched) {
          if (m.customValue) mappedRow[m.variable] = m.customValue;
          else if (m.column && firstRow[m.column] !== undefined) mappedRow[m.variable] = firstRow[m.column];
        }
      } else {
        Object.assign(mappedRow, firstRow);
      }
      const ws = websites.find(w => w.id === (selectedWebsite || websiteForPages));
      const ctx: RenderContext = {
        row: mappedRow,
        extraVars: campaignTypes.includes("geo") ? { country: geoCountry, region: geoRegion, city: geoCity, postcode: geoPostcode, lat: geoLat, lng: geoLng } : undefined,
        website: ws ? { name: ws.name } : undefined,
        campaignType,
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

  // --- Create mutation ---
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

      const effectiveRowCount = effectiveCsvData.length;

      const { data: campaign, error } = await supabase.from("campaigns").insert({
        name: campaignName,
        language: campaignLanguage,
        country: campaignCountry,
        campaign_type: campaignType,
        campaign_types: campaignTypes as any,
        template_id: selectedTemplate || null,
        website_id: selectedWebsite || (dataSource === "website" ? websiteForPages : null) || null,
        csv_data: effectiveCsvData as unknown as Database["public"]["Tables"]["campaigns"]["Insert"]["csv_data"],
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
      if (campaignId) {
        const rawContent = dataSource === "csv" && csvRawText
          ? csvRawText
          : [effectiveCsvHeaders.join(","), ...effectiveCsvData.map(r => effectiveCsvHeaders.map(h => `"${(r[h] || "").replace(/"/g, '""')}"`).join(","))].join("\n");

        await supabase.from("campaign_csv_files" as any).insert({
          campaign_id: campaignId, workspace_id: wsId, user_id: user.id,
          file_name: dataSource === "csv" ? (csvFile?.name || "data.csv") : dataSource === "locations" ? "locations.csv" : "website-pages.csv",
          file_size: rawContent.length, raw_content: rawContent,
          headers: effectiveCsvHeaders as any, row_count: effectiveRowCount,
        });

        await supabase.from("data_sources").insert({
          campaign_id: campaignId, workspace_id: wsId, user_id: user.id,
          type: dataSource,
          file_name: dataSource === "csv" ? (csvFile?.name || "data.csv") : dataSource === "locations" ? "locations" : "website-pages",
          file_size: dataSource === "csv" ? (csvFile?.size || rawContent.length) : rawContent.length,
          row_count: effectiveRowCount, headers: effectiveCsvHeaders as any,
        });

        if (variableMapping) {
          const mappingRows = variableMapping.matched
            .filter(m => m.column || m.customValue)
            .map((m, i) => ({
              campaign_id: campaignId, workspace_id: wsId, user_id: user.id,
              source_column: m.customValue ? `__custom__:${m.customValue}` : m.column!,
              target_field: m.variable,
              field_category: m.customValue ? "custom_value" : "content",
              sort_order: i, is_required: true,
            }));
          if (mappingRows.length > 0) await supabase.from("mappings").insert(mappingRows);
        }
      }
      return campaignId;
    },
    onSuccess: (campaignId) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({ title: "Campaign created", description: `"${campaignName}" has been saved.` });
      resetForm();
      if (campaignId) onCreated?.(campaignId);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    onOpenChange(false);
    setStep(1);
    setCampaignName(""); setCampaignLanguage("en"); setCampaignCountry("US"); setCampaignTypes(["seo"]);
    setCsvRawText(""); setCsvFile(null); setCsvHeaders([]); setCsvData([]);
    setSelectedTemplate(""); setSelectedWebsite(""); setPublishMode("draft");
    setMaxRows(""); setScheduleMode("now"); setScheduledDate(undefined);
    setRecurringInterval("weekly"); setRecurringEndDate(undefined);
    setUtmSource(""); setUtmMedium(""); setUtmCampaign(""); setUtmTerm(""); setUtmContent("");
    setAdCampaignId(""); setAdGroupId(""); setSeaDirectoryLevels("");
    setGeoCountry("{country}"); setGeoRegion("{region}"); setGeoCity("{city}"); setGeoPostcode("{zip_code}");
    setGeoLat("{latitude}"); setGeoLng("{longitude}"); setGeoLanguage("en");
    setDataSource("csv"); setLocationData([]); setWebsiteForPages(""); setWebsiteContentType("all");
    setSelectedPageIds(new Set()); setWebsitePagesSearch("");
    setManualMappings({}); setCustomValues({}); setTransforms({}); setTargetFieldMappings({});
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); else onOpenChange(v); }}>
        <DialogContent className="sm:max-w-[640px] w-[calc(100%-1rem)] h-[calc(100dvh-1rem)] sm:h-auto max-h-[calc(100dvh-1rem)] sm:max-h-[85vh] rounded-xl sm:rounded-2xl p-0 gap-0 overflow-hidden fixed top-2 left-2 right-2 bottom-2 sm:inset-auto sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] flex flex-col">
          {/* Header */}
          <div className="px-5 pt-5 pb-0 shrink-0">
            <DialogHeader className="pb-0">
              <DialogTitle className="text-base sm:text-lg font-bold">{t("campaigns.createCampaign")}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">{t("campaigns.description")}</DialogDescription>
            </DialogHeader>
          </div>

          {/* Steps indicator */}
          <div className="px-5 pt-4 pb-2 overflow-x-auto shrink-0">
            <div className="flex items-start justify-between min-w-0">
              {wizardSteps.map((s, i) => (
                <div key={s.num} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center min-w-[32px]">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ring-2 ring-offset-2 ring-offset-background ${
                      step > s.num ? "bg-primary text-primary-foreground ring-primary" :
                      step === s.num ? "bg-primary text-primary-foreground ring-primary shadow-sm" :
                      "bg-muted text-muted-foreground ring-border"
                    }`}>
                      {step > s.num ? <Check className="h-3 w-3" /> : s.num}
                    </div>
                    <span className={`text-[9px] mt-1 font-medium truncate max-w-[40px] text-center ${step >= s.num ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
                  </div>
                  {i < wizardSteps.length - 1 && (
                    <div className="flex-1 px-0.5 -mt-3">
                      <div className={`h-[2px] w-full rounded-full transition-colors ${step > s.num ? "bg-primary" : "bg-border"}`} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="px-5 py-4 min-h-[180px] space-y-4 animate-fade-in">
              {/* Step 1: Basics */}
              {step === 1 && (
                <>
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Campaign Name</Label>
                    <Input placeholder="e.g., Python Training Cities" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} className="rounded-xl h-11" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm font-semibold mb-2 block">Language</Label>
                      <Select value={campaignLanguage} onValueChange={setCampaignLanguage}>
                        <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                        <SelectContent>{LANGUAGES.map(l => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold mb-2 block">Country</Label>
                      <Select value={campaignCountry} onValueChange={setCampaignCountry}>
                        <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                        <SelectContent className="max-h-80">{ALL_COUNTRIES.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}

              {/* Step 2: Type */}
              {step === 2 && (
                <>
                  <Label className="text-sm font-semibold mb-2 block">Campaign Type <span className="text-muted-foreground font-normal">(select one or more)</span></Label>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { value: "seo" as const, label: "SEO", icon: SearchIconLucide, desc: "Organic search pages" },
                      { value: "sea" as const, label: "SEA", icon: Target, desc: "Paid landing pages" },
                      { value: "geo" as const, label: "GEO", icon: MapPin, desc: "Local / geo pages" },
                    ]).map(t => {
                      const isSelected = campaignTypes.includes(t.value);
                      return (
                        <button key={t.value} type="button" onClick={() => toggleCampaignType(t.value)}
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all relative ${
                            isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/30 hover:bg-muted/50"
                          }`}>
                          {isSelected && <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center"><Check className="h-2.5 w-2.5 text-primary-foreground" /></div>}
                          <t.icon className={`h-6 w-6 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                          <span className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}>{t.label}</span>
                          <span className="text-[10px] text-muted-foreground text-center">{t.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Step 3: Data Source */}
              {step === 3 && (
                <>
                  <div className="flex items-center gap-1 p-1 bg-muted rounded-xl">
                    {([
                      { key: "csv" as const, icon: Upload, label: "CSV" },
                      { key: "website" as const, icon: Globe, label: "Website" },
                      { key: "locations" as const, icon: MapPin, label: "Locations" },
                    ]).map(ds => (
                      <button key={ds.key} type="button" onClick={() => setDataSource(ds.key)}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[11px] font-medium transition-all ${
                          dataSource === ds.key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                        }`}>
                        <ds.icon className="h-3.5 w-3.5" /> {ds.label}
                      </button>
                    ))}
                  </div>

                  {dataSource === "csv" && (
                    <>
                      <div
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingCsv(true); }}
                        onDragLeave={() => setIsDraggingCsv(false)}
                        onDrop={handleCsvDrop}
                        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                          isDraggingCsv ? "border-primary bg-primary/5" : csvFile ? "border-success/30 bg-success/5" : "border-border hover:border-primary/40"
                        }`}>
                        <Upload className={`h-8 w-8 mx-auto mb-2 ${csvFile ? "text-success" : "text-muted-foreground/40"}`} />
                        {csvFile ? (
                          <div>
                            <p className="text-sm font-medium">{csvFile.name}</p>
                            <p className="text-xs text-muted-foreground">{csvHeaders.length} columns · {csvData.length} rows</p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm font-medium">Drop CSV file here</p>
                            <p className="text-xs text-muted-foreground">or click to browse</p>
                          </div>
                        )}
                        <input type="file" accept=".csv,.tsv,.txt,.json,.xlsx,.xls,text/csv,application/json,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) processCsvFile(f); }} />
                      </div>
                      {csvData.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          <span className="text-xs text-muted-foreground">Columns:</span>
                          {csvHeaders.map(h => <Badge key={h} variant="secondary" className="text-xs rounded-lg">{h}</Badge>)}
                        </div>
                      )}
                    </>
                  )}

                  {dataSource === "website" && (
                    <>
                      <Select value={websiteForPages} onValueChange={(v) => { setWebsiteForPages(v); setSelectedPageIds(new Set()); }}>
                        <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Select website" /></SelectTrigger>
                        <SelectContent>{websites.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                      </Select>
                      {websiteForPages && (
                        <>
                          <div className="flex items-center gap-1 p-0.5 bg-muted rounded-lg">
                            {(["all", "pages", "products"] as const).map(opt => (
                              <button key={opt} type="button" onClick={() => { setWebsiteContentType(opt); setSelectedPageIds(new Set()); }}
                                className={`flex-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all ${websiteContentType === opt ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}>
                                {opt.charAt(0).toUpperCase() + opt.slice(1)}
                              </button>
                            ))}
                          </div>
                          {loadingWebPages ? (
                            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /><span className="ml-2 text-xs text-muted-foreground">Loading...</span></div>
                          ) : filteredWebPages.length === 0 ? (
                            <div className="text-center py-6 text-muted-foreground"><Globe className="h-8 w-8 mx-auto mb-2 opacity-30" /><p className="text-xs">No content found.</p></div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between">
                                <button type="button" className="text-xs text-primary hover:underline font-medium"
                                  onClick={() => setSelectedPageIds(selectedPageIds.size === filteredWebPages.length ? new Set() : new Set(filteredWebPages.map((p: any) => p.id)))}>
                                  {selectedPageIds.size === filteredWebPages.length ? "Deselect all" : "Select all"}
                                </button>
                                <span className="text-xs text-muted-foreground">{selectedPageIds.size} / {filteredWebPages.length}</span>
                              </div>
                              <ScrollArea className="h-[180px] rounded-xl border border-border">
                                <div className="space-y-0.5 p-1">
                                  {filteredWebPages.map((page: any) => {
                                    const isSelected = selectedPageIds.has(page.id);
                                    return (
                                      <button key={page.id} type="button"
                                        onClick={() => { const next = new Set(selectedPageIds); if (isSelected) next.delete(page.id); else next.add(page.id); setSelectedPageIds(next); }}
                                        className={cn("w-full flex items-start gap-2 px-2.5 py-2 rounded-lg text-left transition-colors", isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50")}>
                                        <Checkbox checked={isSelected} className="shrink-0 pointer-events-none mt-0.5" />
                                        <div className="min-w-0 flex-1">
                                          <p className="text-xs font-medium truncate">{page.title || "(Untitled)"}</p>
                                          <span className="text-[10px] text-muted-foreground">/{page.slug}</span>
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
                              {locationData.length > 0 ? `${locationData.length} cities selected` : "Select cities — no CSV needed"}
                            </p>
                          </div>
                        </div>
                        <Button type="button" variant={locationData.length > 0 ? "outline" : "default"} onClick={() => setLocationDbOpen(true)} className="rounded-xl gap-2">
                          <DatabaseIcon className="h-4 w-4" /> {locationData.length > 0 ? "Change Selection" : "Browse Locations"}
                        </Button>
                      </div>
                      <LocationDatabaseDialog open={locationDbOpen} onOpenChange={setLocationDbOpen} onSelect={rows => setLocationData(rows)} />
                    </>
                  )}
                </>
              )}

              {/* Step 4: Template + Mapping */}
              {step === 4 && (
                <>
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Template</Label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Select template" /></SelectTrigger>
                      <SelectContent>{templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
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
                </>
              )}

              {/* UTM Step */}
              {wizardSteps[step - 1]?.label === "UTM" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1"><Target className="h-4 w-4 text-primary" /><Label className="text-sm font-semibold">Google Ads & UTM</Label></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label className="text-xs">Ad Campaign ID</Label><Input value={adCampaignId} onChange={e => setAdCampaignId(e.target.value)} placeholder="{ad_campaign_id}" className="rounded-xl h-9 text-sm" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Ad Group ID</Label><Input value={adGroupId} onChange={e => setAdGroupId(e.target.value)} placeholder="{ad_group_id}" className="rounded-xl h-9 text-sm" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">utm_source</Label><Input value={utmSource} onChange={e => setUtmSource(e.target.value)} placeholder="google" className="rounded-xl h-9 text-sm" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">utm_medium</Label><Input value={utmMedium} onChange={e => setUtmMedium(e.target.value)} placeholder="cpc" className="rounded-xl h-9 text-sm" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">utm_campaign</Label><Input value={utmCampaign} onChange={e => setUtmCampaign(e.target.value)} placeholder="{campaign_name}" className="rounded-xl h-9 text-sm" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">utm_term</Label><Input value={utmTerm} onChange={e => setUtmTerm(e.target.value)} placeholder="{keyword}" className="rounded-xl h-9 text-sm" /></div>
                    <div className="col-span-2 space-y-1.5"><Label className="text-xs">utm_content</Label><Input value={utmContent} onChange={e => setUtmContent(e.target.value)} placeholder="variant_a" className="rounded-xl h-9 text-sm" /></div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Landing Page Directory</Label>
                    <Input value={seaDirectoryLevels} onChange={e => setSeaDirectoryLevels(e.target.value)} placeholder="e.g. campaign_name, keyword" className="rounded-xl h-9 text-sm" />
                  </div>
                </div>
              )}

              {/* GEO Step */}
              {wizardSteps[step - 1]?.label === "GEO" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1"><MapPin className="h-4 w-4 text-primary" /><Label className="text-sm font-semibold">Geographic Targeting</Label></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label className="text-xs">Country</Label><Input value={geoCountry} onChange={e => setGeoCountry(e.target.value)} className="rounded-xl h-9 text-sm" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Region</Label><Input value={geoRegion} onChange={e => setGeoRegion(e.target.value)} className="rounded-xl h-9 text-sm" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">City</Label><Input value={geoCity} onChange={e => setGeoCity(e.target.value)} className="rounded-xl h-9 text-sm" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Postcode</Label><Input value={geoPostcode} onChange={e => setGeoPostcode(e.target.value)} className="rounded-xl h-9 text-sm" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Latitude</Label><Input value={geoLat} onChange={e => setGeoLat(e.target.value)} className="rounded-xl h-9 text-sm" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Longitude</Label><Input value={geoLng} onChange={e => setGeoLng(e.target.value)} className="rounded-xl h-9 text-sm" /></div>
                    <div className="col-span-2 space-y-1.5">
                      <Label className="text-xs">Language</Label>
                      <Select value={geoLanguage} onValueChange={setGeoLanguage}>
                        <SelectTrigger className="rounded-xl h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{LANGUAGES.map(l => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Website step */}
              {wizardSteps[step - 1]?.label === "Website" && (
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Website (optional)</Label>
                  <Select value={selectedWebsite} onValueChange={setSelectedWebsite}>
                    <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Select website" /></SelectTrigger>
                    <SelectContent>{websites.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-2">Optional — assign later.</p>
                </div>
              )}

              {/* Settings step */}
              {wizardSteps[step - 1]?.label === "Settings" && (
                <div className="space-y-5">
                  <div className="flex items-center gap-2"><Settings2 className="h-4 w-4 text-primary" /><Label className="text-sm font-semibold">Generation Settings</Label></div>

                  {/* Publish Mode */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Publish Mode</Label>
                    <RadioGroup value={publishMode} onValueChange={v => setPublishMode(v as any)} className="flex gap-4">
                      <div className="flex items-center space-x-2"><RadioGroupItem value="draft" id="w-draft" /><Label htmlFor="w-draft" className="text-sm cursor-pointer">Draft</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="published" id="w-pub" /><Label htmlFor="w-pub" className="text-sm cursor-pointer">Published</Label></div>
                    </RadioGroup>
                  </div>

                  {/* Max Rows */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Max Rows</Label>
                    <Input type="number" min="1" value={maxRows} onChange={e => setMaxRows(e.target.value)} placeholder={`All (${effectiveCsvData.length})`} className="rounded-xl h-9 text-sm w-48" />
                  </div>

                  {/* Method */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Method</Label>
                    <RadioGroup value={generationMethod} onValueChange={v => setGenerationMethod(v as any)} className="flex flex-col gap-1.5">
                      <div className="flex items-center space-x-2"><RadioGroupItem value="all" id="m-all" /><Label htmlFor="m-all" className="text-sm cursor-pointer">All Combinations</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="sequential" id="m-seq" /><Label htmlFor="m-seq" className="text-sm cursor-pointer">Sequential</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="random" id="m-rnd" /><Label htmlFor="m-rnd" className="text-sm cursor-pointer">Random</Label></div>
                    </RadioGroup>
                  </div>

                  {/* Schedule */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Schedule</Label>
                    <RadioGroup value={scheduleMode} onValueChange={v => setScheduleMode(v as any)} className="flex flex-wrap gap-4">
                      <div className="flex items-center space-x-2"><RadioGroupItem value="now" id="s-now" /><Label htmlFor="s-now" className="text-sm cursor-pointer">Run now</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="later" id="s-later" /><Label htmlFor="s-later" className="text-sm cursor-pointer">Schedule</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="recurring" id="s-rec" /><Label htmlFor="s-rec" className="text-sm cursor-pointer">Recurring</Label></div>
                    </RadioGroup>
                    {(scheduleMode === "later" || scheduleMode === "recurring") && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-60 justify-start text-left font-normal rounded-xl h-9 text-sm", !scheduledDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={scheduledDate} onSelect={setScheduledDate} disabled={d => d < new Date()} initialFocus className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    )}
                    {scheduleMode === "recurring" && (
                      <Select value={recurringInterval} onValueChange={v => setRecurringInterval(v as any)}>
                        <SelectTrigger className="w-48 h-9 text-sm rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="biweekly">Bi-weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* SEO Title Format */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">SEO Title Format</Label>
                    <Select value={seoTitleFormat} onValueChange={setSeoTitleFormat}>
                      <SelectTrigger className="rounded-xl h-9 text-sm w-full sm:w-72"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="{title} | {brand}">{"{title} | {brand}"}</SelectItem>
                        <SelectItem value="{brand} - {title}">{"{brand} - {title}"}</SelectItem>
                        <SelectItem value="{title}">{"{title}"} (no brand)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Summary */}
                  <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-1.5 text-xs">
                    <h4 className="text-sm font-semibold mb-2">Summary</h4>
                    <div className="flex justify-between"><span className="text-muted-foreground">Data</span><span className="font-medium capitalize">{dataSource}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Rows</span><span className="font-medium">{maxRows ? `${maxRows} / ${effectiveCsvData.length}` : effectiveCsvData.length}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Template</span><span className="font-medium">{templates.find(t => t.id === selectedTemplate)?.name || "None"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium uppercase">{campaignTypes.join(" + ")}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Publish</span><span className="font-medium capitalize">{publishMode}</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between px-5 py-4 border-t border-border bg-muted/30 shrink-0">
            <Button variant="outline" onClick={() => step === 1 ? resetForm() : setStep(step - 1)} className="rounded-xl h-10 px-5">
              {step === 1 ? "Cancel" : "Back"}
            </Button>
            {step < totalSteps ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed()} className="rounded-xl h-10 px-5 bg-gradient-primary hover:brightness-110">
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleTestOnePage} disabled={!selectedTemplate || effectiveCsvData.length === 0 || testGenerating} className="rounded-xl h-10 px-4">
                  {testGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testing...</> : <><Eye className="mr-2 h-4 w-4" /> Test</>}
                </Button>
                <Button onClick={() => createMutation.mutate()} disabled={!campaignName || createMutation.isPending} className="rounded-xl h-10 px-5 bg-gradient-primary hover:brightness-110">
                  {createMutation.isPending ? "Creating..." : scheduleMode !== "now" ? "Schedule" : publishMode === "published" ? "Generate & Publish" : "Create Campaign"}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <TestPagePreviewDialog open={testPreviewOpen} onOpenChange={setTestPreviewOpen} result={testPreviewResult} />
    </>
  );
}
