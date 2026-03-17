import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Search, Send, RefreshCw, RotateCcw, Globe, CheckCircle2,
  Clock, XCircle, Loader2, AlertTriangle, Settings2, ExternalLink
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/use-subscription";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  submitted: "bg-primary/10 text-primary",
  indexed: "bg-success/10 text-success",
  failed: "bg-destructive/10 text-destructive",
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-3 w-3" />,
  submitted: <Send className="h-3 w-3" />,
  indexed: <CheckCircle2 className="h-3 w-3" />,
  failed: <XCircle className="h-3 w-3" />,
};

export default function IndexingPage() {
  const { canUseFeature } = useSubscription();
  const [selectedWebsite, setSelectedWebsite] = useState<string>("");
  const [search, setSearch] = useState("");
  const [configOpen, setConfigOpen] = useState(false);
  const [serviceAccountJson, setServiceAccountJson] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  const { data: websites = [] } = useQuery({
    queryKey: ["websites"],
    queryFn: async () => {
      const { data, error } = await supabase.from("websites").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Auto-select first website
  useEffect(() => {
    if (!selectedWebsite && websites.length > 0) {
      setSelectedWebsite(websites[0].id);
    }
  }, [websites, selectedWebsite]);

  const currentWebsite = websites.find((w: any) => w.id === selectedWebsite);

  const { data: indexingRequests = [], isLoading } = useQuery({
    queryKey: ["indexing-requests", selectedWebsite],
    enabled: !!selectedWebsite,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("indexing_requests")
        .select("*")
        .eq("website_id", selectedWebsite)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Realtime updates
  useEffect(() => {
    if (!selectedWebsite) return;
    const channel = supabase
      .channel("indexing-updates")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "indexing_requests",
        filter: `website_id=eq.${selectedWebsite}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["indexing-requests", selectedWebsite] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedWebsite, queryClient]);

  // Stats
  const stats = useMemo(() => {
    const total = indexingRequests.length;
    const indexed = indexingRequests.filter((r: any) => r.status === "indexed").length;
    const submitted = indexingRequests.filter((r: any) => r.status === "submitted").length;
    const pending = indexingRequests.filter((r: any) => r.status === "pending").length;
    const failed = indexingRequests.filter((r: any) => r.status === "failed").length;
    return { total, indexed, submitted, pending, failed };
  }, [indexingRequests]);

  const filtered = useMemo(() =>
    indexingRequests.filter((r: any) =>
      r.url.toLowerCase().includes(search.toLowerCase())
    ), [indexingRequests, search]);

  // Save service account config
  const saveConfigMutation = useMutation({
    mutationFn: async () => {
      if (!selectedWebsite) throw new Error("No website selected");
      let parsed;
      try {
        parsed = JSON.parse(serviceAccountJson);
      } catch {
        throw new Error("Invalid JSON. Please paste the complete service account JSON key file.");
      }
      if (!parsed.client_email || !parsed.private_key) {
        throw new Error("Invalid service account key. Must contain client_email and private_key.");
      }
      const { error } = await supabase
        .from("websites")
        .update({
          google_service_account: { client_email: parsed.client_email, private_key: parsed.private_key },
          google_indexing_enabled: true,
        } as any)
        .eq("id", selectedWebsite);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["websites"] });
      setConfigOpen(false);
      setServiceAccountJson("");
      toast({ title: "Google Indexing configured", description: "Service account connected successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Auto-submit all pages
  const autoSubmitMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("google-indexing", {
        body: { action: "auto-submit", website_id: selectedWebsite },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["indexing-requests", selectedWebsite] });
      toast({
        title: "Indexing requests submitted",
        description: `${data.submitted} submitted, ${data.failed} failed.`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    },
  });

  // Retry failed
  const retryMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { data, error } = await supabase.functions.invoke("google-indexing", {
        body: { action: "retry", website_id: selectedWebsite, request_ids: ids },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["indexing-requests", selectedWebsite] });
      setSelectedIds(new Set());
      toast({ title: "Retry complete", description: `${data.retried} retried, ${data.failed} still failed.` });
    },
    onError: (err: Error) => {
      toast({ title: "Retry failed", description: err.message, variant: "destructive" });
    },
  });

  // Check status
  const checkStatusMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("google-indexing", {
        body: { action: "status", website_id: selectedWebsite },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["indexing-requests", selectedWebsite] });
      toast({ title: "Status updated", description: `Checked ${data.checked} URLs.` });
    },
    onError: (err: Error) => {
      toast({ title: "Status check failed", description: err.message, variant: "destructive" });
    },
  });

  const isConfigured = !!(currentWebsite as any)?.google_indexing_enabled;
  const failedRequests = indexingRequests.filter((r: any) => r.status === "failed");

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (!canUseFeature("indexing")) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-display">Google Indexing</h1>
          <p className="text-muted-foreground mt-1">Submit and track URL indexing via Google Indexing API.</p>
        </div>
        <UpgradePrompt feature="indexing" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-display">Google Indexing</h1>
          <p className="text-muted-foreground mt-1">Submit and track URL indexing via Google Indexing API.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedWebsite} onValueChange={setSelectedWebsite}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select website" />
            </SelectTrigger>
            <SelectContent>
              {websites.map((w: any) => (
                <SelectItem key={w.id} value={w.id}>
                  <div className="flex items-center gap-2">
                    <Globe className="h-3 w-3" />
                    {w.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => setConfigOpen(true)} title="Configure Google Indexing">
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Setup prompt if not configured */}
      {selectedWebsite && !isConfigured && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6 text-center space-y-3">
            <AlertTriangle className="h-8 w-8 text-primary mx-auto" />
            <h3 className="font-semibold">Google Indexing not configured</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Connect a Google Service Account to enable automatic URL indexing. You'll need a service account with the Indexing API enabled.
            </p>
            <Button onClick={() => setConfigOpen(true)}>
              <Settings2 className="h-4 w-4 mr-2" /> Configure Service Account
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Dashboard */}
      {selectedWebsite && isConfigured && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "Total", value: stats.total, color: "text-foreground" },
              { label: "Indexed", value: stats.indexed, color: "text-success" },
              { label: "Submitted", value: stats.submitted, color: "text-primary" },
              { label: "Pending", value: stats.pending, color: "text-muted-foreground" },
              { label: "Failed", value: stats.failed, color: "text-destructive" },
            ].map((s) => (
              <Card key={s.label} className="shadow-surface">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`text-xl font-semibold tabular-nums mt-1 ${s.color}`}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Progress bar */}
          {stats.total > 0 && (
            <Card className="shadow-surface">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Indexing Progress</span>
                  <span className="tabular-nums font-medium">
                    {stats.total > 0 ? Math.round((stats.indexed / stats.total) * 100) : 0}%
                  </span>
                </div>
                <Progress
                  value={stats.total > 0 ? (stats.indexed / stats.total) * 100 : 0}
                  className="h-2"
                />
              </CardContent>
            </Card>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => autoSubmitMutation.mutate()}
              disabled={autoSubmitMutation.isPending}
            >
              {autoSubmitMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</>
              ) : (
                <><Send className="h-4 w-4 mr-2" /> Submit All Pages</>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => checkStatusMutation.mutate()}
              disabled={checkStatusMutation.isPending}
            >
              {checkStatusMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Checking...</>
              ) : (
                <><RefreshCw className="h-4 w-4 mr-2" /> Refresh Status</>
              )}
            </Button>
            {failedRequests.length > 0 && (
              <Button
                variant="outline"
                className="text-destructive"
                onClick={() => retryMutation.mutate(failedRequests.map((r: any) => r.id))}
                disabled={retryMutation.isPending}
              >
                {retryMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Retrying...</>
                ) : (
                  <><RotateCcw className="h-4 w-4 mr-2" /> Retry All Failed ({failedRequests.length})</>
                )}
              </Button>
            )}
            {selectedIds.size > 0 && (
              <Button
                variant="outline"
                onClick={() => retryMutation.mutate([...selectedIds])}
                disabled={retryMutation.isPending}
              >
                <RotateCcw className="h-4 w-4 mr-2" /> Retry Selected ({selectedIds.size})
              </Button>
            )}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search URLs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* URL Table */}
          {isLoading ? (
            <Card className="shadow-surface">
              <CardContent className="p-4 space-y-3">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </CardContent>
            </Card>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center text-muted-foreground">
                {indexingRequests.length === 0
                  ? "No indexing requests yet. Click \"Submit All Pages\" to get started."
                  : "No URLs match your search."}
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-surface">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-4 w-10">
                        <Checkbox
                          checked={selectedIds.size === filtered.length && filtered.length > 0}
                          onCheckedChange={() => {
                            if (selectedIds.size === filtered.length) {
                              setSelectedIds(new Set());
                            } else {
                              setSelectedIds(new Set(filtered.map((r: any) => r.id)));
                            }
                          }}
                        />
                      </th>
                      <th className="text-left p-4 font-medium text-muted-foreground">URL</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                      <th className="text-left p-4 font-medium text-muted-foreground hidden md:table-cell">Submitted</th>
                      <th className="text-left p-4 font-medium text-muted-foreground hidden lg:table-cell">Retries</th>
                      <th className="text-left p-4 font-medium text-muted-foreground hidden lg:table-cell">Error</th>
                      <th className="p-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((req: any) => (
                      <tr key={req.id} className={`border-b last:border-0 transition-colors ${selectedIds.has(req.id) ? "bg-primary/5" : "hover:bg-muted/50"}`}>
                        <td className="p-4 w-10">
                          <Checkbox
                            checked={selectedIds.has(req.id)}
                            onCheckedChange={() => toggleSelect(req.id)}
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <a
                              href={req.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-mono text-primary hover:underline truncate max-w-[300px] flex items-center gap-1"
                            >
                              {req.url}
                              <ExternalLink className="h-3 w-3 shrink-0" />
                            </a>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="secondary" className={`${statusColors[req.status]} gap-1`}>
                            {statusIcons[req.status]}
                            {req.status}
                          </Badge>
                        </td>
                        <td className="p-4 text-xs text-muted-foreground tabular-nums hidden md:table-cell">
                          {req.submitted_at ? new Date(req.submitted_at).toLocaleString() : "—"}
                        </td>
                        <td className="p-4 text-xs tabular-nums hidden lg:table-cell">{req.retry_count}</td>
                        <td className="p-4 hidden lg:table-cell">
                          {req.error_message && (
                            <span className="text-xs text-destructive truncate max-w-[200px] block" title={req.error_message}>
                              {req.error_message}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {req.status === "failed" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-primary"
                              disabled={retryMutation.isPending}
                              onClick={() => retryMutation.mutate([req.id])}
                            >
                              <RotateCcw className="h-3 w-3 mr-1" /> Retry
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Service Account Config Dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Configure Google Indexing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
              <h4 className="text-sm font-semibold">Setup Instructions</h4>
              <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener" className="text-primary hover:underline">Google Cloud Console</a></li>
                <li>Enable the <strong>Web Search Indexing API</strong></li>
                <li>Create a <strong>Service Account</strong> and download the JSON key</li>
                <li>In <a href="https://search.google.com/search-console" target="_blank" rel="noopener" className="text-primary hover:underline">Google Search Console</a>, add the service account email as an <strong>Owner</strong></li>
                <li>Paste the JSON key below</li>
              </ol>
            </div>
            <div>
              <Label>Service Account JSON Key</Label>
              <Textarea
                placeholder='Paste the entire JSON key file content here...'
                value={serviceAccountJson}
                onChange={(e) => setServiceAccountJson(e.target.value)}
                rows={8}
                className="font-mono text-xs mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfigOpen(false)}>Cancel</Button>
              <Button
                onClick={() => saveConfigMutation.mutate()}
                disabled={!serviceAccountJson.trim() || saveConfigMutation.isPending}
              >
                {saveConfigMutation.isPending ? "Saving..." : "Save Configuration"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
