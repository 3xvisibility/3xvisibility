import { useState, useCallback, useEffect } from "react";
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
import { Plus, FileText, Copy, Trash2, Sparkles, Loader2, Code, Eye, LayoutPanelTop, Pencil } from "lucide-react";
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
      });
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

          {/* Manual Template */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="transition-all duration-150 hover:brightness-110 active:scale-[0.97]">
                <Plus className="mr-2 h-4 w-4" /> New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="tpl-name">Template Name</Label>
                  <Input id="tpl-name" placeholder="e.g., Course Landing" value={name} onChange={(e) => setName(e.target.value)} />
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
                    <p className="text-xs text-muted-foreground mb-1">Use &#123;variable&#125; syntax for dynamic fields.</p>
                    <Textarea
                      id="tpl-content"
                      placeholder={"<h1>{course} in {city}</h1>\n<p>Learn {course} in {city}...</p>"}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={10}
                      className="font-mono text-xs"
                    />
                  </TabsContent>
                  <TabsContent value="preview" className="mt-3">
                    {content ? (
                      <TemplatePreview html={content} />
                    ) : (
                      <div className="flex items-center justify-center h-32 border border-dashed border-border rounded-md text-muted-foreground text-sm">
                        Start typing in the Code tab to see a preview
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
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={() => createMutation.mutate()} disabled={!name || !content || createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Template"}
                  </Button>
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
