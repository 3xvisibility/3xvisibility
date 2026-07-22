import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Play, Eye, FileText, KeyRound, Layers, Loader2,
  CheckCircle2, XCircle, AlertTriangle, Zap, Settings2,
  RotateCcw, Shuffle, ArrowDown, ListOrdered, Sparkles, RefreshCw, History, MapPin, ChevronRight, Bookmark, Building2, Download,
} from "lucide-react";
import { exportDataFile } from "@/lib/export-csv";

import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSearchParams, useNavigate } from "react-router-dom";
import { filterDesignVars } from "@/lib/design-vars-filter";
import { useLanguage } from "@/i18n/LanguageContext";
import { TemplatePreview } from "@/components/templates/TemplatePreview";
import { ExistingSiteOptimizePanel } from "@/components/website-content/ExistingSiteOptimizePanel";
import { LocationDatabaseDialog } from "@/components/campaigns/LocationDatabaseDialog";

type Template = Tables<"templates">;

interface PgpKeyword {
  id: string;
  name: string;
  terms: string[];
  term_count: number;
  delimiter: string | null;
  columns: string[];
}

export default function PgpGeneratePage() {
  const [searchParams] = useSearchParams();
  const preselectedGroup = searchParams.get("group") || "";

  const [selectedGroupId, setSelectedGroupId] = useState(preselectedGroup);
  const [campaignNameDraft, setCampaignNameDraft] = useState("");
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 3 — Locations picked from Location Database
  const [pickedLocations, setPickedLocations] = useState<Array<{ city?: string; state?: string; region?: string; country?: string; zip?: string }>>([]);

  // Step 4 — Business / personal info (variable name -> value). Any of these
  // whose key matches a template {variable} will replace it during generation.
  const [businessInfo, setBusinessInfo] = useState<Record<string, string>>({
    company_name: "",
    brand_name: "",
    phone: "",
    email: "",
    address: "",
    website: "",
  });
  const [customBizFieldName, setCustomBizFieldName] = useState("");
  const [customBizFieldValue, setCustomBizFieldValue] = useState("");
  const [method, setMethod] = useState<"all" | "sequential" | "random">("sequential");
  const [numberOfPages, setNumberOfPages] = useState("");
  const [resumeIndex, setResumeIndex] = useState("0");
  const [selectedWebsite, setSelectedWebsite] = useState("");
  const [publishMode, setPublishMode] = useState("draft");
  const [isGenerating, setIsGenerating] = useState(false);
  const [testPreview, setTestPreview] = useState<string | null>(null);
  const [genProgress, setGenProgress] = useState<{ processed: number; total: number; errors: number } | null>(null);
  const [sampleRowIndex, setSampleRowIndex] = useState(0);

  // Overwrite settings
  const [overwrite, setOverwrite] = useState(false);
  const [overwriteFields, setOverwriteFields] = useState({
    title: true,
    content: true,
    excerpt: true,
    seo: true,
    featuredImage: true,
    customFields: true,
    taxonomies: false,
    author: false,
    publishDate: false,
  });

  // Spin & scheduling
  const [spinContent, setSpinContent] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<"immediate" | "specific" | "increment" | "random">("immediate");
  const [scheduleDate, setScheduleDate] = useState("");
  const [incrementHours, setIncrementHours] = useState("24");
  const [scheduleDateStart, setScheduleDateStart] = useState("");
  const [scheduleDateEnd, setScheduleDateEnd] = useState("");

  // AI keyword auto-fill
  const [showAiKeywordFill, setShowAiKeywordFill] = useState(false);
  const [aiKwBusiness, setAiKwBusiness] = useState("");
  const [aiKwCustomData, setAiKwCustomData] = useState("");
  const [aiKwCount, setAiKwCount] = useState("10");
  const [aiKwFilling, setAiKwFilling] = useState(false);
  const [oneClickLinking, setOneClickLinking] = useState(false);

  // Brand name
  const [brandSource, setBrandSource] = useState<"website" | "custom">("website");
  const [customBrandName, setCustomBrandName] = useState("");

  // AI generation
  const [aiBusinessDesc, setAiBusinessDesc] = useState("");
  const [aiKeywords, setAiKeywords] = useState("");
  const [aiTerms, setAiTerms] = useState("");
  const [aiLocations, setAiLocations] = useState("");
  const [aiPageCount, setAiPageCount] = useState("10");
  const [aiLanguage, setAiLanguage] = useState("en");
  const [aiGenerating, setAiGenerating] = useState(false);

  // Where the keyword strategy comes from: an existing website or a new niche.
  const [aiSource, setAiSource] = useState<"website" | "niche">("niche");
  const [aiSourceUrl, setAiSourceUrl] = useState("");
  const [aiNiche, setAiNiche] = useState("");
  const [aiCategory, setAiCategory] = useState("");
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{
    status: "idle" | "scanning" | "ready" | "error";
    source?: string;
    keywords: string[];
    terms: string[];
    locations: string[];
    error?: string;
  }>({ status: "idle", keywords: [], terms: [], locations: [] });
  const [scanPhase, setScanPhase] = useState(0);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [runHistory, setRunHistory] = useState<
    { at: string; source: string; keywords: number; terms: number; locations: number }[]
  >([]);

  const [showLocationsDialog, setShowLocationsDialog] = useState(false);

  const HISTORY_KEY = "pgp-keyword-run-history";

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setRunHistory(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const recordRun = (source: string, keywords: number, terms: number, locations: number) => {
    setRunHistory((prev) => {
      const next = [
        { at: new Date().toISOString(), source, keywords, terms, locations },
        ...prev,
      ].slice(0, 20);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const scanPhases = [
    "Fetching source content…",
    "Extracting keywords…",
    "Identifying terms & locations…",
    "Ranking best keywords…",
  ];

  useEffect(() => {
    if (analysis.status !== "scanning") {
      setScanPhase(0);
      return;
    }
    const id = setInterval(() => {
      setScanPhase((p) => (p < scanPhases.length - 1 ? p + 1 : p));
    }, 1400);
    return () => clearInterval(id);
  }, [analysis.status]);

  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { currentWorkspace, basePath } = useWorkspace();
  const wsId = currentWorkspace?.id;

  useEffect(() => {
    if (preselectedGroup) setSelectedGroupId(preselectedGroup);
  }, [preselectedGroup]);

  // One-shot prefill from the Keyword Groups page ("Use in Campaign").
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("__campaign_prefill");
      if (!raw) return;
      sessionStorage.removeItem("__campaign_prefill");
      const p = JSON.parse(raw) as { name?: string; templateId?: string; startStep?: number };
      if (p.name) setCampaignNameDraft(p.name);
      if (p.templateId) setSelectedGroupId(p.templateId);
      if (typeof p.startStep === "number" && p.startStep >= 1 && p.startStep <= 5) {
        setStep(p.startStep as 1 | 2 | 3 | 4 | 5);
      }
    } catch { /* ignore */ }
  }, []);

  const { data: contentGroups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ["pgp-content-groups", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase.from("templates").select("*").eq("workspace_id", wsId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Template[];
    },
  });

  // Saved Keyword Groups (bundle: template + language + variable terms)
  const { data: keywordGroups = [] } = useQuery({
    queryKey: ["pgp-keyword-groups-picker", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pgp_keyword_groups")
        .select("id, name, template_id, language, variables, updated_at")
        .eq("workspace_id", wsId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown) as Array<{
        id: string; name: string; template_id: string | null;
        language: string; variables: Array<{ name: string; terms: string[] }>;
      }>;
    },
  });

  // In-memory keyword overrides sourced from a picked Keyword Group.
  // Merged into `groupKeywords` so we don't have to persist duplicates in pgp_keywords.
  const [keywordOverrides, setKeywordOverrides] = useState<Record<string, { terms: string[]; term_count: number }>>({});
  const [selectedKeywordGroupId, setSelectedKeywordGroupId] = useState<string>("");

  const applyKeywordGroup = (groupId: string) => {
    setSelectedKeywordGroupId(groupId);
    if (!groupId) { setKeywordOverrides({}); return; }
    const g = keywordGroups.find(x => x.id === groupId);
    if (!g) return;
    if (g.template_id) setSelectedGroupId(g.template_id);
    if (!campaignNameDraft.trim()) setCampaignNameDraft(g.name);
    const overrides: Record<string, { terms: string[]; term_count: number }> = {};
    for (const v of (g.variables || [])) {
      const terms = (v.terms || []).filter(Boolean);
      if (terms.length > 0) overrides[v.name] = { terms, term_count: terms.length };
    }
    setKeywordOverrides(overrides);
    toast({ title: `Applied "${g.name}"`, description: `${Object.keys(overrides).length} variable(s) filled from group.` });
  };

  const { data: keywords = [] } = useQuery({
    queryKey: ["pgp-keywords-full", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase.from("pgp_keywords").select("*").eq("workspace_id", wsId!);
      if (error) throw error;
      return data as PgpKeyword[];
    },
  });

  const { data: websites = [] } = useQuery({
    queryKey: ["pgp-websites", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase.from("websites").select("id, name, url, type, status").eq("workspace_id", wsId!).order("name");
      if (error) throw error;
      return data;
    },
  });

  const selectedGroup = contentGroups.find(g => g.id === selectedGroupId);

  const groupKeywords = useMemo(() => {
    if (!selectedGroup) return [];
    const vars = filterDesignVars(selectedGroup.variables || []).map(v => v.replace(/[{}]/g, ""));
    return vars.map(v => {
      const kw = keywords.find(k => k.name === v);
      const override = keywordOverrides[v];
      if (kw) return { name: v, keyword: kw, termCount: kw.term_count || 0 };
      if (override) {
        return {
          name: v,
          keyword: { id: `override-${v}`, name: v, terms: override.terms, term_count: override.term_count, delimiter: null, columns: [] } as PgpKeyword,
          termCount: override.term_count,
        };
      }
      return { name: v, keyword: null, termCount: 0 };
    });
  }, [selectedGroup, keywords, keywordOverrides]);

  const maxPages = useMemo(() => {
    if (groupKeywords.length === 0) return 0;
    const counts = groupKeywords.filter(k => k.keyword).map(k => k.termCount);
    if (counts.length === 0) return 0;
    if (method === "all") {
      // All combinations
      return counts.reduce((a, b) => a * b, 1);
    }
    // Sequential/Random: max term count
    return Math.max(...counts);
  }, [groupKeywords, method]);

  // Business-info variable names always come from Step 4 (Business Info),
  // never from the Keyword group — classification is by NAME so the mapping
  // panel is stable even before the user types values.
  const BUSINESS_VAR_NAMES = [
    "business_name", "company_name", "brand_name", "brand",
    "phone", "phone_number", "tel", "telephone",
    "email", "email_address",
    "website", "url", "site_url",
  ];
  const isBusinessVariable = (name: string) => BUSINESS_VAR_NAMES.includes(name.trim().toLowerCase());

  // AI-content variables — long-form / SEO-copy fields where the AI should
  // craft unique content per row instead of the user typing terms in Keywords.
  // Classification is by NAME so it stays stable even before generation.
  const AI_CONTENT_VAR_NAMES = [
    "title", "page_title", "seo_title",
    "subtitle", "sub_title", "sub_headline",
    "heading", "sub_heading", "subheading", "headline", "hero_title", "hero_subtitle", "hero_heading",
    "tagline", "slogan",
    "description", "desc", "meta_description", "seo_description", "short_description", "long_description",
    "intro", "introduction", "summary", "overview", "about", "about_us",
    "body", "content", "paragraph", "text", "story",
    "cta", "cta_text", "cta_title", "cta_description", "call_to_action",
    "benefit", "benefits", "feature", "features",
    "faq", "faq_question", "faq_answer", "question", "answer",
    "testimonial", "testimonials", "review", "reviews",
    "why_choose_us", "why_us", "value_proposition",
  ];
  const isAiContentVariable = (name: string) => AI_CONTENT_VAR_NAMES.includes(name.trim().toLowerCase());

  // Variables satisfied by Step 4 (business info) — non-empty values only.
  const injectedBizVarNames = useMemo(
    () => new Set(Object.entries(businessInfo).filter(([, v]) => (v ?? "").trim() !== "").map(([k]) => k.toLowerCase())),
    [businessInfo],
  );

  const missingKeywords = groupKeywords.filter(k =>
    !k.keyword && !injectedBizVarNames.has(k.name.toLowerCase()) && !isBusinessVariable(k.name),
  );

  // Geo variables must come from the Campaign wizard's Location Database,
  // not AI-fabricated. Skip them in every auto-fill path.
  // Note: {address} is treated as a location field here so the mapping panel
  // groups it under "From Locations"; the value can still be supplied via
  // Business Info if a location doesn't provide one.
  const GEO_VAR_NAMES = ["city", "cities", "state", "states", "country", "countries", "zip", "zipcode", "region", "county", "location", "locations", "area", "address", "street", "street_address"];
  const isGeoVariable = (name: string) => GEO_VAR_NAMES.includes(name.trim().toLowerCase());

  // Placeholder / demo geo values that must never leak into real pages when the
  // user hasn't attached a Location Database source. These are common defaults
  // seeded by AI/keyword-generators or example templates.
  const PLACEHOLDER_GEO_VALUES = new Set([
    "new york", "new york city", "nyc",
    "los angeles", "la", "san francisco", "sf",
    "chicago", "boston", "seattle", "miami", "dallas", "houston", "austin",
    "canada", "united states", "usa", "u.s.a", "u.s.", "america",
    "united kingdom", "uk", "england", "london",
    "california", "texas", "florida",
    "example city", "example state", "example country", "your city", "your state", "your country",
  ]);
  const isPlaceholderGeoValue = (v: unknown) =>
    typeof v === "string" && PLACEHOLDER_GEO_VALUES.has(v.trim().toLowerCase());

  // A geo variable is considered unfilled when: (a) no locations picked AND
  // (b) it has no keyword terms, OR every attached term is a known placeholder.
  const unfilledGeoVars = groupKeywords
    .filter((gk) => isGeoVariable(gk.name))
    .filter((gk) => {
      if (pickedLocations.length > 0) return false;
      const terms = gk.keyword?.terms ?? [];
      if (terms.length === 0) return true;
      return terms.every((t) => isPlaceholderGeoValue(t));
    })
    .map((gk) => gk.name);
  const needsLocations = unfilledGeoVars.length > 0;


  const handleAiKeywordFill = async () => {
    if (!wsId || missingKeywords.length === 0 || !aiKwBusiness.trim()) return;
    setAiKwFilling(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t("settings.notAuthenticated"));

      const allVarNames = missingKeywords.map(k => k.name);
      const geoVars = allVarNames.filter(isGeoVariable);
      const varNames = allVarNames.filter(n => !isGeoVariable(n));

      // Create empty placeholder groups for geo vars — user must attach real
      // locations via the Campaign wizard.
      const { data: { user: geoUser } } = await supabase.auth.getUser();
      for (const g of geoVars) {
        await supabase.from("pgp_keywords").insert({
          name: g, terms: [], term_count: 0, source: "location",
          source_config: { note: "Attach real locations via Campaign wizard → Attach Locations" },
          user_id: geoUser?.id, workspace_id: wsId,
        } as any);
      }

      if (varNames.length === 0) {
        queryClient.invalidateQueries({ queryKey: ["pgp-keywords-full", wsId] });
        toast({
          title: "Geo variables skipped",
          description: `${geoVars.join(", ")} will be filled from real locations in the Campaign wizard.`,
        });
        setShowAiKeywordFill(false);
        setAiKwFilling(false);
        return;
      }

      const prompt = `Generate keyword data for an SEO page generator tool.

Business/Service: ${aiKwBusiness.trim()}
${aiKwCustomData.trim() ? `Additional context: ${aiKwCustomData.trim()}` : ""}

For each of these variables, generate ${aiKwCount} realistic, diverse terms that would be used on landing pages:
${varNames.map(v => `- {${v}}`).join("\n")}

Return a JSON object where each key is the variable name and the value is an array of string terms.
Example: {"service": ["Plumbing", "HVAC"], "quality": ["Best", "Top-rated"]}
Only return valid JSON. No markdown fences.`;

      const { data, error } = await supabase.functions.invoke("generate-seo-content", {
        body: { type: "batch_pages", prompt },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      let parsed: Record<string, string[]>;
      try {
        const raw = typeof data.result === "string" ? data.result : JSON.stringify(data.result);
        parsed = JSON.parse(raw.replace(/^```json?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim());
      } catch {
        throw new Error(t("pgpGenerate.errorAiInvalidData"));
      }

      // Create keyword groups for each variable
      for (const varName of varNames) {
        const terms = parsed[varName];
        if (!terms || !Array.isArray(terms) || terms.length === 0) continue;
        await supabase.from("pgp_keywords").insert({
          name: varName,
          terms: terms.map(t => String(t).trim()).filter(Boolean),
          term_count: terms.length,
          source: "ai",
          user_id: user.id,
          workspace_id: wsId,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["pgp-keywords-full", wsId] });
      toast({ title: t("pgpGenerate.toastKeywordsGeneratedTitle"), description: t("pgpGenerate.toastKeywordsGeneratedDesc", { count: varNames.length }) });
      setShowAiKeywordFill(false);
      setAiKwBusiness("");
      setAiKwCustomData("");
    } catch (err: any) {
      toast({ title: t("pgpGenerate.toastAiFillFailedTitle"), description: err.message, variant: "destructive" });
    } finally {
      setAiKwFilling(false);
    }
  };

  // ── One-Click Auto-Link ────────────────────────────────────────────
  // Zero-input helper: for every missing template variable, either link
  // an existing keyword group whose name matches (case/underscore/dash
  // insensitive) or auto-generate a small keyword group with AI using
  // the template name as context. Removes the manual "type business +
  // fill" step so users can jump straight to Generate.
  const handleOneClickAutoLink = async () => {
    if (!wsId || missingKeywords.length === 0 || oneClickLinking) return;
    setOneClickLinking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t("settings.notAuthenticated"));

      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
      const allTargets = missingKeywords.map((k) => k.name);
      const geoTargets = allTargets.filter(isGeoVariable);
      const targets = allTargets.filter((n) => !isGeoVariable(n));

      // Create empty placeholder groups for geo vars — real values come from
      // the Campaign wizard's Location Database, never from AI.
      for (const g of geoTargets) {
        await supabase.from("pgp_keywords").insert({
          name: g, terms: [], term_count: 0, source: "location",
          source_config: { note: "Attach real locations via Campaign wizard → Attach Locations" },
          user_id: user.id, workspace_id: wsId,
        } as any);
      }
      const stillMissing: string[] = [];
      let linked = 0;
      let cloned = 0;

      // 1) Try to link existing keyword groups by fuzzy-name match.
      for (const varName of targets) {
        const key = normalize(varName);
        const hit = keywords.find((k) => normalize(k.name) === key && k.name !== varName);
        if (hit && Array.isArray(hit.terms) && hit.terms.length > 0) {
          const { error } = await supabase.from("pgp_keywords").insert({
            name: varName,
            terms: hit.terms,
            term_count: hit.terms.length,
            source: "auto-link",
            user_id: user.id,
            workspace_id: wsId,
          } as any);
          if (!error) { cloned += 1; continue; }
        }
        stillMissing.push(varName);
      }

      // 2) For the rest, auto-generate with AI using the template as context.
      if (stillMissing.length > 0) {
        const templateContext =
          (selectedGroup?.name?.trim()) ||
          "generic local service business landing pages";
        const prompt = `Generate keyword data for an SEO page generator tool.

Business/Service context: ${templateContext}

For each of these variables, generate 12 realistic, diverse terms that would be used on landing pages:
${stillMissing.map((v) => `- {${v}}`).join("\n")}

Return a JSON object where each key is the variable name and the value is an array of string terms.
Example: {"city": ["Houston", "Dallas"], "service": ["Plumbing", "HVAC"]}
Only return valid JSON. No markdown fences.`;

        const { data, error } = await supabase.functions.invoke("generate-seo-content", {
          body: { type: "batch_pages", prompt },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);

        let parsed: Record<string, string[]> = {};
        try {
          const raw = typeof (data as any).result === "string"
            ? (data as any).result
            : JSON.stringify((data as any).result);
          parsed = JSON.parse(raw.replace(/^```json?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim());
        } catch {
          parsed = {};
        }

        for (const varName of stillMissing) {
          const terms = Array.isArray(parsed[varName])
            ? parsed[varName].map((s) => String(s).trim()).filter(Boolean)
            : [];
          if (terms.length === 0) continue;
          const { error: insErr } = await supabase.from("pgp_keywords").insert({
            name: varName,
            terms,
            term_count: terms.length,
            source: "auto-ai",
            user_id: user.id,
            workspace_id: wsId,
          } as any);
          if (!insErr) linked += 1;
        }
      }

      queryClient.invalidateQueries({ queryKey: ["pgp-keywords-full", wsId] });
      const total = linked + cloned;
      if (total === 0) {
        toast({
          title: "Nothing linked",
          description: "Try 'AI Auto-Fill' with a short business description.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "✨ Keyword groups linked!",
          description: `${cloned ? `${cloned} reused` : ""}${cloned && linked ? " · " : ""}${linked ? `${linked} AI-generated` : ""}. You can now Generate.`,
        });
      }
    } catch (err: any) {
      toast({ title: "Auto-link failed", description: err.message, variant: "destructive" });
    } finally {
      setOneClickLinking(false);
    }
  };


  const handleTestGenerate = async () => {
    if (!selectedGroup || !wsId) return;
    const sampleData: Record<string, string> = {};
    for (const gk of groupKeywords) {
      if (gk.keyword && gk.keyword.terms.length > 0) {
        if (method === "random") {
          sampleData[gk.name] = gk.keyword.terms[Math.floor(Math.random() * gk.keyword.terms.length)];
        } else {
          sampleData[gk.name] = gk.keyword.terms[0];
        }
      } else {
        sampleData[gk.name] = `[${gk.name}]`;
      }
    }
    if (resolvedBrandName) sampleData.brand_name = resolvedBrandName;

    // Use the renderer for a realistic preview
    let rendered = selectedGroup.content;
    // Process conditionals
    rendered = rendered.replace(
      /\{\{#if\s+(\w+)\}\}([\s\S]*?)(?:\{\{#else\}\}([\s\S]*?))?\{\{\/if\}\}/gi,
      (_m: string, varName: string, ifBlock: string, elseBlock?: string) => {
        const value = sampleData[varName] || sampleData[varName.toLowerCase()];
        return value && value.trim() && !value.startsWith("[") ? ifBlock : (elseBlock || "");
      }
    );
    // Process loops
    rendered = rendered.replace(
      /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/gi,
      (_m: string, varName: string, loopBlock: string) => {
        const value = sampleData[varName] || sampleData[varName.toLowerCase()];
        if (!value || value.startsWith("[")) return "";
        const items = value.split(",").map(s => s.trim()).filter(Boolean);
        return items.map((item, index) =>
          loopBlock.replace(/\{\{this\}\}/gi, item).replace(/\{\{@index\}\}/gi, String(index)).replace(/\{\{@number\}\}/gi, String(index + 1))
        ).join("\n");
      }
    );
    // Variable transforms
    rendered = rendered.replace(/\{(\w+):(\w+(?:\(\d+\))?)\}/gi, (_m: string, varName: string, transform: string) => {
      const rawVal = sampleData[varName] || sampleData[varName.toLowerCase()] || "";
      const txf = transform.toLowerCase();
      if (txf === "uppercase") return rawVal.toUpperCase();
      if (txf === "lowercase") return rawVal.toLowerCase();
      if (txf === "capitalize") return rawVal.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
      if (txf === "slug") return rawVal.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      return rawVal;
    });
    // Plain variable replacement
    for (const [key, val] of Object.entries(sampleData)) {
      rendered = rendered.replace(new RegExp(`\\{${key}\\}`, "gi"), val);
    }
    // Process spintax if enabled
    if (spinContent) {
      // Block spinning
      rendered = rendered.replace(/\[spin\]([\s\S]*?)\[\/spin\]/gi, (_m: string, inner: string) => {
        const blocks = inner.split("||").map(b => b.trim());
        return blocks[Math.floor(Math.random() * blocks.length)] || "";
      });
      // Inline spintax
      for (let i = 0; i < 10; i++) {
        const regex = /\{([^{}]*?\|[^{}]*?)\}/g;
        if (!regex.test(rendered)) break;
        rendered = rendered.replace(regex, (_m: string, group: string) => {
          const options = group.split("|");
          return options[Math.floor(Math.random() * options.length)];
        });
      }
    }
    // Build SEO title preview
    const seoTitlePattern = selectedGroup.seo_title_pattern || "";
    const seoDescPattern = selectedGroup.seo_description_pattern || "";
    let seoTitle = seoTitlePattern;
    let seoDesc = seoDescPattern;
    for (const [key, val] of Object.entries(sampleData)) {
      if (seoTitle) seoTitle = seoTitle.replace(new RegExp(`\\{${key}\\}`, "gi"), val);
      if (seoDesc) seoDesc = seoDesc.replace(new RegExp(`\\{${key}\\}`, "gi"), val);
    }
    // Wrap with preview header showing SEO info
    const seoPreviewHeader = (seoTitle || seoDesc) ? `
      <div style="background:#f0f4f8;border:1px solid #d0d7de;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-family:Arial,sans-serif;">
        <p style="margin:0 0 4px;font-size:18px;color:#1a0dab;font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${seoTitle || "Page Title"}</p>
        <p style="margin:0;font-size:13px;color:#4d5156;line-height:1.4;">${seoDesc || "Meta description preview..."}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#006621;">example.com › page-slug</p>
      </div>` : "";
    setTestPreview(seoPreviewHeader + rendered);
  };

  const resolvedBrandName = useMemo(() => {
    if (brandSource === "custom") return customBrandName.trim();
    const site = websites.find(w => w.id === selectedWebsite);
    return site?.name || "";
  }, [brandSource, customBrandName, selectedWebsite, websites]);

  // Injected values from Step 3 (locations) and Step 4 (business info).
  const buildInjectedForRow = (rowIndex: number): Record<string, string> => {
    const inject: Record<string, string> = {};
    // Business/personal info (direct keys)
    for (const [k, v] of Object.entries(businessInfo)) {
      if ((v ?? "").trim()) inject[k] = v.trim();
    }
    // Business info aliases so common template variables always resolve.
    const bizName = (businessInfo.company_name || businessInfo.brand_name || "").trim();
    if (bizName) {
      if (!inject.business_name) inject.business_name = bizName;
      if (!inject.brand) inject.brand = bizName;
    }
    const phone = (businessInfo.phone || "").trim();
    if (phone) {
      inject.phone_number = phone; inject.tel = phone; inject.telephone = phone;
    }
    const emailV = (businessInfo.email || "").trim();
    if (emailV) inject.email_address = emailV;
    const siteV = (businessInfo.website || "").trim();
    if (siteV) { inject.url = siteV; inject.site_url = siteV; }
    const addr = (businessInfo.address || "").trim();
    if (addr) { inject.street = addr; inject.street_address = addr; }

    // Locations cycle per row (win over any keyword-group / business defaults
    // for geographic fields).
    if (pickedLocations.length > 0) {
      const loc = pickedLocations[rowIndex % pickedLocations.length];
      const cityVal = (loc.city || "").toString().trim();
      const stateVal = (loc.state || loc.region || "").toString().trim();
      const countryVal = (loc.country || "").toString().trim();
      const regionVal = (loc.region || loc.state || "").toString().trim();
      const zipVal = (loc.zip || "").toString().trim();
      const locAddress = ((loc as any).address || "").toString().trim();
      if (cityVal) { inject.city = cityVal; inject.cities = cityVal; inject.location = cityVal; }
      if (stateVal) { inject.state = stateVal; inject.states = stateVal; }
      if (countryVal) { inject.country = countryVal; inject.countries = countryVal; }
      if (regionVal) { inject.region = regionVal; }
      if (zipVal) { inject.zip = zipVal; inject.zipcode = zipVal; }
      if (locAddress) inject.address = locAddress;
    }
    return inject;
  };

  const buildRows = (): Record<string, string>[] => {
    const kwData = groupKeywords.filter(k => k.keyword);

    const finalize = (rows: Record<string, string>[]): Record<string, string>[] => {
      // Geo names user explicitly attached in Step 3 — these must win over any
      // pre-existing keyword-group value so real Location DB data replaces
      // stale defaults (e.g. "New York", "Canada") coming from auto-generated
      // keyword groups.
      const GEO_KEYS = ["city", "cities", "state", "states", "country", "countries", "region", "zip", "zipcode", "location", "locations", "area", "address", "street", "street_address"];
      // Business-info keys always win over keyword-group values too so a
      // template's {business_name}/{phone}/{email} always use Step 4 data.
      const BIZ_KEYS = BUSINESS_VAR_NAMES;
      return rows.map((r, i) => {
        const injected = buildInjectedForRow(i);
        // Start with row values, then wipe geo/biz keys that will be overridden
        // by injected data so downstream merge is deterministic.
        const base: Record<string, string> = { ...r };
        if (pickedLocations.length > 0) {
          for (const k of GEO_KEYS) delete base[k];
          for (const k of BIZ_KEYS) {
            if (injected[k] !== undefined) delete base[k];
          }

        } else {
          // Safeguard: with no real Locations attached, strip placeholder
          // defaults (e.g. "New York", "Canada", "LA") so downstream generation
          // falls back to AI-fill instead of publishing fake geo data.
          for (const k of GEO_KEYS) {
            if (isPlaceholderGeoValue(base[k])) delete base[k];
          }
        }

        const merged: Record<string, string> = { ...base, ...injected };
        if (resolvedBrandName && !merged.brand_name) merged.brand_name = resolvedBrandName;
        return merged;
      });
    };

    // If there are no linked keyword groups but locations/business info exist,
    // still allow generation — produce N rows driven by locations count.
    if (kwData.length === 0) {
      if (pickedLocations.length === 0 && Object.values(businessInfo).every((v) => !(v ?? "").trim())) {
        return [];
      }
      const count = numberOfPages
        ? parseInt(numberOfPages)
        : (pickedLocations.length || 1);
      const rows: Record<string, string>[] = [];
      for (let i = 0; i < count; i++) rows.push({});
      return finalize(rows);
    }

    const start = parseInt(resumeIndex) || 0;

    if (method === "all") {
      const rows: Record<string, string>[] = [];
      const termArrays = kwData.map(k => k.keyword!.terms);
      const names = kwData.map(k => k.name);
      const generate = (index: number, current: Record<string, string>) => {
        if (index === termArrays.length) { rows.push({ ...current }); return; }
        for (const term of termArrays[index]) {
          current[names[index]] = term;
          generate(index + 1, current);
        }
      };
      generate(0, {});
      const limit = numberOfPages ? Math.min(parseInt(numberOfPages), rows.length - start) : rows.length - start;
      return finalize(rows.slice(start, start + limit));
    }

    if (method === "sequential") {
      const max = Math.max(...kwData.map(k => k.termCount));
      const limit = numberOfPages ? Math.min(parseInt(numberOfPages), max - start) : max - start;
      const rows: Record<string, string>[] = [];
      for (let i = start; i < start + limit && i < max; i++) {
        const row: Record<string, string> = {};
        for (const gk of kwData) row[gk.name] = gk.keyword!.terms[i % gk.keyword!.terms.length] || "";
        rows.push(row);
      }
      return finalize(rows);
    }

    // Random
    const count = numberOfPages ? parseInt(numberOfPages) : maxPages;
    const rows: Record<string, string>[] = [];
    for (let i = 0; i < count; i++) {
      const row: Record<string, string> = {};
      for (const gk of kwData) row[gk.name] = gk.keyword!.terms[Math.floor(Math.random() * gk.keyword!.terms.length)] || "";
      rows.push(row);
    }
    return finalize(rows);
  };

  // Also wrap the other returns above — handled inline via final map
  const injectBrand = (rows: Record<string, string>[]) =>
    resolvedBrandName ? rows.map(r => ({ ...r, brand_name: resolvedBrandName })) : rows;

  const applyAnalysis = (data: any, sourceLabel: string) => {
    const keywords = Array.isArray(data?.keywords) ? data.keywords.filter(Boolean) : [];
    const terms = Array.isArray(data?.terms) ? data.terms.filter(Boolean) : [];
    const locations = Array.isArray(data?.locations) ? data.locations.filter(Boolean) : [];
    if (data?.businessDescription) setAiBusinessDesc(data.businessDescription);
    if (keywords.length) setAiKeywords(keywords.join(", "));
    if (terms.length) setAiTerms(terms.join(", "));
    if (locations.length) setAiLocations(locations.join(", "));
    setAnalysis({ status: "ready", source: sourceLabel, keywords, terms, locations });
    recordRun(sourceLabel, keywords.length, terms.length, locations.length);
    toast({ title: "Keyword strategy ready", description: "Review the results below, then generate." });
  };

  const handleAnalyzeSource = async () => {
    if (aiSource === "website") {
      const site = websites.find((w) => w.id === aiSourceUrl);
      const targetUrl = site?.url || aiSourceUrl;
      if (!targetUrl) {
        toast({ title: "Select or enter a website first", variant: "destructive" });
        return;
      }
      setAiAnalyzing(true);
      setAnalysis({ status: "scanning", source: targetUrl, keywords: [], terms: [], locations: [] });
      try {
        const { data, error } = await supabase.functions.invoke("analyze-source-keywords", {
          body: { mode: "website", url: targetUrl, language: aiLanguage },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        applyAnalysis(data, targetUrl);
      } catch (err: any) {
        setAnalysis({ status: "error", source: targetUrl, keywords: [], terms: [], locations: [], error: err.message });
        toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
      } finally {
        setAiAnalyzing(false);
      }
    } else {
      if (!aiNiche.trim() && !aiCategory.trim()) {
        toast({ title: "Enter a niche or category first", variant: "destructive" });
        return;
      }
      setAiAnalyzing(true);
      const nicheLabel = [aiNiche, aiCategory].filter(Boolean).join(" · ") || "New business";
      setAnalysis({ status: "scanning", source: nicheLabel, keywords: [], terms: [], locations: [] });
      try {
        const { data, error } = await supabase.functions.invoke("analyze-source-keywords", {
          body: {
            mode: "niche",
            niche: aiNiche,
            category: aiCategory,
            brand: resolvedBrandName,
            language: aiLanguage,
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        applyAnalysis(data, nicheLabel);
      } catch (err: any) {
        setAnalysis({ status: "error", source: nicheLabel, keywords: [], terms: [], locations: [], error: err.message });
        toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
      } finally {
        setAiAnalyzing(false);
      }
    }
  };

  const handleAiGenerate = async () => {

    if (!wsId || !aiBusinessDesc.trim()) {
      toast({ title: t("pgpGenerate.toastDescribeFirst"), variant: "destructive" });
      return;
    }
    setAiGenerating(true);
    setGenProgress({ processed: 0, total: 0, errors: 0 });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t("settings.notAuthenticated"));

      const count = parseInt(aiPageCount) || 10;
      setGenProgress({ processed: 0, total: count, errors: 0 });

      const { data: aiResult, error: aiErr } = await supabase.functions.invoke("generate-seo-content", {
        body: {
          prompt: `You are a professional SEO content generator. Generate exactly ${count} unique landing pages for the following business.

Business: ${aiBusinessDesc}
Keywords: ${aiKeywords || "auto-detect relevant keywords"}
Terms/services to feature: ${aiTerms || "auto-detect relevant services"}
Locations: ${aiLocations || "general/nationwide"}
Language: ${aiLanguage}

For EACH page, return a JSON object with these fields:
- title: SEO-optimized page title
- slug: URL-friendly slug (lowercase, hyphens)
- seo_title: meta title (under 60 chars)
- seo_description: meta description (under 160 chars)
- content: full HTML content (professional, structured with h2/h3/p/ul tags, minimum 500 words, include local references if locations provided)

Return a JSON array of these objects. Only return valid JSON, no markdown.`,
          type: "batch_pages",
        },
      });

      if (aiErr) throw aiErr;

      let pages: any[] = [];
      try {
        const raw = typeof aiResult === "string" ? aiResult : (aiResult?.content || aiResult?.result || JSON.stringify(aiResult));
        const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        pages = JSON.parse(cleaned);
        if (!Array.isArray(pages)) pages = [pages];
      } catch {
        throw new Error(t("pgpGenerate.errorAiInvalidFormat"));
      }

      // Keyword source tracking (persisted on campaign + each page)
      const keywordSource = aiSource === "website" ? "existing_website" : "new_business";
      const lastRun = runHistory[0];
      const keywordSourceDetails = {
        ...(aiSource === "website"
          ? { url: websites.find((w) => w.id === aiSourceUrl)?.url || aiSourceUrl || null }
          : { niche: aiNiche || null, category: aiCategory || null }),
        regenerated: analysis.status === "ready" && !!lastRun,
        regenerated_at: analysis.status === "ready" && lastRun ? lastRun.at : null,
        regenerated_ok: analysis.status === "ready",
        regenerated_counts:
          analysis.status === "ready"
            ? { keywords: analysis.keywords.length, terms: analysis.terms.length, locations: analysis.locations.length }
            : null,
      };

      // Create campaign
      const { data: campaign, error: campErr } = await supabase.from("campaigns").insert({
        name: `AI: ${aiBusinessDesc.slice(0, 50)}`,
        csv_data: pages.map((p: any) => ({ title: p.title, slug: p.slug, content: p.content, seo_title: p.seo_title, seo_description: p.seo_description })),
        total_rows: pages.length,
        status: "completed" as any,
        user_id: user.id,
        workspace_id: wsId,
        publish_mode: publishMode,
        generation_method: "ai",
        campaign_types: ["seo"],
        keyword_source: keywordSource,
        keyword_source_details: keywordSourceDetails,
      } as any).select("id").single();

      if (campErr) throw campErr;

      // Insert generated pages
      const pageInserts = pages.map((p: any) => ({
        campaign_id: campaign.id,
        title: p.title || "Untitled",
        slug: p.slug || p.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "page",
        content: p.content || "",
        seo_title: p.seo_title || p.title || "",
        seo_description: p.seo_description || "",
        status: "pending" as const,
        user_id: user.id,
        workspace_id: wsId,
        website_id: selectedWebsite || null,
        keyword_source: keywordSource,
        keyword_source_details: keywordSourceDetails,
      }));

      const { error: pagesErr } = await supabase.from("generated_pages").insert(pageInserts);
      if (pagesErr) throw pagesErr;

      setGenProgress({ processed: pages.length, total: pages.length, errors: 0 });
      toast({ title: t("pgpGenerate.toastAiCompleteTitle"), description: t("pgpGenerate.toastAiCompleteDesc", { count: pages.length }) });

      setTimeout(() => navigate(`${basePath}/campaigns/${campaign.id}`), 1500);
    } catch (err: any) {
      toast({ title: t("pgpGenerate.toastAiFailedTitle"), description: err.message, variant: "destructive" });
    } finally {
      setAiGenerating(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedGroup || !wsId) return;
    if (missingKeywords.length > 0) {
      toast({ title: t("pgpGenerate.toastMissingKeywordsTitle"), description: t("pgpGenerate.toastMissingKeywordsDesc", { list: missingKeywords.map(k => k.name).join(", ") }), variant: "destructive" });
      return;
    }
    if (geoCoverage.severity === "block") {
      toast({
        title: "Geo coverage validation failed",
        description: geoCoverage.issues[0] || "Attach real locations before generating.",
        variant: "destructive",
      });
      return;
    }


    setIsGenerating(true);
    setGenProgress({ processed: 0, total: 0, errors: 0 });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t("settings.notAuthenticated"));

      const rows = buildRows();
      if (rows.length === 0) {
        let desc = "";
        if (groupKeywords.length === 0) {
          desc = "This template has no {variables}. Open the template and click 'AI Add Variables' first, then come back here.";
        } else if (groupKeywords.every((k) => !k.keyword)) {
          desc = "None of the template variables are linked to a Keyword group yet. Use 'AI Auto-Fill' above, or create matching keyword groups in Keywords.";
        } else if (method === "all" && maxPages === 0) {
          desc = "One or more keyword groups are empty (0 terms). Add terms to every linked keyword.";
        } else {
          desc = "Check Number of Pages / Resume Index — the current range produces 0 rows.";
        }
        toast({ title: t("pgpGenerate.toastNoRowsTitle"), description: desc, variant: "destructive" });
        setIsGenerating(false);
        return;
      }

      setGenProgress({ processed: 0, total: rows.length, errors: 0 });

      // Build schedule config
      let scheduledAt: string | null = null;
      const dripSettings: Record<string, any> = {};
      if (scheduleMode === "specific" && scheduleDate) {
        scheduledAt = new Date(scheduleDate).toISOString();
      } else if (scheduleMode === "increment") {
        dripSettings.enabled = true;
        dripSettings.interval_hours = parseInt(incrementHours) || 24;
      } else if (scheduleMode === "random" && scheduleDateStart && scheduleDateEnd) {
        dripSettings.enabled = true;
        dripSettings.random_start = scheduleDateStart;
        dripSettings.random_end = scheduleDateEnd;
      }

      // Build ai_context so generate-pages can AI-fill any template variable
      // that has no keyword group and no injected value.
      const aiContext = {
        business: (aiBusinessDesc || resolvedBrandName || aiNiche || "").trim(),
        niche: (aiNiche || aiCategory || "").trim(),
        service: (aiTerms || aiKeywords || "").trim(),
      };

      const { data: campaign, error: campErr } = await supabase.from("campaigns").insert({
        name: `PGP: ${selectedGroup.name}`,
        template_id: selectedGroup.id,
        website_id: selectedWebsite || null,
        csv_data: rows,
        total_rows: rows.length,
        status: "processing" as any,
        user_id: user.id,
        workspace_id: wsId,
        publish_mode: publishMode,
        generation_method: method,
        campaign_types: ["seo"],
        scheduled_at: scheduledAt,
        drip_feed_settings: Object.keys(dripSettings).length > 0 ? dripSettings : null,
        mapping: { ai_fill_mode: "per_row", ai_context: aiContext } as any,
        language: aiLanguage || null,
      } as any).select("id").single();

      if (campErr) throw campErr;

      // Start polling for progress
      const pollInterval = setInterval(async () => {
        try {
          const { data: job } = await supabase
            .from("generation_jobs")
            .select("processed_rows, success_count, error_count, total_rows, status")
            .eq("campaign_id", campaign.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (job) {
            setGenProgress({
              processed: job.processed_rows || 0,
              total: job.total_rows || rows.length,
              errors: job.error_count || 0,
            });
            if (job.status === "completed" || job.status === "failed") {
              clearInterval(pollInterval);
            }
          }
        } catch { /* ignore polling errors */ }
      }, 2000);

      const { error: genErr } = await supabase.functions.invoke("generate-pages", {
        body: {
          campaign_id: campaign.id,
          overwrite,
          overwrite_fields: overwrite ? overwriteFields : undefined,
        },
      });

      clearInterval(pollInterval);

      if (genErr) throw genErr;

      // Final status check
      const { data: finalJob } = await supabase
        .from("generation_jobs")
        .select("success_count, error_count, total_rows")
        .eq("campaign_id", campaign.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const finalSuccess = finalJob?.success_count || rows.length;
      const finalErrors = finalJob?.error_count || 0;

      setGenProgress({ processed: finalSuccess + finalErrors, total: finalJob?.total_rows || rows.length, errors: finalErrors });
      toast({
        title: finalErrors > 0 ? t("pgpGenerate.toastGenWithErrorsTitle") : t("pgpGenerate.toastGenCompleteTitle"),
        description: finalErrors > 0 ? t("pgpGenerate.toastGenWithErrorsDesc", { success: finalSuccess, errors: finalErrors }) : t("pgpGenerate.toastGenCompleteDesc", { success: finalSuccess }),
        variant: finalErrors > 0 ? "destructive" : "default",
      });

      setTimeout(() => {
        navigate(`${basePath}/campaigns/${campaign.id}`);
      }, 1500);

    } catch (err: any) {
      toast({ title: t("pgpGenerate.toastGenFailedTitle"), description: err.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const methodIcons = {
    all: <Shuffle className="h-4 w-4" />,
    sequential: <ListOrdered className="h-4 w-4" />,
    random: <ArrowDown className="h-4 w-4" />,
  };

  // ============= Geo Coverage Validation =============
  // Inspect the actual rows that will be published and flag mismatched or
  // missing geo coverage (all rows identical, placeholder defaults like
  // USA/Angel/New York, or blank geo fields when the template needs them).
  const geoCoverage = (() => {
    const geoTemplateVars = groupKeywords
      .map((k) => k.name.trim().toLowerCase())
      .filter((n) => GEO_VAR_NAMES.includes(n));
    if (geoTemplateVars.length === 0) {
      return { severity: "ok" as const, issues: [] as string[], sampleRows: [] as Record<string, string>[] };
    }

    let previewRows: Record<string, string>[] = [];
    try { previewRows = buildRows().slice(0, 200); } catch { previewRows = []; }
    if (previewRows.length === 0) {
      return { severity: "ok" as const, issues: [] as string[], sampleRows: [] as Record<string, string>[] };
    }

    const issues: string[] = [];
    let severity: "ok" | "warn" | "block" = "ok";
    const bump = (s: "warn" | "block") => {
      if (s === "block" || severity === "ok") severity = s;
    };

    // 1) Missing geo values on rows that need them
    const missingCounts: Record<string, number> = {};
    for (const r of previewRows) {
      for (const v of geoTemplateVars) {
        const val = (r[v] ?? "").toString().trim();
        if (!val) missingCounts[v] = (missingCounts[v] || 0) + 1;
      }
    }
    for (const [v, c] of Object.entries(missingCounts)) {
      if (c > 0) {
        issues.push(`${c}/${previewRows.length} rows have empty {${v}}`);
        bump("block");
      }
    }

    // 2) Placeholder / demo defaults leaked into rows — only enforced when the
    //    user has NOT attached real Locations. If they picked real locations
    //    from the Location Database, city/country names (even "New York" or
    //    "USA") are trusted and never flagged as placeholders.
    if (pickedLocations.length === 0) {
      const placeholderCounts: Record<string, number> = {};
      for (const r of previewRows) {
        for (const v of geoTemplateVars) {
          if (isPlaceholderGeoValue(r[v])) placeholderCounts[v] = (placeholderCounts[v] || 0) + 1;
        }
      }
      for (const [v, c] of Object.entries(placeholderCounts)) {
        if (c > 0) {
          issues.push(`${c}/${previewRows.length} rows use a placeholder default for {${v}} (e.g. USA / New York / LA). Attach real locations to unblock.`);
          bump("block");
        }
      }
    }

    // 3) All rows share identical geo — real Location DB should provide variety
    //    unless the user only picked a single location.
    if (previewRows.length > 1 && pickedLocations.length !== 1) {
      for (const v of geoTemplateVars) {
        const uniq = new Set(previewRows.map((r) => (r[v] ?? "").toString().trim().toLowerCase()).filter(Boolean));
        if (uniq.size === 1 && missingCounts[v] === undefined) {
          issues.push(`All ${previewRows.length} rows share the same {${v}} — attach more locations for real coverage`);
          bump("warn");
        }
      }
    }

    // 4) Location count mismatch — user attached fewer locations than rows and
    //    no keyword group provides geo variety.
    if (pickedLocations.length > 0 && pickedLocations.length < previewRows.length) {
      const geoHasKeywordSource = geoTemplateVars.some((v) =>
        groupKeywords.find((g) => g.name.toLowerCase() === v)?.keyword?.terms?.length,
      );
      if (!geoHasKeywordSource) {
        issues.push(
          `${previewRows.length} rows but only ${pickedLocations.length} location${pickedLocations.length === 1 ? "" : "s"} attached — geo values will repeat`,
        );
        bump("warn");
      }
    }

    return { severity: severity as "ok" | "warn" | "block", issues, sampleRows: previewRows.slice(0, 3) };
  })();

  return (

    <div className="space-y-4 sm:space-y-6">
      {/* Header — matches Campaigns page style */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-display">{t("sidebar.campaigns")}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("pgpGenerate.pageSubtitle")}
          </p>
        </div>
      </div>

      {/* Readiness check */}
      {!loadingGroups && (contentGroups.length === 0 || keywords.length === 0) && (
        <div className="rounded-xl border border-amber-300/50 bg-amber-50/50 dark:bg-amber-500/10 p-4 sm:p-5 space-y-3">
          <h3 className="font-semibold text-sm text-amber-800 dark:text-amber-300">{t("pgpGenerate.setupTitle")}</h3>
          <div className="space-y-2">
            {keywords.length === 0 && (
              <div className="flex items-center gap-2 text-xs">
                <div className="h-5 w-5 rounded-full bg-amber-200 dark:bg-amber-700 text-amber-800 dark:text-amber-200 flex items-center justify-center text-[10px] font-bold">!</div>
                <span className="text-amber-700 dark:text-amber-300">{t("pgpGenerate.noKeywords")}</span>
                <button className="underline font-semibold text-primary" onClick={() => navigate(`${basePath}/pgp-keywords`)}>{t("pgpGenerate.createKeywords")}</button>
              </div>
            )}
            {contentGroups.length === 0 && (
              <div className="flex items-center gap-2 text-xs">
                <div className="h-5 w-5 rounded-full bg-amber-200 dark:bg-amber-700 text-amber-800 dark:text-amber-200 flex items-center justify-center text-[10px] font-bold">!</div>
                <span className="text-amber-700 dark:text-amber-300">{t("pgpGenerate.noTemplates")}</span>
                <button className="underline font-semibold text-primary" onClick={() => navigate(`${basePath}/templates`)}>{t("pgpGenerate.createTemplate")}</button>
              </div>
            )}
          </div>
          <p className="text-[11px] text-amber-600 dark:text-amber-400">{t("pgpGenerate.setupHintPre")} <strong>{t("pgpGenerate.setupHintAiBold")}</strong> {t("pgpGenerate.setupHintPost")}</p>
        </div>
      )}

      {/* Stepper — matches Campaign wizard style */}
      {(() => {
        const wizardSteps = [
          { num: 1, label: "Name & Template" },
          { num: 2, label: "AI Setup" },
          { num: 3, label: "Locations" },
          { num: 4, label: "Business Info" },
          { num: 5, label: "Review & Publish" },
        ];
        return (
          <div className="rounded-2xl border border-border/60 bg-card/60 p-4 sm:p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-sm">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-bold">{t("campaigns.createCampaign") || "Create Campaign"}</p>
                <p className="text-[11px] text-muted-foreground">
                  Step {step} of {wizardSteps.length} — {wizardSteps[step - 1]?.label}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {wizardSteps.map((s) => (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => { if (s.num < step) setStep(s.num as 1 | 2 | 3 | 4 | 5); }}
                  className={cn(
                    "h-2 flex-1 rounded-full transition-all",
                    step > s.num ? "bg-primary cursor-pointer" :
                    step === s.num ? "bg-primary" : "bg-border"
                  )}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1.5">
              {wizardSteps.map((s) => (
                <span key={s.num} className={cn("text-[10px] font-medium", step >= s.num ? "text-foreground" : "text-muted-foreground/50")}>
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      <div className="max-w-3xl mx-auto w-full">
        <div className="space-y-4 sm:space-y-5">
          {/* Step 1: Name & Template */}
          {step === 1 && (<>


          {/* Campaign name for handoff */}
          <Card className="border-0 shadow-surface overflow-hidden relative">
            <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
            <CardContent className="p-5 space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Campaign name
              </Label>
              <Input
                value={campaignNameDraft}
                onChange={(e) => setCampaignNameDraft(e.target.value)}
                placeholder={selectedGroup ? `e.g. ${selectedGroup.name} — Cities` : "Give this campaign a name"}
                className="h-11 rounded-xl"
              />
              <p className="text-[11px] text-muted-foreground">
                Pick your template and keywords, configure AI, then generate pages directly from Step 3.
              </p>
            </CardContent>
          </Card>

          {/* Keyword Groups — reusable bundles (template + language + terms) */}
          {keywordGroups.length > 0 && (
            <Card className="border-0 shadow-surface border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="p-5 space-y-3">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-emerald-600" /> Keyword Group
                  <span className="text-[10px] text-muted-foreground ml-auto font-normal">shortcut · picks template + terms</span>
                </Label>
                <Select value={selectedKeywordGroupId} onValueChange={applyKeywordGroup}>
                  <SelectTrigger className="h-11 bg-background">
                    <SelectValue placeholder="Pick a saved Keyword Group..." />
                  </SelectTrigger>
                  <SelectContent>
                    {keywordGroups.map(g => {
                      const termTotal = (g.variables || []).reduce((s, v) => s + (v.terms?.length || 0), 0);
                      return (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name} · {g.language} · {g.variables?.length || 0} vars · {termTotal} terms
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Picking a group auto-selects its template and fills its keyword terms. Then just add Locations + Business Info.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Template Selection — hidden when a Keyword Group is picked (group already selects the template) */}
          {!selectedKeywordGroupId && (
          <Card className="border-0 shadow-surface">
            <CardContent className="p-5 space-y-4">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" /> Template
              </Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select a Template..." />
                </SelectTrigger>
                <SelectContent>
                  {contentGroups.map(g => (
                    <SelectItem key={g.id} value={g.id}>
                      <span className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5" /> {g.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>


              {selectedGroup && (
                <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("pgpGenerate.keywordsInGroup")}</p>
                  {groupKeywords.length === 0 && (
                    <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-500/10 rounded-lg px-3 py-2">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-semibold">This template has no {"{variables}"} yet.</p>
                        <p>Open the template editor and click <span className="font-semibold">"AI Add Variables"</span> to insert placeholders like {"{service}"}, {"{city}"}, {"{quality}"}. Then return here.</p>
                        <Button variant="link" size="sm" className="text-amber-600 h-auto p-0" onClick={() => navigate(`${basePath}/templates`)}>
                          Open Templates →
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    {groupKeywords.map(gk => (
                      <div key={gk.name} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2">
                          <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                          <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{`{${gk.name}}`}</code>
                        </div>
                        {gk.keyword ? (
                          <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> {t("pgpGenerate.terms", { count: gk.termCount })}
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">
                            <XCircle className="h-3 w-3 mr-1" /> {t("pgpGenerate.notDefined")}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                  {missingKeywords.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-500/10 rounded-lg px-3 py-2">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>{t("pgpGenerate.defineMissingKeywords")}</span>
                        <Button variant="link" size="sm" className="text-amber-600 h-auto p-0 ml-auto" onClick={() => navigate(`${basePath}/pgp-keywords`)}>
                          {t("pgpGenerate.keywordsLink")}
                        </Button>
                      </div>
                      {/* One-click: auto-link existing keyword groups by fuzzy
                          name-match, then auto-generate the rest with AI using
                          the template name as context — no manual input. */}
                      <Button
                        size="sm"
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                        disabled={oneClickLinking}
                        onClick={handleOneClickAutoLink}
                      >
                        {oneClickLinking ? (
                          <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Linking…</>
                        ) : (
                          <><Zap className="h-3.5 w-3.5 mr-1.5" /> One-click auto-link keywords</>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-primary/30 text-primary hover:bg-primary/5"
                        onClick={() => setShowAiKeywordFill(!showAiKeywordFill)}
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                        {showAiKeywordFill ? t("pgpGenerate.hideAiFill") : t("pgpGenerate.aiAutoFill")}
                      </Button>
                      {showAiKeywordFill && (
                        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">{t("pgpGenerate.businessServiceLabel")}</Label>
                            <Textarea
                              placeholder={t("pgpGenerate.businessServicePlaceholder")}
                              value={aiKwBusiness}
                              onChange={(e) => setAiKwBusiness(e.target.value)}
                              rows={2}
                              className="resize-none text-xs"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">{t("pgpGenerate.customDataLabel")} <span className="text-muted-foreground font-normal">{t("pgpGenerate.optional")}</span></Label>
                            <Textarea
                              placeholder={t("pgpGenerate.customDataPlaceholder")}
                              value={aiKwCustomData}
                              onChange={(e) => setAiKwCustomData(e.target.value)}
                              rows={2}
                              className="resize-none text-xs"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">{t("pgpGenerate.termsPerKeyword")}</Label>
                            <Input type="number" min={3} max={50} value={aiKwCount} onChange={(e) => setAiKwCount(e.target.value)} className="h-8 text-xs" />
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {t("pgpGenerate.aiWillGenerate")} {missingKeywords.map(k => `{${k.name}}`).join(", ")}
                          </p>
                          <Button
                            size="sm"
                            className="w-full"
                            disabled={!aiKwBusiness.trim() || aiKwFilling}
                            onClick={handleAiKeywordFill}
                          >
                            {aiKwFilling ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> {t("pgpGenerate.generating")}</> : <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> {t("pgpGenerate.generateAllKeywords")}</>}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          )}
          </>)}


          {/* Step 2: AI Setup & Generation Settings */}
          {step === 2 && (<>
          {/* AI Generate (always available) */}
          {!selectedGroup && (

            <Card className="border-0 shadow-surface">
              <CardContent className="p-5 space-y-4">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">{t("pgpGenerate.aiPoweredTitle")}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("pgpGenerate.aiPoweredDescNoGroup")}
                  </p>
                </div>

                {/* Source of the keyword strategy: existing site vs new niche */}
                <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3">
                  <Label className="text-xs font-semibold">Keyword source</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAiSource("niche")}
                      className={`rounded-md border px-3 py-2 text-left text-xs transition ${aiSource === "niche" ? "border-primary bg-primary/10" : "border-border/60 hover:bg-muted"}`}
                    >
                      <span className="font-semibold block">New business</span>
                      <span className="text-[10px] text-muted-foreground">From niche / category</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiSource("website")}
                      className={`rounded-md border px-3 py-2 text-left text-xs transition ${aiSource === "website" ? "border-primary bg-primary/10" : "border-border/60 hover:bg-muted"}`}
                    >
                      <span className="font-semibold block">Existing website</span>
                      <span className="text-[10px] text-muted-foreground">Extract from a live site</span>
                    </button>
                  </div>

                  {aiSource === "niche" ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        className="h-9"
                        placeholder="Niche (e.g. plumbing)"
                        value={aiNiche}
                        onChange={(e) => setAiNiche(e.target.value)}
                      />
                      <Input
                        className="h-9"
                        placeholder="Category (e.g. home services)"
                        value={aiCategory}
                        onChange={(e) => setAiCategory(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Select value={aiSourceUrl} onValueChange={setAiSourceUrl}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Pick a connected website" /></SelectTrigger>
                        <SelectContent>
                          {websites.filter((w) => w.url).map((w) => (
                            <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        className="h-9"
                        placeholder="…or paste any website URL"
                        value={websites.some((w) => w.id === aiSourceUrl) ? "" : aiSourceUrl}
                        onChange={(e) => setAiSourceUrl(e.target.value)}
                      />
                    </div>
                  )}

                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    disabled={aiAnalyzing}
                    onClick={handleAnalyzeSource}
                  >
                    {aiAnalyzing ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> Analyzing…</>
                    ) : (
                      <><KeyRound className="h-3.5 w-3.5 mr-2" /> Find best keywords &amp; terms</>
                    )}
                  </Button>
                  <p className="text-[10px] text-muted-foreground">
                    Auto-fills the business description, keywords, terms and locations below. Review, then generate — pages flow straight into a new campaign.
                  </p>

                  {analysis.status !== "idle" && (
                    <div className="space-y-2 rounded-md border border-border/60 bg-background/70 p-2.5">
                      <div className="flex items-center gap-2">
                        {analysis.status === "scanning" && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                        {analysis.status === "ready" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                        {analysis.status === "error" && <XCircle className="h-3.5 w-3.5 text-destructive" />}
                        <span className="text-xs font-semibold">
                          {analysis.status === "scanning" && (scanPhases[scanPhase] ?? "Scanning source…")}
                          {analysis.status === "ready" && "Scan complete — review before generating"}
                          {analysis.status === "error" && "Scan failed"}
                        </span>
                        {analysis.status === "scanning" && (
                          <span className="ml-auto text-[10px] font-medium text-muted-foreground">
                            Step {Math.min(scanPhase + 1, scanPhases.length)}/{scanPhases.length}
                          </span>
                        )}
                        {(analysis.status === "ready" || analysis.status === "error") && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="ml-auto h-7 gap-1.5 text-[11px]"
                            onClick={() => setConfirmRegen(true)}
                            disabled={aiAnalyzing}
                          >
                            <RefreshCw className={`h-3 w-3 ${aiAnalyzing ? "animate-spin" : ""}`} />
                            {aiAnalyzing ? "Regenerating…" : "Regenerate keywords & terms"}
                          </Button>
                        )}
                      </div>

                      {analysis.status === "scanning" && (
                        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${((scanPhase + 1) / scanPhases.length) * 100}%` }}
                          />
                        </div>
                      )}

                      {analysis.source && (
                        <p className="text-[10px] text-muted-foreground truncate">Source: {analysis.source}</p>
                      )}

                      {analysis.status === "error" && analysis.error && (
                        <p className="text-[10px] text-destructive">{analysis.error}</p>
                      )}

                      {analysis.status === "ready" && (
                        <div className="space-y-2">
                          {([
                            { label: "Keywords", items: analysis.keywords, cls: "border-primary/40 text-primary" },
                            { label: "Terms / services", items: analysis.terms, cls: "border-blue-500/40 text-blue-600" },
                            { label: "Locations", items: analysis.locations, cls: "border-amber-500/40 text-amber-600" },
                          ] as const).map((grp) => (
                            <div key={grp.label} className="space-y-1">
                              <p className="text-[10px] font-medium text-muted-foreground">
                                {grp.label} <span className="opacity-60">({grp.items.length})</span>
                              </p>
                              {grp.items.length ? (
                                <div className="flex flex-wrap gap-1">
                                  {grp.items.slice(0, 24).map((it, i) => (
                                    <Badge key={`${grp.label}-${i}`} variant="outline" className={`text-[9px] ${grp.cls}`}>
                                      {it}
                                    </Badge>
                                  ))}
                                  {grp.items.length > 24 && (
                                    <span className="text-[9px] text-muted-foreground">+{grp.items.length - 24} more</span>
                                  )}
                                </div>
                              ) : (
                                <p className="text-[9px] text-muted-foreground italic">None detected</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {runHistory.length > 0 && (
                        <div className="space-y-1 border-t border-border/60 pt-2">
                          <div className="flex items-center gap-1.5">
                            <History className="h-3 w-3 text-muted-foreground" />
                            <p className="text-[10px] font-medium text-muted-foreground">
                              Recalculation history
                            </p>
                          </div>
                          <ul className="space-y-0.5">
                            {runHistory.slice(0, 5).map((r, i) => (
                              <li
                                key={`${r.at}-${i}`}
                                className="flex items-center justify-between gap-2 text-[9px] text-muted-foreground"
                              >
                                <span className="truncate">
                                  {new Date(r.at).toLocaleString()} · {r.source}
                                </span>
                                <span className="whitespace-nowrap tabular-nums">
                                  {r.keywords}K / {r.terms}T / {r.locations}L
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {aiSource === "website" &&
                  aiKeywords.trim() &&
                  websites.some((w) => w.id === aiSourceUrl && w.status === "connected") && (
                    <ExistingSiteOptimizePanel
                      websiteId={aiSourceUrl}
                      workspaceId={wsId}
                      keywords={aiKeywords}
                      terms={aiTerms}
                    />
                  )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t("pgpGenerate.businessDescLabel")}</Label>

                  <Textarea
                    placeholder={t("pgpGenerate.businessDescPlaceholder")}
                    value={aiBusinessDesc}
                    onChange={(e) => setAiBusinessDesc(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t("pgpGenerate.targetKeywordsLabel")}</Label>
                  <Textarea
                    placeholder={t("pgpGenerate.targetKeywordsPlaceholder")}
                    value={aiKeywords}
                    onChange={(e) => setAiKeywords(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                  <p className="text-[10px] text-muted-foreground">{t("pgpGenerate.keywordsHint")}</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Terms / services</Label>
                  <Textarea
                    placeholder="e.g. drain cleaning, water heater install, leak repair…"
                    value={aiTerms}
                    onChange={(e) => setAiTerms(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                  <p className="text-[10px] text-muted-foreground">Comma-separated services/product types the pages should feature.</p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-primary" /> Target locations
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px]"
                      onClick={() => setShowLocationsDialog(true)}
                    >
                      Select from Locations Database
                    </Button>
                  </div>
                  <Textarea
                    placeholder="e.g. New York, Los Angeles, Chicago… (or leave blank for nationwide)"
                    value={aiLocations}
                    onChange={(e) => setAiLocations(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                  <p className="text-[10px] text-muted-foreground">Pick real cities from your Location Database, or type them manually.</p>
                </div>


                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("pgpGenerate.numberOfPagesLabel")}</Label>
                    <Input type="number" min={1} max={50} value={aiPageCount} onChange={(e) => setAiPageCount(e.target.value)} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("pgpGenerate.languageLabel")}</Label>
                    <Select value={aiLanguage} onValueChange={setAiLanguage}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">{t("pgpGenerate.langEnglish")}</SelectItem>
                        <SelectItem value="fr">{t("pgpGenerate.langFrench")}</SelectItem>
                        <SelectItem value="es">{t("pgpGenerate.langSpanish")}</SelectItem>
                        <SelectItem value="de">{t("pgpGenerate.langGerman")}</SelectItem>
                        <SelectItem value="pt">{t("pgpGenerate.langPortuguese")}</SelectItem>
                        <SelectItem value="ar">{t("pgpGenerate.langArabic")}</SelectItem>
                        <SelectItem value="hi">{t("pgpGenerate.langHindi")}</SelectItem>
                        <SelectItem value="ja">{t("pgpGenerate.langJapanese")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t("pgpGenerate.brandNameLabel")}</Label>
                  <div className="flex gap-2">
                    <Select value={brandSource} onValueChange={(v) => setBrandSource(v as "website" | "custom")}>
                      <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="website">{t("pgpGenerate.fromWebsite")}</SelectItem>
                        <SelectItem value="custom">{t("pgpGenerate.custom")}</SelectItem>
                      </SelectContent>
                    </Select>
                    {brandSource === "custom" ? (
                      <Input className="h-9 flex-1" placeholder={t("pgpGenerate.customBrandPlaceholder")} value={customBrandName} onChange={e => setCustomBrandName(e.target.value)} />
                    ) : (
                      <p className="text-xs text-muted-foreground self-center flex-1 truncate">{resolvedBrandName || t("pgpGenerate.selectWebsiteBelow")}</p>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{t("pgpGenerate.brandNameHint")}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("pgpGenerate.publishToLabel")}</Label>
                    <Select value={selectedWebsite} onValueChange={setSelectedWebsite}>
                      <SelectTrigger className="h-9"><SelectValue placeholder={t("pgpGenerate.noneLocal")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("pgpGenerate.noneLocal")}</SelectItem>
                        {websites.filter(w => w.status === "connected").map(w => (
                          <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("pgpGenerate.publishModeLabel")}</Label>
                    <Select value={publishMode} onValueChange={setPublishMode}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">{t("pgpGenerate.draft")}</SelectItem>
                        <SelectItem value="publish">{t("pgpGenerate.publish")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  disabled={!aiBusinessDesc.trim() || aiGenerating}
                  onClick={handleAiGenerate}
                >
                  {aiGenerating ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {t("pgpGenerate.aiGenerating")}</>
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-2" /> {t("pgpGenerate.generateWithAi")}</>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Generation Settings */}
          {selectedGroup && (
            <Card className="border-0 shadow-surface">
              <CardContent className="p-5 space-y-5">
                <Tabs defaultValue="generation" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
                    <TabsTrigger value="generation" className="text-xs sm:text-sm"><Zap className="h-3.5 w-3.5 mr-1 sm:mr-1.5" /> <span className="hidden sm:inline">{t("pgpGenerate.tabGeneration")}</span><span className="sm:hidden">{t("pgpGenerate.tabGenerationShort")}</span></TabsTrigger>
                    <TabsTrigger value="ai" className="text-xs sm:text-sm"><Sparkles className="h-3.5 w-3.5 mr-1 sm:mr-1.5" /> {t("pgpGenerate.tabAi")}</TabsTrigger>
                    <TabsTrigger value="overwrite" className="text-xs sm:text-sm"><RotateCcw className="h-3.5 w-3.5 mr-1 sm:mr-1.5" /> <span className="hidden sm:inline">{t("pgpGenerate.tabOverwrite")}</span><span className="sm:hidden">{t("pgpGenerate.tabOverwriteShort")}</span></TabsTrigger>
                    <TabsTrigger value="schedule" className="text-xs sm:text-sm"><Settings2 className="h-3.5 w-3.5 mr-1 sm:mr-1.5" /> <span className="hidden sm:inline">{t("pgpGenerate.tabSchedule")}</span><span className="sm:hidden">{t("pgpGenerate.tabScheduleShort")}</span></TabsTrigger>
                  </TabsList>

                  <TabsContent value="generation" className="space-y-4">
                    {/* Plain-language explainer */}
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs space-y-1">
                      <p className="font-semibold text-foreground">How many pages will I get?</p>
                      <p className="text-muted-foreground leading-relaxed">
                        Pick a <span className="font-medium text-foreground">Generation Method</span> first, then a number.
                        <span className="block mt-1">• <span className="font-medium">Sequential</span> (recommended) — 1 page per row, e.g. 12 terms = <span className="font-medium">12 pages</span>.</span>
                        <span className="block">• <span className="font-medium">Random</span> — same count, values shuffled.</span>
                        <span className="block">• <span className="font-medium">All Combinations</span> — every mix of every variable. Can produce millions — use only if you really need it.</span>
                      </p>
                    </div>

                    {/* Method Selection */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">{t("pgpGenerate.generationMethodLabel")}</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {([
                          { value: "sequential", label: t("pgpGenerate.methodSequential"), desc: t("pgpGenerate.methodSequentialDesc") },
                          { value: "random", label: t("pgpGenerate.methodRandom"), desc: t("pgpGenerate.methodRandomDesc") },
                          { value: "all", label: t("pgpGenerate.methodAll"), desc: t("pgpGenerate.methodAllDesc") },
                        ] as const).map(m => (
                          <button
                            key={m.value}
                            onClick={() => setMethod(m.value)}
                            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                              method === m.value ? "border-primary bg-primary/10 ring-1 ring-primary/30" : "border-border hover:bg-accent"
                            }`}
                          >
                            {methodIcons[m.value]}
                            <span className="text-xs font-medium">{m.label}</span>
                            <span className="text-[9px] text-muted-foreground leading-tight">{m.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t("pgpGenerate.numberOfPagesLabel")}</Label>
                        <Input
                          type="number"
                          placeholder={method === "all" ? `Max: ${maxPages.toLocaleString()} (huge!)` : `Max: ${maxPages.toLocaleString()}`}
                          value={numberOfPages}
                          onChange={(e) => setNumberOfPages(e.target.value)}
                          className="h-9"
                        />
                        <div className="flex flex-wrap gap-1 pt-1">
                          {[10, 25, 50, 100].filter(n => n <= maxPages || method === "all").map(n => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setNumberOfPages(String(n))}
                              className="px-2 py-0.5 text-[10px] rounded-md border border-border hover:bg-accent"
                            >
                              {n} pages
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setNumberOfPages("")}
                            className="px-2 py-0.5 text-[10px] rounded-md border border-border hover:bg-accent"
                          >
                            All ({maxPages.toLocaleString()})
                          </button>
                        </div>
                        {method === "all" && maxPages > 1000 && (
                          <p className="text-[10px] text-amber-500">
                            ⚠ All Combinations produces {maxPages.toLocaleString()} pages. Consider Sequential or set a smaller number.
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Start from (optional)</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={resumeIndex}
                          onChange={(e) => setResumeIndex(e.target.value)}
                          className="h-9"
                        />
                        <p className="text-[10px] text-muted-foreground">Skip the first N rows — leave 0 unless resuming.</p>
                      </div>
                    </div>

                    {/* Live generation preview */}
                    {/* Live preview, Brand Name, Publish To/Mode removed —
                        brand + publish target are configured in the campaign
                        step; keeping this tab focused on generation options. */}


                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{t("pgpGenerate.spinContentLabel")}</p>
                        <p className="text-[11px] text-muted-foreground">{t("pgpGenerate.spinContentHint")}</p>
                      </div>
                      <Switch checked={spinContent} onCheckedChange={setSpinContent} />
                    </div>
                  </TabsContent>

                  <TabsContent value="ai" className="space-y-4">
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <p className="text-sm font-semibold">{t("pgpGenerate.aiPoweredTitle")}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t("pgpGenerate.aiPoweredDesc")}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">{t("pgpGenerate.businessDescLabel")}</Label>
                      <Textarea
                        placeholder={t("pgpGenerate.businessDescPlaceholderLong")}
                        value={aiBusinessDesc}
                        onChange={(e) => setAiBusinessDesc(e.target.value)}
                        rows={3}
                        className="resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">{t("pgpGenerate.targetKeywordsLabel")}</Label>
                      <Textarea
                        placeholder={t("pgpGenerate.targetKeywordsPlaceholderLong")}
                        value={aiKeywords}
                        onChange={(e) => setAiKeywords(e.target.value)}
                        rows={2}
                        className="resize-none"
                      />
                      <p className="text-[10px] text-muted-foreground">{t("pgpGenerate.keywordsHint")}</p>
                    </div>

                    {/* Target locations input removed — set locations in the Campaign wizard. */}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t("pgpGenerate.numberOfPagesLabel")}</Label>
                        <Input
                          type="number"
                          min={1}
                          max={50}
                          value={aiPageCount}
                          onChange={(e) => setAiPageCount(e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t("pgpGenerate.languageLabel")}</Label>
                        <Select value={aiLanguage} onValueChange={setAiLanguage}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">{t("pgpGenerate.langEnglish")}</SelectItem>
                            <SelectItem value="fr">{t("pgpGenerate.langFrench")}</SelectItem>
                            <SelectItem value="es">{t("pgpGenerate.langSpanish")}</SelectItem>
                            <SelectItem value="de">{t("pgpGenerate.langGerman")}</SelectItem>
                            <SelectItem value="it">{t("pgpGenerate.langItalian")}</SelectItem>
                            <SelectItem value="pt">{t("pgpGenerate.langPortuguese")}</SelectItem>
                            <SelectItem value="nl">{t("pgpGenerate.langDutch")}</SelectItem>
                            <SelectItem value="ar">{t("pgpGenerate.langArabic")}</SelectItem>
                            <SelectItem value="hi">{t("pgpGenerate.langHindi")}</SelectItem>
                            <SelectItem value="ja">{t("pgpGenerate.langJapanese")}</SelectItem>
                            <SelectItem value="zh">{t("pgpGenerate.langChinese")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      size="lg"
                      disabled={!aiBusinessDesc.trim() || aiGenerating}
                      onClick={handleAiGenerate}
                    >
                      {aiGenerating ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {t("pgpGenerate.aiGenerating")}</>
                      ) : (
                        <><Sparkles className="h-4 w-4 mr-2" /> {t("pgpGenerate.generateWithAi")}</>
                      )}
                    </Button>
                  </TabsContent>

                  <TabsContent value="overwrite" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{t("pgpGenerate.enableOverwriteLabel")}</p>
                        <p className="text-[11px] text-muted-foreground">{t("pgpGenerate.enableOverwriteDesc")}</p>
                      </div>
                      <Switch checked={overwrite} onCheckedChange={setOverwrite} />
                    </div>

                    {overwrite && (
                      <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("pgpGenerate.selectSectionsOverwrite")}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {([
                            { key: "title", label: t("pgpGenerate.fieldTitle") },
                            { key: "content", label: t("pgpGenerate.fieldContent") },
                            { key: "excerpt", label: t("pgpGenerate.fieldExcerpt") },
                            { key: "seo", label: t("pgpGenerate.fieldSeo") },
                            { key: "featuredImage", label: t("pgpGenerate.fieldFeaturedImage") },
                            { key: "customFields", label: t("pgpGenerate.fieldCustomFields") },
                            { key: "taxonomies", label: t("pgpGenerate.fieldTaxonomies") },
                            { key: "author", label: t("pgpGenerate.fieldAuthor") },
                            { key: "publishDate", label: t("pgpGenerate.fieldPublishDate") },
                          ] as const).map(f => (
                            <label key={f.key} className="flex items-center gap-2 text-xs cursor-pointer p-2 rounded-lg hover:bg-accent transition-colors">
                              <Checkbox
                                checked={overwriteFields[f.key]}
                                onCheckedChange={(v) => setOverwriteFields(prev => ({ ...prev, [f.key]: !!v }))}
                              />
                              <span>{f.label}</span>
                            </label>
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground">{t("pgpGenerate.overwriteHint")}</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="schedule" className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">{t("pgpGenerate.scheduleModeLabel")}</Label>
                      <Select value={scheduleMode} onValueChange={(v: any) => setScheduleMode(v)}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediate">{t("pgpGenerate.scheduleImmediate")}</SelectItem>
                          <SelectItem value="specific">{t("pgpGenerate.scheduleSpecific")}</SelectItem>
                          <SelectItem value="increment">{t("pgpGenerate.scheduleIncrement")}</SelectItem>
                          <SelectItem value="random">{t("pgpGenerate.scheduleRandom")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {scheduleMode === "specific" && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t("pgpGenerate.publishDateLabel")}</Label>
                        <Input type="datetime-local" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="h-9" />
                      </div>
                    )}

                    {scheduleMode === "increment" && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t("pgpGenerate.hoursBetweenLabel")}</Label>
                        <Input type="number" value={incrementHours} onChange={(e) => setIncrementHours(e.target.value)} className="h-9" min={1} />
                        <p className="text-[10px] text-muted-foreground">{t("pgpGenerate.dripHint")}</p>
                      </div>
                    )}

                    {scheduleMode === "random" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">{t("pgpGenerate.startDateLabel")}</Label>
                          <Input type="datetime-local" value={scheduleDateStart} onChange={(e) => setScheduleDateStart(e.target.value)} className="h-9" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">{t("pgpGenerate.endDateLabel")}</Label>
                          <Input type="datetime-local" value={scheduleDateEnd} onChange={(e) => setScheduleDateEnd(e.target.value)} className="h-9" />
                        </div>
                        <p className="col-span-2 text-[10px] text-muted-foreground">{t("pgpGenerate.randomDateHint")}</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Generation Progress */}
          {genProgress && (
            <Card className="border-0 shadow-surface">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{t("pgpGenerate.progressTitle")}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {genProgress.processed}/{genProgress.total}
                  </span>
                </div>
                <Progress value={genProgress.total > 0 ? (genProgress.processed / genProgress.total) * 100 : 0} className="h-2" />
                {genProgress.errors > 0 && (
                  <p className="text-xs text-destructive">{t("pgpGenerate.progressErrors", { count: genProgress.errors })}</p>
                )}
                {analysis.status !== "idle" && (
                  <div className="flex items-center gap-1.5 rounded-md border border-border/60 bg-background/70 px-2.5 py-1.5 text-[11px]">
                    {analysis.status === "scanning" && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                    {analysis.status === "ready" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                    {analysis.status === "error" && <XCircle className="h-3.5 w-3.5 text-destructive" />}
                    <span className="font-medium">
                      {analysis.status === "scanning" && "Regenerating keywords & terms…"}
                      {analysis.status === "ready" &&
                        `Keywords & terms regenerated (${analysis.keywords.length}K / ${analysis.terms.length}T / ${analysis.locations.length}L)`}
                      {analysis.status === "error" && "Keyword & terms regeneration failed"}
                    </span>
                    {runHistory[0] && analysis.status === "ready" && (
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {new Date(runHistory[0].at).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          </>)}

          {/* Step 3: Locations */}
          {step === 3 && (<>
          <Card className="border-0 shadow-surface overflow-hidden relative">
            <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-bold">Attach Locations</p>
                  <p className="text-[11px] text-muted-foreground">
                    Pick real cities/states/countries. Values fill <code className="text-[10px]">{"{city}"}</code>, <code className="text-[10px]">{"{state}"}</code>, <code className="text-[10px]">{"{country}"}</code>, <code className="text-[10px]">{"{region}"}</code>, <code className="text-[10px]">{"{zip}"}</code> in your template.
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full rounded-xl gap-2"
                onClick={() => setShowLocationsDialog(true)}
              >
                <MapPin className="h-4 w-4" />
                {pickedLocations.length > 0 ? `Change locations (${pickedLocations.length} selected)` : "Select from Location Database"}
              </Button>

              {pickedLocations.length > 0 && (
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold">{pickedLocations.length} location{pickedLocations.length !== 1 ? "s" : ""} attached</p>
                    <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => setPickedLocations([])}>Clear</Button>
                  </div>
                  <div className="max-h-40 overflow-auto space-y-1">
                    {pickedLocations.slice(0, 20).map((loc, i) => (
                      <div key={i} className="text-[11px] text-muted-foreground flex gap-1 flex-wrap">
                        {[loc.city, loc.state || loc.region, loc.country].filter(Boolean).join(", ") || "—"}
                      </div>
                    ))}
                    {pickedLocations.length > 20 && <p className="text-[10px] text-muted-foreground">…and {pickedLocations.length - 20} more</p>}
                  </div>
                </div>
              )}

              {pickedLocations.length === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Optional — skip this if your template has no geo variables.
                </p>
              )}
            </CardContent>
          </Card>
          </>)}

          {/* Step 4: Business / Personal Info */}
          {step === 4 && (<>
          <Card className="border-0 shadow-surface overflow-hidden relative">
            <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
            <CardContent className="p-5 space-y-4">
              <div>
                <p className="text-sm font-bold">Personal / Company Info</p>
                <p className="text-[11px] text-muted-foreground">
                  Any field whose name matches a template variable (e.g. <code className="text-[10px]">{"{phone}"}</code>, <code className="text-[10px]">{"{company_name}"}</code>) will be replaced with the value you enter here.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: "company_name", label: "Company name", ph: "Acme Corp" },
                  { key: "brand_name", label: "Brand name", ph: "Acme" },
                  { key: "phone", label: "Phone number", ph: "+1 555 123 4567" },
                  { key: "email", label: "Email", ph: "hello@acme.com" },
                  { key: "address", label: "Address", ph: "123 Main St, City" },
                  { key: "website", label: "Website", ph: "https://acme.com" },
                ].map((f) => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-xs">{f.label} <span className="text-muted-foreground font-normal">{"{" + f.key + "}"}</span></Label>
                    <Input
                      value={businessInfo[f.key] || ""}
                      onChange={(e) => setBusinessInfo((b) => ({ ...b, [f.key]: e.target.value }))}
                      placeholder={f.ph}
                    />
                  </div>
                ))}
              </div>

              {/* Custom variable */}
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-semibold">Add custom variable</p>
                <div className="flex gap-2">
                  <Input
                    className="flex-1"
                    placeholder="variable_name (e.g. tagline)"
                    value={customBizFieldName}
                    onChange={(e) => setCustomBizFieldName(e.target.value)}
                  />
                  <Input
                    className="flex-1"
                    placeholder="value"
                    value={customBizFieldValue}
                    onChange={(e) => setCustomBizFieldValue(e.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const key = customBizFieldName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
                      if (!key || !customBizFieldValue.trim()) return;
                      setBusinessInfo((b) => ({ ...b, [key]: customBizFieldValue.trim() }));
                      setCustomBizFieldName("");
                      setCustomBizFieldValue("");
                    }}
                  >
                    Add
                  </Button>
                </div>
                {Object.entries(businessInfo)
                  .filter(([k]) => !["company_name", "brand_name", "phone", "email", "address", "website"].includes(k))
                  .filter(([, v]) => (v ?? "").trim())
                  .map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between text-[11px] rounded bg-background/60 px-2 py-1 border">
                      <span className="font-mono">{"{" + k + "}"} = {v}</span>
                      <Button
                        size="sm" variant="ghost" className="h-5 text-[10px]"
                        onClick={() => setBusinessInfo((b) => { const { [k]: _drop, ...rest } = b; return rest; })}
                      >Remove</Button>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
          </>)}

          {/* Step 5: Review & Publish */}
          {step === 5 && (<>

          <Card className="border-0 shadow-surface overflow-hidden relative">
            <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
            <CardContent className="p-5 space-y-3">
              <div className="rounded-lg bg-muted/50 border border-border/60 p-3 text-xs space-y-1">
                <p className="font-semibold text-foreground">Ready to generate</p>
                <p className="text-muted-foreground">
                  Review your setup below, then click <strong>Generate Pages</strong> to create and publish pages to your connected site.
                </p>
              </div>

              {/* Variable mapping panel — grouped by source */}
              {selectedGroup && groupKeywords.length > 0 && (() => {
                type Row = { name: string; example?: string };
                const kwRows: Row[] = [];
                const locRows: Row[] = [];
                const bizRows: Row[] = [];
                const aiRows: Row[] = [];
                const missRows: Row[] = [];
                for (const gk of groupKeywords) {
                  const nameLc = gk.name.toLowerCase();
                  const isGeo = isGeoVariable(gk.name);
                  const isBiz = isBusinessVariable(gk.name);
                  const isAiContent = isAiContentVariable(gk.name);
                  const fromKw = !!gk.keyword && (gk.keyword.terms?.length ?? 0) > 0;
                  // Priority: Locations > Business Info > AI-content (heading/desc/etc.) > Keyword group.
                  if (isGeo) {
                    const first = pickedLocations[0] as any;
                    const val = first?.[nameLc] || first?.city || first?.state || first?.country;
                    locRows.push({ name: gk.name, example: val });
                  } else if (isBiz) {
                    const bizVal = businessInfo[nameLc]
                      || (nameLc === "business_name" || nameLc === "brand" ? (businessInfo.company_name || businessInfo.brand_name) : "")
                      || (nameLc === "phone_number" || nameLc === "tel" || nameLc === "telephone" ? businessInfo.phone : "")
                      || (nameLc === "email_address" ? businessInfo.email : "")
                      || (nameLc === "url" || nameLc === "site_url" ? businessInfo.website : "");
                    bizRows.push({ name: gk.name, example: bizVal });
                  } else if (isAiContent) {
                    aiRows.push({ name: gk.name });
                  } else if (fromKw) {
                    kwRows.push({ name: gk.name, example: gk.keyword?.terms?.[0] });
                  } else {
                    missRows.push({ name: gk.name });
                  }
                }
                const totalFilled = kwRows.length + locRows.length + bizRows.length + aiRows.length;
                const Group = ({
                  title, icon: Icon, color, rows, empty,
                }: { title: string; icon: any; color: string; rows: Row[]; empty: string }) => (
                  <div className="rounded-lg border border-border/60 bg-background/60 p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className={cn("flex items-center gap-1.5 font-semibold", color)}>
                        <Icon className="h-3.5 w-3.5" /> {title}
                      </span>
                      <span className="text-muted-foreground">{rows.length} var{rows.length !== 1 ? "s" : ""}</span>
                    </div>
                    {rows.length === 0 ? (
                      <p className="text-[10.5px] text-muted-foreground italic">{empty}</p>
                    ) : (
                      <div className="space-y-0.5">
                        {rows.map((r) => (
                          <div key={r.name} className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-mono text-foreground">{"{" + r.name + "}"}</span>
                            <span className="text-muted-foreground truncate max-w-[55%] text-right">
                              {r.example ? `e.g. ${String(r.example).slice(0, 32)}` : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
                return (
                  <div className="rounded-xl border border-primary/25 bg-primary/[0.03] p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold">Variable mapping</p>
                      <span className="text-[10.5px] text-muted-foreground">
                        {totalFilled}/{groupKeywords.length} filled
                      </span>
                    </div>
                    <p className="text-[10.5px] text-muted-foreground leading-snug">
                      Shows the source for every &#123;variable&#125; in your template — grouped by Keyword group, Locations, and Business Info.
                    </p>
                    <Group
                      title="From Keyword group"
                      icon={Bookmark}
                      color="text-primary"
                      rows={kwRows}
                      empty="No keyword-backed variables in this template."
                    />
                    <Group
                      title="From Locations"
                      icon={MapPin}
                      color="text-emerald-600 dark:text-emerald-400"
                      rows={locRows}
                      empty={pickedLocations.length === 0 ? "No locations attached (Step 3)." : "No geo variables in this template."}
                    />
                    <Group
                      title="From Business Info"
                      icon={Building2}
                      color="text-amber-600 dark:text-amber-400"
                      rows={bizRows}
                      empty="No business-info variables in this template."
                    />
                    <Group
                      title="From AI (auto-written per page)"
                      icon={Sparkles}
                      color="text-purple-600 dark:text-purple-400"
                      rows={aiRows}
                      empty="No AI-content variables (heading/description/etc.) in this template."
                    />
                    {missRows.length > 0 && (
                      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-2.5 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-1.5 font-semibold text-destructive">
                            <XCircle className="h-3.5 w-3.5" /> Not filled
                          </span>
                          <span className="text-muted-foreground">{missRows.length} var{missRows.length !== 1 ? "s" : ""}</span>
                        </div>
                        <p className="text-[10.5px] text-muted-foreground">
                          {missRows.map((r) => `{${r.name}}`).join(", ")} — attach a keyword group, locations, or business info.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Sample row inspector — pick any row to see per-variable source */}
              {selectedGroup && groupKeywords.length > 0 && (() => {
                const rows = buildRows();
                if (rows.length === 0) return null;
                const safeIdx = Math.min(sampleRowIndex, rows.length - 1);
                const row = rows[safeIdx] || {};
                const varNames = groupKeywords.map((g) => g.name);

                const classify = (varName: string, value: string) => {
                  const lc = varName.toLowerCase();
                  if (isGeoVariable(varName)) {
                    return { label: "Locations", from: "Step 3 · Locations Database", icon: MapPin, cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400" };
                  }
                  if (isBusinessVariable(varName) || injectedBizVarNames.has(lc)) {
                    return { label: "Business Info", from: "Step 4 · Business Info", icon: Building2, cls: "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400" };
                  }
                  if (isAiContentVariable(varName)) {
                    return { label: "AI-fill", from: "Runtime · AI writes this per page", icon: Sparkles, cls: "bg-purple-500/10 text-purple-600 border-purple-500/30 dark:text-purple-400" };
                  }
                  if ((value ?? "").trim() !== "") {
                    return { label: "Keyword Group", from: `Step 1 · ${selectedGroup?.name ?? "Keyword Group"}`, icon: Bookmark, cls: "bg-primary/10 text-primary border-primary/30" };
                  }
                  return { label: "AI-fill", from: "Runtime · AI will generate per row", icon: Sparkles, cls: "bg-purple-500/10 text-purple-600 border-purple-500/30 dark:text-purple-400" };
                };

                const counts = varNames.reduce<Record<string, number>>((acc, n) => {
                  const c = classify(n, row[n] ?? row[n.toLowerCase()] ?? "");
                  acc[c.label] = (acc[c.label] ?? 0) + 1;
                  return acc;
                }, {});

                const pickRandom = () => {
                  if (rows.length <= 1) return;
                  let i = safeIdx;
                  while (i === safeIdx) i = Math.floor(Math.random() * rows.length);
                  setSampleRowIndex(i);
                };

                return (
                  <div className="rounded-xl border border-primary/25 bg-primary/[0.03] overflow-hidden">
                    <div className="px-3.5 py-2.5 border-b border-primary/15 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold flex items-center gap-1.5">
                            <Eye className="h-3.5 w-3.5 text-primary" /> Sample row preview
                          </p>
                          <p className="text-[10.5px] text-muted-foreground">
                            Pick any row to see exactly which source (Locations / Business Info / Keyword Group / AI) fills each variable.
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
                          {Object.entries(counts).map(([lbl, n]) => (
                            <Badge key={lbl} variant="outline" className="h-5 px-1.5">
                              {lbl}: {n}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7"
                          disabled={safeIdx === 0}
                          onClick={() => setSampleRowIndex((i) => Math.max(0, i - 1))}
                        >
                          <ChevronRight className="h-3.5 w-3.5 rotate-180" />
                        </Button>
                        <Select value={String(safeIdx)} onValueChange={(v) => setSampleRowIndex(Number(v))}>
                          <SelectTrigger className="h-7 text-xs w-52">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {rows.slice(0, 200).map((r, i) => (
                              <SelectItem key={i} value={String(i)} className="text-xs">
                                Row {i + 1} — {String(Object.values(r)[0] ?? "").slice(0, 30) || "(empty)"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7"
                          disabled={safeIdx >= rows.length - 1}
                          onClick={() => setSampleRowIndex((i) => Math.min(rows.length - 1, i + 1))}
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={pickRandom} disabled={rows.length <= 1}>
                          <Shuffle className="h-3 w-3 mr-1" /> Random
                        </Button>
                        <span className="text-[11px] text-muted-foreground ml-auto tabular-nums">
                          Row {safeIdx + 1} of {rows.length.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-auto divide-y divide-border/50">
                      {varNames.map((n) => {
                        const val = row[n] ?? row[n.toLowerCase()] ?? "";
                        const src = classify(n, val);
                        const Icon = src.icon;
                        return (
                          <div key={n} className="px-3.5 py-2 flex items-start gap-3 text-xs hover:bg-muted/40">
                            <code className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                              {"{" + n + "}"}
                            </code>
                            <Badge variant="outline" className={cn("h-5 gap-1 px-1.5 text-[10px] shrink-0 mt-0.5", src.cls)}>
                              <Icon className="h-2.5 w-2.5" />
                              {src.label}
                            </Badge>
                            <div className="min-w-0 flex-1">
                              <div className={cn("break-words", val ? "text-foreground" : "italic text-muted-foreground")}>
                                {val ? String(val) : "(AI will generate at runtime)"}
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">from: {src.from}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Per-row variable source trace — first N rows */}
              {selectedGroup && groupKeywords.length > 0 && (() => {
                const rows = buildRows();
                if (rows.length === 0) return null;
                const MAX_ROWS = 8;
                const preview = rows.slice(0, MAX_ROWS);
                const varNames = groupKeywords.map((g) => g.name);

                const sourceFor = (varName: string, value: string) => {
                  const lc = varName.toLowerCase();
                  // Classification priority mirrors the mapping panel:
                  // Locations > Business Info > Keyword group > AI-fill.
                  if (isGeoVariable(varName)) {
                    return { label: "Locations", icon: MapPin, cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400" };
                  }
                  if (isBusinessVariable(varName) || injectedBizVarNames.has(lc)) {
                    return { label: "Business", icon: Building2, cls: "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400" };
                  }
                  if (isAiContentVariable(varName)) {
                    return { label: "AI-fill", icon: Sparkles, cls: "bg-purple-500/10 text-purple-600 border-purple-500/30 dark:text-purple-400" };
                  }
                  if ((value ?? "").trim() !== "") {
                    return { label: "Keyword", icon: Bookmark, cls: "bg-primary/10 text-primary border-primary/30" };
                  }
                  return { label: "AI-fill", icon: Sparkles, cls: "bg-purple-500/10 text-purple-600 border-purple-500/30 dark:text-purple-400" };
                };

                return (
                  <div className="rounded-xl border border-primary/25 bg-primary/[0.03] overflow-hidden">
                    <div className="px-3 py-2 flex items-center justify-between gap-2 border-b border-primary/15">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold">Per-row variable source trace</p>
                        <p className="text-[10.5px] text-muted-foreground truncate">
                          Preview of the first {preview.length} of {rows.length.toLocaleString()} row{rows.length !== 1 ? "s" : ""} — each cell shows the resolved value and its source.
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
                        <Badge variant="outline" className="h-5 gap-1 px-1.5 bg-primary/10 text-primary border-primary/30"><Bookmark className="h-2.5 w-2.5" />Keyword</Badge>
                        <Badge variant="outline" className="h-5 gap-1 px-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/30"><MapPin className="h-2.5 w-2.5" />Loc</Badge>
                        <Badge variant="outline" className="h-5 gap-1 px-1.5 bg-amber-500/10 text-amber-600 border-amber-500/30"><Building2 className="h-2.5 w-2.5" />Biz</Badge>
                        <Badge variant="outline" className="h-5 gap-1 px-1.5 bg-purple-500/10 text-purple-600 border-purple-500/30"><Sparkles className="h-2.5 w-2.5" />AI</Badge>
                      </div>
                    </div>
                    <div className="max-h-72 overflow-auto">
                      <table className="w-full text-[11px]">
                        <thead className="bg-muted/40 sticky top-0">
                          <tr>
                            <th className="text-left font-semibold px-2 py-1.5 w-10">#</th>
                            {varNames.map((n) => (
                              <th key={n} className="text-left font-semibold px-2 py-1.5 whitespace-nowrap">
                                <code className="font-mono text-[10.5px]">{"{" + n + "}"}</code>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {preview.map((row, i) => (
                            <tr key={i} className="border-t border-border/50 hover:bg-muted/30">
                              <td className="px-2 py-1.5 text-muted-foreground font-mono">{i + 1}</td>
                              {varNames.map((n) => {
                                const val = row[n] ?? row[n.toLowerCase()] ?? "";
                                const src = sourceFor(n, val);
                                const Icon = src.icon;
                                return (
                                  <td key={n} className="px-2 py-1.5 align-top">
                                    <div className="flex flex-col gap-1 min-w-0">
                                      <Badge variant="outline" className={cn("h-4 gap-1 px-1 text-[9.5px] w-fit", src.cls)}>
                                        <Icon className="h-2.5 w-2.5" />
                                        {src.label}
                                      </Badge>
                                      <span className={cn("truncate max-w-[180px]", val ? "text-foreground" : "italic text-muted-foreground")}>
                                        {val ? String(val).slice(0, 40) : "(AI will generate)"}
                                      </span>
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {rows.length > MAX_ROWS && (
                      <div className="px-3 py-1.5 text-[10.5px] text-muted-foreground border-t border-primary/15 bg-background/40">
                        Showing first {MAX_ROWS} rows. Remaining {(rows.length - MAX_ROWS).toLocaleString()} row{rows.length - MAX_ROWS !== 1 ? "s" : ""} follow the same pattern.
                      </div>
                    )}
                  </div>
                );
              })()}



              {needsLocations && (
                <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-xs space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-amber-600 dark:text-amber-400">
                        Locations not attached
                      </p>
                      <p className="text-muted-foreground">
                        Your template uses{" "}
                        <span className="font-medium text-foreground">
                          {unfilledGeoVars.map((v) => `{${v}}`).join(", ")}
                        </span>
                        . Attach real cities/states/countries in Step 3 before generating.
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => setStep(3)}
                  >
                    <MapPin className="h-3.5 w-3.5 mr-1.5" /> Go to Locations
                  </Button>
                </div>
              )}

              {geoCoverage.issues.length > 0 && (
                <div
                  className={`rounded-lg border p-3 text-xs space-y-2 ${
                    geoCoverage.severity === "block"
                      ? "border-destructive/50 bg-destructive/10"
                      : "border-amber-500/50 bg-amber-500/10"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle
                      className={`h-4 w-4 shrink-0 mt-0.5 ${
                        geoCoverage.severity === "block" ? "text-destructive" : "text-amber-500"
                      }`}
                    />
                    <div className="space-y-1 flex-1">
                      <p
                        className={`font-semibold ${
                          geoCoverage.severity === "block"
                            ? "text-destructive"
                            : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {geoCoverage.severity === "block"
                          ? "Geo coverage validation failed — generation blocked"
                          : "Geo coverage warning"}
                      </p>
                      <ul className="text-muted-foreground list-disc list-inside space-y-0.5">
                        {geoCoverage.issues.map((iss, i) => (
                          <li key={i}>{iss}</li>
                        ))}
                      </ul>
                      {geoCoverage.severity === "block" && (
                        <p className="text-muted-foreground pt-1">
                          Attach real locations in Step 3 — placeholder or empty geo values won&apos;t be published.
                        </p>
                      )}
                    </div>
                  </div>
                  {geoCoverage.severity === "block" && (
                    <Button size="sm" variant="outline" className="w-full" onClick={() => setStep(3)}>
                      <MapPin className="h-3.5 w-3.5 mr-1.5" /> Fix in Locations
                    </Button>
                  )}
                </div>
              )}

              <Button
                className="w-full rounded-xl bg-gradient-primary hover:brightness-110 shadow-sm gap-2"
                size="lg"
                disabled={!selectedGroup || isGenerating || needsLocations || missingKeywords.length > 0 || geoCoverage.severity === "block"}
                onClick={handleGenerate}
              >

                {isGenerating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Publishing…</>
                ) : (
                  <><Play className="h-4 w-4" /> Generate & Publish Pages</>
                )}
              </Button>

              <Button
                variant="outline"
                className="w-full rounded-xl"
                disabled={!selectedGroup || groupKeywords.every(k => !k.keyword)}
                onClick={() => {
                  if (needsLocations) {
                    toast({
                      title: "Locations not attached",
                      description: `${unfilledGeoVars.map((v) => `{${v}}`).join(", ")} will render empty. Attach locations in the Campaign Wizard first.`,
                      variant: "destructive",
                    });
                    return;
                  }
                  handleTestGenerate();
                }}
              >
                <Eye className="h-4 w-4 mr-2" /> {t("pgpGenerate.testPreviewBtn")}
              </Button>

              {/* Export resolved rows as CSV / JSON / XLSX for pre-publish review */}
              {selectedGroup && groupKeywords.length > 0 && (() => {
                const buildExportRows = () => {
                  const rows = buildRows();
                  const varNames = groupKeywords.map((g) => g.name);
                  const GEO_COLS = ["city", "state", "country", "region", "zip"];
                  const extras = GEO_COLS.filter((k) => !varNames.map((v) => v.toLowerCase()).includes(k));
                  const cols = ["_row", ...varNames, ...extras, "_source_summary"];
                  return rows.map((row, i) => {
                    const out: Record<string, string> = { _row: String(i + 1) };
                    const srcCounts = { keyword: 0, location: 0, business: 0, ai_fill: 0 };
                    for (const n of varNames) {
                      const lc = n.toLowerCase();
                      const val = row[n] ?? row[lc] ?? "";
                      out[n] = String(val);
                      if (isGeoVariable(n)) srcCounts.location++;
                      else if (isBusinessVariable(n) || injectedBizVarNames.has(lc)) srcCounts.business++;
                      else if (String(val).trim() !== "") srcCounts.keyword++;
                      else srcCounts.ai_fill++;
                    }
                    for (const k of extras) out[k] = String(row[k] ?? "");
                    out._source_summary =
                      `keyword=${srcCounts.keyword} location=${srcCounts.location} business=${srcCounts.business} ai_fill=${srcCounts.ai_fill}`;
                    // Ensure column order
                    const ordered: Record<string, string> = {};
                    for (const c of cols) ordered[c] = out[c] ?? "";
                    return ordered;
                  });
                };
                const doExport = (format: "csv" | "json" | "xlsx") => {
                  const rows = buildExportRows();
                  if (rows.length === 0) {
                    toast({ title: "Nothing to export", description: "No rows resolved yet.", variant: "destructive" });
                    return;
                  }
                  const safeName = (campaignNameDraft || "campaign").replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();
                  exportDataFile(rows, format, `${safeName}-resolved-rows.${format}`);
                  toast({ title: "Exported", description: `${rows.length} row${rows.length !== 1 ? "s" : ""} exported as ${format.toUpperCase()}.` });
                };
                return (
                  <div className="rounded-xl border border-primary/25 bg-primary/[0.03] p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4 text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold">Export resolved rows</p>
                        <p className="text-[10.5px] text-muted-foreground">
                          Download the exact per-row variables (city, state, country, region, zip + all template fields) before publishing for review or archival.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => doExport("csv")}>
                        <Download className="h-3.5 w-3.5" /> CSV
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => doExport("xlsx")}>
                        <Download className="h-3.5 w-3.5" /> Excel
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => doExport("json")}>
                        <Download className="h-3.5 w-3.5" /> JSON
                      </Button>
                    </div>
                  </div>
                );
              })()}





              {selectedGroup && (
                <div className="rounded-xl border p-3 space-y-2 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t("pgpGenerate.summaryMethod")}</span>
                    <span className="font-medium text-foreground">{method === "all" ? t("pgpGenerate.methodAll") : method === "sequential" ? t("pgpGenerate.methodSequential") : t("pgpGenerate.methodRandom")}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t("pgpGenerate.summaryKeywords")}</span>
                    <span className="font-medium text-foreground">{groupKeywords.length}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t("pgpGenerate.summaryMaxPages")}</span>
                    <span className="font-medium text-foreground">{maxPages.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t("pgpGenerate.summaryWillGenerate")}</span>
                    <span className="font-medium text-foreground">
                      {numberOfPages ? Math.min(parseInt(numberOfPages) || 0, maxPages).toLocaleString() : maxPages.toLocaleString()}
                    </span>
                  </div>
                  <Separator className="my-1" />
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t("pgpGenerate.summaryOverwrite")}</span>
                    <span className="font-medium text-foreground">{overwrite ? t("pgpGenerate.yes") : t("pgpGenerate.no")}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t("pgpGenerate.summarySpintax")}</span>
                    <span className="font-medium text-foreground">{spinContent ? t("pgpGenerate.on") : t("pgpGenerate.off")}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t("pgpGenerate.summarySchedule")}</span>
                    <span className="font-medium text-foreground">{scheduleMode === "immediate" ? t("pgpGenerate.scheduleImmediate") : scheduleMode === "specific" ? t("pgpGenerate.scheduleSpecific") : scheduleMode === "increment" ? t("pgpGenerate.scheduleIncrement") : t("pgpGenerate.scheduleRandom")}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Preview */}
          {testPreview && (
            <Card className="border-0 shadow-surface">
              <CardContent className="p-0">
                <div className="px-4 py-3 border-b flex items-center justify-between">
                  <p className="text-xs font-semibold">{t("pgpGenerate.testPreviewTitle")}</p>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setTestPreview(null)}>
                    {t("pgpGenerate.close")}
                  </Button>
                </div>
                <div className="p-4 max-h-96 overflow-auto">
                  <TemplatePreview html={testPreview} />
                </div>
              </CardContent>
            </Card>
          )}
          </>)}
        </div>

        {/* Wizard nav footer */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <Button
            variant="ghost"
            className="rounded-xl"
            disabled={step === 1}
            onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4 | 5) : s))}
          >
            Back
          </Button>
          {step < 5 ? (
            <Button
              className="rounded-xl bg-gradient-primary hover:brightness-110 shadow-sm gap-2"
              disabled={step === 1 && !selectedGroup}
              onClick={() => setStep((s) => (s < 5 ? ((s + 1) as 1 | 2 | 3 | 4 | 5) : s))}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <span className="text-[11px] text-muted-foreground">
              Use <strong>Generate Pages</strong> above to finish.
            </span>
          )}
        </div>
      </div>


      <AlertDialog open={confirmRegen} onOpenChange={setConfirmRegen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate keywords & terms?</AlertDialogTitle>
            <AlertDialogDescription>
              This re-runs the analysis and overwrites your current keywords, terms, and locations
              with fresh results. Any manual edits you made to those fields will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep my edits</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmRegen(false);
                handleAnalyzeSource();
              }}
            >
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LocationDatabaseDialog
        open={showLocationsDialog}
        onOpenChange={setShowLocationsDialog}
        onSelect={(rows) => {
          const mapped = rows.map((r: any) => ({
            city: (r.city || r.name || "").toString().trim(),
            state: (r.state || r.admin1 || "").toString().trim(),
            region: (r.region || r.admin2 || r.state || "").toString().trim(),
            country: (r.country || "").toString().trim(),
            zip: (r.zip || r.postal_code || "").toString().trim(),
          })).filter((l) => l.city || l.state || l.country);
          if (mapped.length) {
            setPickedLocations(mapped);
            const cityLabels = Array.from(new Set(mapped.map((l) => l.city || l.state || l.country).filter(Boolean)));
            setAiLocations(cityLabels.join(", "));
            toast({
              title: "Locations attached",
              description: `${mapped.length} location${mapped.length !== 1 ? "s" : ""} will be used as variables during generation.`,
            });
          }
          setShowLocationsDialog(false);
        }}
      />
    </div>
  );
}