import { useState, useMemo, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Search, Database, Download, Loader2, Globe, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ALL_COUNTRIES } from "@/lib/countries";

interface LocationDatabaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (locations: Record<string, string>[]) => void;
}

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
  const [seedProgress, setSeedProgress] = useState(0);
  const [seedElapsed, setSeedElapsed] = useState(0);
  const [seedStage, setSeedStage] = useState<string>("");
  const [seedResult, setSeedResult] = useState<{ inserted: number; skipped: number } | null>(null);

  const seedMutation = useMutation({
    mutationFn: async (opts?: { countryCode?: string; expand?: boolean; state?: string; region?: string }) => {
      const body: Record<string, unknown> = {};
      if (opts?.countryCode) body.country_code = opts.countryCode;
      if (opts?.expand) body.expand = true;
      if (opts?.state && opts.state !== "all") body.state = opts.state;
      if (opts?.region && opts.region !== "all") body.region = opts.region;
      const { data, error } = await supabase.functions.invoke("seed-locations", { body });
      if (error) throw error;
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
      setTimeout(() => { setSeedProgress(0); setSeedStage(""); setSeedResult(null); }, 3500);
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

  const { data: locations = [], isLoading, refetch } = useQuery({
    queryKey: ["locations-db", countryFilter, stateFilter, regionFilter],
    enabled: open,
    queryFn: async () => {
      let query = supabase
        .from("locations")
        .select("*")
        .eq("country_code", countryFilter)
        .order("population", { ascending: false })
        .limit(5000);

      if (stateFilter !== "all") query = query.eq("state", stateFilter);
      if (regionFilter !== "all") query = query.eq("region", regionFilter);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: allCountryLocations = [] } = useQuery({
    queryKey: ["locations-db-meta", countryFilter],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("state, region")
        .eq("country_code", countryFilter);
      if (error) throw error;
      return data || [];
    },
  });

  const { allStates, allRegions } = useMemo(() => {
    const states = new Set<string>();
    const regions = new Set<string>();
    allCountryLocations.forEach((l: any) => {
      if (l.state) states.add(l.state);
      if (l.region) regions.add(l.region);
    });
    return {
      allStates: Array.from(states).sort(),
      allRegions: Array.from(regions).sort(),
    };
  }, [allCountryLocations]);

  const filteredLocations = useMemo(() => {
    let result = locations;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((l: any) =>
        l.city?.toLowerCase().includes(q) ||
        l.county?.toLowerCase().includes(q) ||
        l.zip_code?.includes(q)
      );
    }
    if (minPop) {
      const min = parseInt(minPop);
      if (!isNaN(min)) result = result.filter((l: any) => (l.population || 0) >= min);
    }
    return result;
  }, [locations, search, minPop]);

  const toggleLocation = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredLocations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLocations.map((l: any) => l.id)));
    }
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

        {/* Country selector — searchable combobox */}
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
                    ? `Done — added ${seedResult.inserted} cities${seedResult.skipped ? ` (${seedResult.skipped} duplicates skipped)` : ""}`
                    : seedStage || "Loading cities…"}
                </span>
              </span>
              <span className="tabular-nums text-muted-foreground">
                {Math.round(seedProgress)}%
                {seedMutation.isPending && ` · ${seedElapsed.toFixed(1)}s`}
              </span>
            </div>
            <Progress value={seedProgress} className="h-1.5" />
            {seedMutation.isPending && (
              <p className="text-[10px] text-muted-foreground">
                AI is generating cities — this usually takes 15–45 seconds. Please keep this dialog open.
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
            <Button
              onClick={async () => {
                await seedMutation.mutateAsync({ countryCode: countryFilter });
                refetch();
              }}
              disabled={seedMutation.isPending}
              className="rounded-xl gap-2"
            >
              {seedMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {seedMutation.isPending ? "Loading cities..." : `Load ${countryName} Cities`}
            </Button>
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
                    placeholder="Search city, county, zip..."
                    className="h-8 pl-8 text-xs rounded-xl"
                  />
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
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-xl gap-1.5 text-xs"
                  disabled={seedMutation.isPending}
                  onClick={async () => {
                    await seedMutation.mutateAsync({
                      countryCode: countryFilter,
                      expand: true,
                      state: stateFilter !== "all" ? stateFilter : undefined,
                      region: regionFilter !== "all" ? regionFilter : undefined,
                    });
                    refetch();
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
                        : "Load more cities"}
                </Button>
                <Badge variant="outline" className="text-[10px]">
                  {filteredLocations.length} cities
                </Badge>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : (
              <ScrollArea className="flex-1 min-h-0 max-h-[300px] rounded-xl border border-border">
                <div className="space-y-0.5 p-1">
                  {filteredLocations.map((loc: any) => {
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
                </div>
              </ScrollArea>
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
    </Dialog>
  );
}
