import type { PlanName } from "./plan-features";

export interface StripeTier {
  price_id: string;
  product_id: string;
}

export const STRIPE_TIERS: Partial<Record<PlanName, StripeTier>> = {
  starter: {
    price_id: "price_1TC0wb2eZvKYlo2CIxVw0sMl",
    product_id: "prod_UALduTYX0c1iq6",
  },
  pro: {
    price_id: "price_1TC2Bg2eZvKYlo2CUbk9bLNI",
    product_id: "prod_UAMvLB3qPitarV",
  },
  agency: {
    price_id: "price_1TC2Ew2eZvKYlo2CL9fDO7kX",
    product_id: "prod_UAMyFLJgpAa7L7",
  },
};

export function getPlanFromProductId(productId: string | null): PlanName {
  if (!productId) return "free";
  for (const [plan, tier] of Object.entries(STRIPE_TIERS)) {
    if (tier.product_id === productId) return plan as PlanName;
  }
  return "free";
}
