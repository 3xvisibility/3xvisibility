import { supabase } from "@/integrations/supabase/client";
import { STRIPE_TIERS } from "@/lib/stripe-config";
import type { PlanName } from "@/lib/plan-features";

export const PENDING_CHECKOUT_KEY = "pendingCheckoutPlan";

export type CheckoutResult =
  | { status: "unauthenticated" }
  | { status: "unsupported" }
  | { status: "ok"; url: string; trial: boolean };

/** True when the plan can be bought (a Stripe price is configured for it). */
export async function isPlanPurchasable(plan: string): Promise<boolean> {
  const { data } = await supabase
    .from("plan_pricing")
    .select("stripe_price_id, active")
    .eq("plan", plan)
    .maybeSingle();
  if (data) return Boolean(data.active && data.stripe_price_id);
  return Boolean(STRIPE_TIERS[plan as PlanName]);
}

/**
 * Starts a Stripe subscription checkout for the given plan.
 * The Stripe price is resolved server-side from the admin-managed plan table,
 * so pricing edits in the admin panel take effect immediately.
 * Returns "unauthenticated" when there is no session so the caller can send the
 * visitor to /auth first (the plan is remembered and resumed after login).
 */
export async function startPlanCheckout(plan: PlanName, quantity = 1): Promise<CheckoutResult> {
  if (plan === "free") return { status: "unsupported" };

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    try {
      localStorage.setItem(PENDING_CHECKOUT_KEY, plan);
    } catch {
      /* storage unavailable — user just picks the plan again after login */
    }
    return { status: "unauthenticated" };
  }

  if (!(await isPlanPurchasable(plan))) return { status: "unsupported" };

  const { data, error } = await supabase.functions.invoke("create-checkout", {
    body: { plan, quantity, origin: window.location.origin },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error as string);
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
