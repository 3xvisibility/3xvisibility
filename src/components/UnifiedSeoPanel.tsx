import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, XCircle, ChevronDown, ShieldAlert, ShieldCheck } from "lucide-react";
import {
  calculateUnifiedSeoScore,
  type UnifiedSeoInput,
} from "@/lib/unified-seo-score";

interface UnifiedSeoPanelProps {
  input: UnifiedSeoInput;
}

/**
 * Headline SEO panel powered by the unified scoring engine — the single source
 * of truth every SEO tool reads from. Shows the gated 100-point score, the
 * critical-factor gate status, and an expandable per-factor breakdown.
 */
export function UnifiedSeoPanel({ input }: UnifiedSeoPanelProps) {
  const result = useMemo(() => calculateUnifiedSeoScore(input), [input]);

  const scoreColor = (score: number) =>
    score >= 90 ? "text-emerald-600" :
    score >= 60 ? "text-primary" :
    score >= 40 ? "text-amber-600" : "text-destructive";

  const barColor = (score: number) =>
    score >= 90 ? "bg-emerald-500" :
    score >= 60 ? "bg-primary" :
    score >= 40 ? "bg-amber-500" : "bg-destructive";

  return (
    <div className="space-y-3">
      {/* Headline */}
      <div className="rounded-lg border border-border bg-muted/20 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Unified SEO Score</span>
            <Badge variant="outline" className="text-[9px] px-1.5 py-0">grade {result.grade}</Badge>
          </div>
          <span className={`text-2xl font-bold tabular-nums ${scoreColor(result.score)}`}>
            {result.score}/100
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor(result.score)}`}
            style={{ width: `${result.score}%` }}
          />
        </div>

        {/* Critical-factor gate */}
        <div className="mt-3 flex items-start gap-1.5 text-[11px]">
          {result.gatePassed ? (
            <>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span className="text-muted-foreground">
                All critical factors pass — this page can reach the 90+ tier.
              </span>
            </>
          ) : (
            <>
              <ShieldAlert className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span className="text-foreground">
                Score capped at 89 until these critical factors pass:{" "}
                <span className="font-medium">
                  {result.criticalFailures.map((f) => f.label).join(", ")}
                </span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* Per-factor breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {result.factors.map((f) => {
          const passedCount = f.checks.filter((c) => c.passed).length;
          return (
            <Collapsible key={f.key} className="rounded-lg border border-border overflow-hidden">
              <CollapsibleTrigger className="w-full p-3 hover:bg-muted/40 transition-colors text-left group">
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs text-muted-foreground truncate">{f.label}</span>
                    {f.critical && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">critical</Badge>
                    )}
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 shrink-0" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${barColor(f.score)}`} style={{ width: `${f.score}%` }} />
                  </div>
                  <span className={`text-xs font-bold tabular-nums ${scoreColor(f.score)}`}>{f.score}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 text-left">
                  {passedCount}/{f.checks.length} checks passed
                </p>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t border-border bg-muted/20 px-3 py-2 space-y-1.5">
                  {f.checks.map((check, idx) => (
                    <div key={idx} className="flex items-start gap-1.5">
                      {check.passed ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={`text-[10px] leading-tight ${check.passed ? "text-muted-foreground" : "text-foreground font-medium"}`}>
                          {check.label}
                        </p>
                        {!check.passed && check.tip && (
                          <p className="text-[9px] text-muted-foreground mt-0.5">{check.tip}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
