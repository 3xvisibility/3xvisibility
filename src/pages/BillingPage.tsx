import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Check,
  X,
  Sparkles,
  ArrowRight,
  Layers,
  Zap,
  Globe,
  FileText,
  Users,
  Headphones,
  Store,
  Search,
  Link2,
  Code,
  
  Crown,
  Loader2,
  ExternalLink,
  Gift,
} from "lucide-react";
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
import { TrialStatusWidget } from "@/components/billing/TrialStatusWidget";

import { logAudit } from "@/lib/audit";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useLanguage } from "@/i18n/LanguageContext";

const YEARLY_DISCOUNT = 2 / 12;

interface PlanConfig {
  name: PlanName;
  monthlyPrice: number;
  descriptionKey: string;
  popular: boolean;
  icon: React.ReactNode;
  gradient: string;
}

const planConfigs: PlanConfig[] = [
  {
    name: "starter",
    monthlyPrice: 19,
    descriptionKey: "billing.planDescStarter",
    popular: false,
    icon: <Zap className="h-5 w-5" />,
    gradient: "from-secondary/20 to-secondary/5",
  },
  {
    name: "pro",
    monthlyPrice: 59,
    descriptionKey: "billing.planDescPro",
    popular: true,
    icon: <Sparkles className="h-5 w-5" />,
    gradient: "from-primary/20 to-primary/5",
  },
  {
    name: "agency",
    monthlyPrice: 149,
    descriptionKey: "billing.planDescAgency",
    popular: false,
    icon: <Crown className="h-5 w-5" />,
    gradient: "from-warning/20 to-warning/5",
  },
];

const featureIcons: Record<string, React.ReactNode> = {
  pagesLimit: <Layers className="h-4 w-4 text-primary" />,
  aiLimit: <Sparkles className="h-4 w-4 text-primary" />,
  templates: <FileText className="h-4 w-4 text-primary" />,
  websites: <Globe className="h-4 w-4 text-primary" />,
  wordpress: <Globe className="h-4 w-4 text-primary" />,
  shopify: <Store className="h-4 w-4 text-primary" />,
  prestashop: <Store className="h-4 w-4 text-primary" />,
  woocommerce: <Store className="h-4 w-4 text-primary" />,
  indexing: <Search className="h-4 w-4 text-primary" />,
  discovery: <Search className="h-4 w-4 text-primary" />,
  internalLinks: <Link2 className="h-4 w-4 text-primary" />,
  apiAccess: <Code className="h-4 w-4 text-primary" />,
  teamCollaboration: <Users className="h-4 w-4 text-primary" />,
};

const featureRows: { labelKey: string; key: string }[] = [
  { labelKey: "billing.featurePagesMonth", key: "pagesLimit" },
  { labelKey: "billing.featureAiCreditsMonth", key: "aiLimit" },
  { labelKey: "billing.featureTemplates", key: "templates" },
  { labelKey: "billing.featureWebsites", key: "websites" },
  { labelKey: "billing.featureWordPress", key: "wordpress" },
  { labelKey: "billing.featureShopify", key: "shopify" },
  { labelKey: "billing.featurePrestaShop", key: "prestashop" },
  { labelKey: "billing.featureWooCommerce", key: "woocommerce" },
  { labelKey: "billing.featureGoogleIndexing", key: "indexing" },
  { labelKey: "billing.featureWebsiteDiscovery", key: "discovery" },
  { labelKey: "billing.featureInternalLinks", key: "internalLinks" },
  { labelKey: "billing.featureApiAccess", key: "apiAccess" },
  { labelKey: "billing.featureTeamCollaboration", key: "teamCollaboration" },
];

function formatValue(val: number | boolean, unlimitedLabel: string): React.ReactNode {
  if (typeof val === "boolean") {
    return val ? (
      <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-success/10">
        <Check className="h-3.5 w-3.5 text-success" />
      </div>
    ) : (
      <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted">
        <X className="h-3.5 w-3.5 text-muted-foreground/40" />
      </div>
    );
  }
  return <span className="font-semibold tabular-nums">{val === -1 ? unlimitedLabel : val.toLocaleString()}</span>;
}

function getFeatureList(name: PlanName, t: (key: string, vars?: Record<string, string | number>) => string): string[] {
  const f = PLAN_FEATURES[name];
  return [
    t("billing.pagesCountMonth", { count: f.pagesLimit.toLocaleString() }),
    t("billing.aiCreditsCount", { count: f.aiLimit.toLocaleString() }),
    f.templates === -1 ? t("billing.unlimitedTemplates") : t("billing.templatesCount", { count: f.templates }),
    f.websites === -1 ? t("billing.unlimited") : t(f.websites === 1 ? "billing.websiteCount" : "billing.websitesCount", { count: f.websites }),
    ...(f.shopify ? [t("billing.allCmsIntegrations")] : f.wordpress ? [t("billing.wordpressIntegration")] : []),
    ...(f.indexing ? [t("billing.googleIndexing")] : []),
    ...(f.discovery ? [t("billing.websiteDiscovery")] : []),
    ...(f.internalLinks ? [t("billing.internalLinkBuilding")] : []),
    ...(f.apiAccess ? [t("billing.apiAccess")] : []),
    ...(f.teamCollaboration ? [t("billing.teamCollaboration")] : []),
    name === "starter" ? t("billing.emailSupport") : name === "pro" ? t("billing.prioritySupport") : t("billing.dedicatedSupport"),
  ];
}

export default function BillingPage() {
  const { plan: currentPlan, pagesUsed, pagesLimit, aiUsed, aiLimit, sitesConnected, sitesLimit, isLoading: subLoading } = useSubscription();
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

  const handleCheckout = async (planName: PlanName) => {
    const tier = STRIPE_TIERS[planName];
    if (!tier) return;

    setLoadingPlan(planName);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: tier.price_id, origin: window.location.origin },
      });
      if (error) throw error;
      if (data?.url) {
        if (wsId) logAudit(wsId, "plan_changed", "subscription", null, { from: currentPlan, to: planName, billing: isYearly ? "yearly" : "monthly" });
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({ title: t("billing.checkoutFailed"), description: err.message, variant: "destructive" });
    } finally {
      setLoadingPlan(null);
    }
  };

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

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3">
        <span className={`text-sm font-medium transition-colors ${!isYearly ? "text-foreground" : "text-muted-foreground"}`}>{t("billing.monthly")}</span>
        <button
          onClick={() => setIsYearly(!isYearly)}
          className={`relative h-7 w-[52px] rounded-full transition-colors duration-300 ${isYearly ? "bg-primary" : "bg-muted"}`}
        >
          <div className={`absolute top-0.5 h-6 w-6 rounded-full bg-card shadow-md transition-transform duration-300 ${isYearly ? "translate-x-[26px]" : "translate-x-0.5"}`} />
        </button>
        <span className={`text-sm font-medium transition-colors ${isYearly ? "text-foreground" : "text-muted-foreground"}`}>{t("billing.yearly")}</span>
        {isYearly && (
          <Badge className="bg-success/10 text-success border-success/20 text-[10px] font-bold animate-fade-in">{t("billing.save20")}</Badge>
        )}
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
        {planConfigs.map((config) => {
          const features = PLAN_FEATURES[config.name];
          const btn = getButtonState(config.name);
          const price = isYearly ? Math.round(config.monthlyPrice * (1 - YEARLY_DISCOUNT)) : config.monthlyPrice;
          const featureList = getFeatureList(config.name, t);
          const isLoading = loadingPlan === config.name;

          return (
            <Card
              key={config.name}
              id={`plan-${config.name}`}
              className={`relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                highlightPlan === config.name
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-2xl shadow-primary/30 animate-pulse-slow"
                  : config.popular
                  ? "ring-2 ring-primary shadow-xl shadow-primary/10 md:scale-[1.03]"
                  : "shadow-surface border-0 hover:shadow-surface-hover"
              }`}
            >
              {config.popular && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-[hsl(var(--primary-glow))] to-secondary" />
              )}

              <CardHeader className="pb-2 pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center`}>
                      {config.icon}
                    </div>
                    <CardTitle className="text-base font-bold">{features.label}</CardTitle>
                  </div>
                  {config.popular && (
                    <Badge className="bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-2.5">{t("billing.mostPopular")}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">{t(config.descriptionKey)}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold tabular-nums tracking-tight">€{price}</span>
                  <span className="text-muted-foreground text-sm">/mo</span>
                </div>
                {isYearly && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {t("billing.billedYearly", { amount: price * 12 })} <span className="line-through text-muted-foreground/50">€{config.monthlyPrice * 12}</span>
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">{t("billing.pagesCountMonth", { count: features.pagesLimit.toLocaleString() })}</p>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-success/10 border border-success/20 px-2.5 py-1 text-[11px] font-semibold text-success">
                  <Gift className="h-3 w-3" />
                  1 month free trial — first subscription only
                </div>

              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <Separator />
                <ul className="space-y-2.5">
                  {featureList.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <div className="h-5 w-5 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                        <Check className="h-3 w-3 text-success" />
                      </div>
                      <span className="text-foreground/80">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full rounded-xl h-11 text-sm font-semibold transition-all duration-300 active:scale-[0.97] ${
                    config.popular && !btn.disabled
                      ? "bg-gradient-to-r from-primary to-[hsl(var(--primary-glow))] hover:brightness-110 shadow-lg shadow-primary/20"
                      : ""
                  }`}
                  variant={btn.variant}
                  disabled={btn.disabled || isLoading}
                  onClick={() => !btn.disabled && handleCheckout(config.name)}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : btn.disabled ? (
                    t("billing.currentPlanBtn")
                  ) : (
                    <>
                      {btn.label} <ArrowRight className="ml-1.5 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Separator />

      {/* Feature comparison table */}
      <Card className="shadow-surface border-0 overflow-hidden hidden md:block">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            {t("billing.comparePlans")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t("billing.compareDesc")}</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-hidden">
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3.5 px-5 font-semibold text-foreground">{t("billing.feature")}</th>
                  {planConfigs.map((p) => (
                    <th key={p.name} className="text-center py-3.5 px-5">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`font-semibold ${p.name === activePlan ? "text-primary" : "text-foreground"}`}>
                          {PLAN_FEATURES[p.name].label}
                        </span>
                        {p.name === activePlan && (
                          <Badge variant="outline" className="text-[9px] text-primary border-primary/30 px-1.5 py-0">{t("billing.current")}</Badge>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {featureRows.map((row, i) => (
                  <tr key={row.key} className={`border-b border-border/50 last:border-0 transition-colors hover:bg-muted/30 ${i % 2 === 1 ? "bg-muted/10" : ""}`}>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2.5">
                        {featureIcons[row.key]}
                        <span className="text-foreground font-medium">{t(row.labelKey)}</span>
                        {row.key === "prestashop" && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-500/10 text-amber-500 border-amber-500/20">{t("common.comingSoon")}</Badge>
                        )}
                      </div>
                    </td>
                    {planConfigs.map((p) => {
                      const val = (PLAN_FEATURES[p.name] as any)[row.key];
                      return (
                        <td key={p.name} className={`py-3.5 px-5 text-center ${p.name === activePlan ? "bg-primary/[0.02]" : ""}`}>
                          {row.key === "prestashop" ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            formatValue(val, t("common.unlimited"))
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="border-b border-border/50">
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2.5">
                      <Headphones className="h-4 w-4 text-primary" />
                      <span className="text-foreground font-medium">{t("billing.support")}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-5 text-center"><span className="font-medium text-muted-foreground">{t("billing.email")}</span></td>
                  <td className="py-3.5 px-5 text-center"><span className="font-medium text-foreground">{t("billing.priority")}</span></td>
                  <td className="py-3.5 px-5 text-center"><span className="font-medium text-foreground">{t("billing.dedicated")}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <MyInvoicesCard />
    </div>
  );
}
