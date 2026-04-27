import { Check, Loader2, X, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepStatus = "pending" | "running" | "success" | "error" | "skipped";

export interface ProgressStep {
  key: string;
  label: string;
  description?: string;
  status: StepStatus;
  detail?: string;
}

interface Props {
  steps: ProgressStep[];
  className?: string;
}

/**
 * Vertical step-by-step status display used during website connection.
 * Shows: Saving credentials → Verifying connection → Publishing test page.
 */
export function ConnectionProgressSteps({ steps, className }: Props) {
  if (!steps.length) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <p className="text-xs font-medium text-foreground/80 mb-1">
        Connection progress
      </p>
      <ol className="space-y-2">
        {steps.map((step, idx) => (
          <li key={step.key} className="flex items-start gap-2.5">
            <div className="mt-0.5 shrink-0">
              {step.status === "running" && (
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
              )}
              {step.status === "success" && (
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/15">
                  <Check className="h-3 w-3 text-emerald-500" />
                </div>
              )}
              {step.status === "error" && (
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-destructive/15">
                  <X className="h-3 w-3 text-destructive" />
                </div>
              )}
              {step.status === "skipped" && (
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-muted">
                  <Circle className="h-2 w-2 text-muted-foreground" />
                </div>
              )}
              {step.status === "pending" && (
                <div className="flex h-4 w-4 items-center justify-center rounded-full border border-border bg-background">
                  <span className="text-[9px] text-muted-foreground font-medium">
                    {idx + 1}
                  </span>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-xs font-medium leading-tight",
                  step.status === "running" && "text-foreground",
                  step.status === "success" && "text-emerald-600 dark:text-emerald-400",
                  step.status === "error" && "text-destructive",
                  step.status === "pending" && "text-muted-foreground",
                  step.status === "skipped" && "text-muted-foreground"
                )}
              >
                {step.label}
                {step.status === "skipped" && (
                  <span className="ml-1 text-[10px] font-normal">(skipped)</span>
                )}
              </p>
              {(step.detail || step.description) && (
                <p
                  className={cn(
                    "text-[11px] leading-snug mt-0.5",
                    step.status === "error"
                      ? "text-destructive/80"
                      : "text-muted-foreground"
                  )}
                >
                  {step.detail || step.description}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
