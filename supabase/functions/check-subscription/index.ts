import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  console.log(`[CHECK-SUBSCRIPTION] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

// Map Stripe product IDs to plan names
const PRODUCT_TO_PLAN: Record<string, string> = {
  "prod_UALduTYX0c1iq6": "starter",
  "prod_UAMvLB3qPitarV": "pro",
  "prod_UAMyFLJgpAa7L7": "agency",
};

// Plan limits
const PLAN_LIMITS: Record<string, { pages_limit: number; ai_generations_limit: number }> = {
  free:    { pages_limit: 10,    ai_generations_limit: 5 },
  starter: { pages_limit: 100,   ai_generations_limit: 50 },
  pro:     { pages_limit: 1000,  ai_generations_limit: 500 },
  agency:  { pages_limit: 10000, ai_generations_limit: 5000 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ subscribed: false, error: "No authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData?.user) {
      logStep("Auth failed gracefully", { message: userError?.message });
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    const userId = userData.user.id;
    const userEmail = userData.user.email;
    if (!userEmail) throw new Error("No email in token");
    logStep("User authenticated", { email: userEmail });

    // Get user's workspace
    const { data: memberData } = await supabaseClient
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    const workspaceId = memberData?.workspace_id ?? null;
    logStep("Workspace", { workspaceId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      // Ensure a free subscription row exists
      await upsertSubscription(supabaseClient, userId, workspaceId, "free", null, null, null);
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let productId: string | null = null;
    let priceId: string | null = null;
    let subscriptionEnd: string | null = null;
    let planName = "free";

    if (hasActiveSub) {
      const sub = subscriptions.data[0];
      const rawPeriodEnd = sub.current_period_end;
      logStep("Raw period end value", { rawPeriodEnd, type: typeof rawPeriodEnd });

      try {
        if (rawPeriodEnd != null) {
          const ts = Number(rawPeriodEnd);
          if (!isNaN(ts) && ts > 0) {
            subscriptionEnd = new Date(ts * 1000).toISOString();
          }
        }
      } catch (e) {
        logStep("Failed to parse period end", { error: e.message });
      }

      productId = String(sub.items.data[0]?.price?.product ?? "");
      priceId = sub.items.data[0]?.price?.id ?? null;
      planName = PRODUCT_TO_PLAN[productId] || "free";
      logStep("Active subscription", { productId, priceId, subscriptionEnd, planName });
    }

    // Sync to database
    await upsertSubscription(
      supabaseClient,
      userId,
      workspaceId,
      planName,
      customerId,
      subscriptionEnd,
      subscriptionEnd ? new Date(new Date(subscriptionEnd).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString() : null
    );

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      price_id: priceId,
      subscription_end: subscriptionEnd,
      plan: planName,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function upsertSubscription(
  supabase: any,
  userId: string,
  workspaceId: string | null,
  plan: string,
  stripeCustomerId: string | null,
  periodEnd: string | null,
  periodStart: string | null,
) {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  // First try to find by user_id alone (trigger may have created without workspace_id)
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id, pages_used, ai_generations_used, workspace_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    // Update plan, limits, and set workspace_id if missing
    const updateData: any = {
      plan,
      pages_limit: limits.pages_limit,
      ai_generations_limit: limits.ai_generations_limit,
      stripe_customer_id: stripeCustomerId,
      current_period_end: periodEnd,
      current_period_start: periodStart,
      updated_at: new Date().toISOString(),
    };
    // Backfill workspace_id if it was missing
    if (!existing.workspace_id && workspaceId) {
      updateData.workspace_id = workspaceId;
    }
    const { error } = await supabase
      .from("subscriptions")
      .update(updateData)
      .eq("id", existing.id);
    if (error) logStep("Failed to update subscription", { error: error.message });
    else logStep("Updated subscription row", { id: existing.id, plan });
  } else {
    // Insert new subscription row
    const insertData: any = {
      user_id: userId,
      plan,
      pages_limit: limits.pages_limit,
      ai_generations_limit: limits.ai_generations_limit,
      stripe_customer_id: stripeCustomerId,
      current_period_end: periodEnd,
      current_period_start: periodStart,
    };
    if (workspaceId) insertData.workspace_id = workspaceId;
    const { error } = await supabase.from("subscriptions").insert(insertData);
    if (error) logStep("Failed to insert subscription", { error: error.message });
    else logStep("Inserted new subscription row", { plan });
  }
}
