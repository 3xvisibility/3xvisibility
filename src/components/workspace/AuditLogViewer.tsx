import { useInfiniteQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { History, UserPlus, Shield, Pencil, Trash2, Clock, Loader2, Filter } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect, useRef, useCallback } from "react";

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  user_id: string;
}

const PAGE_SIZE = 20;

const actionConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  invite_member: { icon: <UserPlus className="h-3.5 w-3.5" />, label: "Member Invited", color: "bg-green-500/10 text-green-600" },
  update_role: { icon: <Shield className="h-3.5 w-3.5" />, label: "Role Changed", color: "bg-blue-500/10 text-blue-600" },
  remove_member: { icon: <Trash2 className="h-3.5 w-3.5" />, label: "Member Removed", color: "bg-destructive/10 text-destructive" },
  rename_workspace: { icon: <Pencil className="h-3.5 w-3.5" />, label: "Workspace Renamed", color: "bg-amber-500/10 text-amber-600" },
};

function getActionDetails(log: AuditLog): string {
  const d = log.details as Record<string, string> | null;
  if (!d) return "";
  switch (log.action) {
    case "invite_member":
      return `${d.email || "user"} as ${d.role || "member"}`;
    case "update_role":
      return `Changed to ${d.new_role || "unknown"}`;
    case "rename_workspace":
      return `→ ${d.new_name || ""}`;
    case "remove_member":
      return "Removed from workspace";
    default:
      return JSON.stringify(d);
  }
}

export default function AuditLogViewer({ workspaceId }: { workspaceId: string }) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["audit-logs", workspaceId],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action, entity_type, entity_id, details, created_at, user_id")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return data as AuditLog[];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length : undefined,
    enabled: !!workspaceId,
  });

  const logs = data?.pages.flat() ?? [];

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleObserver]);

  return (
    <Card className="shadow-surface">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Audit Log
        </CardTitle>
        <CardDescription>Recent admin actions in this workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : !logs.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">No audit events yet.</p>
        ) : (
          <div className="max-h-[400px] overflow-y-auto pr-3">
            <div className="relative pl-6 border-l-2 border-border space-y-4">
              {logs.map((log) => {
                const cfg = actionConfig[log.action] || {
                  icon: <Clock className="h-3.5 w-3.5" />,
                  label: log.action,
                  color: "bg-muted text-muted-foreground",
                };
                return (
                  <div key={log.id} className="relative">
                    <div className="absolute -left-[calc(0.75rem+1px)] top-1 h-5 w-5 rounded-full bg-background border-2 border-border flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <Badge variant="outline" className={`gap-1 shrink-0 w-fit text-xs ${cfg.color}`}>
                        {cfg.icon}
                        {cfg.label}
                      </Badge>
                      <span className="text-sm text-foreground truncate">
                        {getActionDetails(log)}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0 ml-auto">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-4" />

            {isFetchingNextPage && (
              <div className="flex justify-center py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}

            {!hasNextPage && logs.length >= PAGE_SIZE && (
              <p className="text-xs text-muted-foreground text-center py-2">All events loaded.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
