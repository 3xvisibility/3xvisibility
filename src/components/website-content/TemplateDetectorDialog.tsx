import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  Loader2,
  Plus,
  Trash2,
  Upload,
  Check,
  Copy,
  Wand2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ContentItem {
  id: string;
  title: string;
  slug: string;
  url: string;
  type: "page" | "product";
  status: string;
  content: string;
  excerpt: string;
  modified: string;
}

interface VariableEntry {
  name: string;
  original: string;
  value: string;
}

interface TemplateDetectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: ContentItem;
  websiteId: string;
  websiteType: string;
}

export function TemplateDetectorDialog({
  open,
  onOpenChange,
  page,
  websiteId,
  websiteType,
}: TemplateDetectorDialogProps) {
  const [step, setStep] = useState<"detect" | "edit" | "generate" | "done">("detect");
  const [variables, setVariables] = useState<VariableEntry[]>([]);
  const [templateHtml, setTemplateHtml] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [csvMode, setCsvMode] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [generatedCount, setGeneratedCount] = useState(0);
  const { toast } = useToast();

  const detectVariables = async () => {
    setDetecting(true);
    try {
      const plainText = page.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      const snippet = plainText.slice(0, 3000);

      const { data, error } = await supabase.functions.invoke("generate-caption", {
        body: {
          pages: [{
            id: page.id,
            title: `DETECT_VARIABLES:${page.title}`,
            description: snippet,
            url: page.url,
          }],
          tone: "professional",
          length: "medium",
          _custom_prompt: `Analyze this web page content and identify dynamic/variable parts that could be replaced for page generation (e.g. city names, product names, dates, prices, descriptions, etc).

Page title: ${page.title}
Content: ${snippet}

Return a JSON array of variables like:
[{"name": "city_name", "original": "New York", "value": "New York"}, {"name": "service_type", "original": "plumbing", "value": "plumbing"}]

Only return the JSON array, nothing else. Find 3-8 key variables.`,
        },
      });

      // Try to parse AI response as variables
      if (data?.results?.[0]?.caption) {
        const caption = data.results[0].caption;
        const jsonMatch = caption.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed)) {
            setVariables(parsed.map((v: any) => ({
              name: v.name || "variable",
              original: v.original || "",
              value: v.value || v.original || "",
            })));
          }
        }
      }

      // Build template HTML by replacing originals with {variable} placeholders
      let html = page.content;
      const sortedVars = [...(variables.length ? variables : [])].sort(
        (a, b) => b.original.length - a.original.length
      );
      for (const v of sortedVars) {
        if (v.original) {
          html = html.replaceAll(v.original, `{${v.name}}`);
        }
      }
      setTemplateHtml(html || page.content);
      setStep("edit");
    } catch (err: any) {
      toast({
        title: "Detection failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setDetecting(false);
    }
  };

  // Rebuild template when variables change
  const rebuildTemplate = () => {
    let html = page.content;
    const sorted = [...variables].sort((a, b) => b.original.length - a.original.length);
    for (const v of sorted) {
      if (v.original) {
        html = html.replaceAll(v.original, `{${v.name}}`);
      }
    }
    setTemplateHtml(html);
  };

  const addVariable = () => {
    setVariables((prev) => [...prev, { name: `variable_${prev.length + 1}`, original: "", value: "" }]);
  };

  const removeVariable = (index: number) => {
    setVariables((prev) => prev.filter((_, i) => i !== index));
  };

  const updateVariable = (index: number, field: keyof VariableEntry, value: string) => {
    setVariables((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  };

  const parseCsvRows = (): Record<string, string>[] => {
    if (!csvText.trim()) return [];
    const lines = csvText.split("\n").filter((l) => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const vals = line.split(",").map((v) => v.trim());
      return headers.reduce((acc, h, i) => ({ ...acc, [h]: vals[i] || "" }), {} as Record<string, string>);
    });
  };

  const generatePages = async () => {
    setGenerating(true);
    setProgress(10);
    setStep("generate");

    try {
      const rows = csvMode ? parseCsvRows() : [
        variables.reduce((acc, v) => ({ ...acc, [v.name]: v.value }), {} as Record<string, string>),
      ];

      if (rows.length === 0) {
        toast({ title: "No data to generate", variant: "destructive" });
        setGenerating(false);
        return;
      }

      let generated = 0;

      for (const row of rows) {
        let html = templateHtml;
        for (const [key, val] of Object.entries(row)) {
          html = html.replaceAll(`{${key}}`, val);
        }

        const title = row[variables[0]?.name] || page.title;
        const slug = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");

        // Publish to the website
        const { data, error } = await supabase.functions.invoke("publish-pages", {
          body: {
            website_id: websiteId,
            pages: [
              {
                title,
                content: html,
                slug,
                seo_title: title,
                seo_description: "",
              },
            ],
          },
        });

        if (error) {
          console.error("Publish error:", error);
        }

        generated++;
        setGeneratedCount(generated);
        setProgress(10 + Math.round((generated / rows.length) * 90));
      }

      setStep("done");
      toast({ title: `${generated} page(s) generated and published!` });
    } catch (err: any) {
      toast({
        title: "Generation failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleClose = (o: boolean) => {
    if (!o) {
      setStep("detect");
      setVariables([]);
      setTemplateHtml("");
      setProgress(0);
      setCsvMode(false);
      setCsvText("");
      setGeneratedCount(0);
    }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {step === "detect" && "Detect Template Variables"}
            {step === "edit" && "Edit Template & Variables"}
            {step === "generate" && "Generating Pages..."}
            {step === "done" && "Generation Complete"}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Source: {page.title}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-3">
          {/* Step 1: Detect */}
          {step === "detect" && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="text-center space-y-2">
                <Wand2 className="h-12 w-12 text-primary/30 mx-auto" />
                <h3 className="text-sm font-semibold">AI Variable Detection</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  AI will scan this page's content and identify parts that can be turned into template variables
                  (like city names, product names, descriptions, etc.)
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={detectVariables}
                  disabled={detecting}
                  className="bg-gradient-primary border-0 shadow-lg shadow-primary/25"
                >
                  {detecting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  {detecting ? "Detecting..." : "Auto-Detect Variables"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setTemplateHtml(page.content);
                    setStep("edit");
                  }}
                >
                  Skip — Manual Setup
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Edit variables + template */}
          {step === "edit" && (
            <Tabs defaultValue="variables" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="variables" className="text-xs">Variables</TabsTrigger>
                <TabsTrigger value="template" className="text-xs">Template Preview</TabsTrigger>
              </TabsList>

              <TabsContent value="variables" className="flex-1 overflow-hidden flex flex-col space-y-3 mt-2">
                <ScrollArea className="flex-1">
                  <div className="space-y-3 pr-2">
                    {variables.map((v, i) => (
                      <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                        <div>
                          <Label className="text-[10px]">Variable Name</Label>
                          <Input
                            value={v.name}
                            onChange={(e) => updateVariable(i, "name", e.target.value)}
                            className="h-8 text-xs"
                            placeholder="city_name"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px]">Original Text</Label>
                          <Input
                            value={v.original}
                            onChange={(e) => updateVariable(i, "original", e.target.value)}
                            className="h-8 text-xs"
                            placeholder="New York"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px]">New Value</Label>
                          <Input
                            value={v.value}
                            onChange={(e) => updateVariable(i, "value", e.target.value)}
                            className="h-8 text-xs"
                            placeholder="Los Angeles"
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive"
                          onClick={() => removeVariable(i)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={addVariable} className="text-xs">
                    <Plus className="h-3 w-3 mr-1" /> Add Variable
                  </Button>
                  <Button size="sm" variant="outline" onClick={rebuildTemplate} className="text-xs">
                    <Wand2 className="h-3 w-3 mr-1" /> Rebuild Template
                  </Button>
                </div>

                {/* Data Source Toggle */}
                <div className="border-t pt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={!csvMode ? "default" : "outline"}
                      className="text-xs"
                      onClick={() => setCsvMode(false)}
                    >
                      Single Page
                    </Button>
                    <Button
                      size="sm"
                      variant={csvMode ? "default" : "outline"}
                      className="text-xs"
                      onClick={() => setCsvMode(true)}
                    >
                      <Upload className="h-3 w-3 mr-1" /> Bulk CSV
                    </Button>
                  </div>

                  {csvMode && (
                    <div className="space-y-1">
                      <Label className="text-xs">
                        Paste CSV data (headers must match variable names)
                      </Label>
                      <Textarea
                        value={csvText}
                        onChange={(e) => setCsvText(e.target.value)}
                        rows={4}
                        placeholder={`${variables.map((v) => v.name).join(",")}\nvalue1,value2,value3\nvalue4,value5,value6`}
                        className="text-xs font-mono"
                      />
                      {csvText && (
                        <p className="text-[10px] text-muted-foreground">
                          {parseCsvRows().length} row(s) detected
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  onClick={generatePages}
                  disabled={variables.length === 0}
                  className="bg-gradient-primary border-0 shadow-lg shadow-primary/25"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate & Publish {csvMode ? `(${parseCsvRows().length} pages)` : "(1 page)"}
                </Button>
              </TabsContent>

              <TabsContent value="template" className="flex-1 overflow-hidden mt-2">
                <ScrollArea className="h-full">
                  <div className="relative">
                    <Textarea
                      value={templateHtml}
                      onChange={(e) => setTemplateHtml(e.target.value)}
                      className="font-mono text-xs min-h-[400px]"
                    />
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}

          {/* Step 3: Generating */}
          {step === "generate" && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">
                  Generating & publishing pages...
                </p>
                <p className="text-xs text-muted-foreground">
                  {generatedCount} pages published
                </p>
              </div>
              <Progress value={progress} className="w-64 h-2" />
            </div>
          )}

          {/* Step 4: Done */}
          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="h-14 w-14 rounded-full bg-success/10 flex items-center justify-center">
                <Check className="h-7 w-7 text-success" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-lg font-semibold">All Done!</h3>
                <p className="text-sm text-muted-foreground">
                  {generatedCount} page(s) generated and published to your website.
                </p>
                <p className="text-xs text-muted-foreground">
                  Check your {websiteType} dashboard to see them live.
                </p>
              </div>
              <Button onClick={() => handleClose(false)}>Close</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
