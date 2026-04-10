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
  MapPin, Globe, Link2, Rss, Wand2, LayoutGrid,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import * as XLSX from "xlsx";

const PAGE_SIZE = 15;

interface PgpKeyword {
  id: string;
  workspace_id: string;
  user_id: string;
  name: string;
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
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<PgpKeyword | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PgpKeyword | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [autoWizardOpen, setAutoWizardOpen] = useState(false);

  // Editor state
  const [kwName, setKwName] = useState("");
  const [kwSource, setKwSource] = useState("local");
  const [kwTerms, setKwTerms] = useState("");
  const [kwDelimiter, setKwDelimiter] = useState("");
  const [kwColumns, setKwColumns] = useState("");
  const [aiTopic, setAiTopic] = useState("");
  const [aiCount, setAiCount] = useState("20");
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

  const filtered = keywords.filter(kw => !searchQuery || kw.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const resetEditor = () => {
    setKwName(""); setKwSource("local"); setKwTerms(""); setKwDelimiter(""); setKwColumns("");
    setAiTopic(""); setAiCount("20"); setLocCountry("US"); setLocState(""); setLocCounty("");
    setLocMode("area"); setLocRadius("50"); setLocRadiusUnit("miles"); setLocCenterCity("");
    setLocInclude({ city: true, state: true, zip: false, county: false, region: false, area_code: false, population: false, demographics: false });
    setLocFormat("{city}, {state}"); setDynUrl(""); setWebSiteId("");
    setEditing(null);
  };

  const openEditor = (kw?: PgpKeyword) => {
    if (kw) {
      setEditing(kw); setKwName(kw.name); setKwSource(kw.source);
      setKwTerms((kw.terms || []).join("\n")); setKwDelimiter(kw.delimiter || "");
      setKwColumns((kw.columns || []).join(", "));
      if (kw.source_config) {
        if (kw.source_config.country) setLocCountry(kw.source_config.country);
        if (kw.source_config.state) setLocState(kw.source_config.state);
        if (kw.source_config.format) setLocFormat(kw.source_config.format);
        if (kw.source_config.url) setDynUrl(kw.source_config.url);
        if (kw.source_config.mode) setLocMode(kw.source_config.mode);
      }
    } else { resetEditor(); }
    setEditorOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !wsId) throw new Error("Not authenticated");
      const cleanName = kwName.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
      if (!cleanName) throw new Error("Keyword name is required");
      const termsArray = kwTerms.split("\n").map(t => t.trim()).filter(Boolean);
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
      }
      const payload = { name: cleanName, source: kwSource, terms: termsArray, delimiter: kwDelimiter || null, columns: columnsArray, term_count: termsArray.length, source_config: sourceConfig, workspace_id: wsId, user_id: user.id };
      if (editing?.id) {
        const { error } = await supabase.from("pgp_keywords").update(payload as any).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pgp_keywords").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["pgp-keywords"] }); toast({ title: editing ? "Keyword updated" : "Keyword created" }); setEditorOpen(false); resetEditor(); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("pgp_keywords").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["pgp-keywords"] }); toast({ title: "Keyword deleted" }); setDeleteTarget(null); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const duplicateKeyword = async (kw: PgpKeyword) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !wsId) return;
    const { error } = await supabase.from("pgp_keywords").insert({ ...kw, id: undefined, name: `${kw.name}_copy_${Date.now().toString(36)}`, workspace_id: wsId, user_id: user.id, created_at: undefined, updated_at: undefined } as any);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { queryClient.invalidateQueries({ queryKey: ["pgp-keywords"] }); toast({ title: "Keyword duplicated" }); }
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
      // txt, csv, or any text
      const text = await file.text();
      lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    }

    setKwTerms(prev => prev ? `${prev}\n${lines.join("\n")}` : lines.join("\n"));
    toast({ title: `${lines.length} terms imported` });
    if (importRef.current) importRef.current.value = "";
  };

  const generateAiTerms = async () => {
    if (!aiTopic.trim()) return;
    setAiGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-template", {
        body: { prompt: `Generate exactly ${aiCount} unique terms for a keyword called "${kwName || aiTopic}". Topic: ${aiTopic}. Output ONLY the terms, one per line. No numbering, no explanations, no markdown.` },
      });
      if (error) throw error;
      const raw = (data?.content || "").replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
      const lines = raw.split("\n").map((l: string) => l.replace(/^\d+[\.\)]\s*/, "").trim()).filter(Boolean);
      setKwTerms(prev => prev ? `${prev}\n${lines.join("\n")}` : lines.join("\n"));
      toast({ title: `${lines.length} AI terms generated` });
    } catch (err: any) { toast({ title: "Failed", description: err.message, variant: "destructive" }); }
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
        // For radius: first find center city coordinates, then filter
        const { data: centerData } = await supabase.from("locations").select("latitude, longitude").eq("country_code", locCountry).ilike("city", locCenterCity.trim()).limit(1);
        if (!centerData || centerData.length === 0) { toast({ title: "Center city not found", variant: "destructive" }); setLocLoading(false); return; }
        const cLat = Number(centerData[0].latitude);
        const cLng = Number(centerData[0].longitude);
        const radiusKm = locRadiusUnit === "miles" ? Number(locRadius) * 1.60934 : Number(locRadius);
        const latDelta = radiusKm / 111;
        const lngDelta = radiusKm / (111 * Math.cos(cLat * Math.PI / 180));
        query = query.gte("latitude", cLat - latDelta).lte("latitude", cLat + latDelta).gte("longitude", cLng - lngDelta).lte("longitude", cLng + lngDelta);
      }

      const { data, error } = await query.limit(1000);
      if (error) throw error;
      if (!data || data.length === 0) { toast({ title: "No locations found", variant: "destructive" }); setLocLoading(false); return; }

      // If radius mode, further filter by actual distance
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
            const dist = 3959 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); // miles
            return dist <= maxDist;
          });
        }
      }

      // Build columns and terms based on include settings
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
        setKwTerms(prev => prev ? `${prev}\n${delimTerms.join("\n")}` : delimTerms.join("\n"));
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
        setKwTerms(prev => prev ? `${prev}\n${terms.join("\n")}` : terms.join("\n"));
      }

      toast({ title: `${finalData.length} location terms generated` });
    } catch (err: any) { toast({ title: "Failed", description: err.message, variant: "destructive" }); }
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
        let lines: string[] = [];
        if (Array.isArray(json)) lines = json.map((item: any) => typeof item === "string" ? item : JSON.stringify(item));
        else if (json.items) lines = json.items.map((item: any) => typeof item === "string" ? item : item.title || item.name || JSON.stringify(item));
        if (lines.length > 0) { setKwTerms(prev => prev ? `${prev}\n${lines.join("\n")}` : lines.join("\n")); toast({ title: `${lines.length} terms fetched from JSON` }); return; }
      } catch {}
      if (text.includes("<rss") || text.includes("<feed") || text.includes("<item")) {
        const doc = new DOMParser().parseFromString(text, "text/xml");
        const items = doc.querySelectorAll("item title, entry title");
        const lines = Array.from(items).map(el => el.textContent?.trim() || "").filter(Boolean);
        if (lines.length > 0) { setKwTerms(prev => prev ? `${prev}\n${lines.join("\n")}` : lines.join("\n")); toast({ title: `${lines.length} terms fetched from RSS` }); return; }
      }
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      setKwTerms(prev => prev ? `${prev}\n${lines.join("\n")}` : lines.join("\n"));
      toast({ title: `${lines.length} terms fetched` });
    } catch (err: any) { toast({ title: "Failed to fetch", description: err.message, variant: "destructive" }); }
    finally { setDynLoading(false); }
  };

  const fetchWebsiteKeywords = async () => {
    if (!webSiteId) { toast({ title: "Please select a website", variant: "destructive" }); return; }
    setWebLoading(true);
    try {
      const site = websites.find(w => w.id === webSiteId);
      if (!site) throw new Error("Website not found");
      const { data, error } = await supabase.functions.invoke("fetch-site-content", { body: { url: site.url, websiteId: site.id } });
      if (error) throw error;
      const pages = data?.pages || [];
      if (pages.length === 0) throw new Error("No pages found on this website");
      // Extract keywords from page titles, headings, and meta
      const allTerms = new Set<string>();
      for (const page of pages) {
        const title = page.title || "";
        if (title) allTerms.add(title.trim());
        // Extract from headings if available
        const headings = page.headings || [];
        for (const h of headings) {
          if (h && typeof h === "string") allTerms.add(h.trim());
        }
        // Extract meta keywords
        const metaKw = page.meta_keywords || page.keywords || "";
        if (metaKw) {
          metaKw.split(",").map((k: string) => k.trim()).filter(Boolean).forEach((k: string) => allTerms.add(k));
        }
      }
      const lines = [...allTerms].filter(Boolean);
      if (lines.length === 0) throw new Error("Could not extract keywords from website pages");
      setKwTerms(prev => prev ? `${prev}\n${lines.join("\n")}` : lines.join("\n"));
      toast({ title: `${lines.length} keywords extracted from ${pages.length} pages` });
    } catch (err: any) { toast({ title: "Failed to fetch", description: err.message, variant: "destructive" }); }
    finally { setWebLoading(false); }
  };

  const runAutoWizard = async () => {
    if (!wizService.trim()) return;
    setWizGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !wsId) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("generate-template", {
        body: {
          prompt: `You are a Page Generator Pro assistant. Given the service/product "${wizService}" and target locations "${wizLocations || "United States"}":

1. Generate a keyword group called "service" with 15-20 relevant service variations (one per line).
2. Generate a keyword group called "city" with 15-20 target city names (one per line).
3. Generate an HTML content template for a landing page that uses {service} and {city} variables. Include H1, H2 sections, FAQ, and call-to-action. Make it SEO-optimized.
4. Generate a meta title pattern and meta description pattern using {service} and {city}.

Output as JSON: { "service_terms": [...], "city_terms": [...], "template_name": "...", "template_content": "...", "seo_title": "...", "seo_description": "..." }`
        },
      });
      if (error) throw error;
      const raw = (data?.content || "").replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
      const result = JSON.parse(raw);

      // Create service keyword
      await supabase.from("pgp_keywords").insert({
        name: "service", source: "ai", terms: result.service_terms || [], term_count: (result.service_terms || []).length,
        columns: [], delimiter: null, source_config: { auto_generated: true, topic: wizService }, workspace_id: wsId, user_id: user.id,
      } as any);

      // Create city keyword
      await supabase.from("pgp_keywords").insert({
        name: "city", source: "ai", terms: result.city_terms || [], term_count: (result.city_terms || []).length,
        columns: [], delimiter: null, source_config: { auto_generated: true, topic: wizLocations }, workspace_id: wsId, user_id: user.id,
      } as any);

      // Create content group (template)
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
      toast({ title: "Auto-generated!", description: "Keywords and Content Group created. Go to Generate to start." });
      setAutoWizardOpen(false);
      setWizService(""); setWizLocations("");
    } catch (err: any) { toast({ title: "Failed", description: err.message, variant: "destructive" }); }
    finally { setWizGenerating(false); }
  };

  const sourceLabels: Record<string, string> = {
    local: "Local", csv: "CSV", ai: "AI", location: "Location",
    csv_url: "CSV URL", google_sheet: "Sheet", rss_feed: "RSS",
    website: "Website", text: "Text File",
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-display">Keywords</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">Define reusable keyword groups with terms that cycle during page generation.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => setAutoWizardOpen(true)}>
            <Wand2 className="mr-1.5 h-3.5 w-3.5" /> <span className="hidden sm:inline">Auto-</span>Generate
          </Button>
          <Button size="sm" onClick={() => openEditor()}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Keyword
          </Button>
        </div>
      </div>

      {/* PGP Workflow Guide - show when no keywords */}
      {!isLoading && keywords.length === 0 && (
        <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-transparent p-4 sm:p-5">
          <h3 className="font-semibold text-sm mb-1">🚀 How Page Generator Pro Works</h3>
          <p className="text-xs text-muted-foreground mb-3">Follow these 3 steps to mass-generate SEO pages:</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-start gap-2 rounded-lg bg-primary/10 p-3">
              <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[11px] font-bold shrink-0">1</div>
              <div>
                <p className="text-xs font-semibold text-primary">Keywords</p>
                <p className="text-[11px] text-muted-foreground">Create keyword groups with terms like cities, services, etc.</p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
              <div className="h-6 w-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[11px] font-bold shrink-0">2</div>
              <div>
                <p className="text-xs font-semibold">Content Groups</p>
                <p className="text-[11px] text-muted-foreground">Create templates using your keyword variables.</p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
              <div className="h-6 w-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[11px] font-bold shrink-0">3</div>
              <div>
                <p className="text-xs font-semibold">Generate</p>
                <p className="text-[11px] text-muted-foreground">Combine keywords + templates to generate pages.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative w-full sm:max-w-xs">
        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search keywords..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pl-8 h-9" />
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="shadow-surface">
          <CardContent className="p-8 sm:p-12 text-center">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <KeyRound className="h-8 w-8 text-primary/60" />
            </div>
            <h3 className="font-semibold text-base mb-1">{keywords.length === 0 ? "Create Your First Keyword" : "No matching keywords"}</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              {keywords.length === 0 ? "Keywords are template variables (like {city} or {service}) with lists of terms. Each page uses a different combination." : "Try adjusting your search."}
            </p>
            {keywords.length === 0 && (
              <>
                <div className="flex flex-col sm:flex-row items-center gap-2 justify-center mb-4">
                  <Button onClick={() => setAutoWizardOpen(true)} className="w-full sm:w-auto">
                    <Wand2 className="mr-2 h-4 w-4" /> Auto-Generate (Easiest)
                  </Button>
                  <Button variant="outline" onClick={() => openEditor()} className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" /> Add Manually
                  </Button>
                </div>
                <div className="text-left max-w-sm mx-auto space-y-1.5 mt-4">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">💡 Quick tips</p>
                  <p className="text-xs text-muted-foreground">• <strong>Auto-Generate</strong> creates keywords + a content template from your business description</p>
                  <p className="text-xs text-muted-foreground">• <strong>Location source</strong> pulls city/state data from our US locations database</p>
                  <p className="text-xs text-muted-foreground">• <strong>Import</strong> terms from CSV, Excel, text files, or Google Sheets</p>
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
                  <TableHead className="min-w-[140px]">Keyword</TableHead>
                  <TableHead className="min-w-[80px]">Source</TableHead>
                  <TableHead className="min-w-[60px]">Terms</TableHead>
                  <TableHead className="hidden md:table-cell min-w-[60px]">Columns</TableHead>
                  <TableHead className="hidden sm:table-cell min-w-[90px]">Updated</TableHead>
                  <TableHead className="text-right w-10">Actions</TableHead>
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
                    <TableCell><Badge variant="outline" className="text-[10px] capitalize">{sourceLabels[kw.source] || kw.source}</Badge></TableCell>
                    <TableCell><span className="text-sm tabular-nums">{kw.term_count}</span></TableCell>
                    <TableCell className="hidden md:table-cell"><span className="text-sm tabular-nums">{(kw.columns || []).length || "—"}</span></TableCell>
                    <TableCell className="hidden sm:table-cell"><span className="text-xs text-muted-foreground">{new Date(kw.updated_at).toLocaleDateString()}</span></TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => openEditor(kw)}><Pencil className="h-3.5 w-3.5 mr-2" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicateKeyword(kw)}><Copy className="h-3.5 w-3.5 mr-2" /> Duplicate</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => exportKeyword(kw)}><Download className="h-3.5 w-3.5 mr-2" /> Export</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(kw)}><Trash2 className="h-3.5 w-3.5 mr-2" /> Delete</DropdownMenuItem>
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
              <p className="text-xs text-muted-foreground">{(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}</p>
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
              {editing ? "Edit Keyword" : "Add Keyword"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 space-y-5 mt-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Keyword Name</Label>
              <Input placeholder="e.g., service, city, product_name" value={kwName} onChange={(e) => setKwName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))} className="font-mono h-11" />
              <p className="text-[11px] text-muted-foreground">Use in templates as <code className="bg-muted px-1 rounded">{`{${kwName || "keyword"}}`}</code></p>
            </div>

            {/* Source Selection */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Source</Label>
              <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-10 gap-2">
                {[
                  { value: "local", label: "Local", icon: FileText, desc: "Manual" },
                  { value: "csv", label: "File", icon: Database, desc: "CSV/Excel/TXT" },
                  { value: "ai", label: "AI", icon: Sparkles, desc: "Generated" },
                  { value: "location", label: "Location", icon: MapPin, desc: "Database" },
                  { value: "csv_url", label: "CSV URL", icon: Link2, desc: "Remote" },
                  { value: "google_sheet", label: "Sheet", icon: Globe, desc: "Google" },
                  { value: "rss_feed", label: "RSS", icon: Rss, desc: "Feed" },
                  { value: "website", label: "Website", icon: Globe, desc: "From Site" },
                  { value: "text", label: "Text", icon: FileText, desc: ".txt file" },
                ].map(s => (
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
                <p className="text-xs font-semibold flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary" /> AI Term Generator</p>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px] gap-2">
                  <Input placeholder="Topic (e.g., plumbing services)" value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} className="h-9" />
                  <Input type="number" placeholder="Count" value={aiCount} onChange={(e) => setAiCount(e.target.value)} className="h-9" min={1} max={500} />
                </div>
                <Button size="sm" onClick={generateAiTerms} disabled={aiGenerating || !aiTopic.trim()}>
                  {aiGenerating ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Generating...</> : <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Generate Terms</>}
                </Button>
              </div>
            )}

            {/* Location Source with Radius/Area */}
            {kwSource === "location" && (
              <div className="rounded-xl border bg-muted/30 p-4 space-y-4">
                <p className="text-xs font-semibold flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary" /> Generate Location Keywords</p>

                {/* Radius vs Area */}
                <div className="grid grid-cols-2 gap-3">
                  {(["radius", "area"] as const).map(mode => (
                    <button key={mode} onClick={() => setLocMode(mode)}
                      className={`p-3 rounded-xl border text-center transition-all ${locMode === mode ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:bg-accent"}`}>
                      <RadioGroup value={locMode} className="justify-center pointer-events-none"><RadioGroupItem value={mode} /></RadioGroup>
                      <p className="text-xs font-semibold mt-1 capitalize">{mode}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {mode === "radius" ? "Fixed radius from an address" : "Specific Regions, States or Counties"}
                      </p>
                    </button>
                  ))}
                </div>

                {locMode === "radius" ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Country</Label>
                      <Select value={locCountry} onValueChange={setLocCountry}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent className="max-h-60">
                          {locCountries.length > 0 ? locCountries.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>) : <SelectItem value="US">United States</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Center City</Label>
                      <Input placeholder="e.g., New York" value={locCenterCity} onChange={(e) => setLocCenterCity(e.target.value)} className="h-9" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Radius</Label>
                        <Input type="number" value={locRadius} onChange={(e) => setLocRadius(e.target.value)} className="h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Unit</Label>
                        <Select value={locRadiusUnit} onValueChange={setLocRadiusUnit}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="miles">Miles</SelectItem>
                            <SelectItem value="km">Kilometers</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Country</Label>
                      <Select value={locCountry} onValueChange={(v) => { setLocCountry(v); setLocState(""); setLocCounty(""); }}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent className="max-h-60">
                          {locCountries.length > 0 ? locCountries.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>) : <SelectItem value="US">United States</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Regions / States</Label>
                      <Select value={locState || "__all__"} onValueChange={(v) => { setLocState(v === "__all__" ? "" : v); setLocCounty(""); }}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="All states" /></SelectTrigger>
                        <SelectContent className="max-h-60">
                          <SelectItem value="__all__">All States</SelectItem>
                          {locStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Counties</Label>
                      <Select value={locCounty || "__all__"} onValueChange={(v) => setLocCounty(v === "__all__" ? "" : v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="All counties" /></SelectTrigger>
                        <SelectContent className="max-h-60">
                          <SelectItem value="__all__">All Counties</SelectItem>
                          {locCounties.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs">Include Fields</Label>
                  <div className="flex flex-wrap gap-3">
                    {([
                      { key: "city", label: "City" },
                      { key: "state", label: "State" },
                      { key: "county", label: "County" },
                      { key: "zip", label: "ZIP Code" },
                      { key: "region", label: "Region" },
                      { key: "area_code", label: "Area Code" },
                      { key: "population", label: "Population" },
                      { key: "demographics", label: "Demographics" },
                    ] as const).map(field => (
                      <label key={field.key} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <Checkbox checked={locInclude[field.key]} onCheckedChange={(v) => setLocInclude(prev => ({ ...prev, [field.key]: !!v }))} />
                        <span>{field.label}</span>
                      </label>
                    ))}
                  </div>
                  {locInclude.demographics && (
                    <p className="text-[10px] text-muted-foreground">Demographics includes: Population by Gender, Median Age, Median Household Income</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Term Format</Label>
                  <Input value={locFormat} onChange={(e) => setLocFormat(e.target.value)} className="h-9 font-mono text-xs" placeholder="{city}, {state}" />
                  <p className="text-[10px] text-muted-foreground">Variables: {"{city}"}, {"{state}"}, {"{state_code}"}, {"{county}"}, {"{zip_code}"}, {"{region}"}, {"{area_code}"}, {"{population}"}</p>
                </div>

                <Button size="sm" onClick={generateLocationTerms} disabled={locLoading}>
                  {locLoading ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Loading...</> : <><MapPin className="h-3.5 w-3.5 mr-1.5" /> Generate Location Terms</>}
                </Button>
              </div>
            )}

            {/* Dynamic URL Sources */}
            {["csv_url", "google_sheet", "rss_feed"].includes(kwSource) && (
              <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                <p className="text-xs font-semibold flex items-center gap-1.5">
                  {kwSource === "rss_feed" ? <Rss className="h-3.5 w-3.5 text-primary" /> : <Link2 className="h-3.5 w-3.5 text-primary" />}
                  {kwSource === "csv_url" && "Fetch from CSV URL"}
                  {kwSource === "google_sheet" && "Fetch from Google Sheets (Published CSV)"}
                  {kwSource === "rss_feed" && "Fetch from RSS Feed"}
                </p>
                <Input placeholder={kwSource === "csv_url" ? "https://example.com/data.csv" : kwSource === "google_sheet" ? "https://docs.google.com/spreadsheets/d/.../export?format=csv" : "https://example.com/feed.xml"}
                  value={dynUrl} onChange={(e) => setDynUrl(e.target.value)} className="h-9 font-mono text-xs" />
                {kwSource === "google_sheet" && <p className="text-[10px] text-muted-foreground">Publish your Google Sheet as CSV: File → Share → Publish to web → Select CSV format</p>}
                <Button size="sm" onClick={fetchDynamicSource} disabled={dynLoading || !dynUrl.trim()}>
                  {dynLoading ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Fetching...</> : <><Download className="h-3.5 w-3.5 mr-1.5" /> Fetch Terms</>}
                </Button>
              </div>
            )}

            {/* Airtable Source */}
            {kwSource === "airtable" && (
              <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                <p className="text-xs font-semibold flex items-center gap-1.5"><LayoutGrid className="h-3.5 w-3.5 text-primary" /> Fetch from Airtable</p>
                <Input placeholder="Airtable API Key (pat...)" value={extApiKey} onChange={(e) => setExtApiKey(e.target.value)} className="h-9 text-xs" type="password" />
                <Input placeholder="Base ID / Table ID (app.../tbl...)" value={extTableId} onChange={(e) => setExtTableId(e.target.value)} className="h-9 font-mono text-xs" />
                <p className="text-[10px] text-muted-foreground">Get your API key from airtable.com/account. The Table ID is in the URL of your table.</p>
                <Button size="sm" onClick={fetchAirtableData} disabled={extLoading || !extApiKey || !extTableId}>
                  {extLoading ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Fetching...</> : <><Download className="h-3.5 w-3.5 mr-1.5" /> Fetch from Airtable</>}
                </Button>
              </div>
            )}

            {/* Notion Source */}
            {kwSource === "notion" && (
              <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                <p className="text-xs font-semibold flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-primary" /> Fetch from Notion</p>
                <Input placeholder="Notion Integration Token (secret_...)" value={extApiKey} onChange={(e) => setExtApiKey(e.target.value)} className="h-9 text-xs" type="password" />
                <Input placeholder="Database ID (32-char hex)" value={extDatabaseId} onChange={(e) => setExtDatabaseId(e.target.value)} className="h-9 font-mono text-xs" />
                <p className="text-[10px] text-muted-foreground">Create an integration at notion.so/my-integrations. Share your database with the integration, then copy the Database ID from the URL.</p>
                <Button size="sm" onClick={fetchNotionData} disabled={extLoading || !extApiKey || !extDatabaseId}>
                  {extLoading ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Fetching...</> : <><Download className="h-3.5 w-3.5 mr-1.5" /> Fetch from Notion</>}
                </Button>
              </div>
            )}

            {/* File Import (CSV, Excel, TXT, JSON) */}
            {(kwSource === "csv" || kwSource === "text") && (
              <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                <p className="text-xs font-semibold flex items-center gap-1.5"><Upload className="h-3.5 w-3.5 text-primary" /> Import from File</p>
                <input ref={importRef} type="file" accept={kwSource === "text" ? ".txt" : ".txt,.csv,.json,.xlsx,.xls"} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importTerms(f); }} />
                <Button variant="outline" size="sm" onClick={() => importRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5 mr-1.5" /> {kwSource === "text" ? "Upload Text File (.txt)" : "Upload File (TXT, CSV, JSON, Excel)"}
                </Button>
                <p className="text-[11px] text-muted-foreground">{kwSource === "text" ? "One term per line in a plain text file." : "One term per line. CSV/Excel uses the first column."}</p>
              </div>
            )}

            {/* Terms textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Terms</Label>
                <span className="text-[11px] text-muted-foreground tabular-nums">{kwTerms.split("\n").filter(Boolean).length} term(s)</span>
              </div>
              <Textarea placeholder={"bathroom installations\nfixing leaks\ncentral heating\nkitchen plumbing"} value={kwTerms} onChange={(e) => setKwTerms(e.target.value)} rows={10} className="font-mono text-xs leading-relaxed" />
              <p className="text-[11px] text-muted-foreground">One term per line. Each generated page uses a different term.</p>
            </div>

            {/* Delimiter & Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Delimiter (optional)</Label>
                <Input placeholder="e.g., | or ," value={kwDelimiter} onChange={(e) => setKwDelimiter(e.target.value)} className="font-mono h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Column Names (optional)</Label>
                <Input placeholder="e.g., city, state, zip" value={kwColumns} onChange={(e) => setKwColumns(e.target.value)} className="font-mono h-9 text-sm" />
                <p className="text-[10px] text-muted-foreground">Access as <code className="bg-muted px-1 rounded">{`{${kwName || "keyword"}(column_name)}`}</code></p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-6 py-3 border-t bg-card">
            <Button variant="outline" onClick={() => { setEditorOpen(false); resetEditor(); }}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!kwName.trim() || saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : editing ? "Save Changes" : "Create Keyword"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Auto-Generate Wizard */}
      <Dialog open={autoWizardOpen} onOpenChange={setAutoWizardOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Wand2 className="h-5 w-5 text-primary" /> Auto-Generate Keywords & Content Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">Enter your service or product and AI will automatically create keyword groups and a matching content template.</p>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Service / Product *</Label>
              <Input placeholder="e.g., Plumbing Services, Dental Clinic, Real Estate" value={wizService} onChange={(e) => setWizService(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Target Locations (optional)</Label>
              <Input placeholder="e.g., California, New York, Texas" value={wizLocations} onChange={(e) => setWizLocations(e.target.value)} />
              <p className="text-[11px] text-muted-foreground">Comma-separated. Leave empty for US cities.</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">This will create:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>A <strong>service</strong> keyword with relevant term variations</li>
                <li>A <strong>city</strong> keyword with target locations</li>
                <li>A <strong>Content Group</strong> template optimized for SEO</li>
              </ul>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAutoWizardOpen(false)}>Cancel</Button>
              <Button onClick={runAutoWizard} disabled={wizGenerating || !wizService.trim()}>
                {wizGenerating ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Generating...</> : <><Wand2 className="h-4 w-4 mr-1.5" /> Create Keywords & Content Group</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Keyword?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete <strong>{`{${deleteTarget?.name}}`}</strong> and its {deleteTarget?.term_count || 0} terms.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
