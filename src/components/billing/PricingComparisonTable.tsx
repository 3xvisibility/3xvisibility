import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  X,
  Sparkles,
  Zap,
  Crown,
  Gift,
  Loader2,
  ArrowRight,
  Rocket,
  LayoutTemplate,
  Search,
  Globe,
  Users,
} from "lucide-react";
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

const PLAN_ORDER: PlanName[] = ["free", "starter", "pro", "agency"];

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

type CellValue = boolean | number | string;

interface FeatureRow {
  /** Stable id used for hover state. */
  id: string;
  /** Existing i18n key, when one exists. */
  labelKey?: string;
  /** Plain label used when no i18n key exists (auto-translated at runtime). */
  label?: string;
  /** Numeric plan-features key, or explicit per-plan values. */
  featureKey?: keyof (typeof PLAN_FEATURES)["free"];
  values?: Record<PlanName, CellValue>;
  /** Extra note rendered under a truthy check, per plan. */
  notes?: Partial<Record<PlanName, string>>;
}

interface FeatureGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  rows: FeatureRow[];
}

/** `t` helper shorthand */
type T = (key: string, vars?: Record<string, string | number>) => string;

const tier = (free: CellValue, starter: CellValue, pro: CellValue, agency: CellValue): Record<PlanName, CellValue> => ({
  free,
  starter,
  pro,
  agency,
});

const featureGroups: FeatureGroup[] = [
  {
    id: "generation",
    label: "Generation engine",
    icon: <Rocket className="h-3.5 w-3.5" />,
    rows: [
      { id: "pages", labelKey: "billing.featurePagesMonth", featureKey: "pagesLimit" },
      { id: "ai", labelKey: "billing.featureAiCreditsMonth", featureKey: "aiLimit" },
      { id: "campaigns", labelKey: "billing.featureCampaigns", featureKey: "campaigns" },
      { id: "keywordGroups", label: "Keyword groups", values: tier(1, 10, -1, -1) },
      { id: "pairing", label: "Zip & Cross pairing modes", values: tier(true, true, true, true) },
      { id: "csv", label: "Bulk CSV import", values: tier(true, true, true, true) },
      { id: "locations", label: "Location database (country / region / city)", values: tier(true, true, true, true) },
      {
        id: "languages",
        label: "Multi-language generation",
        values: tier(true, true, true, true),
        notes: { free: "4 languages", starter: "8 languages", pro: "26 languages", agency: "26 languages" },
      },
      { id: "spintax", label: "Spintax & block spinning", values: tier(false, true, true, true) },
      { id: "diversity", label: "Content diversity repair", values: tier(false, true, true, true) },
    ],
  },
  {
    id: "templates",
    label: "Templates & design",
    icon: <LayoutTemplate className="h-3.5 w-3.5" />,
    rows: [
      { id: "templates", labelKey: "billing.featureTemplates", featureKey: "templates" },
      { id: "marketplace", label: "Marketplace templates", values: tier(true, true, true, true) },
      { id: "importUrl", label: "Import template from any URL", values: tier(false, true, true, true) },
      { id: "aiBuilder", label: "AI Site Builder", values: tier(false, false, true, true) },
      { id: "aiVariables", label: "AI variable injection", values: tier(false, true, true, true) },
      { id: "versions", label: "Template version history", values: tier(false, false, true, true) },
      { id: "whitelabel", label: "Whitelabel branding", values: tier(false, false, false, true) },
    ],
  },
  {
    id: "seo",
    label: "SEO & content",
    icon: <Search className="h-3.5 w-3.5" />,
    rows: [
      { id: "audit", label: "SEO audit suite", values: tier(true, true, true, true) },
      { id: "quality", label: "Content quality scoring", values: tier(true, true, true, true) },
      { id: "autofix", label: "Auto-fix SEO score (80+ target)", values: tier(false, true, true, true) },
      { id: "section", label: "Section-scoped rewriting", values: tier(false, false, true, true) },
      { id: "duplicate", label: "Duplicate content detection", values: tier(false, true, true, true) },
      { id: "internalLinks", labelKey: "billing.featureInternalLinks", featureKey: "internalLinks" },
      { id: "discovery", labelKey: "billing.featureWebsiteDiscovery", featureKey: "discovery" },
      { id: "indexing", labelKey: "billing.featureGoogleIndexing", featureKey: "indexing" },
    ],
  },
  {
    id: "publishing",
    label: "Publishing & integrations",
    icon: <Globe className="h-3.5 w-3.5" />,
    rows: [
      { id: "websites", labelKey: "billing.featureWebsites", featureKey: "websites" },
      { id: "html", label: "HTML / CSS direct publishing", values: tier(true, true, true, true) },
      { id: "wordpress", labelKey: "billing.featureWordPress", featureKey: "wordpress" },
      { id: "woocommerce", labelKey: "billing.featureWooCommerce", featureKey: "woocommerce" },
      { id: "shopify", labelKey: "billing.featureShopify", featureKey: "shopify" },
      { id: "prestashop", labelKey: "billing.featurePrestaShop", featureKey: "prestashop" },
      { id: "calendar", label: "Content calendar & scheduling", values: tier(false, false, true, true) },
      { id: "webhooks", label: "Automation webhooks", values: tier(false, false, true, true) },
    ],
  },
  {
    id: "team",
    label: "Team, API & support",
    icon: <Users className="h-3.5 w-3.5" />,
    rows: [
      { id: "workspaces", label: "Workspaces", values: tier(1, 2, 5, -1) },
      { id: "seats", label: "Team seats", values: tier(1, 1, 3, -1) },
      { id: "collab", labelKey: "billing.featureTeamCollaboration", featureKey: "teamCollaboration" },
      { id: "api", labelKey: "billing.featureApiAccess", featureKey: "apiAccess" },
      { id: "audit", label: "Audit log", values: tier(false, false, true, true) },
      {
        id: "support",
        labelKey: "billing.support",
        values: tier("__email__", "__email__", "__priority__", "__dedicated__"),
      },
    ],
  },
];

function formatNumber(val: number, t: T): string {
  if (val === -1) return t("common.unlimited");
  return val.toLocaleString();
}

function resolveText(val: string, t: T): string {
  if (val === "__email__") return t("billing.email");
  if (val === "__priority__") return t("billing.priority");
  if (val === "__dedicated__") return t("billing.dedicated");
  return val;
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

  const currentIdx = PLAN_ORDER.indexOf(currentPlan);

  const getButtonState = (name: PlanName) => {
    const idx = PLAN_ORDER.indexOf(name);
    if (idx === currentIdx) return { label: t("billing.currentPlanBtn"), disabled: true, variant: "outline" as const };
    if (idx > currentIdx) return { label: t("billing.upgrade"), disabled: false, variant: "default" as const };
    return { label: t("billing.downgrade"), disabled: false, variant: "outline" as const };
  };

  const cellValue = (row: FeatureRow, plan: PlanName): CellValue => {
    if (row.values) return row.values[plan];
    if (row.featureKey) return (PLAN_FEATURES[plan] as Record<string, CellValue>)[row.featureKey];
    return false;
  };

  const renderCell = (row: FeatureRow, plan: PlanName) => {
    const val = cellValue(row, plan);
    const note = row.notes?.[plan];

    if (typeof val === "number") {
      return <span className="text-sm font-semibold tabular-nums text-foreground/90">{formatNumber(val, t)}</span>;
    }

    if (typeof val === "string") {
      return <span className="text-sm font-medium text-foreground/90">{resolveText(val, t)}</span>;
    }

    if (!val) {
      return (
        <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted">
          <X className="h-3.5 w-3.5 text-muted-foreground/40" />
        </div>
      );
    }

    return (
      <div className="inline-flex items-center justify-center gap-1.5">
        <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-success/10">
          <Check className="h-3.5 w-3.5 text-success" />
        </div>
        {note && <span className="text-xs text-muted-foreground whitespace-nowrap">{note}</span>}
      </div>
    );
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
          <table className="w-full min-w-[900px] border-collapse">
            <thead className="sticky top-0 z-20 bg-card">
              <tr className="border-b border-border">
                <th className="text-left p-5 w-[300px] align-bottom bg-card">
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

            {featureGroups.map((group) => (
              <tbody key={group.id}>
                <tr>
                  <td colSpan={5} className="p-0">
                    <div className="flex items-center gap-2 bg-muted/50 border-y border-border px-5 py-2.5">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-background text-primary shadow-sm">
                        {group.icon}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground">{group.label}</span>
                    </div>
                  </td>
                </tr>
                {group.rows.map((row, i) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-border/50 transition-colors",
                      i % 2 === 1 && "bg-muted/20",
                      hoveredRow === row.id && "bg-muted/40"
                    )}
                    onMouseEnter={() => setHoveredRow(row.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <td className="py-3.5 px-5">
                      <span className="text-sm font-medium text-foreground">
                        {row.labelKey ? t(row.labelKey) : row.label}
                      </span>
                    </td>
                    {planMeta.map((meta) => (
                      <td
                        key={meta.name}
                        className={cn(
                          "py-3.5 px-5 text-center transition-colors",
                          meta.name === currentPlan && "bg-primary/[0.02]"
                        )}
                      >
                        {renderCell(row, meta.name)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </div>
    </div>
  );
}
