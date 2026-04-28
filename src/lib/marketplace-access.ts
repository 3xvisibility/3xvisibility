// Plan-based access control for marketplace templates inside the campaign wizard.
//
// Rules (per product spec):
//   • free / starter   → no marketplace templates
//   • pro              → first 2 of WordPress, Shopify and PrestaShop (= 6 total)
//   • agency           → all marketplace templates
//
// Each marketplace template carries a `category` like "wordpress" | "shopify" |
// "prestashop" | "ecommerce" | "saas" | … This helper filters the catalog
// according to the active plan.

import { COMMUNITY_TEMPLATES, type MarketplaceTemplate } from "@/lib/marketplace-templates";
import type { PlanName } from "@/lib/plan-features";

const PRO_PLATFORM_QUOTA: Record<string, number> = {
  wordpress: 2,
  shopify: 2,
  prestashop: 2,
};

export function getMarketplaceTemplatesForPlan(plan: PlanName): MarketplaceTemplate[] {
  if (plan === "free" || plan === "starter") return [];
  if (plan === "agency") return COMMUNITY_TEMPLATES;

  // pro — pick the first N templates per allowed platform, in catalog order
  const remaining: Record<string, number> = { ...PRO_PLATFORM_QUOTA };
  const out: MarketplaceTemplate[] = [];
  for (const tpl of COMMUNITY_TEMPLATES) {
    const cat = tpl.category;
    if (cat in remaining && remaining[cat] > 0) {
      out.push(tpl);
      remaining[cat] -= 1;
    }
  }
  return out;
}

export function groupByCategory(items: MarketplaceTemplate[]): Record<string, MarketplaceTemplate[]> {
  const groups: Record<string, MarketplaceTemplate[]> = {};
  for (const t of items) {
    (groups[t.category] ||= []).push(t);
  }
  return groups;
}

// Sentinel prefix used in <Select> values so we can tell user templates and
// marketplace templates apart. Marketplace items get imported into the
// workspace on selection, then the wizard switches to the new template id.
export const MARKETPLACE_VALUE_PREFIX = "mp::";
