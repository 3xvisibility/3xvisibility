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
import { useLanguage } from "@/i18n/LanguageContext";


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
  const { t } = useLanguage();
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
    { key: "pages", label: t("trial.pages"), used: pagesUsed, limit: pagesLimit },
    { key: "aiCredits", label: t("trial.aiCredits"), used: aiUsed, limit: aiLimit },
    { key: "sites", label: t("trial.sites"), used: sitesConnected, limit: sitesLimit },
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
        title: t("trial.portalFailed"),
        description:
          err instanceof Error && err.message ? err.message : t("trial.portalFailedDesc"),
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
              {t("trial.planStatus")}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xl font-semibold capitalize">{planLabel}</span>
              {isTrialing ? (
                <Badge className="gap-1">
                  <Gift className="h-3 w-3" />
                  {t("trial.freeTrial")}
                </Badge>
              ) : (
                <Badge variant="secondary" className="capitalize">
                  {status === "past_due" ? t("trial.paymentDue") : status}
                </Badge>
              )}
              {cancelAtPeriodEnd && (
                <Badge variant="outline" className="gap-1 text-amber-600 border-amber-500/40">
                  <AlertTriangle className="h-3 w-3" />
                  {t("trial.cancelsAtPeriodEnd")}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {!hideUpgradeAction && (
              <Button size="sm" variant="outline" onClick={() => navigate("/billing")}>
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                {t("trial.viewPlans")}
              </Button>
            )}
            {plan !== "free" && (
              <Button size="sm" onClick={openCustomerPortal} disabled={portalLoading}>
                {portalLoading ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                )}
                {t("trial.manageSubscription")}
                <ExternalLink className="h-3 w-3 ml-1.5 opacity-70" />
              </Button>
            )}
          </div>
        </div>


        {isTrialing ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                {trialDaysLeft === 1 ? t("trial.dayLeft") : t("trial.daysLeft", { count: trialDaysLeft })}
              </span>
              <span className="text-muted-foreground">{t("trial.ends", { date: fmtDate(trialEnd) })}</span>
            </div>
            <Progress value={trialPercent} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {t("trial.note", { plan: planLabel })}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <CalendarClock className="h-4 w-4 shrink-0" />
            {plan === "free"
              ? t("trial.freePlanNote")
              : t("trial.nextRenewal", { date: fmtDate(resetDate) })}
          </p>
        )}

        <div className="space-y-3 pt-3 border-t border-border/60">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t("trial.periodUsage")}
            </p>
            <span className="text-xs text-muted-foreground">{t("trial.resets", { date: fmtDate(resetDate) })}</span>
          </div>
          {meters.map((m) => (
            <div key={m.key} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{m.label}</span>
                <span className="font-semibold tabular-nums">
                  {isLoading ? "—" : `${m.used.toLocaleString()} / ${m.limit === -1 ? t("trial.unlimited") : m.limit.toLocaleString()}`}
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
                ? t("trial.atCap", { items: atCap.map((m) => m.label.toLowerCase()).join(", ") })
                : t("trial.nearCap", { items: nearCap.map((m) => m.label.toLowerCase()).join(", ") })}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("trial.capNote", { date: fmtDate(resetDate) })}
            </p>
            <Button size="sm" onClick={() => navigate("/billing")}>
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              {t("trial.upgradePlan")}
            </Button>
          </div>
        )}

      </CardContent>
    </Card>
  );
}

export default TrialStatusWidget;
