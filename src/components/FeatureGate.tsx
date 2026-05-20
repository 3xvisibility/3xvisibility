import { useState } from "react";
import { useSubscription } from "@/hooks/use-subscription";
import { getMinimumPlanFor, PLAN_FEATURES, type FeatureKey, type PlanName } from "@/lib/plan-features";
import { Lock, ArrowRight, Check, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useLanguage } from "@/i18n/LanguageContext";

const PLAN_PRICES_MONTHLY: Record<PlanName, number> = {
  free: 0,
  starter: 29,
  pro: 79,
  agency: 199,
};

const YEARLY_DISCOUNT = 0.2; // 20% off
const PLANS: PlanName[] = ["free", "starter", "pro", "agency"];

interface FeatureGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
}

export function FeatureGate({ feature, children }: FeatureGateProps) {
  const { canUseFeature, plan: currentPlan, pagesUsed, pagesLimit, aiUsed, aiLimit, sitesConnected, sitesLimit, pagesRemaining, aiRemaining, sitesRemaining, features: currentFeatures } = useSubscription();
  const navigate = useNavigate();
  const { basePath } = useWorkspace();
  const { t } = useLanguage();
  const [isYearly, setIsYearly] = useState(false);

  if (canUseFeature(feature)) {
    return <>{children}</>;
  }

  const minPlan = getMinimumPlanFor(feature);
  const planLabel = PLAN_FEATURES[minPlan].label;
  const currentPlanLabel = PLAN_FEATURES[currentPlan].label;
  const featureName = t(`featureGate.label.${feature}`);
  const featureDesc = t(`featureGate.desc.${feature}`);
  const unlimited = t("featureGate.unlimited");

  const COMPARISON_ROWS: { label: string; getValue: (plan: PlanName) => string | boolean }[] = [
    { label: t("featureGate.rowPages"), getValue: (p) => { const v = PLAN_FEATURES[p].pagesLimit; return v === -1 ? unlimited : v.toLocaleString(); } },
    { label: t("featureGate.rowAiCredits"), getValue: (p) => { const v = PLAN_FEATURES[p].aiLimit; return v === -1 ? unlimited : v.toLocaleString(); } },
    { label: t("featureGate.rowTemplates"), getValue: (p) => { const v = PLAN_FEATURES[p].templates; return v === -1 ? unlimited : String(v); } },
    { label: t("featureGate.rowWebsites"), getValue: (p) => { const v = PLAN_FEATURES[p].websites; return v === -1 ? unlimited : String(v); } },
    { label: t("featureGate.rowCmsIntegrations"), getValue: (p) => PLAN_FEATURES[p].wordpress },
    { label: t("featureGate.rowWebsiteDiscovery"), getValue: (p) => PLAN_FEATURES[p].discovery },
    { label: t("featureGate.rowGoogleIndexing"), getValue: (p) => PLAN_FEATURES[p].indexing },
    { label: t("featureGate.rowInternalLinks"), getValue: (p) => PLAN_FEATURES[p].internalLinks },
    { label: t("featureGate.rowApiAccess"), getValue: (p) => PLAN_FEATURES[p].apiAccess },
    { label: t("featureGate.rowTeamCollab"), getValue: (p) => PLAN_FEATURES[p].teamCollaboration },
  ];

  const getPrice = (plan: PlanName) => {
    const monthly = PLAN_PRICES_MONTHLY[plan];
    if (monthly === 0) return "$0";
    if (isYearly) return `$${Math.round(monthly * (1 - YEARLY_DISCOUNT))}`;
    return `$${monthly}`;
  };

  const fmt = (v: number) => (v === -1 ? "∞" : v.toLocaleString());
  const sitesRem = sitesRemaining === Infinity ? -1 : sitesRemaining;
  const usageStats = [
    { label: t("featureGate.pagesPerMonth"), used: pagesUsed, limit: pagesLimit, remaining: pagesRemaining },
    { label: t("featureGate.aiCredits"), used: aiUsed, limit: aiLimit, remaining: aiRemaining },
    { label: t("featureGate.templates"), used: null as number | null, limit: currentFeatures.templates, remaining: null as number | null },
    { label: t("featureGate.websites"), used: sitesConnected, limit: sitesLimit, remaining: sitesRem },
  ];

  const savePct = Math.round(YEARLY_DISCOUNT * 100);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 py-8">
      {/* Prominent upgrade CTA banner */}
      <div className="w-full max-w-3xl mb-6 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 px-5 py-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-3 flex-1 text-left">
            <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {t("featureGate.upgradeTo", { plan: planLabel, feature: featureName })}
              </p>
              <p className="text-xs text-muted-foreground">
                {t(isYearly ? "featureGate.priceYearly" : "featureGate.priceMonthly", { price: getPrice(minPlan) })}
                {isYearly && PLAN_PRICES_MONTHLY[minPlan] > 0 && (
                  <span className="ml-1 font-semibold text-primary">{t("featureGate.save", { percent: savePct })}</span>
                )}
              </p>
            </div>
          </div>
          <Button onClick={() => navigate(`${basePath}/billing`)} className="gap-2 shrink-0 w-full sm:w-auto">
            {t("featureGate.upgradeCta", { plan: planLabel })}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        {/* Inline billing toggle */}
        <div className="mt-3 pt-3 border-t border-primary/20 flex items-center justify-center gap-3">
          <span className={`text-xs font-medium ${!isYearly ? "text-foreground" : "text-muted-foreground"}`}>{t("featureGate.monthly")}</span>
          <button
            type="button"
            onClick={() => setIsYearly(!isYearly)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              isYearly ? "bg-primary" : "bg-muted-foreground/30"
            }`}
            aria-label={t("featureGate.toggleYearly")}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-background transition-transform ${
                isYearly ? "translate-x-5" : "translate-x-1"
              }`}
            />
          </button>
          <span className={`text-xs font-medium ${isYearly ? "text-foreground" : "text-muted-foreground"}`}>
            {t("featureGate.yearly")}
          </span>
          <span className="text-[10px] font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5">
            {t("featureGate.save", { percent: savePct })}
          </span>
        </div>
      </div>

      {/* Current plan limits summary */}
      <div className="w-full max-w-3xl mb-6 rounded-xl border border-border bg-card px-5 py-4 text-left">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-foreground">
            {t("featureGate.currentPlan", { plan: currentPlanLabel })}
          </p>
          <span className="text-xs text-muted-foreground">{t("featureGate.usageThisPeriod")}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {usageStats.map((s) => {
            const pct = s.used !== null && s.limit > 0 ? Math.min(100, Math.round((s.used / s.limit) * 100)) : 0;
            const isUnlimited = s.limit === -1;
            return (
              <div key={s.label} className="rounded-lg border border-border bg-background px-3 py-2">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">
                  {s.used !== null ? `${s.used.toLocaleString()} / ${fmt(s.limit)}` : fmt(s.limit)}
                </p>
                {s.used !== null && !isUnlimited && (
                  <div className="mt-1.5 h-1 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full ${pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-warning" : "bg-primary"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-full bg-muted p-6 mb-6">
        <Lock className="h-10 w-10 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-1">
        {featureName}
      </h2>
      <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 rounded-full px-3 py-1 mb-4">
        {t("featureGate.planSuffix", { plan: planLabel })}
      </span>
      <p className="text-muted-foreground max-w-md mb-6">
        {featureDesc}
      </p>

      {/* Billing Toggle */}
      <div className="flex items-center gap-3 mb-6">
        <span className={`text-sm font-medium ${!isYearly ? "text-foreground" : "text-muted-foreground"}`}>{t("featureGate.monthly")}</span>
        <button
          onClick={() => setIsYearly(!isYearly)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isYearly ? "bg-primary" : "bg-muted-foreground/30"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-background transition-transform ${
              isYearly ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        <span className={`text-sm font-medium ${isYearly ? "text-foreground" : "text-muted-foreground"}`}>
          {t("featureGate.yearly")}
        </span>
        {isYearly && (
          <span className="text-xs font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5">
            {t("featureGate.save", { percent: savePct })}
          </span>
        )}
      </div>

      {/* Plan Comparison Table */}
      <div className="w-full max-w-3xl overflow-x-auto mb-8 rounded-lg border border-border">
        <table className="text-sm border-collapse" style={{ minWidth: 560 }}>
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="sticky left-0 z-20 bg-muted/50 text-left font-medium text-muted-foreground px-4 py-3 min-w-[120px] border-r border-border">
                {t("featureGate.feature")}
              </th>
              {PLANS.map((plan) => {
                const isRec = plan === minPlan;
                const isCurrent = plan === currentPlan;
                return (
                  <th
                    key={plan}
                    className={`px-3 py-3 font-semibold text-center min-w-[90px] ${
                      isRec
                        ? "sticky left-[120px] z-10 text-primary bg-primary/5 border-x-2 border-primary/20"
                        : isCurrent
                        ? "text-foreground bg-muted/70 border-x border-border"
                        : "text-foreground"
                    }`}
                  >
                    {PLAN_FEATURES[plan].label}
                    <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                      {getPrice(plan)}/mo
                    </span>
                    {isCurrent && (
                      <span className="block text-[10px] font-medium text-foreground/70 mt-0.5">
                        {t("featureGate.current")}
                      </span>
                    )}
                    {isRec && !isCurrent && (
                      <span className="block text-[10px] font-medium text-primary mt-0.5">
                        {t("featureGate.recommended")}
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {COMPARISON_ROWS.map((row, i) => (
              <tr
                key={row.label}
                className={i % 2 === 0 ? "bg-background" : "bg-muted/30"}
              >
                <td className={`sticky left-0 z-20 text-left text-muted-foreground px-4 py-2.5 font-medium min-w-[120px] border-r border-border ${i % 2 === 0 ? "bg-background" : "bg-muted/30"}`}>
                  {row.label}
                </td>
                {PLANS.map((plan) => {
                  const value = row.getValue(plan);
                  const isRec = plan === minPlan;
                  return (
                    <td
                      key={plan}
                      className={`text-center px-3 py-2.5 ${
                        isRec
                          ? `sticky left-[120px] z-10 border-x-2 border-primary/20 ${i % 2 === 0 ? "bg-primary/5" : "bg-primary/10"}`
                          : ""
                      }`}
                    >
                      {typeof value === "boolean" ? (
                        value ? (
                          <Check className="h-4 w-4 text-primary mx-auto" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                        )
                      ) : (
                        <span className="text-foreground font-medium">{value}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button onClick={() => navigate(`${basePath}/billing`)} size="lg" className="gap-2">
        {t("featureGate.upgradeCta", { plan: planLabel })}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
