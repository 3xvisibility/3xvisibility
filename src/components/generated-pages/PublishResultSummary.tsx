import { CheckCircle2, XCircle, ExternalLink, RefreshCw, ListChecks, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isPublishSuccess, type PublishLogResult } from "@/components/campaigns/PublishLogDialog";

interface PublishResultSummaryProps {
  results: PublishLogResult[];
  onViewDetails: () => void;
  onRetryFailed?: (ids: string[]) => void;
  onDismiss?: () => void;
  retrying?: boolean;
}

/**
 * Persistent post-publish summary shown on Campaign / Generated Pages screens:
 * which pages succeeded, which failed, and why.
 */
export function PublishResultSummary({
  results,
  onViewDetails,
  onRetryFailed,
  onDismiss,
  retrying,
}: PublishResultSummaryProps) {
  if (!results.length) return null;

  const succeeded = results.filter((r) => isPublishSuccess(r.status));
  const failed = results.filter((r) => !isPublishSuccess(r.status));
  const failedIds = failed.map((r) => r.id).filter(Boolean) as string[];
  const allOk = failed.length === 0;

  return (
    <Card className={`shadow-surface border ${allOk ? "border-green-500/30" : "border-destructive/30"}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {allOk ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <XCircle className="h-4 w-4 text-destructive" />
          )}
          <span className="text-sm font-medium">Last publish result</span>
          <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">
            {succeeded.length} succeeded
          </Badge>
          {failed.length > 0 && (
            <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">
              {failed.length} failed
            </Badge>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onViewDetails}>
              <ListChecks className="h-3 w-3 mr-1" />View details
            </Button>
            {onRetryFailed && failedIds.length > 0 && (
              <Button size="sm" className="h-7 text-xs" disabled={retrying} onClick={() => onRetryFailed(failedIds)}>
                <RefreshCw className={`h-3 w-3 mr-1 ${retrying ? "animate-spin" : ""}`} />Retry failed
              </Button>
            )}
            {onDismiss && (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onDismiss} aria-label="Dismiss">
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-1.5 sm:grid-cols-2">
          {results.slice(0, 8).map((r, i) => {
            const ok = isPublishSuccess(r.status);
            const reason = r.error || r.steps?.find((s) => s.status === "error")?.detail;
            return (
              <div key={r.id || i} className="flex items-start gap-2 rounded-md border bg-muted/20 px-2 py-1.5 min-w-0">
                {ok ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{r.title || r.slug || r.id || `Page ${i + 1}`}</p>
                  {ok ? (
                    r.external_url ? (
                      <a
                        href={r.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline truncate max-w-full"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span className="truncate">{r.external_url}</span>
                      </a>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">Published</p>
                    )
                  ) : (
                    <p className="text-[11px] text-destructive break-words line-clamp-2">{reason || "Failed to publish"}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {results.length > 8 && (
          <p className="text-[11px] text-muted-foreground">+{results.length - 8} more — open details to see all.</p>
        )}
      </CardContent>
    </Card>
  );
}
