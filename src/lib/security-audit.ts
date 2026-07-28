import { supabase } from "@/integrations/supabase/client";

/**
 * Security-focused audit logging.
 *
 * These events are written through the `log_security_event` database function
 * (SECURITY DEFINER) so that a *blocked* attempt can still be recorded even when
 * the caller is not a member of the target workspace — that is exactly the case
 * we care most about.
 *
 * All events are stored in `audit_logs` with `details.security = true`, so the
 * Activity log can filter them into a "Security" view.
 */
export type SecurityAction =
  | "security_cross_workspace_blocked"
  | "security_permission_denied"
  | "security_suspicious_request"
  | "security_rate_limited"
  | "security_admin_action_denied";

export interface SecurityEventInput {
  /** Workspace the attempt targeted (or the caller's active workspace). */
  workspaceId: string;
  action: SecurityAction;
  /** What kind of resource was touched, e.g. "campaign", "website", "page". */
  entityType?: string;
  entityId?: string | null;
  /** Free-form context: reason, attempted values, route, etc. */
  details?: Record<string, unknown>;
}

function clientContext(): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  return {
    path: window.location?.pathname,
    user_agent: navigator?.userAgent?.slice(0, 300),
    at: new Date().toISOString(),
  };
}

/** Fire-and-forget — never throws, never blocks the UI. */
export async function logSecurityEvent(input: SecurityEventInput): Promise<void> {
  try {
    if (!input?.workspaceId || !input?.action) return;
    await supabase.rpc("log_security_event", {
      _workspace_id: input.workspaceId,
      _action: input.action,
      _entity_type: input.entityType ?? "security",
      _entity_id: input.entityId ?? null,
      _details: { ...clientContext(), ...(input.details ?? {}) } as never,
    });
  } catch {
    // Security logging is best-effort.
  }
}

/**
 * Guard helper: verifies that `targetWorkspaceId` matches the workspace the user
 * is actually acting in. When it doesn't, the attempt is logged and `false` is
 * returned so the caller can abort.
 */
export async function assertSameWorkspace(
  activeWorkspaceId: string | null | undefined,
  targetWorkspaceId: string | null | undefined,
  context: { entityType: string; entityId?: string | null; reason?: string }
): Promise<boolean> {
  if (!activeWorkspaceId || !targetWorkspaceId) return false;
  if (activeWorkspaceId === targetWorkspaceId) return true;

  await logSecurityEvent({
    workspaceId: activeWorkspaceId,
    action: "security_cross_workspace_blocked",
    entityType: context.entityType,
    entityId: context.entityId ?? null,
    details: {
      attempted_workspace_id: targetWorkspaceId,
      active_workspace_id: activeWorkspaceId,
      reason: context.reason ?? "workspace_mismatch",
    },
  });
  return false;
}

/**
 * Translates a failed Supabase call into a security event when the failure looks
 * like an authorization denial (RLS / grant / policy violation) rather than a
 * normal data error. Returns true when an event was logged.
 */
export async function logIfAuthorizationFailure(
  workspaceId: string | null | undefined,
  error: { code?: string; message?: string } | null | undefined,
  context: { entityType: string; entityId?: string | null; operation?: string }
): Promise<boolean> {
  if (!workspaceId || !error) return false;
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();
  const denied =
    code === "42501" ||
    code === "PGRST301" ||
    message.includes("row-level security") ||
    message.includes("permission denied") ||
    message.includes("not authorized");
  if (!denied) return false;

  await logSecurityEvent({
    workspaceId,
    action: "security_permission_denied",
    entityType: context.entityType,
    entityId: context.entityId ?? null,
    details: {
      operation: context.operation ?? "unknown",
      code,
      message: error.message?.slice(0, 300),
    },
  });
  return true;
}
