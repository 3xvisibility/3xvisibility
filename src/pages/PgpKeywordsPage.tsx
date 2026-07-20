// ============= Lines 1-373 of 1252 total lines =============

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Plus, KeyRound, Trash2, Upload, Download, Copy, Search as SearchIcon,
  Pencil, MoreVertical, Loader2, Sparkles, FileText, Database, ChevronLeft, ChevronRight,
  MapPin, Globe, Link2, Rss, Wand2, ExternalLink, FolderOpen, FolderPlus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { callAI } from "@/lib/ai-client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useLanguage } from "@/i18n/LanguageContext";
import * as XLSX from "xlsx";

const PAGE_SIZE = 15;

const SEO_KEYWORD_SYSTEM_PROMPT = `You are an SEO keyword strategist. Return ONLY clean search keywords that real customers type into Google, Bing, Yahoo and other search engines.
Never return HTML, CSS, JavaScript, code, tags, classes, IDs, stylesheets, design tokens, font/width/height/color values, variables, URLs, markdown, explanations, numbering, bullets or symbols. Never include words like html, css, font-size, width, padding, margin, class, selector, style or script. One plain search keyword phrase per line.`;

const TECHNICAL_NOISE_TERMS = [
  "html", "css", "stylesheet", "style", "styles", "script", "javascript", "code", "markup",
  "class", "classname", "id", "selector", "variable", "token", "font", "font-size", "font size",
  "width", "height", "margin", "padding", "border radius", "line-height", "letter-spacing",
  "px", "rem", "vh", "vw", "media query", "style block", "div", "span", "rgba", "hsl",
];

const BLOCKED_JSON_KEYS = /(?:html|css|style|styles|script|template|content|code|schema|markdown|class|selector|layout|design)/i;
const KEYWORD_JSON_KEYS = /(?:keyword|term|phrase|service|product|category|brand|name|title|heading|query|topic)/i;

function isTechnicalKeywordNoise(line: string): boolean {
  const lower = line.toLowerCase();
  const hasTechnicalTerm = TECHNICAL_NOISE_TERMS.some((term) => new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i").test(lower));
  return (
    hasTechnicalTerm ||
    line.includes("<") || line.includes(">") ||
    /[{};]/.test(line) ||
    /[#.][a-z0-9_-]+\s*\{/i.test(line) ||
    /^[.#@]/.test(line) ||
    /^--[a-z0-9-]+\s*:/i.test(line) ||
    /\b(?:font-size|font-family|font-weight|line-height|letter-spacing|max-width|min-width|width|height|min-height|max-height|margin|padding|border|border-radius|background|color|display|position|top|left|right|bottom|z-index|gap|grid|flex|align-items|justify-content|box-shadow|opacity|transform|transition|animation|overflow)\s*:/i.test(line) ||
    /\b\d+(?:\.\d+)?\s*(?:px|rem|em|vh|vw|%)\b/i.test(line) ||
    /#[0-9a-f]{3,8}\b/i.test(line) ||
    /\b(rgba?|hsla?|var|url|calc|translate|rotate|scale)\s*\(/i.test(line) ||
    /^(http|https):\/\//i.test(line) ||
    /[=();]/.test(line) && /[a-z]+\s*\(/i.test(line) ||
    /\b(important|inherit|initial|unset|none|auto|flex|grid|block|absolute|relative|sticky)\b/i.test(line) && /:/.test(line) ||
    lower === "style" || lower === "script" || lower.startsWith("style>") ||
    /^[\d\s.,;:!?@#$%^&*()_+=<>/\\|~`'"-]+$/.test(line)
  );
}

function sanitizeKeywordLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const rawLine of lines) {
    let line = (rawLine || "")
      .replace(/^\d+[.)]\s*/, "")
      .replace(/^[-•*]\s*/, "")
      .trim();
    if (!line) continue;
    if (isTechnicalKeywordNoise(line)) continue;
    line = line.replace(/[{}<>;]+/g, "").trim();
    if (!line || line.length > 100) continue;
    if (!/[a-z\u00C0-\u024F\u0980-\u09FF]/i.test(line)) continue;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out;
}

function extractKeywordCandidates(raw: string): string[] {
  const withoutFences = (raw || "")
    .replace(/```[a-z]*\s*/gi, "\n")
    .replace(/```/g, "\n")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "\n")
    .replace(/<script\b[\s\S]*?<\/script>/gi, "\n")
    .replace(/<[^>]*>/g, "\n");

  const candidates: string[] = [];
  const pushValue = (value: unknown, key = "") => {
    if (BLOCKED_JSON_KEYS.test(key)) return;
    if (Array.isArray(value)) value.forEach((item) => pushValue(item, key));
    else if (value && typeof value === "object") {
      Object.entries(value as Record<string, unknown>).forEach(([childKey, childValue]) => {
        if (KEYWORD_JSON_KEYS.test(childKey) || KEYWORD_JSON_KEYS.test(key)) pushValue(childValue, childKey);
      });
    }
    else if (typeof value === "string") candidates.push(value);
  };

  try { pushValue(JSON.parse(withoutFences)); } catch {}

  withoutFences
    .split(/[\n,|]+/)
    .map((part) => part.replace(/^\s*["'`]*[\w -]{0,24}["'`]*\s*:\s*/i, "").trim())
    .forEach((part) => candidates.push(part));

  return sanitizeKeywordLines(candidates);
}

function stripHtmlForKeywords(html: string): string {
  return (html || "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, " ")
    .replace(/&gt;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractHeadingsFromHtml(html: string): string[] {
  const headings: string[] = [];
  const safeHtml = (html || "").replace(/<style\b[\s\S]*?<\/style>/gi, " ").replace(/<script\b[\s\S]*?<\/script>/gi, " ");
  const re = /<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(safeHtml))) headings.push(stripHtmlForKeywords(match[1]));
  return headings;
}

function mergeCleanTerms(existing: string, incoming: string[], allowDelimitedRows = false): string {
  const previous = existing.split("\n").map((t) => t.trim()).filter(Boolean);
  const safePrevious = allowDelimitedRows ? previous : sanitizeKeywordLines(previous);
  const safeIncoming = allowDelimitedRows ? incoming.map((t) => t.trim()).filter(Boolean) : sanitizeKeywordLines(incoming);
  return [...safePrevious, ...safeIncoming].join("\n");
}

interface PgpKeyword {
  id: string;
  workspace_id: string;
  user_id: string;
  name: string;
  folder: string | null;
  source: string;
  terms: string[];
  delimiter: string | null;
  columns: string[];
  source_config: Record<string, any>;
  term_count: number;
  created_at: string;
  updated_at: string;
}

export default function PgpKeywordsPage() {
  const { t } = useLanguage();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<PgpKeyword | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PgpKeyword | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [autoWizardOpen, setAutoWizardOpen] = useState(false);
  const [folderFilter, setFolderFilter] = useState<string>("__all__");
  const [kwFolder, setKwFolder] = useState("");
  const [newFolderName, setNewFolderName] = useState("");

  // Editor state
  const [kwName, setKwName] = useState("");
  const [kwSource, setKwSource] = useState("local");
  const [kwTerms, setKwTerms] = useState("");
  const [kwDelimiter, setKwDelimiter] = useState("");
  const [kwColumns, setKwColumns] = useState("");
  const [aiTopic, setAiTopic] = useState("");
  const [aiCount, setAiCount] = useState("20");
  const [aiLanguage, setAiLanguage] = useState("English");
  const [aiGenerating, setAiGenerating] = useState(false);

  // Location source state
  const [locCountry, setLocCountry] = useState("US");
  const [locState, setLocState] = useState("");
  const [locCounty, setLocCounty] = useState("");
  const [locMode, setLocMode] = useState<"area" | "radius">("area");
  const [locRadius, setLocRadius] = useState("50");
  const [locRadiusUnit, setLocRadiusUnit] = useState("miles");
  const [locCenterCity, setLocCenterCity] = useState("");
  const [locInclude, setLocInclude] = useState({ city: true, state: true, zip: false, county: false, region: false, area_code: false, population: false, demographics: false });
  const [locLoading, setLocLoading] = useState(false);
  const [locFormat, setLocFormat] = useState("{city}, {state}");

  // Dynamic source state
  const [dynUrl, setDynUrl] = useState("");
  const [dynLoading, setDynLoading] = useState(false);

  // Website source state
  const [webSiteId, setWebSiteId] = useState("");
  const [webLoading, setWebLoading] = useState(false);

  // URL scan source state
  const [scanUrl, setScanUrl] = useState("");
  const [scanLoading, setScanLoading] = useState(false);

  // Template source state
  const [tmplId, setTmplId] = useState("");
  const [tmplBulkCreating, setTmplBulkCreating] = useState(false);
  const [tmplConfirmOpen, setTmplConfirmOpen] = useState(false);

  // Auto wizard state
  const [wizService, setWizService] = useState("");
  const [wizLocations, setWizLocations] = useState("");
  const [wizGenerating, setWizGenerating] = useState(false);

  const importRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  const { data: keywords = [], isLoading } = useQuery({
    queryKey: ["pgp-keywords", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase.from("pgp_keywords").select("*").eq("workspace_id", wsId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data as PgpKeyword[];
    },
  });

  const { data: websites = [] } = useQuery({
    queryKey: ["websites-for-keywords", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase.from("websites").select("id, name, url").eq("workspace_id", wsId!).order("name");
      if (error) throw error;
      return data as { id: string; name: string; url: string }[];
    },
  });

  const { data: pgpTemplates = [] } = useQuery({
    queryKey: ["templates-for-keywords", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("templates")
        .select("id, name, variables, content, seo_title_pattern, seo_description_pattern, created_at, updated_at")
        .eq("workspace_id", wsId!)
        .order("updated_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as { id: string; name: string; variables: string[] | null; content: string | null; seo_title_pattern: string | null; seo_description_pattern: string | null }[];
    },
  });

  const { data: locCountries = [] } = useQuery({
    queryKey: ["loc-countries"],
    queryFn: async () => {
      const { data } = await supabase.from("locations").select("country_code, country").limit(500);
      const unique = [...new Map((data || []).map(d => [d.country_code, d.country])).entries()];
      return unique.map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name));
    },
  });

  const { data: locStates = [] } = useQuery({
    queryKey: ["loc-states", locCountry],
    enabled: !!locCountry,
    queryFn: async () => {
      const { data } = await supabase.from("locations").select("state").eq("country_code", locCountry).limit(1000);
      return [...new Set((data || []).map(d => d.state))].sort();
    },
  });

  const { data: locCounties = [] } = useQuery({
    queryKey: ["loc-counties", locCountry, locState],
    enabled: !!locCountry && !!locState && locState !== "__all__",
    queryFn: async () => {
      const { data } = await supabase.from("locations").select("county").eq("country_code", locCountry).eq("state", locState).limit(1000);
      return [...new Set((data || []).filter(d => d.county).map(d => d.county!))].sort();
    },
  });

  // Derive unique folders
  const folders = [...new Set(keywords.map(kw => kw.folder).filter(Boolean))] as string[];

  const filtered = keywords.filter(kw => {
    if (searchQuery && !kw.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (folderFilter === "__none__") return !kw.folder;
    if (folderFilter !== "__all__" && kw.folder !== folderFilter) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const resetEditor = () => {
    setKwName(""); setKwSource("local"); setKwTerms(""); setKwDelimiter(""); setKwColumns("");
    setAiTopic(""); setAiCount("20"); setLocCountry("US"); setLocState(""); setLocCounty("");
    setLocMode("area"); setLocRadius("50"); setLocRadiusUnit("miles"); setLocCenterCity("");
    setLocInclude({ city: true, state: true, zip: false, county: false, region: false, area_code: false, population: false, demographics: false });
    setLocFormat("{city}, {state}"); setDynUrl(""); setWebSiteId(""); setScanUrl("");
    setEditing(null); setKwFolder(""); setNewFolderName("");
  };

  const openEditor = (kw?: PgpKeyword, prefillFolder?: string) => {
    if (kw) {
      setEditing(kw); setKwName(kw.name); setKwSource(kw.source); setKwFolder(kw.folder || "");
      setKwTerms((kw.terms || []).join("\n")); setKwDelimiter(kw.delimiter || "");
      setKwColumns((kw.columns || []).join(", "));
      if (kw.source_config) {
        if (kw.source_config.country) setLocCountry(kw.source_config.country);
        if (kw.source_config.state) setLocState(kw.source_config.state);
        if (kw.source_config.format) setLocFormat(kw.source_config.format);
        if (kw.source_config.url) setDynUrl(kw.source_config.url);
        if (kw.source_config.mode) setLocMode(kw.source_config.mode);
      }
    } else {
      resetEditor();
      if (prefillFolder) setKwFolder(prefillFolder);
    }
    setEditorOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async ({ keepOpen }: { keepOpen?: boolean } = {}) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !wsId) throw new Error("Not authenticated");
      const cleanName = kwName.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
      if (!cleanName) throw new Error("Keyword name is required");
      const termsArray = sanitizeKeywordLines(kwTerms.split("\n").map(t => t.trim()).filter(Boolean));
      setKwTerms(termsArray.join("\n"));
      const columnsArray = kwColumns ? kwColumns.split(",").map(c => c.trim()).filter(Boolean) : [];
      const sourceConfig: Record<string, any> = {};
      if (kwSource === "location") {
        sourceConfig.country = locCountry; sourceConfig.state = locState;
        sourceConfig.format = locFormat; sourceConfig.include = locInclude;
        sourceConfig.mode = locMode;
        if (locMode === "radius") { sourceConfig.radius = locRadius; sourceConfig.radiusUnit = locRadiusUnit; sourceConfig.centerCity = locCenterCity; }
        if (locCounty) sourceConfig.county = locCounty;
      } else if (["csv_url", "google_sheet", "rss_feed"].includes(kwSource)) {
        sourceConfig.url = dynUrl;
      } else if (kwSource === "website") {
        sourceConfig.websiteId = webSiteId;
      } else if (kwSource === "url_scan") {
        sourceConfig.url = scanUrl;
      } else if (kwSource === "template") {
        sourceConfig.templateId = tmplId;
      }
      const folderValue = newFolderName.trim() || (kwFolder && kwFolder !== "__new__" && kwFolder !== "__none__" ? kwFolder : null);
      const payload = { name: cleanName, folder: folderValue, source: kwSource, terms: termsArray, delimiter: kwDelimiter || null, columns: columnsArray, term_count: termsArray.length, source_config: sourceConfig, workspace_id: wsId, user_id: user.id };
      if (editing?.id) {
        const { error } = await supabase.from("pgp_keywords").update(payload as any).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pgp_keywords").insert(payload as any);
        if (error) throw error;
      }
      return { keepOpen, folderValue };
    },
    onSuccess: ({ keepOpen, folderValue }) => {
      queryClient.invalidateQueries({ queryKey: ["pgp-keywords"] });
      toast({ title: editing ? t("pgpKeywords.toastKeywordUpdated") : t("pgpKeywords.toastKeywordCreated") });
      if (keepOpen && !editing) {
        resetEditor();
        if (folderValue) setKwFolder(folderValue);
      } else {
        setEditorOpen(false);
        resetEditor();
      }
    },
    onError: (err: Error) => toast({ title: t("pgpKeywords.toastError"), description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("pgp_keywords").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["pgp-keywords"] }); toast({ title: t("pgpKeywords.toastKeywordDeleted") }); setDeleteTarget(null); },
    onError: (err: Error) => toast({ title: t("pgpKeywords.toastError"), description: err.message, variant: "destructive" }),
  });

  const duplicateKeyword = async (kw: PgpKeyword) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !wsId) return;
    const { error } = await supabase.from("pgp_keywords").insert({ ...kw, id: undefined, name: `${kw.name}_copy_${Date.now().toString(36)}`, workspace_id: wsId, user_id: user.id, created_at: undefined, updated_at: undefined } as any);
    if (error) toast({ title: t("pgpKeywords.toastError"), description: error.message, variant: "destructive" });
    else { queryClient.invalidateQueries({ queryKey: ["pgp-keywords"] }); toast({ title: t("pgpKeywords.toastKeywordDuplicated") }); }
  };

  const exportKeyword = (kw: PgpKeyword) => {
    const blob = new Blob([(kw.terms || []).join("\n")], { type: "text/plain" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${kw.name}.txt`; a.click(); URL.revokeObjectURL(a.href);
  };

  const importTerms = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    let lines: string[] = [];

    if (ext === "xlsx" || ext === "xls") {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { header: 1 });
      lines = rows.flat().map(v => String(v ?? "").trim()).filter(Boolean);
    } else if (ext === "json") {
      const text = await file.text();
      const json = JSON.parse(text);
      if (Array.isArray(json)) lines = json.map(v => typeof v === "string" ? v : JSON.stringify(v));
      else if (json.items) lines = json.items.map((v: any) => typeof v === "string" ? v : v.title || v.name || JSON.stringify(v));
    } else {
      const text = await file.text();
      lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    }

    const clean = sanitizeKeywordLines(lines);
    setKwTerms(prev => mergeCleanTerms(prev, clean));
    toast({ title: t("pgpKeywords.toastTermsImported", { count: clean.length }) });
    if (importRef.current) importRef.current.value = "";
  };

  // Geo variables must come from the real Location Database via the Campaign
  // wizard — never from AI-fabricated city/state/country lists.
  const GEO_VAR_NAMES = ["city", "cities", "state", "states", "country", "countries", "zip", "zipcode", "region", "county", "location", "locations", "area"];
  const isGeoVariable = (name: string) => GEO_VAR_NAMES.includes(name.trim().toLowerCase());

  const generateAiTerms = async () => {
    if (!aiTopic.trim()) return;
    if (isGeoVariable(kwName)) {
      toast({
        title: "Use Locations, not AI",
        description: "City / state / country terms come from the real Location Database. Switch Source to \"Locations\", or add these variables in the Campaign wizard → Attach Locations.",
        variant: "destructive",
      });
      return;
    }
    setAiGenerating(true);
    try {
      const result = await callAI({
        model: "google/gemini-3-flash-preview",
        temperature: 0.2,
        messages: [
          { role: "system", content: SEO_KEYWORD_SYSTEM_PROMPT },
          { role: "user", content: `Generate exactly ${aiCount} high-value SEO keywords for keyword group "${kwName || aiTopic}". Topic: ${aiTopic}. Use a natural mix of high-intent, long-tail and local SEO phrases. Each keyword must be 1-6 plain words. One keyword per line only. IMPORTANT: Write ALL keywords in ${aiLanguage} language only — do not mix languages, do not translate to English.` },
        ],
      });
      if (!result.success) throw new Error(result.content || "AI request failed");
      const lines = extractKeywordCandidates(result.content);
      if (lines.length === 0) throw new Error("AI did not return clean SEO keywords. Please try a more specific topic.");
      setKwTerms(prev => mergeCleanTerms(prev, lines));
      toast({ title: t("pgpKeywords.toastAiKeywordsGenerated", { count: lines.length }) });
    } catch (err: any) { toast({ title: t("pgpKeywords.toastFailed"), description: err.message, variant: "destructive" }); }
    finally { setAiGenerating(false); }
  };

  const generateLocationTerms = async () => {
    setLocLoading(true);
    try {
      let query = supabase.from("locations").select("city, state, state_code, county, region, zip_code, country, latitude, longitude, population, area_code, population_male, population_female, median_age, median_household_income, wikipedia_url, phone_country_code").eq("country_code", locCountry);

      if (locMode === "area") {
        if (locState && locState !== "__all__") query = query.eq("state", locState);
        if (locCounty) query = query.eq("county", locCounty);
      } else if (locMode === "radius" && locCenterCity.trim()) {
        const { data: centerData } = await supabase.from("locations").select("latitude, longitude").eq("country_code", locCountry).ilike("city", locCenterCity.trim()).limit(1);
        if (!centerData || centerData.length === 0) { toast({ title: t("pgpKeywords.toastCenterCityNotFound"), variant: "destructive" }); setLocLoading(false); return; }
        const cLat = Number(centerData[0].latitude);
        const cLng = Number(centerData[0].longitude);
        const radiusKm = locRadiusUnit === "miles" ? Number(locRadius) * 1.60934 : Number(locRadius);
        const latDelta = radiusKm / 111;
        const lngDelta = radiusKm / (111 * Math.cos(cLat * Math.PI / 180));
        query = query.gte("latitude", cLat - latDelta).lte("latitude", cLat + latDelta).gte("longitude", cLng - lngDelta).lte("longitude", cLng + lngDelta);
      }

      const { data, error } = await query.limit(1000);
      if (error) throw error;
      if (!data || data.length === 0) { toast({ title: t("pgpKeywords.toastNoLocationsFound"), variant: "destructive" }); setLocLoading(false); return; }

      let finalData = data;
      if (locMode === "radius" && locCenterCity.trim()) {
        const { data: centerData } = await supabase.from("locations").select("latitude, longitude").eq("country_code", locCountry).ilike("city", locCenterCity.trim()).limit(1);
        if (centerData?.[0]) {
          const cLat = Number(centerData[0].latitude);
          const cLng = Number(centerData[0].longitude);
          const maxDist = locRadiusUnit === "miles" ? Number(locRadius) : Number(locRadius) * 0.621371;
          finalData = data.filter(loc => {
            if (!loc.latitude || !loc.longitude) return false;
            const dLat = (Number(loc.latitude) - cLat) * Math.PI / 180;
            const dLng = (Number(loc.longitude) - cLng) * Math.PI / 180;
            const a = Math.sin(dLat / 2) ** 2 + Math.cos(cLat * Math.PI / 180) * Math.cos(Number(loc.latitude) * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
            const dist = 3959 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return dist <= maxDist;
          });
        }
      }

      const cols: string[] = [];
      if (locInclude.city) cols.push("city");
      if (locInclude.state) cols.push("state");
      if (locInclude.county) cols.push("county");
      if (locInclude.zip) cols.push("zip_code");
      if (locInclude.region) cols.push("region");
      if (locInclude.area_code) cols.push("area_code");
      if (locInclude.population) cols.push("population");
      if (locInclude.demographics) cols.push("population_male", "population_female", "median_age", "median_household_income");

      if (cols.length > 0) {
        setKwColumns(cols.join(", "));
        const delimTerms = finalData.map((loc: any) => {
          const parts: string[] = [];
          if (locInclude.city) parts.push(loc.city || "");
          if (locInclude.state) parts.push(loc.state || "");
          if (locInclude.county) parts.push(loc.county || "");
          if (locInclude.zip) parts.push(loc.zip_code || "");
          if (locInclude.region) parts.push(loc.region || "");
          if (locInclude.area_code) parts.push(loc.area_code || "");
          if (locInclude.population) parts.push(String(loc.population || ""));
          if (locInclude.demographics) {
            parts.push(String(loc.population_male || ""));
            parts.push(String(loc.population_female || ""));
            parts.push(String(loc.median_age || ""));
            parts.push(String(loc.median_household_income || ""));
          }
          return parts.join("|");
        });
        setKwDelimiter("|");
        setKwTerms(prev => mergeCleanTerms(prev, delimTerms, true));
      } else {
        const terms = finalData.map((loc: any) => {
          let term = locFormat;
          term = term.replace(/\{city\}/gi, loc.city || "");
          term = term.replace(/\{state\}/gi, loc.state || "");
          term = term.replace(/\{state_code\}/gi, loc.state_code || "");
          term = term.replace(/\{county\}/gi, loc.county || "");
          term = term.replace(/\{region\}/gi, loc.region || "");
          term = term.replace(/\{zip_code\}/gi, loc.zip_code || "");
          term = term.replace(/\{country\}/gi, loc.country || "");
          term = term.replace(/\{area_code\}/gi, loc.area_code || "");
          term = term.replace(/\{population\}/gi, String(loc.population || ""));
          return term.trim();
        }).filter(Boolean);
        setKwTerms(prev => mergeCleanTerms(prev, terms));
      }

      toast({ title: t("pgpKeywords.toastLocationTermsGenerated", { count: finalData.length }) });
    } catch (err: any) { toast({ title: t("pgpKeywords.toastFailed"), description: err.message, variant: "destructive" }); }
    finally { setLocLoading(false); }
  };

  const fetchDynamicSource = async () => {
    if (!dynUrl.trim()) return;
    setDynLoading(true);
    try {
      const resp = await fetch(dynUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const text = await resp.text();
      try {
        const json = JSON.parse(text);
        let rawLines: string[] = [];
        if (Array.isArray(json)) rawLines = json.map((item: any) => typeof item === "string" ? item : JSON.stringify(item));
        else if (json.items) rawLines = json.items.map((item: any) => typeof item === "string" ? item : item.title || item.name || JSON.stringify(item));
        const lines = sanitizeKeywordLines(rawLines);
        if (lines.length > 0) { setKwTerms(prev => mergeCleanTerms(prev, lines)); toast({ title: t("pgpKeywords.toastTermsFetchedJson", { count: lines.length }) }); return; }
      } catch {}
      if (text.includes("<rss") || text.includes("<feed") || text.includes("<item")) {
        const doc = new DOMParser().parseFromString(text, "text/xml");
        const items = doc.querySelectorAll("item title, entry title");
        const lines = sanitizeKeywordLines(Array.from(items).map(el => el.textContent?.trim() || ""));
        if (lines.length > 0) { setKwTerms(prev => mergeCleanTerms(prev, lines)); toast({ title: t("pgpKeywords.toastTermsFetchedRss", { count: lines.length }) }); return; }
      }
      const lines = sanitizeKeywordLines(text.split("\n"));
      if (lines.length === 0) throw new Error("No clean keywords found at this URL");
      setKwTerms(prev => mergeCleanTerms(prev, lines));
      toast({ title: t("pgpKeywords.toastTermsFetched", { count: lines.length }) });
    } catch (err: any) { toast({ title: t("pgpKeywords.toastFailedToFetch"), description: err.message, variant: "destructive" }); }
    finally { setDynLoading(false); }
  };

  const fetchWebsiteKeywords = async () => {
    if (!webSiteId) { toast({ title: t("pgpKeywords.toastSelectWebsite"), variant: "destructive" }); return; }
    setWebLoading(true);
    try {
      const site = websites.find(w => w.id === webSiteId);
      if (!site) throw new Error("Website not found");
      const { data, error } = await supabase.functions.invoke("fetch-site-content", { body: { website_id: site.id, content_type: "pages" } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const pages = data?.items || data?.pages || [];
      if (pages.length === 0) throw new Error("No pages found on this website");
      const allTerms = new Set<string>();
      for (const page of pages) {
        const title = page.title || "";
        if (title) allTerms.add(title.trim());
        if (page.seo_title) allTerms.add(String(page.seo_title).trim());
        if (page.excerpt) allTerms.add(stripHtmlForKeywords(String(page.excerpt)));
        const headings = Array.isArray(page.headings) && page.headings.length ? page.headings : extractHeadingsFromHtml(page.content || "");
        for (const h of headings) {
          if (h && typeof h === "string") allTerms.add(h.trim());
        }
        const metaKw = page.meta_keywords || page.keywords || page.seo_keywords || "";
        const metaList = Array.isArray(metaKw) ? metaKw : String(metaKw).split(",");
        metaList.map((k: string) => k.trim()).filter(Boolean).forEach((k: string) => allTerms.add(k));
      }
      const lines = sanitizeKeywordLines([...allTerms]);
      if (lines.length === 0) throw new Error("Could not extract clean keywords from website pages");
      setKwTerms(prev => mergeCleanTerms(prev, lines));
      toast({ title: t("pgpKeywords.toastKeywordsExtracted", { kwCount: lines.length, pageCount: pages.length }) });
    } catch (err: any) { toast({ title: t("pgpKeywords.toastFailedToFetch"), description: err.message, variant: "destructive" }); }
    finally { setWebLoading(false); }
  };

  const fetchUrlKeywords = async () => {
    if (!scanUrl.trim()) return;
    setScanLoading(true);
    try {
      let formattedUrl = scanUrl.trim();
      if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
        formattedUrl = `https://${formattedUrl}`;
      }

      const result = await callAI({
        model: "google/gemini-3-flash-preview",
        temperature: 0.2,
        messages: [
          { role: "system", content: SEO_KEYWORD_SYSTEM_PROMPT },
          { role: "user", content: `Visit/analyze this website URL conceptually and extract 10-50 product names, service names, categories, brand names and high-intent search phrases only. URL: ${formattedUrl}. One keyword per line only.` },
        ],
      });
      if (!result.success) throw new Error(result.content || "AI request failed");
      const lines = extractKeywordCandidates(result.content);
      if (lines.length === 0) throw new Error("Could not extract clean keywords from this URL");
      setKwTerms(prev => mergeCleanTerms(prev, lines));
      toast({ title: t("pgpKeywords.toastKeywordsDetected", { count: lines.length }) });
    } catch (err: any) { toast({ title: t("pgpKeywords.toastFailedToScanUrl"), description: err.message, variant: "destructive" }); }
    finally { setScanLoading(false); }
  };

  const runAutoWizard = async () => {
    if (!wizService.trim()) return;
    setWizGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !wsId) throw new Error("Not authenticated");

      const kwResult = await callAI({
        model: "google/gemini-3-flash-preview",
        temperature: 0.3,
        messages: [
          { role: "system", content: SEO_KEYWORD_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Service/product: "${wizService}". Target locations: "${wizLocations || "United States"}".
Return ONLY plain search keywords (no code, tags, styling or symbols), grouped as JSON:
{ "service_terms": ["15-20 high-intent service keyword variations"], "city_terms": ["15-20 target city/location names"] }
Output JSON only, nothing else.`,
          },
        ],
      });
      if (!kwResult.success) throw new Error(kwResult.content || "AI request failed");
      const kwRaw = (kwResult.content || "").replace(/```json?\s*/gi, "").replace(/```/g, "").trim();
      let kwParsed: any = {};
      try { kwParsed = JSON.parse(kwRaw); } catch { kwParsed = {}; }
      const serviceTerms = sanitizeKeywordLines(
        Array.isArray(kwParsed.service_terms) ? kwParsed.service_terms : extractKeywordCandidates(kwRaw)
      );
      const cityTerms = sanitizeKeywordLines(
        Array.isArray(kwParsed.city_terms) ? kwParsed.city_terms : []
      );
      if (serviceTerms.length === 0) throw new Error("Could not generate clean keywords. Please try again.");

      const { data, error } = await supabase.functions.invoke("generate-template", {
        body: {
          prompt: `Create an SEO-optimized HTML content template for a landing page about the service "${wizService}" using {service} and {city} variables. Include H1, H2 sections, FAQ, and call-to-action.
Also provide a meta title pattern and meta description pattern using {service} and {city}.
Output as JSON: { "template_name": "...", "template_content": "...", "seo_title": "...", "seo_description": "..." }`
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const raw = (data?.content || "").replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
      let result: any = {};
      try { result = JSON.parse(raw); } catch { result = {}; }

      await supabase.from("pgp_keywords").insert({
        name: "service", source: "ai", terms: serviceTerms, term_count: serviceTerms.length,
        columns: [], delimiter: null, source_config: { auto_generated: true, topic: wizService }, workspace_id: wsId, user_id: user.id,
      } as any);

      // Do NOT AI-fabricate city terms. The Campaign wizard pulls real cities
      // from the Location Database. Create the group empty so the user knows to
      // attach locations at campaign time.
      await supabase.from("pgp_keywords").insert({
        name: "city", source: "location", terms: [], term_count: 0,
        columns: [], delimiter: null,
        source_config: { auto_generated: true, note: "Attach real cities via Campaign wizard → Attach Locations" },
        workspace_id: wsId, user_id: user.id,
      } as any);

      const variables = [...new Set((result.template_content || "").match(/\{[^}]+\}/g) || [])];
      await supabase.from("templates").insert({
        name: result.template_name || `${wizService} Landing Page`,
        content: result.template_content || "",
        variables, user_id: user.id, workspace_id: wsId,
        seo_title_pattern: result.seo_title || "",
        seo_description_pattern: result.seo_description || "",
        schema_type: "WebPage", schema_config: {},
      } as any);

      queryClient.invalidateQueries({ queryKey: ["pgp-keywords"] });
      queryClient.invalidateQueries({ queryKey: ["pgp-content-groups"] });
      toast({ title: t("pgpKeywords.toastAutoGenerated"), description: t("pgpKeywords.toastAutoGeneratedDesc") });
      setAutoWizardOpen(false);
      setWizService(""); setWizLocations("");
    } catch (err: any) { toast({ title: t("pgpKeywords.toastFailed"), description: err.message, variant: "destructive" }); }
    finally { setWizGenerating(false); }
  };

  const sourceLabels: Record<string, string> = {
    local: t("pgpKeywords.sourceLocal"),
    csv: t("pgpKeywords.sourceFile"),
    ai: t("pgpKeywords.sourceAi"),
    location: t("pgpKeywords.sourceLocation"),
    csv_url: t("pgpKeywords.sourceCsvUrl"),
    google_sheet: t("pgpKeywords.sourceSheet"),
    rss_feed: t("pgpKeywords.sourceRss"),
    website: t("pgpKeywords.sourceWebsite"),
    url_scan: t("pgpKeywords.sourceUrlScan"),
    text: t("pgpKeywords.sourceText"),
    template: "Template",
  };

  const sourceOptions = [
    { value: "local",        label: t("pgpKeywords.sourceLocal"),      icon: FileText,    desc: t("pgpKeywords.sourceLocalDesc") },
    { value: "csv",          label: t("pgpKeywords.sourceFile"),       icon: Database,    desc: t("pgpKeywords.sourceFileDesc") },
    { value: "ai",           label: t("pgpKeywords.sourceAi"),         icon: Sparkles,    desc: t("pgpKeywords.sourceAiDesc") },
    // Location source removed — locations are selected in the Campaign wizard.
    { value: "csv_url",      label: t("pgpKeywords.sourceCsvUrl"),     icon: Link2,       desc: t("pgpKeywords.sourceCsvUrlDesc") },
    { value: "google_sheet", label: t("pgpKeywords.sourceSheet"),      icon: Globe,       desc: t("pgpKeywords.sourceSheetDesc") },
    { value: "rss_feed",     label: t("pgpKeywords.sourceRss"),        icon: Rss,         desc: t("pgpKeywords.sourceRssDesc") },
    { value: "website",      label: t("pgpKeywords.sourceWebsite"),    icon: Globe,       desc: t("pgpKeywords.sourceWebsiteDesc") },
    { value: "url_scan",     label: t("pgpKeywords.sourceUrlScan"),    icon: ExternalLink, desc: t("pgpKeywords.sourceUrlScanDesc") },
    { value: "text",         label: t("pgpKeywords.sourceText"),       icon: FileText,    desc: t("pgpKeywords.sourceTextDesc") },
    { value: "template",     label: "Template",                         icon: Wand2,       desc: "Pull {variables} from a template" },
  ];

  const locIncludeFields = [
    { key: "city" as const,         label: t("pgpKeywords.locFieldCity") },
    { key: "state" as const,        label: t("pgpKeywords.locFieldState") },
    { key: "county" as const,       label: t("pgpKeywords.locFieldCounty") },
    { key: "zip" as const,          label: t("pgpKeywords.locFieldZip") },
    { key: "region" as const,       label: t("pgpKeywords.locFieldRegion") },
    { key: "area_code" as const,    label: t("pgpKeywords.locFieldAreaCode") },
    { key: "population" as const,   label: t("pgpKeywords.locFieldPopulation") },
    { key: "demographics" as const, label: t("pgpKeywords.locFieldDemographics") },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-display">{t("pgpKeywords.pageTitle")}</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">{t("pgpKeywords.pageDescription")}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" onClick={() => openEditor()}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> {t("pgpKeywords.addKeywordBtn")}
          </Button>
        </div>
      </div>

      {/* PGP Workflow Guide - show when no keywords */}
      {!isLoading && keywords.length === 0 && (
        <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-transparent p-4 sm:p-5">
          <h3 className="font-semibold text-sm mb-1">{t("pgpKeywords.workflowTitle")}</h3>
          <p className="text-xs text-muted-foreground mb-3">{t("pgpKeywords.workflowSubtitle")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-start gap-2 rounded-lg bg-primary/10 p-3">
              <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[11px] font-bold shrink-0">1</div>
              <div>
                <p className="text-xs font-semibold text-primary">{t("pgpKeywords.step1Title")}</p>
                <p className="text-[11px] text-muted-foreground">{t("pgpKeywords.step1Desc")}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
              <div className="h-6 w-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[11px] font-bold shrink-0">2</div>
              <div>
                <p className="text-xs font-semibold">{t("pgpKeywords.step2Title")}</p>
                <p className="text-[11px] text-muted-foreground">{t("pgpKeywords.step2Desc")}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
              <div className="h-6 w-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[11px] font-bold shrink-0">3</div>
              <div>
                <p className="text-xs font-semibold">{t("pgpKeywords.step3Title")}</p>
                <p className="text-[11px] text-muted-foreground">{t("pgpKeywords.step3Desc")}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative w-full sm:max-w-xs">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t("pgpKeywords.searchPlaceholder")} value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pl-8 h-9" />
        </div>
        {folders.length > 0 && (
          <Select value={folderFilter} onValueChange={(v) => { setFolderFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="h-9 w-full sm:w-[180px]">
              <FolderOpen className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder={t("pgpKeywords.allFolders")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("pgpKeywords.allFolders")}</SelectItem>
              <SelectItem value="__none__">{t("pgpKeywords.uncategorized")}</SelectItem>
              {folders.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {folderFilter !== "__all__" && folderFilter !== "__none__" && (
          <Button size="sm" variant="outline" onClick={() => openEditor(undefined, folderFilter)} className="h-9">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> {t("pgpKeywords.addToFolder", { folder: folderFilter })}
          </Button>
        )}
      </div>

      {/* Folder / Keyword Group cards — top-level view */}
      {folderFilter === "__all__" && !searchQuery && (() => {
        const uncategorizedCount = keywords.filter(k => !k.folder).length;
        const hasAnything = folders.length > 0 || uncategorizedCount > 0;
        if (!hasAnything) return null;
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {folders.map(folder => {
              const groupKws = keywords.filter(k => k.folder === folder);
              const count = groupKws.length;
              const totalTerms = groupKws.reduce((s, k) => s + (k.term_count || 0), 0);
              return (
                <div
                  key={folder}
                  className="group relative rounded-xl border bg-card hover:bg-accent/40 hover:border-primary/50 transition-all p-4 cursor-pointer"
                  onClick={() => { setFolderFilter(folder); setCurrentPage(1); }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FolderOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{folder}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {count} {count !== 1 ? t("pgpKeywords.keywords") : t("pgpKeywords.keyword")} · {totalTerms} term{totalTerms !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={(e) => { e.stopPropagation(); openEditor(undefined, folder); }}
                      title={t("pgpKeywords.addKeywordToFolder", { folder })}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <ChevronRight className="absolute right-3 bottom-3 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              );
            })}
            {uncategorizedCount > 0 && (
              <div
                className="group relative rounded-xl border border-dashed bg-card hover:bg-accent/40 hover:border-primary/50 transition-all p-4 cursor-pointer"
                onClick={() => { setFolderFilter("__none__"); setCurrentPage(1); }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <KeyRound className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{t("pgpKeywords.uncategorized")}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {uncategorizedCount} {uncategorizedCount !== 1 ? t("pgpKeywords.keywords") : t("pgpKeywords.keyword")}
                    </p>
                  </div>
                </div>
                <ChevronRight className="absolute right-3 bottom-3 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </div>
        );
      })()}

      {/* Back to folders bar — shown when drilled into a folder */}
      {(folderFilter !== "__all__") && !searchQuery && (
        <div className="flex items-center gap-2 text-sm">
          <Button variant="ghost" size="sm" onClick={() => { setFolderFilter("__all__"); setCurrentPage(1); }} className="h-8 -ml-2">
            <ChevronLeft className="h-4 w-4 mr-1" /> {t("pgpKeywords.allFolders")}
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="font-semibold flex items-center gap-1.5">
            <FolderOpen className="h-4 w-4 text-primary" />
            {folderFilter === "__none__" ? t("pgpKeywords.uncategorized") : folderFilter}
          </span>
        </div>
      )}

      {(folderFilter === "__all__" && !searchQuery && (folders.length > 0 || keywords.some(k => !k.folder))) ? null : isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="shadow-surface">
          <CardContent className="p-8 sm:p-12 text-center">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <KeyRound className="h-8 w-8 text-primary/60" />
            </div>
            <h3 className="font-semibold text-base mb-1">{keywords.length === 0 ? t("pgpKeywords.emptyFirstKeyword") : t("pgpKeywords.emptyNoMatch")}</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              {keywords.length === 0 ? t("pgpKeywords.emptyFirstDesc") : t("pgpKeywords.emptySearchHint")}
            </p>
            {keywords.length === 0 && (
              <>
                <div className="flex flex-col sm:flex-row items-center gap-2 justify-center mb-4">
                  <Button onClick={() => openEditor()} className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" /> {t("pgpKeywords.addKeywordBtn")}
                  </Button>
                </div>
                <div className="text-left max-w-sm mx-auto space-y-1.5 mt-4">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{t("pgpKeywords.quickTipsTitle")}</p>
                  <p className="text-xs text-muted-foreground">• <strong>{t("pgpKeywords.quickTip1Bold")}</strong> {t("pgpKeywords.quickTip1Text")}</p>
                  <p className="text-xs text-muted-foreground">• <strong>{t("pgpKeywords.quickTip2Bold")}</strong> {t("pgpKeywords.quickTip2Text")}</p>
                  <p className="text-xs text-muted-foreground">• <strong>{t("pgpKeywords.quickTip3Bold")}</strong> {t("pgpKeywords.quickTip3Text")}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-surface overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                 <TableRow>
                  <TableHead className="min-w-[140px]">{t("pgpKeywords.colKeyword")}</TableHead>
                  <TableHead className="min-w-[80px]">{t("pgpKeywords.colFolder")}</TableHead>
                  <TableHead className="min-w-[80px]">{t("pgpKeywords.colSource")}</TableHead>
                  <TableHead className="min-w-[60px]">{t("pgpKeywords.colTerms")}</TableHead>
                  <TableHead className="hidden md:table-cell min-w-[60px]">{t("pgpKeywords.colColumns")}</TableHead>
                  <TableHead className="hidden sm:table-cell min-w-[90px]">{t("pgpKeywords.colUpdated")}</TableHead>
                  <TableHead className="text-right w-10">{t("pgpKeywords.colActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map(kw => (
                  <TableRow key={kw.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <KeyRound className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-medium font-mono text-xs sm:text-sm cursor-pointer hover:text-primary truncate max-w-[120px] sm:max-w-none" onClick={() => openEditor(kw)}>{`{${kw.name}}`}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {kw.folder ? (
                        <Badge variant="secondary" className="text-[10px]"><FolderOpen className="h-3 w-3 mr-1" />{kw.folder}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] capitalize">{sourceLabels[kw.source] || kw.source}</Badge></TableCell>
                    <TableCell><span className="text-sm tabular-nums">{kw.term_count}</span></TableCell>
                    <TableCell className="hidden md:table-cell"><span className="text-sm tabular-nums">{(kw.columns || []).length || "—"}</span></TableCell>
                    <TableCell className="hidden sm:table-cell"><span className="text-xs text-muted-foreground">{new Date(kw.updated_at).toLocaleDateString()}</span></TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => openEditor(kw)}><Pencil className="h-3.5 w-3.5 mr-2" /> {t("pgpKeywords.actionEdit")}</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicateKeyword(kw)}><Copy className="h-3.5 w-3.5 mr-2" /> {t("pgpKeywords.actionDuplicate")}</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => exportKeyword(kw)}><Download className="h-3.5 w-3.5 mr-2" /> {t("pgpKeywords.actionExport")}</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(kw)}><Trash2 className="h-3.5 w-3.5 mr-2" /> {t("pgpKeywords.actionDelete")}</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-3 sm:px-4 py-3">
              <p className="text-xs text-muted-foreground">{t("pgpKeywords.paginationRange", { start: (safePage - 1) * PAGE_SIZE + 1, end: Math.min(safePage * PAGE_SIZE, filtered.length), total: filtered.length })}</p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={safePage <= 1} onClick={() => setCurrentPage(safePage - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={safePage >= totalPages} onClick={() => setCurrentPage(safePage + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Keyword Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={(v) => { if (!v) { setEditorOpen(false); resetEditor(); } }}>
        <DialogContent className="sm:w-[min(96vw,60rem)] sm:max-w-none max-h-[calc(100dvh-1rem)] sm:max-h-[92dvh] flex flex-col overflow-hidden p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              {editing ? t("pgpKeywords.editorTitleEdit") : t("pgpKeywords.editorTitleAdd")}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 space-y-5 mt-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">{t("pgpKeywords.labelKeywordName")}</Label>
              <Input placeholder={t("pgpKeywords.placeholderKeywordName")} value={kwName} onChange={(e) => setKwName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))} className="font-mono h-11" />
              <p className="text-[11px] text-muted-foreground">{t("pgpKeywords.keywordNameHint")} <code className="bg-muted px-1 rounded">{`{${kwName || "keyword"}}`}</code></p>
            </div>

            {/* Folder Selection */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">{t("pgpKeywords.labelFolder")} <span className="text-muted-foreground font-normal">{t("pgpKeywords.folderOptional")}</span></Label>
              <div className="flex gap-2">
                <Select value={kwFolder || "__none__"} onValueChange={(v) => { setKwFolder(v === "__none__" ? "" : v); setNewFolderName(""); }}>
                  <SelectTrigger className="h-9 flex-1">
                    <SelectValue placeholder={t("pgpKeywords.noFolder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("pgpKeywords.noFolder")}</SelectItem>
                    {folders.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    <SelectItem value="__new__">{t("pgpKeywords.createNewFolder")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {kwFolder === "__new__" && (
                <Input placeholder={t("pgpKeywords.placeholderFolderName")} value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} className="h-9 mt-1.5" autoFocus />
              )}
              <p className="text-[11px] text-muted-foreground">{t("pgpKeywords.folderHint")}</p>
            </div>

            {/* Source Selection */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">{t("pgpKeywords.labelSource")}</Label>
              <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-10 gap-2">
                {sourceOptions.map(s => (
                  <button key={s.value} onClick={() => setKwSource(s.value)}
                    className={`flex flex-col items-center gap-0.5 p-2 rounded-xl border text-center transition-all ${kwSource === s.value ? "border-primary bg-primary/10 ring-1 ring-primary/30" : "border-border hover:bg-accent"}`}>
                    <s.icon className="h-3.5 w-3.5" />
                    <span className="text-[9px] font-medium leading-tight">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Generation */}
            {kwSource === "ai" && (
              <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                <p className="text-xs font-semibold flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary" /> {t("pgpKeywords.aiSectionTitle")}</p>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_100px] gap-2">
                  <Input placeholder={t("pgpKeywords.aiTopicPlaceholder")} value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} className="h-9" />
                  <Select value={aiLanguage} onValueChange={setAiLanguage}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Language" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {["English","French","Spanish","German","Italian","Portuguese","Dutch","Polish","Turkish","Arabic","Hindi","Bengali","Urdu","Chinese","Japanese","Korean","Russian","Swedish","Norwegian","Danish","Finnish","Greek","Hebrew","Indonesian","Malay","Thai","Vietnamese","Ukrainian","Czech","Romanian","Hungarian"].map(l => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="number" placeholder={t("pgpKeywords.aiCountPlaceholder")} value={aiCount} onChange={(e) => setAiCount(e.target.value)} className="h-9" min={1} max={500} />
                </div>
                <Button size="sm" onClick={generateAiTerms} disabled={aiGenerating || !aiTopic.trim()}>
                  {aiGenerating ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> {t("pgpKeywords.aiGenerating")}</> : <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> {t("pgpKeywords.aiGenerateBtn")}</>}
                </Button>
              </div>
            )}

            {/* Location Source with Radius/Area */}
            {kwSource === "location" && (
              <div className="rounded-xl border bg-muted/30 p-4 space-y-4">
                <p className="text-xs font-semibold flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary" /> {t("pgpKeywords.locSectionTitle")}</p>

                {/* Radius vs Area */}
                <div className="grid grid-cols-2 gap-3">
                  {(["radius", "area"] as const).map(mode => (
                    <button key={mode} onClick={() => setLocMode(mode)}
                      className={`p-3 rounded-xl border text-center transition-all ${locMode === mode ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:bg-accent"}`}>
                      <RadioGroup value={locMode} className="justify-center pointer-events-none"><RadioGroupItem value={mode} /></RadioGroup>
                      <p className="text-xs font-semibold mt-1">{mode === "radius" ? t("pgpKeywords.locModeRadius") : t("pgpKeywords.locModeArea")}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {mode === "radius" ? t("pgpKeywords.locModeRadiusDesc") : t("pgpKeywords.locModeAreaDesc")}
                      </p>
                    </button>
                  ))}
                </div>

                {locMode === "radius" ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">{t("pgpKeywords.locLabelCountry")}</Label>
                      <Select value={locCountry} onValueChange={setLocCountry}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent className="max-h-60">
                          {locCountries.length > 0 ? locCountries.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>) : <SelectItem value="US">United States</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t("pgpKeywords.locLabelCenterCity")}</Label>
                      <Input placeholder={t("pgpKeywords.locPlaceholderCenterCity")} value={locCenterCity} onChange={(e) => setLocCenterCity(e.target.value)} className="h-9" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">{t("pgpKeywords.locLabelRadius")}</Label>
                        <Input type="number" value={locRadius} onChange={(e) => setLocRadius(e.target.value)} className="h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t("pgpKeywords.locLabelUnit")}</Label>
                        <Select value={locRadiusUnit} onValueChange={setLocRadiusUnit}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="miles">{t("pgpKeywords.locUnitMiles")}</SelectItem>
                            <SelectItem value="km">{t("pgpKeywords.locUnitKm")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">{t("pgpKeywords.locLabelCountry")}</Label>
                      <Select value={locCountry} onValueChange={(v) => { setLocCountry(v); setLocState(""); setLocCounty(""); }}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent className="max-h-60">
                          {locCountries.length > 0 ? locCountries.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>) : <SelectItem value="US">United States</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t("pgpKeywords.locLabelRegionsStates")}</Label>
                      <Select value={locState || "__all__"} onValueChange={(v) => { setLocState(v === "__all__" ? "" : v); setLocCounty(""); }}>
                        <SelectTrigger className="h-9"><SelectValue placeholder={t("pgpKeywords.locAllStatesPlaceholder")} /></SelectTrigger>
                        <SelectContent className="max-h-60">
                          <SelectItem value="__all__">{t("pgpKeywords.locAllStates")}</SelectItem>
                          {locStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t("pgpKeywords.locLabelCounties")}</Label>
                      <Select value={locCounty || "__all__"} onValueChange={(v) => setLocCounty(v === "__all__" ? "" : v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder={t("pgpKeywords.locAllCountiesPlaceholder")} /></SelectTrigger>
                        <SelectContent className="max-h-60">
                          <SelectItem value="__all__">{t("pgpKeywords.locAllCounties")}</SelectItem>
                          {locCounties.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs">{t("pgpKeywords.locLabelIncludeFields")}</Label>
                  <div className="flex flex-wrap gap-3">
                    {locIncludeFields.map(field => (
                      <label key={field.key} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <Checkbox checked={locInclude[field.key]} onCheckedChange={(v) => setLocInclude(prev => ({ ...prev, [field.key]: !!v }))} />
                        <span>{field.label}</span>
                      </label>
                    ))}
                  </div>
                  {locInclude.demographics && (
                    <p className="text-[10px] text-muted-foreground">{t("pgpKeywords.locDemographicsHint")}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">{t("pgpKeywords.locLabelFormat")}</Label>
                  <Input value={locFormat} onChange={(e) => setLocFormat(e.target.value)} className="h-9 font-mono text-xs" placeholder={t("pgpKeywords.locFormatPlaceholder")} />
                  <p className="text-[10px] text-muted-foreground">{t("pgpKeywords.locFormatVariables")}</p>
                </div>

                <Button size="sm" onClick={generateLocationTerms} disabled={locLoading}>
                  {locLoading ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> {t("pgpKeywords.locLoading")}</> : <><MapPin className="h-3.5 w-3.5 mr-1.5" /> {t("pgpKeywords.locGenerateBtn")}</>}
                </Button>
              </div>
            )}

            {/* Dynamic URL Sources */}
            {["csv_url", "google_sheet", "rss_feed"].includes(kwSource) && (
              <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                <p className="text-xs font-semibold flex items-center gap-1.5">
                  {kwSource === "rss_feed" ? <Rss className="h-3.5 w-3.5 text-primary" /> : <Link2 className="h-3.5 w-3.5 text-primary" />}
                  {kwSource === "csv_url" && t("pgpKeywords.dynFetchCsvUrl")}
                  {kwSource === "google_sheet" && t("pgpKeywords.dynFetchGoogleSheet")}
                  {kwSource === "rss_feed" && t("pgpKeywords.dynFetchRss")}
                </p>
                <Input
                  placeholder={kwSource === "csv_url" ? t("pgpKeywords.dynPlaceholderCsvUrl") : kwSource === "google_sheet" ? t("pgpKeywords.dynPlaceholderSheet") : t("pgpKeywords.dynPlaceholderRss")}
                  value={dynUrl} onChange={(e) => setDynUrl(e.target.value)} className="h-9 font-mono text-xs" />
                {kwSource === "google_sheet" && <p className="text-[10px] text-muted-foreground">{t("pgpKeywords.dynGoogleSheetHint")}</p>}
                <Button size="sm" onClick={fetchDynamicSource} disabled={dynLoading || !dynUrl.trim()}>
                  {dynLoading ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> {t("pgpKeywords.dynFetching")}</> : <><Download className="h-3.5 w-3.5 mr-1.5" /> {t("pgpKeywords.dynFetchBtn")}</>}
                </Button>
              </div>
            )}

            {/* Website Source */}
            {kwSource === "website" && (
              <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                <p className="text-xs font-semibold flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-primary" /> {t("pgpKeywords.webSectionTitle")}</p>
                {websites.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t("pgpKeywords.webNoSites")}</p>
                ) : (
                  <>
                    <Select value={webSiteId || "__none__"} onValueChange={(v) => setWebSiteId(v === "__none__" ? "" : v)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder={t("pgpKeywords.webSelectPlaceholder")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">{t("pgpKeywords.webSelectOption")}</SelectItem>
                        {websites.map(w => <SelectItem key={w.id} value={w.id}>{w.name} ({w.url})</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">{t("pgpKeywords.webScanHint")}</p>
                    <Button size="sm" onClick={fetchWebsiteKeywords} disabled={webLoading || !webSiteId}>
                      {webLoading ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> {t("pgpKeywords.webScanning")}</> : <><Download className="h-3.5 w-3.5 mr-1.5" /> {t("pgpKeywords.webExtractBtn")}</>}
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* URL Scan Source */}
            {kwSource === "url_scan" && (
              <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                <p className="text-xs font-semibold flex items-center gap-1.5"><ExternalLink className="h-3.5 w-3.5 text-primary" /> {t("pgpKeywords.scanSectionTitle")}</p>
                <p className="text-[11px] text-muted-foreground">{t("pgpKeywords.scanDesc")}</p>
                <Input
                  placeholder={t("pgpKeywords.scanPlaceholder")}
                  value={scanUrl}
                  onChange={(e) => setScanUrl(e.target.value)}
                  className="h-9 font-mono text-xs"
                />
                <Button size="sm" onClick={fetchUrlKeywords} disabled={scanLoading || !scanUrl.trim()}>
                  {scanLoading ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> {t("pgpKeywords.scanScanning")}</> : <><Wand2 className="h-3.5 w-3.5 mr-1.5" /> {t("pgpKeywords.scanDetectBtn")}</>}
                </Button>
              </div>
            )}

            {/* Template source */}
            {kwSource === "template" && (() => {
              const selectedTpl = pgpTemplates.find(x => x.id === tmplId);
              // Geo + business/personal variables are filled by the Campaign wizard (Locations + Business Info),
              // not by Keyword Groups. Hide them from the mapping preview so users don't create empty groups for them.
              const BUSINESS_VARS = new Set([
                "company_name","company","brand_name","brand","business_name",
                "phone","phone_number","email","address","website","url","owner","author",
              ]);
              const isSkipped = (n: string) => {
                const k = n.trim().toLowerCase();
                return BUSINESS_VARS.has(k) || GEO_VAR_NAMES.includes(k);
              };
              const extractVars = (tpl: typeof pgpTemplates[number] | undefined): string[] => {
                if (!tpl) return [];
                let names: string[];
                if (Array.isArray(tpl.variables) && tpl.variables.length > 0) {
                  names = [...new Set(tpl.variables.map(v => String(v).replace(/[{}]/g, "").trim()).filter(Boolean))];
                } else {
                  const combined = `${tpl.content || ""} ${tpl.seo_title_pattern || ""} ${tpl.seo_description_pattern || ""}`;
                  const matches = combined.match(/\{([a-z0-9_]+)\}/gi) || [];
                  names = [...new Set(matches.map(m => m.replace(/[{}]/g, "").toLowerCase()))];
                }
                return names.filter(n => !isSkipped(n));
              };
              const vars = extractVars(selectedTpl);
              const existingNames = new Set(keywords.map(k => k.name.toLowerCase()));
              const bulkCreate = async () => {
                if (!wsId || !selectedTpl || vars.length === 0) return;
                setTmplBulkCreating(true);
                try {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) throw new Error("Not signed in");
                  const toCreate = vars.filter(v => !existingNames.has(v.toLowerCase()));
                  if (toCreate.length === 0) {
                    toast({ title: "Nothing to create", description: "All variables already have keyword groups." });
                    return;
                  }
                  const rows = toCreate.map(v => ({
                    name: v, source: "local", terms: [], term_count: 0, columns: [], delimiter: null,
                    source_config: { from_template: selectedTpl.id, template_name: selectedTpl.name },
                    workspace_id: wsId, user_id: user.id,
                  }));
                  const { error } = await supabase.from("pgp_keywords").insert(rows as any);
                  if (error) throw error;
                  queryClient.invalidateQueries({ queryKey: ["pgp-keywords"] });
                  toast({ title: `Created ${toCreate.length} keyword group${toCreate.length !== 1 ? "s" : ""}`, description: `From template "${selectedTpl.name}".` });
                  setEditorOpen(false); resetEditor();
                } catch (err: any) {
                  toast({ title: "Bulk create failed", description: err.message, variant: "destructive" });
                } finally { setTmplBulkCreating(false); }
              };
              return (
                <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                  <p className="text-xs font-semibold flex items-center gap-1.5"><Wand2 className="h-3.5 w-3.5 text-primary" /> Pull variables from a template</p>
                  <p className="text-[11px] text-muted-foreground">Pick one of your campaign templates. Every &#123;variable&#125; in that template becomes a keyword group.</p>
                  <Select value={tmplId || "__none__"} onValueChange={(v) => setTmplId(v === "__none__" ? "" : v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder={pgpTemplates.length === 0 ? "No templates yet — create one from Templates" : "Pick a template"} /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {pgpTemplates.length === 0
                        ? <SelectItem value="__none__" disabled>No templates in this workspace</SelectItem>
                        : pgpTemplates.map(tpl => <SelectItem key={tpl.id} value={tpl.id}>{tpl.name}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  {selectedTpl && (
                    <>
                      {vars.length === 0 ? (
                        <p className="text-[11px] text-warning">This template has no &#123;variables&#125;. Add some in the Templates page first.</p>
                      ) : (
                        <>
                          <div className="space-y-1.5">
                            <Label className="text-[11px] text-muted-foreground">{vars.length} variable{vars.length !== 1 ? "s" : ""} found — click one to use its name for this group:</Label>
                            <div className="flex flex-wrap gap-1.5">
                              {vars.map(v => {
                                const exists = existingNames.has(v.toLowerCase());
                                return (
                                  <button
                                    key={v}
                                    type="button"
                                    onClick={() => { setKwName(v); setKwSource("local"); }}
                                    className={`font-mono text-[11px] px-2 py-1 rounded border transition-colors ${exists ? "bg-muted text-muted-foreground border-border cursor-help" : "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"}`}
                                    title={exists ? "A keyword group with this name already exists" : "Use this variable as this group's name"}
                                  >
                                    {`{${v}}`}{exists && " ✓"}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Table preview: mapping status + default values per variable */}
                          <div className="rounded-lg border bg-background/50 overflow-hidden">
                            <div className="px-3 py-2 border-b bg-muted/40 flex items-center justify-between">
                              <p className="text-[11px] font-semibold">Variable mapping preview</p>
                              <p className="text-[10px] text-muted-foreground">
                                {vars.filter(v => existingNames.has(v.toLowerCase())).length} mapped · {vars.filter(v => !existingNames.has(v.toLowerCase())).length} empty
                              </p>
                            </div>
                            <div className="max-h-64 overflow-auto">
                              <table className="w-full text-[11px]">
                                <thead className="bg-muted/20 sticky top-0">
                                  <tr className="text-left text-muted-foreground">
                                    <th className="px-3 py-1.5 font-medium">Variable</th>
                                    <th className="px-3 py-1.5 font-medium">Status</th>
                                    <th className="px-3 py-1.5 font-medium">Terms</th>
                                    <th className="px-3 py-1.5 font-medium">Sample default values</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {vars.map(v => {
                                    const match = keywords.find(k => k.name.toLowerCase() === v.toLowerCase());
                                    const terms: string[] = Array.isArray(match?.terms) ? (match!.terms as any[]).map(String) : [];
                                    const sample = terms.slice(0, 3).join(", ");
                                    return (
                                      <tr key={v} className="border-t">
                                        <td className="px-3 py-1.5 font-mono text-primary">{`{${v}}`}</td>
                                        <td className="px-3 py-1.5">
                                          {match ? (
                                            terms.length > 0
                                              ? <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">● Mapped</span>
                                              : <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">● Empty group</span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 text-muted-foreground">○ Not created</span>
                                          )}
                                        </td>
                                        <td className="px-3 py-1.5 tabular-nums">{match ? terms.length : "—"}</td>
                                        <td className="px-3 py-1.5 text-muted-foreground truncate max-w-[240px]" title={terms.join(", ")}>
                                          {sample || <span className="italic opacity-70">no values yet</span>}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <p className="text-[10.5px] text-muted-foreground">
                              Or bulk-create empty groups for every variable not yet in your library.
                            </p>
                            <Button size="sm" variant="outline" onClick={() => setTmplConfirmOpen(true)} disabled={tmplBulkCreating || vars.every(v => existingNames.has(v.toLowerCase()))}>
                              {tmplBulkCreating ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Creating…</> : <><Plus className="h-3.5 w-3.5 mr-1.5" /> Create all missing</>}
                            </Button>
                          </div>

                          <AlertDialog open={tmplConfirmOpen} onOpenChange={setTmplConfirmOpen}>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Create missing keyword groups?</AlertDialogTitle>
                                <AlertDialogDescription asChild>
                                  <div className="space-y-3">
                                    {(() => {
                                      const toCreate = vars.filter(v => !existingNames.has(v.toLowerCase()));
                                      const skipped = vars.filter(v => existingNames.has(v.toLowerCase()));
                                      return (
                                        <>
                                          <p className="text-sm">
                                            Template <span className="font-semibold text-foreground">"{selectedTpl.name}"</span> — {toCreate.length} new keyword group{toCreate.length !== 1 ? "s" : ""} will be created, {skipped.length} skipped (already exist).
                                          </p>
                                          {toCreate.length > 0 && (
                                            <div>
                                              <p className="text-xs font-semibold text-foreground mb-1.5">Will create:</p>
                                              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-auto rounded border bg-muted/40 p-2">
                                                {toCreate.map(v => (
                                                  <span key={v} className="font-mono text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">{`{${v}}`}</span>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                          {skipped.length > 0 && (
                                            <div>
                                              <p className="text-xs font-semibold text-foreground mb-1.5">Will skip (already exist):</p>
                                              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-auto rounded border bg-muted/40 p-2">
                                                {skipped.map(v => (
                                                  <span key={v} className="font-mono text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground border">{`{${v}}`} ✓</span>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                          <p className="text-[11px] text-muted-foreground">Each new group starts empty — you can add terms afterwards.</p>
                                        </>
                                      );
                                    })()}
                                  </div>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel disabled={tmplBulkCreating}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={(e) => { e.preventDefault(); setTmplConfirmOpen(false); bulkCreate(); }} disabled={tmplBulkCreating}>
                                  {tmplBulkCreating ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Creating…</> : "Confirm & create"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </>
                  )}
                </div>
              );
            })()}

            {/* File Import (CSV, Excel, TXT, JSON) */}
            {(kwSource === "csv" || kwSource === "text") && (
              <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                <p className="text-xs font-semibold flex items-center gap-1.5"><Upload className="h-3.5 w-3.5 text-primary" /> {t("pgpKeywords.importSectionTitle")}</p>
                <input ref={importRef} type="file" accept={kwSource === "text" ? ".txt" : ".txt,.csv,.json,.xlsx,.xls"} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importTerms(f); }} />
                <Button variant="outline" size="sm" onClick={() => importRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5 mr-1.5" /> {kwSource === "text" ? t("pgpKeywords.importUploadTxt") : t("pgpKeywords.importUploadFile")}
                </Button>
                <p className="text-[11px] text-muted-foreground">{kwSource === "text" ? t("pgpKeywords.importHintTxt") : t("pgpKeywords.importHintFile")}</p>
              </div>
            )}

            {/* Terms textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">{t("pgpKeywords.labelTerms")}</Label>
                <span className="text-[11px] text-muted-foreground tabular-nums">{t("pgpKeywords.termCount", { count: kwTerms.split("\n").filter(Boolean).length })}</span>
              </div>
              <Textarea placeholder={t("pgpKeywords.termsPlaceholder")} value={kwTerms} onChange={(e) => setKwTerms(e.target.value)} rows={10} className="font-mono text-xs leading-relaxed" />
              <p className="text-[11px] text-muted-foreground">{t("pgpKeywords.termsHint")}</p>
            </div>

            {/* Delimiter & Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("pgpKeywords.labelDelimiter")}</Label>
                <Input placeholder={t("pgpKeywords.placeholderDelimiter")} value={kwDelimiter} onChange={(e) => setKwDelimiter(e.target.value)} className="font-mono h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("pgpKeywords.labelColumns")}</Label>
                <Input placeholder={t("pgpKeywords.placeholderColumns")} value={kwColumns} onChange={(e) => setKwColumns(e.target.value)} className="font-mono h-9 text-sm" />
                <p className="text-[10px] text-muted-foreground">{t("pgpKeywords.columnsHint")} <code className="bg-muted px-1 rounded">{`{${kwName || "keyword"}(column_name)}`}</code></p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 px-6 py-3 border-t bg-card">
            <Button variant="outline" onClick={() => { setEditorOpen(false); resetEditor(); }}>{t("pgpKeywords.btnCancel")}</Button>
            {!editing && (
              <Button variant="secondary" onClick={() => saveMutation.mutate({ keepOpen: true })} disabled={!kwName.trim() || saveMutation.isPending}>
                {saveMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> {t("pgpKeywords.btnSaving")}</> : <><Plus className="h-4 w-4 mr-1" /> {t("pgpKeywords.btnSaveAndAdd")}</>}
              </Button>
            )}
            <Button onClick={() => saveMutation.mutate({})} disabled={!kwName.trim() || saveMutation.isPending}>
              {saveMutation.isPending ? t("pgpKeywords.btnSaving") : editing ? t("pgpKeywords.btnSaveChanges") : t("pgpKeywords.btnCreateKeyword")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>


      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("pgpKeywords.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("pgpKeywords.deleteDescPre")} <strong>{`{${deleteTarget?.name}}`}</strong> {t("pgpKeywords.deleteDescMid", { count: deleteTarget?.term_count || 0 })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("pgpKeywords.deleteBtnCancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("pgpKeywords.deleteBtnConfirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
