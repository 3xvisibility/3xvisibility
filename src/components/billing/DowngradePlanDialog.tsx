import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { ArrowDown, CalendarClock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PLAN_FEATURES, type PlanName } from "@/lib/plan-features";

function fmtLimit(v: number) {
  return v === -1 ? "Unlimited" : v.toLocaleString();
}

function fmtDate(iso: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return null;
  }
}

interface DowngradePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: PlanName;
  targetPlan: PlanName;
  /** Current period end — used as a fallback effective date before the API responds. */
  periodEnd: string | null;
  /** Called after a successful downgrade so callers can refetch subscription state. */
  onDowngraded?: () => void;
}

export function DowngradePlanDialog({
  open,
  onOpenChange,
  currentPlan,
  targetPlan,
  periodEnd,
  onDowngraded,
}: DowngradePlanDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const from = PLAN_FEATURES[currentPlan];
  const to = PLAN_FEATURES[targetPlan];
  const effective = fmtDate(periodEnd);

  const rows: { label: string; from: number; to: number }[] = [
    { label: "Pages / month", from: from.pagesLimit, to: to.pagesLimit },
    { label: "AI credits / month", from: from.aiLimit, to: to.aiLimit },
    { label: "Websites", from: from.websites, to: to.websites },
    { label: "Templates", from: from.templates, to: to.templates },
  ];

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("change-plan", {
        body: { targetPlan },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const when = fmtDate(data?.effective_at ?? periodEnd);
      toast({
        title: `Downgraded to ${to.label}`,
        description: data?.cancel_at_period_end
          ? `Your new limits apply immediately. Billing stops after ${when ?? "the current period"}.`
          : `Your new limits apply immediately. The lower price starts on your next invoice${when ? ` (${when})` : ""}.`,
      });
      onDowngraded?.();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Downgrade failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => !loading && onOpenChange(o)}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ArrowDown className="h-4 w-4 text-warning" />
            Downgrade to {to.label}?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left">
              <p>
                Your plan limits change <strong>immediately</strong>. Anything already generated stays
                available, but new work is capped at the {to.label} limits.
              </p>
              <div className="rounded-lg border border-border/60 divide-y divide-border/60">
                {rows.map((r) => (
                  <div key={r.label} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="flex items-center gap-2 tabular-nums">
                      <span className="line-through text-muted-foreground">{fmtLimit(r.from)}</span>
                      <ArrowDown className="h-3 w-3 text-warning rotate-[-90deg]" />
                      <span className="font-semibold">{fmtLimit(r.to)}</span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm">
                <CalendarClock className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <span>
                  {targetPlan === "free" ? (
                    <>
                      Billing for {from.label} continues until{" "}
                      <Badge variant="secondary">{effective ?? "the end of the current period"}</Badge>,
                      then your subscription ends. No further charges.
                    </>
                  ) : (
                    <>
                      You keep your current billing date — the lower {to.label} price applies from your
                      next invoice on{" "}
                      <Badge variant="secondary">{effective ?? "your next billing date"}</Badge>. No
                      prorated charge or refund is issued today.
                    </>
                  )}
                </span>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Keep {from.label}</AlertDialogCancel>
          <AlertDialogAction onClick={(e) => { e.preventDefault(); handleConfirm(); }} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirm downgrade
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
