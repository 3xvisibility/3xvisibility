import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Play, Pause, RotateCcw, XCircle, Clock, Check, AlertTriangle,
  Layers, Zap, Ban,
} from "lucide-react";

interface GenerationJobDialogProps {
  campaignId: string;
  campaignName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const jobStatusConfig: Record<string, { class: string; icon: typeof Check }> = {
  pending: { class: "bg-muted text-muted-foreground", icon: Clock },
  running: { class: "bg-primary/10 text-primary", icon: Zap },
  paused: { class: "bg-warning/10 text-warning", icon: Pause },
  completed: { class: "bg-success/10 text-success", icon: Check },
  failed: { class: "bg-destructive/10 text-destructive", icon: AlertTriangle },
  cancelled: { class: "bg-muted text-muted-foreground", icon: Ban },
};

export function GenerationJobDialog({ campaignId, campaignName, open, onOpenChange }: GenerationJobDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all jobs for this campaign
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["generation-jobs-detail", campaignId],
    enabled: open && !!campaignId,
    refetchInterval: 3000, // poll every 3s for live progress
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generation_jobs")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch campaign logs for batch timeline
  const { data: logs = [] } = useQuery({
    queryKey: ["job-campaign-logs", campaignId],
    enabled: open && !!campaignId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_logs")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Retry mutation — re-execute the campaign
  const retryMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-pages", {
        body: { campaign_id: campaignId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generation-jobs-detail", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({ title: "Generation restarted" });
    },
    onError: (err: Error) => {
      toast({ title: "Retry failed", description: err.message, variant: "destructive" });
    },
  });

  // Cancel mutation — mark job as cancelled
  const cancelMutation = useMutation({
    mutationFn: async (jobId: string) => {
      // Pause the campaign to stop processing
      const { error: pauseErr } = await supabase.functions.invoke("generate-pages", {
        body: { campaign_id: campaignId, action: "pause" },
      });
      if (pauseErr) throw pauseErr;
      // Mark the job as cancelled
      const { error } = await supabase
        .from("generation_jobs")
        .update({ status: "cancelled" as any, updated_at: new Date().toISOString() })
        .eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generation-jobs-detail", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({ title: "Job cancelled" });
    },
    onError: (err: Error) => {
      toast({ title: "Cancel failed", description: err.message, variant: "destructive" });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-pages", {
        body: { campaign_id: campaignId, action: "resume" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generation-jobs-detail", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({ title: "Generation resumed" });
    },
    onError: (err: Error) => {
      toast({ title: "Resume failed", description: err.message, variant: "destructive" });
    },
  });

  const latestJob = jobs[0];
  const totalBatches = latestJob ? Math.ceil(latestJob.total_rows / latestJob.batch_size) : 0;
  const jobPercent = latestJob && latestJob.total_rows > 0
    ? Math.round((latestJob.processed_rows / latestJob.total_rows) * 100)
    : 0;

  const logEventIcon = (event: string) => {
    if (event === "started") return "🚀";
    if (event === "completed") return "✅";
    if (event.includes("error")) return "❌";
    if (event.includes("paused")) return "⏸️";
    if (event === "resumed") return "▶️";
    if (event.includes("batch")) return "📦";
    return "📝";
  };

  // Extract error log entries from the job
  const errorEntries = latestJob?.error_log
    ? (Array.isArray(latestJob.error_log) ? latestJob.error_log : [])
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Generation Jobs
          </DialogTitle>
          <DialogDescription>
            {campaignName} — {jobs.length} job{jobs.length !== 1 ? "s" : ""} total
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : !latestJob ? (
          <div className="text-center py-12 text-muted-foreground">
            <Layers className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No generation jobs yet</p>
            <p className="text-xs mt-1">Execute the campaign to start generating pages.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Latest Job Summary */}
            <div className="rounded-xl border border-border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">Latest Job</h3>
                  {(() => {
                    const cfg = jobStatusConfig[latestJob.status] || jobStatusConfig.pending;
                    const Icon = cfg.icon;
                    return (
                      <Badge variant="secondary" className={`${cfg.class} text-[11px] font-medium gap-1`}>
                        <Icon className="h-3 w-3" />
                        {latestJob.status}
                      </Badge>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  {(latestJob.status === "failed" || latestJob.status === "cancelled") && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => retryMutation.mutate()}
                      disabled={retryMutation.isPending}
                      className="h-7 text-xs gap-1"
                    >
                      <RotateCcw className="h-3 w-3" />
                      {retryMutation.isPending ? "Retrying..." : "Retry"}
                    </Button>
                  )}
                  {latestJob.status === "paused" && (
                    <Button
                      size="sm"
                      onClick={() => resumeMutation.mutate()}
                      disabled={resumeMutation.isPending}
                      className="h-7 text-xs gap-1"
                    >
                      <Play className="h-3 w-3" />
                      {resumeMutation.isPending ? "Resuming..." : "Resume"}
                    </Button>
                  )}
                  {latestJob.status === "running" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => cancelMutation.mutate(latestJob.id)}
                      disabled={cancelMutation.isPending}
                      className="h-7 text-xs gap-1"
                    >
                      <XCircle className="h-3 w-3" />
                      {cancelMutation.isPending ? "Cancelling..." : "Cancel"}
                    </Button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <Progress value={jobPercent} className="h-2.5" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex gap-4">
                    <span>Processed: <span className="text-foreground font-medium tabular-nums">{latestJob.processed_rows}/{latestJob.total_rows}</span></span>
                    <span>Success: <span className="text-success font-medium tabular-nums">{latestJob.success_count}</span></span>
                    {latestJob.error_count > 0 && (
                      <span>Errors: <span className="text-destructive font-medium tabular-nums">{latestJob.error_count}</span></span>
                    )}
                  </div>
                  <span className="font-semibold tabular-nums">{jobPercent}%</span>
                </div>
              </div>

              {/* Batch progress */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Batch Progress: {latestJob.current_batch} / {totalBatches} (size: {latestJob.batch_size})
                </p>
                <div className="flex gap-1 flex-wrap">
                  {Array.from({ length: totalBatches }, (_, i) => {
                    const batchNum = i + 1;
                    const isCompleted = batchNum <= latestJob.current_batch;
                    const isCurrent = batchNum === latestJob.current_batch + 1 && latestJob.status === "running";
                    return (
                      <div
                        key={batchNum}
                        className={`h-5 min-w-[20px] rounded text-[9px] font-mono flex items-center justify-center transition-all ${
                          isCompleted
                            ? "bg-success/20 text-success border border-success/30"
                            : isCurrent
                            ? "bg-primary/20 text-primary border border-primary/40 animate-pulse"
                            : "bg-muted text-muted-foreground border border-border"
                        }`}
                        title={`Batch ${batchNum}`}
                      >
                        {batchNum}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Timestamps */}
              <div className="flex gap-4 text-[11px] text-muted-foreground">
                {latestJob.started_at && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Started: {new Date(latestJob.started_at).toLocaleString()}
                  </span>
                )}
                {latestJob.completed_at && (
                  <span className="flex items-center gap-1">
                    <Check className="h-3 w-3" /> Completed: {new Date(latestJob.completed_at).toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {/* Error Log */}
            {(errorEntries.length > 0 || latestJob.error_count > 0) && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    Error Log ({latestJob.error_count} errors)
                  </h4>
                  {errorEntries.length > 0 ? (
                    <ScrollArea className="h-[120px]">
                      <div className="space-y-1.5">
                        {errorEntries.map((err: any, i: number) => (
                          <div key={i} className="text-xs p-2 rounded-lg bg-destructive/5 border border-destructive/10 text-destructive">
                            {typeof err === "string" ? err : JSON.stringify(err)}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {latestJob.error_count} page{latestJob.error_count !== 1 ? "s" : ""} failed during generation. Check the campaign logs below for details.
                    </p>
                  )}
                </div>
              </>
            )}

            <Separator />

            {/* Batch Timeline from Campaign Logs */}
            <div className="flex-1 min-h-0">
              <h4 className="text-sm font-semibold mb-3">Batch Timeline</h4>
              <ScrollArea className="h-[200px]">
                {logs.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No logs yet.</p>
                ) : (
                  <div className="relative pl-6 space-y-0">
                    {logs.map((log: any, index: number) => (
                      <div key={log.id} className="relative pb-4 last:pb-0">
                        {/* Timeline line */}
                        {index < logs.length - 1 && (
                          <div className="absolute left-[-16px] top-5 bottom-0 w-px bg-border" />
                        )}
                        {/* Timeline dot */}
                        <div className="absolute left-[-20px] top-1 h-2.5 w-2.5 rounded-full border-2 border-border bg-card" />

                        <div className="flex items-start gap-2">
                          <span className="text-sm shrink-0">{logEventIcon(log.event)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <Badge variant="outline" className="text-[10px] font-mono rounded-md h-5">{log.event}</Badge>
                              {log.batch_number && (
                                <span className="text-[10px] text-muted-foreground">Batch #{log.batch_number}</span>
                              )}
                              {log.pages_in_batch && (
                                <span className="text-[10px] text-muted-foreground">({log.pages_in_batch} pages)</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{log.message}</p>
                            <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                              {new Date(log.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Previous Jobs */}
            {jobs.length > 1 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-2">Previous Jobs</h4>
                  <div className="space-y-1.5">
                    {jobs.slice(1).map((job: any) => {
                      const cfg = jobStatusConfig[job.status] || jobStatusConfig.pending;
                      const Icon = cfg.icon;
                      const pct = job.total_rows > 0 ? Math.round((job.processed_rows / job.total_rows) * 100) : 0;
                      return (
                        <div key={job.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors text-xs">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className={`${cfg.class} text-[10px] gap-1`}>
                              <Icon className="h-3 w-3" /> {job.status}
                            </Badge>
                            <span className="text-muted-foreground tabular-nums">{job.success_count}/{job.total_rows} pages</span>
                            {job.error_count > 0 && (
                              <span className="text-destructive tabular-nums">({job.error_count} errors)</span>
                            )}
                          </div>
                          <span className="text-muted-foreground/60 tabular-nums">
                            {job.started_at ? new Date(job.started_at).toLocaleDateString() : "—"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
