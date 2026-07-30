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
    campaigns: -1,
  },
};

export type FeatureKey = keyof Omit<PlanFeatures, "label" | "pagesLimit" | "aiLimit" | "templates" | "websites" | "campaigns">;

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

// ── SEO / SEA / GEO optimization entitlements ────────────────────────────────
// Mirrored server-side in supabase/functions/_shared/plan-entitlements.ts.

export type OptimizationMode = "seo" | "sea" | "geo";
/** none = unavailable, score = read-only scoring, autofix = AI rewrite, bulk = autofix + batch */
export type OptimizationLevel = "none" | "score" | "autofix" | "bulk";

export const OPTIMIZATION_ENTITLEMENTS: Record<PlanName, Record<OptimizationMode, OptimizationLevel>> = {
  free: { seo: "score", sea: "none", geo: "none" },
  starter: { seo: "autofix", sea: "score", geo: "none" },
  pro: { seo: "autofix", sea: "autofix", geo: "autofix" },
  agency: { seo: "bulk", sea: "bulk", geo: "bulk" },
};

/** Credits burned per optimization pass, per mode. */
export const OPTIMIZATION_CREDIT_COST: Record<OptimizationMode, number> = {
  seo: 2,
  sea: 3,
  geo: 4,
};

export const OPTIMIZATION_LABELS: Record<OptimizationMode, string> = {
  seo: "SEO — search engine optimization",
  sea: "SEA — ad / landing page readiness",
  geo: "GEO — AI / generative engine visibility",
};

export function optimizationLevel(plan: PlanName, mode: OptimizationMode): OptimizationLevel {
  return OPTIMIZATION_ENTITLEMENTS[plan][mode];
}

export function canAutoFix(plan: PlanName, mode: OptimizationMode): boolean {
  const lvl = optimizationLevel(plan, mode);
  return lvl === "autofix" || lvl === "bulk";
}

export function canBulkOptimize(plan: PlanName): boolean {
  return OPTIMIZATION_ENTITLEMENTS[plan].seo === "bulk";
}

/** Total credit cost of an optimization run for the given modes (minimum 1). */
export function optimizationCreditCost(modes: OptimizationMode[]): number {
  const unique = Array.from(new Set(modes.length ? modes : (["seo"] as OptimizationMode[])));
  return Math.max(1, unique.reduce((sum, m) => sum + (OPTIMIZATION_CREDIT_COST[m] ?? 2), 0));
}

/** Minimum plan that can auto-fix the given mode. */
export function getMinimumPlanForMode(mode: OptimizationMode): PlanName {
  const order: PlanName[] = ["free", "starter", "pro", "agency"];
  for (const plan of order) if (canAutoFix(plan, mode)) return plan;
  return "agency";
}
