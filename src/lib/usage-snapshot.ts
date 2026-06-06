/**
 * Lightweight module-level snapshot of the current workspace's page usage.
 *
 * `useSubscription` keeps this up to date so non-React code (like the
 * centralised API error handler) can show accurate page counts in toasts
 * without needing access to React context or the query client.
 */
export interface UsageSnapshot {
  pagesUsed: number;
  pagesLimit: number;
  pagesRemaining: number;
}

let snapshot: UsageSnapshot | null = null;

export function setUsageSnapshot(next: UsageSnapshot): void {
  snapshot = next;
}

export function getUsageSnapshot(): UsageSnapshot | null {
  return snapshot;
}
