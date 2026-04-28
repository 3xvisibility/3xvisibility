import { CheckCircle2, Loader2, Circle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type MpStepStatus = "pending" | "running" | "success" | "error";
export interface MpStep {
  key: string;
  label: string;
  status: MpStepStatus;
  detail?: string;
}

interface Props {
  steps: MpStep[];
  errorMessage?: string | null;
}

export function MarketplaceImportProgress({ steps, errorMessage }: Props) {
  const allDone = steps.every(s => s.status === "success");
  return (
    <div
      className={cn(
        "rounded-xl border p-3 space-y-2 text-xs animate-in fade-in slide-in-from-top-1 duration-200",
        allDone ? "border-success/30 bg-success/5" : errorMessage ? "border-destructive/30 bg-destructive/5" : "border-primary/30 bg-primary/5",
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-1.5 font-semibold text-[11px] uppercase tracking-wider">
        <span className={allDone ? "text-success" : errorMessage ? "text-destructive" : "text-primary"}>
          {allDone ? "✓ Template ready" : errorMessage ? "Import failed" : "Importing marketplace template…"}
        </span>
      </div>
      <ol className="space-y-1.5">
        {steps.map((s, i) => (
          <li key={s.key} className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0">
              {s.status === "success" && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
              {s.status === "running" && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
              {s.status === "pending" && <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />}
              {s.status === "error" && <XCircle className="h-3.5 w-3.5 text-destructive" />}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "font-medium leading-tight",
                  s.status === "pending" && "text-muted-foreground/60",
                  s.status === "error" && "text-destructive",
                )}
              >
                <span className="text-muted-foreground/60 mr-1">{i + 1}.</span>
                {s.label}
              </p>
              {s.detail && (
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{s.detail}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
      {errorMessage && (
        <p className="text-[10px] text-destructive bg-destructive/10 rounded px-2 py-1">{errorMessage}</p>
      )}
    </div>
  );
}
