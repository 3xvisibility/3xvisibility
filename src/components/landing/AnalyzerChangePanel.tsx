import { ArrowDownRight, ArrowUpRight, Minus, PlusCircle, MinusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AnalyzerDiff, CheckChange } from "@/lib/analyzer-diff";
import { formatSavedAt } from "@/lib/analyzer-diff";

function DeltaPill({ delta, invert = false }: { delta: number; invert?: boolean }) {
  const positive = invert ? delta < 0 : delta > 0;
  const negative = invert ? delta > 0 : delta < 0;
  const Icon = delta === 0 ? Minus : positive ? ArrowUpRight : ArrowDownRight;
  const cls =
    delta === 0
      ? "text-muted-foreground bg-muted"
      : positive
        ? "text-primary bg-primary/10"
        : "text-destructive bg-destructive/10";
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold ${cls}`}>
      <Icon className="h-3 w-3" />
      {delta > 0 ? `+${delta}` : delta}
      <span className="sr-only">{negative ? "worse than" : positive ? "better than" : "same as"} last scan</span>
    </span>
  );
}

const kindMeta: Record<CheckChange["kind"], { label: string; cls: string; Icon: typeof ArrowUpRight }> = {
  improved: { label: "Improved", cls: "text-primary", Icon: ArrowUpRight },
  regressed: { label: "Regressed", cls: "text-destructive", Icon: ArrowDownRight },
  added: { label: "New check", cls: "text-muted-foreground", Icon: PlusCircle },
  removed: { label: "No longer checked", cls: "text-muted-foreground", Icon: MinusCircle },
};

export function AnalyzerChangePanel({ diff, savedAt }: { diff: AnalyzerDiff; savedAt: string }) {
  const improved = diff.changes.filter((c) => c.kind === "improved").length;
  const regressed = diff.changes.filter((c) => c.kind === "regressed").length;

  return (
    <div className="border-t p-6 md:p-8">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h4 className="font-semibold">Changes since your last scan</h4>
        <Badge variant="secondary" className="text-[10px]">{formatSavedAt(savedAt)}</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Overall score</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-2xl font-bold">{diff.overall.current}</span>
            <DeltaPill delta={diff.overall.delta} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">was {diff.overall.previous}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Open issues</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-2xl font-bold">{diff.issues.current}</span>
            <DeltaPill delta={diff.issues.delta} invert />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">was {diff.issues.previous}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Checks improved</p>
          <p className="mt-1 text-2xl font-bold text-primary">{improved}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Checks regressed</p>
          <p className="mt-1 text-2xl font-bold text-destructive">{regressed}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {diff.categories.map((c) => (
          <div key={c.key} className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm">
            <span className="truncate">{c.label}</span>
            <span className="flex items-center gap-2">
              <span className="font-semibold">{c.current}%</span>
              <DeltaPill delta={c.delta} />
            </span>
          </div>
        ))}
      </div>

      {diff.changes.length > 0 ? (
        <ul className="mt-5 space-y-2">
          {diff.changes.map((c) => {
            const meta = kindMeta[c.kind];
            return (
              <li key={`${c.kind}-${c.id}`} className="flex gap-2.5 rounded-lg border bg-card px-3 py-2 text-sm">
                <meta.Icon className={`h-4 w-4 mt-0.5 shrink-0 ${meta.cls}`} />
                <div className="min-w-0">
                  <p className="font-medium leading-tight">
                    {c.label}{" "}
                    <span className={`text-xs font-semibold ${meta.cls}`}>
                      {meta.label}
                      {c.from && c.to ? ` · ${c.from} → ${c.to}` : ""}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground break-words">{c.detail}</p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-5 text-sm text-muted-foreground">
          Nothing changed since the last scan — all {diff.unchanged} checks returned the same result.
        </p>
      )}
    </div>
  );
}

export default AnalyzerChangePanel;
