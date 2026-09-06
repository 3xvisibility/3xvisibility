import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Loader2, ExternalLink } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { PLAN_FEATURES, type PlanName } from "@/lib/plan-features";
import { STRIPE_TIERS } from "@/lib/stripe-config";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckoutSuccessOverlay } from "@/components/billing/CheckoutSuccessOverlay";
import { CheckoutCanceledOverlay } from "@/components/billing/CheckoutCanceledOverlay";
import { PaymentMethods } from "@/components/billing/PaymentMethods";
import { MyInvoicesCard } from "@/components/billing/MyInvoicesCard";
import { BillingDetailsCard } from "@/components/billing/BillingDetailsCard";
import { TrialStatusWidget } from "@/components/billing/TrialStatusWidget";
import { DowngradePlanDialog } from "@/components/billing/DowngradePlanDialog";
import { CheckoutConfirmDialog } from "@/components/billing/CheckoutConfirmDialog";
import { PricingComparisonTable } from "@/components/billing/PricingComparisonTable";

import { logAudit } from "@/lib/audit";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useLanguage } from "@/i18n/LanguageContext";

const YEARLY_DISCOUNT = 2 / 12;

const planMonthlyPrices: Record<PlanName, number> = {
  free: 0,
  starter: 19,
  pro: 59,
  agency: 149,
};

export default function BillingPage() {
  const { plan: currentPlan, pagesUsed, pagesLimit, aiUsed, aiLimit, sitesConnected, sitesLimit, resetDate, status: subStatus, isTrialing, isLoading: subLoading } = useSubscription();
  const [downgradeTarget, setDowngradeTarget] = useState<PlanName | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<PlanName | null>(null);

  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { t } = useLanguage();
  const wsId = currentWorkspace?.id;
  const [isYearly, setIsYearly] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<PlanName | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCanceled, setShowCanceled] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const highlightPlan = searchParams.get("highlight") as PlanName | null;

  // Auto-scroll to highlighted plan
  useEffect(() => {
    if (!highlightPlan) return;
    const el = document.getElementById(`plan-${highlightPlan}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightPlan]);


  // Sync with Stripe on mount and after checkout success
  useEffect(() => {
    const isSuccess = searchParams.get("success") === "true";
    if (searchParams.get("canceled") === "true") {
      setShowCanceled(true);
    }
    if (searchParams.get("card_added") === "true") {
    toast({ title: t("billing.paymentMethodSaved"), description: t("billing.cardOnFile") });
      setSearchParams({}, { replace: true });
    }

    const syncSubscription = async (retries = 0) => {
      try {
        const { data, error } = await supabase.functions.invoke("check-subscription");
        if (error) throw error;

        if (data?.subscription_end) {
          setSubscriptionEnd(data.subscription_end);
        }

        // After sync, invalidate cache so useSubscription re-reads updated DB
        await queryClient.invalidateQueries({ queryKey: ["user-subscription"] });
        await queryClient.invalidateQueries({ queryKey: ["dashboard-ai-usage"] });

        // For checkout success: if Stripe hasn't processed yet (still free), retry
        if (isSuccess && !data?.subscribed && retries < 3) {
          setTimeout(() => syncSubscription(retries + 1), 3000);
          return;
        }

        setHasSynced(true);
        if (isSuccess) {
          setShowSuccess(true);
        }
      } catch (err) {
        console.error("Failed to sync subscription:", err);
        setHasSynced(true);
        if (isSuccess) setShowSuccess(true);
      }
    };

    syncSubscription();
  }, []);

  const handleCheckout = async (planName: PlanName, sameTab = false) => {
    if (planName === "free") return;

    setLoadingPlan(planName);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan: planName, origin: window.location.origin },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error as string);
      if (data?.url) {
        if (wsId) logAudit(wsId, "plan_changed", "subscription", null, { from: currentPlan, to: planName, billing: isYearly ? "yearly" : "monthly" });
        if (sameTab) window.location.href = data.url;
        else window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({ title: t("billing.checkoutFailed"), description: err.message, variant: "destructive" });
    } finally {
      setLoadingPlan(null);
    }
  };


  // Resume a checkout that was started from the public pricing page:
  // /billing?plan=pro opens the Stripe session for that plan automatically.
  const [autoCheckoutDone, setAutoCheckoutDone] = useState(false);
  useEffect(() => {
    const requested = searchParams.get("plan") as PlanName | null;
    if (!requested || autoCheckoutDone || subLoading) return;
    setAutoCheckoutDone(true);
    searchParams.delete("plan");
    setSearchParams(searchParams, { replace: true });
    if (!STRIPE_TIERS[requested] || requested === currentPlan) return;
    handleCheckout(requested, true);
  }, [searchParams, autoCheckoutDone, subLoading, currentPlan]);



  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        if (wsId) logAudit(wsId, "subscription_updated", "subscription", null, { detail: "Opened customer portal" });
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({ title: t("billing.portalError"), description: err.message, variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  const activePlan = currentPlan;
  const pagesPercent = pagesLimit > 0 ? Math.round((pagesUsed / pagesLimit) * 100) : 0;
  const aiPercent = aiLimit > 0 ? Math.round((aiUsed / aiLimit) * 100) : 0;

  const planOrder: PlanName[] = ["free", "starter", "pro", "agency"];
  const currentIdx = planOrder.indexOf(activePlan);

  const getButtonState = (name: PlanName) => {
    const idx = planOrder.indexOf(name);
    if (idx === currentIdx) return { label: t("billing.currentPlanBtn"), disabled: true, variant: "outline" as const };
    if (idx > currentIdx) return { label: t("billing.upgrade"), disabled: false, variant: "default" as const };
    return { label: t("billing.downgrade"), disabled: false, variant: "outline" as const };
  };

  // Upgrades go through Stripe checkout; downgrades are handled in-app so the
  // new limits apply immediately with a clear billing effective date.
  const handlePlanClick = (name: PlanName) => {
    if (planOrder.indexOf(name) < currentIdx) {
      setDowngradeTarget(name);
      return;
    }
    setConfirmTarget(name);
  };

  const refreshSubscription = async () => {
    await queryClient.invalidateQueries({ queryKey: ["user-subscription"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard-ai-usage"] });
  };


  const handleSuccessDismiss = () => {
    setShowSuccess(false);
    setSearchParams({}, { replace: true });
  };

  const handleCanceledDismiss = () => {
    setShowCanceled(false);
    setSearchParams({}, { replace: true });
  };

  return (
    <div className="space-y-8">
      {showSuccess && (
        <CheckoutSuccessOverlay
          planName={PLAN_FEATURES[activePlan]?.label}
          onDismiss={handleSuccessDismiss}
        />
      )}
      {showCanceled && (
        <CheckoutCanceledOverlay onDismiss={handleCanceledDismiss} />
      )}
      {/* Header */}
      <div>
        <h1 className="text-display">{t("billing.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("billing.description")}</p>
      </div>

      <TrialStatusWidget hideUpgradeAction />



      {/* Usage overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-surface border-0">
          <CardContent className="p-5 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("billing.currentPlan")}</p>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <span className="text-xl font-bold capitalize">{PLAN_FEATURES[activePlan]?.label || t("common.free")}</span>
                <Badge variant="outline" className="ml-2 text-[10px] text-success border-success/30 bg-success/5">{t("billing.active")}</Badge>
              </div>
            </div>
            {currentPlan !== "free" && subscriptionEnd && (
              <p className="text-xs text-muted-foreground">
                {t("billing.renews", { date: new Date(subscriptionEnd).toLocaleDateString() })}
              </p>
            )}
            {currentPlan !== "free" && (
              <Button variant="outline" size="sm" className="w-full mt-2" onClick={handleManageSubscription} disabled={portalLoading}>
                {portalLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                {t("billing.manageSubscription")}
              </Button>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-surface border-0">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("billing.pageGenerations")}</p>
              <span className="text-xs tabular-nums font-medium text-muted-foreground">{pagesUsed} / {pagesLimit}</span>
            </div>
            <Progress value={pagesPercent} className="h-2" />
            <p className={`text-xs ${pagesPercent >= 90 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
              {pagesPercent >= 100
                ? t("billing.limitReached")
                : t("billing.remainingMonth", { count: pagesLimit - pagesUsed })}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-surface border-0">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("billing.aiGenerations")}</p>
              <span className="text-xs tabular-nums font-medium text-muted-foreground">{aiUsed} / {aiLimit}</span>
            </div>
            <Progress value={aiPercent} className="h-2" />
            <p className={`text-xs ${aiPercent >= 90 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
              {aiPercent >= 100
                ? t("billing.limitReached")
                : t("billing.remainingMonth", { count: aiLimit - aiUsed })}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-surface border-0">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("billing.connectedSites")}</p>
              <span className="text-xs tabular-nums font-medium text-muted-foreground">
                {sitesConnected} / {sitesLimit === -1 ? "∞" : sitesLimit}
              </span>
            </div>
            <Progress value={sitesLimit === -1 ? 0 : (sitesLimit > 0 ? Math.round((sitesConnected / sitesLimit) * 100) : 0)} className="h-2" />
            <p className={`text-xs ${sitesLimit !== -1 && sitesConnected >= sitesLimit ? "text-destructive font-medium" : "text-muted-foreground"}`}>
              {sitesLimit === -1
                ? t("billing.unlimited")
                : sitesConnected >= sitesLimit
                  ? t("billing.limitReachedAddMore")
                  : t("billing.slotsAvailable", { count: sitesLimit - sitesConnected })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment methods */}
      <PaymentMethods />

      <PricingComparisonTable
        activePlan={activePlan}
        currentPlan={currentPlan}
        isYearly={isYearly}
        loadingPlan={loadingPlan}
        onPlanClick={handlePlanClick}
        onToggleYearly={() => setIsYearly(!isYearly)}
        trialEligible={activePlan === "free" && subStatus !== "canceled" && !isTrialing}
      />

      <BillingDetailsCard />

      <MyInvoicesCard />

      {downgradeTarget && (
        <DowngradePlanDialog
          open={!!downgradeTarget}
          onOpenChange={(o) => !o && setDowngradeTarget(null)}
          currentPlan={activePlan}
          targetPlan={downgradeTarget}
          periodEnd={resetDate}
          onDowngraded={refreshSubscription}
        />
      )}

      {confirmTarget && (
        <CheckoutConfirmDialog
          open={!!confirmTarget}
          onOpenChange={(o) => !o && setConfirmTarget(null)}
          currentPlan={activePlan}
          targetPlan={confirmTarget}
          monthlyPrice={(() => {
            const base = planMonthlyPrices[confirmTarget] ?? 0;
            return isYearly ? Math.round(base * (1 - YEARLY_DISCOUNT)) : base;
          })()}
          isYearly={isYearly}
          trialEligible={activePlan === "free" && subStatus !== "canceled" && !isTrialing}
          loading={loadingPlan === confirmTarget}
          onConfirm={async () => {
            const target = confirmTarget;
            await handleCheckout(target);
            setConfirmTarget(null);
          }}
        />
      )}
    </div>
  );
}

