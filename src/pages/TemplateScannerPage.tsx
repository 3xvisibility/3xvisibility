import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

  const { toast } = useToast();
  const queryClient = useQueryClient();

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

      // Apply variable replacements to the HTML
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
      // Reset
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
      // Get selected text or use full block text
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

  // Generate preview content
  const getPreviewContent = () => {
    let content = bodyHtml;
    for (const mapping of acceptedMappings) {
      const escapedValue = mapping.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escapedValue, "gi");
      content = content.replace(regex, `<mark class="bg-primary/20 text-primary px-1 rounded font-semibold">{${mapping.variable}}</mark>`);
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

      {/* URL Input */}
      <Card className="shadow-surface">
        <CardContent className="p-5">
          <Label htmlFor="scan-url" className="text-sm font-medium">
            Webpage URL
          </Label>
          <p className="text-xs text-muted-foreground mb-2">
            Enter a public URL or WordPress page to scan and convert into a template.
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
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scanning...
                </>
              ) : (
                <>
                  <ScanSearch className="mr-2 h-4 w-4" /> Scan Page
                </>
              )}
            </Button>
          </div>
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
          {/* Variable Suggestions Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </div>

          {/* Accepted Variables Chips */}
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

          {/* Content Blocks with Variable Mapping */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Content Blocks</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
                  <Eye className="mr-1.5 h-3.5 w-3.5" /> Preview Template
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

                    {/* Variable suggestions for this block */}
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
                                mapping.accepted
                                  ? "text-success hover:text-success"
                                  : "text-muted-foreground"
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
                                    if (e.key === "Enter") {
                                      renameVariable(mapping.blockId, mapping.variable, editValue);
                                    }
                                    if (e.key === "Escape") setEditingVar(null);
                                  }}
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() =>
                                    renameVariable(mapping.blockId, mapping.variable, editValue)
                                  }
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Badge
                                variant="outline"
                                className={`font-mono cursor-pointer ${
                                  mapping.accepted ? "border-primary text-primary" : "opacity-50"
                                }`}
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

                    {/* Manual variable assignment */}
                    {isSelected && (
                      <div
                        className="mt-3 border-t border-border pt-3 flex gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
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
                  <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                    Cancel
                  </Button>
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
    </div>
  );
}
