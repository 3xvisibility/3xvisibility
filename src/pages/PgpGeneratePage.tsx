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

  const handleTestGenerate = () => {
    if (!selectedGroup) return;
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
    let rendered = selectedGroup.content;
    for (const [key, val] of Object.entries(sampleData)) {
      rendered = rendered.replace(new RegExp(`\\{${key}\\}`, "gi"), val);
    }
    setTestPreview(rendered);
  };

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
      return rows.slice(start, start + limit);
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
      return rows;
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
    return rows;
  };

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

      const { error: genErr } = await supabase.functions.invoke("generate-pages", {
        body: {
          campaign_id: campaign.id,
          overwrite,
          overwrite_fields: overwrite ? overwriteFields : undefined,
        },
      });

      if (genErr) throw genErr;

      setGenProgress({ processed: rows.length, total: rows.length, errors: 0 });
      toast({ title: "Generation complete!", description: `${rows.length} pages generated.` });

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
    <div className="space-y-6">
      <div>
        <h1 className="text-display">Generate</h1>
        <p className="text-muted-foreground mt-1">
          Select a Content Group, configure generation settings, and generate pages.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Configuration */}
        <div className="lg:col-span-2 space-y-5">
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
                    <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-500/10 rounded-lg px-3 py-2">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>Define missing keywords before generating.</span>
                      <Button variant="link" size="sm" className="text-amber-600 h-auto p-0 ml-auto" onClick={() => navigate(`${basePath}/pgp-keywords`)}>
                        Go to Keywords →
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generation Settings */}
          {selectedGroup && (
            <Card className="shadow-surface">
              <CardContent className="p-5 space-y-5">
                <Tabs defaultValue="generation" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="generation"><Zap className="h-3.5 w-3.5 mr-1.5" /> Generation</TabsTrigger>
                    <TabsTrigger value="ai"><Sparkles className="h-3.5 w-3.5 mr-1.5" /> AI Generate</TabsTrigger>
                    <TabsTrigger value="overwrite"><RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Overwrite</TabsTrigger>
                    <TabsTrigger value="schedule"><Settings2 className="h-3.5 w-3.5 mr-1.5" /> Schedule</TabsTrigger>
                  </TabsList>

                  <TabsContent value="generation" className="space-y-4">
                    {/* Method Selection */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Generation Method</Label>
                      <div className="grid grid-cols-3 gap-2">
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