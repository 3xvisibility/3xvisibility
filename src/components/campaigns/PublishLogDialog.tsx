import { CheckCircle2, XCircle, AlertTriangle, Loader2, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export interface PublishStep {
  label: string;
  status: "running" | "ok" | "warn" | "error";
  detail?: string;
  at?: string;
}

export interface PublishLogResult {
  id?: string;
  title?: string;
  status: string;
  external_url?: string;
  error?: string;
  steps?: PublishStep[];
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
}

export function PublishLogDialog({ open, onOpenChange, results }: PublishLogDialogProps) {
  const published = results.filter((r) => r.status === "published").length;
  const failed = results.filter((r) => r.status === "failed").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Publish log</DialogTitle>
          <DialogDescription>
            Step-by-step status for each page. {published} published · {failed} failed.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-2 px-2">
          <div className="space-y-4">
            {results.length === 0 && (
              <p className="text-sm text-muted-foreground">No publish details were returned.</p>
            )}
            {results.map((r, i) => (
              <div key={r.id || i} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {r.status === "published" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    )}
                    <span className="text-sm font-medium truncate">{r.title || r.id || `Page ${i + 1}`}</span>
                  </div>
                  <Badge variant={r.status === "published" ? "default" : "destructive"} className="shrink-0">
                    {r.status}
                  </Badge>
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
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
