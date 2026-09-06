import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  // Service client: plan pricing is the single source of truth for what a
  // buyer is actually charged, so we resolve the Stripe price server-side.
  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { plan, priceId: requestedPriceId, quantity, origin: bodyOrigin } = await req.json();
    const qty = Math.min(Math.max(Number(quantity) || 1, 1), 20);

    // Resolve the price from the admin-managed plan table whenever possible.
    let priceId: string | null = null;
    let planKey: string | null = null;

    if (plan && typeof plan === "string") {
      planKey = plan.trim().toLowerCase();
      const { data: row, error: planError } = await admin
        .from("plan_pricing")
        .select("plan, stripe_price_id, active")
        .eq("plan", planKey)
        .maybeSingle();
      if (planError) throw planError;
      if (!row) throw new Error(`Unknown plan: ${planKey}`);
      if (!row.active) throw new Error(`Plan ${planKey} is not available`);
      if (!row.stripe_price_id) {
        throw new Error(
          `Plan "${planKey}" has no Stripe price configured. Add its Stripe price ID in Admin → Plans & Pricing.`
        );
      }
      priceId = row.stripe_price_id;
    } else if (requestedPriceId) {
      // Legacy path: only accept a price that an admin actually configured.
      const { data: row } = await admin
        .from("plan_pricing")
        .select("plan, active")
        .eq("stripe_price_id", requestedPriceId)
        .maybeSingle();
      if (!row || !row.active) throw new Error("This price is not available for purchase");
      priceId = requestedPriceId;
      planKey = row.plan;
    }

    if (!priceId) throw new Error("plan is required");

    // Prefer the explicit origin sent by the client (real app domain),
    // fall back to the request Origin header.
    const origin = bodyOrigin || req.headers.get("origin") || "";

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Fail fast with a clear message if the configured price does not exist
    // in the currently active Stripe account (test vs live key mismatch).
    const price = await stripe.prices.retrieve(priceId).catch(() => null);
    if (!price || price.active === false) {
      throw new Error(
        `Stripe price ${priceId} is missing or inactive in the connected Stripe account.`
      );
    }
    const isRecurring = Boolean(price.recurring);

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // First-time subscribers get 1 extra month free (30-day trial).
    // Anyone who already had (or has) a subscription is not eligible again.
    let eligibleForTrial = isRecurring;
    if (isRecurring && customerId) {
      const prior = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 1,
      });
      eligibleForTrial = prior.data.length === 0;
    }

    const metadata = {
      user_id: user.id,
      user_email: user.email,
      plan: planKey ?? "",
    };

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: qty }],
      mode: isRecurring ? "subscription" : "payment",
      metadata,
      ...(isRecurring
        ? {
            subscription_data: {
              metadata,
              ...(eligibleForTrial ? { trial_period_days: 30 } : {}),
            },
          }
        : { payment_intent_data: { metadata } }),
      success_url: `${origin}/billing?success=true`,
      cancel_url: `${origin}/billing?canceled=true`,
    });

    return new Response(JSON.stringify({ url: session.url, trial: eligibleForTrial }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
