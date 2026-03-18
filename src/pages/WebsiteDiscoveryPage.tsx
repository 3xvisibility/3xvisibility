import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import {
  Compass,
  Globe,
  Sparkles,
  Check,
  X,
  Save,
  ArrowRight,
  ArrowLeftRight,
  Loader2,
  Tag,
  Eye,
  FileText,
  MousePointer,
  Search,
  Pencil,
  ExternalLink,
  FolderTree,
  Layers,
  Settings2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import PageComparisonDialog from "@/components/discovery/PageComparisonDialog";
import { SeoScoreBadge } from "@/components/SeoScoreBadge";
import { computeAverageScores } from "@/components/ScoresBadgeGroup";
import { calculateContentSeoScore, calculateContentSeaScore, calculateContentGeoScore } from "@/lib/content-seo-score";

interface DiscoveredPage {
  url: string;
  title: string;
  type: string;
  headings: { tag: string; text: string }[];
  textSnippet: string;
  bodyHtml: string;
}

interface DetectedPattern {
  name: string;
  template: string;
  variables: string[];
  matchingPages: string[];
  confidence: string;
}

interface UrlGroup {
  pattern: string;
  patternLabel: string;
  pages: string[];
  suggestedVariables: string[];
}

interface CrawlStats {
  total_discovered: number;
  total_crawled: number;
  max_pages: number;
  max_depth: number;
}

interface VisualMapping {
  id: string;
  original: string;
  variable: string;
  value: string;
}

const typeColors: Record<string, string> = {
  service: "bg-blue-500/10 text-blue-600",
  product: "bg-emerald-500/10 text-emerald-600",
  location: "bg-amber-500/10 text-amber-600",
  blog: "bg-purple-500/10 text-purple-600",
  landing: "bg-pink-500/10 text-pink-600",
  about: "bg-slate-500/10 text-slate-600",
  contact: "bg-cyan-500/10 text-cyan-600",
  page: "bg-muted text-muted-foreground",
};

function SelectionPopover({
  position,
  selectedText,
  onAssign,
  onClose,
}: {
  position: { x: number; y: number };
  selectedText: string;
  onAssign: (varName: string) => void;
  onClose: () => void;
}) {
  const [varName, setVarName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  return (
    <div
      className="fixed z-50 bg-popover border border-border rounded-lg shadow-lg p-3 space-y-2 w-64"
      style={{ left: position.x, top: position.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Assign variable</p>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>
      <p className="text-xs bg-muted rounded px-2 py-1 truncate font-mono">"{selectedText}"</p>
      <div className="flex gap-1.5">
        <Input
          ref={inputRef}
          placeholder="e.g., city"
          value={varName}
          onChange={(e) => setVarName(e.target.value)}
          className="h-7 text-xs font-mono flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter" && varName.trim()) onAssign(varName.trim().toLowerCase().replace(/\s+/g, "_"));
            if (e.key === "Escape") onClose();
          }}
        />
        <Button
          size="sm"
          className="h-7 text-xs px-2"
          onClick={() => { if (varName.trim()) onAssign(varName.trim().toLowerCase().replace(/\s+/g, "_")); }}
          disabled={!varName.trim()}
        >
          <Tag className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export default function WebsiteDiscoveryPage() {
  const [url, setUrl] = useState("");
  const [selectedWebsite, setSelectedWebsite] = useState("");
  const [pages, setPages] = useState<DiscoveredPage[]>([]);
  const [patterns, setPatterns] = useState<DetectedPattern[]>([]);
  const [urlGroups, setUrlGroups] = useState<UrlGroup[]>([]);
  const [crawlStats, setCrawlStats] = useState<CrawlStats | null>(null);
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "groups">("list");

  // Scan settings
  const [maxPages, setMaxPages] = useState(50);
  const [maxDepth, setMaxDepth] = useState(3);
  const [showSettings, setShowSettings] = useState(false);

  // Progress
  const [scanProgress, setScanProgress] = useState(0);
  const [scanPhase, setScanPhase] = useState("");
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Template conversion state
  const [convertingPage, setConvertingPage] = useState<DiscoveredPage | null>(null);
  const [visualMappings, setVisualMappings] = useState<VisualMapping[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [selectionPopover, setSelectionPopover] = useState<{ position: { x: number; y: number }; text: string } | null>(null);

  // URL group template creation
  const [pickGroupDialog, setPickGroupDialog] = useState<UrlGroup | null>(null);
  // Comparison view
  const [compareGroup, setCompareGroup] = useState<UrlGroup | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  // Simulated progress animation
  const startProgress = useCallback(() => {
    setScanProgress(0);
    setScanPhase("Connecting to website...");
    let progress = 0;
    const phases = [
      { at: 5, text: "Fetching homepage..." },
      { at: 15, text: "Discovering internal links..." },
      { at: 25, text: "Crawling pages..." },
      { at: 50, text: "Scanning content..." },
      { at: 70, text: "Classifying page types..." },
      { at: 85, text: "Detecting URL patterns..." },
      { at: 95, text: "Finalizing results..." },
    ];

    scanIntervalRef.current = setInterval(() => {
      progress += Math.random() * 3 + 0.5;
      if (progress > 95) progress = 95;
      setScanProgress(progress);
      const phase = [...phases].reverse().find(p => progress >= p.at);
      if (phase) setScanPhase(phase.text);
    }, 300);
  }, []);

  const stopProgress = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setScanProgress(100);
    setTimeout(() => setScanProgress(0), 1000);
  }, []);

  // Fetch connected websites
  const { data: websites = [] } = useQuery({
    queryKey: ["discovery-websites", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("websites")
        .select("id, name, url, type, status")
        .eq("workspace_id", wsId!)
        .eq("status", "connected")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
  // Crawl public URL
  const crawlUrlMutation = useMutation({
    mutationFn: async (crawlUrl: string) => {
      startProgress();
      const { data, error } = await supabase.functions.invoke("discover-templates", {
        body: { url: crawlUrl, max_pages: maxPages, max_depth: maxDepth },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { pages: DiscoveredPage[]; urlGroups: UrlGroup[]; stats: CrawlStats };
    },
    onSuccess: (data) => {
      stopProgress();
      setPages(data.pages);
      setUrlGroups(data.urlGroups || []);
      setCrawlStats(data.stats || null);
      setPatterns([]);
      if (data.urlGroups?.length > 0) setViewMode("groups");
      toast({ title: "Scan complete", description: `Discovered ${data.pages.length} pages across ${data.urlGroups?.length || 0} URL patterns.` });
    },
    onError: (err: Error) => {
      stopProgress();
      toast({ title: "Scan failed", description: err.message, variant: "destructive" });
    },
  });

  // Crawl connected website
  const crawlConnectedMutation = useMutation({
    mutationFn: async (websiteId: string) => {
      startProgress();
      const { data, error } = await supabase.functions.invoke("discover-templates", {
        body: { action: "crawl-connected", website_id: websiteId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { pages: DiscoveredPage[]; urlGroups: UrlGroup[] };
    },
    onSuccess: (data) => {
      stopProgress();
      setPages(data.pages);
      setUrlGroups(data.urlGroups || []);
      setCrawlStats(null);
      setPatterns([]);
      if (data.urlGroups?.length > 0) setViewMode("groups");
      toast({ title: "Scan complete", description: `Discovered ${data.pages.length} pages across ${data.urlGroups?.length || 0} URL patterns.` });
    },
    onError: (err: Error) => {
      stopProgress();
      toast({ title: "Scan failed", description: err.message, variant: "destructive" });
    },
  });

  // Analyze patterns
  const analyzePatternsMutation = useMutation({
    mutationFn: async (discoveredPages: DiscoveredPage[]) => {
      const { data, error } = await supabase.functions.invoke("discover-templates", {
        body: {
          action: "analyze-patterns",
          pages: discoveredPages.map((p) => ({
            title: p.title,
            type: p.type,
            url: p.url,
            headings: p.headings,
            textSnippet: p.textSnippet,
          })),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.patterns as DetectedPattern[];
    },
    onSuccess: (data) => {
      setPatterns(data);
      toast({ title: "Patterns detected", description: `Found ${data.length} template patterns.` });
    },
    onError: (err: Error) => {
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
    },
  });

  // Save template
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      if (!convertingPage) throw new Error("No page selected");

      let templateContent = convertingPage.bodyHtml;
      for (const mapping of visualMappings) {
        const escaped = mapping.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        templateContent = templateContent.replace(new RegExp(escaped, "gi"), `{${mapping.variable}}`);
      }

      const variables = [...new Set(visualMappings.map((m) => `{${m.variable}}`))];

      const { error } = await supabase.from("templates").insert({
        name: templateName,
        content: templateContent,
        variables,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast({ title: "Template saved", description: `"${templateName}" is ready for campaigns.` });
      setSaveDialogOpen(false);
      setConvertingPage(null);
      setVisualMappings([]);
      setTemplateName("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Visual editor HTML
  const getVisualEditorHtml = useCallback(() => {
    if (!convertingPage) return "";
    let content = convertingPage.bodyHtml;
    for (const mapping of visualMappings) {
      const escaped = mapping.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      content = content.replace(
        new RegExp(escaped, "gi"),
        `<span data-var="${mapping.variable}" style="background:hsl(221 83% 53% / 0.15);color:hsl(221 83% 53%);padding:1px 4px;border-radius:4px;font-weight:600;" title="{${mapping.variable}}">{${mapping.variable}}</span>`
      );
    }
    return `<!DOCTYPE html><html><head><style>
      body { font-family: system-ui, sans-serif; padding: 16px; margin: 0; font-size: 14px; line-height: 1.6; color: #1a1a2e; }
      ::selection { background: hsl(221 83% 53% / 0.3); }
      * { max-width: 100%; box-sizing: border-box; } img { height: auto; }
    </style></head><body>${content}</body>
    <script>
      document.addEventListener('mouseup', function(e) {
        const sel = window.getSelection();
        const text = sel ? sel.toString().trim() : '';
        if (text && text.length > 0 && text.length < 200) {
          const range = sel.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          window.parent.postMessage({ type: 'text-selected', text, x: rect.left + rect.width / 2, y: rect.bottom + 8 }, '*');
        }
      });
    </script></html>`;
  }, [convertingPage, visualMappings]);

  // Listen for iframe messages
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "text-selected") {
        const iframe = iframeRef.current;
        if (!iframe) return;
        const r = iframe.getBoundingClientRect();
        setSelectionPopover({
          text: e.data.text,
          position: {
            x: Math.min(r.left + e.data.x, window.innerWidth - 280),
            y: Math.min(r.top + e.data.y, window.innerHeight - 120),
          },
        });
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const handleVisualAssign = useCallback(
    (varName: string) => {
      if (!selectionPopover) return;
      setVisualMappings((prev) => [
        ...prev,
        { id: `vm-${Date.now()}`, original: selectionPopover.text, variable: varName, value: selectionPopover.text },
      ]);
      setSelectionPopover(null);
      toast({ title: "Variable assigned", description: `"${selectionPopover.text}" → {${varName}}` });
    },
    [selectionPopover, toast]
  );

  // Auto-create template from URL group
  const handlePickRepresentativePage = useCallback(
    (page: DiscoveredPage, group: UrlGroup) => {
      setPickGroupDialog(null);

      // Extract the varying segment value from this page's URL
      try {
        const parsed = new URL(page.url);
        const segments = parsed.pathname.split("/").filter(Boolean);
        const slug = segments[segments.length - 1] || "";

        // Auto-map: find the slug text in the page content and pre-assign it as {slug}
        const initialMappings: VisualMapping[] = [];

        if (slug) {
          // Also try to find slug-like text in the title or headings
          const slugText = slug.replace(/-/g, " ");
          
          // Map the slug in the title if present
          if (page.title.toLowerCase().includes(slugText.toLowerCase())) {
            // Find the actual cased version in the title
            const idx = page.title.toLowerCase().indexOf(slugText.toLowerCase());
            const actualText = page.title.substring(idx, idx + slugText.length);
            initialMappings.push({
              id: `auto-slug-title-${Date.now()}`,
              original: actualText,
              variable: "slug",
              value: actualText,
            });
          }

          // Map the raw slug (hyphenated) in URLs/content
          if (page.bodyHtml.includes(slug)) {
            initialMappings.push({
              id: `auto-slug-url-${Date.now()}`,
              original: slug,
              variable: "slug",
              value: slug,
            });
          }
        }

        setConvertingPage(page);
        setVisualMappings(initialMappings);
        setTemplateName(`${group.pattern.replace(/\{slug\}/g, "").replace(/\//g, " ").trim()} Template`);

        toast({
          title: "Template started",
          description: initialMappings.length > 0
            ? `Auto-mapped ${initialMappings.length} occurrence(s) of the varying URL segment as {slug}. Select more text to add variables.`
            : "Select text in the preview to assign template variables.",
        });
      } catch {
        setConvertingPage(page);
        setVisualMappings([]);
        setTemplateName(page.title);
      }
    },
    [toast]
  );

  const isCrawling = crawlUrlMutation.isPending || crawlConnectedMutation.isPending;

  // Filter pages
  const filteredPages = pages.filter((p) => {
    if (filterType !== "all" && p.type !== filterType) return false;
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase()) && !p.url.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const pageTypes = [...new Set(pages.map((p) => p.type))];
  const uniqueVars = [...new Set(visualMappings.map((m) => m.variable))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-display flex items-center gap-2">
          <Compass className="h-6 w-6 text-primary" />
          Website Template Discovery
        </h1>
        <p className="text-muted-foreground mt-1">
          Scan a website to discover pages, detect URL patterns, and auto-suggest template structures.
        </p>
      </div>

      {/* Input */}
      <Card className="shadow-surface">
        <CardContent className="p-5">
          <Tabs defaultValue="url">
            <TabsList className="mb-4">
              <TabsTrigger value="url"><Globe className="mr-1.5 h-3.5 w-3.5" /> Public URL</TabsTrigger>
              <TabsTrigger value="connected"><FileText className="mr-1.5 h-3.5 w-3.5" /> Connected Site</TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="space-y-3">
              <Label className="text-sm font-medium">Website URL</Label>
              <p className="text-xs text-muted-foreground">Enter a website URL to crawl and discover pages (up to {maxPages} pages, depth {maxDepth}).</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="https://example.com" value={url} onChange={(e) => setUrl(e.target.value)} className="pl-9" />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => setShowSettings(!showSettings)}
                  title="Scan settings"
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
                <Button onClick={() => crawlUrlMutation.mutate(url)} disabled={!url.trim() || isCrawling} className="transition-all duration-150 hover:brightness-110 active:scale-[0.97]">
                  {isCrawling ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scanning...</> : <><Compass className="mr-2 h-4 w-4" /> Scan</>}
                </Button>
              </div>

              {/* Scan settings */}
              {showSettings && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4 space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Max pages to scan</Label>
                        <span className="text-xs font-mono text-muted-foreground">{maxPages}</span>
                      </div>
                      <Slider
                        value={[maxPages]}
                        onValueChange={([v]) => setMaxPages(v)}
                        min={10}
                        max={100}
                        step={10}
                        className="w-full"
                      />
                      <p className="text-[10px] text-muted-foreground">Higher values take longer but discover more pages.</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Crawl depth</Label>
                        <span className="text-xs font-mono text-muted-foreground">{maxDepth}</span>
                      </div>
                      <Slider
                        value={[maxDepth]}
                        onValueChange={([v]) => setMaxDepth(v)}
                        min={1}
                        max={5}
                        step={1}
                        className="w-full"
                      />
                      <p className="text-[10px] text-muted-foreground">Depth 1 = homepage links only. Higher = follows links from discovered pages.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="connected" className="space-y-3">
              <Label className="text-sm font-medium">Connected Website</Label>
              {websites.length === 0 ? (
                <p className="text-sm text-muted-foreground">No websites connected. Add one in the Websites section first.</p>
              ) : (
                <div className="flex gap-2">
                  <Select value={selectedWebsite} onValueChange={setSelectedWebsite}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Select a website" /></SelectTrigger>
                    <SelectContent>
                      {websites.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          <span className="flex items-center gap-2">
                            {w.name}
                            <Badge variant="outline" className="text-[10px] ml-1">{w.type}</Badge>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => crawlConnectedMutation.mutate(selectedWebsite)} disabled={!selectedWebsite || isCrawling}>
                    {isCrawling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Compass className="mr-2 h-4 w-4" />}
                    Scan
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Progress indicator */}
      {isCrawling && (
        <Card className="shadow-surface overflow-hidden">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm font-medium">Scanning website...</span>
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">{Math.round(scanProgress)}%</span>
            </div>
            <Progress value={scanProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">{scanPhase}</p>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>Max pages: {maxPages}</span>
              <span>Max depth: {maxDepth}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {pages.length > 0 && !isCrawling && !convertingPage && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="shadow-surface">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold tabular-nums">{pages.length}</p>
                <p className="text-xs text-muted-foreground">Pages Crawled</p>
              </CardContent>
            </Card>
            <Card className="shadow-surface">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold tabular-nums">{urlGroups.length}</p>
                <p className="text-xs text-muted-foreground">URL Patterns</p>
              </CardContent>
            </Card>
            {pageTypes.slice(0, 3).map((type) => (
              <Card key={type} className="shadow-surface">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold tabular-nums">{pages.filter((p) => p.type === type).length}</p>
                  <p className="text-xs text-muted-foreground capitalize">{type} Pages</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {crawlStats && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span>Discovered {crawlStats.total_discovered} URLs</span>
              <span>·</span>
              <span>Crawled {crawlStats.total_crawled} pages</span>
              <span>·</span>
              <span>Depth {crawlStats.max_depth}</span>
            </div>
          )}

          {/* URL Pattern Groups */}
          {urlGroups.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FolderTree className="h-5 w-5 text-primary" /> URL Pattern Groups
                </h2>
                <p className="text-xs text-muted-foreground">Pages grouped by URL structure</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {urlGroups.map((group, i) => (
                  <Card key={i} className="shadow-surface hover:shadow-surface-hover transition-shadow">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-primary shrink-0" />
                        <code className="text-xs font-mono text-primary bg-primary/5 px-2 py-1 rounded truncate">{group.pattern}</code>
                      </div>
                      <p className="text-sm font-medium">{group.pages.length} matching pages</p>
                      {/* Average SEO / SEA / GEO scores for this group */}
                      {(() => {
                        const groupPages = pages.filter(p => group.pages.includes(p.url));
                        if (groupPages.length === 0) return null;
                        const avg = computeAverageScores(
                          groupPages.map(p => ({ title: p.title, content: p.bodyHtml || p.textSnippet, slug: p.url, url: p.url }))
                        );
                        if (!avg) return null;
                        const toColor = (s: number) => s >= 85 ? "text-emerald-600" : s >= 60 ? "text-primary" : s >= 35 ? "text-amber-600" : "text-destructive";
                        const toLbl = (s: number) => s >= 85 ? "Excellent" : s >= 60 ? "Good" : s >= 35 ? "Fair" : "Poor";
                        return (
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] font-semibold text-muted-foreground">SEO</span>
                              <SeoScoreBadge score={avg.seo} label={toLbl(avg.seo)} color={toColor(avg.seo)} size="sm" />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] font-semibold text-muted-foreground">SEA</span>
                              <SeoScoreBadge score={avg.sea} label={toLbl(avg.sea)} color={toColor(avg.sea)} size="sm" />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] font-semibold text-muted-foreground">GEO</span>
                              <SeoScoreBadge score={avg.geo} label={toLbl(avg.geo)} color={toColor(avg.geo)} size="sm" />
                            </div>
                          </div>
                        );
                      })()}
                      <ScrollArea className="max-h-24">
                        <div className="space-y-0.5 text-xs text-muted-foreground">
                          {group.pages.slice(0, 5).map((url, j) => {
                            try {
                              return <p key={j} className="truncate">• {new URL(url).pathname}</p>;
                            } catch {
                              return <p key={j} className="truncate">• {url}</p>;
                            }
                          })}
                          {group.pages.length > 5 && (
                            <p className="text-primary font-medium">+ {group.pages.length - 5} more</p>
                          )}
                        </div>
                      </ScrollArea>
                      <div className="flex gap-2 mt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => setCompareGroup(group)}
                          disabled={group.pages.length < 2}
                        >
                          <ArrowLeftRight className="mr-1.5 h-3.5 w-3.5" /> Compare
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => setPickGroupDialog(group)}
                        >
                          <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Template
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Detect patterns button */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Button
              onClick={() => analyzePatternsMutation.mutate(pages)}
              disabled={analyzePatternsMutation.isPending}
              className="transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
            >
              {analyzePatternsMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing patterns...</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" /> AI: Detect Template Patterns</>
              )}
            </Button>
          </div>

          {/* Detected Patterns */}
          {patterns.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> AI-Detected Patterns
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {patterns.map((pattern, i) => (
                  <Card key={i} className="shadow-surface hover:shadow-surface-hover transition-shadow">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-sm">{pattern.name}</h3>
                        <Badge variant={pattern.confidence === "high" ? "default" : "secondary"} className="text-[10px]">
                          {pattern.confidence}
                        </Badge>
                      </div>
                      <p className="font-mono text-xs bg-muted rounded-md px-3 py-2">{pattern.template}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {pattern.variables.map((v) => (
                          <Badge key={v} variant="outline" className="font-mono text-xs text-primary border-primary">
                            {`{${v}}`}
                          </Badge>
                        ))}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Matching pages ({pattern.matchingPages.length}):
                        </p>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          {pattern.matchingPages.slice(0, 3).map((t, j) => (
                            <p key={j} className="truncate">• {t}</p>
                          ))}
                          {pattern.matchingPages.length > 3 && (
                            <p className="text-primary">+ {pattern.matchingPages.length - 3} more</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Filter bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search pages..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <Button size="sm" variant={filterType === "all" ? "secondary" : "ghost"} className="h-8 text-xs" onClick={() => setFilterType("all")}>
                All ({pages.length})
              </Button>
              {pageTypes.map((type) => (
                <Button key={type} size="sm" variant={filterType === type ? "secondary" : "ghost"} className="h-8 text-xs capitalize" onClick={() => setFilterType(type)}>
                  {type} ({pages.filter((p) => p.type === type).length})
                </Button>
              ))}
            </div>
          </div>

          {/* Pages list */}
          <div className="space-y-2">
            {filteredPages.map((page, i) => (
              <Card key={i} className="shadow-surface hover:shadow-surface-hover transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-sm truncate">{page.title}</h3>
                        <Badge className={`text-[10px] capitalize ${typeColors[page.type] || typeColors.page}`}>{page.type}</Badge>
                      </div>
                      <a href={page.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary truncate block">
                        {page.url} <ExternalLink className="inline h-3 w-3 ml-0.5" />
                      </a>
                      {page.headings.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {page.headings.slice(0, 3).map((h, j) => (
                            <Badge key={j} variant="outline" className="text-[10px] font-normal">
                              {`<${h.tag}>`} {h.text.slice(0, 40)}{h.text.length > 40 ? "…" : ""}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {page.textSnippet && (
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{page.textSnippet}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => {
                        setConvertingPage(page);
                        setVisualMappings([]);
                        setTemplateName(page.title);
                      }}
                    >
                      <MousePointer className="mr-1.5 h-3.5 w-3.5" /> Convert
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Template Conversion View */}
      {convertingPage && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-semibold">Convert to Template</h2>
              <p className="text-xs text-muted-foreground">{convertingPage.title}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setConvertingPage(null); setVisualMappings([]); }}>
                <ArrowRight className="mr-1.5 h-3.5 w-3.5 rotate-180" /> Back
              </Button>
              <Button
                size="sm"
                onClick={() => setSaveDialogOpen(true)}
                disabled={visualMappings.length === 0}
                className="transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
              >
                <Save className="mr-1.5 h-3.5 w-3.5" /> Save Template
              </Button>
            </div>
          </div>

          {uniqueVars.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-muted-foreground">Variables:</span>
              {uniqueVars.map((v) => (
                <Badge key={v} className="bg-primary/10 text-primary font-mono text-xs">{`{${v}}`}</Badge>
              ))}
            </div>
          )}

          {/* Visual editor */}
          <Card className="shadow-surface overflow-hidden">
            <div className="bg-muted/50 border-b border-border px-4 py-2 flex items-center gap-2">
              <MousePointer className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Select text</span> to assign as a variable. Mapped values are highlighted.
              </p>
            </div>
            <iframe
              ref={iframeRef}
              srcDoc={getVisualEditorHtml()}
              className="w-full border-0"
              style={{ height: "500px" }}
              sandbox="allow-scripts allow-same-origin"
              title="Visual template editor"
            />
          </Card>

          {/* Mapped variables */}
          {visualMappings.length > 0 && (
            <Card className="shadow-surface">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3">Mapped Variables</h3>
                <div className="space-y-2">
                  {visualMappings.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="font-mono border-primary text-primary shrink-0">{`{${m.variable}}`}</Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground truncate">"{m.value}"</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive shrink-0 ml-auto"
                        onClick={() => setVisualMappings((prev) => prev.filter((x) => x.id !== m.id))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Save Dialog */}
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Save Template</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="disc-tpl-name">Template Name</Label>
                  <Input id="disc-tpl-name" placeholder="e.g., Service Location Page" value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Source: {convertingPage.url}</p>
                  <p className="text-sm text-muted-foreground mb-2">{visualMappings.length} variables:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {uniqueVars.map((v) => <Badge key={v} variant="outline" className="font-mono text-xs">{`{${v}}`}</Badge>)}
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
                  <Button onClick={() => saveMutation.mutate()} disabled={!templateName || saveMutation.isPending}>
                    {saveMutation.isPending ? "Saving..." : "Save Template"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Empty state */}
      {pages.length === 0 && !isCrawling && !convertingPage && (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <Compass className="mx-auto h-10 w-10 mb-3 opacity-50" />
            <p className="font-medium">Enter a URL or select a connected website to scan</p>
            <p className="text-sm mt-1">The system will crawl up to 100 pages, group them by URL structure, and detect template patterns automatically.</p>
          </CardContent>
        </Card>
      )}

      {/* Selection Popover */}
      {selectionPopover && (
        <SelectionPopover
          position={selectionPopover.position}
          selectedText={selectionPopover.text}
          onAssign={handleVisualAssign}
          onClose={() => setSelectionPopover(null)}
        />
      )}

      {/* Pick Representative Page Dialog */}
      {pickGroupDialog && (
        <Dialog open={!!pickGroupDialog} onOpenChange={(open) => !open && setPickGroupDialog(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Choose a Representative Page</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary shrink-0" />
                <code className="text-xs font-mono text-primary bg-primary/5 px-2 py-1 rounded">{pickGroupDialog.pattern}</code>
              </div>
              <p className="text-sm text-muted-foreground">
                Select one page to use as the template base. The varying URL segment will be auto-mapped as <code className="font-mono text-primary">{"{slug}"}</code>.
              </p>
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-1">
                  {pickGroupDialog.pages.map((pageUrl, i) => {
                    const matchedPage = pages.find((p) => p.url === pageUrl);
                    if (!matchedPage) return null;
                    let pathname = pageUrl;
                    try { pathname = new URL(pageUrl).pathname; } catch {}
                    return (
                      <button
                        key={i}
                        className="w-full text-left rounded-lg border border-border px-3 py-2.5 hover:bg-accent hover:border-primary/30 transition-colors"
                        onClick={() => handlePickRepresentativePage(matchedPage, pickGroupDialog)}
                      >
                        <p className="text-sm font-medium truncate">{matchedPage.title}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{pathname}</p>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Page Comparison Dialog */}
      {compareGroup && (
        <PageComparisonDialog
          open={!!compareGroup}
          onOpenChange={(open) => !open && setCompareGroup(null)}
          group={compareGroup}
          allPages={pages}
        />
      )}
    </div>
  );
}
