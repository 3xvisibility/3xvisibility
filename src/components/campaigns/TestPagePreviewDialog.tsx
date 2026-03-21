import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import type { RenderResult } from "@/lib/renderer";

interface TestPagePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: RenderResult | null;
}

export function TestPagePreviewDialog({ open, onOpenChange, result }: TestPagePreviewDialogProps) {
  if (!result) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base truncate">Test Preview — {result.title}</DialogTitle>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge variant="outline" className="text-[10px]">Slug: /{result.slug}</Badge>
            <Badge variant="outline" className="text-[10px]">SEO Title: {result.seoTitle}</Badge>
          </div>
        </DialogHeader>

        {result.warnings.length > 0 && (
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 space-y-1">
            {result.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-warning">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3 text-xs">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <span className="text-muted-foreground font-medium">SEO Description:</span>
            <p className="mt-1">{result.seoDescription || "—"}</p>
          </div>
          {result.canonicalUrl && (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <span className="text-muted-foreground font-medium">Canonical URL:</span>
              <p className="mt-1 font-mono text-[11px]">{result.canonicalUrl}</p>
            </div>
          )}
        </div>

        <ScrollArea className="flex-1 mt-3 border border-border rounded-lg">
          <div
            className="prose prose-sm dark:prose-invert max-w-none p-4"
            dangerouslySetInnerHTML={{ __html: result.html }}
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
