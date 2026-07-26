import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Gift, CalendarClock, AlertTriangle, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/use-subscription";
import { PLAN_FEATURES } from "@/lib/plan-features";

const TRIAL_LENGTH_DAYS = 30;

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function fmtLimit(value: number) {
  return value === -1 ? "Unlimited" : value.toLocaleString();
}

interface TrialStatusWidgetProps {
  /** Hide the "View plans" button (e.g. when already on the Billing page). */
  hideUpgradeAction?: boolean;
  className?: string;
}

/**
 * Compact status card showing the current plan, remaining trial days and the
 * key plan limits (pages, AI credits, connected sites).
 */
export function TrialStatusWidget({ hideUpgradeAction, className }: TrialStatusWidgetProps) {
  const navigate = useNavigate();
  const {
    plan,
    isLoading,
    isTrialing,
    trialDaysLeft,
    trialEnd,
    cancelAtPeriodEnd,
    status,
    resetDate,
    pagesUsed,
    pagesLimit,
    aiUsed,
    aiLimit,
    sitesConnected,
    sitesLimit,
  } = useSubscription();

  const planLabel = PLAN_FEATURES[plan]?.label ?? plan;
  const trialPercent = isTrialing
    ? Math.min(100, Math.max(0, ((TRIAL_LENGTH_DAYS - trialDaysLeft) / TRIAL_LENGTH_DAYS) * 100))
    : 0;

  return (
    <Card className={`shadow-surface border-0 ${className ?? ""}`}>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Plan status
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xl font-semibold capitalize">{planLabel}</span>
              {isTrialing ? (
                <Badge className="gap-1">
                  <Gift className="h-3 w-3" />
                  Free trial
                </Badge>
              ) : (
                <Badge variant="secondary" className="capitalize">
                  {status === "past_due" ? "Payment due" : status}
                </Badge>
              )}
              {cancelAtPeriodEnd && (
                <Badge variant="outline" className="gap-1 text-amber-600 border-amber-500/40">
                  <AlertTriangle className="h-3 w-3" />
                  Cancels at period end
                </Badge>
              )}
            </div>
          </div>
          {!hideUpgradeAction && (
            <Button size="sm" variant="outline" onClick={() => navigate("/billing")}>
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              View plans
            </Button>
          )}
        </div>

        {isTrialing ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                {trialDaysLeft} {trialDaysLeft === 1 ? "day" : "days"} left in trial
              </span>
              <span className="text-muted-foreground">Ends {fmtDate(trialEnd)}</span>
            </div>
            <Progress value={trialPercent} className="h-2" />
            <p className="text-xs text-muted-foreground">
              You keep full {planLabel} access during the trial. Billing starts automatically when it ends.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <CalendarClock className="h-4 w-4 shrink-0" />
            {plan === "free"
              ? "You're on the Free plan — subscribe to unlock a 1-month free trial."
              : `Next renewal / usage reset: ${fmtDate(resetDate)}`}
          </p>
        )}

        <div className="grid grid-cols-3 gap-3 pt-1 border-t border-border/60">
          <div className="pt-3">
            <p className="text-xs text-muted-foreground">Pages</p>
            <p className="text-sm font-semibold tabular-nums">
              {isLoading ? "—" : `${pagesUsed.toLocaleString()} / ${fmtLimit(pagesLimit)}`}
            </p>
          </div>
          <div className="pt-3">
            <p className="text-xs text-muted-foreground">AI credits</p>
            <p className="text-sm font-semibold tabular-nums">
              {isLoading ? "—" : `${aiUsed.toLocaleString()} / ${fmtLimit(aiLimit)}`}
            </p>
          </div>
          <div className="pt-3">
            <p className="text-xs text-muted-foreground">Sites</p>
            <p className="text-sm font-semibold tabular-nums">
              {isLoading ? "—" : `${sitesConnected.toLocaleString()} / ${fmtLimit(sitesLimit)}`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default TrialStatusWidget;
