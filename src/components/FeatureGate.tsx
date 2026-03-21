import { useState } from "react";
import { useSubscription } from "@/hooks/use-subscription";
import { getMinimumPlanFor, PLAN_FEATURES, FEATURE_LABELS, type FeatureKey, type PlanName } from "@/lib/plan-features";
import { Lock, ArrowRight, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const FEATURE_DESCRIPTIONS: Record<FeatureKey, string> = {
  wordpress: "Connect your WordPress site to automatically publish generated pages and keep your content in sync.",
  shopify: "Integrate with Shopify to create and manage product pages, collections, and SEO-optimized store content.",
  prestashop: "Connect PrestaShop to generate and publish product descriptions, category pages, and more.",
  woocommerce: "Seamlessly push generated content to your WooCommerce store including products and landing pages.",
  indexing: "Submit your pages directly to Google for faster indexing and monitor their crawl status in real time.",
  discovery: "Analyze any website to discover its structure, pages, templates, and SEO opportunities.",
  internalLinks: "Automatically build internal links between your generated pages to boost SEO and user navigation.",
  apiAccess: "Access the full API to integrate page generation into your own workflows and tools.",
  teamCollaboration: "Invite team members to your workspace with role-based permissions and shared resources.",
};

const COMPARISON_ROWS: { label: string; getValue: (plan: PlanName) => string | boolean }[] = [
  { label: "Pages", getValue: (p) => { const v = PLAN_FEATURES[p].pagesLimit; return v === -1 ? "Unlimited" : v.toLocaleString(); } },
  { label: "AI Credits", getValue: (p) => { const v = PLAN_FEATURES[p].aiLimit; return v === -1 ? "Unlimited" : v.toLocaleString(); } },
  { label: "Templates", getValue: (p) => { const v = PLAN_FEATURES[p].templates; return v === -1 ? "Unlimited" : String(v); } },
  { label: "Websites", getValue: (p) => { const v = PLAN_FEATURES[p].websites; return v === -1 ? "Unlimited" : String(v); } },
  { label: "CMS Integrations", getValue: (p) => PLAN_FEATURES[p].wordpress },
  { label: "Website Discovery", getValue: (p) => PLAN_FEATURES[p].discovery },
  { label: "Google Indexing", getValue: (p) => PLAN_FEATURES[p].indexing },
  { label: "Internal Links", getValue: (p) => PLAN_FEATURES[p].internalLinks },
  { label: "API Access", getValue: (p) => PLAN_FEATURES[p].apiAccess },
  { label: "Team Collaboration", getValue: (p) => PLAN_FEATURES[p].teamCollaboration },
];

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
  const { canUseFeature } = useSubscription();
  const navigate = useNavigate();
  const [isYearly, setIsYearly] = useState(false);

  if (canUseFeature(feature)) {
    return <>{children}</>;
  }

  const minPlan = getMinimumPlanFor(feature);
  const planLabel = PLAN_FEATURES[minPlan].label;
  const featureName = FEATURE_LABELS[feature];
  const featureDesc = FEATURE_DESCRIPTIONS[feature];

  const getPrice = (plan: PlanName) => {
    const monthly = PLAN_PRICES_MONTHLY[plan];
    if (monthly === 0) return "$0";
    if (isYearly) return `$${Math.round(monthly * (1 - YEARLY_DISCOUNT))}`;
    return `$${monthly}`;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 py-8">
      <div className="rounded-full bg-muted p-6 mb-6">
        <Lock className="h-10 w-10 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-1">
        {featureName}
      </h2>
      <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 rounded-full px-3 py-1 mb-4">
        {planLabel} Plan
      </span>
      <p className="text-muted-foreground max-w-md mb-6">
        {featureDesc}
      </p>

      {/* Billing Toggle */}
      <div className="flex items-center gap-3 mb-6">
        <span className={`text-sm font-medium ${!isYearly ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
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
          Yearly
        </span>
        {isYearly && (
          <span className="text-xs font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5">
            Save 20%
          </span>
        )}
      </div>

      {/* Plan Comparison Table */}
      <div className="w-full max-w-3xl overflow-x-auto mb-8 rounded-lg border border-border">
        <table className="text-sm border-collapse" style={{ minWidth: 560 }}>
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="sticky left-0 z-20 bg-muted/50 text-left font-medium text-muted-foreground px-4 py-3 min-w-[120px] border-r border-border">
                Feature
              </th>
              {PLANS.map((plan) => {
                const isRec = plan === minPlan;
                return (
                  <th
                    key={plan}
                    className={`px-3 py-3 font-semibold text-center min-w-[90px] ${
                      isRec
                        ? "sticky left-[120px] z-10 text-primary bg-primary/5 border-x-2 border-primary/20"
                        : "text-foreground"
                    }`}
                  >
                    {PLAN_FEATURES[plan].label}
                    <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                      {getPrice(plan)}/mo
                    </span>
                    {isRec && (
                      <span className="block text-[10px] font-medium text-primary mt-0.5">
                        Recommended
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

      <Button onClick={() => navigate("/billing")} size="lg" className="gap-2">
        Upgrade to {planLabel}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
