import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Sparkles, Zap, Crown, Gift, Loader2, ArrowRight } from "lucide-react";
import { PLAN_FEATURES, type PlanName } from "@/lib/plan-features";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";

interface PricingComparisonTableProps {
  activePlan: PlanName;
  currentPlan: PlanName;
  isYearly: boolean;
  loadingPlan: PlanName | null;
  onPlanClick: (name: PlanName) => void;
  onToggleYearly: () => void;
  trialEligible: boolean;
}

const YEARLY_DISCOUNT = 2 / 12;

const planMeta: {
  name: PlanName;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
  descriptionKey: string;
}[] = [
  {
    name: "free",
    icon: <Gift className="h-4 w-4" />,
    colorClass: "text-muted-foreground",
    bgClass: "bg-muted",
    descriptionKey: "billing.planDescFree",
  },
  {
    name: "starter",
    icon: <Zap className="h-4 w-4" />,
    colorClass: "text-secondary",
    bgClass: "bg-secondary/10",
    descriptionKey: "billing.planDescStarter",
  },
  {
    name: "pro",
    icon: <Sparkles className="h-4 w-4" />,
    colorClass: "text-primary",
    bgClass: "bg-primary/10",
    descriptionKey: "billing.planDescPro",
  },
  {
    name: "agency",
    icon: <Crown className="h-4 w-4" />,
    colorClass: "text-warning",
    bgClass: "bg-warning/10",
    descriptionKey: "billing.planDescAgency",
  },
];

const monthlyPrices: Record<PlanName, number> = {
  free: 0,
  starter: 19,
  pro: 59,
  agency: 149,
};

interface FeatureRow {
  labelKey: string;
  key: keyof typeof PLAN_FEATURES.free | "support" | "trial";
  type: "number" | "boolean" | "text";
}

const featureRows: FeatureRow[] = [
  { labelKey: "billing.featurePagesMonth", key: "pagesLimit", type: "number" },
  { labelKey: "billing.featureAiCreditsMonth", key: "aiLimit", type: "number" },
  { labelKey: "billing.featureTemplates", key: "templates", type: "number" },
  { labelKey: "billing.featureWebsites", key: "websites", type: "number" },
  { labelKey: "billing.featureCampaigns", key: "campaigns", type: "number" },
  { labelKey: "billing.featureWordPress", key: "wordpress", type: "boolean" },
  { labelKey: "billing.featureShopify", key: "shopify", type: "boolean" },
  { labelKey: "billing.featureWooCommerce", key: "woocommerce", type: "boolean" },
  { labelKey: "billing.featurePrestaShop", key: "prestashop", type: "boolean" },
  { labelKey: "billing.featureGoogleIndexing", key: "indexing", type: "boolean" },
  { labelKey: "billing.featureWebsiteDiscovery", key: "discovery", type: "boolean" },
  { labelKey: "billing.featureInternalLinks", key: "internalLinks", type: "boolean" },
  { labelKey: "billing.featureApiAccess", key: "apiAccess", type: "boolean" },
  { labelKey: "billing.featureTeamCollaboration", key: "teamCollaboration", type: "boolean" },
  { labelKey: "billing.support", key: "support", type: "text" },
];

function formatNumber(val: number, t: (key: string, vars?: Record<string, string | number>) => string): string {
  if (val === -1) return t("common.unlimited");
  return val.toLocaleString();
}

function getSupportLabel(name: PlanName, t: (key: string, vars?: Record<string, string | number>) => string): string {
  if (name === "free") return t("billing.email");
  if (name === "starter") return t("billing.email");
  if (name === "pro") return t("billing.priority");
  return t("billing.dedicated");
}

export function PricingComparisonTable({
  activePlan,
  currentPlan,
  isYearly,
  loadingPlan,
  onPlanClick,
  onToggleYearly,
  trialEligible,
}: PricingComparisonTableProps) {
  const { t } = useLanguage();
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const planOrder: PlanName[] = ["free", "starter", "pro", "agency"];
  const currentIdx = planOrder.indexOf(currentPlan);

  const getButtonState = (name: PlanName) => {
    const idx = planOrder.indexOf(name);
    if (idx === currentIdx) return { label: t("billing.currentPlanBtn"), disabled: true, variant: "outline" as const };
    if (idx > currentIdx) return { label: t("billing.upgrade"), disabled: false, variant: "default" as const };
    return { label: t("billing.downgrade"), disabled: false, variant: "outline" as const };
  };

  const renderCell = (row: FeatureRow, plan: PlanName) => {
    if (row.key === "support") {
      return <span className="text-sm font-medium text-foreground/90">{getSupportLabel(plan, t)}</span>;
    }

    const val = (PLAN_FEATURES[plan] as any)[row.key];

    if (row.type === "boolean") {
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

    return <span className="text-sm font-semibold tabular-nums text-foreground/90">{formatNumber(val, t)}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3">
        <span className={cn("text-sm font-medium transition-colors", !isYearly ? "text-foreground" : "text-muted-foreground")}>
          {t("billing.monthly")}
        </span>
        <button
          onClick={onToggleYearly}
          className={cn(
            "relative h-7 w-[52px] rounded-full transition-colors duration-300",
            isYearly ? "bg-primary" : "bg-muted"
          )}
          aria-label={t("billing.yearly")}
        >
          <div
            className={cn(
              "absolute top-0.5 h-6 w-6 rounded-full bg-card shadow-md transition-transform duration-300",
              isYearly ? "translate-x-[26px]" : "translate-x-0.5"
            )}
          />
        </button>
        <span className={cn("text-sm font-medium transition-colors", isYearly ? "text-foreground" : "text-muted-foreground")}>
          {t("billing.yearly")}
        </span>
        {isYearly && (
          <Badge className="bg-success/10 text-success border-success/20 text-[10px] font-bold animate-fade-in">
            {t("billing.save20")}
          </Badge>
        )}
      </div>

      {/* Comparison table */}
      <div className="rounded-2xl border border-border bg-card shadow-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-5 w-[260px] align-bottom">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("billing.comparePlans")}</p>
                    <p className="text-sm text-muted-foreground">{t("billing.compareDesc")}</p>
                  </div>
                </th>
                {planMeta.map((meta) => {
                  const plan = meta.name;
                  const features = PLAN_FEATURES[plan];
                  const basePrice = monthlyPrices[plan];
                  const price = isYearly && plan !== "free" ? Math.round(basePrice * (1 - YEARLY_DISCOUNT)) : basePrice;
                  const isCurrent = plan === currentPlan;
                  const isPopular = plan === "pro";
                  const btn = getButtonState(plan);
                  const isLoading = loadingPlan === plan;

                  return (
                    <th key={plan} className="p-0 w-[180px] align-top">
                      <div
                        className={cn(
                          "relative flex flex-col items-center text-center p-5 h-full min-h-[220px] transition-colors",
                          isCurrent && "bg-primary/[0.03]",
                          isPopular && !isCurrent && "bg-gradient-to-b from-primary/[0.04] to-transparent"
                        )}
                      >
                        {isPopular && (
                          <Badge className="absolute top-0 left-1/2 -translate-x-1/2 rounded-t-none rounded-b-md bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-1">
                            {t("billing.mostPopular")}
                          </Badge>
                        )}
                        {isCurrent && (
                          <Badge variant="outline" className="absolute top-3 right-3 text-[10px] text-primary border-primary/30 bg-primary/5 px-2 py-0.5">
                            {t("billing.current")}
                          </Badge>
                        )}

                        <div
                          className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center mb-3",
                            meta.bgClass,
                            meta.colorClass
                          )}
                        >
                          {meta.icon}
                        </div>

                        <h3 className="text-base font-bold text-foreground">{features.label}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{t(meta.descriptionKey)}</p>

                        <div className="mt-4 flex items-baseline gap-1">
                          <span className="text-3xl font-extrabold tabular-nums tracking-tight">
                            {price === 0 ? t("common.free") : `€${price}`}
                          </span>
                          {price > 0 && <span className="text-muted-foreground text-sm">/mo</span>}
                        </div>

                        {isYearly && plan !== "free" && (
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {t("billing.billedYearly", { amount: price * 12 })}
                          </p>
                        )}

                        {trialEligible && plan !== "free" && (
                          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-success/10 border border-success/20 px-2.5 py-1 text-[11px] font-semibold text-success">
                            <Gift className="h-3 w-3" />
                            {t("billing.trialBadge")}
                          </div>
                        )}

                        <div className="mt-auto pt-4 w-full">
                          <Button
                            className={cn(
                              "w-full rounded-lg h-10 text-sm font-semibold transition-all duration-200 active:scale-[0.98]",
                              isPopular && !btn.disabled
                                ? "bg-gradient-to-r from-primary to-primary-glow hover:brightness-110 shadow-lg shadow-primary/20 text-primary-foreground"
                                : ""
                            )}
                            variant={btn.variant}
                            disabled={btn.disabled || isLoading}
                            onClick={() => !btn.disabled && onPlanClick(plan)}
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
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {featureRows.map((row, i) => (
                <tr
                  key={row.key}
                  className={cn(
                    "border-b border-border/50 transition-colors",
                    i % 2 === 1 && "bg-muted/20",
                    hoveredRow === row.key && "bg-muted/40"
                  )}
                  onMouseEnter={() => setHoveredRow(row.key)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <td className="py-3.5 px-5">
                    <span className="text-sm font-medium text-foreground">{t(row.labelKey)}</span>
                  </td>
                  {planMeta.map((meta) => {
                    const plan = meta.name;
                    const isCurrent = plan === currentPlan;
                    return (
                      <td
                        key={plan}
                        className={cn(
                          "py-3.5 px-5 text-center transition-colors",
                          isCurrent && "bg-primary/[0.02]"
                        )}
                      >
                        {row.key === "prestashop" ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          renderCell(row, plan)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
