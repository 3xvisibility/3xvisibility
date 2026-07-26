import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Activity, CheckCircle2, AlertCircle, Pause, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { wsChannel } from "@/lib/realtime-scope";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Job = Tables<"generation_jobs"> & { campaigns?: { name: string } | null };

const JOB_STATE_META: Record<string, { label: string; tone: string; icon: typeof Activity }> = {
  pending: { label: "Queued", tone: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Activity },
  running: { label: "Generating", tone: "bg-primary/10 text-primary border-primary/20", icon: Loader2 },
  paused: { label: "Paused", tone: "bg-muted text-muted-foreground border-border", icon: Pause },
  completed: { label: "Done", tone: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle2 },
  failed: { label: "Failed", tone: "bg-destructive/10 text-destructive border-destructive/20", icon: AlertCircle },
  cancelled: { label: "Cancelled", tone: "bg-muted text-muted-foreground border-border", icon: AlertCircle },
};

export function LiveGenerationProgress({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [tick, setTick] = useState(0);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmJob, setConfirmJob] = useState<{
    id: string;
    campaign_id: string | null;
    name: string;
    done: number;
    total: number;
  } | null>(null);

  const cancelMutation = useMutation({
    mutationFn: async (job: { id: string; campaign_id: string | null }) => {
      setCancellingId(job.id);
      if (job.campaign_id) {
        try {
          await supabase.functions.invoke("generate-pages", {
            body: { campaign_id: job.campaign_id, action: "pause" },
          });
        } catch {
          /* pause is best-effort */
        }
      }
      const { error } = await supabase
        .from("generation_jobs")
        .update({ status: "cancelled" as never, updated_at: new Date().toISOString() })
        .eq("id", job.id);
      if (error) throw error;
      if (job.campaign_id) {
        await supabase
          .from("campaigns")
          .update({ status: "draft" as never, is_paused: false })
          .eq("id", job.campaign_id);
      }
    },
    onSettled: () => setCancellingId(null),
    onSuccess: () => {
      setTick((t) => t + 1);
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["generated-pages"] });
      toast({ title: "Generation cancelled" });
    },
    onError: (err: Error) => {
      toast({ title: "Cancel failed", description: err.message, variant: "destructive" });
    },
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["generation-jobs-live", workspaceId, tick],
    enabled: !!workspaceId,
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generation_jobs")
        .select("*, campaigns(name)")
        .eq("workspace_id", workspaceId)
        .in("status", ["pending", "running", "paused"])
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data as Job[]) || [];
    },
  });

  useEffect(() => {
    if (!workspaceId) return;
    const channel = supabase
      .channel(wsChannel("gen-jobs", workspaceId))
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "generation_jobs", filter: `workspace_id=eq.${workspaceId}` },
        () => {
          setTick((t) => t + 1);
          queryClient.invalidateQueries({ queryKey: ["generated-pages"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "generated_pages", filter: `workspace_id=eq.${workspaceId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["generated-pages"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, queryClient]);

  if (!jobs.length) return null;

  return (
    <Card className="shadow-surface border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 text-primary animate-spin" />
          <h3 className="text-sm font-semibold">Live generation in progress</h3>
          <Badge variant="outline" className="text-[10px] h-5">
            {jobs.length} active
          </Badge>
        </div>
        <div className="space-y-3">
          {jobs.map((job) => {
            const meta = JOB_STATE_META[job.status] || JOB_STATE_META.pending;
            const Icon = meta.icon;
            const total = job.total_rows || 0;
            const done = job.processed_rows || 0;
            const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
            return (
              <div key={job.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <Link
                    to={`/campaigns/${job.campaign_id}`}
                    className="font-medium truncate hover:underline flex items-center gap-1.5"
                  >
                    <Icon className={`h-3 w-3 ${job.status === "running" ? "animate-spin" : ""}`} />
                    {job.campaigns?.name || "Campaign"}
                  </Link>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] h-5 ${meta.tone}`}>
                      {meta.label}
                    </Badge>
                    <span className="tabular-nums text-muted-foreground">
                      {done}/{total} • {pct}%
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[11px] gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                      disabled={cancellingId === job.id}
                      onClick={() => setConfirmJob({ id: job.id, campaign_id: job.campaign_id, name: job.campaigns?.name || "Campaign", done, total })}
                    >
                      <XCircle className="h-3 w-3" />
                      {cancellingId === job.id ? "Cancelling…" : "Cancel"}
                    </Button>
                  </div>
                </div>
                <Progress value={pct} className="h-1.5" />
                {job.error_count > 0 && (
                  <p className="text-[11px] text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {job.error_count} error{job.error_count > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <AlertDialog open={!!confirmJob} onOpenChange={(open) => !open && setConfirmJob(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Stop this generation job?</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmJob
                  ? `"${confirmJob.name}" has generated ${confirmJob.done} of ${confirmJob.total} pages. Cancelling stops the job and returns the campaign to draft. Already generated pages are kept, and you can restart generation later.`
                  : ""}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep generating</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (confirmJob) {
                    cancelMutation.mutate({ id: confirmJob.id, campaign_id: confirmJob.campaign_id });
                  }
                  setConfirmJob(null);
                }}
              >
                Yes, cancel job
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
