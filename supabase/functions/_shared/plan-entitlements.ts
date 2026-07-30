/**
 * SEO / SEA / GEO entitlements per plan tier — server-side mirror of
 * `src/lib/plan-features.ts`. Used to gate optimization requests and to
 * compute how many AI credits a given optimization run costs.
 */

export type PlanName = "free" | "starter" | "pro" | "agency";
export type OptimizationMode = "seo" | "sea" | "geo";
/** none = not available, score = read-only scoring, autofix = AI rewrite, bulk = autofix + batch */
export type OptimizationLevel = "none" | "score" | "autofix" | "bulk";

export const OPTIMIZATION_ENTITLEMENTS: Record<PlanName, Record<OptimizationMode, OptimizationLevel>> = {
  free: { seo: "score", sea: "none", geo: "none" },
  starter: { seo: "autofix", sea: "score", geo: "none" },
  pro: { seo: "autofix", sea: "autofix", geo: "autofix" },
  agency: { seo: "bulk", sea: "bulk", geo: "bulk" },
};

/** Credits burned per optimization pass, per mode. */
export const OPTIMIZATION_CREDIT_COST: Record<OptimizationMode, number> = {
  seo: 2,
  sea: 3,
  geo: 4,
};

export function normalizePlan(plan?: string | null): PlanName {
  return plan === "starter" || plan === "pro" || plan === "agency" ? plan : "free";
}

export function optimizationLevel(plan: PlanName, mode: OptimizationMode): OptimizationLevel {
  return OPTIMIZATION_ENTITLEMENTS[plan][mode];
}

export function canAutoFix(plan: PlanName, mode: OptimizationMode): boolean {
  const lvl = optimizationLevel(plan, mode);
  return lvl === "autofix" || lvl === "bulk";
}

export function canBulkOptimize(plan: PlanName): boolean {
  return OPTIMIZATION_ENTITLEMENTS[plan].seo === "bulk";
}

/** Total credit cost for a set of optimization modes (minimum 1). */
export function optimizationCreditCost(modes: OptimizationMode[]): number {
  const unique = Array.from(new Set(modes.length ? modes : (["seo"] as OptimizationMode[])));
  return Math.max(1, unique.reduce((sum, m) => sum + (OPTIMIZATION_CREDIT_COST[m] ?? 2), 0));
}

export function parseModes(input: unknown): OptimizationMode[] {
  const raw = Array.isArray(input) ? input : typeof input === "string" ? [input] : [];
  const modes = raw.filter((m): m is OptimizationMode => m === "seo" || m === "sea" || m === "geo");
  return modes.length ? Array.from(new Set(modes)) : ["seo"];
}

/** Resolve the user's active plan from their subscription row. */
export async function resolveUserPlan(sb: any, userId: string): Promise<PlanName> {
  try {
    const { data } = await sb
      .from("subscriptions")
      .select("plan")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    return normalizePlan(data?.plan);
  } catch (_) {
    return "free";
  }
}

/**
 * Returns the modes the plan may auto-fix and the blocked ones,
 * plus the credit cost of the allowed set.
 */
export function gateModes(plan: PlanName, modes: OptimizationMode[]) {
  const allowed = modes.filter((m) => canAutoFix(plan, m));
  const blocked = modes.filter((m) => !canAutoFix(plan, m));
  return { allowed, blocked, credits: optimizationCreditCost(allowed) };
}
