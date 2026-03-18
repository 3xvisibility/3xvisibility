import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SeoScoreBadgeProps {
  score: number;
  label: string;
  color: string;
  checks?: { label: string; passed: boolean; tip: string }[];
  size?: "sm" | "md";
}

export function SeoScoreBadge({ score, label, color, checks, size = "sm" }: SeoScoreBadgeProps) {
  const barWidth = size === "sm" ? "w-10" : "w-16";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  const barColor =
    score >= 85 ? "bg-emerald-500" :
    score >= 60 ? "bg-primary" :
    score >= 35 ? "bg-amber-500" : "bg-destructive";

  const content = (
    <div className="flex items-center gap-1.5">
      <div className={`${barWidth} h-1.5 rounded-full bg-muted overflow-hidden`}>
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`${textSize} font-semibold tabular-nums ${color}`}>{score}</span>
    </div>
  );

  if (!checks?.length) return content;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-[220px] p-3">
          <p className="text-xs font-semibold mb-1.5">SEO Score: {score}/100 ({label})</p>
          <div className="space-y-1">
            {checks.map((c, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[10px]">
                <span className={c.passed ? "text-emerald-500" : "text-destructive"}>{c.passed ? "✓" : "✗"}</span>
                <span className={c.passed ? "text-muted-foreground" : "text-foreground"}>{c.label}</span>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
