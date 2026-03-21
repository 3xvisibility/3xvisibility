import { supabase } from "@/integrations/supabase/client";

/**
 * Logs an audit event for the current user in a given workspace.
 * Fire-and-forget — never throws.
 */
export async function logAudit(
  workspaceId: string,
  action: string,
  entityType: string,
  entityId?: string | null,
  details?: Record<string, unknown>
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("audit_logs").insert({
      workspace_id: workspaceId,
      user_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      details: details ?? {},
    });
  } catch {
    // Audit logging is best-effort
  }
}
