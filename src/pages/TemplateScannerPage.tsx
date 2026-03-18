import { useState, useCallback, useRef, useEffect, useMemo } from "react";
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
import {
  ScanSearch,
  Globe,
  Sparkles,
  Check,
  X,
  Pencil,
  Save,
  ArrowRight,
  Loader2,
  Tag,
  Eye,
  FileText,
  MousePointer,
  List,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { calculateContentSeoScore, calculateContentSeaScore, calculateContentGeoScore } from "@/lib/content-seo-score";
import { SeoScoreBadge } from "@/components/SeoScoreBadge";

interface ContentBlock {
  id: string;
  tag: string;
  text: string;
  html: string;
}

interface VariableSuggestion {
  blockId: string;
  original: string;
  variable: string;
  value: string;
}

interface VariableMapping {
  blockId: string;
  original: string;
  variable: string;
  value: string;
  accepted: boolean;
}

interface WpPage {
  id: number;
  title: string;
  slug: string;
  link: string;
}

// Popover for assigning variable to selected text
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
            if (e.key === "Enter" && varName.trim()) {
              onAssign(varName.trim().toLowerCase().replace(/\s+/g, "_"));
            }
            if (e.key === "Escape") onClose();
          }}
        />
        <Button
          size="sm"
          className="h-7 text-xs px-2"
          onClick={() => {
            if (varName.trim()) {
              onAssign(varName.trim().toLowerCase().replace(/\s+/g, "_"));
            }
          }}
          disabled={!varName.trim()}
        >
          <Tag className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export default function TemplateScannerPage() {
  const [url, setUrl] = useState("");
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [bodyHtml, setBodyHtml] = useState("");
  const [mappings, setMappings] = useState<VariableMapping[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [editingVar, setEditingVar] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [manualVarName, setManualVarName] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedWebsite, setSelectedWebsite] = useState("");
  const [wpPages, setWpPages] = useState<WpPage[]>([]);
  const [viewMode, setViewMode] = useState<"visual" | "blocks">("visual");
  const [selectionPopover, setSelectionPopover] = useState<{
    position: { x: number; y: number };
    text: string;
  } | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  // Fetch all connected websites (not just WordPress)
  const { data: connectedWebsites = [] } = useQuery({
    queryKey: ["scanner-websites", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("websites")
        .select("id, name, url, type")
        .eq("workspace_id", wsId!)
        .eq("status", "connected")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Filter WordPress sites for the WP pages tab
  const wpWebsites = useMemo(() => connectedWebsites.filter(w => w.type === "wordpress" || w.type === "woocommerce"), [connectedWebsites]);

  // Fetch WP pages for selected website
  const wpPagesMutation = useMutation({
    mutationFn: async (websiteId: string) => {
      const { data, error } = await supabase.functions.invoke("scan-template", {
        body: { action: "list-wp-pages", website_id: websiteId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.pages as WpPage[];
    },
    onSuccess: (pages) => {
      setWpPages(pages);
      toast({ title: "Pages loaded", description: `Found ${pages.length} WordPress pages.` });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to load pages", description: err.message, variant: "destructive" });
    },
  });

  // Scan URL mutation
  const scanMutation = useMutation({
    mutationFn: async (scanUrl: string) => {
      const { data, error } = await supabase.functions.invoke("scan-template", {
        body: { url: scanUrl },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as {
        success: boolean;
        url: string;
        bodyHtml: string;
        blocks: ContentBlock[];
        suggestions: VariableSuggestion[];
      };
    },
    onSuccess: (data) => {
      setBlocks(data.blocks);
      setBodyHtml(data.bodyHtml);
      const initialMappings = data.suggestions.map((s) => ({
        ...s,
        accepted: true,
      }));
      setMappings(initialMappings);
      toast({
        title: "Page scanned",
        description: `Found ${data.blocks.length} content blocks and ${data.suggestions.length} variable suggestions.`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Scan failed", description: err.message, variant: "destructive" });
    },
  });

  // Save template mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const acceptedMappings = mappings.filter((m) => m.accepted);
      let templateContent = bodyHtml;

      for (const mapping of acceptedMappings) {
        const escapedValue = mapping.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escapedValue, "gi");
        templateContent = templateContent.replace(regex, `{${mapping.variable}}`);
      }

      const variables = [...new Set(acceptedMappings.map((m) => `{${m.variable}}`))];

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
      toast({ title: "Template saved", description: `"${templateName}" is ready to use in campaigns.` });
      setSaveDialogOpen(false);
      setUrl("");
      setBlocks([]);
      setBodyHtml("");
      setMappings([]);
      setTemplateName("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const toggleMapping = useCallback((blockId: string, variable: string) => {
    setMappings((prev) =>
      prev.map((m) =>
        m.blockId === blockId && m.variable === variable ? { ...m, accepted: !m.accepted } : m
      )
    );
  }, []);

  const renameVariable = useCallback((blockId: string, oldVar: string, newVar: string) => {
    setMappings((prev) =>
      prev.map((m) =>
        m.blockId === blockId && m.variable === oldVar ? { ...m, variable: newVar } : m
      )
    );
    setEditingVar(null);
  }, []);

  const addManualMapping = useCallback(
    (block: ContentBlock) => {
      if (!manualVarName.trim()) return;
      const value = block.text;
      setMappings((prev) => [
        ...prev,
        {
          blockId: block.id,
          original: value,
          variable: manualVarName.trim().toLowerCase().replace(/\s+/g, "_"),
          value,
          accepted: true,
        },
      ]);
      setManualVarName("");
      setSelectedBlockId(null);
    },
    [manualVarName]
  );

  const removeMapping = useCallback((blockId: string, variable: string) => {
    setMappings((prev) => prev.filter((m) => !(m.blockId === blockId && m.variable === variable)));
  }, []);

  const acceptedMappings = mappings.filter((m) => m.accepted);
  const uniqueVars = [...new Set(acceptedMappings.map((m) => m.variable))];

  // Build visual editor HTML with highlights and selection handling
  const getVisualEditorHtml = useCallback(() => {
    let content = bodyHtml;

    // Highlight already-mapped values
    for (const mapping of acceptedMappings) {
      const escapedValue = mapping.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escapedValue, "gi");
      content = content.replace(
        regex,
        `<span data-var="${mapping.variable}" style="background:hsl(221 83% 53% / 0.15);color:hsl(221 83% 53%);padding:1px 4px;border-radius:4px;font-weight:600;cursor:pointer;" title="Variable: {${mapping.variable}}">{${mapping.variable}}</span>`
      );
    }

    return `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: system-ui, sans-serif; padding: 16px; margin: 0; font-size: 14px; line-height: 1.6; color: #1a1a2e; }
  ::selection { background: hsl(221 83% 53% / 0.3); }
  * { max-width: 100%; box-sizing: border-box; }
  img { height: auto; }
  [data-var]:hover { outline: 2px solid hsl(221 83% 53%); outline-offset: 2px; border-radius: 4px; }
</style>
</head>
<body>${content}</body>
<script>
  document.addEventListener('mouseup', function(e) {
    const sel = window.getSelection();
    const text = sel ? sel.toString().trim() : '';
    if (text && text.length > 0 && text.length < 200) {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      window.parent.postMessage({
        type: 'text-selected',
        text: text,
        x: rect.left + rect.width / 2,
        y: rect.bottom + 8,
      }, '*');
    }
  });
  document.addEventListener('mousedown', function() {
    window.parent.postMessage({ type: 'selection-cleared' }, '*');
  });
</script>
</html>`;
  }, [bodyHtml, acceptedMappings]);

  // Listen for messages from the iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "text-selected") {
        const iframe = iframeRef.current;
        if (!iframe) return;
        const iframeRect = iframe.getBoundingClientRect();
        setSelectionPopover({
          text: e.data.text,
          position: {
            x: Math.min(iframeRect.left + e.data.x, window.innerWidth - 280),
            y: Math.min(iframeRect.top + e.data.y, window.innerHeight - 120),
          },
        });
      }
      if (e.data?.type === "selection-cleared") {
        // Don't clear if popover is open (user might be typing)
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Add mapping from visual selection
  const handleVisualAssign = useCallback(
    (varName: string) => {
      if (!selectionPopover) return;
      const id = `visual-${Date.now()}`;
      setMappings((prev) => [
        ...prev,
        {
          blockId: id,
          original: selectionPopover.text,
          variable: varName,
          value: selectionPopover.text,
          accepted: true,
        },
      ]);
      setSelectionPopover(null);
      toast({
        title: "Variable assigned",
        description: `"${selectionPopover.text}" → {${varName}}`,
      });
    },
    [selectionPopover, toast]
  );

  const getPreviewContent = () => {
    let content = bodyHtml;
    for (const mapping of acceptedMappings) {
      const escapedValue = mapping.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escapedValue, "gi");
      content = content.replace(
        regex,
        `<mark class="bg-primary/20 text-primary px-1 rounded font-semibold">{${mapping.variable}}</mark>`
      );
    }
    return content;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-display flex items-center gap-2">
          <ScanSearch className="h-6 w-6 text-primary" />
          AI Template Scanner
        </h1>
        <p className="text-muted-foreground mt-1">
          Import any webpage and convert it into a reusable template with dynamic variables.
        </p>
      </div>

      {/* Input Section */}
      <Card className="shadow-surface">
        <CardContent className="p-5">
          <Tabs defaultValue="url">
            <TabsList className="mb-4">
              <TabsTrigger value="url">
                <Globe className="mr-1.5 h-3.5 w-3.5" /> Public URL
              </TabsTrigger>
              <TabsTrigger value="connected">
                <FileText className="mr-1.5 h-3.5 w-3.5" /> Connected Site
              </TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="space-y-2">
              <Label htmlFor="scan-url" className="text-sm font-medium">Webpage URL</Label>
              <p className="text-xs text-muted-foreground">
                Enter any public URL to scan and convert into a template.
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="scan-url"
                    placeholder="https://example.com/page"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button
                  onClick={() => scanMutation.mutate(url)}
                  disabled={!url.trim() || scanMutation.isPending}
                  className="transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
                >
                  {scanMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scanning...</>
                  ) : (
                    <><ScanSearch className="mr-2 h-4 w-4" /> Scan Page</>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="connected" className="space-y-3">
              <Label className="text-sm font-medium">Connected Website</Label>
              {connectedWebsites.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No websites connected. Add one in the Websites section first.
                </p>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Select
                      value={selectedWebsite}
                      onValueChange={(val) => {
                        setSelectedWebsite(val);
                        setWpPages([]);
                        wpPagesMutation.mutate(val);
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select a connected site" />
                      </SelectTrigger>
                      <SelectContent>
                        {connectedWebsites.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            <span className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[9px] px-1 py-0 capitalize">{w.type}</Badge>
                              {w.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {wpPagesMutation.isPending && (
                    <div className="space-y-2">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  )}
                  {wpPages.length > 0 && (
                    <div className="space-y-1.5 max-h-60 overflow-y-auto border border-border rounded-lg p-2">
                      {wpPages.map((page) => (
                        <button
                          key={page.id}
                          className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-accent/50 transition-colors text-left"
                          onClick={() => {
                            setUrl(page.link);
                            scanMutation.mutate(page.link);
                          }}
                          disabled={scanMutation.isPending}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{page.title}</p>
                            <p className="text-xs text-muted-foreground truncate">/{page.slug}</p>
                          </div>
                          <ScanSearch className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                        </button>
                      ))}
                    </div>
                  )}
                  {wpPagesMutation.isSuccess && wpPages.length === 0 && (
                    <p className="text-sm text-muted-foreground">No published pages found on this site.</p>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Loading state */}
      {scanMutation.isPending && (
        <div className="space-y-4">
          <Card><CardContent className="p-5 space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-20 w-full" />
          </CardContent></Card>
        </div>
      )}

      {/* Results */}
      {blocks.length > 0 && !scanMutation.isPending && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="shadow-surface">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Tag className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">{blocks.length}</p>
                  <p className="text-xs text-muted-foreground">Content Blocks</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-surface">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">{mappings.length}</p>
                  <p className="text-xs text-muted-foreground">AI Suggestions</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-surface">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent/50 flex items-center justify-center">
                  <Check className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">{uniqueVars.length}</p>
                  <p className="text-xs text-muted-foreground">Unique Variables</p>
                </div>
              </CardContent>
            </Card>
            {/* SEO Score card */}
            {(() => {
              const pageTitle = blocks.find(b => b.tag.startsWith("h"))?.text || "";
              const seoResult = calculateContentSeoScore(pageTitle, bodyHtml, url);
              return (
                <Card className="shadow-surface">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      seoResult.score >= 60 ? "bg-emerald-500/10" : seoResult.score >= 35 ? "bg-amber-500/10" : "bg-destructive/10"
                    }`}>
                      <span className={`text-lg font-bold tabular-nums ${seoResult.color}`}>{seoResult.score}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{seoResult.label}</p>
                      <p className="text-xs text-muted-foreground">SEO Score</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </div>

          {/* Variables chips */}
          {uniqueVars.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-muted-foreground">Variables:</span>
              {uniqueVars.map((v) => (
                <Badge key={v} className="bg-primary/10 text-primary font-mono text-xs">
                  {`{${v}}`}
                </Badge>
              ))}
            </div>
          )}

          {/* View mode tabs + actions */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === "visual" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setViewMode("visual")}
              >
                <MousePointer className="mr-1.5 h-3.5 w-3.5" /> Visual Editor
              </Button>
              <Button
                variant={viewMode === "blocks" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setViewMode("blocks")}
              >
                <List className="mr-1.5 h-3.5 w-3.5" /> Block List
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
                <Eye className="mr-1.5 h-3.5 w-3.5" /> Preview
              </Button>
              <Button
                size="sm"
                onClick={() => setSaveDialogOpen(true)}
                disabled={acceptedMappings.length === 0}
                className="transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
              >
                <Save className="mr-1.5 h-3.5 w-3.5" /> Save as Template
              </Button>
            </div>
          </div>

          {/* Visual Editor Mode */}
          {viewMode === "visual" && (
            <div className="space-y-4">
              <Card className="shadow-surface overflow-hidden">
                <div className="bg-muted/50 border-b border-border px-4 py-2 flex items-center gap-2">
                  <MousePointer className="h-3.5 w-3.5 text-primary" />
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Select text</span> in the preview below to assign it as a variable.
                    Already-mapped values are highlighted in blue.
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

              {/* Mapped variables list */}
              {acceptedMappings.length > 0 && (
                <Card className="shadow-surface">
                  <CardContent className="p-4">
                    <h3 className="text-sm font-semibold mb-3">Mapped Variables</h3>
                    <div className="space-y-2">
                      {acceptedMappings.map((mapping, i) => (
                        <div
                          key={`${mapping.variable}-${i}`}
                          className="flex items-center gap-2 text-xs"
                        >
                          <Badge variant="outline" className="font-mono border-primary text-primary shrink-0">
                            {`{${mapping.variable}}`}
                          </Badge>
                          <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground truncate">
                            "{mapping.value}"
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive shrink-0 ml-auto"
                            onClick={() => removeMapping(mapping.blockId, mapping.variable)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Block List Mode */}
          {viewMode === "blocks" && (
            <div className="space-y-3">
              {blocks.slice(0, 50).map((block) => {
                const blockMappings = mappings.filter((m) => m.blockId === block.id);
                const isSelected = selectedBlockId === block.id;

                return (
                  <Card
                    key={block.id}
                    className={`shadow-surface transition-all duration-150 cursor-pointer ${
                      isSelected ? "ring-2 ring-primary" : "hover:shadow-surface-hover"
                    }`}
                    onClick={() => setSelectedBlockId(isSelected ? null : block.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs font-mono shrink-0">
                              {`<${block.tag}>`}
                            </Badge>
                            {blockMappings.length > 0 && (
                              <Badge variant="secondary" className="text-xs bg-success/10 text-success">
                                {blockMappings.filter((m) => m.accepted).length} variable
                                {blockMappings.filter((m) => m.accepted).length !== 1 ? "s" : ""}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm leading-relaxed break-words">{block.text}</p>
                        </div>
                      </div>

                      {blockMappings.length > 0 && (
                        <div className="mt-3 space-y-2 border-t border-border pt-3">
                          {blockMappings.map((mapping) => (
                            <div
                              key={`${mapping.blockId}-${mapping.variable}`}
                              className="flex items-center gap-2 text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-6 w-6 shrink-0 ${
                                  mapping.accepted ? "text-success hover:text-success" : "text-muted-foreground"
                                }`}
                                onClick={() => toggleMapping(mapping.blockId, mapping.variable)}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <span className="text-muted-foreground truncate max-w-[120px]">
                                "{mapping.value}"
                              </span>
                              <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                              {editingVar === `${mapping.blockId}-${mapping.variable}` ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className="h-6 text-xs w-28 font-mono"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") renameVariable(mapping.blockId, mapping.variable, editValue);
                                      if (e.key === "Escape") setEditingVar(null);
                                    }}
                                  />
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => renameVariable(mapping.blockId, mapping.variable, editValue)}>
                                    <Check className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className={`font-mono cursor-pointer ${mapping.accepted ? "border-primary text-primary" : "opacity-50"}`}
                                  onClick={() => {
                                    setEditingVar(`${mapping.blockId}-${mapping.variable}`);
                                    setEditValue(mapping.variable);
                                  }}
                                >
                                  {`{${mapping.variable}}`}
                                  <Pencil className="ml-1 h-2.5 w-2.5" />
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive shrink-0 ml-auto"
                                onClick={() => removeMapping(mapping.blockId, mapping.variable)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {isSelected && (
                        <div className="mt-3 border-t border-border pt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Input
                            placeholder="Variable name (e.g., city)"
                            value={manualVarName}
                            onChange={(e) => setManualVarName(e.target.value)}
                            className="h-8 text-xs font-mono flex-1"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") addManualMapping(block);
                            }}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => addManualMapping(block)}
                            disabled={!manualVarName.trim()}
                          >
                            <Tag className="mr-1 h-3 w-3" /> Assign
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Template Preview Dialog */}
          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Template Preview</DialogTitle>
              </DialogHeader>
              <div
                className="prose prose-sm max-w-none dark:prose-invert mt-4"
                dangerouslySetInnerHTML={{ __html: getPreviewContent() }}
              />
            </DialogContent>
          </Dialog>

          {/* Save Dialog */}
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Save Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="tpl-name">Template Name</Label>
                  <Input
                    id="tpl-name"
                    placeholder="e.g., Course Landing Page"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                  />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {acceptedMappings.length} variables will be applied:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {uniqueVars.map((v) => (
                      <Badge key={v} variant="outline" className="font-mono text-xs">
                        {`{${v}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
                  <Button
                    onClick={() => saveMutation.mutate()}
                    disabled={!templateName || saveMutation.isPending}
                  >
                    {saveMutation.isPending ? "Saving..." : "Save Template"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* Empty state */}
      {blocks.length === 0 && !scanMutation.isPending && (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <ScanSearch className="mx-auto h-10 w-10 mb-3 opacity-50" />
            <p className="font-medium">Enter a URL above to scan a webpage</p>
            <p className="text-sm mt-1">
              The AI will analyze the page structure and suggest dynamic variables automatically.
            </p>
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
    </div>
  );
}
