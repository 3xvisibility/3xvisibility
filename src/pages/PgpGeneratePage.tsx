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
  Play, Eye, FileText, KeyRound, Layers, Loader2,
  CheckCircle2, XCircle, AlertTriangle, Zap, Settings2,
  RotateCcw, Shuffle, ArrowDown, ListOrdered, Sparkles,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSearchParams, useNavigate } from "react-router-dom";
import { filterDesignVars } from "@/lib/design-vars-filter";
import { TemplatePreview } from "@/components/templates/TemplatePreview";

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
  const [method, setMethod] = useState<"all" | "sequential" | "random">("all");
  const [numberOfPages, setNumberOfPages] = useState("");
  const [resumeIndex, setResumeIndex] = useState("0");
  const [selectedWebsite, setSelectedWebsite] = useState("");
  const [publishMode, setPublishMode] = useState("draft");
  const [isGenerating, setIsGenerating] = useState(false);
  const [testPreview, setTestPreview] = useState<string | null>(null);
  const [genProgress, setGenProgress] = useState<{ processed: number; total: number; errors: number } | null>(null);

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

  // Brand name
  const [brandSource, setBrandSource] = useState<"website" | "custom">("website");
  const [customBrandName, setCustomBrandName] = useState("");

  // AI generation
  const [aiBusinessDesc, setAiBusinessDesc] = useState("");
  const [aiKeywords, setAiKeywords] = useState("");
  const [aiLocations, setAiLocations] = useState("");
  const [aiPageCount, setAiPageCount] = useState("10");
  const [aiLanguage, setAiLanguage] = useState("en");
  const [aiGenerating, setAiGenerating] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { currentWorkspace, basePath } = useWorkspace();
  const wsId = currentWorkspace?.id;

  useEffect(() => {
    if (preselectedGroup) setSelectedGroupId(preselectedGroup);
  }, [preselectedGroup]);

  const { data: contentGroups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ["pgp-content-groups", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase.from("templates").select("*").eq("workspace_id", wsId!).order("name");
      if (error) throw error;
      return data as Template[];
    },
  });

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
      return { name: v, keyword: kw || null, termCount: kw?.term_count || 0 };
    });
  }, [selectedGroup, keywords]);

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

  const missingKeywords = groupKeywords.filter(k => !k.keyword);

  const handleAiKeywordFill = async () => {
    if (!wsId || missingKeywords.length === 0 || !aiKwBusiness.trim()) return;
    setAiKwFilling(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const varNames = missingKeywords.map(k => k.name);
      const prompt = `Generate keyword data for an SEO page generator tool.

Business/Service: ${aiKwBusiness.trim()}
${aiKwCustomData.trim() ? `Additional context: ${aiKwCustomData.trim()}` : ""}

For each of these variables, generate ${aiKwCount} realistic, diverse terms that would be used on landing pages:
${varNames.map(v => `- {${v}}`).join("\n")}

Return a JSON object where each key is the variable name and the value is an array of string terms.
Example: {"city": ["Houston", "Dallas"], "service": ["Plumbing", "HVAC"]}
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
        throw new Error("AI returned invalid data. Try again.");
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
      toast({ title: "Keywords generated", description: `AI created terms for ${varNames.length} keyword groups.` });
      setShowAiKeywordFill(false);
      setAiKwBusiness("");
      setAiKwCustomData("");
    } catch (err: any) {
      toast({ title: "AI fill failed", description: err.message, variant: "destructive" });
    } finally {
      setAiKwFilling(false);
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
      const t = transform.toLowerCase();
      if (t === "uppercase") return rawVal.toUpperCase();
      if (t === "lowercase") return rawVal.toLowerCase();
      if (t === "capitalize") return rawVal.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
      if (t === "slug") return rawVal.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
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

  const buildRows = (): Record<string, string>[] => {
    const kwData = groupKeywords.filter(k => k.keyword);
    if (kwData.length === 0) return [];

    const start = parseInt(resumeIndex) || 0;

    if (method === "all") {
      // Cartesian product
      const rows: Record<string, string>[] = [];
      const termArrays = kwData.map(k => k.keyword!.terms);
      const names = kwData.map(k => k.name);

      const generate = (index: number, current: Record<string, string>) => {
        if (index === termArrays.length) {
          rows.push({ ...current });
          return;
        }
        for (const term of termArrays[index]) {
          current[names[index]] = term;
          generate(index + 1, current);
        }
      };
      generate(0, {});

      const limit = numberOfPages ? Math.min(parseInt(numberOfPages), rows.length - start) : rows.length - start;
      const sliced = rows.slice(start, start + limit);
      return resolvedBrandName ? sliced.map(r => ({ ...r, brand_name: resolvedBrandName })) : sliced;
    }

    if (method === "sequential") {
      const max = Math.max(...kwData.map(k => k.termCount));
      const limit = numberOfPages ? Math.min(parseInt(numberOfPages), max - start) : max - start;
      const rows: Record<string, string>[] = [];
      for (let i = start; i < start + limit && i < max; i++) {
        const row: Record<string, string> = {};
        for (const gk of kwData) {
          row[gk.name] = gk.keyword!.terms[i % gk.keyword!.terms.length] || "";
        }
        rows.push(row);
      }
      return resolvedBrandName ? rows.map(r => ({ ...r, brand_name: resolvedBrandName })) : rows;
    }

    // Random
    const count = numberOfPages ? parseInt(numberOfPages) : maxPages;
    const rows: Record<string, string>[] = [];
    for (let i = 0; i < count; i++) {
      const row: Record<string, string> = {};
      for (const gk of kwData) {
        row[gk.name] = gk.keyword!.terms[Math.floor(Math.random() * gk.keyword!.terms.length)] || "";
      }
      rows.push(row);
    }
    return rows.map(r => resolvedBrandName ? { ...r, brand_name: resolvedBrandName } : r);
  };

  // Also wrap the other returns above — handled inline via final map
  const injectBrand = (rows: Record<string, string>[]) =>
    resolvedBrandName ? rows.map(r => ({ ...r, brand_name: resolvedBrandName })) : rows;

  const handleAiGenerate = async () => {
    if (!wsId || !aiBusinessDesc.trim()) {
      toast({ title: "Describe your business first", variant: "destructive" });
      return;
    }
    setAiGenerating(true);
    setGenProgress({ processed: 0, total: 0, errors: 0 });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const count = parseInt(aiPageCount) || 10;
      setGenProgress({ processed: 0, total: count, errors: 0 });

      const { data: aiResult, error: aiErr } = await supabase.functions.invoke("generate-seo-content", {
        body: {
          prompt: `You are a professional SEO content generator. Generate exactly ${count} unique landing pages for the following business.

Business: ${aiBusinessDesc}
Keywords: ${aiKeywords || "auto-detect relevant keywords"}
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
        throw new Error("AI returned invalid format. Please try again.");
      }

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
      }));

      const { error: pagesErr } = await supabase.from("generated_pages").insert(pageInserts);
      if (pagesErr) throw pagesErr;

      setGenProgress({ processed: pages.length, total: pages.length, errors: 0 });
      toast({ title: "AI Generation complete!", description: `${pages.length} pages created.` });

      setTimeout(() => navigate(`${basePath}/campaigns/${campaign.id}`), 1500);
    } catch (err: any) {
      toast({ title: "AI generation failed", description: err.message, variant: "destructive" });
    } finally {
      setAiGenerating(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedGroup || !wsId) return;
    if (missingKeywords.length > 0) {
      toast({ title: "Missing Keywords", description: `Define keywords: ${missingKeywords.map(k => k.name).join(", ")}`, variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setGenProgress({ processed: 0, total: 0, errors: 0 });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const rows = buildRows();
      if (rows.length === 0) {
        toast({ title: "No rows to generate", variant: "destructive" });
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
        title: finalErrors > 0 ? "Generation completed with errors" : "Generation complete!",
        description: `${finalSuccess} pages generated${finalErrors > 0 ? `, ${finalErrors} failed` : ""}.`,
        variant: finalErrors > 0 ? "destructive" : "default",
      });

      setTimeout(() => {
        navigate(`${basePath}/campaigns/${campaign.id}`);
      }, 1500);

    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const methodIcons = {
    all: <Shuffle className="h-4 w-4" />,
    sequential: <ListOrdered className="h-4 w-4" />,
    random: <ArrowDown className="h-4 w-4" />,
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-lg sm:text-display">Generate</h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">
          Select a Content Group, configure generation settings, and generate pages.
        </p>
      </div>

      {/* Readiness check */}
      {!loadingGroups && (contentGroups.length === 0 || keywords.length === 0) && (
        <div className="rounded-xl border border-amber-300/50 bg-amber-50/50 dark:bg-amber-500/10 p-4 sm:p-5 space-y-3">
          <h3 className="font-semibold text-sm text-amber-800 dark:text-amber-300">⚙️ Setup Required Before Generating</h3>
          <div className="space-y-2">
            {keywords.length === 0 && (
              <div className="flex items-center gap-2 text-xs">
                <div className="h-5 w-5 rounded-full bg-amber-200 dark:bg-amber-700 text-amber-800 dark:text-amber-200 flex items-center justify-center text-[10px] font-bold">!</div>
                <span className="text-amber-700 dark:text-amber-300">No keywords found.</span>
                <button className="underline font-semibold text-primary" onClick={() => navigate(`${basePath}/pgp-keywords`)}>Create keywords →</button>
              </div>
            )}
            {contentGroups.length === 0 && (
              <div className="flex items-center gap-2 text-xs">
                <div className="h-5 w-5 rounded-full bg-amber-200 dark:bg-amber-700 text-amber-800 dark:text-amber-200 flex items-center justify-center text-[10px] font-bold">!</div>
                <span className="text-amber-700 dark:text-amber-300">No content groups found.</span>
                <button className="underline font-semibold text-primary" onClick={() => navigate(`${basePath}/pgp-content`)}>Create content group →</button>
              </div>
            )}
          </div>
          <p className="text-[11px] text-amber-600 dark:text-amber-400">Complete the steps above to start generating pages. Or use the <strong>AI Generate</strong> tab to skip setup entirely.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left: Configuration */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-5">
          {/* Content Group Selection */}
          <Card className="shadow-surface">
            <CardContent className="p-5 space-y-4">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" /> Content Group
              </Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select a Content Group..." />
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
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Keywords in this group</p>
                  <div className="space-y-2">
                    {groupKeywords.map(gk => (
                      <div key={gk.name} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2">
                          <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                          <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{`{${gk.name}}`}</code>
                        </div>
                        {gk.keyword ? (
                          <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> {gk.termCount} terms
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">
                            <XCircle className="h-3 w-3 mr-1" /> Not defined
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                  {missingKeywords.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-500/10 rounded-lg px-3 py-2">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>Define missing keywords before generating.</span>
                        <Button variant="link" size="sm" className="text-amber-600 h-auto p-0 ml-auto" onClick={() => navigate(`${basePath}/pgp-keywords`)}>
                          Keywords →
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-primary/30 text-primary hover:bg-primary/5"
                        onClick={() => setShowAiKeywordFill(!showAiKeywordFill)}
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                        {showAiKeywordFill ? "Hide AI Fill" : "AI Auto-Fill All Keywords"}
                      </Button>
                      {showAiKeywordFill && (
                        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Business / Service *</Label>
                            <Textarea
                              placeholder="e.g. E-commerce store selling electronics, smartphones, laptops..."
                              value={aiKwBusiness}
                              onChange={(e) => setAiKwBusiness(e.target.value)}
                              rows={2}
                              className="resize-none text-xs"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Custom Data <span className="text-muted-foreground font-normal">(optional)</span></Label>
                            <Textarea
                              placeholder="e.g. Brand names: Samsung, Apple. Price range: $100-$2000. Free shipping over $50..."
                              value={aiKwCustomData}
                              onChange={(e) => setAiKwCustomData(e.target.value)}
                              rows={2}
                              className="resize-none text-xs"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Terms per keyword</Label>
                            <Input type="number" min={3} max={50} value={aiKwCount} onChange={(e) => setAiKwCount(e.target.value)} className="h-8 text-xs" />
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            AI will generate terms for: {missingKeywords.map(k => `{${k.name}}`).join(", ")}
                          </p>
                          <Button
                            size="sm"
                            className="w-full"
                            disabled={!aiKwBusiness.trim() || aiKwFilling}
                            onClick={handleAiKeywordFill}
                          >
                            {aiKwFilling ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Generating...</> : <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Generate All Keywords</>}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Generate (always available) */}
          {!selectedGroup && (
            <Card className="shadow-surface">
              <CardContent className="p-5 space-y-4">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">AI-Powered Page Generation</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    No Content Group needed — describe your business and AI generates unique, SEO-optimized pages.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Business / Store Description *</Label>
                  <Textarea
                    placeholder="e.g. Plumbing services company in Texas, specializing in emergency repairs..."
                    value={aiBusinessDesc}
                    onChange={(e) => setAiBusinessDesc(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Target Keywords</Label>
                  <Textarea
                    placeholder="e.g. plumber near me, emergency plumbing, water heater repair..."
                    value={aiKeywords}
                    onChange={(e) => setAiKeywords(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                  <p className="text-[10px] text-muted-foreground">Comma-separated. Leave blank to auto-detect.</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Target Locations</Label>
                  <Textarea
                    placeholder="e.g. Houston TX, Dallas TX, Austin TX..."
                    value={aiLocations}
                    onChange={(e) => setAiLocations(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                  <p className="text-[10px] text-muted-foreground">Comma-separated. Leave blank for general pages.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Number of Pages</Label>
                    <Input type="number" min={1} max={50} value={aiPageCount} onChange={(e) => setAiPageCount(e.target.value)} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Language</Label>
                    <Select value={aiLanguage} onValueChange={setAiLanguage}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="pt">Portuguese</SelectItem>
                        <SelectItem value="ar">Arabic</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                        <SelectItem value="ja">Japanese</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Brand Name</Label>
                  <div className="flex gap-2">
                    <Select value={brandSource} onValueChange={(v) => setBrandSource(v as "website" | "custom")}>
                      <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="website">From Website</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    {brandSource === "custom" ? (
                      <Input className="h-9 flex-1" placeholder="Your Brand Name" value={customBrandName} onChange={e => setCustomBrandName(e.target.value)} />
                    ) : (
                      <p className="text-xs text-muted-foreground self-center flex-1 truncate">{resolvedBrandName || "Select a website below"}</p>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Used as {"{brand_name}"} in templates</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Publish To</Label>
                    <Select value={selectedWebsite} onValueChange={setSelectedWebsite}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="None (save locally)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (save locally)</SelectItem>
                        {websites.filter(w => w.status === "connected").map(w => (
                          <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Publish Mode</Label>
                    <Select value={publishMode} onValueChange={setPublishMode}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="publish">Publish</SelectItem>
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
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> AI Generating...</>
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-2" /> Generate with AI</>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Generation Settings */}
          {selectedGroup && (
            <Card className="shadow-surface">
              <CardContent className="p-5 space-y-5">
                <Tabs defaultValue="generation" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
                    <TabsTrigger value="generation" className="text-xs sm:text-sm"><Zap className="h-3.5 w-3.5 mr-1 sm:mr-1.5" /> <span className="hidden sm:inline">Generation</span><span className="sm:hidden">Gen</span></TabsTrigger>
                    <TabsTrigger value="ai" className="text-xs sm:text-sm"><Sparkles className="h-3.5 w-3.5 mr-1 sm:mr-1.5" /> AI</TabsTrigger>
                    <TabsTrigger value="overwrite" className="text-xs sm:text-sm"><RotateCcw className="h-3.5 w-3.5 mr-1 sm:mr-1.5" /> <span className="hidden sm:inline">Overwrite</span><span className="sm:hidden">Overw.</span></TabsTrigger>
                    <TabsTrigger value="schedule" className="text-xs sm:text-sm"><Settings2 className="h-3.5 w-3.5 mr-1 sm:mr-1.5" /> <span className="hidden sm:inline">Schedule</span><span className="sm:hidden">Sched.</span></TabsTrigger>
                  </TabsList>

                  <TabsContent value="generation" className="space-y-4">
                    {/* Method Selection */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Generation Method</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {([
                          { value: "all", label: "All Combinations", desc: "Every possible combination of keyword terms" },
                          { value: "sequential", label: "Sequential", desc: "Honors the order of terms in each keyword" },
                          { value: "random", label: "Random", desc: "Picks a random term from each keyword" },
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
                        <Label className="text-xs">Number of Pages</Label>
                        <Input
                          type="number"
                          placeholder={`Max: ${maxPages.toLocaleString()}`}
                          value={numberOfPages}
                          onChange={(e) => setNumberOfPages(e.target.value)}
                          className="h-9"
                        />
                        <p className="text-[10px] text-muted-foreground">Leave blank for all ({maxPages.toLocaleString()} pages)</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Resume Index</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={resumeIndex}
                          onChange={(e) => setResumeIndex(e.target.value)}
                          className="h-9"
                        />
                        <p className="text-[10px] text-muted-foreground">Start from this index (0-based)</p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Brand Name</Label>
                      <div className="flex gap-2">
                        <Select value={brandSource} onValueChange={(v) => setBrandSource(v as "website" | "custom")}>
                          <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="website">From Website</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                        {brandSource === "custom" ? (
                          <Input className="h-9 flex-1" placeholder="Your Brand Name" value={customBrandName} onChange={e => setCustomBrandName(e.target.value)} />
                        ) : (
                          <p className="text-xs text-muted-foreground self-center flex-1 truncate">{resolvedBrandName || "Select a website below"}</p>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">Used as {"{brand_name}"} in templates</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Publish To</Label>
                        <Select value={selectedWebsite} onValueChange={setSelectedWebsite}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="None (save locally)" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None (save locally)</SelectItem>
                            {websites.filter(w => w.status === "connected").map(w => (
                              <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Publish Mode</Label>
                        <Select value={publishMode} onValueChange={setPublishMode}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="publish">Publish</SelectItem>
                            <SelectItem value="private">Private</SelectItem>
                            <SelectItem value="pending">Pending Review</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Spin Content</p>
                        <p className="text-[11px] text-muted-foreground">Resolve {"{spintax|variations}"} in content</p>
                      </div>
                      <Switch checked={spinContent} onCheckedChange={setSpinContent} />
                    </div>
                  </TabsContent>

                  <TabsContent value="ai" className="space-y-4">
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <p className="text-sm font-semibold">AI-Powered Page Generation</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Describe your business and AI will generate unique, SEO-optimized pages automatically.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Business / Store Description *</Label>
                      <Textarea
                        placeholder="e.g. Plumbing services company in Texas, specializing in emergency repairs, water heater installation, and drain cleaning..."
                        value={aiBusinessDesc}
                        onChange={(e) => setAiBusinessDesc(e.target.value)}
                        rows={3}
                        className="resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Target Keywords</Label>
                      <Textarea
                        placeholder="e.g. plumber near me, emergency plumbing, water heater repair, drain cleaning service..."
                        value={aiKeywords}
                        onChange={(e) => setAiKeywords(e.target.value)}
                        rows={2}
                        className="resize-none"
                      />
                      <p className="text-[10px] text-muted-foreground">Comma-separated. Leave blank to auto-detect.</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Target Locations</Label>
                      <Textarea
                        placeholder="e.g. Houston TX, Dallas TX, Austin TX, San Antonio TX..."
                        value={aiLocations}
                        onChange={(e) => setAiLocations(e.target.value)}
                        rows={2}
                        className="resize-none"
                      />
                      <p className="text-[10px] text-muted-foreground">Comma-separated cities/areas. Leave blank for general pages.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Number of Pages</Label>
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
                        <Label className="text-xs">Language</Label>
                        <Select value={aiLanguage} onValueChange={setAiLanguage}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="fr">French</SelectItem>
                            <SelectItem value="es">Spanish</SelectItem>
                            <SelectItem value="de">German</SelectItem>
                            <SelectItem value="it">Italian</SelectItem>
                            <SelectItem value="pt">Portuguese</SelectItem>
                            <SelectItem value="nl">Dutch</SelectItem>
                            <SelectItem value="ar">Arabic</SelectItem>
                            <SelectItem value="hi">Hindi</SelectItem>
                            <SelectItem value="ja">Japanese</SelectItem>
                            <SelectItem value="zh">Chinese</SelectItem>
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
                        <><Loader2 className="h-4 w-4 animate-spin mr-2" /> AI Generating...</>
                      ) : (
                        <><Sparkles className="h-4 w-4 mr-2" /> Generate with AI</>
                      )}
                    </Button>
                  </TabsContent>

                  <TabsContent value="overwrite" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Enable Overwrite</p>
                        <p className="text-[11px] text-muted-foreground">Replace pages with matching slugs</p>
                      </div>
                      <Switch checked={overwrite} onCheckedChange={setOverwrite} />
                    </div>

                    {overwrite && (
                      <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select sections to overwrite</p>
                        <div className="grid grid-cols-2 gap-2">
                          {([
                            { key: "title", label: "Title & Slug" },
                            { key: "content", label: "Content" },
                            { key: "excerpt", label: "Excerpt" },
                            { key: "seo", label: "SEO Metadata" },
                            { key: "featuredImage", label: "Featured Image" },
                            { key: "customFields", label: "Custom Fields" },
                            { key: "taxonomies", label: "Taxonomies" },
                            { key: "author", label: "Author" },
                            { key: "publishDate", label: "Publish Date" },
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
                        <p className="text-[10px] text-muted-foreground">Unchecked sections will be preserved from the existing page.</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="schedule" className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Schedule Mode</Label>
                      <Select value={scheduleMode} onValueChange={(v: any) => setScheduleMode(v)}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediate">Immediate</SelectItem>
                          <SelectItem value="specific">Specific Date</SelectItem>
                          <SelectItem value="increment">Increment (Drip Feed)</SelectItem>
                          <SelectItem value="random">Random Date Range</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {scheduleMode === "specific" && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Publish Date</Label>
                        <Input type="datetime-local" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="h-9" />
                      </div>
                    )}

                    {scheduleMode === "increment" && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Hours Between Each Page</Label>
                        <Input type="number" value={incrementHours} onChange={(e) => setIncrementHours(e.target.value)} className="h-9" min={1} />
                        <p className="text-[10px] text-muted-foreground">Each page is published X hours after the previous one.</p>
                      </div>
                    )}

                    {scheduleMode === "random" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Start Date</Label>
                          <Input type="datetime-local" value={scheduleDateStart} onChange={(e) => setScheduleDateStart(e.target.value)} className="h-9" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">End Date</Label>
                          <Input type="datetime-local" value={scheduleDateEnd} onChange={(e) => setScheduleDateEnd(e.target.value)} className="h-9" />
                        </div>
                        <p className="col-span-2 text-[10px] text-muted-foreground">Each page gets a random date between start and end.</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Generation Progress */}
          {genProgress && (
            <Card className="shadow-surface">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Generation Progress</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {genProgress.processed}/{genProgress.total}
                  </span>
                </div>
                <Progress value={genProgress.total > 0 ? (genProgress.processed / genProgress.total) * 100 : 0} className="h-2" />
                {genProgress.errors > 0 && (
                  <p className="text-xs text-destructive">{genProgress.errors} error(s)</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Actions & Preview */}
        <div className="space-y-4">
          <Card className="shadow-surface">
            <CardContent className="p-5 space-y-3">
              <Button
                className="w-full"
                size="lg"
                disabled={!selectedGroup || missingKeywords.length > 0 || isGenerating}
                onClick={handleGenerate}
              >
                {isGenerating ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating...</>
                ) : (
                  <><Play className="h-4 w-4 mr-2" /> Generate</>
                )}
              </Button>

              <Button
                variant="outline"
                className="w-full"
                disabled={!selectedGroup || groupKeywords.every(k => !k.keyword)}
                onClick={handleTestGenerate}
              >
                <Eye className="h-4 w-4 mr-2" /> Test (Preview 1 Page)
              </Button>

              {selectedGroup && (
                <div className="rounded-xl border p-3 space-y-2 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Method</span>
                    <span className="font-medium text-foreground capitalize">{method}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Keywords</span>
                    <span className="font-medium text-foreground">{groupKeywords.length}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Max Pages</span>
                    <span className="font-medium text-foreground">{maxPages.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Will Generate</span>
                    <span className="font-medium text-foreground">
                      {numberOfPages ? Math.min(parseInt(numberOfPages) || 0, maxPages).toLocaleString() : maxPages.toLocaleString()}
                    </span>
                  </div>
                  <Separator className="my-1" />
                  <div className="flex justify-between text-muted-foreground">
                    <span>Overwrite</span>
                    <span className="font-medium text-foreground">{overwrite ? "Yes" : "No"}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Spintax</span>
                    <span className="font-medium text-foreground">{spinContent ? "On" : "Off"}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Schedule</span>
                    <span className="font-medium text-foreground capitalize">{scheduleMode}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Preview */}
          {testPreview && (
            <Card className="shadow-surface">
              <CardContent className="p-0">
                <div className="px-4 py-3 border-b flex items-center justify-between">
                  <p className="text-xs font-semibold">Test Preview</p>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setTestPreview(null)}>
                    Close
                  </Button>
                </div>
                <div className="p-4 max-h-96 overflow-auto">
                  <TemplatePreview html={testPreview} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}