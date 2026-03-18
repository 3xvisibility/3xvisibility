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
  Wand2,
  MapPin,
  Globe,
  RefreshCw,
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
  elementor_data?: string;
  elementor_edit_mode?: string;
  page_template?: string;
  raw_meta?: Record<string, any>;
}

interface VariableEntry {
  name: string;
  original: string;
  values: string[]; // Multiple values for bulk generation
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
  const [templateElementorData, setTemplateElementorData] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [csvMode, setCsvMode] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [generatedCount, setGeneratedCount] = useState(0);
  const [publishResults, setPublishResults] = useState<{ title: string; status: string; external_url?: string; error?: string }[]>([]);
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
          _custom_prompt: `You are a Local SEO expert. Analyze this web page and identify dynamic variables that can be replaced to create location-specific SEO pages.

Page title: ${page.title}
URL: ${page.url}
Content: ${snippet}

Focus on finding:
1. City/town names (e.g. "New York", "Mumbai", "London")
2. State/region/province names
3. Country names  
4. Service/business type names (e.g. "plumbing", "web design")
5. Phone numbers, addresses
6. Area-specific descriptions
7. Prices or rates if present

Return a JSON array of variables:
[{"name": "city_name", "original": "New York", "suggested_values": ["Los Angeles", "Chicago", "Houston", "Phoenix"]}, {"name": "service_type", "original": "plumbing", "suggested_values": ["electrician", "HVAC repair", "roofing"]}]

Rules:
- name: use snake_case, descriptive (city_name, state_name, service_type, phone_number, etc.)
- original: the exact text found in the content
- suggested_values: 3-5 alternative values for local SEO generation
- Find 3-8 key variables
- Only return the JSON array, nothing else.`,
        },
      });

      let parsedVars: VariableEntry[] = [];
      if (data?.results?.[0]?.caption) {
        const caption = data.results[0].caption;
        const jsonMatch = caption.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed)) {
            parsedVars = parsed.map((v: any) => ({
              name: v.name || "variable",
              original: v.original || "",
              values: v.suggested_values?.length ? [v.original || "", ...v.suggested_values] : [v.original || ""],
            }));
          }
        }
      }

      setVariables(parsedVars);

      // Build template HTML
      let html = page.content;
      let elData = page.elementor_data || "";
      const sortedVars = [...parsedVars].sort((a, b) => b.original.length - a.original.length);
      for (const v of sortedVars) {
        if (v.original) {
          html = html.split(v.original).join(`{${v.name}}`);
          if (elData) {
            elData = elData.split(v.original).join(`{${v.name}}`);
          }
        }
      }
      setTemplateHtml(html || page.content);
      setTemplateElementorData(elData);
      setStep("edit");

      if (parsedVars.length > 0) {
        toast({ title: `${parsedVars.length} variables detected!`, description: "Review and add city/service values to generate pages." });
      }
    } catch (err: any) {
      toast({ title: "Detection failed", description: err.message, variant: "destructive" });
    } finally {
      setDetecting(false);
    }
  };

  const rebuildTemplate = () => {
    let html = page.content;
    let elData = page.elementor_data || "";
    const sorted = [...variables].sort((a, b) => b.original.length - a.original.length);
    for (const v of sorted) {
      if (v.original) {
        html = html.split(v.original).join(`{${v.name}}`);
        if (elData) elData = elData.split(v.original).join(`{${v.name}}`);
      }
    }
    setTemplateHtml(html);
    setTemplateElementorData(elData);
  };

  const addVariable = () => {
    setVariables((prev) => [...prev, { name: `variable_${prev.length + 1}`, original: "", values: [""] }]);
  };

  const removeVariable = (index: number) => {
    setVariables((prev) => prev.filter((_, i) => i !== index));
  };

  const updateVariable = (index: number, field: "name" | "original", value: string) => {
    setVariables((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  };

  const updateVariableValues = (index: number, valuesStr: string) => {
    setVariables((prev) =>
      prev.map((v, i) => (i === index ? { ...v, values: valuesStr.split(",").map(s => s.trim()).filter(Boolean) } : v))
    );
  };

  // AI auto-generate more values for a variable
  const aiSuggestValues = async (index: number) => {
    setAiGenerating(true);
    try {
      const v = variables[index];
      const { data } = await supabase.functions.invoke("generate-caption", {
        body: {
          pages: [{ id: "suggest", title: `SUGGEST_VALUES:${v.name}`, description: v.original, url: "" }],
          tone: "professional",
          length: "medium",
          _custom_prompt: `You are a Local SEO expert. Given a variable "${v.name}" with original value "${v.original}" and existing values: ${v.values.join(", ")}

Generate 10-15 MORE unique values for this variable to create local SEO pages.
- If it's a city variable, suggest popular cities in the same country
- If it's a service, suggest related services
- If it's a region/state, suggest nearby regions

Return ONLY a comma-separated list of values, nothing else. Example: "value1, value2, value3"`,
        },
      });

      if (data?.results?.[0]?.caption) {
        const suggested = data.results[0].caption.split(",").map((s: string) => s.trim()).filter(Boolean);
        const merged = [...new Set([...v.values, ...suggested])];
        setVariables((prev) =>
          prev.map((vr, i) => (i === index ? { ...vr, values: merged } : vr))
        );
        toast({ title: `${suggested.length} values added to ${v.name}` });
      }
    } catch (err: any) {
      toast({ title: "AI suggestion failed", description: err.message, variant: "destructive" });
    } finally {
      setAiGenerating(false);
    }
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

  // Generate all combinations from variable values
  const generateCombinations = (): Record<string, string>[] => {
    if (variables.length === 0) return [{}];

    const combos: Record<string, string>[] = [{}];
    for (const v of variables) {
      const vals = v.values.length > 0 ? v.values : [v.original];
      const newCombos: Record<string, string>[] = [];
      for (const combo of combos) {
        for (const val of vals) {
          newCombos.push({ ...combo, [v.name]: val });
        }
      }
      combos.length = 0;
      combos.push(...newCombos);
    }
    return combos;
  };

  const totalPages = csvMode ? parseCsvRows().length : generateCombinations().length;

  const generatePages = async () => {
    setGenerating(true);
    setProgress(10);
    setStep("generate");
    setPublishResults([]);

    try {
      const rows = csvMode ? parseCsvRows() : generateCombinations();

      if (rows.length === 0) {
        toast({ title: "No data to generate", variant: "destructive" });
        setGenerating(false);
        setStep("edit");
        return;
      }

      let generated = 0;
      const batchSize = 5;
      const allResults: typeof publishResults = [];

      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const batchPages = batch.map((row) => {
          let html = templateHtml;
          let elData = templateElementorData;
          for (const [key, val] of Object.entries(row)) {
            html = html.split(`{${key}}`).join(val);
            if (elData) elData = elData.split(`{${key}}`).join(val);
          }

          // Build title from first variable or use page title with replacement
          let title = page.title;
          for (const [key, val] of Object.entries(row)) {
            const v = variables.find(vr => vr.name === key);
            if (v?.original) {
              title = title.split(v.original).join(val);
            }
          }
          // If title didn't change, prepend first variable value
          if (title === page.title && Object.values(row).length > 0) {
            title = `${Object.values(row)[0]} - ${page.title}`;
          }

          const slug = title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

          return {
            title,
            content: html,
            slug,
            seo_title: title,
            seo_description: `${title} - Professional services in ${row.city_name || row.location || Object.values(row)[0] || "your area"}`,
            // Pass Elementor meta for design preservation
            elementor_data: elData || undefined,
            elementor_edit_mode: page.elementor_edit_mode || undefined,
            page_template: page.page_template || undefined,
          };
        });

        const { data, error } = await supabase.functions.invoke("publish-pages", {
          body: { website_id: websiteId, pages: batchPages },
        });

        if (data?.results) {
          allResults.push(...data.results);
        }
        if (error) {
          console.error("Publish batch error:", error);
        }

        generated += batch.length;
        setGeneratedCount(generated);
        setProgress(10 + Math.round((generated / rows.length) * 90));
        setPublishResults([...allResults]);
      }

      setStep("done");
      const successCount = allResults.filter(r => r.status === "published").length;
      const failCount = allResults.filter(r => r.status === "failed").length;
      toast({
        title: `${successCount} page(s) published!`,
        description: failCount > 0 ? `${failCount} failed` : undefined,
        variant: failCount > 0 && successCount === 0 ? "destructive" : "default",
      });
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
      setStep("edit");
    } finally {
      setGenerating(false);
    }
  };

  const handleClose = (o: boolean) => {
    if (!o) {
      setStep("detect");
      setVariables([]);
      setTemplateHtml("");
      setTemplateElementorData("");
      setProgress(0);
      setCsvMode(false);
      setCsvText("");
      setGeneratedCount(0);
      setPublishResults([]);
    }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            {step === "detect" && "Local SEO Page Generator"}
            {step === "edit" && "Configure Variables & Generate"}
            {step === "generate" && "Generating & Publishing..."}
            {step === "done" && "Generation Complete"}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Source: {page.title}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-3">
          {/* Step 1: Detect */}
          {step === "detect" && (
            <div className="flex flex-col items-center justify-center py-6 space-y-4">
              <div className="text-center space-y-2">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Globe className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-sm font-semibold">AI Local SEO Variable Detection</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  AI will scan this page and identify location-based variables (city, state, service, etc.)
                  that can be replaced to generate multiple SEO-optimized pages with the <strong>same design</strong>.
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 max-w-sm text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">How it works:</p>
                <p>1. AI detects city names, services, regions in your page</p>
                <p>2. You add multiple cities/services as new values</p>
                <p>3. Pages are generated with same design + new data</p>
                <p>4. Elementor/page builder design is preserved</p>
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
                  {detecting ? "Scanning page..." : "Auto-Detect Variables"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setTemplateHtml(page.content);
                    setTemplateElementorData(page.elementor_data || "");
                    setStep("edit");
                  }}
                >
                  Manual Setup
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Edit variables */}
          {step === "edit" && (
            <Tabs defaultValue="variables" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="variables" className="text-xs">Variables ({variables.length})</TabsTrigger>
                <TabsTrigger value="preview" className="text-xs">Template</TabsTrigger>
                <TabsTrigger value="data" className="text-xs">Data Source</TabsTrigger>
              </TabsList>

              {/* Variables Tab */}
              <TabsContent value="variables" className="flex-1 overflow-hidden flex flex-col space-y-2 mt-2">
                <ScrollArea className="flex-1">
                  <div className="space-y-4 pr-2">
                    {variables.map((v, i) => (
                      <div key={i} className="border rounded-lg p-3 space-y-2 bg-card">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-[10px] font-mono">{`{${v.name}}`}</Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-destructive"
                            onClick={() => removeVariable(i)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[10px]">Variable Name</Label>
                            <Input
                              value={v.name}
                              onChange={(e) => updateVariable(i, "name", e.target.value)}
                              className="h-7 text-xs"
                              placeholder="city_name"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px]">Original Text</Label>
                            <Input
                              value={v.original}
                              onChange={(e) => updateVariable(i, "original", e.target.value)}
                              className="h-7 text-xs"
                              placeholder="New York"
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-[10px]">Values (comma-separated) — {v.values.length} value(s)</Label>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[10px] gap-1"
                              onClick={() => aiSuggestValues(i)}
                              disabled={aiGenerating}
                            >
                              {aiGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                              AI Suggest
                            </Button>
                          </div>
                          <Textarea
                            value={v.values.join(", ")}
                            onChange={(e) => updateVariableValues(i, e.target.value)}
                            rows={2}
                            className="text-xs font-mono"
                            placeholder="New York, Los Angeles, Chicago, Houston, Phoenix"
                          />
                        </div>
                      </div>
                    ))}

                    {variables.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground text-xs">
                        No variables detected. Click "Add Variable" to create one manually.
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button size="sm" variant="outline" onClick={addVariable} className="text-xs">
                    <Plus className="h-3 w-3 mr-1" /> Add Variable
                  </Button>
                  <Button size="sm" variant="outline" onClick={rebuildTemplate} className="text-xs">
                    <RefreshCw className="h-3 w-3 mr-1" /> Rebuild Template
                  </Button>
                </div>

                <div className="bg-muted/50 rounded-lg p-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    <strong>{totalPages}</strong> page(s) will be generated
                  </span>
                  <Button
                    onClick={generatePages}
                    disabled={generating}
                    size="sm"
                    className="bg-gradient-primary border-0 shadow-lg shadow-primary/25"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    Generate & Publish ({totalPages})
                  </Button>
                </div>
              </TabsContent>

              {/* Template Preview Tab */}
              <TabsContent value="preview" className="flex-1 overflow-hidden mt-2">
                <ScrollArea className="h-full">
                  <Textarea
                    value={templateHtml}
                    onChange={(e) => setTemplateHtml(e.target.value)}
                    className="font-mono text-xs min-h-[400px]"
                  />
                </ScrollArea>
              </TabsContent>

              {/* Data Source Tab */}
              <TabsContent value="data" className="flex-1 overflow-hidden flex flex-col space-y-3 mt-2">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={!csvMode ? "default" : "outline"}
                    className="text-xs"
                    onClick={() => setCsvMode(false)}
                  >
                    <MapPin className="h-3 w-3 mr-1" /> Variable Combinations
                  </Button>
                  <Button
                    size="sm"
                    variant={csvMode ? "default" : "outline"}
                    className="text-xs"
                    onClick={() => setCsvMode(true)}
                  >
                    <Upload className="h-3 w-3 mr-1" /> CSV Upload
                  </Button>
                </div>

                {!csvMode ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Pages will be generated for all combinations of your variable values.
                      For example, if you have 5 cities and 3 services, {5 * 3} = 15 pages will be created.
                    </p>
                    <div className="border rounded-lg p-3 space-y-2 bg-card">
                      <p className="text-xs font-medium">Current combinations:</p>
                      {variables.map((v) => (
                        <div key={v.name} className="flex items-center gap-2 text-xs">
                          <Badge variant="outline" className="font-mono text-[10px]">{v.name}</Badge>
                          <span className="text-muted-foreground">{v.values.length} value(s)</span>
                        </div>
                      ))}
                      <p className="text-xs font-semibold text-primary pt-1">
                        Total: {totalPages} page(s)
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 flex-1">
                    <Label className="text-xs">
                      Paste CSV data (headers must match variable names)
                    </Label>
                    <Textarea
                      value={csvText}
                      onChange={(e) => setCsvText(e.target.value)}
                      rows={8}
                      placeholder={`${variables.map((v) => v.name).join(",")}\nvalue1,value2,value3\nvalue4,value5,value6`}
                      className="text-xs font-mono flex-1"
                    />
                    {csvText && (
                      <p className="text-[10px] text-muted-foreground">
                        {parseCsvRows().length} row(s) detected
                      </p>
                    )}
                  </div>
                )}

                <Button
                  onClick={generatePages}
                  disabled={generating}
                  className="bg-gradient-primary border-0 shadow-lg shadow-primary/25"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate & Publish ({totalPages} pages)
                </Button>
              </TabsContent>
            </Tabs>
          )}

          {/* Step 3: Generating */}
          {step === "generate" && (
            <div className="flex flex-col items-center justify-center py-6 space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">Generating & publishing pages...</p>
                <p className="text-xs text-muted-foreground">
                  {generatedCount} / {totalPages} pages processed
                </p>
              </div>
              <Progress value={progress} className="w-64 h-2" />
              {publishResults.length > 0 && (
                <ScrollArea className="w-full max-h-32">
                  <div className="space-y-1 px-2">
                    {publishResults.slice(-5).map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        {r.status === "published" ? (
                          <Check className="h-3 w-3 text-primary shrink-0" />
                        ) : (
                          <span className="h-3 w-3 rounded-full bg-destructive shrink-0" />
                        )}
                        <span className="truncate">{r.title}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

          {/* Step 4: Done */}
          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-6 space-y-4">
              <div className="h-14 w-14 rounded-full bg-green-500/10 flex items-center justify-center">
                <Check className="h-7 w-7 text-green-500" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-lg font-semibold">All Done!</h3>
                <p className="text-sm text-muted-foreground">
                  {publishResults.filter(r => r.status === "published").length} page(s) published successfully.
                </p>
                {publishResults.filter(r => r.status === "failed").length > 0 && (
                  <p className="text-xs text-destructive">
                    {publishResults.filter(r => r.status === "failed").length} page(s) failed.
                  </p>
                )}
              </div>

              {publishResults.length > 0 && (
                <ScrollArea className="w-full max-h-40">
                  <div className="space-y-1 px-2">
                    {publishResults.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs border-b pb-1">
                        {r.status === "published" ? (
                          <Check className="h-3 w-3 text-green-500 shrink-0" />
                        ) : (
                          <span className="h-3 w-3 rounded-full bg-destructive shrink-0" />
                        )}
                        <span className="truncate flex-1">{r.title}</span>
                        {r.external_url && (
                          <a href={r.external_url} target="_blank" rel="noopener" className="text-primary underline shrink-0">
                            View
                          </a>
                        )}
                        {r.error && <span className="text-destructive text-[10px] truncate">{r.error}</span>}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              <Button onClick={() => handleClose(false)}>Close</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
