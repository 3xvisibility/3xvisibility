import { differenceInDays } from "date-fns";

export type FreshnessLevel = "fresh" | "aging" | "stale" | "outdated";

export interface FreshnessResult {
  level: FreshnessLevel;
  label: string;
  color: string;
  ageDays: number;
  tip: string;
}

/**
 * Scores content freshness based on page age and publish status.
 * - Fresh: < 30 days
 * - Aging: 30-90 days
 * - Stale: 90-180 days
 * - Outdated: > 180 days
 */
export function calculateFreshness(
  createdAt: string,
  status: string
): FreshnessResult {
  const ageDays = differenceInDays(new Date(), new Date(createdAt));

  if (ageDays < 30) {
    return { level: "fresh", label: "Fresh", color: "text-emerald-600", ageDays, tip: "Content is up to date." };
  }
  if (ageDays < 90) {
    return { level: "aging", label: "Aging", color: "text-primary", ageDays, tip: "Consider reviewing this content soon." };
  }
  if (ageDays < 180) {
    return { level: "stale", label: "Stale", color: "text-amber-600", ageDays, tip: "This content may need an update to stay relevant." };
  }
  return { level: "outdated", label: "Outdated", color: "text-destructive", ageDays, tip: "Content is over 6 months old — update recommended." };
}
