import React, { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PLAN_FEATURES, type PlanName, type FeatureKey, type PlanFeatures } from "@/lib/plan-features";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";
import { setUsageSnapshot } from "@/lib/usage-snapshot";

export interface SubscriptionData {
  plan: PlanName;
  features: PlanFeatures;
  pagesUsed: number;
  pagesLimit: number;
  aiUsed: number;
  aiLimit: number;
  sitesConnected: number;
  sitesLimit: number;
  isLoading: boolean;
  canUseFeature: (feature: FeatureKey) => boolean;
  hasReachedPageLimit: () => boolean;
  hasReachedAiLimit: () => boolean;
  hasReachedSiteLimit: () => boolean;
  pagesRemaining: number;
  aiRemaining: number;
  sitesRemaining: number;
  /** ISO date string for the next usage reset / billing period end. */
  resetDate: string | null;
  /** Raw Stripe subscription status (active, trialing, past_due, canceled…). */
  status: string;
  /** True while the subscription is inside its free-trial window. */
  isTrialing: boolean;
  /** ISO date the trial ends, when trialing. */
  trialEnd: string | null;
  /** Days left in the trial (0 when not trialing). */
  trialDaysLeft: number;
  /** True when the subscription will not renew at period end. */
  cancelAtPeriodEnd: boolean;
}


// ── Shared singletons across ALL useSubscription instances ────────────────
// The hook is mounted by ~19 components, often several on the same page. If
// every instance ran its own Stripe sync + interval + realtime channel, each
// page load fired N× `check-subscription` invocations (each writing the
// subscriptions row) and opened N× duplicate realtime channels. These
// module-level singletons collapse that work to a single shared instance.
const SYNC_MIN_INTERVAL = 5 * 60_000; // throttle Stripe sync to once / 5 min
let lastStripeSyncAt = 0;
let stripeSyncInFlight = false;
let syncInstanceCount = 0;
let sharedSyncInterval: ReturnType<typeof setInterval> | null = null;
let currentSyncWsId: string | null = null;

let realtimeRefCount = 0;
let sharedChannel: ReturnType<typeof supabase.channel> | null = null;
let channelInitializing = false;

async function runStripeSync(queryClient: ReturnType<typeof useQueryClient>, force = false) {
  const wsId = currentSyncWsId;
  if (!wsId) return;
  const now = Date.now();
  if (!force && now - lastStripeSyncAt < SYNC_MIN_INTERVAL) return;
  if (stripeSyncInFlight) return;
  stripeSyncInFlight = true;
  lastStripeSyncAt = now;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { lastStripeSyncAt = 0; return; }
    const { error } = await supabase.functions.invoke("check-subscription");
    if (!error) queryClient.invalidateQueries({ queryKey: ["user-subscription", wsId] });
  } catch {
    lastStripeSyncAt = 0; // allow a retry on next mount
  } finally {
    stripeSyncInFlight = false;
  }
}

export function useSubscription(): SubscriptionData {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const warnedRef = useRef<{ pages: boolean; ai: boolean }>({ pages: false, ai: false });

  // Auto-sync with Stripe — shared across all instances, throttled to 5 min.
  useEffect(() => {
    if (!wsId) return;
    currentSyncWsId = wsId;
    syncInstanceCount++;

    runStripeSync(queryClient); // throttled — only actually runs when stale

    if (!sharedSyncInterval) {
      sharedSyncInterval = setInterval(() => runStripeSync(queryClient, true), SYNC_MIN_INTERVAL);
    }

    return () => {
      syncInstanceCount--;
      if (syncInstanceCount <= 0 && sharedSyncInterval) {
        clearInterval(sharedSyncInterval);
        sharedSyncInterval = null;
      }
    };
  }, [wsId, queryClient]);

  // Realtime: a single shared channel re-fetches subscription/credit data on
  // change. Ref-counted so it stays open while any instance is mounted.
  useEffect(() => {
    let active = true;
    realtimeRefCount++;

    (async () => {
      if (sharedChannel || channelInitializing) return;
      channelInitializing = true;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active || sharedChannel) { channelInitializing = false; return; }

      const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ["user-subscription"] });
      };

      sharedChannel = supabase
        .channel(`subscription-changes-${user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` },
          refresh,
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "ai_credits", filter: `user_id=eq.${user.id}` },
          refresh,
        )
        .subscribe();
      channelInitializing = false;
    })();

    return () => {
      active = false;
      realtimeRefCount--;
      if (realtimeRefCount <= 0 && sharedChannel) {
        supabase.removeChannel(sharedChannel);
        sharedChannel = null;
      }
    };
  }, [queryClient]);


  const { data, isLoading } = useQuery({
    queryKey: ["user-subscription", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      // Use the locally-cached session (no network round-trip). getUser() hits
      // /auth/v1/user over the network on every fetch; getSession reads the
      // stored JWT and is sufficient to identify the user here.
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      if (!user) return null;

      // Fetch subscription, AI credits and connected-site count in parallel so
      // the three independent reads don't run as a serial waterfall.
      const subQuery = supabase
        .from("subscriptions")
        .select("plan, pages_used, pages_limit, ai_generations_used, ai_generations_limit, current_period_end")
        .eq("user_id", user.id);
      if (wsId) subQuery.eq("workspace_id", wsId);

      const [subRes, creditsRes, sitesRes] = await Promise.all([
        subQuery.maybeSingle(),
        supabase
          .from("ai_credits")
          .select("total_credits, used_credits, remaining_credits")
          .eq("user_id", user.id)
          .maybeSingle(),
        wsId
          ? supabase
              .from("websites")
              .select("id", { count: "exact", head: true })
              .eq("workspace_id", wsId)
          : Promise.resolve({ count: 0 } as { count: number }),
      ]);

      return {
        ...subRes.data,
        sitesConnected: (sitesRes as { count: number | null }).count ?? 0,
        aiCredits: creditsRes.data,
      };
    },
    staleTime: 60_000,
  });

  // Cache the resolved plan so the correct plan shows instantly on the next
  // login/load instead of flashing "free" while the query resolves.
  // We keep BOTH a per-workspace cache and a global "last plan" cache. The
  // global cache is the fallback used during the brief window right after login
  // before `wsId` is known, eliminating the free→actual flash.
  const GLOBAL_PLAN_KEY = "plan-cache:last";
  const planCacheKey = wsId ? `plan-cache:${wsId}` : null;
  const cachedPlan = (() => {
    try {
      const wsCached = planCacheKey ? localStorage.getItem(planCacheKey) : null;
      return (wsCached || localStorage.getItem(GLOBAL_PLAN_KEY)) as PlanName | null;
    } catch { return null; }
  })();

  const resolvedPlan = data?.plan as PlanName | undefined;
  // Before we know the real plan, ALWAYS prefer the cached plan over "free".
  // Only fall back to "free" when there is genuinely no cached value.
  const plan: PlanName = resolvedPlan || cachedPlan || "free";

  useEffect(() => {
    if (!resolvedPlan) return;
    try {
      if (planCacheKey) localStorage.setItem(planCacheKey, resolvedPlan);
      localStorage.setItem(GLOBAL_PLAN_KEY, resolvedPlan);
    } catch { /* ignore */ }
  }, [planCacheKey, resolvedPlan]);

  const features = PLAN_FEATURES[plan];
  const pagesUsed = data?.pages_used ?? 0;
  const pagesLimit = data?.pages_limit ?? features.pagesLimit;
  const aiUsed = data?.aiCredits?.used_credits ?? data?.ai_generations_used ?? 0;
  const aiLimit = data?.aiCredits?.total_credits ?? data?.ai_generations_limit ?? features.aiLimit;
  const sitesConnected = data?.sitesConnected ?? 0;
  const sitesLimit = features.websites; // -1 means unlimited

  // Next usage reset: billing period end if known, otherwise start of next month.
  const resetDate =
    (data?.current_period_end as string | undefined) ??
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString();

  // Publish a snapshot so non-React code (e.g. handleApiError) can show page counts
  useEffect(() => {
    setUsageSnapshot({
      pagesUsed,
      pagesLimit,
      pagesRemaining: Math.max(0, pagesLimit - pagesUsed),
      planName: plan,
      resetDate,
    });
  }, [pagesUsed, pagesLimit, plan, resetDate]);



  // ── Usage limit warning (90% threshold) ─────────────
  useEffect(() => {
    if (isLoading || !data) return;

    const checkAndWarn = async () => {
      // Load notification preferences
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("notification_preferences")
        .eq("user_id", user.id)
        .maybeSingle();
      const prefs = (profile as any)?.notification_preferences ?? { usage_limit: true };
      if (prefs.usage_limit === false) return;

      const pagesPercent = pagesLimit > 0 ? pagesUsed / pagesLimit : 0;

      // Persist the "already warned" flag across page navigations / remounts so
      // the toast fires only ONCE per session for a given usage level, instead
      // of re-appearing every time a page mounts this hook.
      const warnKey = `page-limit-warned:${wsId}:${pagesUsed}:${pagesLimit}`;
      const alreadyWarned = (() => {
        try { return sessionStorage.getItem(warnKey) === "1"; } catch { return false; }
      })();

      if (pagesPercent >= 0.9 && !warnedRef.current.pages && !alreadyWarned) {
        warnedRef.current.pages = true;
        try { sessionStorage.setItem(warnKey, "1"); } catch { /* ignore */ }
        toast({
          title: "Page limit warning",
          description: `You've used ${pagesUsed} of ${pagesLimit} pages (${Math.round(pagesPercent * 100)}%).`,
          action: (
            <button
              className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              onClick={() => navigate("/billing")}
            >
              Upgrade
            </button>
          ),
        });
      }

      // NOTE: AI credit warnings are intentionally NOT shown here.
      // A passive AI-limit toast on every page load (including opening a
      // campaign that never uses AI) is noisy and fires multiple times.
      // AI-limit feedback is surfaced only at the moment an AI action is
      // performed (StartGenerationDialog quota check, edge-function error
      // responses), so users see it only when AI is actually used.
    };

    checkAndWarn();
  }, [isLoading, pagesUsed, pagesLimit, aiUsed, aiLimit, toast, data]);

  return {
    plan,
    features,
    pagesUsed,
    pagesLimit,
    aiUsed,
    aiLimit,
    sitesConnected,
    sitesLimit,
    isLoading,
    canUseFeature: (feature: FeatureKey) => features[feature],
    hasReachedPageLimit: () => pagesUsed >= pagesLimit,
    hasReachedAiLimit: () => aiUsed >= aiLimit,
    hasReachedSiteLimit: () => sitesLimit !== -1 && sitesConnected >= sitesLimit,
    pagesRemaining: Math.max(0, pagesLimit - pagesUsed),
    aiRemaining: Math.max(0, aiLimit - aiUsed),
    sitesRemaining: sitesLimit === -1 ? Infinity : Math.max(0, sitesLimit - sitesConnected),
    resetDate,
  };
}
