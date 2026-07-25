import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, ArrowRight, X } from "lucide-react";

export interface ImportPreviewVariable {
  name: string;
  original: string;
}

interface ImportPreviewDialogProps {
  open: boolean;
  onCancel: () => void;
  onContinue: () => void;
  pageTitle: string;
  fullContent: string;
  variables: ImportPreviewVariable[];
}

/**
 * Shown after a template is imported (from URL or a connected website) and
 * BEFORE it is passed into the full editor. Renders the mapped HTML with
 * placeholders highlighted plus the list of extracted variables so the user
 * can confirm the extraction looks right before saving.
 */
export function ImportPreviewDialog({
  open,
  onCancel,
  onContinue,
  pageTitle,
  fullContent,
  variables,
}: ImportPreviewDialogProps) {
  // Highlight every {placeholder} in the raw HTML so it stands out inside the
  // iframe preview. Wrap tokens in a styled <mark>-like span.
  const highlightedHtml = useMemo(() => {
    if (!fullContent) return "";
    // Strip the <!-- STYLES --> wrapper comments; the styles remain inside.
    const cleaned = fullContent
      .replace(/<!--\s*STYLES\s*-->/gi, "")
      .replace(/<!--\s*\/STYLES\s*-->/gi, "");
    const injected = cleaned.replace(
      /\{([a-z0-9_]{2,60})\}/gi,
      (_m, name) =>
        `<span style="background:#22c55e33;color:#22c55e;border:1px solid #22c55e66;padding:0 4px;border-radius:4px;font-weight:600;font-family:ui-monospace,monospace;font-size:0.9em;">{${name}}</span>`,
    );
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base target="_blank"></head><body style="margin:0;background:#fff;color:#111;">${injected}</body></html>`;
  }, [fullContent]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="sm:max-w-[min(96vw,80rem)] max-h-[92dvh] flex flex-col overflow-hidden p-0 gap-0">
        <DialogHeader className="px-5 py-3 border-b bg-card shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Import preview — variable mapping
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Review how <span className="font-medium text-foreground">{pageTitle || "the imported page"}</span> was
            converted. <Badge variant="secondary" className="ml-1">{variables.length} variables</Badge> extracted
            from headings, subheadings, paragraphs and keywords.
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] flex-1 min-h-0">
          {/* Variables list */}
          <div className="border-r bg-muted/20 flex flex-col min-h-0">
            <div className="px-4 py-2 border-b text-[11px] uppercase tracking-wide text-muted-foreground font-semibold shrink-0">
              Detected variables
            </div>
            <ScrollArea className="flex-1">
              <ul className="p-3 space-y-2">
                {variables.length === 0 && (
                  <li className="text-xs text-muted-foreground italic">
                    No variables detected — you can still add them in the editor.
                  </li>
                )}
                {variables.map((v) => (
                  <li key={v.name} className="rounded-md border bg-card p-2">
                    <div className="text-[11px] font-mono text-primary">{`{${v.name}}`}</div>
                    <div className="text-[11px] text-muted-foreground truncate mt-0.5" title={v.original}>
                      ← {v.original}
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>

          {/* Rendered preview */}
          <div className="flex flex-col min-h-0 bg-background">
            <div className="px-4 py-2 border-b text-[11px] uppercase tracking-wide text-muted-foreground font-semibold shrink-0 flex items-center justify-between">
              <span>Preview with placeholders</span>
              <span className="text-[10px] normal-case tracking-normal">
                Green pills = where dynamic content will be filled in.
              </span>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <iframe
                title="Import preview"
                sandbox="allow-same-origin"
                srcDoc={highlightedHtml}
                className="w-full h-full border-0 bg-white"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t bg-card shrink-0">
          <p className="text-[11px] text-muted-foreground">
            You'll be able to rename variables, add/remove them, and pick images in the next step.
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>
              <X className="h-3.5 w-3.5 mr-1.5" /> Discard
            </Button>
            <Button size="sm" onClick={onContinue}>
              Continue to editor <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
