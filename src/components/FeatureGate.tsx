import { useSubscription } from "@/hooks/use-subscription";
import { getMinimumPlanFor, PLAN_FEATURES, FEATURE_LABELS, type FeatureKey } from "@/lib/plan-features";
import { Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const FEATURE_DESCRIPTIONS: Record<FeatureKey, string> = {
  wordpress: "Connect your WordPress site to automatically publish generated pages and keep your content in sync.",
  shopify: "Integrate with Shopify to create and manage product pages, collections, and SEO-optimized store content.",
  prestashop: "Connect PrestaShop to generate and publish product descriptions, category pages, and more.",
  woocommerce: "Seamlessly push generated content to your WooCommerce store including products and landing pages.",
  socialShare: "Generate social media captions and share your pages directly to Facebook, Twitter, LinkedIn, and more.",
  storeGenerator: "Use AI to generate a complete e-commerce store with products, descriptions, images, and SEO content.",
  indexing: "Submit your pages directly to Google for faster indexing and monitor their crawl status in real time.",
  discovery: "Analyze any website to discover its structure, pages, templates, and SEO opportunities.",
  internalLinks: "Automatically build internal links between your generated pages to boost SEO and user navigation.",
  apiAccess: "Access the full API to integrate page generation into your own workflows and tools.",
  teamCollaboration: "Invite team members to your workspace with role-based permissions and shared resources.",
};

interface FeatureGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
}

export function FeatureGate({ feature, children }: FeatureGateProps) {
  const { canUseFeature } = useSubscription();
  const navigate = useNavigate();

  if (canUseFeature(feature)) {
    return <>{children}</>;
  }

  const minPlan = getMinimumPlanFor(feature);
  const planLabel = PLAN_FEATURES[minPlan].label;
  const featureName = FEATURE_LABELS[feature];
  const featureDesc = FEATURE_DESCRIPTIONS[feature];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
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
      <Button onClick={() => navigate("/billing")} size="lg" className="gap-2">
        Upgrade to {planLabel}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
