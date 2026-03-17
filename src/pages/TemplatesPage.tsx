import { useState, useCallback, useEffect, useRef } from "react";
import { useSubscription } from "@/hooks/use-subscription";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, Copy, Trash2, Sparkles, Loader2, Code, Eye, LayoutPanelTop, Pencil, Search as SearchIcon, Globe, Braces, Download, Upload } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { TemplatePreview } from "@/components/templates/TemplatePreview";
import {
  TemplateVisualEditor,
  blocksToHtml,
  htmlToBlocks,
  type TemplateBlock,
} from "@/components/templates/TemplateVisualEditor";
import { useWorkspace } from "@/contexts/WorkspaceContext";

type Template = Tables<"templates">;

export default function TemplatesPage() {
  const [open, setOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [blocks, setBlocks] = useState<TemplateBlock[]>([]);
  const [activeEditorTab, setActiveEditorTab] = useState<string>("visual");
  const [aiPrompt, setAiPrompt] = useState("");
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Tables<"templates"> | null>(null);
  // SEO state
  const [seoTitlePattern, setSeoTitlePattern] = useState("");
  const [seoDescriptionPattern, setSeoDescriptionPattern] = useState("");
  // Schema state
  const [schemaType, setSchemaType] = useState("WebPage");
  const [schemaConfig, setSchemaConfig] = useState<Record<string, string>>({});
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

  const { features } = useSubscription();
  const maxTemplates = features.templates;

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
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast({ title: "Template duplicated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast({ title: "Template deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

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
        <div className="flex gap-2">
          {/* AI Template Builder */}
          <Dialog open={aiOpen} onOpenChange={(v) => { if (!v) resetAndClose(); else setAiOpen(true); }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="transition-all duration-150 hover:brightness-110 active:scale-[0.97]">
                <Sparkles className="mr-2 h-4 w-4" /> AI Builder
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
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
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="tpl-name">Template Name</Label>
                  <Input id="tpl-name" placeholder="e.g., Course Landing" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <Tabs value={activeEditorTab} onValueChange={handleTabChange} className="w-full">
                  <TabsList className="w-full grid grid-cols-5">
                    <TabsTrigger value="visual" className="flex items-center gap-1.5">
                      <LayoutPanelTop className="h-3.5 w-3.5" /> Visual
                    </TabsTrigger>
                    <TabsTrigger value="code" className="flex items-center gap-1.5">
                      <Code className="h-3.5 w-3.5" /> Code
                    </TabsTrigger>
                    <TabsTrigger value="seo" className="flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5" /> SEO
                    </TabsTrigger>
                    <TabsTrigger value="schema" className="flex items-center gap-1.5">
                      <Braces className="h-3.5 w-3.5" /> Schema
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="flex items-center gap-1.5">
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
          {templates.map((tpl) => (
            <Card key={tpl.id} className="shadow-surface hover:shadow-surface-hover transition-shadow duration-150">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">{tpl.name}</h3>
                  </div>
                  <div className="flex gap-1">
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setPreviewTemplateId(previewTemplateId === tpl.id ? null : tpl.id)}
                      title="Toggle preview"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateMutation.mutate(tpl)} title="Duplicate">
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(tpl.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(tpl.variables || []).map((v) => (
                    <Badge key={v} variant="outline" className="text-xs font-mono">{v}</Badge>
                  ))}
                </div>
                {previewTemplateId === tpl.id ? (
                  <div className="mt-3">
                    <TemplatePreview html={tpl.content} />
                  </div>
                ) : (
                  <pre className="mt-3 p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto leading-relaxed max-h-40 overflow-y-auto">
                    {tpl.content}
                  </pre>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
