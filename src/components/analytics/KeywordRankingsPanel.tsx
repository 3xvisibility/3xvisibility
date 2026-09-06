import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDown, ArrowUp, Minus, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
  color: "hsl(var(--popover-foreground))",
};

const LINE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, 217 91% 60%))",
  "hsl(var(--chart-3, 142 71% 45%))",
  "hsl(var(--chart-4, 38 92% 50%))",
  "hsl(var(--chart-5, 340 82% 60%))",
];

interface TrackedKeyword {
  id: string;
  keyword: string;
  target_url: string | null;
  country: string;
  search_volume: number;
  difficulty: number;
  current_position: number | null;
  previous_position: number | null;
  last_checked_at: string | null;
}

interface RankingRow {
  keyword_id: string;
  position: number;
  clicks: number;
  impressions: number;
  recorded_at: string;
}

export default function KeywordRankingsPanel({ workspaceId }: { workspaceId?: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    keyword: "",
    target_url: "",
    country: "us",
    search_volume: "",
    difficulty: "",
    current_position: "",
  });

  const { data: keywords = [], isLoading } = useQuery({
    queryKey: ["tracked-keywords", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracked_keywords")
        .select("id, keyword, target_url, country, search_volume, difficulty, current_position, previous_position, last_checked_at")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as TrackedKeyword[];
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["keyword-rankings", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("keyword_rankings")
        .select("keyword_id, position, clicks, impressions, recorded_at")
        .eq("workspace_id", workspaceId!)
        .order("recorded_at", { ascending: true })
        .limit(1000);
      if (error) throw error;
      return (data || []) as RankingRow[];
    },
  });

  const addKeyword = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !workspaceId) throw new Error("Not signed in");
      const position = form.current_position ? parseInt(form.current_position, 10) : null;
      const { data, error } = await supabase
        .from("tracked_keywords")
        .insert({
          workspace_id: workspaceId,
          user_id: user.id,
          keyword: form.keyword.trim(),
          target_url: form.target_url.trim() || null,
          country: form.country.trim() || "us",
          search_volume: parseInt(form.search_volume || "0", 10) || 0,
          difficulty: parseInt(form.difficulty || "0", 10) || 0,
          current_position: position,
          last_checked_at: position ? new Date().toISOString() : null,
        })
        .select("id")
        .single();
      if (error) throw error;
      if (position && data) {
        await supabase.from("keyword_rankings").insert({
          workspace_id: workspaceId,
          keyword_id: data.id,
          position,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tracked-keywords", workspaceId] });
      qc.invalidateQueries({ queryKey: ["keyword-rankings", workspaceId] });
      setOpen(false);
      setForm({ keyword: "", target_url: "", country: "us", search_volume: "", difficulty: "", current_position: "" });
      toast({ title: "Keyword added" });
    },
    onError: (e: Error) => toast({ title: "Could not add keyword", description: e.message, variant: "destructive" }),
  });

  const updatePosition = useMutation({
    mutationFn: async ({ kw, position }: { kw: TrackedKeyword; position: number }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await supabase
        .from("tracked_keywords")
        .update({
          previous_position: kw.current_position,
          current_position: position,
          last_checked_at: new Date().toISOString(),
        })
        .eq("id", kw.id);
      if (error) throw error;
      const { error: histError } = await supabase
        .from("keyword_rankings")
        .insert({ workspace_id: workspaceId, keyword_id: kw.id, position });
      if (histError) throw histError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tracked-keywords", workspaceId] });
      qc.invalidateQueries({ queryKey: ["keyword-rankings", workspaceId] });
    },
    onError: (e: Error) => toast({ title: "Could not save position", description: e.message, variant: "destructive" }),
  });

  const removeKeyword = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tracked_keywords").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tracked-keywords", workspaceId] });
      qc.invalidateQueries({ queryKey: ["keyword-rankings", workspaceId] });
    },
  });

  const { data: ownDomain } = useQuery({
    queryKey: ["own-domain", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data: self } = await supabase
        .from("competitors")
        .select("domain")
        .eq("workspace_id", workspaceId!)
        .eq("is_self", true)
        .maybeSingle();
      if (self?.domain) return self.domain as string;
      const { data: site } = await supabase
        .from("websites")
        .select("url")
        .eq("workspace_id", workspaceId!)
        .limit(1)
        .maybeSingle();
      return (site?.url as string) || null;
    },
  });

  const refreshRankings = useMutation({
    mutationFn: async () => {
      if (!ownDomain) throw new Error("Add your own site first (mark a domain as \"my site\" in Competitor Comparison).");
      const { data, error } = await supabase.functions.invoke("semrush-seo", {
        body: { action: "sync_keywords", workspace_id: workspaceId, domain: ownDomain },
      });
      if (error) throw new Error((data as any)?.error || error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { updated: number; checked: number };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["tracked-keywords", workspaceId] });
      qc.invalidateQueries({ queryKey: ["keyword-rankings", workspaceId] });
      toast({
        title: data.updated
          ? `Updated ${data.updated} of ${data.checked} keyword(s) with live positions`
          : "No live positions found for your tracked keywords yet",
      });
    },
    onError: (e: Error) =>
      toast({ title: "Could not refresh rankings", description: e.message, variant: "destructive" }),
  });

  const tracked = keywords.slice(0, 5);

  const chartData = useMemo(() => {
    if (!history.length || !tracked.length) return [];
    const byDate = new Map<string, Record<string, number | string>>();
    const ids = new Set(tracked.map((k) => k.id));
    for (const row of history) {
      if (!ids.has(row.keyword_id)) continue;
      const day = new Date(row.recorded_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      const kw = tracked.find((k) => k.id === row.keyword_id)!;
      const entry = byDate.get(day) || { date: day };
      entry[kw.keyword] = row.position;
      byDate.set(day, entry);
    }
    return Array.from(byDate.values());
  }, [history, tracked]);

  const avgPosition = useMemo(() => {
    const ranked = keywords.filter((k) => k.current_position);
    if (!ranked.length) return null;
    return Math.round((ranked.reduce((s, k) => s + (k.current_position || 0), 0) / ranked.length) * 10) / 10;
  }, [keywords]);

  const topTen = keywords.filter((k) => (k.current_position || 999) <= 10).length;

  const delta = (kw: TrackedKeyword) => {
    if (!kw.current_position || !kw.previous_position) return null;
    return kw.previous_position - kw.current_position;
  };

  return (
    <Card className="shadow-surface">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            Keyword Rankings
          </h3>
          <div className="flex items-center gap-2">
            {avgPosition !== null && (
              <Badge variant="outline" className="text-[10px]">Avg. position {avgPosition}</Badge>
            )}
            <Badge variant="outline" className="text-[10px]">{topTen} in top 10</Badge>
            <Button
              size="sm"
              variant="outline"
              disabled={refreshRankings.isPending || keywords.length === 0}
              onClick={() => refreshRankings.mutate()}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${refreshRankings.isPending ? "animate-spin" : ""}`} />
              {refreshRankings.isPending ? "Refreshing…" : "Refresh live data"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add keyword
            </Button>
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-[220px] w-full" />
        ) : keywords.length === 0 ? (
          <div className="h-[180px] flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            No keywords tracked yet.
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Track your first keyword
            </Button>
          </div>
        ) : (
          <>
            {chartData.length > 1 && (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis reversed domain={[1, "dataMax"]} tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {tracked.map((k, i) => (
                    <Line
                      key={k.id}
                      type="monotone"
                      dataKey={k.keyword}
                      stroke={LINE_COLORS[i % LINE_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}

            <div className="overflow-x-auto" data-no-autotranslate>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Keyword</TableHead>
                    <TableHead className="text-xs">Country</TableHead>
                    <TableHead className="text-xs text-right">Volume</TableHead>
                    <TableHead className="text-xs text-right">Difficulty</TableHead>
                    <TableHead className="text-xs text-right">Position</TableHead>
                    <TableHead className="text-xs text-right">Change</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keywords.map((k) => {
                    const d = delta(k);
                    return (
                      <TableRow key={k.id}>
                        <TableCell className="text-xs font-medium">{k.keyword}</TableCell>
                        <TableCell className="text-xs uppercase text-muted-foreground">{k.country}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums">{k.search_volume.toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums">{k.difficulty}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={1}
                            defaultValue={k.current_position ?? ""}
                            className="h-7 w-16 ml-auto text-xs text-right"
                            onBlur={(e) => {
                              const v = parseInt(e.target.value, 10);
                              if (v && v !== k.current_position) updatePosition.mutate({ kw: k, position: v });
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {d === null ? (
                            <Minus className="h-3 w-3 inline text-muted-foreground" />
                          ) : d > 0 ? (
                            <span className="text-emerald-500 inline-flex items-center gap-0.5"><ArrowUp className="h-3 w-3" />{d}</span>
                          ) : d < 0 ? (
                            <span className="text-destructive inline-flex items-center gap-0.5"><ArrowDown className="h-3 w-3" />{Math.abs(d)}</span>
                          ) : (
                            <Minus className="h-3 w-3 inline text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeKeyword.mutate(k.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Track a keyword</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Keyword</Label>
              <Input value={form.keyword} onChange={(e) => setForm({ ...form, keyword: e.target.value })} placeholder="seo page generator" />
            </div>
            <div>
              <Label className="text-xs">Target page URL</Label>
              <Input value={form.target_url} onChange={(e) => setForm({ ...form, target_url: e.target.value })} placeholder="https://example.com/page" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Country</Label>
                <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="us" />
              </div>
              <div>
                <Label className="text-xs">Volume</Label>
                <Input type="number" value={form.search_volume} onChange={(e) => setForm({ ...form, search_volume: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Difficulty</Label>
                <Input type="number" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Current position (optional)</Label>
              <Input type="number" value={form.current_position} onChange={(e) => setForm({ ...form, current_position: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!form.keyword.trim() || addKeyword.isPending} onClick={() => addKeyword.mutate()}>
              Add keyword
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
