import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldAlert, Zap, AlertCircle, CheckCircle2 } from "lucide-react";

interface GateLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  prompt_type: string | null;
  model: string | null;
  status: string;
  reason: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface AiStatsResponse {
  logs: GateLog[];
  byStatus: Record<string, number>;
  byReason: Record<string, number>;
  byPromptType: Record<string, number>;
  total: number;
}

const REASON_LABELS: Record<string, string> = {
  rpc_missing: "Credits RPC not deployed",
  rpc_error: "RPC returned a transient error",
  auth_error: "Authorization denied (RLS / JWT)",
  exception: "Unhandled exception in gate",
  insufficient_credits: "User out of credits",
};

const STATUS_META: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  fail_open: { label: "Fail Open", className: "border-warning/40 text-warning bg-warning/10", icon: ShieldAlert },
  blocked: { label: "Blocked", className: "border-destructive/40 text-destructive bg-destructive/10", icon: AlertCircle },
  allowed: { label: "Allowed", className: "border-success/40 text-success bg-success/10", icon: CheckCircle2 },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString();
}

export function AiCreditsAdminPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-ai-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-panel", {
        body: { action: "get-ai-stats" },
      });
      if (error) throw error;
      return data as AiStatsResponse;
    },
    refetchInterval: 30_000,
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
          Failed to load AI stats: {(error as any).message}
        </CardContent>
      </Card>
    );
  }

  const failOpen = data?.byStatus.fail_open || 0;
  const blocked = data?.byStatus.blocked || 0;
  const total = data?.total || 0;
  const topReason = Object.entries(data?.byReason || {}).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Zap className="h-3.5 w-3.5" />Total events</div>
            <p className="text-2xl font-bold tabular-nums mt-1">{total}</p>
            <p className="text-[10px] text-muted-foreground">Last 200 gate decisions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-xs text-warning"><ShieldAlert className="h-3.5 w-3.5" />Fail-open</div>
            <p className="text-2xl font-bold tabular-nums mt-1 text-warning">{failOpen}</p>
            <p className="text-[10px] text-muted-foreground">Allowed without successful credit check</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-xs text-destructive"><AlertCircle className="h-3.5 w-3.5" />Blocked</div>
            <p className="text-2xl font-bold tabular-nums mt-1 text-destructive">{blocked}</p>
            <p className="text-[10px] text-muted-foreground">Requests denied by gate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">Top reason</div>
            <p className="text-sm font-semibold mt-1 truncate" title={topReason?.[0]}>
              {topReason ? (REASON_LABELS[topReason[0]] || topReason[0]) : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground">{topReason ? `${topReason[1]} events` : "No events yet"}</p>
          </CardContent>
        </Card>
      </div>

      {Object.keys(data?.byPromptType || {}).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Usage by prompt type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data!.byPromptType)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <Badge key={type} variant="outline" className="text-xs gap-1.5">
                    <span>{type}</span>
                    <span className="text-muted-foreground tabular-nums">{count}</span>
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-warning" />
            Credit-gate event log
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <ScrollArea className="h-[500px]">
            {(data?.logs || []).length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-12">No gate events recorded yet.</p>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="lg:hidden divide-y divide-border">
                  {data!.logs.map((log) => {
                    const meta = STATUS_META[log.status] || STATUS_META.allowed;
                    const Icon = meta.icon;
                    return (
                      <div key={log.id} className="px-4 py-3 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-[10px] gap-1 ${meta.className}`}>
                            <Icon className="h-3 w-3" />{meta.label}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground ml-auto">{formatTime(log.created_at)}</span>
                        </div>
                        <p className="text-xs">
                          <span className="font-medium">{REASON_LABELS[log.reason || ""] || log.reason || "—"}</span>
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {log.user_email || log.user_id || "anonymous"} · {log.prompt_type || "?"} · {log.model || "default"}
                        </p>
                        {log.details && Object.keys(log.details).length > 0 && (
                          <pre className="text-[10px] text-muted-foreground bg-muted/50 rounded p-2 overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Desktop table */}
                <div className="hidden lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Prompt type</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data!.logs.map((log) => {
                        const meta = STATUS_META[log.status] || STATUS_META.allowed;
                        const Icon = meta.icon;
                        return (
                          <TableRow key={log.id}>
                            <TableCell className="text-xs whitespace-nowrap text-muted-foreground">{formatTime(log.created_at)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-[10px] gap-1 ${meta.className}`}>
                                <Icon className="h-3 w-3" />{meta.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">{REASON_LABELS[log.reason || ""] || log.reason || "—"}</TableCell>
                            <TableCell className="text-xs">{log.user_email || log.user_id?.slice(0, 8) || "—"}</TableCell>
                            <TableCell className="text-xs">{log.prompt_type || "—"}</TableCell>
                            <TableCell className="text-xs">{log.model || "—"}</TableCell>
                            <TableCell className="text-[11px] max-w-xs">
                              {log.details && Object.keys(log.details).length > 0 ? (
                                <code className="text-muted-foreground line-clamp-2 break-all">
                                  {JSON.stringify(log.details)}
                                </code>
                              ) : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
