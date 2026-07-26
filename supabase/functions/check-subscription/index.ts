import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  console.log(`[CHECK-SUBSCRIPTION] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

// ── Instrumentation ─────────────────────────────────────────────────────────
// Per-isolate cumulative counters keyed by user and workspace. These survive
// across warm invocations of the same edge-function instance and let us see
// call counts without a dedicated table. Each invocation also emits a single
// structured METRIC log line (parseable JSON) carrying latency + outcome, so
// counts/latencies/failures can be aggregated per user/workspace from logs.
const callCountByUser = new Map<string, number>();
const callCountByWorkspace = new Map<string, number>();

const bump = (map: Map<string, number>, key: string | null | undefined): number => {
  if (!key) return 0;
  const next = (map.get(key) ?? 0) + 1;
  map.set(key, next);
  return next;
};

interface Metric {
  user_id: string | null;
  workspace_id: string | null;
  duration_ms: number;
  outcome: "success" | "failure";
  status: number;
  failure_reason: string | null;
  user_call_count: number;
  workspace_call_count: number;
}

const emitMetric = (m: Metric) => {
  // Single-line JSON for easy log filtering/aggregation.
  console.log(`[CHECK-SUBSCRIPTION] METRIC ${JSON.stringify(m)}`);
};

// Map Stripe product IDs to plan names
const PRODUCT_TO_PLAN: Record<string, string> = {
  "prod_UALduTYX0c1iq6": "starter",
  "prod_UAMvLB3qPitarV": "pro",
  "prod_UAMyFLJgpAa7L7": "agency",
};

// Plan limits
const PLAN_LIMITS: Record<string, { pages_limit: number; ai_generations_limit: number }> = {
  free:    { pages_limit: 10,    ai_generations_limit: 10 },
  starter: { pages_limit: 100,   ai_generations_limit: 100 },
  pro:     { pages_limit: 1000,  ai_generations_limit: 1000 },
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

  // ── Per-invocation instrumentation state ──────────────────────────────────
  const startedAt = Date.now();
  let metricUserId: string | null = null;
  let metricWorkspaceId: string | null = null;
  let metricOutcome: "success" | "failure" = "success";
  let metricStatus = 200;
  let metricFailureReason: string | null = null;

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      metricOutcome = "failure";
      metricFailureReason = "missing_auth_header";
      return new Response(JSON.stringify({ subscribed: false, error: "No authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData?.user) {
      logStep("Auth failed gracefully", { message: userError?.message });
      metricOutcome = "failure";
      metricFailureReason = "auth_failed";
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    const userId = userData.user.id;
    const userEmail = userData.user.email;
    metricUserId = userId;
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
    metricWorkspaceId = workspaceId;
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

    // Fetch ALL subscriptions (not just "active") so trialing / past_due
    // customers keep their paid entitlement instead of being reset to free.
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });

    const ENTITLED = ["active", "trialing", "past_due"];
    const entitledSub =
      subscriptions.data.find((s) => ENTITLED.includes(s.status)) ?? null;

    const hasActiveSub = Boolean(entitledSub);
    let productId: string | null = null;
    let priceId: string | null = null;
    let subscriptionEnd: string | null = null;
    let planName = "free";
    let billingCycle = "monthly";
    let subStatus: string = entitledSub?.status ?? "canceled";
    let trialEnd: string | null = null;
    let cancelAtPeriodEnd = false;
    let subscriptionId: string | null = null;

    if (entitledSub) {
      const sub = entitledSub;
      const rawPeriodEnd = (sub as any).current_period_end;
      logStep("Raw period end value", { rawPeriodEnd, type: typeof rawPeriodEnd });

      try {
        if (rawPeriodEnd != null) {
          const ts = Number(rawPeriodEnd);
          if (!isNaN(ts) && ts > 0) {
            subscriptionEnd = new Date(ts * 1000).toISOString();
          }
        }
      } catch (e) {
        logStep("Failed to parse period end", { error: e instanceof Error ? e.message : String(e) });
      }

      const rawTrialEnd = Number((sub as any).trial_end ?? 0);
      if (rawTrialEnd > 0) trialEnd = new Date(rawTrialEnd * 1000).toISOString();
      cancelAtPeriodEnd = Boolean(sub.cancel_at_period_end);
      subscriptionId = sub.id;

      productId = String(sub.items.data[0]?.price?.product ?? "");
      priceId = sub.items.data[0]?.price?.id ?? null;
      planName = PRODUCT_TO_PLAN[productId] || "free";
      const interval = sub.items.data[0]?.price?.recurring?.interval ?? "month";
      billingCycle = interval === "year" ? "yearly" : "monthly";
      logStep("Entitled subscription", { productId, priceId, subscriptionEnd, planName, billingCycle, status: subStatus, trialEnd });
    }

    // Sync to database
    await upsertSubscription(
      supabaseClient,
      userId,
      workspaceId,
      planName,
      customerId,
      subscriptionEnd,
      subscriptionEnd ? new Date(new Date(subscriptionEnd).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString() : null,
      billingCycle,
      { status: subStatus, trialEnd, cancelAtPeriodEnd, priceId, subscriptionId }
    );


    // Affiliate commission is granted ONLY for active yearly subscriptions (5% of the yearly price).
    if (hasActiveSub && billingCycle === "yearly" && planName !== "free") {
      try {
        await grantYearlyAffiliateCommission(supabaseClient, userId, planName);
      } catch (e) {
        logStep("Affiliate commission grant failed", { error: e instanceof Error ? e.message : String(e) });
      }
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      price_id: priceId,
      subscription_end: subscriptionEnd,
      plan: planName,
      billing_cycle: billingCycle,
      status: subStatus,
      trialing: subStatus === "trialing",
      trial_end: trialEnd,
      cancel_at_period_end: cancelAtPeriodEnd,
    }), {

      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    metricOutcome = "failure";
    metricStatus = 500;
    metricFailureReason = msg;
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  } finally {
    // Emit one structured metric per invocation. Counts are per-isolate
    // cumulative tallies keyed by user and workspace; latency + outcome are
    // per-call. Aggregate across logs for global counts.
    const userCallCount = bump(callCountByUser, metricUserId);
    const workspaceCallCount = bump(callCountByWorkspace, metricWorkspaceId);
    emitMetric({
      user_id: metricUserId,
      workspace_id: metricWorkspaceId,
      duration_ms: Date.now() - startedAt,
      outcome: metricOutcome,
      status: metricStatus,
      failure_reason: metricFailureReason,
      user_call_count: userCallCount,
      workspace_call_count: workspaceCallCount,
    });
  }
});

interface SubExtras {
  status?: string;
  trialEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  priceId?: string | null;
  subscriptionId?: string | null;
}

async function upsertSubscription(
  supabase: any,
  userId: string,
  workspaceId: string | null,
  plan: string,
  stripeCustomerId: string | null,
  periodEnd: string | null,
  periodStart: string | null,
  billingCycle: string = "monthly",
  extras: SubExtras = {},
) {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  // Keep ai_credits (the source of truth the UI reads from) in sync with the plan.
  await syncAiCredits(supabase, userId, limits.ai_generations_limit);

  const base: any = {
    plan,
    pages_limit: limits.pages_limit,
    ai_generations_limit: limits.ai_generations_limit,
    stripe_customer_id: stripeCustomerId,
    current_period_end: periodEnd,
    current_period_start: periodStart,
    billing_cycle: billingCycle,
    status: extras.status ?? (plan === "free" ? "canceled" : "active"),
    trial_end: extras.trialEnd ?? null,
    cancel_at_period_end: Boolean(extras.cancelAtPeriodEnd),
  };
  if (extras.priceId !== undefined) base.stripe_price_id = extras.priceId;
  if (extras.subscriptionId !== undefined) base.stripe_subscription_id = extras.subscriptionId;

  // First try to find by user_id alone (trigger may have created without workspace_id)
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id, pages_used, ai_generations_used, workspace_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const updateData: any = { ...base, updated_at: new Date().toISOString() };
    // Backfill workspace_id if it was missing
    if (!existing.workspace_id && workspaceId) {
      updateData.workspace_id = workspaceId;
    }
    const { error } = await supabase
      .from("subscriptions")
      .update(updateData)
      .eq("id", existing.id);
    if (error) logStep("Failed to update subscription", { error: error.message });
    else logStep("Updated subscription row", { id: existing.id, plan, status: base.status });
  } else {
    const insertData: any = { user_id: userId, ...base };
    if (workspaceId) insertData.workspace_id = workspaceId;
    const { error } = await supabase.from("subscriptions").insert(insertData);
    if (error) logStep("Failed to insert subscription", { error: error.message });
    else logStep("Inserted new subscription row", { plan, status: base.status });
  }
}


// Sync the ai_credits table (the UI's source of truth for AI limits) to the
// allowance for the user's current plan. Preserves already-used credits so an
// upgrade immediately reflects the new total without wiping usage.
async function syncAiCredits(supabase: any, userId: string, planLimit: number) {
  try {
    // Ensure a row exists
    await supabase
      .from("ai_credits")
      .upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });

    const { data: row } = await supabase
      .from("ai_credits")
      .select("total_credits, used_credits")
      .eq("user_id", userId)
      .maybeSingle();

    const used = Number(row?.used_credits ?? 0);

    // Only update when the total differs from the plan allowance.
    if (Number(row?.total_credits ?? -1) !== planLimit) {
      const { error } = await supabase
        .from("ai_credits")
        .update({
          total_credits: planLimit,
          remaining_credits: Math.max(0, planLimit - used),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
      if (error) logStep("Failed to sync ai_credits", { error: error.message });
      else logStep("Synced ai_credits to plan", { userId, planLimit });
    }
  } catch (e) {
    logStep("syncAiCredits error", { error: e instanceof Error ? e.message : String(e) });
  }
}

const YEARLY_TOTAL: Record<string, number> = {
  starter: 192,
  pro: 588,
  agency: 1488,
};
const COMMISSION_RATE = 0.05; // 5%
const DEFAULT_REWARD_CREDITS = 50;

// Grant the referrer a 5% commission (and AI credit reward) when the referred
// user activates a YEARLY plan. Idempotent: only fills referrals that are still pending.
async function grantYearlyAffiliateCommission(supabase: any, referredUserId: string, plan: string) {
  // Find a pending referral row for this referred user (commission not yet granted)
  const { data: referral } = await supabase
    .from("affiliate_referrals")
    .select("id, affiliate_link_id, commission_amount, credit_reward")
    .eq("referred_user_id", referredUserId)
    .eq("commission_amount", 0)
    .maybeSingle();

  if (!referral) {
    logStep("No pending referral to reward for yearly plan", { referredUserId });
    return;
  }

  const yearlyTotal = YEARLY_TOTAL[plan] ?? 0;
  const commission = Math.round(yearlyTotal * COMMISSION_RATE * 100) / 100;
  if (commission <= 0) return;

  const now = new Date().toISOString();

  const { data: link } = await supabase
    .from("affiliate_links")
    .select("id, user_id, total_earned, total_credited")
    .eq("id", referral.affiliate_link_id)
    .maybeSingle();
  if (!link) return;

  // Reward credits (use settings for the plan if present, else default)
  let rewardCredits = referral.credit_reward || 0;
  if (rewardCredits <= 0) {
    let { data: setting } = await supabase
      .from("referral_reward_settings")
      .select("reward_credits,is_active")
      .eq("plan", plan)
      .maybeSingle();
    if (!setting) {
      const { data: def } = await supabase
        .from("referral_reward_settings")
        .select("reward_credits,is_active")
        .eq("plan", "default")
        .maybeSingle();
      setting = def || null;
    }
    rewardCredits = setting
      ? (setting.is_active ? Number(setting.reward_credits || 0) : 0)
      : DEFAULT_REWARD_CREDITS;
  }

  await supabase
    .from("affiliate_referrals")
    .update({
      status: "verified",
      commission_amount: commission,
      credit_reward: rewardCredits,
      subscription_plan: plan,
      converted_at: now,
    })
    .eq("id", referral.id);

  await supabase
    .from("affiliate_links")
    .update({
      total_earned: Number(link.total_earned || 0) + commission,
      total_credited: Number(link.total_credited || 0) + rewardCredits,
      updated_at: now,
    })
    .eq("id", link.id);

  if (rewardCredits > 0) {
    await supabase.from("ai_credits").upsert({ user_id: link.user_id }, { onConflict: "user_id", ignoreDuplicates: true });
    const { data: credits } = await supabase
      .from("ai_credits")
      .select("total_credits,remaining_credits")
      .eq("user_id", link.user_id)
      .maybeSingle();
    if (credits) {
      await supabase
        .from("ai_credits")
        .update({
          total_credits: (credits.total_credits || 0) + rewardCredits,
          remaining_credits: (credits.remaining_credits || 0) + rewardCredits,
          updated_at: now,
        })
        .eq("user_id", link.user_id);
    }
  }

  logStep("Granted yearly affiliate commission", { referralId: referral.id, commission, rewardCredits });
}
