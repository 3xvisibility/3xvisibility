import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText, Download, Search, CheckCircle2, XCircle, Clock,
  ExternalLink, Filter, RefreshCw, Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function PgpLogsPage() {
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ["pgp-logs", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("generated_pages")
        .select("id, title, slug, status, created_at, external_url, seo_title, seo_keywords, error_message, campaign_id, campaigns(name)")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace?.id,
  });

  const filtered = useMemo(() => {
    if (!logs) return [];
    return logs.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          l.title?.toLowerCase().includes(q) ||
          l.slug?.toLowerCase().includes(q) ||
          l.seo_keywords?.some((k: string) => k.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [logs, search, statusFilter]);

  const stats = useMemo(() => {
    if (!logs) return { total: 0, published: 0, pending: 0, failed: 0 };
    return {
      total: logs.length,
      published: logs.filter((l) => l.status === "published").length,
      pending: logs.filter((l) => l.status === "pending").length,
      failed: logs.filter((l) => l.status === "failed").length,
    };
  }, [logs]);

  const exportCsv = () => {
    if (!filtered.length) return;
    const headers = ["Title", "URL", "Keywords", "Status", "Campaign", "Generated Date"];
    const rows = filtered.map((l: any) => [
      l.title,
      l.external_url || l.slug,
      (l.seo_keywords || []).join("; "),
      l.status,
      l.campaigns?.name || "",
      format(new Date(l.created_at), "yyyy-MM-dd HH:mm:ss"),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c: string) => `"${(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pgp-generation-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Log exported to CSV" });
  };

  const statusIcon = (s: string) => {
    if (s === "published") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
    if (s === "failed") return <XCircle className="h-3.5 w-3.5 text-destructive" />;
    return <Clock className="h-3.5 w-3.5 text-amber-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Generation Logs</h1>
          <p className="text-sm text-muted-foreground">Full report of all generated pages, posts, and taxonomy terms</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Published", value: stats.published, color: "text-emerald-600" },
          { label: "Draft", value: stats.draft, color: "text-amber-600" },
          { label: "Failed", value: stats.failed, color: "text-destructive" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search title, slug, keywords..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Log Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : !filtered.length ? (
            <div className="p-12 text-center text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No generation logs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="hidden md:table-cell">Campaign</TableHead>
                    <TableHead className="hidden lg:table-cell">Keywords</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead className="hidden sm:table-cell">URL</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((log: any, idx) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium text-sm max-w-[200px] truncate">{log.title}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{log.campaigns?.name || "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {(log.seo_keywords || []).slice(0, 3).map((k: string) => (
                            <Badge key={k} variant="secondary" className="text-[10px]">{k}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {statusIcon(log.status)}
                          <span className="text-xs capitalize">{log.status}</span>
                        </div>
                        {log.error_message && (
                          <p className="text-[10px] text-destructive mt-0.5 truncate max-w-[150px]">{log.error_message}</p>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {log.external_url ? (
                          <a href={log.external_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                            View <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), "MMM d, yyyy HH:mm")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
