import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { friendlyError } from "@/lib/friendly-errors";
import { useSubscription } from "@/hooks/use-subscription";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, Copy, Trash2, Sparkles, Loader2, Code, Eye, LayoutPanelTop, Pencil, Search as SearchIcon, Globe, Braces, Download, Upload, GripVertical, RotateCcw, FileSpreadsheet, Link2, History, Wand2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { TemplatePreview } from "@/components/templates/TemplatePreview";
import { calculateContentSeoScore, calculateContentSeaScore, calculateContentGeoScore } from "@/lib/content-seo-score";
import { SeoScoreBadge } from "@/components/SeoScoreBadge";
import {
  TemplateVisualEditor,
  blocksToHtml,
  htmlToBlocks,
  type TemplateBlock,
} from "@/components/templates/TemplateVisualEditor";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useDragReorder } from "@/hooks/use-drag-reorder";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TemplateVersionHistory, saveVersion, type TemplateVersion } from "@/components/templates/TemplateVersionHistory";

type Template = Tables<"templates">;

export default function TemplatesPage() {
  const [open, setOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [blocks, setBlocks] = useState<TemplateBlock[]>([]);
  const [activeEditorTab, setActiveEditorTab] = useState<string>("visual");
  const [aiPrompt, setAiPrompt] = useState("");
  
  const [editingTemplate, setEditingTemplate] = useState<Tables<"templates"> | null>(null);
  // SEO state
  const [seoTitlePattern, setSeoTitlePattern] = useState("");
  const [seoDescriptionPattern, setSeoDescriptionPattern] = useState("");
  // Schema state
  const [schemaType, setSchemaType] = useState("WebPage");
  const [schemaConfig, setSchemaConfig] = useState<Record<string, string>>({});
  // CSV template state
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [csvTemplateText, setCsvTemplateText] = useState("");
  const [csvTemplateName, setCsvTemplateName] = useState("");
  // Connected site template state
  const [siteDialogOpen, setSiteDialogOpen] = useState(false);
  const [siteTemplateWebsite, setSiteTemplateWebsite] = useState("");
  const [sitePages, setSitePages] = useState<{ id: string; title: string; slug: string; link: string }[]>([]);
  const [siteLoadingPages, setSiteLoadingPages] = useState(false);
  // AI Content Generator state
  const [aiContentOpen, setAiContentOpen] = useState(false);
  const [aiKeywords, setAiKeywords] = useState("");
  const [aiContentType, setAiContentType] = useState<string>("seo");
  const [aiSeoGenerating, setAiSeoGenerating] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  const detectedVars = content.match(/\{[^}]+\}/g) || [];

  // Sync blocks → HTML when in visual mode
  const handleBlocksChange = useCallback((newBlocks: TemplateBlock[]) => {
    setBlocks(newBlocks);
    setContent(blocksToHtml(newBlocks));
  }, []);

  // Sync HTML → blocks when switching to visual tab
  const handleTabChange = useCallback((tab: string) => {
    if (tab === "visual" && activeEditorTab !== "visual") {
      setBlocks(htmlToBlocks(content));
    }
    setActiveEditorTab(tab);
  }, [activeEditorTab, content]);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["templates", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Template[];
    },
  });

  // Fetch connected websites for "From Site" flow
  const { data: connectedWebsites = [] } = useQuery({
    queryKey: ["tpl-websites", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("websites")
        .select("id, name, url, type, status")
        .eq("workspace_id", wsId!)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { features } = useSubscription();
  const maxTemplates = features.templates;

  const { ordered: orderedTemplates, getDragProps, hasCustomOrder, resetOrder } = useDragReorder(
    templates,
    `tpl-order-${wsId}`
  );

  // Create template from CSV headers
  const createFromCsv = async () => {
    if (!csvTemplateText.trim()) return;
    const lines = csvTemplateText.split("\n").filter(l => l.trim());
    if (lines.length === 0) { toast({ title: "Empty CSV", variant: "destructive" }); return; }
    const headers = lines[0].split(",").map(h => h.trim()).filter(Boolean);
    if (headers.length === 0) { toast({ title: "No headers found", variant: "destructive" }); return; }

    const varHtml = headers.map(h => {
      const varName = h.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
      return `<div class="mb-4">\n  <h3>${h}</h3>\n  <p>{${varName}}</p>\n</div>`;
    }).join("\n");

    const tplName = csvTemplateName || "CSV Template";
    const tplContent = `<div class="template">\n<h1>{${headers[0].toLowerCase().replace(/[^a-z0-9]+/g, "_")}}</h1>\n${varHtml}\n</div>`;

    setName(tplName);
    setContent(tplContent);
    setBlocks(htmlToBlocks(tplContent));
    setCsvDialogOpen(false);
    setCsvTemplateText("");
    setCsvTemplateName("");
    setOpen(true);
    toast({ title: `Template created with ${headers.length} variables from CSV headers` });
  };

  // Load pages from connected site
  const loadSitePages = async (websiteId: string) => {
    setSiteLoadingPages(true);
    setSitePages([]);
    try {
      const { data, error } = await supabase.functions.invoke("scan-template", {
        body: { action: "list-pages", website_id: websiteId },
      });
      if (error) throw error;
      if (data?.pages) setSitePages(data.pages);
      else if (data?.error) throw new Error(friendlyError(data.error));
    } catch (err: any) {
      toast({ title: "Failed to load pages", description: err.message, variant: "destructive" });
    } finally {
      setSiteLoadingPages(false);
    }
  };

  // Import site page as template
  const importSitePage = async (pageUrl: string, pageTitle: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("scan-template", {
        body: { url: pageUrl },
      });
      if (error) throw error;
      if (data?.bodyHtml) {
        setName(pageTitle || "Site Page Template");
        setContent(data.bodyHtml);
        setBlocks(htmlToBlocks(data.bodyHtml));
        setSiteDialogOpen(false);
        setSitePages([]);
        setOpen(true);
        toast({ title: "Page imported as template", description: "Edit variables and save." });
      }
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      if (!wsId) throw new Error("No workspace selected");

      // Enforce max templates limit (-1 = unlimited)
      if (maxTemplates > 0 && templates.length >= maxTemplates) {
        throw new Error(`Your plan allows a maximum of ${maxTemplates} template(s). Please upgrade to add more.`);
      }

      const variables = [...new Set(content.match(/\{[^}]+\}/g) || [])];
      const { error } = await supabase.from("templates").insert({
        name,
        content,
        variables,
        user_id: user.id,
        workspace_id: wsId,
        seo_title_pattern: seoTitlePattern,
        seo_description_pattern: seoDescriptionPattern,
        schema_type: schemaType,
        schema_config: schemaConfig,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast({ title: "Template created", description: `"${name}" has been saved.` });
      resetAndClose();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingTemplate) throw new Error("No template to update");
      // Save current version before overwriting
      saveVersion(editingTemplate.id, {
        name: editingTemplate.name,
        content: editingTemplate.content,
        variables: editingTemplate.variables || [],
        seo_title_pattern: (editingTemplate as any).seo_title_pattern || "",
        seo_description_pattern: (editingTemplate as any).seo_description_pattern || "",
      });
      const variables = [...new Set(content.match(/\{[^}]+\}/g) || [])];
      const { error } = await supabase.from("templates").update({
        name,
        content,
        variables,
        seo_title_pattern: seoTitlePattern,
        seo_description_pattern: seoDescriptionPattern,
        schema_type: schemaType,
        schema_config: schemaConfig,
      } as any).eq("id", editingTemplate.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast({ title: "Template updated", description: `"${name}" has been saved.` });
      resetAndClose();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const aiGenerateMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const { data, error } = await supabase.functions.invoke("generate-template", {
        body: { prompt },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { content: string; variables: string[]; suggestedName: string };
    },
    onSuccess: (data) => {
      setContent(data.content);
      setName(data.suggestedName);
      toast({ title: "Template generated", description: "Review and save the AI-generated template." });
    },
    onError: (err: Error) => {
      toast({ title: "AI generation failed", description: err.message, variant: "destructive" });
    },
  });

  const aiContentMutation = useMutation({
    mutationFn: async ({ keywords, contentType }: { keywords: string; contentType: string }) => {
      const { data, error } = await supabase.functions.invoke("generate-seo-content", {
        body: { keywords: keywords.split(",").map(k => k.trim()).filter(Boolean), contentType },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { content: string; variables: string[]; seoTitle: string; seoDescription: string; suggestedName: string };
    },
    onSuccess: (data) => {
      setContent(data.content);
      setBlocks(htmlToBlocks(data.content));
      setName(data.suggestedName);
      setSeoTitlePattern(data.seoTitle);
      setSeoDescriptionPattern(data.seoDescription);
      setAiContentOpen(false);
      setOpen(true);
      toast({ title: "AI Content generated!", description: "High-scoring SEO/SEA/GEO content is ready. Review and save." });
    },
    onError: (err: Error) => {
      toast({ title: "AI content generation failed", description: err.message, variant: "destructive" });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (tpl: Template) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      if (!wsId) throw new Error("No workspace selected");
      const { error } = await supabase.from("templates").insert({
        name: `${tpl.name} (Copy)`,
        content: tpl.content,
        variables: tpl.variables,
        user_id: user.id,
        workspace_id: wsId,
        seo_title_pattern: (tpl as any).seo_title_pattern || "",
        seo_description_pattern: (tpl as any).seo_description_pattern || "",
        schema_type: (tpl as any).schema_type || "WebPage",
        schema_config: (tpl as any).schema_config || {},
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast({ title: "Template duplicated", description: "All settings including SEO patterns and schema have been copied." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; linkedCampaigns: { id: string; name: string }[] } | null>(null);

  const checkAndDelete = async (id: string) => {
    const { data: linked } = await supabase
      .from("campaigns")
      .select("id, name")
      .eq("template_id", id)
      .limit(10);
    setDeleteTarget({ id, linkedCampaigns: linked ?? [] });
  };

  const performDelete = async (id: string, force: boolean) => {
    try {
      if (force) {
        const { error: unlinkErr } = await supabase
          .from("campaigns")
          .update({ template_id: null })
          .eq("template_id", id);
        if (unlinkErr) throw unlinkErr;
      }
      const { error } = await supabase.from("templates").delete().eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({ title: "Template deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  const resetAndClose = () => {
    setAiOpen(false);
    setOpen(false);
    setEditingTemplate(null);
    setName("");
    setContent("");
    setBlocks([]);
    setAiPrompt("");
    setActiveEditorTab("visual");
    setSeoTitlePattern("");
    setSeoDescriptionPattern("");
    setSchemaType("WebPage");
    setSchemaConfig({});
  };

  const importFileRef = useRef<HTMLInputElement>(null);

  const exportTemplate = (tpl: Template) => {
    const exportData = {
      name: tpl.name,
      content: tpl.content,
      variables: tpl.variables,
      seo_title_pattern: (tpl as any).seo_title_pattern || "",
      seo_description_pattern: (tpl as any).seo_description_pattern || "",
      schema_type: (tpl as any).schema_type || "WebPage",
      schema_config: (tpl as any).schema_config || {},
      exported_at: new Date().toISOString(),
      version: 1,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${tpl.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.template.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Template exported", description: `"${tpl.name}" saved as JSON.` });
  };

  const importTemplate = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.name || !data.content) {
        throw new Error("Invalid template file: missing name or content.");
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      if (!wsId) throw new Error("No workspace selected");

      if (maxTemplates > 0 && templates.length >= maxTemplates) {
        throw new Error(`Your plan allows a maximum of ${maxTemplates} template(s). Please upgrade to add more.`);
      }

      const { error } = await supabase.from("templates").insert({
        name: data.name,
        content: data.content,
        variables: data.variables || [],
        user_id: user.id,
        workspace_id: wsId,
        seo_title_pattern: data.seo_title_pattern || "",
        seo_description_pattern: data.seo_description_pattern || "",
        schema_type: data.schema_type || "WebPage",
        schema_config: data.schema_config || {},
      } as any);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast({ title: "Template imported", description: `"${data.name}" has been added.` });
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    }
    // Reset file input
    if (importFileRef.current) importFileRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-display">Templates</h1>
          <p className="text-muted-foreground mt-1">Define reusable page layouts with dynamic variables.</p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap">
          {/* Hidden file input for import */}
          <input
            ref={importFileRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importTemplate(file);
            }}
          />
          <Button
            variant="outline"
            className="transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
            onClick={() => importFileRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" /> Import
          </Button>
          {/* AI Content Generator */}
          <Button
            variant="outline"
            className="transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
            onClick={() => setAiContentOpen(true)}
          >
            <Wand2 className="mr-2 h-4 w-4" /> AI Content
          </Button>
          {/* From CSV */}
          <Button
            variant="outline"
            className="transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
            onClick={() => setCsvDialogOpen(true)}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" /> From CSV
          </Button>
          {/* From Connected Site */}
          <Button
            variant="outline"
            className="transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
            onClick={() => setSiteDialogOpen(true)}
          >
            <Link2 className="mr-2 h-4 w-4" /> From Site
          </Button>
          {/* AI Template Builder */}
          <Dialog open={aiOpen} onOpenChange={(v) => { if (!v) resetAndClose(); else setAiOpen(true); }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="transition-all duration-150 hover:brightness-110 active:scale-[0.97]">
                <Sparkles className="mr-2 h-4 w-4" /> AI Builder
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:w-[min(96vw,72rem)] sm:max-w-none max-h-[calc(100dvh-1rem)] sm:max-h-[92dvh] overflow-y-auto rounded-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Template Builder
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="ai-prompt">Describe the template you need</Label>
                  <p className="text-xs text-muted-foreground mb-1">
                    Try an example or write your own prompt
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {[
                      "Landing page for a plumbing service company",
                      "Local SEO page for a dental clinic",
                      "Product page for an e-commerce store",
                      "Course landing page for an online academy",
                      "Restaurant location page with menu highlights",
                      "Real estate listing page for property agents",
                    ].map((example) => (
                      <button
                        key={example}
                        type="button"
                        onClick={() => setAiPrompt(`Create a ${example.toLowerCase()}`)}
                        className="text-xs px-2.5 py-1 rounded-full border border-border bg-muted/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                  <Textarea
                    id="ai-prompt"
                    placeholder="Create a landing page template for a plumbing service company with service details, pricing, and location-specific content..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button
                  onClick={() => aiGenerateMutation.mutate(aiPrompt)}
                  disabled={!aiPrompt.trim() || aiGenerateMutation.isPending}
                  className="w-full"
                >
                  {aiGenerateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" /> Generate Template
                    </>
                  )}
                </Button>

                {/* Show generated result with code/preview tabs */}
                {content && (
                  <div className="space-y-4 pt-2 border-t border-border">
                    <div>
                      <Label htmlFor="ai-name">Template Name</Label>
                      <Input
                        id="ai-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>

                    <Tabs defaultValue="code" className="w-full">
                      <TabsList className="w-full grid grid-cols-2">
                        <TabsTrigger value="code" className="flex items-center gap-1.5">
                          <Code className="h-3.5 w-3.5" /> Code
                        </TabsTrigger>
                        <TabsTrigger value="preview" className="flex items-center gap-1.5">
                          <Eye className="h-3.5 w-3.5" /> Preview
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="code" className="mt-3">
                        <Textarea
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          rows={14}
                          className="font-mono text-xs"
                        />
                      </TabsContent>
                      <TabsContent value="preview" className="mt-3">
                        <TemplatePreview html={content} />
                      </TabsContent>
                    </Tabs>

                    {detectedVars.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs text-muted-foreground">Detected variables:</span>
                        {[...new Set(detectedVars)].map((v) => (
                          <Badge key={v} variant="outline" className="text-xs font-mono">{v}</Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => { setContent(""); setName(""); }}>
                        Discard
                      </Button>
                      <Button
                        onClick={() => createMutation.mutate()}
                        disabled={!name || !content || createMutation.isPending}
                      >
                        {createMutation.isPending ? "Saving..." : "Save Template"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Manual / Edit Template */}
          <Dialog open={open || !!editingTemplate} onOpenChange={(v) => { if (!v) resetAndClose(); else setOpen(true); }}>
            {!editingTemplate && (
              <DialogTrigger asChild>
                <Button className="transition-all duration-150 hover:brightness-110 active:scale-[0.97]">
                  <Plus className="mr-2 h-4 w-4" /> New Template
                </Button>
              </DialogTrigger>
            )}
            <DialogContent className="sm:w-[min(96vw,72rem)] sm:max-w-none max-h-[calc(100dvh-1rem)] sm:max-h-[92dvh] overflow-y-auto rounded-lg">
              <DialogHeader>
                <DialogTitle>{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="tpl-name">Template Name</Label>
                  <Input id="tpl-name" placeholder="e.g., Course Landing" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <Tabs value={activeEditorTab} onValueChange={handleTabChange} className="w-full">
                  <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-5">
                    <TabsTrigger value="visual" className="flex items-center gap-1.5 text-xs sm:text-sm">
                      <LayoutPanelTop className="h-3.5 w-3.5" /> Visual
                    </TabsTrigger>
                    <TabsTrigger value="code" className="flex items-center gap-1.5 text-xs sm:text-sm">
                      <Code className="h-3.5 w-3.5" /> Code
                    </TabsTrigger>
                    <TabsTrigger value="seo" className="flex items-center gap-1.5 text-xs sm:text-sm">
                      <Globe className="h-3.5 w-3.5" /> SEO
                    </TabsTrigger>
                    <TabsTrigger value="schema" className="flex items-center gap-1.5 text-xs sm:text-sm">
                      <Braces className="h-3.5 w-3.5" /> Schema
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="flex items-center gap-1.5 text-xs sm:text-sm col-span-2 sm:col-span-1">
                      <Eye className="h-3.5 w-3.5" /> Preview
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="visual" className="mt-3">
                    <TemplateVisualEditor
                      blocks={blocks}
                      onChange={handleBlocksChange}
                    />
                  </TabsContent>
                  <TabsContent value="code" className="mt-3">
                    <p className="text-xs text-muted-foreground mb-1">Use &#123;variable&#125; syntax for dynamic fields.</p>
                    <Textarea
                      id="tpl-content"
                      placeholder={"<h1>{course} in {city}</h1>\n<p>Learn {course} in {city}...</p>"}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={12}
                      className="font-mono text-xs"
                    />
                  </TabsContent>
                  <TabsContent value="seo" className="mt-3">
                    <div className="space-y-4">
                      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1">
                        <p className="text-sm font-medium">SEO Meta Patterns</p>
                        <p className="text-xs text-muted-foreground">
                          Define patterns using &#123;variable&#125; syntax. These override AI-generated metadata when set.
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="seo-title">Meta Title Pattern</Label>
                        <Input
                          id="seo-title"
                          placeholder="e.g., {keyword} in {city} | My Brand"
                          value={seoTitlePattern}
                          onChange={(e) => setSeoTitlePattern(e.target.value)}
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                          Recommended: under 60 characters. Current: {seoTitlePattern.length} chars
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="seo-desc">Meta Description Pattern</Label>
                        <Textarea
                          id="seo-desc"
                          placeholder="e.g., Find the best {keyword} services in {city}. Contact us today for a free quote."
                          value={seoDescriptionPattern}
                          onChange={(e) => setSeoDescriptionPattern(e.target.value)}
                          rows={3}
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                          Recommended: 120-160 characters. Current: {seoDescriptionPattern.length} chars
                        </p>
                      </div>
                      {detectedVars.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1.5">Available variables from template:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {[...new Set(detectedVars)].map((v) => (
                              <Badge key={v} variant="outline" className="text-xs font-mono cursor-pointer hover:bg-accent"
                                onClick={() => {
                                  navigator.clipboard.writeText(v);
                                }}>
                                {v}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="schema" className="mt-3">
                    <div className="space-y-4">
                      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1">
                        <p className="text-sm font-medium">Structured Data (JSON-LD)</p>
                        <p className="text-xs text-muted-foreground">
                          Configure Schema.org structured data that will be injected into each generated page.
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Schema Type</Label>
                        <Select value={schemaType} onValueChange={setSchemaType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="WebPage">WebPage</SelectItem>
                            <SelectItem value="LocalBusiness">LocalBusiness</SelectItem>
                            <SelectItem value="Product">Product</SelectItem>
                            <SelectItem value="FAQPage">FAQPage</SelectItem>
                            <SelectItem value="Article">Article</SelectItem>
                            <SelectItem value="Service">Service</SelectItem>
                            <SelectItem value="Organization">Organization</SelectItem>
                            <SelectItem value="Event">Event</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {schemaType === "LocalBusiness" && (
                        <div className="space-y-3 rounded-lg border border-border p-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">LocalBusiness Fields</p>
                          {[
                            { key: "name", label: "Business Name", placeholder: "{company}" },
                            { key: "telephone", label: "Phone", placeholder: "{phone}" },
                            { key: "email", label: "Email", placeholder: "{email}" },
                            { key: "addressLocality", label: "City", placeholder: "{city}" },
                            { key: "addressRegion", label: "Region", placeholder: "{region}" },
                            { key: "addressCountry", label: "Country", placeholder: "{country}" },
                            { key: "postalCode", label: "Postal Code", placeholder: "{postcode}" },
                          ].map(({ key, label, placeholder }) => (
                            <div key={key} className="grid grid-cols-3 gap-2 items-center">
                              <Label className="text-xs">{label}</Label>
                              <Input
                                className="col-span-2 text-sm font-mono h-8"
                                placeholder={placeholder}
                                value={schemaConfig[key] || ""}
                                onChange={(e) => setSchemaConfig({ ...schemaConfig, [key]: e.target.value })}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {schemaType === "Product" && (
                        <div className="space-y-3 rounded-lg border border-border p-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Product Fields</p>
                          {[
                            { key: "name", label: "Product Name", placeholder: "{name}" },
                            { key: "description", label: "Description", placeholder: "{description}" },
                            { key: "price", label: "Price", placeholder: "{price}" },
                            { key: "currency", label: "Currency", placeholder: "USD" },
                            { key: "brand", label: "Brand", placeholder: "{brand}" },
                            { key: "sku", label: "SKU", placeholder: "{sku}" },
                          ].map(({ key, label, placeholder }) => (
                            <div key={key} className="grid grid-cols-3 gap-2 items-center">
                              <Label className="text-xs">{label}</Label>
                              <Input
                                className="col-span-2 text-sm font-mono h-8"
                                placeholder={placeholder}
                                value={schemaConfig[key] || ""}
                                onChange={(e) => setSchemaConfig({ ...schemaConfig, [key]: e.target.value })}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {schemaType === "FAQPage" && (
                        <div className="space-y-3 rounded-lg border border-border p-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">FAQ Fields</p>
                          {[
                            { key: "question", label: "Question Column", placeholder: "{question}" },
                            { key: "answer", label: "Answer Column", placeholder: "{answer}" },
                          ].map(({ key, label, placeholder }) => (
                            <div key={key} className="grid grid-cols-3 gap-2 items-center">
                              <Label className="text-xs">{label}</Label>
                              <Input
                                className="col-span-2 text-sm font-mono h-8"
                                placeholder={placeholder}
                                value={schemaConfig[key] || ""}
                                onChange={(e) => setSchemaConfig({ ...schemaConfig, [key]: e.target.value })}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {(schemaType === "Article" || schemaType === "Service" || schemaType === "Event" || schemaType === "Organization") && (
                        <div className="space-y-3 rounded-lg border border-border p-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{schemaType} Fields</p>
                          {[
                            { key: "name", label: "Name", placeholder: "{name}" },
                            { key: "description", label: "Description", placeholder: "{description}" },
                            { key: "url", label: "URL", placeholder: "{url}" },
                          ].map(({ key, label, placeholder }) => (
                            <div key={key} className="grid grid-cols-3 gap-2 items-center">
                              <Label className="text-xs">{label}</Label>
                              <Input
                                className="col-span-2 text-sm font-mono h-8"
                                placeholder={placeholder}
                                value={schemaConfig[key] || ""}
                                onChange={(e) => setSchemaConfig({ ...schemaConfig, [key]: e.target.value })}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* JSON-LD Preview */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">JSON-LD Preview</Label>
                        <pre className="p-3 bg-muted rounded-lg text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto">
                          {JSON.stringify(
                            {
                              "@context": "https://schema.org",
                              "@type": schemaType,
                              ...Object.fromEntries(
                                Object.entries(schemaConfig).filter(([, v]) => v)
                              ),
                            },
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="preview" className="mt-3">
                    {content ? (
                      <TemplatePreview html={content} />
                    ) : (
                      <div className="flex items-center justify-center h-32 border border-dashed border-border rounded-md text-muted-foreground text-sm">
                        Add blocks in the Visual tab or write HTML in the Code tab
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
                {/* Live Score Preview Panel */}
                {content.trim().length > 0 && (() => {
                  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                  const seoScore = calculateContentSeoScore(name, content, slug);
                  const seaScore = calculateContentSeaScore(name, content, slug);
                  const geoScore = calculateContentGeoScore(name, content, slug);
                  const avgScore = Math.round((seoScore.score + seaScore.score + geoScore.score) / 3);
                  const avgColor = avgScore >= 85 ? "text-emerald-600" : avgScore >= 60 ? "text-primary" : avgScore >= 35 ? "text-amber-600" : "text-destructive";
                  const targetChecks = 7; // 7 out of 8 checks = 87.5% ≈ 80+
                  const buildTargetInfo = (scoreResult: typeof seoScore, label: string) => {
                    const failed = scoreResult.checks.filter(c => !c.passed);
                    const passed = scoreResult.checks.filter(c => c.passed);
                    const needMore = Math.max(0, targetChecks - passed.length);
                    const isTarget = scoreResult.score >= 80;
                    return { failed, passed, needMore, isTarget, label };
                  };
                  const targets = [
                    { emoji: "🔍", ...buildTargetInfo(seoScore, "SEO"), score: seoScore },
                    { emoji: "💰", ...buildTargetInfo(seaScore, "SEA"), score: seaScore },
                    { emoji: "📍", ...buildTargetInfo(geoScore, "GEO"), score: geoScore },
                  ];
                  const allAbove80 = targets.every(t => t.isTarget);
                  return (
                    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold flex items-center gap-2">
                          <Wand2 className="h-4 w-4 text-primary" />
                          Live Score Preview
                        </p>
                        <span className={`text-sm font-bold ${avgColor}`}>
                          Avg: {avgScore}/100
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {targets.map((t) => (
                          <div key={t.label} className={`flex flex-col items-center gap-1.5 rounded-md border bg-background p-3 ${t.isTarget ? "border-emerald-500/50" : "border-border"}`}>
                            <span className="text-xs font-medium text-muted-foreground">{t.emoji} {t.label}</span>
                            <SeoScoreBadge score={t.score.score} label={t.score.label} color={t.score.color} checks={t.score.checks} size="md" scoreType={t.label} />
                            {t.isTarget ? (
                              <span className="text-[10px] font-medium text-emerald-600">✓ Target reached</span>
                            ) : (
                              <span className="text-[10px] font-medium text-amber-600">Need {t.needMore} more check{t.needMore !== 1 ? "s" : ""}</span>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Target indicator: show failing checks that matter most */}
                      {!allAbove80 && (
                        <div className="rounded-md border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-2">
                          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                            🎯 Fix these to reach 80+ on all metrics
                          </p>
                          {targets.filter(t => !t.isTarget).map((t) => (
                            <div key={t.label} className="space-y-1">
                              <p className="text-[11px] font-semibold text-foreground">{t.emoji} {t.label} — need {t.needMore} of {t.failed.length} failing:</p>
                              <div className="grid gap-1 pl-2">
                                {t.failed.map((check, i) => (
                                  <div key={i} className="flex items-start gap-1.5">
                                    <span className="text-destructive text-[10px] mt-px shrink-0">✕</span>
                                    <div>
                                      <span className="text-[11px] font-medium text-foreground">{check.label}</span>
                                      {check.tip && <span className="text-[10px] text-muted-foreground ml-1">— {check.tip}</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {allAbove80 && (
                        <p className="text-xs text-emerald-600 font-medium text-center">
                          ✅ All scores are above 80 — your content is well-optimized!
                        </p>
                      )}
                    </div>
                  );
                })()}
                {detectedVars.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-muted-foreground">Detected variables:</span>
                    {[...new Set(detectedVars)].map((v) => (
                      <Badge key={v} variant="outline" className="text-xs font-mono">{v}</Badge>
                    ))}
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={resetAndClose}>Cancel</Button>
                  {editingTemplate ? (
                    <Button onClick={() => updateMutation.mutate()} disabled={!name || !content || updateMutation.isPending}>
                      {updateMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  ) : (
                    <Button onClick={() => createMutation.mutate()} disabled={!name || !content || createMutation.isPending}>
                      {createMutation.isPending ? "Creating..." : "Create Template"}
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-5 space-y-3"><Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-full" /><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">No templates yet. Create your first template to get started.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hasCustomOrder && (
            <div className="col-span-full flex justify-end">
              <Button variant="ghost" size="sm" onClick={resetOrder} className="text-xs text-muted-foreground">
                <RotateCcw className="h-3 w-3 mr-1.5" /> Reset order
              </Button>
            </div>
          )}
          {orderedTemplates.map((tpl, index) => {
            const dragProps = getDragProps(index);
            return (
            <Card
              key={tpl.id}
              className={`shadow-surface hover:shadow-surface-hover transition-shadow duration-150 ${dragProps.className}`}
              draggable={dragProps.draggable}
              onDragStart={dragProps.onDragStart}
              onDragOver={dragProps.onDragOver}
              onDrop={dragProps.onDrop}
              onDragEnd={dragProps.onDragEnd}
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors p-0.5 -ml-1 shrink-0">
                          <GripVertical className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-xs">Drag to reorder</TooltipContent>
                    </Tooltip>
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <h3 className="font-semibold truncate">{tpl.name}</h3>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0 flex-wrap justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditingTemplate(tpl);
                        setName(tpl.name);
                        setContent(tpl.content);
                        setBlocks(htmlToBlocks(tpl.content));
                        setActiveEditorTab("visual");
                        setSeoTitlePattern((tpl as any).seo_title_pattern || "");
                        setSeoDescriptionPattern((tpl as any).seo_description_pattern || "");
                        setSchemaType((tpl as any).schema_type || "WebPage");
                        setSchemaConfig((tpl as any).schema_config || {});
                      }}
                      title="Edit"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateMutation.mutate(tpl)} title="Duplicate">
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => exportTemplate(tpl)} title="Export JSON">
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => checkAndDelete(tpl.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    <TemplateVersionHistory
                      templateId={tpl.id}
                      currentContent={tpl.content}
                      currentName={tpl.name}
                      onRestore={(version) => {
                        setEditingTemplate(tpl);
                        setName(version.name);
                        setContent(version.content);
                        setBlocks(htmlToBlocks(version.content));
                        setActiveEditorTab("visual");
                        setSeoTitlePattern(version.seo_title_pattern || "");
                        setSeoDescriptionPattern(version.seo_description_pattern || "");
                        toast({ title: "Version restored", description: "Review and save to confirm." });
                      }}
                    />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(tpl.variables || []).map((v) => (
                    <Badge key={v} variant="outline" className="text-xs font-mono">{v}</Badge>
                  ))}
                </div>
                <Tabs defaultValue="visual" className="mt-3">
                  <TabsList className="h-8 w-full grid grid-cols-2">
                    <TabsTrigger value="visual" className="text-xs gap-1.5">
                      <Eye className="h-3 w-3" /> Visual
                    </TabsTrigger>
                    <TabsTrigger value="code" className="text-xs gap-1.5">
                      <Code className="h-3 w-3" /> Code
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="visual" className="mt-2">
                    <TemplatePreview html={tpl.content} />
                  </TabsContent>
                  <TabsContent value="code" className="mt-2">
                    <pre className="p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto leading-relaxed max-h-40 overflow-y-auto">
                      {tpl.content}
                    </pre>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget && deleteTarget.linkedCampaigns.length > 0 ? "Template in use" : "Delete template?"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {deleteTarget && deleteTarget.linkedCampaigns.length > 0 ? (
                  <>
                    <span>This template is linked to {deleteTarget.linkedCampaigns.length} campaign(s):</span>
                    <span className="font-medium block mt-1">
                      {deleteTarget.linkedCampaigns.map((c) => c.name).join(", ")}
                    </span>
                    <span className="block mt-2">
                      <strong>Force delete</strong> will unlink all campaigns and delete the template.
                    </span>
                  </>
                ) : (
                  <span>This action cannot be undone. The template will be permanently deleted.</span>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && performDelete(deleteTarget.id, deleteTarget.linkedCampaigns.length > 0)}
            >
              {deleteTarget && deleteTarget.linkedCampaigns.length > 0 ? "Force Delete" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CSV Template Dialog */}
      <Dialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Create Template from CSV
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Paste your CSV data below. The first row (headers) will be converted into template variables automatically.
            </p>
            <div>
              <Label>Template Name</Label>
              <Input
                placeholder="e.g., Product Landing Template"
                value={csvTemplateName}
                onChange={(e) => setCsvTemplateName(e.target.value)}
              />
            </div>
            <div>
              <Label>CSV Data (paste or type)</Label>
              <Textarea
                placeholder={"city,service,phone\nNew York,Plumbing,555-0100\nLos Angeles,HVAC,555-0200"}
                value={csvTemplateText}
                onChange={(e) => setCsvTemplateText(e.target.value)}
                rows={6}
                className="font-mono text-xs"
              />
              {csvTemplateText.trim() && (() => {
                const headers = csvTemplateText.split("\n")[0]?.split(",").map(h => h.trim()).filter(Boolean) || [];
                return headers.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-xs text-muted-foreground">Variables:</span>
                    {headers.map(h => (
                      <Badge key={h} variant="outline" className="text-xs font-mono">
                        {`{${h.toLowerCase().replace(/[^a-z0-9]+/g, "_")}}`}
                      </Badge>
                    ))}
                  </div>
                ) : null;
              })()}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCsvDialogOpen(false)}>Cancel</Button>
              <Button onClick={createFromCsv} disabled={!csvTemplateText.trim()}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Create Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Connected Site Template Dialog */}
      <Dialog open={siteDialogOpen} onOpenChange={(v) => { setSiteDialogOpen(v); if (!v) { setSitePages([]); setSiteTemplateWebsite(""); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              Import Template from Connected Site
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Select a connected website and choose a page to use as a template base.
            </p>
            {connectedWebsites.length === 0 ? (
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 text-center">
                No connected websites found. Add one in Settings → Websites first.
              </p>
            ) : (
              <>
                <Select
                  value={siteTemplateWebsite}
                  onValueChange={(val) => {
                    setSiteTemplateWebsite(val);
                    loadSitePages(val);
                  }}
                >
                  <SelectTrigger>
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

                {siteLoadingPages && (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                )}

                {sitePages.length > 0 && (
                  <div className="space-y-1 max-h-60 overflow-y-auto border rounded-lg p-2">
                    {sitePages.map((page) => (
                      <button
                        key={page.id}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-accent/50 transition-colors text-left"
                        onClick={() => importSitePage(page.link, page.title)}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{page.title}</p>
                          <p className="text-xs text-muted-foreground truncate">/{page.slug}</p>
                        </div>
                        <Download className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                )}

                {!siteLoadingPages && siteTemplateWebsite && sitePages.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No pages found on this site.</p>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Content Generator Dialog */}
      <Dialog open={aiContentOpen} onOpenChange={(v) => { setAiContentOpen(v); if (!v) { setAiKeywords(""); setAiContentType("seo"); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              AI Content Generator
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1">
              <p className="text-sm font-medium">Generate SEO-optimized content</p>
              <p className="text-xs text-muted-foreground">
                Enter your target keywords and we'll generate content that scores <strong>80+</strong> on SEO, SEA, and GEO metrics automatically.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Target Keywords</Label>
              <Input
                placeholder="e.g., plumbing services, emergency plumber, pipe repair"
                value={aiKeywords}
                onChange={(e) => setAiKeywords(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Separate multiple keywords with commas</p>
            </div>

            <div className="space-y-1.5">
              <Label>Content Focus</Label>
              <Select value={aiContentType} onValueChange={setAiContentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="seo">
                    <span className="flex items-center gap-2">🔍 SEO — Organic search optimization</span>
                  </SelectItem>
                  <SelectItem value="sea">
                    <span className="flex items-center gap-2">💰 SEA — Paid landing page conversion</span>
                  </SelectItem>
                  <SelectItem value="geo">
                    <span className="flex items-center gap-2">📍 GEO — Local search targeting</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs text-muted-foreground w-full mb-1">Quick keyword ideas:</span>
              {[
                "plumbing services, emergency plumber",
                "dental clinic, teeth whitening",
                "real estate agent, home buying",
                "restaurant, food delivery",
                "auto repair, car service",
                "web design, digital marketing",
              ].map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => setAiKeywords(kw)}
                  className="text-xs px-2.5 py-1 rounded-full border border-border bg-muted/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                >
                  {kw}
                </button>
              ))}
            </div>

            <Button
              onClick={() => aiContentMutation.mutate({ keywords: aiKeywords, contentType: aiContentType })}
              disabled={!aiKeywords.trim() || aiContentMutation.isPending}
              className="w-full"
            >
              {aiContentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating high-score content...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" /> Generate Content (80+ Score)
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
