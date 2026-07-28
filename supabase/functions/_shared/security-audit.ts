/**
 * Server-side (edge function) security audit logging.
 *
 * Records blocked cross-workspace attempts and suspicious requests into
 * `public.audit_logs` with `details.security = true`, using the service role so
 * the write always succeeds — even when the caller had no access to the target
 * workspace in the first place.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

export type SecurityAction =
  | "security_cross_workspace_blocked"
  | "security_permission_denied"
  | "security_suspicious_request"
  | "security_rate_limited"
  | "security_admin_action_denied";

export interface EdgeSecurityEvent {
  workspaceId: string;
  userId: string;
  action: SecurityAction;
  entityType?: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
  /** Original request, used to capture IP / user-agent / route. */
  req?: Request;
}

function requestContext(req?: Request): Record<string, unknown> {
  if (!req) return {};
  const h = req.headers;
  return {
    route: (() => {
      try {
        return new URL(req.url).pathname;
      } catch {
        return undefined;
      }
    })(),
    method: req.method,
    user_agent: h.get("user-agent")?.slice(0, 300) ?? undefined,
    origin: h.get("origin") ?? undefined,
  };
}

function clientIp(req?: Request): string | null {
  if (!req) return null;
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim().slice(0, 100);
  return req.headers.get("cf-connecting-ip")?.slice(0, 100) ?? null;
}

/** Fire-and-forget — never throws. */
export async function logSecurityEvent(event: EdgeSecurityEvent): Promise<void> {
  try {
    if (!event?.workspaceId || !event?.userId || !event?.action) return;
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return;

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    await admin.from("audit_logs").insert({
      workspace_id: event.workspaceId,
      user_id: event.userId,
      action: event.action,
      entity_type: event.entityType ?? "security",
      entity_id: event.entityId ?? null,
      ip_address: clientIp(event.req),
      details: {
        security: true,
        ...requestContext(event.req),
        ...(event.details ?? {}),
      },
    });
  } catch (_e) {
    // best-effort
  }
}

/**
 * Verifies workspace membership for `userId`. When the check fails the attempt
 * is logged as a blocked cross-workspace access and `false` is returned.
 */
export async function assertWorkspaceAccess(params: {
  userId: string;
  workspaceId: string;
  entityType: string;
  entityId?: string | null;
  req?: Request;
}): Promise<boolean> {
  const { userId, workspaceId, entityType, entityId, req } = params;
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return false;
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await admin
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!error && data) return true;

    await logSecurityEvent({
      workspaceId,
      userId,
      action: "security_cross_workspace_blocked",
      entityType,
      entityId,
      req,
      details: { reason: "not_a_workspace_member" },
    });
    return false;
  } catch {
    return false;
  }
}

/** Logs a suspicious request (malformed payload, tampered ids, abuse signals). */
export async function logSuspiciousRequest(params: {
  workspaceId: string;
  userId: string;
  reason: string;
  entityType?: string;
  details?: Record<string, unknown>;
  req?: Request;
}): Promise<void> {
  await logSecurityEvent({
    workspaceId: params.workspaceId,
    userId: params.userId,
    action: "security_suspicious_request",
    entityType: params.entityType ?? "security",
    req: params.req,
    details: { reason: params.reason, ...(params.details ?? {}) },
  });
}
