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
}

export function useSubscription(): SubscriptionData {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const warnedRef = useRef<{ pages: boolean; ai: boolean }>({ pages: false, ai: false });

  // Auto-sync with Stripe on mount and every 60 seconds
  useEffect(() => {
    if (!wsId) return;
    let cancelled = false;

    const syncWithStripe = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || cancelled) return;
        const { error } = await supabase.functions.invoke("check-subscription");
        if (!error && !cancelled) {
          queryClient.invalidateQueries({ queryKey: ["user-subscription", wsId] });
        }
      } catch {
        // Silently fail — the cached DB value will be used
      }
    };

    syncWithStripe();
    const interval = setInterval(syncWithStripe, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [wsId, queryClient]);

  // Realtime: auto re-fetch AI credit limits whenever the user's subscription
  // plan or status changes (e.g. upgrade, downgrade, renewal, usage update).
  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;

      const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ["user-subscription"] });
      };

      channel = supabase
        .channel(`subscription-changes-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "subscriptions",
            filter: `user_id=eq.${user.id}`,
          },
          refresh,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "ai_credits",
            filter: `user_id=eq.${user.id}`,
          },
          refresh,
        )
        .subscribe();
    })();

    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [queryClient]);


  const { data, isLoading } = useQuery({
    queryKey: ["user-subscription", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Fetch subscription
      const subQuery = supabase
        .from("subscriptions")
        .select("plan, pages_used, pages_limit, ai_generations_used, ai_generations_limit, current_period_end")
        .eq("user_id", user.id);
      if (wsId) subQuery.eq("workspace_id", wsId);
      const { data: subData } = await subQuery.maybeSingle();

      // Fetch AI credits — the single source of truth for AI usage/limits.
      // Every AI action deducts from this table via deduct_ai_credits, so all
      // surfaces (dashboard, settings, billing, widget) stay in sync.
      const { data: creditsData } = await supabase
        .from("ai_credits")
        .select("total_credits, used_credits, remaining_credits")
        .eq("user_id", user.id)
        .maybeSingle();

      // Count connected websites for this workspace
      let sitesConnected = 0;
      if (wsId) {
        const { count } = await supabase
          .from("websites")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", wsId);
        sitesConnected = count ?? 0;
      }

      return { ...subData, sitesConnected, aiCredits: creditsData };
    },
    staleTime: 60_000,
  });

  const plan = (data?.plan as PlanName) || "free";
  const features = PLAN_FEATURES[plan];
  const pagesUsed = data?.pages_used ?? 0;
  const pagesLimit = data?.pages_limit ?? features.pagesLimit;
  const aiUsed = data?.ai_generations_used ?? 0;
  const aiLimit = data?.ai_generations_limit ?? features.aiLimit;
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
      const aiPercent = aiLimit > 0 ? aiUsed / aiLimit : 0;

      if (pagesPercent >= 0.9 && !warnedRef.current.pages) {
        warnedRef.current.pages = true;
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

      if (aiPercent >= 0.9 && !warnedRef.current.ai) {
        warnedRef.current.ai = true;
        toast({
          title: "AI credit limit warning",
          description: `You've used ${aiUsed} of ${aiLimit} AI credits (${Math.round(aiPercent * 100)}%).`,
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
