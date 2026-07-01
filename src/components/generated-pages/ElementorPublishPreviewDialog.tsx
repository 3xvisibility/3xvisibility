import { useMemo, useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";

import { Code2, Eye, FileCode2, Palette, UploadCloud, ShieldAlert, Boxes, Package } from "lucide-react";
import {
  buildElementorDebugReport,
  type ElementorWidgetMode,
  type ElementorMapNode,
} from "@/lib/connectors/elementor-engine";
import {
  VisualValidationPanel,
  type ValidationSide,
  type ValidationResult,
} from "@/components/generated-pages/VisualValidationPanel";

interface PreviewPage {
  id: string;
  title: string;
  content: string;
  slug?: string;
}

interface ElementorPublishPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: PreviewPage | null;
  /** Called with the resolved widget mode when the user proceeds to publish. */
  onPublish?: (mode: ElementorWidgetMode, gate?: { overridden: boolean; checkId?: string | null }) => void;
  workspaceId?: string | null;
  templateId?: string | null;
  /** Publish format chosen on the campaign: "elementor" | "gutenberg" | "shopify" | "html". */
  publishFormat?: string | null;
  /** Expected/template render for the visual gate. */
  baseline?: ValidationSide;
  /** Live URL if the page is already published (used as the target render). */
  publishedUrl?: string | null;
}

/** Map the campaign publish format to the Elementor widget mode used for publishing. */
function resolveMode(format?: string | null): ElementorWidgetMode {
  // WordPress publishing is now native Elementor only. HTML-widget mode is no
  // longer available for WordPress publishes.
  return "native";
}

const FORMAT_LABELS: Record<string, string> = {
  elementor: "Native Elementor widgets",
  gutenberg: "Gutenberg blocks",
  shopify: "Shopify section",
  html: "Native Elementor widgets",
};

function RenderableFrame({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const iframe = ref.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8">` +
        `<meta name="viewport" content="width=device-width, initial-scale=1">` +
        `<style>body{margin:0}img{max-width:100%;height:auto}</style>` +
        `</head><body>${html}</body></html>`,
    );
    doc.close();
  }, [html]);
  return (
    <iframe
      ref={ref}
      title="Elementor render preview"
      sandbox="allow-same-origin"
      className="w-full rounded-md border border-border bg-white"
      style={{ height: 520 }}
    />
  );
}

/** Distinct badge color per native widget type for the overlay/map. */
const WIDGET_COLORS: Record<string, string> = {
  heading: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  "text-editor": "bg-slate-500/15 text-slate-600 border-slate-500/30",
  image: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  button: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  "icon-box": "bg-violet-500/15 text-violet-600 border-violet-500/30",
  "image-box": "bg-teal-500/15 text-teal-600 border-teal-500/30",
  testimonial: "bg-pink-500/15 text-pink-600 border-pink-500/30",
  counter: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  "icon-list": "bg-cyan-500/15 text-cyan-600 border-cyan-500/30",
  accordion: "bg-indigo-500/15 text-indigo-600 border-indigo-500/30",
  tabs: "bg-fuchsia-500/15 text-fuchsia-600 border-fuchsia-500/30",
};

function widgetColor(type?: string): string {
  return (type && WIDGET_COLORS[type]) || "bg-muted text-muted-foreground border-border";
}

/** Renders the element → native widget mapping as an indented, color-coded tree. */
function WidgetMap({ mapping, summary }: { mapping: ElementorMapNode[]; summary: Record<string, number> }) {
  if (!mapping.length) {
    return <p className="p-3 text-xs text-muted-foreground">No elements were produced for this page.</p>;
  }
  return (
    <div className="p-3 space-y-3">
      {/* Summary of native widgets produced */}
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(summary).sort((a, b) => b[1] - a[1]).map(([type, n]) => (
          <Badge key={type} variant="outline" className={`text-[10px] gap-1 ${widgetColor(type)}`}>
            <Package className="h-3 w-3" /> {type} × {n}
          </Badge>
        ))}
        {Object.keys(summary).length === 0 && (
          <span className="text-xs text-muted-foreground">No widgets mapped.</span>
        )}
      </div>

      {/* Indented tree overlay */}
      <div className="font-mono text-[11px] space-y-0.5">
        {mapping.map((node, i) => (
          <div
            key={i}
            className="flex items-center gap-2 py-0.5 rounded hover:bg-muted/40"
            style={{ paddingLeft: `${node.depth * 16}px` }}
          >
            {node.elType === "container" ? (
              <span className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                <Boxes className="h-3 w-3" /> {node.label}
              </span>
            ) : (
              <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${widgetColor(node.widgetType)}`}>
                {node.widgetType}
              </span>
            )}
            {node.label && node.elType === "widget" && (
              <span className="truncate text-muted-foreground">{node.label}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ElementorPublishPreviewDialog({
  open,
  onOpenChange,
  page,
  onPublish,
  workspaceId,
  templateId,
  publishFormat,
  baseline = {},
  publishedUrl,
}: ElementorPublishPreviewDialogProps) {
  const mode = resolveMode(publishFormat);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [override, setOverride] = useState(false);

  const report = useMemo(() => {
    if (!page) return null;
    return buildElementorDebugReport(page.content || "", mode);
  }, [page, mode]);

  // Reset gate state whenever the dialog target changes.
  useEffect(() => {
    setValidation(null);
    setOverride(false);
  }, [page?.id, mode]);

  // Debug logs: dump the element -> native widget mapping to the console when the
  // dialog opens, so the mapping is inspectable outside the UI too.
  useEffect(() => {
    if (!open || !report) return;
    console.groupCollapsed(
      `%c[Elementor Debug] ${page?.title ?? ""} — ${report.widgetCount} widgets / ${report.containerCount} containers`,
      "color:#6366f1;font-weight:bold",
    );
    console.table(report.widgetSummary);
    for (const n of report.mapping) {
      const indent = "  ".repeat(n.depth);
      if (n.elType === "widget") {
        console.log(`%c${indent}▸ ${n.widgetType}`, "color:#0ea5e9", n.label);
      } else {
        console.log(`%c${indent}▦ container (${n.label})`, "color:#64748b");
      }
    }
    console.groupEnd();
  }, [open, report, page?.title]);

  const target: ValidationSide = publishedUrl
    ? { url: publishedUrl }
    : { html: report?.renderable || page?.content || "" };

  const gateFailed = validation?.status === "failed";
  const publishBlocked = gateFailed && !override;

  if (!page) return null;



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base truncate">
            Elementor Preview — {page.title}
          </DialogTitle>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {page.slug && <Badge variant="outline" className="text-[10px]">/{page.slug}</Badge>}
            {report && (
              <>
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Palette className="h-3 w-3" /> CSS {report.css.length.toLocaleString()} chars
                </Badge>
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Code2 className="h-3 w-3" /> JSON {report.dataLength.toLocaleString()} chars
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {report.containerCount} containers · {report.widgetCount} widgets
                </Badge>
              </>
            )}
          </div>
        </DialogHeader>

        {/* Publishing format (chosen on the campaign — not editable here) */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-center justify-between gap-3">
          <div>
            <Label className="text-xs font-semibold block">Publishing format</Label>
            <span className="text-xs text-muted-foreground">
              {mode === "native"
                ? "Native Elementor JSON only — editable inside Elementor; no HTML widgets or fallback HTML mode."
                : "Native Elementor JSON only — editable inside Elementor; no HTML widgets or fallback HTML mode."}
            </span>
          </div>
          <Badge variant="secondary" className="shrink-0 text-[11px]">
            {FORMAT_LABELS[publishFormat || "elementor"] || "Native Elementor widgets"}
          </Badge>
        </div>


        {/* Visual-validation gate (98% similarity) */}
        <VisualValidationPanel
          workspaceId={workspaceId}
          generatedPageId={page.id}
          templateId={templateId}
          baseline={baseline}
          target={target}
          threshold={0.98}
          onResult={(r) => { setValidation(r); setOverride(false); }}
        />

        <Tabs defaultValue="preview" className="flex-1 min-h-0 flex flex-col">

          <TabsList className="self-start">
            <TabsTrigger value="preview" className="gap-1 text-xs">
              <Eye className="h-3.5 w-3.5" /> Preview
            </TabsTrigger>
            <TabsTrigger value="map" className="gap-1 text-xs">
              <Boxes className="h-3.5 w-3.5" /> Widget Map
            </TabsTrigger>
            <TabsTrigger value="css" className="gap-1 text-xs">
              <Palette className="h-3.5 w-3.5" /> CSS
            </TabsTrigger>
            <TabsTrigger value="html" className="gap-1 text-xs">
              <FileCode2 className="h-3.5 w-3.5" /> HTML
            </TabsTrigger>
            <TabsTrigger value="json" className="gap-1 text-xs">
              <Code2 className="h-3.5 w-3.5" /> Elementor JSON
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 mt-3">
            <TabsContent value="preview" className="m-0">
              {report && <RenderableFrame html={report.renderable} />}
            </TabsContent>
            <TabsContent value="css" className="m-0">
              <ScrollArea className="h-[520px] rounded-md border border-border bg-muted/30">
                <pre className="p-3 text-[11px] font-mono whitespace-pre-wrap break-words">
                  {report?.css || "/* No <style> CSS found in this page's content */"}
                </pre>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="html" className="m-0">
              <ScrollArea className="h-[520px] rounded-md border border-border bg-muted/30">
                <pre className="p-3 text-[11px] font-mono whitespace-pre-wrap break-words">
                  {report?.renderable || ""}
                </pre>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="json" className="m-0">
              <ScrollArea className="h-[520px] rounded-md border border-border bg-muted/30">
                <pre className="p-3 text-[11px] font-mono whitespace-pre-wrap break-words">
                  {report?.elementorData || "[]"}
                </pre>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="gap-2 flex-col sm:flex-row sm:items-center">
          {gateFailed && (
            <label className="flex items-center gap-2 text-xs text-destructive mr-auto cursor-pointer">
              <Checkbox checked={override} onCheckedChange={(v) => setOverride(!!v)} />
              <ShieldAlert className="h-3.5 w-3.5" />
              Override failed visual gate and publish anyway
            </label>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {onPublish && (
            <Button
              onClick={() => onPublish(mode, { overridden: override, checkId: validation?.check_id })}
              disabled={publishBlocked}
              className="gap-1"
            >
              <UploadCloud className="h-4 w-4" />
              {publishBlocked ? "Blocked by visual gate" : "Publish"}
            </Button>
          )}
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
