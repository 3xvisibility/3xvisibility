export type PlanName = "free" | "starter" | "pro" | "agency";

export interface PlanFeatures {
  label: string;
  pagesLimit: number;
  aiLimit: number;
  wordpress: boolean;
  shopify: boolean;
  prestashop: boolean;
  woocommerce: boolean;
  indexing: boolean;
  discovery: boolean;
  internalLinks: boolean;
  apiAccess: boolean;
  teamCollaboration: boolean;
  templates: number;
  websites: number;
  campaigns: number;
}

export const PLAN_FEATURES: Record<PlanName, PlanFeatures> = {
  free: {
    label: "Free",
    pagesLimit: 10,
    aiLimit: 10,
    wordpress: true,
    shopify: false,
    prestashop: false,
    woocommerce: false,
    indexing: false,
    discovery: false,
    internalLinks: false,
    apiAccess: false,
    teamCollaboration: false,
    templates: 1,
    websites: 1,
    campaigns: 1,
  },
  starter: {
    label: "Starter",
    pagesLimit: 300,
    aiLimit: 100,
    wordpress: true,
    shopify: false,
    prestashop: false,
    woocommerce: false,
    indexing: false,
    discovery: true,
    internalLinks: false,
    apiAccess: false,
    teamCollaboration: false,
    templates: 10,
    websites: 2,
    campaigns: 10,
  },
  pro: {
    label: "Pro",
    pagesLimit: 3000,
    aiLimit: 1000,
    wordpress: true,
    shopify: true,
    prestashop: true,
    woocommerce: true,
    indexing: true,
    discovery: true,
    internalLinks: true,
    apiAccess: true,
    teamCollaboration: false,
    templates: -1,
    websites: 10,
    campaigns: -1,
  },
  agency: {
    label: "Agency",
    pagesLimit: 15000,
    aiLimit: 5000,
    wordpress: true,
    shopify: true,
    prestashop: true,
    woocommerce: true,
    indexing: true,
    discovery: true,
    internalLinks: true,
    apiAccess: true,
    teamCollaboration: true,
    templates: -1,
    websites: -1,
  },
};

export type FeatureKey = keyof Omit<PlanFeatures, "label" | "pagesLimit" | "aiLimit" | "templates" | "websites">;

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  wordpress: "WordPress Integration",
  shopify: "Shopify Integration",
  prestashop: "PrestaShop Integration",
  woocommerce: "WooCommerce Integration",
  indexing: "Google Indexing",
  discovery: "Website Discovery",
  internalLinks: "Internal Link Building",
  apiAccess: "API Access",
  teamCollaboration: "Team Collaboration",
};

export function getMinimumPlanFor(feature: FeatureKey): PlanName {
  const order: PlanName[] = ["free", "starter", "pro", "agency"];
  for (const plan of order) {
    if (PLAN_FEATURES[plan][feature]) return plan;
  }
  return "agency";
}
