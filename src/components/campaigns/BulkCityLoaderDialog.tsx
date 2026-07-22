import { useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ALL_COUNTRIES } from "@/lib/countries";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Circle,
  RefreshCw,
  Play,
  Square,
  Search,
  Download,
} from "lucide-react";

type Status = "pending" | "running" | "success" | "failure";

interface CountryRun {
  code: string;
  name: string;
  status: Status;
  attempts: number;
  inserted: number;
  skipped: number;
  error?: string;
  startedAt?: number;
  endedAt?: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-select these country codes (e.g. the one currently open in the dialog). */
  initialSelected?: string[];
  /** Called after a successful run so the parent can refresh caches. */
  onCompleted?: () => void;
}

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [0, 1500, 4000];

async function invokeSeed(countryCode: string, mode: "bulk" | "batch", target: number) {
  const body: Record<string, unknown> = { country_code: countryCode };
  if (mode === "bulk") body.bulk = true;
  else body.target = target;
  const { data, error } = await supabase.functions.invoke("seed-locations", { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return {
    inserted: Number(data?.inserted ?? 0),
    skipped: Number(data?.skipped_duplicates ?? 0),
  };
}

export function BulkCityLoaderDialog({ open, onOpenChange, initialSelected, onCompleted }: Props) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSelected && initialSelected.length ? initialSelected : ["US"]),
  );
  const [mode, setMode] = useState<"bulk" | "batch">("bulk");
  const [batchSize, setBatchSize] = useState(100);
  const [runs, setRuns] = useState<CountryRun[]>([]);
  const [running, setRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const cancelRef = useRef(false);

  const filteredCountries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ALL_COUNTRIES;
    return ALL_COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
    );
  }, [search]);

  const toggle = (code: string) => {
    const next = new Set(selected);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setSelected(next);
  };

  const selectAll = () => setSelected(new Set(ALL_COUNTRIES.map((c) => c.code)));
  const clearAll = () => setSelected(new Set());

  const totals = useMemo(() => {
    let success = 0;
    let failure = 0;
    let inserted = 0;
    let skipped = 0;
    let retries = 0;
    for (const r of runs) {
      if (r.status === "success") success++;
      if (r.status === "failure") failure++;
      inserted += r.inserted;
      skipped += r.skipped;
      retries += Math.max(0, r.attempts - 1);
    }
    return { success, failure, inserted, skipped, retries };
  }, [runs]);

  const progressPct = runs.length
    ? Math.round(
        (runs.filter((r) => r.status === "success" || r.status === "failure").length /
          runs.length) *
          100,
      )
    : 0;

  const start = async () => {
    const codes = Array.from(selected);
    if (codes.length === 0) {
      toast({ title: "Pick at least one country", variant: "destructive" });
      return;
    }
    cancelRef.current = false;
    setRunning(true);
    const initial: CountryRun[] = codes.map((code) => ({
      code,
      name: ALL_COUNTRIES.find((c) => c.code === code)?.name ?? code,
      status: "pending",
      attempts: 0,
      inserted: 0,
      skipped: 0,
    }));
    setRuns(initial);

    for (let i = 0; i < initial.length; i++) {
      if (cancelRef.current) break;
      setCurrentIndex(i);
      const country = initial[i];

      setRuns((prev) =>
        prev.map((r, idx) =>
          idx === i ? { ...r, status: "running", startedAt: Date.now() } : r,
        ),
      );

      let attempts = 0;
      let lastError: string | undefined;
      let ok = false;
      let inserted = 0;
      let skipped = 0;

      while (attempts < MAX_ATTEMPTS && !cancelRef.current) {
        attempts++;
        setRuns((prev) => prev.map((r, idx) => (idx === i ? { ...r, attempts } : r)));
        try {
          const res = await invokeSeed(country.code, mode, batchSize);
          inserted = res.inserted;
          skipped = res.skipped;
          ok = true;
          break;
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);
          if (attempts < MAX_ATTEMPTS) {
            await new Promise((r) => setTimeout(r, BACKOFF_MS[attempts] ?? 4000));
          }
        }
      }

      setRuns((prev) =>
        prev.map((r, idx) =>
          idx === i
            ? {
                ...r,
                status: ok ? "success" : "failure",
                inserted,
                skipped,
                error: ok ? undefined : lastError,
                endedAt: Date.now(),
              }
            : r,
        ),
      );
    }

    setRunning(false);
    onCompleted?.();
    toast({
      title: cancelRef.current ? "Loader stopped" : "City loader finished",
      description: `Success ${totals.success + (cancelRef.current ? 0 : 0)} / Failure ${totals.failure}`,
    });
  };

  const stop = () => {
    cancelRef.current = true;
    setRunning(false);
  };

  const retryFailed = () => {
    const failedCodes = runs.filter((r) => r.status === "failure").map((r) => r.code);
    if (failedCodes.length === 0) return;
    setSelected(new Set(failedCodes));
    setTimeout(() => start(), 0);
  };

  const exportSummary = () => {
    const headers = ["country_code", "country", "status", "attempts", "inserted", "skipped", "error"];
    const lines = [headers.join(",")];
    for (const r of runs) {
      const cells = [
        r.code,
        `"${r.name.replace(/"/g, '""')}"`,
        r.status,
        String(r.attempts),
        String(r.inserted),
        String(r.skipped),
        r.error ? `"${r.error.replace(/"/g, '""')}"` : "",
      ];
      lines.push(cells.join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `city-loader-summary_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!running) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Re-run city loader
          </DialogTitle>
          <DialogDescription>
            Reload cities from the global database with automatic retries. Track progress,
            retry counts and pass/fail per country in real time.
          </DialogDescription>
        </DialogHeader>

        {/* Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Select value={mode} onValueChange={(v) => setMode(v as "bulk" | "batch")}>
            <SelectTrigger className="h-9 text-xs rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bulk">Full country dump (recommended)</SelectItem>
              <SelectItem value="batch">AI batch (limited)</SelectItem>
            </SelectContent>
          </Select>
          {mode === "batch" && (
            <Select value={String(batchSize)} onValueChange={(v) => setBatchSize(Number(v))}>
              <SelectTrigger className="h-9 text-xs rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">Batch: 50</SelectItem>
                <SelectItem value="100">Batch: 100</SelectItem>
                <SelectItem value="200">Batch: 200</SelectItem>
              </SelectContent>
            </Select>
          )}
          <div className="relative sm:col-span-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter countries…"
              className="h-9 pl-8 text-xs rounded-xl"
              disabled={running}
            />
          </div>
        </div>

        {/* Country picker */}
        <div className="rounded-xl border max-h-[220px] overflow-y-auto p-1">
          <div className="flex items-center justify-between px-2 py-1.5 border-b sticky top-0 bg-background/95 backdrop-blur">
            <span className="text-[11px] text-muted-foreground">
              {selected.size} of {ALL_COUNTRIES.length} selected
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="text-[11px] text-primary hover:underline"
                onClick={selectAll}
                disabled={running}
              >
                Select all
              </button>
              <button
                type="button"
                className="text-[11px] text-muted-foreground hover:underline"
                onClick={clearAll}
                disabled={running}
              >
                Clear
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-0.5 p-1">
            {filteredCountries.map((c) => {
              const on = selected.has(c.code);
              return (
                <label
                  key={c.code}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs cursor-pointer hover:bg-muted/50",
                    on && "bg-primary/10",
                  )}
                >
                  <Checkbox
                    checked={on}
                    disabled={running}
                    onCheckedChange={() => toggle(c.code)}
                  />
                  <span className="text-muted-foreground font-mono text-[10px]">{c.code}</span>
                  <span className="truncate">{c.name}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap items-center gap-2">
          {!running ? (
            <Button size="sm" className="rounded-xl gap-1.5" onClick={start} disabled={selected.size === 0}>
              <Play className="h-3.5 w-3.5" />
              {runs.length > 0 ? "Re-run" : "Start"}
            </Button>
          ) : (
            <Button size="sm" variant="destructive" className="rounded-xl gap-1.5" onClick={stop}>
              <Square className="h-3.5 w-3.5" />
              Stop
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl gap-1.5"
            onClick={retryFailed}
            disabled={running || totals.failure === 0}
            title="Re-queue only the countries that failed"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry failed ({totals.failure})
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl gap-1.5"
            onClick={exportSummary}
            disabled={runs.length === 0}
          >
            <Download className="h-3.5 w-3.5" />
            Export summary
          </Button>
          <div className="ml-auto text-[11px] text-muted-foreground tabular-nums">
            Attempts up to {MAX_ATTEMPTS}× per country · backoff 1.5s→4s
          </div>
        </div>

        {/* Progress + summary */}
        {runs.length > 0 && (
          <div className="rounded-xl border p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">
                {running
                  ? `Processing ${currentIndex + 1} / ${runs.length} — ${runs[currentIndex]?.name ?? ""}`
                  : `Finished ${runs.length} countr${runs.length === 1 ? "y" : "ies"}`}
              </span>
              <span className="tabular-nums text-muted-foreground">{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-1.5" />
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
              <StatTile label="Success" value={totals.success} tone="success" />
              <StatTile label="Failed" value={totals.failure} tone="destructive" />
              <StatTile label="Retries" value={totals.retries} tone="warning" />
              <StatTile label="Inserted" value={totals.inserted} tone="primary" />
              <StatTile label="Duplicates" value={totals.skipped} tone="muted" />
            </div>
          </div>
        )}

        {/* Per-country results */}
        {runs.length > 0 && (
          <div className="flex-1 min-h-[160px] max-h-[38vh] overflow-y-auto rounded-xl border">
            <ul className="divide-y">
              {runs.map((r) => {
                const duration = r.startedAt && r.endedAt ? ((r.endedAt - r.startedAt) / 1000).toFixed(1) : null;
                return (
                  <li key={r.code} className="flex items-start gap-2.5 px-3 py-2 text-xs">
                    <span className="mt-0.5 shrink-0">
                      {r.status === "pending" && <Circle className="h-3.5 w-3.5 text-muted-foreground/50" />}
                      {r.status === "running" && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                      {r.status === "success" && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                      {r.status === "failure" && <XCircle className="h-3.5 w-3.5 text-destructive" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] text-muted-foreground">{r.code}</span>
                        <span className="font-medium truncate">{r.name}</span>
                        {r.attempts > 1 && (
                          <Badge variant="secondary" className="h-4 px-1.5 text-[9px]">
                            retry {r.attempts - 1}/{MAX_ATTEMPTS - 1}
                          </Badge>
                        )}
                        {r.status === "success" && (
                          <Badge variant="outline" className="h-4 px-1.5 text-[9px] text-success border-success/30">
                            +{r.inserted} · {r.skipped} dup
                          </Badge>
                        )}
                        {duration && (
                          <span className="text-[10px] text-muted-foreground tabular-nums">{duration}s</span>
                        )}
                      </div>
                      {r.error && (
                        <p className="text-[10px] text-destructive mt-0.5 break-words">{r.error}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={running}
            className="rounded-xl"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "destructive" | "warning" | "primary" | "muted";
}) {
  const toneClass = {
    success: "border-success/20 bg-success/10 text-success",
    destructive: "border-destructive/20 bg-destructive/10 text-destructive",
    warning: "border-warning/20 bg-warning/10 text-warning",
    primary: "border-primary/20 bg-primary/10 text-primary",
    muted: "border-border bg-muted/40 text-foreground",
  }[tone];
  return (
    <div className={cn("rounded-lg border p-2", toneClass)}>
      <div className="text-[9px] uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-base font-bold tabular-nums leading-tight">{value.toLocaleString()}</div>
    </div>
  );
}
