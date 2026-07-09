import { CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface SectionReconvertResult {
  id: string;
  name: string;
  ok: boolean;
  replaced?: number;
  existing?: number;
  error?: string;
}

export interface SectionReconvertRun {
  sections: string[];
  total: number;
  updated: number;
  results: SectionReconvertResult[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  run: SectionReconvertRun | null;
}

function sectionsLabel(sections: string[]): string {
  const parts: string[] = [];
  if (sections.includes("faq")) parts.push("FAQ");
  if (sections.includes("testimonial")) parts.push("Testimonials");
  return parts.join(" + ") || "sections";
}

/**
 * Per-template / per-widget status panel for the "Reconvert sections" bulk
 * action. Shows, for each selected template, how many target widgets were
 * found and how many were refreshed, plus run-wide totals.
 */
export function SectionReconvertStatusPanel({ open, onOpenChange, run }: Props) {
  if (!run) return null;

  const succeeded = run.results.filter((r) => r.ok);
  const failed = run.results.filter((r) => !r.ok);
  const skipped = succeeded.filter((r) => (r.existing ?? 0) === 0);
  const totalWidgetsFound = run.results.reduce((s, r) => s + (r.existing ?? 0), 0);
  const totalWidgetsReplaced = run.results.reduce((s, r) => s + (r.replaced ?? 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reconvert sections — results</DialogTitle>
          <DialogDescription>
            {sectionsLabel(run.sections)} widgets were refreshed in place. All other
            widgets, layout and manual edits were left unchanged.
          </DialogDescription>
        </DialogHeader>

        {/* Run totals */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-2xl font-bold">{run.total}</p>
            <p className="text-xs text-muted-foreground">Templates</p>
          </div>
          <div className="rounded-lg border border-success/30 bg-success/5 p-3">
            <p className="text-2xl font-bold text-success">{run.updated}</p>
            <p className="text-xs text-muted-foreground">Updated</p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-2xl font-bold">
              {totalWidgetsReplaced}
              <span className="text-sm font-normal text-muted-foreground">/{totalWidgetsFound}</span>
            </p>
            <p className="text-xs text-muted-foreground">Widgets refreshed</p>
          </div>
          <div className={cn("rounded-lg border p-3", failed.length > 0 ? "border-destructive/30 bg-destructive/5" : "bg-muted/40")}>
            <p className={cn("text-2xl font-bold", failed.length > 0 && "text-destructive")}>{failed.length}</p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </div>
        </div>

        {/* Per-template list */}
        <div className="max-h-[45vh] overflow-y-auto space-y-1.5 pr-1">
          {run.results.map((r) => {
            const noWidgets = r.ok && (r.existing ?? 0) === 0;
            return (
              <div
                key={r.id}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg border p-2.5 text-sm",
                  !r.ok && "border-destructive/30 bg-destructive/5",
                  noWidgets && "border-border bg-muted/30",
                )}
              >
                <span className="shrink-0">
                  {r.ok && !noWidgets && <CheckCircle2 className="h-4 w-4 text-success" />}
                  {noWidgets && <MinusCircle className="h-4 w-4 text-muted-foreground" />}
                  {!r.ok && <XCircle className="h-4 w-4 text-destructive" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-tight truncate">{r.name}</p>
                  {r.error && <p className="text-xs text-destructive mt-0.5">{r.error}</p>}
                  {noWidgets && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      No {sectionsLabel(run.sections)} widgets found — nothing to update.
                    </p>
                  )}
                </div>
                {r.ok && (r.existing ?? 0) > 0 && (
                  <Badge variant="secondary" className="shrink-0">
                    {r.replaced ?? 0}/{r.existing} widgets
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
