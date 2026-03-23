import { useState, useRef, useEffect, useCallback } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  Eye,
  Code,
  Tag,
  X,
  MousePointer,
  HelpCircle,
  ArrowRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

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

/** Popover for assigning a variable to selected text inside the preview */
function VisualSelectionPopover({
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
      className="fixed z-[100] bg-popover border border-border rounded-lg shadow-xl p-3 space-y-2 w-64"
      style={{ left: position.x, top: position.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1">
          <Tag className="h-3 w-3 text-primary" /> Create Variable
        </p>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>
      <p className="text-[10px] bg-muted rounded px-2 py-1 truncate font-mono">"{selectedText}"</p>
      <p className="text-[10px] text-muted-foreground">
        💡 Name this variable (e.g. "city", "price"). This text will change for each generated page.
      </p>
      <div className="flex gap-1.5">
        <Input
          ref={inputRef}
          placeholder="e.g., city_name"
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

/** Visual preview pane – shows rendered HTML with highlighted variables, code toggle for advanced users */
function TemplatePreviewPane({
  templateHtml,
  variables,
  onChange,
  onAddVariable,
}: {
  templateHtml: string;
  variables: VariableEntry[];
  onChange: (html: string) => void;
  onAddVariable?: (name: string, original: string) => void;
}) {
  const [showCode, setShowCode] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [selectionPopover, setSelectionPopover] = useState<{
    position: { x: number; y: number };
    text: string;
  } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();

  // Listen for messages from the iframe (text selection)
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "template-text-selected") {
        const iframe = iframeRef.current;
        if (!iframe) return;
        const iframeRect = iframe.getBoundingClientRect();
        setSelectionPopover({
          text: e.data.text,
          position: {
            x: Math.min(iframeRect.left + e.data.x, window.innerWidth - 280),
            y: Math.min(iframeRect.top + e.data.y, window.innerHeight - 150),
          },
        });
      }
      if (e.data?.type === "template-selection-cleared") {
        // Don't clear if popover is open
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Handle variable assignment from visual selection
  const handleVisualAssign = useCallback(
    (varName: string) => {
      if (!selectionPopover) return;
      const selectedText = selectionPopover.text;

      // Replace in template HTML
      const escapedValue = selectedText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escapedValue, "g");
      const newHtml = templateHtml.replace(regex, `{${varName}}`);
      onChange(newHtml);

      // Notify parent to add variable entry
      if (onAddVariable) {
        onAddVariable(varName, selectedText);
      }

      setSelectionPopover(null);
      toast({
        title: "Variable created",
        description: `"${selectedText.slice(0, 30)}${selectedText.length > 30 ? "…" : ""}" → {${varName}}`,
      });
    },
    [selectionPopover, templateHtml, onChange, onAddVariable, toast]
  );

  // AI-powered template editing
  const handleAiEdit = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-caption", {
        body: {
          pages: [{
            id: "ai-edit",
            title: `AI_TEMPLATE_EDIT:${aiPrompt}`,
            description: templateHtml.slice(0, 6000),
            url: "",
          }],
          tone: "professional",
          length: "long",
          _custom_prompt: `You are a web template editor. The user wants to modify an HTML template.

CURRENT TEMPLATE HTML:
${templateHtml.slice(0, 8000)}

EXISTING VARIABLES (keep these as {variable_name} placeholders):
${variables.map(v => `{${v.name}}`).join(", ")}

USER REQUEST: "${aiPrompt}"

RULES:
- Apply the user's requested changes to the HTML template
- KEEP all existing {variable_name} placeholders intact — do NOT replace them with real values
- Preserve the overall page structure and design
- You may add, remove, or modify HTML elements as requested
- Keep styles inline or preserve existing class names
- Return ONLY the modified HTML, nothing else — no explanation, no markdown code blocks
- If the user asks to add a section, add it in a logical place
- If the user asks to change text, change it directly in the HTML`,
        },
      });

      if (data?.results?.[0]?.caption) {
        let newHtml = data.results[0].caption;
        newHtml = newHtml.replace(/^```html?\n?/i, "").replace(/\n?```$/i, "").trim();
        onChange(newHtml);
        setAiPrompt("");
        toast({ title: "Template updated!", description: "AI applied your changes." });
      } else {
        throw new Error("No response from AI");
      }
    } catch (err: any) {
      toast({ title: "AI edit failed", description: err.message, variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  // Highlight {variable} placeholders in the visual preview with interactive badges
  const highlightedHtml = (() => {
    let html = templateHtml;
    // Highlight known variables
    for (const v of variables) {
      const placeholder = `{${v.name}}`;
      html = html.split(placeholder).join(
        `<span class="pgvar-badge" title="Variable: {${v.name}} — will be replaced with data for each generated page"><span class="pgvar-label">${placeholder}</span></span>`
      );
    }
    // Highlight any remaining {variable} patterns
    html = html.replace(
      /\{([a-z_][a-z0-9_]*)\}/gi,
      (match) => {
        if (match.includes('class="pgvar-badge"') || match.includes('pgvar-label')) return match;
        return `<span class="pgvar-badge" title="Variable: ${match} — will be replaced with data"><span class="pgvar-label">${match}</span></span>`;
      }
    );
    return html;
  })();

  const previewDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { font-family: system-ui, -apple-system, sans-serif; padding: 16px; margin: 0; font-size: 14px; color: #1a1a2e; line-height: 1.6; }
  img { max-width: 100%; height: auto; }
  .pgvar-badge {
    display: inline;
    background: linear-gradient(135deg, hsl(263 70% 95%), hsl(263 70% 90%));
    color: hsl(263 70% 40%);
    padding: 2px 6px;
    border-radius: 6px;
    font-weight: 700;
    cursor: pointer;
    border: 1.5px dashed hsl(263 70% 60%);
    transition: all 0.15s ease;
  }
  .pgvar-badge:hover {
    background: linear-gradient(135deg, hsl(263 70% 90%), hsl(263 70% 85%));
    outline: 2px solid hsl(263 70% 55%);
    outline-offset: 2px;
    transform: scale(1.02);
  }
  .pgvar-label {
    font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', monospace;
    font-size: 0.85em;
    letter-spacing: 0.02em;
  }
  ::selection { background: hsl(221 83% 53% / 0.3); }
  .select-hint {
    position: fixed; bottom: 12px; left: 50%; transform: translateX(-50%);
    background: hsl(221 83% 53%); color: #fff; font-size: 11px; padding: 6px 14px;
    border-radius: 20px; z-index: 100; pointer-events: none; opacity: 0.9;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15); white-space: nowrap;
  }
</style>
</head><body>
<div class="select-hint">👆 Select any text to make it a variable</div>
${highlightedHtml}
<script>
  document.addEventListener('mouseup', function(e) {
    var sel = window.getSelection();
    var text = sel ? sel.toString().trim() : '';
    if (text && text.length > 0 && text.length < 300) {
      var range = sel.getRangeAt(0);
      var rect = range.getBoundingClientRect();
      window.parent.postMessage({
        type: 'template-text-selected',
        text: text,
        x: rect.left + rect.width / 2,
        y: rect.bottom + 8,
      }, '*');
    }
  });
  document.addEventListener('mousedown', function() {
    window.parent.postMessage({ type: 'template-selection-cleared' }, '*');
  });
  // Hide hint after 5 seconds
  setTimeout(function() {
    var hint = document.querySelector('.select-hint');
    if (hint) hint.style.display = 'none';
  }, 5000);
</script>
</body></html>`;

  return (
    <div className="flex min-h-0 flex-col h-full gap-2">
      {/* AI Edit Input */}
      <div data-tour="template-ai-edit" className="flex flex-col sm:flex-row sm:items-center gap-2 bg-muted/50 rounded-lg p-2">
        <Wand2 className="h-4 w-4 text-primary shrink-0" />
        <Input
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAiEdit(); } }}
          placeholder="Describe changes… e.g. 'Add a FAQ section'"
          className="h-8 text-xs border-0 bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/60"
          disabled={aiLoading}
        />
        <Button
          size="sm"
          onClick={handleAiEdit}
          disabled={aiLoading || !aiPrompt.trim()}
          className="h-8 text-xs gap-1 bg-gradient-primary border-0 shrink-0 w-full sm:w-auto"
        >
          {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {aiLoading ? "Applying..." : "Apply"}
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {showCode
            ? "Edit raw HTML — for advanced users"
            : (
              <>
                <MousePointer className="inline h-3 w-3 mr-0.5 text-primary" />
                <span className="text-primary font-medium">Select text</span> to add variables — shown as{" "}
                <span className="font-mono text-primary bg-primary/10 px-1 rounded text-[10px]">{"{variable}"}</span> badges
              </>
            )}
        </p>
        <div className="flex items-center gap-1">
          <Button
            data-tour="template-code-toggle"
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1.5"
            onClick={() => setShowCode(!showCode)}
          >
            {showCode ? <Eye className="h-3 w-3" /> : <Code className="h-3 w-3" />}
            {showCode ? "Visual" : "Code"}
          </Button>
        </div>
      </div>

      {showCode ? (
        <ScrollArea className="flex-1 border rounded-lg min-h-[260px]">
          <Textarea
            value={templateHtml}
            onChange={(e) => onChange(e.target.value)}
            className="font-mono text-xs min-h-[260px] sm:min-h-[350px] border-0 focus-visible:ring-0"
          />
        </ScrollArea>
      ) : (
        <div data-tour="template-preview" className="flex-1 border rounded-lg overflow-hidden bg-white relative min-h-[260px] sm:min-h-[350px]">
          <iframe
            ref={iframeRef}
            srcDoc={previewDoc}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
            title="Template preview — select text to add variables"
          />
        </div>
      )}

      {/* Variable badges summary under preview */}
      {variables.length > 0 && (
        <div data-tour="template-var-badges" className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] text-muted-foreground font-medium">Variables:</span>
          {variables.map((v) => (
            <TooltipProvider key={v.name}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="font-mono text-[10px] border-primary/30 text-primary cursor-help">
                    {`{${v.name}}`}
                    <ArrowRight className="h-2 w-2 mx-0.5" />
                    <span className="text-muted-foreground font-sans">{v.original.slice(0, 15)}{v.original.length > 15 ? "…" : ""}</span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Replaces "{v.original}" → will change for each generated page</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      )}

      {/* Selection Popover */}
      {selectionPopover && (
        <VisualSelectionPopover
          position={selectionPopover.position}
          selectedText={selectionPopover.text}
          onAssign={handleVisualAssign}
          onClose={() => setSelectionPopover(null)}
        />
      )}
    </div>
  );
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
  const { currentWorkspace } = useWorkspace();

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
          body: { website_id: websiteId, pages: batchPages, workspace_id: currentWorkspace?.id },
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
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
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

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
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
              <TabsList className="grid h-auto w-full grid-cols-3">
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
                        <div className="flex items-center justify-between gap-2">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                        </div>
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <Label className="text-[10px]">Values (comma-separated) — {v.values.length} value(s)</Label>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-[10px] gap-1 shrink-0"
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

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t">
                  <Button size="sm" variant="outline" onClick={addVariable} className="text-xs w-full sm:w-auto">
                    <Plus className="h-3 w-3 mr-1" /> Add Variable
                  </Button>
                  <Button size="sm" variant="outline" onClick={rebuildTemplate} className="text-xs w-full sm:w-auto">
                    <RefreshCw className="h-3 w-3 mr-1" /> Rebuild Template
                  </Button>
                </div>

                <div className="bg-muted/50 rounded-lg p-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs text-muted-foreground">
                    <strong>{totalPages}</strong> page(s) will be generated
                  </span>
                  <Button
                    onClick={generatePages}
                    disabled={generating}
                    size="sm"
                    className="bg-gradient-primary border-0 shadow-lg shadow-primary/25 w-full sm:w-auto"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    Generate & Publish ({totalPages})
                  </Button>
                </div>
              </TabsContent>

              {/* Template Preview Tab — Visual by default */}
              <TabsContent value="preview" className="flex-1 overflow-hidden mt-2 flex flex-col">
                
                <TemplatePreviewPane
                  templateHtml={templateHtml}
                  variables={variables}
                  onChange={setTemplateHtml}
                  onAddVariable={(name, original) => {
                    setVariables((prev) => {
                      if (prev.some((v) => v.name === name)) return prev;
                      return [...prev, { name, original, values: [original] }];
                    });
                  }}
                  
                />
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
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="h-7 w-7 text-primary" />
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
                          <Check className="h-3 w-3 text-primary shrink-0" />
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
