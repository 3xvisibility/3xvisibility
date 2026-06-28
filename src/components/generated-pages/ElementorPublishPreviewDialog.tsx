import { useMemo, useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Code2, Eye, FileCode2, Palette, UploadCloud, ShieldAlert } from "lucide-react";
import {
  buildElementorDebugReport,
  type ElementorWidgetMode,
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
  /** Called with the chosen widget mode when the user proceeds to publish. */
  onPublish?: (mode: ElementorWidgetMode) => void;
  workspaceId?: string | null;
  templateId?: string | null;
  /** Expected/template render for the visual gate. */
  baseline?: ValidationSide;
  /** Live URL if the page is already published (used as the target render). */
  publishedUrl?: string | null;
}

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

export function ElementorPublishPreviewDialog({
  open,
  onOpenChange,
  page,
  onPublish,
  workspaceId,
  templateId,
  baseline = {},
  publishedUrl,
}: ElementorPublishPreviewDialogProps) {
  const [mode, setMode] = useState<ElementorWidgetMode>("html");
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

        {/* Widget mode selector */}
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <Label className="text-xs font-semibold mb-2 block">Elementor widget mode</Label>
          <RadioGroup
            value={mode}
            onValueChange={(v) => setMode(v as ElementorWidgetMode)}
            className="grid sm:grid-cols-2 gap-2"
          >
            <label
              htmlFor="mode-html"
              className={`flex items-start gap-2 rounded-md border p-2.5 cursor-pointer text-xs ${
                mode === "html" ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <RadioGroupItem value="html" id="mode-html" className="mt-0.5" />
              <span>
                <span className="font-medium block">Single HTML widget</span>
                <span className="text-muted-foreground">
                  Embeds full markup + CSS in one widget. Renders 1:1 with the template design.
                </span>
              </span>
            </label>
            <label
              htmlFor="mode-native"
              className={`flex items-start gap-2 rounded-md border p-2.5 cursor-pointer text-xs ${
                mode === "native" ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <RadioGroupItem value="native" id="mode-native" className="mt-0.5" />
              <span>
                <span className="font-medium block">Native Elementor widgets</span>
                <span className="text-muted-foreground">
                  Maps markup to editable Elementor widgets. Best for in-Elementor editing.
                </span>
              </span>
            </label>
          </RadioGroup>
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
              onClick={() => onPublish(mode)}
              disabled={publishBlocked}
              className="gap-1"
            >
              <UploadCloud className="h-4 w-4" />
              {publishBlocked ? "Blocked by visual gate" : "Publish with this mode"}
            </Button>
          )}
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
