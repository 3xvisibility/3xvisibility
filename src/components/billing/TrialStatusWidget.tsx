import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Gift, CalendarClock, AlertTriangle, Sparkles, CreditCard, Loader2, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/use-subscription";
import { PLAN_FEATURES } from "@/lib/plan-features";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";


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
  const { toast } = useToast();
  const [portalLoading, setPortalLoading] = useState(false);
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

  const meters = [
    { label: "Pages", used: pagesUsed, limit: pagesLimit },
    { label: "AI credits", used: aiUsed, limit: aiLimit },
    { label: "Sites", used: sitesConnected, limit: sitesLimit },
  ].map((m) => ({
    ...m,
    // -1 means unlimited → never show a filled bar or a near-cap warning.
    percent: m.limit > 0 ? Math.min(100, Math.round((m.used / m.limit) * 100)) : 0,
  }));
  const nearCap = isLoading ? [] : meters.filter((m) => m.limit > 0 && m.percent >= 80);
  const atCap = nearCap.filter((m) => m.percent >= 100);


  const openCustomerPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (!data?.url) throw new Error("No portal URL returned");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast({
        title: "Could not open the billing portal",
        description:
          err instanceof Error && err.message
            ? err.message
            : "Please try again, or subscribe to a plan first.",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };



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
          <div className="flex flex-wrap items-center justify-end gap-2">
            {!hideUpgradeAction && (
              <Button size="sm" variant="outline" onClick={() => navigate("/billing")}>
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                View plans
              </Button>
            )}
            {plan !== "free" && (
              <Button size="sm" onClick={openCustomerPortal} disabled={portalLoading}>
                {portalLoading ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                )}
                Manage subscription
                <ExternalLink className="h-3 w-3 ml-1.5 opacity-70" />
              </Button>
            )}
          </div>
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

        <div className="space-y-3 pt-3 border-t border-border/60">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              This period's usage
            </p>
            <span className="text-xs text-muted-foreground">Resets {fmtDate(resetDate)}</span>
          </div>
          {meters.map((m) => (
            <div key={m.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{m.label}</span>
                <span className="font-semibold tabular-nums">
                  {isLoading ? "—" : `${m.used.toLocaleString()} / ${fmtLimit(m.limit)}`}
                </span>
              </div>
              <Progress
                value={m.percent}
                className={`h-2 ${m.percent >= 100 ? "[&>div]:bg-destructive" : m.percent >= 80 ? "[&>div]:bg-amber-500" : ""}`}
              />
            </div>
          ))}
        </div>

        {nearCap.length > 0 && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              {atCap.length > 0
                ? `You've reached your ${atCap.map((m) => m.label.toLowerCase()).join(" and ")} limit`
                : `You're close to your ${nearCap.map((m) => m.label.toLowerCase()).join(" and ")} limit`}
            </p>
            <p className="text-xs text-muted-foreground">
              Upgrade your plan for higher limits, or wait until {fmtDate(resetDate)} when usage resets.
            </p>
            <Button size="sm" onClick={() => navigate("/billing")}>
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Upgrade plan
            </Button>
          </div>
        )}

      </CardContent>
    </Card>
  );
}

export default TrialStatusWidget;
