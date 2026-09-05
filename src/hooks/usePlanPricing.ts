import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PublicPlanPricing {
  plan: string;
  label: string;
  monthly_price: number;
  yearly_discount: number;
  currency: string;
  pages_limit: number;
  ai_limit: number;
  base_credits: number;
  popular: boolean;
  active: boolean;
  sort_order: number;
}

/** Admin-editable plan pricing (public.plan_pricing). Falls back to hardcoded values when empty. */
export function usePlanPricing() {
  return useQuery({
    queryKey: ["public-plan-pricing"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan_pricing")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as PublicPlanPricing[];
    },
  });
}
