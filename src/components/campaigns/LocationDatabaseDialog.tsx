import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Search, Database, Download, Loader2, Globe, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface LocationDatabaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (locations: Record<string, string>[]) => void;
}

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","District of Columbia","Florida","Georgia","Hawaii","Idaho","Illinois",
  "Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts",
  "Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
  "New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota",
  "Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina",
  "South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington",
  "West Virginia","Wisconsin","Wyoming",
];

const REGIONS = ["Northeast", "Southeast", "Midwest", "Southwest", "West"];

export function LocationDatabaseDialog({ open, onOpenChange, onSelect }: LocationDatabaseDialogProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [minPop, setMinPop] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Seed locations if empty
  const seedMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("seed-locations");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: "Location database loaded", description: "Cities are now available." });
    },
    onError: (err: Error) => {
      toast({ title: "Seeding failed", description: err.message, variant: "destructive" });
    },
  });

  const { data: locations = [], isLoading, refetch } = useQuery({
    queryKey: ["locations-db", stateFilter, regionFilter],
    enabled: open,
    queryFn: async () => {
      let query = supabase
        .from("locations")
        .select("*")
        .order("population", { ascending: false })
        .limit(1000);

      if (stateFilter !== "all") {
        query = query.eq("state", stateFilter);
      }
      if (regionFilter !== "all") {
        query = query.eq("region", regionFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

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
      if (!isNaN(min)) {
        result = result.filter((l: any) => (l.population || 0) >= min);
      }
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
      country: l.country || "United States",
      latitude: String(l.latitude || ""),
      longitude: String(l.longitude || ""),
      population: String(l.population || ""),
      timezone: l.timezone || "",
      region: l.region || "",
    }));
    onSelect(rows);
    onOpenChange(false);
    setSelectedIds(new Set());
  };

  const isEmpty = !isLoading && locations.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Location Database
          </DialogTitle>
          <DialogDescription>
            Browse and select cities to use as your campaign data source. No CSV needed.
          </DialogDescription>
        </DialogHeader>

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Globe className="h-12 w-12 text-muted-foreground/30" />
            <div className="text-center">
              <p className="text-sm font-medium">Location database is empty</p>
              <p className="text-xs text-muted-foreground mt-1">
                Load the built-in US cities database to get started.
              </p>
            </div>
            <Button
              onClick={async () => {
                await seedMutation.mutateAsync();
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
              {seedMutation.isPending ? "Loading cities..." : "Load US Cities Database"}
            </Button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-3 min-h-0">
            {/* Filters */}
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
                  <SelectItem value="all">All States</SelectItem>
                  {US_STATES.map((s) => (
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
                  {REGIONS.map((r) => (
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

            {/* Stats bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="text-xs text-primary hover:underline font-medium"
                  onClick={selectAll}
                >
                  {selectedIds.size === filteredLocations.length && filteredLocations.length > 0 ? "Deselect all" : "Select all"}
                </button>
                <span className="text-xs text-muted-foreground">
                  {selectedIds.size} / {filteredLocations.length} selected
                </span>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {filteredLocations.length} cities
              </Badge>
            </div>

            {/* Locations list */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : (
              <ScrollArea className="flex-1 min-h-0 max-h-[360px] rounded-xl border border-border">
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
                            <span>{loc.county} County</span>
                            <span>ZIP: {loc.zip_code}</span>
                            {loc.population && (
                              <span>Pop: {(loc.population / 1000).toFixed(0)}K</span>
                            )}
                            <span>{loc.latitude}, {loc.longitude}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}

            {/* Available columns preview */}
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs text-muted-foreground">Columns:</span>
              {["city", "county", "state", "state_code", "zip_code", "country", "latitude", "longitude", "population", "timezone", "region"].map((h) => (
                <Badge key={h} variant="secondary" className="text-xs rounded-lg">{h}</Badge>
              ))}
            </div>

            {/* Confirm */}
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
