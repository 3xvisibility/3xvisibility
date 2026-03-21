import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PLAN_FEATURES, type PlanName, type FeatureKey, type PlanFeatures } from "@/lib/plan-features";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface SubscriptionData {
  plan: PlanName;
  features: PlanFeatures;
  pagesUsed: number;
  pagesLimit: number;
  aiUsed: number;
  aiLimit: number;
  isLoading: boolean;
  canUseFeature: (feature: FeatureKey) => boolean;
  hasReachedPageLimit: () => boolean;
  hasReachedAiLimit: () => boolean;
  pagesRemaining: number;
  aiRemaining: number;
}

export function useSubscription(): SubscriptionData {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const queryClient = useQueryClient();

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

  const { data, isLoading } = useQuery({
    queryKey: ["user-subscription", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const query = supabase
        .from("subscriptions")
        .select("plan, pages_used, pages_limit, ai_generations_used, ai_generations_limit")
        .eq("user_id", user.id);
      if (wsId) {
        query.eq("workspace_id", wsId);
      }
      const { data } = await query.maybeSingle();
      return data;
    },
    staleTime: 60_000,
  });

  const plan = (data?.plan as PlanName) || "free";
  const features = PLAN_FEATURES[plan];
  const pagesUsed = data?.pages_used ?? 0;
  const pagesLimit = data?.pages_limit ?? features.pagesLimit;
  const aiUsed = data?.ai_generations_used ?? 0;
  const aiLimit = data?.ai_generations_limit ?? features.aiLimit;

  return {
    plan,
    features,
    pagesUsed,
    pagesLimit,
    aiUsed,
    aiLimit,
    isLoading,
    canUseFeature: (feature: FeatureKey) => features[feature],
    hasReachedPageLimit: () => pagesUsed >= pagesLimit,
    hasReachedAiLimit: () => aiUsed >= aiLimit,
    pagesRemaining: Math.max(0, pagesLimit - pagesUsed),
    aiRemaining: Math.max(0, aiLimit - aiUsed),
  };
}
