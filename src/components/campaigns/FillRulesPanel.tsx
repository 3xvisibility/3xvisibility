import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Database as DatabaseIcon, Wand2, ArrowRightLeft } from "lucide-react";

export type FillRule = "csv_first" | "csv_only" | "ai_only" | "ai_first";

export const DEFAULT_FILL_RULE: FillRule = "csv_first";

const RULE_OPTIONS: { value: FillRule; label: string; description: string }[] = [
  { value: "csv_first", label: "CSV first → AI fallback", description: "Use CSV/custom value if present, otherwise let AI fill it." },
  { value: "csv_only", label: "CSV only (skip AI)", description: "Never call AI for this variable, even if CSV is empty." },
  { value: "ai_only", label: "AI only (ignore CSV)", description: "Always use AI niche/services value, even if CSV has a value." },
  { value: "ai_first", label: "AI first → CSV fallback", description: "Prefer AI value, only use CSV if AI returns empty." },
];

const RULE_BADGE: Record<FillRule, { icon: typeof DatabaseIcon; label: string; tone: string }> = {
  csv_first: { icon: ArrowRightLeft, label: "CSV → AI", tone: "bg-primary/10 text-primary border-primary/20" },
  csv_only: { icon: DatabaseIcon, label: "CSV only", tone: "bg-muted text-muted-foreground border-border" },
  ai_only: { icon: Sparkles, label: "AI only", tone: "bg-warning/10 text-warning border-warning/20" },
  ai_first: { icon: Wand2, label: "AI → CSV", tone: "bg-success/10 text-success border-success/20" },
};

interface FillRulesPanelProps {
  templateVars: string[];
  csvHeaders: string[];
  manualMappings: Record<string, string>;
  customValues: Record<string, string>;
  rules: Record<string, FillRule>;
  setRules: (next: Record<string, FillRule>) => void;
  hasAiContext: boolean;
}

export function FillRulesPanel({
  templateVars,
  csvHeaders,
  manualMappings,
  customValues,
  rules,
  setRules,
  hasAiContext,
}: FillRulesPanelProps) {
  const headerSet = useMemo(() => new Set(csvHeaders.map((h) => h.toLowerCase())), [csvHeaders]);

  const rows = useMemo(() => {
    return templateVars
      .filter((v) => v && !v.includes(":"))
      .map((variable) => {
        const key = variable.toLowerCase();
        const mapped = manualMappings[variable];
        const custom = (customValues[variable] || "").trim();
        const csvAvailable = headerSet.has(key) || (mapped && !mapped.startsWith("__custom__")) || !!custom;
        return { variable, csvAvailable };
      });
  }, [templateVars, headerSet, manualMappings, customValues]);

  if (rows.length === 0) return null;

  const update = (variable: string, rule: FillRule) => {
    const next = { ...rules };
    if (rule === DEFAULT_FILL_RULE) {
      delete next[variable];
    } else {
      next[variable] = rule;
    }
    setRules(next);
  };

  const setAll = (rule: FillRule) => {
    if (rule === DEFAULT_FILL_RULE) {
      setRules({});
      return;
    }
    const next: Record<string, FillRule> = {};
    for (const r of rows) next[r.variable] = rule;
    setRules(next);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold flex items-center gap-1.5">
            <Wand2 className="h-3.5 w-3.5 text-primary" />
            Fill rules per variable
          </p>
          <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
            Decide when to use the CSV value vs the AI-generated niche/services default for each variable.
            {!hasAiContext && (
              <span className="ml-1 text-warning">
                Add Business / Niche / Service above to enable AI rules.
              </span>
            )}
          </p>
        </div>
        <Select onValueChange={(v) => setAll(v as FillRule)}>
          <SelectTrigger className="h-7 text-[11px] w-[140px] rounded-lg shrink-0">
            <SelectValue placeholder="Apply to all" />
          </SelectTrigger>
          <SelectContent>
            {RULE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
        {rows.map(({ variable, csvAvailable }) => {
          const rule = rules[variable] || DEFAULT_FILL_RULE;
          const badge = RULE_BADGE[rule];
          const Icon = badge.icon;
          return (
            <div
              key={variable}
              className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-2.5 py-1.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <code className="text-[11px] font-mono font-medium truncate">{`{${variable}}`}</code>
                  {csvAvailable ? (
                    <Badge variant="outline" className="h-4 px-1 text-[9px] gap-0.5">
                      <DatabaseIcon className="h-2.5 w-2.5" />
                      CSV
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="h-4 px-1 text-[9px] gap-0.5 text-warning border-warning/30">
                      no CSV
                    </Badge>
                  )}
                  <Badge variant="outline" className={`h-4 px-1 text-[9px] gap-0.5 ${badge.tone}`}>
                    <Icon className="h-2.5 w-2.5" />
                    {badge.label}
                  </Badge>
                </div>
              </div>
              <Select value={rule} onValueChange={(v) => update(variable, v as FillRule)}>
                <SelectTrigger className="h-7 text-[11px] w-[170px] rounded-lg shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RULE_OPTIONS.map((opt) => {
                    const aiNeeds = opt.value === "ai_only" || opt.value === "ai_first" || opt.value === "csv_first";
                    const disabled = aiNeeds && !hasAiContext && opt.value !== "csv_first";
                    return (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        className="text-xs"
                        disabled={disabled}
                      >
                        <div className="flex flex-col">
                          <span>{opt.label}</span>
                          <span className="text-[10px] text-muted-foreground">{opt.description}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Helper to compute which variables actually need AI fill given rules + available data.
export function computeAiTargets(
  templateVars: string[],
  csvHeaders: string[],
  manualMappings: Record<string, string>,
  customValues: Record<string, string>,
  rules: Record<string, FillRule>,
): { unmapped: string[]; aiOnly: string[]; aiFirst: string[] } {
  const headerSet = new Set(csvHeaders.map((h) => h.toLowerCase()));
  const unmapped: string[] = [];
  const aiOnly: string[] = [];
  const aiFirst: string[] = [];
  for (const v of templateVars) {
    if (!v || v.includes(":")) continue;
    const rule = rules[v] || DEFAULT_FILL_RULE;
    const mapped = manualMappings[v];
    const custom = (customValues[v] || "").trim();
    const csvAvailable = headerSet.has(v.toLowerCase()) || (mapped && !mapped.startsWith("__custom__")) || !!custom;
    if (rule === "ai_only") aiOnly.push(v);
    else if (rule === "ai_first") aiFirst.push(v);
    else if (rule === "csv_first" && !csvAvailable) unmapped.push(v);
  }
  return { unmapped, aiOnly, aiFirst };
}
