import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { AlertTriangle, Copy } from "lucide-react";
import { detectDuplicates, type PageInput } from "@/lib/duplicate-detector";

interface DuplicateContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pages: PageInput[];
}

export function DuplicateContentDialog({ open, onOpenChange, pages }: DuplicateContentDialogProps) {
  const [threshold, setThreshold] = useState(70);

  const pairs = useMemo(() => {
    if (!open || pages.length < 2) return [];
    return detectDuplicates(pages, threshold);
  }, [pages, threshold, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5 text-amber-500" />
            Duplicate Content Detector
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Similarity threshold: {threshold}%
            </span>
            <Slider
              value={[threshold]}
              onValueChange={([v]) => setThreshold(v)}
              min={50}
              max={95}
              step={5}
              className="flex-1"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Analyzing {Math.min(pages.length, 200)} pages • {pairs.length} duplicate pair{pairs.length !== 1 ? "s" : ""} found
          </p>

          {pairs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No duplicates detected at {threshold}% threshold.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pairs.slice(0, 50).map((pair, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30"
                >
                  <Badge
                    variant={pair.similarity >= 90 ? "destructive" : "secondary"}
                    className="shrink-0 tabular-nums"
                  >
                    {pair.similarity}%
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{pair.pageATitle}</p>
                    <p className="text-xs text-muted-foreground truncate">↔ {pair.pageBTitle}</p>
                  </div>
                </div>
              ))}
              {pairs.length > 50 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{pairs.length - 50} more pairs
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
