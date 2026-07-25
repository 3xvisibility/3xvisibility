import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Loader2, ExternalLink, Copy, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

export interface PublishStep {
  label: string;
  status: "running" | "ok" | "warn" | "error";
  detail?: string;
  at?: string;
}

export interface PublishLogResult {
  id?: string;
  title?: string;
  slug?: string;
  status: string;
  external_url?: string;
  error?: string;
  steps?: PublishStep[];
}

export function isPublishSuccess(status?: string) {
  const s = String(status || "").toLowerCase();
  return s === "published" || s === "done" || s === "success" || s === "ok" || s === "updated";
}

function stepIcon(status: PublishStep["status"]) {
  if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
  if (status === "error") return <XCircle className="h-4 w-4 text-destructive shrink-0" />;
  if (status === "warn") return <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />;
  return <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />;
}

interface PublishLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: PublishLogResult[];
  /** Optional: retry only the failed pages from this run. */
  onRetryFailed?: (ids: string[]) => void;
  retrying?: boolean;
}

export function PublishLogDialog({ open, onOpenChange, results, onRetryFailed, retrying }: PublishLogDialogProps) {
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all" | "success" | "failed">("all");

  const succeeded = useMemo(() => results.filter((r) => isPublishSuccess(r.status)), [results]);
  const failed = useMemo(() => results.filter((r) => !isPublishSuccess(r.status)), [results]);
  const visible = filter === "success" ? succeeded : filter === "failed" ? failed : results;
  const failedIds = failed.map((r) => r.id).filter(Boolean) as string[];
  const [selected, setSelected] = useState<string[]>([]);
  const canRetry = !!onRetryFailed && failedIds.length > 0;

  useEffect(() => {
    setSelected(failedIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failedIds.join(",")]);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const copyReport = async () => {
    const lines = results.map((r, i) => {
      const label = r.title || r.slug || r.id || `Page ${i + 1}`;
      const state = isPublishSuccess(r.status) ? "SUCCESS" : "FAILED";
      const extra = isPublishSuccess(r.status)
        ? r.external_url || ""
        : r.error || r.steps?.find((s) => s.status === "error")?.detail || "Unknown error";
      return `${state} · ${label}${extra ? ` — ${extra}` : ""}`;
    });
    const report = [`Publish report: ${succeeded.length} succeeded, ${failed.length} failed`, ...lines].join("\n");
    try {
      await navigator.clipboard.writeText(report);
      toast({ title: "Report copied" });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Publish results</DialogTitle>
          <DialogDescription>
            Detailed status for every page in this publish run.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border p-2 text-center">
            <p className="text-lg font-semibold">{results.length}</p>
            <p className="text-[11px] text-muted-foreground">Total</p>
          </div>
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-2 text-center">
            <p className="text-lg font-semibold text-green-600">{succeeded.length}</p>
            <p className="text-[11px] text-muted-foreground">Succeeded</p>
          </div>
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-center">
            <p className="text-lg font-semibold text-destructive">{failed.length}</p>
            <p className="text-[11px] text-muted-foreground">Failed</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(["all", "success", "failed"] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              className="h-7 text-xs capitalize"
              onClick={() => setFilter(f)}
            >
              {f === "all" ? `All (${results.length})` : f === "success" ? `Succeeded (${succeeded.length})` : `Failed (${failed.length})`}
            </Button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={copyReport}>
              <Copy className="h-3 w-3 mr-1" />Copy report
            </Button>
            {canRetry && (
              <>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  disabled={retrying || selected.length === 0}
                  onClick={() => onRetryFailed!(selected)}
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${retrying ? "animate-spin" : ""}`} />
                  Retry selected ({selected.length})
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" disabled={retrying} onClick={() => onRetryFailed!(failedIds)}>
                  Retry all failed
                </Button>
              </>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1 -mx-2 px-2">
          <div className="space-y-4">
            {visible.length === 0 && (
              <p className="text-sm text-muted-foreground">No publish details to show.</p>
            )}
            {visible.map((r, i) => {
              const ok = isPublishSuccess(r.status);
              return (
                <div key={r.id || i} className={`rounded-lg border p-3 space-y-2 ${ok ? "" : "border-destructive/30"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {!ok && r.id && canRetry && (
                        <Checkbox
                          checked={selected.includes(r.id)}
                          onCheckedChange={() => toggle(r.id!)}
                          aria-label={`Retry ${r.title || r.slug || r.id}`}
                        />
                      )}
                      {ok ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive shrink-0" />
                      )}
                      <span className="text-sm font-medium truncate">{r.title || r.slug || r.id || `Page ${i + 1}`}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={ok ? "default" : "destructive"}>
                        {ok ? "Success" : r.status || "failed"}
                      </Badge>
                      {!ok && r.id && canRetry && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" disabled={retrying} onClick={() => onRetryFailed!([r.id!])}>
                          <RefreshCw className="h-3 w-3 mr-1" />Retry
                        </Button>
                      )}
                    </div>
                  </div>

                  {r.steps && r.steps.length > 0 && (
                    <ol className="space-y-1.5 pl-1">
                      {r.steps.map((s, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm">
                          {stepIcon(s.status)}
                          <div className="min-w-0">
                            <span className={s.status === "error" ? "text-destructive" : ""}>{s.label}</span>
                            {s.detail && (
                              <span className="block text-xs text-muted-foreground break-words">{s.detail}</span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}

                  {r.error && (!r.steps || r.steps.length === 0) && (
                    <p className="text-xs text-destructive break-words">{r.error}</p>
                  )}

                  {r.external_url && (
                    <a
                      href={r.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> View published page
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
