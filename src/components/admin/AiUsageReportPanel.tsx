import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Zap, Users, Gauge, Activity, AlertCircle, CalendarClock } from "lucide-react";

interface UsageEvent {
  prompt_type: string;
  credits_used: number;
  model: string | null;
  created_at: string;
}

interface UserReport {
  user_id: string;
  email: string | null;
  full_name: string | null;
  company: string | null;
  plan: string;
  total_credits: number;
  used_credits: number;
  remaining_credits: number;
  monthly_limit: number;
  credits_reset_at: string | null;
  lifetime_usage: number;
  events_count: number;
  usage_by_type: Record<string, number>;
  recent_usage: UsageEvent[];
}

interface ReportResponse {
  report: UserReport[];
  totals: {
    total_users: number;
    total_credits: number;
    total_used: number;
    total_remaining: number;
    total_events: number;
  };
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function usageColor(pct: number) {
  if (pct >= 90) return "text-destructive";
  if (pct >= 70) return "text-yellow-600";
  return "text-success";
}

export function AiUsageReportPanel() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<UserReport | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-ai-usage-report"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-panel", {
        body: { action: "get-ai-usage-report" },
      });
      if (error) throw error;
      return data as ReportResponse;
    },
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Failed to load usage report: {(error as any).message}
        </CardContent>
      </Card>
    );
  }

  const totals = data?.totals;
  const report = (data?.report || []).filter((r) => {
    const q = search.toLowerCase();
    return (
      r.email?.toLowerCase().includes(q) ||
      r.full_name?.toLowerCase().includes(q) ||
      r.company?.toLowerCase().includes(q) ||
      r.plan.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" />Users</div>
            <p className="text-2xl font-bold tabular-nums mt-1">{totals?.total_users ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Zap className="h-3.5 w-3.5" />Credits used</div>
            <p className="text-2xl font-bold tabular-nums mt-1">{(totals?.total_used ?? 0).toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">of {(totals?.total_credits ?? 0).toLocaleString()} allocated</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-xs text-success"><Gauge className="h-3.5 w-3.5" />Remaining</div>
            <p className="text-2xl font-bold tabular-nums mt-1 text-success">{(totals?.total_remaining ?? 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Activity className="h-3.5 w-3.5" />Total events</div>
            <p className="text-2xl font-bold tabular-nums mt-1">{(totals?.total_events ?? 0).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by user, email or plan..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="rounded-xl border">
        {/* Mobile cards */}
        <div className="lg:hidden divide-y divide-border">
          {report.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">No users found</p>
          ) : (
            report.map((r) => {
              const pct = r.total_credits > 0 ? Math.round((r.used_credits / r.total_credits) * 100) : 0;
              return (
                <button key={r.user_id} onClick={() => setSelected(r)} className="w-full text-left p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{r.full_name || r.email || "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                    </div>
                    <Badge variant="outline" className="capitalize text-[10px] shrink-0">{r.plan}</Badge>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{r.used_credits} / {r.total_credits} used</span>
                    <span className={usageColor(pct)}>{pct}%</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
        {/* Desktop table */}
        <div className="hidden lg:block overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Used</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead className="text-right">Monthly limit</TableHead>
                <TableHead className="w-40">Usage</TableHead>
                <TableHead className="hidden xl:table-cell">Resets</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No users found</TableCell>
                </TableRow>
              ) : (
                report.map((r) => {
                  const pct = r.total_credits > 0 ? Math.round((r.used_credits / r.total_credits) * 100) : 0;
                  return (
                    <TableRow key={r.user_id} className="cursor-pointer" onClick={() => setSelected(r)}>
                      <TableCell>
                        <p className="font-medium text-sm">{r.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{r.email}</p>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{r.plan}</Badge></TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{r.used_credits.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{r.remaining_credits.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{r.monthly_limit.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={pct} className="h-1.5 flex-1" />
                          <span className={`text-xs tabular-nums ${usageColor(pct)}`}>{pct}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden xl:table-cell">{formatDate(r.credits_reset_at)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Per-user detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">{selected?.full_name || selected?.email || "User"}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                <span>{selected.email}</span>
                <Badge variant="outline" className="capitalize">{selected.plan}</Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border p-2">
                  <p className="text-[10px] text-muted-foreground uppercase">Used</p>
                  <p className="text-lg font-bold tabular-nums">{selected.used_credits}</p>
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-[10px] text-muted-foreground uppercase">Remaining</p>
                  <p className="text-lg font-bold tabular-nums text-success">{selected.remaining_credits}</p>
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-[10px] text-muted-foreground uppercase">Limit</p>
                  <p className="text-lg font-bold tabular-nums">{selected.monthly_limit}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" /> Quota resets {formatDate(selected.credits_reset_at)}
              </div>

              {Object.keys(selected.usage_by_type).length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Usage by type</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(selected.usage_by_type).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                      <Badge key={type} variant="outline" className="text-xs gap-1.5">
                        <span>{type}</span>
                        <span className="text-muted-foreground tabular-nums">{count}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Recent usage history</p>
                <ScrollArea className="h-56 rounded-lg border">
                  {selected.recent_usage.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-10 flex flex-col items-center gap-2">
                      <AlertCircle className="h-5 w-5" /> No usage recorded yet
                    </p>
                  ) : (
                    <div className="divide-y divide-border">
                      {selected.recent_usage.map((e, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{e.prompt_type}</p>
                            <p className="text-muted-foreground">{e.model || "default"} · {formatDateTime(e.created_at)}</p>
                          </div>
                          <Badge variant="outline" className="shrink-0 tabular-nums">-{e.credits_used}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
