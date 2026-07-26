import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) =>
  console.log(`[CHANGE-PLAN] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

const PLAN_PRICE: Record<string, string> = {
  starter: "price_1TC0wb2eZvKYlo2CIxVw0sMl",
  pro: "price_1TC2Bg2eZvKYlo2CUbk9bLNI",
  agency: "price_1TC2Ew2eZvKYlo2CL9fDO7kX",
};

const PLAN_LIMITS: Record<string, { pages_limit: number; ai_generations_limit: number }> = {
  free: { pages_limit: 10, ai_generations_limit: 10 },
  starter: { pages_limit: 100, ai_generations_limit: 100 },
  pro: { pages_limit: 1000, ai_generations_limit: 1000 },
  agency: { pages_limit: 10000, ai_generations_limit: 5000 },
};

const PLAN_ORDER = ["free", "starter", "pro", "agency"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) throw new Error("Not authenticated");
    const { data: userData, error: userError } = await admin.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userError || !userData?.user?.email) throw new Error("Not authenticated");
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const targetPlan = String(body?.targetPlan ?? "");
    if (!PLAN_ORDER.includes(targetPlan)) {
      return new Response(JSON.stringify({ error: "Invalid target plan" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { data: current } = await admin
      .from("subscriptions")
      .select("plan, workspace_id, current_period_end")
      .eq("user_id", user.id)
      .maybeSingle();

    const currentPlan = current?.plan ?? "free";
    if (PLAN_ORDER.indexOf(targetPlan) >= PLAN_ORDER.indexOf(currentPlan)) {
      return new Response(
        JSON.stringify({ error: "This endpoint only handles downgrades. Use checkout to upgrade." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id ?? null;

    let effectiveAt: string | null = current?.current_period_end ?? null;
    let cancelAtPeriodEnd = false;
    let stripePriceId: string | null = null;
    let subscriptionId: string | null = null;

    if (customerId) {
      const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 10 });
      const active = subs.data.find((s) => ["active", "trialing", "past_due"].includes(s.status));

      if (active) {
        subscriptionId = active.id;
        const periodEnd = Number((active as any).current_period_end ?? 0);
        if (periodEnd > 0) effectiveAt = new Date(periodEnd * 1000).toISOString();

        if (targetPlan === "free") {
          // Nothing lower to bill: let the paid subscription lapse at period end.
          const updated = await stripe.subscriptions.update(active.id, { cancel_at_period_end: true });
          cancelAtPeriodEnd = true;
          stripePriceId = updated.items.data[0]?.price?.id ?? null;
          log("Scheduled cancellation", { subscriptionId: active.id, effectiveAt });
        } else {
          // Swap the price without prorating — the cheaper plan is billed from
          // the next invoice, while entitlements drop right away in our DB.
          const updated = await stripe.subscriptions.update(active.id, {
            items: [{ id: active.items.data[0].id, price: PLAN_PRICE[targetPlan] }],
            proration_behavior: "none",
            billing_cycle_anchor: "unchanged",
            cancel_at_period_end: false,
          });
          stripePriceId = updated.items.data[0]?.price?.id ?? null;
          log("Price swapped", { subscriptionId: active.id, targetPlan, effectiveAt });
        }
      }
    }

    const limits = PLAN_LIMITS[targetPlan];
    const { error: updateError } = await admin
      .from("subscriptions")
      .update({
        plan: targetPlan,
        pages_limit: limits.pages_limit,
        ai_generations_limit: limits.ai_generations_limit,
        cancel_at_period_end: cancelAtPeriodEnd,
        ...(stripePriceId ? { stripe_price_id: stripePriceId } : {}),
        ...(subscriptionId ? { stripe_subscription_id: subscriptionId } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);
    if (updateError) throw new Error(updateError.message);

    // Best-effort in-app notification so the effective date is not lost.
    const when = effectiveAt ? new Date(effectiveAt).toLocaleDateString("en-US", { dateStyle: "medium" }) : null;
    await admin.from("notifications").insert({
      user_id: user.id,
      title: `Plan changed to ${targetPlan}`,
      message: cancelAtPeriodEnd
        ? `Your new limits apply now. Your paid subscription stays billed until ${when ?? "the end of the current period"}, after which it ends.`
        : `Your new limits apply now. The lower price takes effect on your next invoice${when ? ` (${when})` : ""}.`,
      type: "billing",
    }).then(undefined, () => undefined);

    return new Response(
      JSON.stringify({
        success: true,
        plan: targetPlan,
        limits,
        effective_at: effectiveAt,
        cancel_at_period_end: cancelAtPeriodEnd,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
