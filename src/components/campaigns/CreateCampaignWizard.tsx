import { useState, useMemo, useCallback, useEffect, useRef } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { LocationDatabaseDialog } from "@/components/campaigns/LocationDatabaseDialog";
import { TestPagePreviewDialog } from "@/components/campaigns/TestPagePreviewDialog";
import { MappingStep } from "@/components/campaigns/MappingStep";
import { FillRulesPanel } from "@/components/campaigns/FillRulesPanel";
import { downloadStarterCsv } from "@/lib/csv-starter";
import { readAiPresets, saveAiPreset, deleteAiPreset, type AiPreset } from "@/lib/ai-presets";
import {
  VIBE_PALETTES, VIBE_TYPOGRAPHIES, VIBE_DENSITIES, DEFAULT_VIBE,
  parseCustomVarsInput,
  type VibePalette, type VibeTypography, type VibeDensity,
} from "@/lib/vibe-theme";
import { validateVibeForTemplate, computeSafestVibe, type VibeWarning } from "@/lib/vibe-validator";
import { COMMUNITY_TEMPLATES } from "@/lib/marketplace-templates";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { renderPage, type RenderResult, type TemplateConfig, type RenderContext } from "@/lib/renderer";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { isDesignVariable } from "@/lib/design-vars-filter";
import {
  Plus, Upload, ArrowRight, Check, AlertTriangle, Play, Loader2, Eye,
  MapPin, Target, Search as SearchIconLucide, Layers, CalendarIcon,
  Settings2, Globe, Database as DatabaseIcon, Sparkles, Wand2, Info,
  CheckCircle2, XCircle, Lightbulb, ArrowLeft, Bookmark, Trash2, Save,
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
  const [dataSource, setDataSource] = useState<"csv" | "ai" | "website" | "locations">("csv");
  // AI bulk row generation
  const [aiBusiness, setAiBusiness] = useState("");
  const [aiNiche, setAiNiche] = useState("");
  const [aiServiceProduct, setAiServiceProduct] = useState("");
  const [aiPageCount, setAiPageCount] = useState(20);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGeneratedRows, setAiGeneratedRows] = useState<Record<string, string>[]>([]);
  const [aiPresets, setAiPresets] = useState<AiPreset[]>(() => readAiPresets());
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [savePresetOpen, setSavePresetOpen] = useState(false);
  const [presetNameDraft, setPresetNameDraft] = useState("");
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
  const [faqPairs, setFaqPairs] = useState<import("./FaqMappingPanel").FaqPair[]>([]);
  const [fillRules, setFillRules] = useState<Record<string, import("./FillRulesPanel").FillRule>>({});
  const [aiFillMode, setAiFillMode] = useState<"per_campaign" | "per_row">("per_campaign");
  // AI vibe theme — palette + typography + density override applied at
  // generation time so a single template can adopt many distinct looks.
  const [vibePalette, setVibePalette] = useState<VibePalette>(DEFAULT_VIBE.palette);
  const [vibeTypography, setVibeTypography] = useState<VibeTypography>(DEFAULT_VIBE.typography);
  const [vibeDensity, setVibeDensity] = useState<VibeDensity>(DEFAULT_VIBE.density);
  // Optional brand overrides — emitted after the preset block so they win.
  // `vibeCustomVarsText` is parsed `key: value` lines into a map at save time.
  const [vibeCustomVarsText, setVibeCustomVarsText] = useState<string>("");
  const [vibeCustomCss, setVibeCustomCss] = useState<string>("");
  const [vibeAdvancedOpen, setVibeAdvancedOpen] = useState<boolean>(false);

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

  // AI states
  const [aiSuggestingName, setAiSuggestingName] = useState(false);
  const [aiNameSuggestions, setAiNameSuggestions] = useState<string[]>([]);
  const [aiReadinessCheck, setAiReadinessCheck] = useState<any>(null);
  const [aiCheckingReadiness, setAiCheckingReadiness] = useState(false);

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

  const selectedTemplateVars = useMemo(() => {
    if (!selectedTemplate) return [];
    const tpl = templates.find(t => t.id === selectedTemplate);
    if (!tpl?.variables) return [];
    return (tpl.variables as string[]).map(v => v.replace(/[{}]/g, "")).filter(v => !isDesignVariable(v));
  }, [selectedTemplate, templates]);

  // Vibe validator — runs on every change of template/palette/typography/density
  // and surfaces clash warnings + one-click fixes inside the vibe panel.
  const vibeValidation = useMemo(() => {
    if (!selectedTemplate) return { warnings: [] as VibeWarning[], hasBlockingIssue: false };
    const tpl = templates.find(t => t.id === selectedTemplate);
    if (!tpl) return { warnings: [], hasBlockingIssue: false };
    // DB templates don't store category — try to enrich from the marketplace
    // catalog by matching name (best-effort, no-op when nothing matches).
    const marketplaceMatch = COMMUNITY_TEMPLATES.find(m => m.name === (tpl as { name?: string }).name);
    return validateVibeForTemplate({
      templateContent: (tpl as { content?: string }).content || "",
      templateCategory: marketplaceMatch?.category ?? null,
      templateTags: marketplaceMatch?.tags ?? null,
      palette: vibePalette,
      typography: vibeTypography,
      density: vibeDensity,
    });
  }, [selectedTemplate, templates, vibePalette, vibeTypography, vibeDensity]);

  const effectiveCsvData =
    dataSource === "website" ? websitePagesAsCsv.rows :
    dataSource === "locations" ? locationData :
    dataSource === "ai" ? aiGeneratedRows :
    csvData;
  const effectiveCsvHeaders =
    dataSource === "website" ? websitePagesAsCsv.headers :
    dataSource === "locations" ? locationHeaders :
    dataSource === "ai" ? (selectedTemplateVars.length > 0 ? selectedTemplateVars : Object.keys(aiGeneratedRows[0] || {})) :
    csvHeaders;

  // Auto-clear FAQ pairs whenever the underlying CSV/data-source signature changes,
  // so users don't accidentally carry mappings from a previous CSV into a new upload.
  // We track a stable signature (sorted headers + dataSource) and skip the very first
  // run so that loading an existing draft / opening the wizard doesn't wipe state.
  const headersSignature = useMemo(
    () => `${dataSource}:${[...effectiveCsvHeaders].sort().join("|")}`,
    [dataSource, effectiveCsvHeaders],
  );
  const lastHeadersSignatureRef = useRef<string | null>(null);
  useEffect(() => {
    if (lastHeadersSignatureRef.current === null) {
      lastHeadersSignatureRef.current = headersSignature;
      return;
    }
    if (lastHeadersSignatureRef.current !== headersSignature) {
      lastHeadersSignatureRef.current = headersSignature;
      setFaqPairs((prev) => (prev.length > 0 ? [] : prev));
    }
  }, [headersSignature]);

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
      { num: 1, label: "Basics", icon: Layers },
      { num: 2, label: "Data", icon: Upload },
      { num: 3, label: "Template", icon: Layers },
    ];
    let nextNum = 4;
    if (campaignTypes.includes("sea")) steps.push({ num: nextNum++, label: "UTM", icon: Target });
    if (campaignTypes.includes("geo")) steps.push({ num: nextNum++, label: "GEO", icon: MapPin });
    steps.push({ num: nextNum++, label: "Review", icon: CheckCircle2 });
    return steps;
  };

  const wizardSteps = getWizardSteps();
  const totalSteps = wizardSteps.length;

  const canProceed = () => {
    if (step === 1) return !!campaignName && !!selectedTemplate;
    if (step === 2) {
      if (dataSource === "csv") return csvData.length > 0;
      if (dataSource === "locations") return locationData.length > 0;
      if (dataSource === "ai") return aiGeneratedRows.length > 0;
      return selectedPageIds.size > 0;
    }
    if (step === 3) return !!selectedTemplate;
    return true;
  };

  // --- AI bulk row generation ---
  const generateAiRows = async () => {
    if (!selectedTemplate) {
      toast({ title: "Pick a template first", description: "Templates define which variables AI should fill.", variant: "destructive" });
      return;
    }
    if (selectedTemplateVars.length === 0) {
      toast({ title: "This template has no variables", description: "Add variables to the template first.", variant: "destructive" });
      return;
    }
    setAiGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate-rows", {
        body: {
          variables: selectedTemplateVars,
          count: Math.max(1, Math.min(200, aiPageCount)),
          business: aiBusiness || undefined,
          niche: aiNiche || undefined,
          service: aiServiceProduct || undefined,
          language: campaignLanguage,
          country: campaignCountry,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const rows = Array.isArray(data?.rows) ? data.rows : [];
      if (rows.length === 0) throw new Error("AI returned no rows");
      setAiGeneratedRows(rows);
      toast({ title: `Generated ${rows.length} rows`, description: "Edit any cell below before continuing." });
    } catch (err: any) {
      toast({ title: "AI generation failed", description: friendlyError(err.message), variant: "destructive" });
    } finally {
      setAiGenerating(false);
    }
  };

  const suggestCampaignName = async () => {
    setAiSuggestingName(true);
    try {
      const tpl = templates.find(t => t.id === selectedTemplate);
      const { data, error } = await supabase.functions.invoke("ai-campaign-assistant", {
        body: {
          action: "suggest_name",
          context: {
            template_name: tpl?.name || "",
            csv_headers: effectiveCsvHeaders,
            campaign_type: campaignTypes.join("+"),
            language: campaignLanguage,
            sample_row: effectiveCsvData[0] || {},
          },
        },
      });
      if (error) throw error;
      const parsed = JSON.parse(data.result);
      setAiNameSuggestions(Array.isArray(parsed) ? parsed : []);
    } catch (err: any) {
      toast({ title: "AI suggestion failed", description: err.message, variant: "destructive" });
    } finally {
      setAiSuggestingName(false);
    }
  };

  const runReadinessCheck = async () => {
    setAiCheckingReadiness(true);
    try {
      const tpl = templates.find(t => t.id === selectedTemplate);
      const unmappedVars = variableMapping?.matched.filter(m => !m.column && !m.customValue).map(m => m.variable) || [];
      const mappedVars: Record<string, string> = {};
      variableMapping?.matched.forEach(m => {
        if (m.column) mappedVars[m.variable] = m.column;
        else if (m.customValue) mappedVars[m.variable] = `custom: ${m.customValue}`;
      });
      const ws = websites.find(w => w.id === (selectedWebsite || websiteForPages));
      const { data, error } = await supabase.functions.invoke("ai-campaign-assistant", {
        body: {
          action: "readiness_check",
          context: {
            name: campaignName,
            template_name: tpl?.name || "",
            row_count: effectiveCsvData.length,
            csv_headers: effectiveCsvHeaders,
            mapped_vars: mappedVars,
            unmapped_vars: unmappedVars,
            campaign_types: campaignTypes,
            website_name: ws?.name || "",
            publish_mode: publishMode,
            seo_title_pattern: tpl?.seo_title_pattern || "",
            seo_description_pattern: tpl?.seo_description_pattern || "",
          },
        },
      });
      if (error) throw error;
      const parsed = JSON.parse(data.result);
      setAiReadinessCheck(parsed);
    } catch (err: any) {
      toast({ title: "Readiness check failed", description: err.message, variant: "destructive" });
    } finally {
      setAiCheckingReadiness(false);
    }
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
        mapping: {
          seo_title_format: seoTitleFormat,
          // Only persist FAQ pairs that have BOTH a question and answer column.
          faq_pairs: faqPairs.filter((p) => p.question && p.answer),
          // AI context — used by generate-pages to auto-fill unmapped template
          // variables when the CSV doesn't provide a value for them.
          ai_context: {
            business: aiBusiness || "",
            niche: aiNiche || "",
            service: aiServiceProduct || "",
          },
          // Per-variable rules controlling CSV vs AI fill behavior.
          fill_rules: fillRules,
          // Whether AI defaults should be generated once per campaign (cheap,
          // same value for every row) or once per CSV row (richer per-row
          // results that incorporate that row's data — costs 1 AI call/row).
          ai_fill_mode: aiFillMode,
          // Vibe theme — applied as a CSS override on top of BASE_STYLES at
          // generation time so this campaign's pages adopt the chosen palette,
          // typography mood, and layout density.
          vibe_theme: {
            palette: vibePalette,
            typography: vibeTypography,
            density: vibeDensity,
            // Optional brand overrides — only persisted when non-empty so the
            // edge function can fast-path default themes.
            customVars: (() => {
              const parsed = parseCustomVarsInput(vibeCustomVarsText);
              return Object.keys(parsed).length ? parsed : undefined;
            })(),
            customCss: vibeCustomCss.trim() || undefined,
          },
        } as any,
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
          file_name: dataSource === "csv" ? (csvFile?.name || "data.csv") : dataSource === "locations" ? "locations.csv" : dataSource === "ai" ? "ai-generated.csv" : "website-pages.csv",
          file_size: rawContent.length, raw_content: rawContent,
          headers: effectiveCsvHeaders as any, row_count: effectiveRowCount,
        });

        await supabase.from("data_sources").insert({
          campaign_id: campaignId, workspace_id: wsId, user_id: user.id,
          type: dataSource,
          file_name: dataSource === "csv" ? (csvFile?.name || "data.csv") : dataSource === "locations" ? "locations" : dataSource === "ai" ? "ai-generated" : "website-pages",
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
      // Auto-trigger generation if scheduled for "now" (not later/recurring)
      const shouldRunNow = scheduleMode === "now" && campaignId;
      if (shouldRunNow) {
        try {
          await supabase.functions.invoke("generate-pages", { body: { campaign_id: campaignId } });
        } catch (e) {
          console.warn("Auto-trigger generate-pages failed (campaign saved, can run manually):", e);
        }
      }
      return campaignId;
    },
    onSuccess: (campaignId) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      const ranNow = scheduleMode === "now";
      toast({
        title: ranNow ? "Campaign started" : "Campaign created",
        description: ranNow
          ? `"${campaignName}" is now generating pages.`
          : `"${campaignName}" has been saved.`,
      });
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
    setAiNameSuggestions([]); setAiReadinessCheck(null);
    setAiBusiness(""); setAiNiche(""); setAiServiceProduct(""); setAiPageCount(20); setAiGeneratedRows([]);
    setActivePresetId(null);
    setVibePalette(DEFAULT_VIBE.palette); setVibeTypography(DEFAULT_VIBE.typography); setVibeDensity(DEFAULT_VIBE.density);
    setVibeCustomVarsText(""); setVibeCustomCss(""); setVibeAdvancedOpen(false);
  };

  // --- AI preset helpers ---
  const applyPreset = (preset: AiPreset) => {
    setAiBusiness(preset.business);
    setAiNiche(preset.niche);
    setAiServiceProduct(preset.service);
    setAiPageCount(preset.pageCount);
    if (preset.language) setCampaignLanguage(preset.language);
    if (preset.country) setCampaignCountry(preset.country);
    setActivePresetId(preset.id);
    toast({ title: "Preset loaded", description: preset.name });
  };

  const handleSavePreset = () => {
    const name = presetNameDraft.trim();
    if (!name) {
      toast({ title: "Name required", description: "Give your preset a memorable name.", variant: "destructive" });
      return;
    }
    const saved = saveAiPreset({
      id: activePresetId ?? undefined,
      name,
      business: aiBusiness,
      niche: aiNiche,
      service: aiServiceProduct,
      pageCount: aiPageCount,
      language: campaignLanguage,
      country: campaignCountry,
    });
    setAiPresets(readAiPresets());
    setActivePresetId(saved.id);
    setSavePresetOpen(false);
    setPresetNameDraft("");
    toast({ title: "Preset saved", description: `"${saved.name}" is ready to reload anytime.` });
  };

  const handleDeletePreset = (id: string, name: string) => {
    deleteAiPreset(id);
    setAiPresets(readAiPresets());
    if (activePresetId === id) setActivePresetId(null);
    toast({ title: "Preset removed", description: name });
  };

  // Readiness stats for review step
  const readinessItems = useMemo(() => {
    const items: { label: string; status: "ok" | "warn" | "error"; detail: string }[] = [];
    items.push({ label: "Campaign Name", status: campaignName ? "ok" : "error", detail: campaignName || "Not set" });
    items.push({ label: "Data Source", status: effectiveCsvData.length > 0 ? "ok" : "error", detail: `${effectiveCsvData.length} rows from ${dataSource}` });
    items.push({ label: "Template", status: selectedTemplate ? "ok" : "error", detail: templates.find(t => t.id === selectedTemplate)?.name || "Not selected" });
    
    const unmapped = variableMapping?.matched.filter(m => !m.column && !m.customValue) || [];
    items.push({ label: "Variable Mapping", status: unmapped.length === 0 ? "ok" : unmapped.length <= 2 ? "warn" : "error", detail: unmapped.length === 0 ? "All mapped" : `${unmapped.length} unmapped` });
    
    const tpl = templates.find(t => t.id === selectedTemplate);
    items.push({ label: "SEO Title Pattern", status: tpl?.seo_title_pattern ? "ok" : "warn", detail: tpl?.seo_title_pattern || "Using default" });
    items.push({ label: "Website", status: (selectedWebsite || websiteForPages) ? "ok" : "warn", detail: websites.find(w => w.id === (selectedWebsite || websiteForPages))?.name || "Not assigned" });
    
    return items;
  }, [campaignName, effectiveCsvData, dataSource, selectedTemplate, templates, variableMapping, selectedWebsite, websiteForPages, websites]);

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); else onOpenChange(v); }}>
        <DialogContent className="sm:max-w-[680px] w-[calc(100%-1rem)] h-[calc(100dvh-1rem)] sm:h-auto max-h-[calc(100dvh-1rem)] sm:max-h-[85vh] rounded-xl sm:rounded-2xl p-0 gap-0 overflow-hidden fixed top-2 left-2 right-2 bottom-2 sm:inset-auto sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] flex flex-col">
          {/* Header */}
          <div className="px-5 pt-5 pb-0 shrink-0">
            <DialogHeader className="pb-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-bold">{t("campaigns.createCampaign")}</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">Step {step} of {totalSteps} — {wizardSteps[step - 1]?.label}</DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          {/* Steps indicator - compact pills */}
          <div className="px-5 pt-3 pb-2 shrink-0">
            <div className="flex items-center gap-1">
              {wizardSteps.map((s, i) => (
                <div key={s.num} className="flex items-center flex-1 last:flex-none">
                  <button
                    type="button"
                    onClick={() => { if (s.num < step) setStep(s.num); }}
                    className={cn(
                      "h-2 flex-1 rounded-full transition-all",
                      step > s.num ? "bg-primary cursor-pointer" :
                      step === s.num ? "bg-primary" :
                      "bg-border"
                    )}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-1.5">
              {wizardSteps.map(s => (
                <span key={s.num} className={cn("text-[9px] font-medium", step >= s.num ? "text-foreground" : "text-muted-foreground/50")}>{s.label}</span>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="px-5 py-4 min-h-[180px] space-y-4 animate-fade-in">
              {/* Step 1: Basics + Type (combined) */}
              {step === 1 && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">Campaign Name</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1.5 text-primary"
                        onClick={suggestCampaignName}
                        disabled={aiSuggestingName}
                      >
                        {aiSuggestingName ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                        AI Suggest
                      </Button>
                    </div>
                    <Input placeholder="e.g., Python Training Cities" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} className="rounded-xl h-11" />
                    {aiNameSuggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {aiNameSuggestions.map((name, i) => (
                          <button key={i} type="button" onClick={() => { setCampaignName(name); setAiNameSuggestions([]); }}
                            className="px-3 py-1.5 rounded-lg border border-primary/20 bg-primary/5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors">
                            {name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Campaign Type inline */}
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Campaign Type</Label>
                    <div className="flex gap-2">
                      {([
                        { value: "seo" as const, label: "SEO", icon: SearchIconLucide, color: "text-emerald-600" },
                        { value: "sea" as const, label: "SEA", icon: Target, color: "text-blue-600" },
                        { value: "geo" as const, label: "GEO", icon: MapPin, color: "text-orange-600" },
                      ]).map(t => {
                        const isSelected = campaignTypes.includes(t.value);
                        return (
                          <button key={t.value} type="button" onClick={() => toggleCampaignType(t.value)}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all relative",
                              isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/30"
                            )}>
                            {isSelected && <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center"><Check className="h-2.5 w-2.5 text-primary-foreground" /></div>}
                            <t.icon className={cn("h-4 w-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                            <span className={cn("text-sm font-semibold", isSelected ? "text-primary" : "text-foreground")}>{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-medium mb-1.5 block">Language</Label>
                      <Select value={campaignLanguage} onValueChange={setCampaignLanguage}>
                        <SelectTrigger className="rounded-xl h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>{LANGUAGES.map(l => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-medium mb-1.5 block">Country</Label>
                      <Select value={campaignCountry} onValueChange={setCampaignCountry}>
                        <SelectTrigger className="rounded-xl h-10"><SelectValue /></SelectTrigger>
                        <SelectContent className="max-h-80">{ALL_COUNTRIES.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Template selection — moved up so users see required variables before picking data */}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-primary" />
                      <Label className="text-sm font-semibold">Choose Template</Label>
                      <span className="text-[10px] text-muted-foreground ml-auto">required</span>
                    </div>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger className="rounded-xl h-10 bg-background"><SelectValue placeholder="Pick the template these pages will use" /></SelectTrigger>
                      <SelectContent>{templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                    </Select>

                    {selectedTemplate && (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Info className="h-3 w-3" />
                          {selectedTemplateVars.length > 0
                            ? <>Each page needs values for these <strong className="text-foreground">{selectedTemplateVars.length}</strong> variables:</>
                            : <>This template has no variables — every page will be identical.</>}
                        </p>
                        {selectedTemplateVars.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {selectedTemplateVars.map(v => (
                              <Badge key={v} variant="secondary" className="text-[10px] rounded-md font-mono">{`{${v}}`}</Badge>
                            ))}
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px] text-primary hover:text-primary"
                          onClick={() => {
                            const tpl = templates.find(t => t.id === selectedTemplate);
                            if (tpl) downloadStarterCsv({ templateName: tpl.name, variables: (tpl.variables as string[]) || [] });
                          }}
                        >
                          <Upload className="h-3 w-3 mr-1 rotate-180" />
                          Download starter CSV with these columns
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Website selection inline */}
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">Publish to Website <span className="text-muted-foreground">(optional)</span></Label>
                    <Select value={selectedWebsite} onValueChange={setSelectedWebsite}>
                      <SelectTrigger className="rounded-xl h-10"><SelectValue placeholder="Select website" /></SelectTrigger>
                      <SelectContent>{websites.map(w => <SelectItem key={w.id} value={w.id}>{w.name} ({w.type})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Step 2: Data Source */}
              {step === 2 && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 bg-muted rounded-xl">
                    {([
                      { key: "ai" as const, icon: Sparkles, label: "AI Generate" },
                      { key: "csv" as const, icon: Upload, label: "CSV / Excel" },
                      { key: "website" as const, icon: Globe, label: "Website" },
                      { key: "locations" as const, icon: MapPin, label: "Locations" },
                    ]).map(ds => (
                      <button key={ds.key} type="button" onClick={() => setDataSource(ds.key)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg text-xs font-medium transition-all",
                          dataSource === ds.key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}>
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
                        className={cn(
                          "relative border-2 border-dashed rounded-xl p-8 text-center transition-all",
                          isDraggingCsv ? "border-primary bg-primary/5" : csvFile ? "border-success/30 bg-success/5" : "border-border hover:border-primary/40"
                        )}>
                        {csvFile ? (
                          <div className="space-y-1">
                            <CheckCircle2 className="h-8 w-8 mx-auto text-success" />
                            <p className="text-sm font-medium">{csvFile.name}</p>
                            <p className="text-xs text-muted-foreground">{csvHeaders.length} columns · {csvData.length} rows</p>
                            <Button type="button" variant="ghost" size="sm" className="mt-2 text-xs text-muted-foreground" onClick={() => { setCsvFile(null); setCsvHeaders([]); setCsvData([]); setCsvRawText(""); }}>
                              Remove & re-upload
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Upload className="h-10 w-10 mx-auto text-muted-foreground/30" />
                            <p className="text-sm font-medium">Drop your file here</p>
                            <p className="text-[11px] text-muted-foreground">Supports CSV, JSON, Excel (.xlsx, .xls)</p>
                          </div>
                        )}
                        <input type="file" accept=".csv,.tsv,.txt,.json,.xlsx,.xls,text/csv,application/json,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) processCsvFile(f); }} />
                      </div>

                      {/* Don't have a CSV? Download starter */}
                      {!csvFile && templates.length > 0 && (
                        <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3 flex items-start gap-3">
                          <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <p className="text-xs font-medium">Don't have a CSV ready?</p>
                            <p className="text-[11px] text-muted-foreground">
                              Pick a template and we'll generate a starter file with the right columns and an example row. Just fill it in Excel/Sheets and upload it back.
                            </p>
                            <div className="flex items-center gap-2 pt-1">
                              <Select
                                value={selectedTemplate || ""}
                                onValueChange={(v) => {
                                  setSelectedTemplate(v);
                                  const tpl = templates.find(t => t.id === v);
                                  if (tpl) downloadStarterCsv({ templateName: tpl.name, variables: (tpl.variables as string[]) || [] });
                                }}
                              >
                                <SelectTrigger className="h-8 text-xs rounded-lg flex-1"><SelectValue placeholder="Choose template to download starter" /></SelectTrigger>
                                <SelectContent>{templates.map(t => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      )}

                      {csvData.length > 0 && (
                        <div className="rounded-xl border border-border bg-muted/30 p-3">
                          <p className="text-xs font-medium mb-2">Detected Columns</p>
                          <div className="flex flex-wrap gap-1.5">
                            {csvHeaders.map(h => <Badge key={h} variant="secondary" className="text-xs rounded-lg">{h}</Badge>)}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {dataSource === "ai" && (
                    <>
                      {!selectedTemplate ? (
                        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 flex items-start gap-2.5">
                          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="text-xs font-medium">Pick a template first</p>
                            <p className="text-[11px] text-muted-foreground">Go back to <strong>Step 1</strong> and choose a template — its variables tell the AI exactly what to fill.</p>
                          </div>
                        </div>
                      ) : selectedTemplateVars.length === 0 ? (
                        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-xs text-muted-foreground">
                          This template has no variables, so AI generation isn't useful. Switch to CSV/Excel or pick a different template.
                        </div>
                      ) : (
                        <>
                          <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-3 space-y-3">
                            <div className="flex items-start gap-2">
                              <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                              <div className="text-[11px] text-muted-foreground flex-1">
                                Tell us about your business and we'll fill the <strong className="text-foreground">{selectedTemplateVars.length}</strong> template variables for as many pages as you need.
                              </div>
                            </div>

                            {/* Presets toolbar */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg text-[11px] gap-1.5">
                                    <Bookmark className="h-3.5 w-3.5" />
                                    {activePresetId
                                      ? aiPresets.find((p) => p.id === activePresetId)?.name ?? "Presets"
                                      : `Presets${aiPresets.length ? ` (${aiPresets.length})` : ""}`}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-72">
                                  <DropdownMenuLabel className="text-[11px]">Saved AI presets</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {aiPresets.length === 0 ? (
                                    <div className="px-2 py-3 text-[11px] text-muted-foreground">
                                      No presets yet. Fill the fields below and click "Save preset" to reuse later.
                                    </div>
                                  ) : (
                                    aiPresets.map((preset) => (
                                      <DropdownMenuItem
                                        key={preset.id}
                                        onSelect={(e) => { e.preventDefault(); applyPreset(preset); }}
                                        className="flex items-start gap-2 group"
                                      >
                                        <div className="flex-1 min-w-0">
                                          <div className="text-xs font-medium truncate">{preset.name}</div>
                                          <div className="text-[10px] text-muted-foreground truncate">
                                            {[preset.business, preset.niche, preset.service].filter(Boolean).join(" • ") || "Empty preset"}
                                          </div>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); handleDeletePreset(preset.id, preset.name); }}
                                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                                          aria-label={`Delete ${preset.name}`}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </DropdownMenuItem>
                                    ))
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>

                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-lg text-[11px] gap-1.5"
                                onClick={() => {
                                  const active = activePresetId ? aiPresets.find((p) => p.id === activePresetId) : null;
                                  setPresetNameDraft(active?.name ?? aiBusiness ?? "");
                                  setSavePresetOpen(true);
                                }}
                                disabled={!aiBusiness && !aiNiche && !aiServiceProduct}
                              >
                                <Save className="h-3.5 w-3.5" />
                                {activePresetId ? "Update preset" : "Save preset"}
                              </Button>

                              {activePresetId && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 rounded-lg text-[11px] text-muted-foreground"
                                  onClick={() => setActivePresetId(null)}
                                >
                                  Clear
                                </Button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div>
                                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 block">Business / Brand</Label>
                                <Input value={aiBusiness} onChange={(e) => setAiBusiness(e.target.value)} placeholder="Acme Plumbing" className="h-9 rounded-lg text-xs" />
                              </div>
                              <div>
                                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 block">Niche / Industry</Label>
                                <Input value={aiNiche} onChange={(e) => setAiNiche(e.target.value)} placeholder="Home services" className="h-9 rounded-lg text-xs" />
                              </div>
                              <div>
                                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 block">Service / Product</Label>
                                <Input value={aiServiceProduct} onChange={(e) => setAiServiceProduct(e.target.value)} placeholder="Emergency plumbing" className="h-9 rounded-lg text-xs" />
                              </div>
                            </div>
                            <div className="flex items-end gap-2">
                              <div className="flex-1">
                                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 block">Pages to generate</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  max={200}
                                  value={aiPageCount}
                                  onChange={(e) => setAiPageCount(Math.max(1, Math.min(200, parseInt(e.target.value) || 1)))}
                                  className="h-9 rounded-lg text-xs"
                                />
                              </div>
                              <Button type="button" onClick={generateAiRows} disabled={aiGenerating} className="h-9 rounded-lg text-xs gap-1.5">
                                {aiGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                                {aiGeneratedRows.length > 0 ? "Regenerate" : "Generate rows"}
                              </Button>
                            </div>
                            <p className="text-[10px] text-muted-foreground">Max 200 per call. AI uses {campaignLanguage.toUpperCase()} • {campaignCountry}.</p>
                          </div>

                          {aiGeneratedRows.length > 0 && (
                            <div className="rounded-xl border border-success/30 bg-success/5 p-3 space-y-2">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-success" />
                                <p className="text-xs font-medium">{aiGeneratedRows.length} rows ready</p>
                                <span className="ml-auto text-[10px] text-muted-foreground">Click any cell to edit</span>
                              </div>
                              <ScrollArea className="h-[220px] rounded-lg border border-border bg-background">
                                <table className="w-full text-[11px]">
                                  <thead className="sticky top-0 bg-muted/80 backdrop-blur z-10">
                                    <tr>
                                      <th className="text-[10px] font-medium text-muted-foreground px-2 py-1.5 text-left w-8">#</th>
                                      {selectedTemplateVars.map(v => (
                                        <th key={v} className="text-[10px] font-medium text-muted-foreground px-2 py-1.5 text-left whitespace-nowrap">{v}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {aiGeneratedRows.map((row, ri) => (
                                      <tr key={ri} className="border-t border-border/50 hover:bg-muted/30">
                                        <td className="px-2 py-1 text-muted-foreground tabular-nums">{ri + 1}</td>
                                        {selectedTemplateVars.map(v => (
                                          <td key={v} className="px-1 py-0.5">
                                            <input
                                              value={row[v] || ""}
                                              onChange={(e) => {
                                                const next = [...aiGeneratedRows];
                                                next[ri] = { ...next[ri], [v]: e.target.value };
                                                setAiGeneratedRows(next);
                                              }}
                                              className="w-full bg-transparent border-none outline-none focus:bg-background focus:ring-1 focus:ring-primary rounded px-1.5 py-1 min-w-[120px]"
                                            />
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </ScrollArea>
                            </div>
                          )}
                        </>
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
                                className={cn("flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all", websiteContentType === opt ? "bg-card shadow-sm text-foreground" : "text-muted-foreground")}>
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

              {/* Step 3: Template + Mapping */}
              {step === 3 && (
                <>
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Template</Label>
                    {templates.length === 0 ? (
                      <div className="rounded-xl border-2 border-dashed border-border p-6 text-center">
                        <Layers className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">No templates yet</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Create a template first from the Templates page</p>
                      </div>
                    ) : (
                      <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                        <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Select template" /></SelectTrigger>
                        <SelectContent>{templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                      </Select>
                    )}
                  </div>
                  {/* AI vibe theme — palette + typography mood + layout density.
                      Applied as a CSS override at generation time so the same
                      template can adopt many distinct looks per campaign. */}
                  {selectedTemplate && (
                    <div className="rounded-xl border border-border/60 bg-background/60 p-3 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold flex items-center gap-1.5">
                            <Wand2 className="h-3.5 w-3.5 text-primary" />
                            AI vibe theme
                          </p>
                          <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                            Customize the marketplace template look — palette, typography mood, and layout density. Applied to every page in this campaign.
                          </p>
                        </div>
                        {(vibePalette !== DEFAULT_VIBE.palette || vibeTypography !== DEFAULT_VIBE.typography || vibeDensity !== DEFAULT_VIBE.density || vibeCustomVarsText.trim() || vibeCustomCss.trim()) && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px] shrink-0"
                            onClick={() => {
                              setVibePalette(DEFAULT_VIBE.palette);
                              setVibeTypography(DEFAULT_VIBE.typography);
                              setVibeDensity(DEFAULT_VIBE.density);
                              setVibeCustomVarsText("");
                              setVibeCustomCss("");
                            }}
                          >
                            Reset
                          </Button>
                        )}
                      </div>

                      {/* Palette */}
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-medium text-muted-foreground">Color palette</Label>
                        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                          {VIBE_PALETTES.map((p) => (
                            <button
                              key={p.value}
                              type="button"
                              onClick={() => setVibePalette(p.value)}
                              title={p.label}
                              aria-label={`${p.label} palette`}
                              aria-pressed={vibePalette === p.value}
                              className={`group relative h-10 rounded-lg border-2 transition-all overflow-hidden ${vibePalette === p.value ? "border-primary ring-2 ring-primary/30 scale-[1.04]" : "border-border/40 hover:border-primary/50"}`}
                              style={{ background: p.swatch }}
                            >
                              {vibePalette === p.value && (
                                <Check className="h-4 w-4 absolute inset-0 m-auto text-white drop-shadow" />
                              )}
                              <span className="absolute inset-x-0 bottom-0 text-[8px] font-semibold text-white/95 px-1 pb-0.5 leading-tight bg-gradient-to-t from-black/40 to-transparent text-center">
                                {p.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Typography mood */}
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-medium text-muted-foreground">Typography mood</Label>
                        <Select value={vibeTypography} onValueChange={(v) => setVibeTypography(v as VibeTypography)}>
                          <SelectTrigger className="h-8 rounded-lg text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {VIBE_TYPOGRAPHIES.map((t) => (
                              <SelectItem key={t.value} value={t.value} className="text-xs">
                                <span className="font-medium">{t.label}</span>
                                <span className="text-muted-foreground ml-2">— {t.hint}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Layout density */}
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-medium text-muted-foreground">Layout density</Label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {VIBE_DENSITIES.map((d) => (
                            <button
                              key={d.value}
                              type="button"
                              onClick={() => setVibeDensity(d.value)}
                              className={`text-left rounded-md border p-2 transition-colors ${vibeDensity === d.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
                            >
                              <div className="text-[11px] font-medium flex items-center gap-1">
                                {vibeDensity === d.value && <Check className="h-3 w-3 text-primary" />}
                                {d.label}
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{d.hint}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Vibe validator — surfaces clashes between the chosen
                          palette/typography/density and the selected template
                          (formal vertical + playful font, compact density on
                          long content, etc) with one-click fixes. */}
                      {vibeValidation.warnings.length > 0 && (
                        <div className="space-y-1.5">
                          {/* Auto-fix all — runs the validator in a loop and
                              applies the safest combination in one click. Only
                              shown when at least one warning has a suggestion. */}
                          {vibeValidation.warnings.some((w) => !!w.suggest) && (() => {
                            const tpl = templates.find((t) => t.id === selectedTemplate);
                            const marketplaceMatch = COMMUNITY_TEMPLATES.find((m) => m.name === (tpl as { name?: string } | undefined)?.name);
                            const fixCount = vibeValidation.warnings.filter((w) => !!w.suggest).length;
                            return (
                              <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 border border-border/50 px-2.5 py-1.5">
                                <span className="text-[11px] text-muted-foreground">
                                  {fixCount} fixable {fixCount === 1 ? "issue" : "issues"} detected
                                </span>
                                <Button
                                  type="button"
                                  variant="default"
                                  size="sm"
                                  className="h-7 px-2.5 text-[11px] gap-1"
                                  onClick={() => {
                                    const result = computeSafestVibe({
                                      templateContent: (tpl as { content?: string } | undefined)?.content || "",
                                      templateCategory: marketplaceMatch?.category ?? null,
                                      templateTags: marketplaceMatch?.tags ?? null,
                                      palette: vibePalette,
                                      typography: vibeTypography,
                                      density: vibeDensity,
                                    });
                                    if (!result.changed) {
                                      toast({
                                        title: "Nothing to auto-fix",
                                        description: "Remaining warnings have no safe automatic fix — review them manually.",
                                      });
                                      return;
                                    }
                                    setVibePalette(result.palette);
                                    setVibeTypography(result.typography);
                                    setVibeDensity(result.density);
                                    toast({
                                      title: `Applied ${result.appliedFixes.length} fix${result.appliedFixes.length === 1 ? "" : "es"}`,
                                      description: `Vibe set to ${result.palette} · ${result.typography} · ${result.density}.`,
                                    });
                                  }}
                                >
                                  <Wand2 className="h-3 w-3" />
                                  Auto-fix all warnings
                                </Button>
                              </div>
                            );
                          })()}
                          {vibeValidation.warnings.map((w) => {
                            const tone = w.severity === "danger"
                              ? "border-destructive/40 bg-destructive/10 text-destructive-foreground"
                              : w.severity === "warning"
                              ? "border-amber-500/40 bg-amber-500/10"
                              : "border-primary/30 bg-primary/5";
                            const Icon = w.severity === "info" ? Info : AlertTriangle;
                            return (
                              <div
                                key={w.id}
                                role="alert"
                                className={`flex items-start gap-2 rounded-lg border p-2 ${tone}`}
                              >
                                <Icon className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${w.severity === "info" ? "text-primary" : "text-amber-600 dark:text-amber-400"}`} />
                                <div className="min-w-0 flex-1 space-y-0.5">
                                  <p className="text-[11px] font-semibold leading-tight">{w.title}</p>
                                  <p className="text-[10px] text-muted-foreground leading-snug">{w.reason}</p>
                                  {w.suggest && w.suggestLabel && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-6 mt-1 px-2 text-[10px]"
                                      onClick={() => {
                                        if (w.suggest?.palette) setVibePalette(w.suggest.palette);
                                        if (w.suggest?.typography) setVibeTypography(w.suggest.typography);
                                        if (w.suggest?.density) setVibeDensity(w.suggest.density);
                                      }}
                                    >
                                      {w.suggestLabel}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Brand overrides — optional CSS variables + raw CSS that
                          win the cascade over the preset block above. Useful
                          for matching a client's exact brand color or tweaking
                          spacing per-campaign without forking the template. */}
                      <div className="rounded-lg border border-dashed border-border/50 bg-muted/20">
                        <button
                          type="button"
                          onClick={() => setVibeAdvancedOpen((v) => !v)}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] font-medium hover:bg-muted/40 rounded-lg transition-colors"
                          aria-expanded={vibeAdvancedOpen}
                        >
                          <span className="flex items-center gap-1.5">
                            <Settings2 className="h-3 w-3 text-muted-foreground" />
                            Brand overrides (optional)
                            {(vibeCustomVarsText.trim() || vibeCustomCss.trim()) && (
                              <Badge variant="secondary" className="h-4 px-1.5 text-[9px]">active</Badge>
                            )}
                          </span>
                          <span className="text-muted-foreground text-[10px]">{vibeAdvancedOpen ? "Hide" : "Show"}</span>
                        </button>
                        {vibeAdvancedOpen && (
                          <div className="p-2.5 pt-1 space-y-2.5 border-t border-border/40">
                            <div className="space-y-1">
                              <Label className="text-[11px] font-medium text-muted-foreground">
                                CSS variables
                                <span className="ml-1 text-[10px] font-normal text-muted-foreground/70">— one per line, <code className="px-1 rounded bg-muted text-[10px]">name: value</code></span>
                              </Label>
                              <Textarea
                                value={vibeCustomVarsText}
                                onChange={(e) => setVibeCustomVarsText(e.target.value)}
                                placeholder={"brand-color: #ff0066\nsection-padding: 6rem\nradius: 18px"}
                                rows={3}
                                className="text-[11px] font-mono leading-snug resize-y min-h-[60px]"
                                spellCheck={false}
                              />
                              <p className="text-[10px] text-muted-foreground">
                                Emitted as <code className="px-1 rounded bg-muted">--name: value;</code> on <code className="px-1 rounded bg-muted">.pgp-page</code>. Reference them in your CSS below with <code className="px-1 rounded bg-muted">var(--name)</code>.
                              </p>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] font-medium text-muted-foreground">
                                Custom CSS
                                <span className="ml-1 text-[10px] font-normal text-muted-foreground/70">— scoped to <code className="px-1 rounded bg-muted text-[10px]">.pgp-page</code></span>
                              </Label>
                              <Textarea
                                value={vibeCustomCss}
                                onChange={(e) => setVibeCustomCss(e.target.value)}
                                placeholder={".pgp-page .pgp-btn-primary { background: var(--brand-color); }\n.pgp-page .pgp-section { padding: var(--section-padding) 0; }"}
                                rows={5}
                                className="text-[11px] font-mono leading-snug resize-y min-h-[100px]"
                                spellCheck={false}
                              />
                              <p className="text-[10px] text-muted-foreground">
                                Appended last so it wins over the preset. Always prefix selectors with <code className="px-1 rounded bg-muted">.pgp-page</code> to keep styles scoped.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {selectedTemplate && (() => {
                    const targetSite = websites.find((w) => w.id === (selectedWebsite || websiteForPages));
                    const siteLang = (targetSite as { language?: string | null } | undefined)?.language;
                    const siteLocked = !!(targetSite as { language_locked?: boolean } | undefined)?.language_locked;
                    const effectiveLangCode = (siteLang || campaignLanguage || "en").toString();
                    const langLabel = LANGUAGES.find((l) => l.code === effectiveLangCode.toLowerCase())?.label || effectiveLangCode;
                    return (
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2.5">
                        <div className="flex items-start gap-2">
                          <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium flex items-center gap-1.5 flex-wrap">
                              AI auto-fill for unmapped variables
                              <Badge variant="outline" className="h-4 px-1.5 text-[9px] gap-1 border-primary/30 text-primary">
                                <Globe className="h-2.5 w-2.5" />
                                {langLabel}
                                {siteLocked && <span title="Locked by site">🔒</span>}
                              </Badge>
                            </p>
                            <p className="text-[11px] text-muted-foreground leading-snug">
                              AI will write all values in <strong className="text-foreground">{langLabel}</strong>{siteLocked ? " (locked by the connected site)" : siteLang ? " (from connected site)" : " (from campaign language)"} — even if your business / niche / services text below is in English.
                            </p>
                          </div>
                        </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Business</Label>
                          <Input value={aiBusiness} onChange={(e) => setAiBusiness(e.target.value)} placeholder="Acme Plumbing" className="h-8 rounded-lg text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Niche</Label>
                          <Input value={aiNiche} onChange={(e) => setAiNiche(e.target.value)} placeholder="Home services" className="h-8 rounded-lg text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Services / products</Label>
                          <Input value={aiServiceProduct} onChange={(e) => setAiServiceProduct(e.target.value)} placeholder="Emergency plumbing" className="h-8 rounded-lg text-xs" />
                        </div>
                        </div>
                        {/* Generation mode: per campaign vs per row */}
                        <div className="rounded-lg border border-border/60 bg-background/60 p-2.5 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold">AI generation mode</p>
                              <p className="text-[10px] text-muted-foreground leading-snug">
                                {aiFillMode === "per_campaign"
                                  ? "Generate once and reuse the same value on every page (1 AI call total — cheapest)."
                                  : "Generate per CSV row using that row's data as extra context (1 AI call per row — richer, more unique)."}
                              </p>
                            </div>
                            <Badge variant="outline" className="h-5 px-1.5 text-[9px] shrink-0">
                              {aiFillMode === "per_campaign" ? "1 call" : "N calls"}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => setAiFillMode("per_campaign")}
                              className={`text-left rounded-md border p-2 transition-colors ${aiFillMode === "per_campaign" ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
                            >
                              <div className="text-[11px] font-medium flex items-center gap-1">
                                {aiFillMode === "per_campaign" && <Check className="h-3 w-3 text-primary" />}
                                Once per campaign
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">Same value on every row. Cheapest.</div>
                            </button>
                            <button
                              type="button"
                              onClick={() => setAiFillMode("per_row")}
                              className={`text-left rounded-md border p-2 transition-colors ${aiFillMode === "per_row" ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
                            >
                              <div className="text-[11px] font-medium flex items-center gap-1">
                                {aiFillMode === "per_row" && <Check className="h-3 w-3 text-primary" />}
                                Once per row
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">Unique per row. Costs ~1 AI call/row.</div>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  {selectedTemplate && selectedTemplateVars.length > 0 && (
                    <FillRulesPanel
                      templateVars={selectedTemplateVars}
                      csvHeaders={effectiveCsvHeaders}
                      manualMappings={manualMappings}
                      customValues={customValues}
                      rules={fillRules}
                      setRules={setFillRules}
                      hasAiContext={!!(aiBusiness || aiNiche || aiServiceProduct)}
                    />
                  )}
                  {selectedTemplate && effectiveCsvHeaders.length > 0 && (
                    <>
                      {/* Smart auto-flow status banner */}
                      {variableMapping && (() => {
                        const total = variableMapping.matched.length;
                        const auto = variableMapping.matched.filter(m => m.column).length;
                        const allMatched = total > 0 && auto === total;
                        return allMatched ? (
                          <div className="rounded-xl border border-success/30 bg-success/5 p-3 flex items-start gap-2.5">
                            <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <p className="text-xs font-medium text-success">All {total} variables auto-matched 🎉</p>
                              <p className="text-[11px] text-muted-foreground">Your CSV columns line up perfectly with this template. You can continue straight to the next step.</p>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 flex items-start gap-2.5">
                            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <p className="text-xs font-medium text-warning-foreground">{auto} of {total} matched · Confirm the rest below</p>
                              <p className="text-[11px] text-muted-foreground">A few variables need your attention — pick a CSV column or set a custom value.</p>
                            </div>
                          </div>
                        );
                      })()}

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
                        faqPairs={faqPairs}
                        setFaqPairs={setFaqPairs}
                        aiContext={{
                          business: aiBusiness || undefined,
                          niche: aiNiche || undefined,
                          service: aiServiceProduct || undefined,
                        }}
                        aiLanguage={
                          (websites.find(w => w.id === (selectedWebsite || websiteForPages)) as { language?: string | null } | undefined)?.language
                          || campaignLanguage
                          || "en"
                        }
                      />
                    </>
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

              {/* Review Step (combined settings + readiness) */}
              {wizardSteps[step - 1]?.label === "Review" && (
                <div className="space-y-5">
                  {/* Readiness Checklist */}
                  <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" /> Readiness Check
                      </h4>
                      <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-primary" onClick={runReadinessCheck} disabled={aiCheckingReadiness}>
                        {aiCheckingReadiness ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                        AI Check
                      </Button>
                    </div>
                    <div className="space-y-1.5">
                      {readinessItems.map(item => (
                        <div key={item.label} className="flex items-center gap-2 text-xs">
                          {item.status === "ok" ? <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" /> :
                           item.status === "warn" ? <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" /> :
                           <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                          <span className="font-medium">{item.label}</span>
                          <span className="text-muted-foreground ml-auto truncate max-w-[200px]">{item.detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Readiness Result */}
                  {aiReadinessCheck && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" /> AI Analysis
                        </span>
                        <Badge variant={aiReadinessCheck.ready ? "default" : "destructive"} className="text-xs">
                          Score: {aiReadinessCheck.score}/100
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {(aiReadinessCheck.issues || []).map((issue: any, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            {issue.type === "error" ? <XCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" /> :
                             issue.type === "warning" ? <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" /> :
                             <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />}
                            <div>
                              <span className="font-medium">{issue.message}</span>
                              {issue.fix && <p className="text-muted-foreground mt-0.5">{issue.fix}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick Settings */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Publish Mode</Label>
                      <RadioGroup value={publishMode} onValueChange={v => setPublishMode(v as any)} className="flex gap-3">
                        <div className="flex items-center space-x-1.5"><RadioGroupItem value="draft" id="w-draft" /><Label htmlFor="w-draft" className="text-xs cursor-pointer">Draft</Label></div>
                        <div className="flex items-center space-x-1.5"><RadioGroupItem value="published" id="w-pub" /><Label htmlFor="w-pub" className="text-xs cursor-pointer">Published</Label></div>
                      </RadioGroup>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Max Rows</Label>
                      <Input type="number" min="1" value={maxRows} onChange={e => setMaxRows(e.target.value)} placeholder={`All (${effectiveCsvData.length})`} className="rounded-xl h-9 text-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Method</Label>
                      <Select value={generationMethod} onValueChange={v => setGenerationMethod(v as any)}>
                        <SelectTrigger className="rounded-xl h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Combinations</SelectItem>
                          <SelectItem value="sequential">Sequential</SelectItem>
                          <SelectItem value="random">Random</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Schedule</Label>
                      <Select value={scheduleMode} onValueChange={v => setScheduleMode(v as any)}>
                        <SelectTrigger className="rounded-xl h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="now">Run Now</SelectItem>
                          <SelectItem value="later">Schedule Later</SelectItem>
                          <SelectItem value="recurring">Recurring</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {(scheduleMode === "later" || scheduleMode === "recurring") && (
                    <div className="flex gap-3">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("justify-start text-left font-normal rounded-xl h-9 text-sm flex-1", !scheduledDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={scheduledDate} onSelect={setScheduledDate} disabled={d => d < new Date()} initialFocus className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                      {scheduleMode === "recurring" && (
                        <Select value={recurringInterval} onValueChange={v => setRecurringInterval(v as any)}>
                          <SelectTrigger className="w-36 h-9 text-sm rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="biweekly">Bi-weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}

                  {/* Summary Card */}
                  <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Summary</h4>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                      <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium truncate ml-2 max-w-[150px]">{campaignName}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium uppercase">{campaignTypes.join("+")}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Data</span><span className="font-medium">{effectiveCsvData.length} rows</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Template</span><span className="font-medium truncate ml-2 max-w-[150px]">{templates.find(t => t.id === selectedTemplate)?.name || "—"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Mode</span><span className="font-medium capitalize">{publishMode}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Schedule</span><span className="font-medium capitalize">{scheduleMode}</span></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center px-5 py-3 border-t border-border bg-muted/30 shrink-0">
            <Button variant="ghost" onClick={() => step === 1 ? resetForm() : setStep(step - 1)} className="rounded-xl h-9 px-4 text-sm">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              {step === 1 ? "Cancel" : "Back"}
            </Button>
            <div className="flex items-center gap-2">
              {step === totalSteps && (
                <Button variant="outline" onClick={handleTestOnePage} disabled={!selectedTemplate || effectiveCsvData.length === 0 || testGenerating} className="rounded-xl h-9 px-3 text-sm">
                  {testGenerating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Eye className="mr-1.5 h-3.5 w-3.5" />}
                  Preview
                </Button>
              )}
              {step < totalSteps ? (
                <Button onClick={() => setStep(step + 1)} disabled={!canProceed()} className="rounded-xl h-9 px-5 text-sm bg-gradient-primary hover:brightness-110">
                  Continue <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button onClick={() => createMutation.mutate()} disabled={!campaignName || createMutation.isPending} className="rounded-xl h-9 px-5 text-sm bg-gradient-primary hover:brightness-110">
                  {createMutation.isPending ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Creating...</> :
                   scheduleMode !== "now" ? "Schedule Campaign" :
                   publishMode === "published" ? "Generate & Publish" : "Create Campaign"}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <TestPagePreviewDialog open={testPreviewOpen} onOpenChange={setTestPreviewOpen} result={testPreviewResult} />

      <Dialog open={savePresetOpen} onOpenChange={setSavePresetOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {activePresetId ? "Update preset" : "Save AI preset"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Reuse this business / niche / service combo across future campaigns with one click.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs mb-1.5 block">Preset name</Label>
              <Input
                autoFocus
                value={presetNameDraft}
                onChange={(e) => setPresetNameDraft(e.target.value)}
                placeholder="e.g. Plumbing — US cities"
                className="h-9 rounded-lg text-sm"
                onKeyDown={(e) => { if (e.key === "Enter") handleSavePreset(); }}
              />
            </div>
            <div className="rounded-lg border bg-muted/30 p-2 space-y-1 text-[11px]">
              <div className="text-muted-foreground">Will save:</div>
              <div><span className="text-muted-foreground">Business:</span> {aiBusiness || <em className="text-muted-foreground">empty</em>}</div>
              <div><span className="text-muted-foreground">Niche:</span> {aiNiche || <em className="text-muted-foreground">empty</em>}</div>
              <div><span className="text-muted-foreground">Service:</span> {aiServiceProduct || <em className="text-muted-foreground">empty</em>}</div>
              <div><span className="text-muted-foreground">Pages:</span> {aiPageCount} • {campaignLanguage.toUpperCase()} • {campaignCountry}</div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setSavePresetOpen(false)}>Cancel</Button>
              <Button type="button" size="sm" onClick={handleSavePreset} className="gap-1.5">
                <Save className="h-3.5 w-3.5" />
                {activePresetId ? "Update" : "Save preset"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
