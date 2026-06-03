/**
 * Workspace-scoped Realtime helpers.
 *
 * Realtime `postgres_changes` already enforce table RLS (subscribers only
 * receive rows they can SELECT), but channel *topics* were previously shared
 * across all tenants. Sharing a topic name means every workspace's clients
 * join the same Realtime channel, which is a multi-tenant scoping smell and
 * makes per-workspace authorization impossible to reason about.
 *
 * These helpers ensure every channel topic is namespaced by workspace and
 * that postgres_changes subscriptions are filtered to the current workspace
 * wherever the underlying table carries a `workspace_id` column.
 */

/**
 * Build a workspace-scoped Realtime channel topic.
 * Falls back to a "no-ws" suffix so callers never collide on an empty id.
 *
 * @example wsChannel("campaign-progress", wsId) // "ws:<id>:campaign-progress"
 */
export function wsChannel(base: string, workspaceId?: string | null): string {
  return `ws:${workspaceId || "none"}:${base}`;
}

/**
 * Build a `workspace_id=eq.<id>` postgres_changes filter string.
 * Returns undefined when no workspace id is available so the caller can
 * decide whether to skip the subscription entirely.
 */
export function wsFilter(workspaceId?: string | null): string | undefined {
  return workspaceId ? `workspace_id=eq.${workspaceId}` : undefined;
}
