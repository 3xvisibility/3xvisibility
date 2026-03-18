import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CheckCircle2, XCircle, Lightbulb } from "lucide-react";

interface SeoScoreBadgeProps {
  score: number;
  label: string;
  color: string;
  checks?: { label: string; passed: boolean; tip: string }[];
  size?: "sm" | "md";
  /** Optional label shown before the badge, e.g. "SEO" */
  scoreType?: string;
}

export function SeoScoreBadge({ score, label, color, checks, size = "sm", scoreType }: SeoScoreBadgeProps) {
  const [open, setOpen] = useState(false);
  const barWidth = size === "sm" ? "w-10" : "w-16";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  const barColor =
    score >= 85 ? "bg-emerald-500" :
    score >= 60 ? "bg-primary" :
    score >= 35 ? "bg-amber-500" : "bg-destructive";

  const badge = (
    <button
      type="button"
      className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
      onClick={() => checks?.length && setOpen(!open)}
    >
      <div className={`${barWidth} h-1.5 rounded-full bg-muted overflow-hidden`}>
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`${textSize} font-semibold tabular-nums ${color}`}>{score}</span>
    </button>
  );

  if (!checks?.length) return badge;

  const failed = checks.filter((c) => !c.passed);
  const passed = checks.filter((c) => c.passed);
  const heading = scoreType ? `${scoreType} Score` : "Score";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{badge}</PopoverTrigger>
      <PopoverContent side="left" align="start" className="w-72 p-0">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">{heading}</span>
            <span className={`text-sm font-bold ${color}`}>{score}/100 — {label}</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${score}%` }} />
          </div>
        </div>

        {/* Improvement suggestions */}
        {failed.length > 0 && (
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-1.5 mb-2">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-semibold text-foreground">Improve ({failed.length})</span>
            </div>
            <div className="space-y-2">
              {failed.map((c, i) => (
                <div key={i} className="flex items-start gap-2">
                  <XCircle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] font-medium text-foreground">{c.label}</p>
                    {c.tip && <p className="text-[10px] text-muted-foreground mt-0.5">{c.tip}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Passed checks */}
        {passed.length > 0 && (
          <div className="px-4 py-3">
            <div className="flex items-center gap-1.5 mb-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-xs font-semibold text-muted-foreground">Passed ({passed.length})</span>
            </div>
            <div className="space-y-1.5">
              {passed.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                  <span className="text-[11px] text-muted-foreground">{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
