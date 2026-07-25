import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import type { ParityPageResult } from "@/hooks/useAssetParityRecheck";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  running: boolean;
  results: ParityPageResult[] | null;
  error: string | null;
  onRecheck?: () => void;
}

/**
 * Shows the outcome of the post-republish HTML asset parity check: for every
 * page, whether the CSS/JS/design tags present in the preview also reached the
 * live published URL, plus the exact assets that got stripped.
 */
export function AssetParityResultDialog({
  open,
  onOpenChange,
  running,
  results,
  error,
  onRecheck,
}: Props) {
  const passed = (results || []).filter((r) => r.status === "passed").length;
  const failed = (results || []).filter((r) => r.status === "failed").length;
  const other = (results || []).filter((r) => r.status !== "passed" && r.status !== "failed").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Asset parity re-check
          </DialogTitle>
          <DialogDescription>
            {running
              ? "Fetching each published URL and comparing its CSS, JS and design tags against the preview…"
              : "Comparison of the live published pages against the preview markup."}
          </DialogDescription>
        </DialogHeader>

        {!running && results && results.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15">
              {passed} passed
            </Badge>
            {failed > 0 && (
              <Badge variant="outline" className="border-amber-500/40 text-amber-600">
                {failed} with missing assets
              </Badge>
            )}
            {other > 0 && <Badge variant="outline">{other} skipped / errored</Badge>}
          </div>
        )}

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        <ScrollArea className="max-h-[55vh] pr-3">
          <div className="space-y-2">
            {running && (
              <p className="text-xs text-muted-foreground">This usually takes a few seconds per page.</p>
            )}

            {!running && results?.length === 0 && (
              <p className="text-xs text-muted-foreground">No pages were checked.</p>
            )}

            {(results || []).map((r) => {
              const ok = r.status === "passed";
              const issues = r.asset_parity?.issues || [];
              return (
                <div
                  key={r.page_id}
                  className={`rounded-lg border p-3 ${
                    ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {ok ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    ) : r.status === "error" ? (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium">{r.title || r.page_id}</p>
                        {typeof r.asset_parity?.score === "number" && (
                          <Badge variant="outline" className="h-5 text-[10px]">
                            Assets {Math.round((r.asset_parity.score || 0) * 100)}%
                          </Badge>
                        )}
                        {typeof r.score === "number" && (
                          <Badge variant="outline" className="h-5 text-[10px]">
                            Match {Math.round(r.score * 100)}%
                          </Badge>
                        )}
                      </div>

                      {r.url && (
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" /> {r.url}
                        </a>
                      )}

                      {(r.reason || r.error) && (
                        <p className="text-[11px] text-muted-foreground">{r.reason || r.error}</p>
                      )}

                      {ok && !r.reason && (
                        <p className="text-[11px] text-muted-foreground">
                          All CSS, JS and design tags from the preview are present on the live page.
                        </p>
                      )}

                      {issues.length > 0 && (
                        <ul className="mt-1 space-y-1">
                          {issues.slice(0, 6).map((i, idx) => (
                            <li key={idx} className="text-[11px] leading-relaxed text-muted-foreground">
                              <span className="font-medium text-foreground">{i.kind}:</span> {i.detail}
                              {i.hint ? <span className="block text-[10px] opacity-80">{i.hint}</span> : null}
                            </li>
                          ))}
                          {issues.length > 6 && (
                            <li className="text-[11px] text-muted-foreground">
                              +{issues.length - 6} more issue(s)
                            </li>
                          )}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2">
          {onRecheck && (
            <Button variant="outline" size="sm" disabled={running} onClick={onRecheck} className="gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${running ? "animate-spin" : ""}`} /> Re-check
            </Button>
          )}
          <Button size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
