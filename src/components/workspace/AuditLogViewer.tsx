import { useInfiniteQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import {
  History, UserPlus, Shield, Pencil, Trash2, Clock, Loader2, Filter,
  Globe, Rocket, FileText, CreditCard, Download, CalendarIcon, Search, X,
} from "lucide-react";
import { formatDistanceToNow, format, startOfDay, endOfDay } from "date-fns";
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
  // Members
  invite_member:     { icon: <UserPlus className="h-3.5 w-3.5" />, label: "Member Invited",     color: "bg-success/10 text-success" },
  update_role:       { icon: <Shield className="h-3.5 w-3.5" />,   label: "Role Changed",       color: "bg-primary/10 text-primary" },
  remove_member:     { icon: <Trash2 className="h-3.5 w-3.5" />,   label: "Member Removed",     color: "bg-destructive/10 text-destructive" },
  rename_workspace:  { icon: <Pencil className="h-3.5 w-3.5" />,   label: "Workspace Renamed",  color: "bg-warning/10 text-warning" },
  // Sites
  site_created:      { icon: <Globe className="h-3.5 w-3.5" />,    label: "Site Created",       color: "bg-success/10 text-success" },
  site_deleted:      { icon: <Trash2 className="h-3.5 w-3.5" />,   label: "Site Deleted",       color: "bg-destructive/10 text-destructive" },
  site_updated:      { icon: <Pencil className="h-3.5 w-3.5" />,   label: "Site Updated",       color: "bg-primary/10 text-primary" },
  // Campaigns
  campaign_started:  { icon: <Rocket className="h-3.5 w-3.5" />,   label: "Campaign Started",   color: "bg-primary/10 text-primary" },
  campaign_completed:{ icon: <Rocket className="h-3.5 w-3.5" />,   label: "Campaign Completed", color: "bg-success/10 text-success" },
  campaign_failed:   { icon: <Rocket className="h-3.5 w-3.5" />,   label: "Campaign Failed",    color: "bg-destructive/10 text-destructive" },
  campaign_deleted:  { icon: <Trash2 className="h-3.5 w-3.5" />,   label: "Campaign Deleted",   color: "bg-destructive/10 text-destructive" },
  // Pages
  page_published:    { icon: <FileText className="h-3.5 w-3.5" />, label: "Page Published",     color: "bg-success/10 text-success" },
  page_deleted:      { icon: <Trash2 className="h-3.5 w-3.5" />,   label: "Page Deleted",       color: "bg-destructive/10 text-destructive" },
  pages_bulk_published: { icon: <FileText className="h-3.5 w-3.5" />, label: "Bulk Publish",    color: "bg-success/10 text-success" },
  // Plan / billing
  plan_changed:      { icon: <CreditCard className="h-3.5 w-3.5" />, label: "Plan Changed",     color: "bg-warning/10 text-warning" },
  subscription_updated: { icon: <CreditCard className="h-3.5 w-3.5" />, label: "Subscription Updated", color: "bg-primary/10 text-primary" },
};

const ALL_ACTIONS = Object.keys(actionConfig);

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
      return d.email ? `Removed ${d.email}` : "Removed from workspace";
    case "site_created":
    case "site_deleted":
    case "site_updated":
      return d.name || d.url || "";
    case "campaign_started":
    case "campaign_completed":
    case "campaign_failed":
    case "campaign_deleted":
      return d.name || d.campaign_name || "";
    case "page_published":
    case "page_deleted":
      return d.title || d.slug || "";
    case "pages_bulk_published":
      return d.count ? `${d.count} pages` : "";
    case "plan_changed":
      return d.from && d.to ? `${d.from} → ${d.to}` : d.plan || "";
    case "subscription_updated":
      return d.detail || "";
    default:
      return Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(", ");
  }
}

function exportAuditCsv(logs: AuditLog[]) {
  const header = "Timestamp,Action,Entity Type,Entity ID,Details,User ID";
  const rows = logs.map((l) => {
    const details = l.details ? JSON.stringify(l.details).replace(/"/g, '""') : "";
    return `${l.created_at},"${l.action}","${l.entity_type}","${l.entity_id || ""}","${details}","${l.user_id}"`;
  });
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AuditLogViewer({ workspaceId }: { workspaceId: string }) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["audit-logs", workspaceId, actionFilter, searchQuery, dateRange.from?.toISOString(), dateRange.to?.toISOString()],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let query = supabase
        .from("audit_logs")
        .select("id, action, entity_type, entity_id, details, created_at, user_id")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (actionFilter !== "all") {
        query = query.eq("action", actionFilter);
      }
      if (dateRange.from) {
        query = query.gte("created_at", startOfDay(dateRange.from).toISOString());
      }
      if (dateRange.to) {
        query = query.lte("created_at", endOfDay(dateRange.to).toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      let results = data as AuditLog[];

      // Client-side full-text search across details, action, entity_type, user_id
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        results = results.filter((log) => {
          const detailsStr = log.details ? JSON.stringify(log.details).toLowerCase() : "";
          const actionLabel = (actionConfig[log.action]?.label || log.action).toLowerCase();
          return (
            actionLabel.includes(q) ||
            log.user_id.toLowerCase().includes(q) ||
            (log.entity_id || "").toLowerCase().includes(q) ||
            log.entity_type.toLowerCase().includes(q) ||
            detailsStr.includes(q)
          );
        });
      }

      return results;
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

  const hasFilters = actionFilter !== "all" || searchQuery || dateRange.from || dateRange.to;

  return (
    <Card className="shadow-surface">
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Audit Log
            </CardTitle>
            <CardDescription className="mt-1.5">
              Track sensitive actions: publications, deletions, role & plan changes.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={() => exportAuditCsv(logs)}
            disabled={!logs.length}
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full sm:w-[180px] h-9 text-xs">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {ALL_ACTIONS.map((a) => (
                <SelectItem key={a} value={a}>
                  {actionConfig[a].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search logs (email, name, URL…)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs shrink-0">
                <CalendarIcon className="h-3.5 w-3.5" />
                {dateRange.from
                  ? dateRange.to
                    ? `${format(dateRange.from, "MMM d")} – ${format(dateRange.to, "MMM d")}`
                    : format(dateRange.from, "MMM d, yyyy")
                  : "Date range"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={dateRange.from ? { from: dateRange.from, to: dateRange.to } : undefined}
                onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                numberOfMonths={1}
              />
              {(dateRange.from || dateRange.to) && (
                <div className="p-2 border-t">
                  <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setDateRange({})}>
                    Clear dates
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs text-muted-foreground"
              onClick={() => { setActionFilter("all"); setSearchQuery(""); setDateRange({}); }}
            >
              Clear all
            </Button>
          )}
        </div>

        {/* Log timeline */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : !logs.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {hasFilters ? "No events match your filters." : "No audit events yet."}
          </p>
        ) : (
          <div className="max-h-[500px] overflow-y-auto pr-3">
            <div className="relative pl-6 border-l-2 border-border space-y-4">
              {logs.map((log) => {
                const cfg = actionConfig[log.action] || {
                  icon: <Clock className="h-3.5 w-3.5" />,
                  label: log.action.replace(/_/g, " "),
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
                      <span className="text-xs text-muted-foreground shrink-0 ml-auto whitespace-nowrap" title={format(new Date(log.created_at), "PPpp")}>
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
