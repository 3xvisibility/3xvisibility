import { supabase } from "@/integrations/supabase/client";
import { STRIPE_TIERS } from "@/lib/stripe-config";
import type { PlanName } from "@/lib/plan-features";

export const PENDING_CHECKOUT_KEY = "pendingCheckoutPlan";

export type CheckoutResult =
  | { status: "unauthenticated" }
  | { status: "unsupported" }
  | { status: "ok"; url: string; trial: boolean };

/**
 * Starts a Stripe subscription checkout for the given plan.
 * Returns "unauthenticated" when there is no session so the caller can send the
 * visitor to /auth first (the plan is remembered and resumed after login).
 */
export async function startPlanCheckout(plan: PlanName): Promise<CheckoutResult> {
  const tier = STRIPE_TIERS[plan];
  if (!tier) return { status: "unsupported" };

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    try {
      localStorage.setItem(PENDING_CHECKOUT_KEY, plan);
    } catch {
      /* storage unavailable — user just picks the plan again after login */
    }
    return { status: "unauthenticated" };
  }

  const { data, error } = await supabase.functions.invoke("create-checkout", {
    body: { priceId: tier.price_id, origin: window.location.origin },
  });
  if (error) throw error;
  if (!data?.url) throw new Error("Checkout session could not be created");

  try {
    localStorage.removeItem(PENDING_CHECKOUT_KEY);
  } catch {
    /* ignore */
  }

  return { status: "ok", url: data.url as string, trial: Boolean(data.trial) };
}

export function takePendingCheckoutPlan(): PlanName | null {
  try {
    const plan = localStorage.getItem(PENDING_CHECKOUT_KEY);
    if (!plan) return null;
    localStorage.removeItem(PENDING_CHECKOUT_KEY);
    return plan as PlanName;
  } catch {
    return null;
  }
}
