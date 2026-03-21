import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function auditLog(client: any, wsId: string, userId: string, action: string, entityType: string, entityId?: string, details?: any) {
  try {
    await client.from("audit_logs").insert({
      workspace_id: wsId,
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      details: details || {},
    });
  } catch (e) {
    console.error("Audit log failed:", e);
  }
}

function jsonRes(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return jsonRes({ error: "Unauthorized" }, 401);
    }

    const { action, workspace_id, ...params } = await req.json();

    // Actions that don't require admin: accept/decline invitation, list own pending invitations
    if (action === "my_pending_invitations") {
      const { data: invitations, error } = await adminClient
        .from("workspace_invitations")
        .select("id, workspace_id, email, role, status, created_at, expires_at")
        .eq("email", user.email?.toLowerCase())
        .eq("status", "pending")
        .gte("expires_at", new Date().toISOString());
      if (error) throw error;

      // Enrich with workspace names
      const wsIds = [...new Set(invitations?.map((i: any) => i.workspace_id) || [])];
      let workspaceNames: Record<string, string> = {};
      if (wsIds.length > 0) {
        const { data: workspaces } = await adminClient
          .from("workspaces")
          .select("id, name")
          .in("id", wsIds);
        workspaces?.forEach((w: any) => { workspaceNames[w.id] = w.name; });
      }

      const enriched = invitations?.map((i: any) => ({
        ...i,
        workspace_name: workspaceNames[i.workspace_id] || "Unknown",
      }));

      return jsonRes({ invitations: enriched });
    }

    if (action === "accept_invitation") {
      const { invitation_id } = params;
      if (!invitation_id) return jsonRes({ error: "invitation_id is required" }, 400);

      const { data: invitation, error: fetchErr } = await adminClient
        .from("workspace_invitations")
        .select("*")
        .eq("id", invitation_id)
        .eq("status", "pending")
        .single();
      if (fetchErr || !invitation) return jsonRes({ error: "Invitation not found or already processed" }, 404);

      // Verify the invitation is for this user
      if (invitation.email.toLowerCase() !== user.email?.toLowerCase()) {
        return jsonRes({ error: "This invitation is not for your account" }, 403);
      }

      // Check expiry
      if (new Date(invitation.expires_at) < new Date()) {
        await adminClient.from("workspace_invitations").update({ status: "expired" }).eq("id", invitation_id);
        return jsonRes({ error: "Invitation has expired" }, 410);
      }

      // Check if already a member
      const { data: existing } = await adminClient
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", invitation.workspace_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing) {
        await adminClient.from("workspace_invitations").update({ status: "accepted" }).eq("id", invitation_id);
        return jsonRes({ success: true, already_member: true });
      }

      // Add as member
      const { error: insertErr } = await adminClient
        .from("workspace_members")
        .insert({ workspace_id: invitation.workspace_id, user_id: user.id, role: invitation.role });
      if (insertErr) throw insertErr;

      // Mark invitation as accepted
      await adminClient.from("workspace_invitations").update({ status: "accepted" }).eq("id", invitation_id);

      await auditLog(adminClient, invitation.workspace_id, user.id, "accept_invitation", "workspace_member", user.id, { role: invitation.role });

      return jsonRes({ success: true, workspace_id: invitation.workspace_id });
    }

    if (action === "decline_invitation") {
      const { invitation_id } = params;
      if (!invitation_id) return jsonRes({ error: "invitation_id is required" }, 400);

      const { data: invitation } = await adminClient
        .from("workspace_invitations")
        .select("email")
        .eq("id", invitation_id)
        .eq("status", "pending")
        .single();
      if (!invitation || invitation.email.toLowerCase() !== user.email?.toLowerCase()) {
        return jsonRes({ error: "Invitation not found" }, 404);
      }

      await adminClient.from("workspace_invitations").update({ status: "declined" }).eq("id", invitation_id);
      return jsonRes({ success: true });
    }

    // All other actions require workspace_id and admin/owner role
    if (!workspace_id) return jsonRes({ error: "workspace_id is required" }, 400);

    const { data: callerRole } = await adminClient.rpc("get_workspace_role", {
      _user_id: user.id,
      _workspace_id: workspace_id,
    });
    if (!callerRole || !["owner", "admin"].includes(callerRole)) {
      return jsonRes({ error: "Forbidden: must be owner or admin" }, 403);
    }

    if (action === "invite_member") {
      const { email, role } = params;
      if (!email || !role) return jsonRes({ error: "email and role are required" }, 400);
      if (!["member", "admin"].includes(role)) return jsonRes({ error: "Invalid role" }, 400);

      // Only owner can add admins
      if (role === "admin" && callerRole !== "owner") {
        return jsonRes({ error: "Only workspace owner can add admins" }, 403);
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Check if already a member by looking up user
      const { data: { users } } = await adminClient.auth.admin.listUsers();
      const targetUser = users.find((u: any) => u.email?.toLowerCase() === normalizedEmail);

      if (targetUser) {
        // Check if already a member
        const { data: existing } = await adminClient
          .from("workspace_members")
          .select("id")
          .eq("workspace_id", workspace_id)
          .eq("user_id", targetUser.id)
          .maybeSingle();
        if (existing) {
          return jsonRes({ error: "User is already a member of this workspace" }, 409);
        }
      }

      // Check if there's already a pending invitation
      const { data: existingInvite } = await adminClient
        .from("workspace_invitations")
        .select("id, status")
        .eq("workspace_id", workspace_id)
        .eq("email", normalizedEmail)
        .eq("status", "pending")
        .maybeSingle();
      if (existingInvite) {
        return jsonRes({ error: "An invitation is already pending for this email" }, 409);
      }

      // If user exists, add directly as member (backward compat)
      if (targetUser) {
        const { error: insertErr } = await adminClient
          .from("workspace_members")
          .insert({ workspace_id, user_id: targetUser.id, role });
        if (insertErr) throw insertErr;

        await auditLog(adminClient, workspace_id, user.id, "invite_member", "workspace_member", targetUser.id, { email: normalizedEmail, role, direct: true });

        return jsonRes({ success: true, user_id: targetUser.id, email: targetUser.email, status: "added" });
      }

      // User doesn't exist yet — create a pending invitation
      // Upsert: remove any previous declined/expired invitation for same email+workspace
      await adminClient
        .from("workspace_invitations")
        .delete()
        .eq("workspace_id", workspace_id)
        .eq("email", normalizedEmail)
        .in("status", ["declined", "expired"]);

      const { error: inviteErr } = await adminClient
        .from("workspace_invitations")
        .insert({
          workspace_id,
          email: normalizedEmail,
          role,
          invited_by: user.id,
          status: "pending",
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
      if (inviteErr) throw inviteErr;

      await auditLog(adminClient, workspace_id, user.id, "invite_member", "workspace_invitation", null, { email: normalizedEmail, role, status: "pending" });

      return jsonRes({ success: true, email: normalizedEmail, status: "pending" });
    }

    if (action === "cancel_invitation") {
      const { invitation_id } = params;
      if (!invitation_id) return jsonRes({ error: "invitation_id is required" }, 400);

      const { error } = await adminClient
        .from("workspace_invitations")
        .delete()
        .eq("id", invitation_id)
        .eq("workspace_id", workspace_id);
      if (error) throw error;

      await auditLog(adminClient, workspace_id, user.id, "cancel_invitation", "workspace_invitation", invitation_id);
      return jsonRes({ success: true });
    }

    if (action === "list_pending_invitations") {
      const { data: invitations, error } = await adminClient
        .from("workspace_invitations")
        .select("id, email, role, status, created_at, expires_at, invited_by")
        .eq("workspace_id", workspace_id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return jsonRes({ invitations: invitations || [] });
    }

    if (action === "update_role") {
      const { member_id, role } = params;
      if (role === "owner") return jsonRes({ error: "Cannot assign owner role" }, 400);
      if (!["member", "admin"].includes(role)) return jsonRes({ error: "Invalid role" }, 400);
      // Only owner can promote to admin
      if (role === "admin" && callerRole !== "owner") {
        return jsonRes({ error: "Only workspace owner can promote to admin" }, 403);
      }
      const { error } = await adminClient
        .from("workspace_members")
        .update({ role })
        .eq("id", member_id)
        .eq("workspace_id", workspace_id);
      if (error) throw error;
      await auditLog(adminClient, workspace_id, user.id, "update_role", "workspace_member", member_id, { new_role: role });
      return jsonRes({ success: true });
    }

    if (action === "remove_member") {
      const { member_id } = params;
      const { data: member } = await adminClient
        .from("workspace_members")
        .select("role")
        .eq("id", member_id)
        .single();
      if (member?.role === "owner") {
        return jsonRes({ error: "Cannot remove workspace owner" }, 400);
      }
      const { error } = await adminClient
        .from("workspace_members")
        .delete()
        .eq("id", member_id)
        .eq("workspace_id", workspace_id);
      if (error) throw error;
      await auditLog(adminClient, workspace_id, user.id, "remove_member", "workspace_member", member_id);
      return jsonRes({ success: true });
    }

    if (action === "rename_workspace") {
      const { name } = params;
      if (!name?.trim()) return jsonRes({ error: "Name is required" }, 400);
      if (callerRole !== "owner") {
        return jsonRes({ error: "Only workspace owner can rename" }, 403);
      }
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const { error } = await adminClient
        .from("workspaces")
        .update({ name: name.trim(), slug, updated_at: new Date().toISOString() })
        .eq("id", workspace_id);
      if (error) throw error;
      await auditLog(adminClient, workspace_id, user.id, "rename_workspace", "workspace", workspace_id, { new_name: name.trim() });
      return jsonRes({ success: true });
    }

    if (action === "list_members") {
      const { data: members, error } = await adminClient
        .from("workspace_members")
        .select("id, user_id, role, created_at")
        .eq("workspace_id", workspace_id)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const { data: { users } } = await adminClient.auth.admin.listUsers();
      const enriched = members?.map((m: any) => {
        const u = users.find((u: any) => u.id === m.user_id);
        return { ...m, email: u?.email || "Unknown" };
      });

      return jsonRes({ members: enriched });
    }

    return jsonRes({ error: "Unknown action" }, 400);
  } catch (err) {
    return jsonRes({ error: err.message }, 500);
  }
});
