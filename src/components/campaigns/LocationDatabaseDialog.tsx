import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Progress } from "@/components/ui/progress";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Search, Database, Download, Loader2, Globe, Check, ChevronsUpDown, RefreshCw, FileJson, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ALL_COUNTRIES } from "@/lib/countries";
import { BulkCityLoaderDialog } from "./BulkCityLoaderDialog";

interface LocationDatabaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (locations: Record<string, string>[]) => void;
}

const getFunctionErrorMessage = async (error: unknown) => {
  const fallback = error instanceof Error ? error.message : "Location loading failed";
  const response = (error as { context?: Response })?.context;
  if (!response || typeof response.clone !== "function") return fallback;

  try {
    const payload = await response.clone().json();
    return payload?.error || payload?.message || fallback;
  } catch {
    return fallback;
  }
};

export function LocationDatabaseDialog({ open, onOpenChange, onSelect }: LocationDatabaseDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState<string>("US");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [minPop, setMinPop] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [countryOpen, setCountryOpen] = useState(false);
  const [batchSize, setBatchSize] = useState<number>(100);
  const [seedProgress, setSeedProgress] = useState(0);
  const [seedElapsed, setSeedElapsed] = useState(0);
  const [seedStage, setSeedStage] = useState<string>("");
  const [seedResult, setSeedResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [bulkLoaderOpen, setBulkLoaderOpen] = useState(false);
  // Server-side pagination: each page is a small range request; total row
  // count is returned via PostgREST's estimated head count. Big countries no
  // longer stream tens of thousands of rows to the browser.
  const PAGE_SIZE = 100;

  const escapeIlike = (s: string) => s.replace(/([%_,()])/g, "\\$1");


  const seedMutation = useMutation({
    mutationFn: async (opts?: { countryCode?: string; expand?: boolean; state?: string; region?: string; target?: number; bulk?: boolean; all?: boolean }) => {
      const body: Record<string, unknown> = {};
      if (opts?.countryCode) body.country_code = opts.countryCode;
      if (opts?.expand) body.expand = true;
      if (opts?.state && opts.state !== "all") body.state = opts.state;
      if (opts?.region && opts.region !== "all") body.region = opts.region;
      if (opts?.target && opts.target > 0) body.target = opts.target;
      if (opts?.bulk) body.bulk = true;
      if (opts?.all) body.all = true;
      const { data, error } = await supabase.functions.invoke("seed-locations", { body });
      if (error) throw new Error(await getFunctionErrorMessage(error));
      if (data?.error) throw new Error(data.error);
      return data as { inserted?: number; skipped_duplicates?: number };
    },
    onSuccess: (data) => {
      setSeedProgress(100);
      setSeedStage("Complete");
      setSeedResult({ inserted: data?.inserted ?? 0, skipped: data?.skipped_duplicates ?? 0 });
      toast({
        title: "Location database updated",
        description: `Added ${data?.inserted ?? 0} cities${data?.skipped_duplicates ? ` (skipped ${data.skipped_duplicates} duplicates)` : ""}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["locations-db"] });
      queryClient.invalidateQueries({ queryKey: ["locations-db-meta"] });
      // Report stays visible until user dismisses it.
    },
    onError: (err: Error) => {
      setSeedProgress(0);
      setSeedStage("");
      toast({ title: "Loading failed", description: err.message, variant: "destructive" });
    },
  });

  // Simulated progress + elapsed timer while seeding (AI call, no server events).
  useEffect(() => {
    if (!seedMutation.isPending) return;
    setSeedProgress(5);
    setSeedElapsed(0);
    setSeedResult(null);
    const start = Date.now();
    const stages = [
      { at: 0, label: "Preparing request…" },
      { at: 2, label: "Asking AI for cities…" },
      { at: 8, label: "Generating city data…" },
      { at: 18, label: "Deduplicating & saving…" },
      { at: 30, label: "Finalizing…" },
    ];
    const tick = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      setSeedElapsed(elapsed);
      // Asymptotic curve toward 92% over ~35s
      const pct = Math.min(92, 5 + (1 - Math.exp(-elapsed / 12)) * 87);
      setSeedProgress(pct);
      const active = [...stages].reverse().find(s => elapsed >= s.at);
      if (active) setSeedStage(active.label);
    }, 300);
    return () => clearInterval(tick);
  }, [seedMutation.isPending]);

  const [cacheStats, setCacheStats] = useState<{ hits: number; misses: number; entries: number; rows: number }>({
    hits: 0,
    misses: 0,
    entries: 0,
    rows: 0,
  });

  const recomputeCacheSize = () => {
    const cache = queryClient.getQueryCache();
    let entries = 0;
    let rows = 0;
    for (const q of cache.getAll()) {
      const key = q.queryKey as unknown[];
      if (Array.isArray(key) && key[0] === "locations-db") {
        const data = q.state.data as any[] | undefined;
        if (Array.isArray(data)) {
          entries += 1;
          rows += data.length;
        }
      }
    }
    setCacheStats((s) => ({ ...s, entries, rows }));
  };

  const [retryAttempt, setRetryAttempt] = useState(0);

  // Debounce search + min-population so we don't fire a request per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);
  const isDebouncing = search.trim() !== debouncedSearch;

  const [debouncedMinPop, setDebouncedMinPop] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedMinPop(minPop.trim()), 250);
    return () => clearTimeout(t);
  }, [minPop]);

  // Server-side paginated + filtered listing. Each page is a small
  // range request (100 rows). Total count comes from PostgREST's exact
  // count header so the UI still shows "X cities" without holding them all.
  const listingKey = [
    "locations-db",
    countryFilter,
    stateFilter,
    regionFilter,
    debouncedSearch,
    debouncedMinPop,
  ] as const;

  const listingQuery = useInfiniteQuery({
    queryKey: listingKey,
    enabled: open,
    initialPageParam: 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    queryFn: async ({ pageParam }) => {
      setCacheStats((s) => ({ ...s, misses: s.misses + 1 }));
      setRetryAttempt((n) => n + 1);
      const from = (pageParam as number) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let q = supabase
        .from("locations")
        .select("*", { count: "exact" })
        .eq("country_code", countryFilter)
        .order("population", { ascending: false, nullsFirst: false })
        .order("city", { ascending: true })
        .range(from, to);

      if (stateFilter !== "all") q = q.eq("state", stateFilter);
      if (regionFilter !== "all") q = q.eq("region", regionFilter);
      if (debouncedMinPop) {
        const min = parseInt(debouncedMinPop);
        if (!Number.isNaN(min)) q = q.gte("population", min);
      }
      if (debouncedSearch) {
        const term = escapeIlike(debouncedSearch);
        // Server-side OR search across the columns users type into. Trigram
        // indexes on city/state/region/zip keep ILIKE '%q%' fast.
        q = q.or(
          [
            `city.ilike.%${term}%`,
            `county.ilike.%${term}%`,
            `state.ilike.%${term}%`,
            `state_code.ilike.%${term}%`,
            `region.ilike.%${term}%`,
            `zip_code.ilike.%${term}%`,
          ].join(","),
        );
      }

      const { data, count, error } = await q;
      if (error) {
        const enriched = new Error(
          `[${error.code ?? "db_error"}] ${error.message}${error.hint ? ` — ${error.hint}` : ""}${error.details ? ` (${error.details})` : ""}`,
        );
        (enriched as any).cause = error;
        throw enriched;
      }
      queueMicrotask(recomputeCacheSize);
      return { rows: (data ?? []) as any[], count: count ?? 0, page: pageParam as number };
    },
    getNextPageParam: (last) => {
      const loaded = (last.page + 1) * PAGE_SIZE;
      return loaded < (last.count ?? 0) ? last.page + 1 : undefined;
    },
  });

  const { isLoading, isFetching, dataUpdatedAt, refetch, error, isError, failureCount, hasNextPage, isFetchingNextPage, fetchNextPage } = listingQuery;
  const listingData = listingQuery.data;
  const totalCount = listingData?.pages?.[0]?.count ?? 0;
  const visibleLocations = useMemo(
    () => (listingData?.pages ?? []).flatMap((p) => p.rows),
    [listingData],
  );
  // Kept for legacy code paths (export, selectAll, toggleLocation) that used
  // to read from a fully-loaded list. In server-side mode they act on the
  // rows currently loaded into view.
  const locations = visibleLocations;
  const filteredLocations = visibleLocations;
  const hasMore = !!hasNextPage;

  const errorMessage = useMemo(() => {
    if (!error) return null;
    const raw = error instanceof Error ? error.message : String(error);
    const lower = raw.toLowerCase();
    let hint = "Try again in a moment.";
    if (lower.includes("failed to fetch") || lower.includes("network")) {
      hint = "You appear to be offline — check your internet connection.";
    } else if (lower.includes("jwt") || lower.includes("auth") || lower.includes("401")) {
      hint = "Your session may have expired — reload the page to sign in again.";
    } else if (lower.includes("permission") || lower.includes("rls") || lower.includes("403")) {
      hint = "You don't have access to this workspace's locations.";
    } else if (lower.includes("timeout") || lower.includes("timed out")) {
      hint = "The database took too long to respond. Try a narrower filter.";
    } else if (lower.includes("rate") || lower.includes("429")) {
      hint = "Too many requests — wait a few seconds before retrying.";
    }
    return { raw, hint };
  }, [error]);

  // Cache-hit counter (fires when a filter combo is already fresh in cache).
  useEffect(() => {
    if (!open) return;
    const state = queryClient.getQueryState(listingKey as unknown as any[]);
    if (state?.data && state.status === "success" && Date.now() - state.dataUpdatedAt < 5 * 60 * 1000) {
      setCacheStats((s) => ({ ...s, hits: s.hits + 1 }));
    }
    recomputeCacheSize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryFilter, stateFilter, regionFilter, debouncedSearch, debouncedMinPop, open]);

  // States/regions dropdowns: single RPC round-trip returns distinct values
  // for the selected country instead of streaming every row.
  const { data: metaData } = useQuery({
    queryKey: ["locations-db-meta", countryFilter],
    enabled: open,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_location_meta", { _country_code: countryFilter });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return {
        states: (row?.states ?? []) as string[],
        regions: (row?.regions ?? []) as string[],
      };
    },
  });
  const allStates = metaData?.states ?? [];
  const allRegions = metaData?.regions ?? [];

  // Sentinel-driven infinite scroll: fetch the next server page as the
  // user nears the bottom of the list.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const setSentinel = useCallback(
    (node: HTMLDivElement | null) => {
      if (sentinelRef.current) sentinelRef.current = null;
      sentinelRef.current = node;
      if (!node || !hasNextPage) return;
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting) && !isFetchingNextPage) {
            fetchNextPage();
          }
        },
        { root: null, rootMargin: "200px", threshold: 0 },
      );
      io.observe(node);
      (node as any).__io = io;
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );
  useEffect(() => {
    return () => {
      const n = sentinelRef.current as any;
      if (n?.__io) n.__io.disconnect();
    };
  }, []);

  const toggleLocation = (id: string) => {
    const row: any = visibleLocations.find((l: any) => l.id === id);
    if (row && row.country_code && row.country_code !== countryFilter) {
      toast({
        title: "City locked to selected country",
        description: `That city belongs to ${row.country_code}, not ${countryFilter}. Switch country first.`,
        variant: "destructive",
      });
      return;
    }
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };


  const selectAll = () => {
    if (selectedIds.size === filteredLocations.length) {
      setSelectedIds(new Set());
    } else {
      // Only ever select cities whose country_code matches the locked country.
      const eligible = filteredLocations.filter((l: any) => !l.country_code || l.country_code === countryFilter);
      setSelectedIds(new Set(eligible.map((l: any) => l.id)));
    }
  };

  const buildExportRows = (source: "filtered" | "selected") => {
    const base = source === "selected"
      ? filteredLocations.filter((l: any) => selectedIds.has(l.id))
      : filteredLocations;
    return base.map((l: any) => ({
      city: l.city ?? "",
      county: l.county ?? "",
      state: l.state ?? "",
      state_code: l.state_code ?? "",
      zip_code: l.zip_code ?? "",
      country: l.country ?? "",
      country_code: l.country_code ?? "",
      latitude: l.latitude ?? "",
      longitude: l.longitude ?? "",
      population: l.population ?? "",
      timezone: l.timezone ?? "",
      region: l.region ?? "",
      area_code: l.area_code ?? "",
      phone_country_code: l.phone_country_code ?? "",
      population_male: l.population_male ?? "",
      population_female: l.population_female ?? "",
      median_age: l.median_age ?? "",
      median_household_income: l.median_household_income ?? "",
      wikipedia_url: l.wikipedia_url ?? "",
    }));
  };

  const exportFileName = (ext: string) => {
    const parts = ["locations", countryFilter];
    if (stateFilter !== "all") parts.push(stateFilter.replace(/\s+/g, "-"));
    if (regionFilter !== "all") parts.push(regionFilter.replace(/\s+/g, "-"));
    const stamp = new Date().toISOString().slice(0, 10);
    return `${parts.join("_")}_${stamp}.${ext}`;
  };

  const downloadBlob = (content: string, mime: string, filename: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const escapeCsv = (val: unknown) => {
    const s = val === null || val === undefined ? "" : String(val);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const handleExport = (format: "csv" | "json", source: "filtered" | "selected") => {
    const rows = buildExportRows(source);
    if (rows.length === 0) {
      toast({
        title: "Nothing to export",
        description: source === "selected"
          ? "Select at least one city, or export the full filtered list."
          : "No cities match the current filters.",
        variant: "destructive",
      });
      return;
    }
    if (format === "json") {
      downloadBlob(JSON.stringify(rows, null, 2), "application/json", exportFileName("json"));
    } else {
      const headers = Object.keys(rows[0]);
      const lines = [headers.join(",")];
      for (const r of rows) lines.push(headers.map((h) => escapeCsv((r as any)[h])).join(","));
      downloadBlob(lines.join("\n"), "text/csv;charset=utf-8", exportFileName("csv"));
    }
    toast({
      title: `Exported ${rows.length} ${rows.length === 1 ? "city" : "cities"}`,
      description: `${format.toUpperCase()} · ${countryName}${stateFilter !== "all" ? ` · ${stateFilter}` : ""}${regionFilter !== "all" ? ` · ${regionFilter}` : ""}`,
    });
  };

  const handleConfirm = () => {
    const selected = filteredLocations.filter((l: any) => selectedIds.has(l.id));
    const rows = selected.map((l: any) => ({
      city: l.city || "",
      county: l.county || "",
      state: l.state || "",
      state_code: l.state_code || "",
      zip_code: l.zip_code || "",
      country: l.country || "",
      country_code: l.country_code || "",
      latitude: String(l.latitude || ""),
      longitude: String(l.longitude || ""),
      population: String(l.population || ""),
      timezone: l.timezone || "",
      region: l.region || "",
      area_code: l.area_code || "",
      phone_country_code: l.phone_country_code || "",
      population_male: String(l.population_male || ""),
      population_female: String(l.population_female || ""),
      median_age: String(l.median_age || ""),
      median_household_income: String(l.median_household_income || ""),
      wikipedia_url: l.wikipedia_url || "",
    }));
    onSelect(rows);
    onOpenChange(false);
    setSelectedIds(new Set());
  };

  const handleCountryChange = (code: string) => {
    if (code === countryFilter) { setCountryOpen(false); return; }
    if (selectedIds.size > 0) {
      const ok = window.confirm(
        `You have ${selectedIds.size} city selection${selectedIds.size === 1 ? "" : "s"} locked to ${countryName}. Switching country will clear them. Continue?`,
      );
      if (!ok) { setCountryOpen(false); return; }
    }
    setCountryFilter(code);
    setStateFilter("all");
    setRegionFilter("all");
    setSearch("");
    setSelectedIds(new Set());
    setCountryOpen(false);
  };

  const isEmpty = !isLoading && locations.length === 0;
  const countryName = ALL_COUNTRIES.find(c => c.code === countryFilter)?.name || countryFilter;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Location Database
          </DialogTitle>
          <DialogDescription>
            Select any country and browse cities to use as your campaign data source.
          </DialogDescription>
        </DialogHeader>

        {/* Country selector — searchable combobox. Cities are auto-locked to the selected country. */}
        <Popover open={countryOpen} onOpenChange={setCountryOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={countryOpen}
              className="w-full justify-between rounded-xl h-10 text-sm"
            >
              <span className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary shrink-0" />
                {countryName}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search country..." />
              <CommandList>
                <CommandEmpty>No country found.</CommandEmpty>
                <CommandGroup>
                  {ALL_COUNTRIES.map((c) => (
                    <CommandItem
                      key={c.code}
                      value={c.name}
                      onSelect={() => handleCountryChange(c.code)}
                    >
                      <Check className={cn("mr-2 h-4 w-4", countryFilter === c.code ? "opacity-100" : "opacity-0")} />
                      <span className="text-xs font-medium text-muted-foreground mr-2">{c.code}</span>
                      {c.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 -mt-1">
          <Check className="h-3 w-3 text-primary" />
          Cities are locked to <span className="font-semibold text-foreground">{countryName}</span>. Change country to pick from another region.
        </p>

        {/* Coverage check: warn when the selected country has no cities in the DB. */}
        {open && !isLoading && !seedMutation.isPending && !debouncedSearch && stateFilter === "all" && regionFilter === "all" && !debouncedMinPop && totalCount === 0 && (
          <div
            role="alert"
            className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 flex items-start gap-2"
          >
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <p className="text-xs font-semibold text-destructive">
                No city coverage for {countryName}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Your Location Database has 0 cities for <span className="font-medium">{countryName}</span>. Load them now so your campaign has real geo data to attach.
              </p>
              <Button
                size="sm"
                variant="destructive"
                className="h-7 text-[11px] gap-1.5"
                disabled={seedMutation.isPending}
                onClick={() => seedMutation.mutate({ countryCode: countryFilter, bulk: true })}
              >
                <Download className="h-3 w-3" />
                Load ALL {countryName} cities
              </Button>
            </div>
          </div>
        )}



        {(seedMutation.isPending || seedProgress > 0 || seedResult) && (
          <div
            className={cn(
              "rounded-xl border p-3 space-y-2 animate-in fade-in slide-in-from-top-1",
              seedResult ? "border-success/30 bg-success/5" : "border-primary/30 bg-primary/5",
            )}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-medium">
                {seedMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                ) : (
                  <Check className="h-3.5 w-3.5 text-success" />
                )}
                <span className={seedResult ? "text-success" : "text-primary"}>
                  {seedResult
                    ? "Load complete"
                    : seedStage || "Loading cities…"}
                </span>
              </span>
              <span className="flex items-center gap-2 tabular-nums text-muted-foreground">
                <span>
                  {Math.round(seedProgress)}%
                  {seedMutation.isPending && ` · ${seedElapsed.toFixed(1)}s`}
                </span>
                {seedResult && (
                  <button
                    type="button"
                    onClick={() => { setSeedResult(null); setSeedProgress(0); setSeedStage(""); }}
                    className="rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition"
                    aria-label="Dismiss report"
                  >
                    Dismiss
                  </button>
                )}
              </span>
            </div>
            <Progress value={seedProgress} className="h-1.5" />
            {seedMutation.isPending && (
              <p className="text-[10px] text-muted-foreground">
                Loading global city data — this can take 15–90 seconds for large countries. Please keep this dialog open.
              </p>
            )}
            {seedResult && (
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="rounded-lg border border-success/20 bg-success/10 p-2">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Added</div>
                  <div className="text-lg font-bold tabular-nums text-success">+{seedResult.inserted}</div>
                  <div className="text-[10px] text-muted-foreground">new cities</div>
                </div>
                <div className="rounded-lg border border-warning/20 bg-warning/10 p-2">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Skipped</div>
                  <div className="text-lg font-bold tabular-nums text-warning">{seedResult.skipped}</div>
                  <div className="text-[10px] text-muted-foreground">duplicates</div>
                </div>
                <div className="rounded-lg border border-primary/20 bg-primary/10 p-2">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Processed</div>
                  <div className="text-lg font-bold tabular-nums text-primary">{seedResult.inserted + seedResult.skipped}</div>
                  <div className="text-[10px] text-muted-foreground">total rows</div>
                </div>
              </div>
            )}
            {seedResult && seedResult.inserted === 0 && seedResult.skipped > 0 && (
              <p className="text-[10px] text-muted-foreground">
                All returned cities already existed in your database — nothing new to add.
              </p>
            )}
            {seedResult && seedResult.inserted === 0 && seedResult.skipped === 0 && (
              <p className="text-[10px] text-muted-foreground">
                No cities returned. Try a different country/region or check your AI credits.
              </p>
            )}
          </div>
        )}


        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Globe className="h-12 w-12 text-muted-foreground/30" />
            <div className="text-center">
              <p className="text-sm font-medium">No cities found for {countryName}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Load cities for {countryName} to get started.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => {
                  seedMutation.mutate(
                    { countryCode: countryFilter, bulk: true },
                    { onSuccess: () => void refetch() },
                  );
                }}
                disabled={seedMutation.isPending}
                className="rounded-xl gap-2"
              >
                {seedMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Globe className="h-4 w-4" />
                )}
                {seedMutation.isPending ? "Loading…" : `Load ALL ${countryName} cities (global DB)`}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  seedMutation.mutate(
                    { countryCode: countryFilter, target: batchSize },
                    { onSuccess: () => void refetch() },
                  );
                }}
                disabled={seedMutation.isPending}
                className="rounded-xl gap-2"
              >
                <Download className="h-4 w-4" />
                AI batch ({batchSize})
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-3 min-h-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="col-span-2 sm:col-span-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={`Search cities in ${countryName}...`}
                    className="h-8 pl-8 pr-8 text-xs rounded-xl"
                  />
                  {isDebouncing && (
                    <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground animate-spin" />
                  )}
                </div>
              </div>
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger className="h-8 text-xs rounded-xl">
                  <SelectValue placeholder="All states" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States / Provinces</SelectItem>
                  {allStates.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="h-8 text-xs rounded-xl">
                  <SelectValue placeholder="All regions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {allRegions.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={minPop}
                onChange={(e) => setMinPop(e.target.value)}
                placeholder="Min population"
                type="number"
                className="h-8 text-xs rounded-xl"
              />
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <button type="button" className="text-xs text-primary hover:underline font-medium" onClick={selectAll}>
                  {selectedIds.size === filteredLocations.length && filteredLocations.length > 0 ? "Deselect all" : "Select all"}
                </button>
                <span className="text-xs text-muted-foreground">
                  {selectedIds.size} / {filteredLocations.length} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                {dataUpdatedAt > 0 && !isLoading && (
                  <span className="text-[10px] text-muted-foreground tabular-nums hidden sm:inline">
                    {isFetching ? "Refreshing…" : `Cached · updated ${new Date(dataUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                  </span>
                )}
                <Badge
                  variant="secondary"
                  className="text-[10px] tabular-nums gap-1 rounded-lg font-normal"
                  title={`Cache hits: ${cacheStats.hits} · misses: ${cacheStats.misses} · ${cacheStats.entries} filter combo(s) cached · ${cacheStats.rows.toLocaleString()} rows in memory (this session)`}
                >
                  <span className="text-success">✓{cacheStats.hits}</span>
                  <span className="text-warning">✗{cacheStats.misses}</span>
                  <span className="text-muted-foreground">· {cacheStats.entries}k/{cacheStats.rows.toLocaleString()}r</span>
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-xl gap-1.5 text-xs"
                  onClick={() => setBulkLoaderOpen(true)}
                  title="Re-run the city loader across one or many countries with retries and a per-country summary"
                >
                  <RefreshCw className="h-3 w-3" />
                  Re-run loader
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 rounded-xl gap-1.5 text-xs"
                  disabled={isFetching}
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ["locations-db", countryFilter, stateFilter, regionFilter] });
                    queryClient.invalidateQueries({ queryKey: ["locations-db-meta", countryFilter] });
                    refetch();
                  }}
                  title="Refresh from database"
                >
                  <RefreshCw className={cn("h-3 w-3", isFetching && "animate-spin")} />
                  Refresh
                </Button>
                <div className="flex items-center gap-1" title="How many cities the AI should generate per load">
                  <span className="text-[10px] text-muted-foreground hidden md:inline">Batch</span>
                  <Select value={String(batchSize)} onValueChange={(v) => setBatchSize(Number(v))}>
                    <SelectTrigger className="h-7 w-[80px] rounded-xl text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  className="h-7 rounded-xl gap-1.5 text-xs"
                  disabled={seedMutation.isPending}
                  onClick={() => {
                    seedMutation.mutate(
                      { countryCode: countryFilter, bulk: true },
                      { onSuccess: () => void refetch() },
                    );
                  }}
                  title={`Load ALL cities for ${countryName} from the global cities database`}
                >
                  {seedMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Globe className="h-3 w-3" />
                  )}
                  Load ALL {countryName}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-xl gap-1.5 text-xs"
                  disabled={seedMutation.isPending}
                  onClick={() => {
                    seedMutation.mutate(
                      {
                        countryCode: countryFilter,
                        expand: true,
                        state: stateFilter !== "all" ? stateFilter : undefined,
                        region: regionFilter !== "all" ? regionFilter : undefined,
                        target: batchSize,
                      },
                      { onSuccess: () => void refetch() },
                    );
                  }}
                  title={
                    stateFilter !== "all" || regionFilter !== "all"
                      ? `Load more cities in ${stateFilter !== "all" ? stateFilter : regionFilter}`
                      : `Load more cities across ${countryName}`
                  }
                >
                  {seedMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Download className="h-3 w-3" />
                  )}
                  {seedMutation.isPending
                    ? "Loading..."
                    : stateFilter !== "all"
                      ? `Load all in ${stateFilter}`
                      : regionFilter !== "all"
                        ? `Load all in ${regionFilter}`
                        : "AI batch"}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 rounded-xl gap-1.5 text-xs"
                      disabled={filteredLocations.length === 0}
                      title="Export current filter as CSV or JSON"
                    >
                      <Download className="h-3 w-3" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {countryName}
                      {stateFilter !== "all" && ` · ${stateFilter}`}
                      {regionFilter !== "all" && ` · ${regionFilter}`}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleExport("csv", "filtered")} className="gap-2 text-xs">
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      CSV · filtered ({filteredLocations.length})
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("json", "filtered")} className="gap-2 text-xs">
                      <FileJson className="h-3.5 w-3.5" />
                      JSON · filtered ({filteredLocations.length})
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleExport("csv", "selected")}
                      disabled={selectedIds.size === 0}
                      className="gap-2 text-xs"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      CSV · selected ({selectedIds.size})
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleExport("json", "selected")}
                      disabled={selectedIds.size === 0}
                      className="gap-2 text-xs"
                    >
                      <FileJson className="h-3.5 w-3.5" />
                      JSON · selected ({selectedIds.size})
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Badge variant="outline" className="text-[10px]">
                  {filteredLocations.length} cities
                </Badge>
              </div>
            </div>

            {isError && errorMessage && (
              <div
                className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 space-y-2 animate-in fade-in slide-in-from-top-1"
                role="alert"
                aria-live="assertive"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-destructive">
                      Couldn't load locations
                      {failureCount > 1 && (
                        <span className="ml-1.5 font-normal text-muted-foreground">
                          · retried {failureCount}×
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{errorMessage.hint}</p>
                    <details className="mt-1.5">
                      <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">
                        Technical details
                      </summary>
                      <pre className="mt-1 text-[10px] font-mono whitespace-pre-wrap break-all rounded bg-muted/50 p-2 text-muted-foreground">
                        {errorMessage.raw}
                      </pre>
                    </details>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-lg gap-1.5 text-xs shrink-0"
                    disabled={isFetching}
                    onClick={() => {
                      toast({ title: "Retrying…", description: `Attempt ${failureCount + 1}` });
                      refetch();
                    }}
                  >
                    <RefreshCw className={cn("h-3 w-3", isFetching && "animate-spin")} />
                    Retry
                  </Button>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                {retryAttempt > 1 && (
                  <span className="text-[10px] text-muted-foreground">
                    Retry attempt {retryAttempt}…
                  </span>
                )}
              </div>
            ) : (
              <div className="flex-1 min-h-[320px] max-h-[55vh] overflow-y-auto overscroll-contain rounded-xl border border-border">
                <div className="space-y-0.5 p-1">

                  {visibleLocations.map((loc: any) => {
                    const isSelected = selectedIds.has(loc.id);
                    return (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => toggleLocation(loc.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                          isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"
                        )}
                      >
                        <Checkbox checked={isSelected} className="shrink-0 pointer-events-none" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">{loc.city}</span>
                            <Badge variant="outline" className="text-[9px] shrink-0">{loc.state_code}</Badge>
                            {loc.region && (
                              <Badge variant="secondary" className="text-[9px] shrink-0">{loc.region}</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                            {loc.county && <span>{loc.county} County</span>}
                            {loc.zip_code && <span>ZIP: {loc.zip_code}</span>}
                            {loc.population && (
                              <span>Pop: {(loc.population / 1000).toFixed(0)}K</span>
                            )}
                            {loc.latitude && <span>{loc.latitude}, {loc.longitude}</span>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {hasMore && (
                    <div
                      ref={setSentinel}
                      className="flex items-center justify-center gap-2 py-3 text-[10px] text-muted-foreground"
                    >
                      {isFetchingNextPage && <Loader2 className="h-3 w-3 animate-spin" />}
                      Loading more… ({visibleLocations.length}/{totalCount.toLocaleString()})
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-[10px]"
                        disabled={isFetchingNextPage}
                        onClick={() => fetchNextPage()}
                      >
                        Load more
                      </Button>
                    </div>
                  )}
                  {!hasMore && totalCount > PAGE_SIZE && (
                    <div className="text-center py-2 text-[10px] text-muted-foreground">
                      Showing all {totalCount.toLocaleString()} cities
                    </div>
                  )}

                </div>
              </div>

            )}

            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs text-muted-foreground">Columns:</span>
              {["city", "county", "state", "state_code", "zip_code", "country", "country_code", "latitude", "longitude", "population", "timezone", "region", "area_code", "median_age", "median_household_income"].map((h) => (
                <Badge key={h} variant="secondary" className="text-xs rounded-lg">{h}</Badge>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={selectedIds.size === 0}
                className="rounded-xl gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                Use {selectedIds.size} Location{selectedIds.size !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
      <BulkCityLoaderDialog
        open={bulkLoaderOpen}
        onOpenChange={setBulkLoaderOpen}
        initialSelected={[countryFilter]}
        onCompleted={() => {
          queryClient.invalidateQueries({ queryKey: ["locations-db"] });
          queryClient.invalidateQueries({ queryKey: ["locations-db-meta"] });
        }}
      />
    </Dialog>
  );
}
