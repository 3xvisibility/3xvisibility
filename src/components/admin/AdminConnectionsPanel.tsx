import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { RefreshCw, AlertCircle, ExternalLink, Search, ChevronLeft, ChevronRight } from "lucide-react";

interface FailingSite {
  id: string;
  name: string;
  url: string;
  type: string;
  status: string;
  last_sync: string | null;
  last_error: string | null;
  last_error_at: string | null;
  workspace_id: string;
  user_id: string;
  updated_at: string;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function AdminConnectionsPanel() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("failing");
  const [resyncing, setResyncing] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-failing-websites", statusFilter],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-websites", {
        body: { action: "list", status: statusFilter === "failing" ? undefined : statusFilter },
      });
      if (error) throw error;
      return (data?.items || []) as FailingSite[];
    },
  });

  const resyncMutation = useMutation({
    mutationFn: async (websiteId: string) => {
      setResyncing((s) => ({ ...s, [websiteId]: true }));
      const { data, error } = await supabase.functions.invoke("admin-websites", {
        body: { action: "resync", website_id: websiteId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any, websiteId) => {
      setResyncing((s) => ({ ...s, [websiteId]: false }));
      if (data?.success) {
        toast.success("Connection restored", { description: "Site is now connected." });
      } else {
        toast.error("Re-sync failed", { description: data?.error || "Connection still failing." });
      }
      qc.invalidateQueries({ queryKey: ["admin-failing-websites"] });
    },
    onError: (err: any, websiteId) => {
      setResyncing((s) => ({ ...s, [websiteId]: false }));
      toast.error(err?.message || "Re-sync request failed");
    },
  });

  const items = data || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((s) =>
      [s.name, s.url, s.user_id, s.workspace_id, s.type, s.last_error]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const onSearchChange = (v: string) => {
    setSearch(v);
    setPage(1);
  };
  const onStatusChange = (v: string) => {
    setStatusFilter(v);
    setPage(1);
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              Failing store connections
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Lists websites in error or disconnected state across all workspaces. Trigger a background re-sync to re-verify credentials.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={statusFilter} onValueChange={onStatusChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="failing">Error + Disconnected</SelectItem>
                <SelectItem value="error">Error only</SelectItem>
                <SelectItem value="disconnected">Disconnected only</SelectItem>
                <SelectItem value="all">All statuses</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by name, URL, user, workspace, or error…"
              className="pl-8 h-9"
            />
          </div>
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
            <SelectTrigger className="w-[110px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <Skeleton className="h-[300px] rounded-xl" />
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-12">
            {items.length === 0 ? "No failing connections. 🎉" : "No matches for your search."}
          </div>
        ) : (
          <>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Site</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Last sync</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="max-w-[260px]">
                        <div className="font-medium truncate">{s.name}</div>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1 truncate"
                        >
                          {s.url} <ExternalLink className="h-3 w-3" />
                        </a>
                        <div className="text-[10px] text-muted-foreground/70 font-mono mt-0.5 truncate">
                          user: {s.user_id?.slice(0, 8)}…
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{s.type}</Badge></TableCell>
                      <TableCell>
                        <Badge
                          variant={s.status === "connected" ? "default" : "destructive"}
                          className="capitalize"
                        >
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[280px]">
                        <div className="text-xs text-destructive line-clamp-2">
                          {s.last_error || "—"}
                        </div>
                        {s.last_error_at && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(s.last_error_at).toLocaleString()}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {s.last_sync ? new Date(s.last_sync).toLocaleString() : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={!!resyncing[s.id]}
                          onClick={() => resyncMutation.mutate(s.id)}
                        >
                          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${resyncing[s.id] ? "animate-spin" : ""}`} />
                          Re-sync
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-muted-foreground">
              <div>
                Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}
                {search && items.length !== filtered.length && ` (filtered from ${items.length})`}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </Button>
                <span className="tabular-nums">Page {currentPage} / {totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
