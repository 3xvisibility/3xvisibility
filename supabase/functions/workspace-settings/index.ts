import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify the calling user
    const authHeader = req.headers.get("Authorization")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, workspace_id, ...params } = await req.json();

    // Verify caller is owner or admin of workspace
    const { data: callerRole } = await adminClient.rpc("get_workspace_role", {
      _user_id: user.id,
      _workspace_id: workspace_id,
    });
    if (!callerRole || !["owner", "admin"].includes(callerRole)) {
      return new Response(JSON.stringify({ error: "Forbidden: must be owner or admin" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "invite_member") {
      const { email, role } = params;
      if (!email || !role) {
        return new Response(JSON.stringify({ error: "email and role are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Only owner can add admins
      if (role === "admin" && callerRole !== "owner") {
        return new Response(JSON.stringify({ error: "Only workspace owner can add admins" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Look up user by email using admin API
      const { data: { users }, error: listErr } = await adminClient.auth.admin.listUsers();
      if (listErr) throw listErr;
      const targetUser = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      if (!targetUser) {
        return new Response(JSON.stringify({ error: "No user found with that email. They must sign up first." }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if already a member
      const { data: existing } = await adminClient
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", workspace_id)
        .eq("user_id", targetUser.id)
        .maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ error: "User is already a member of this workspace" }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: insertErr } = await adminClient
        .from("workspace_members")
        .insert({ workspace_id, user_id: targetUser.id, role });
      if (insertErr) throw insertErr;

      return new Response(JSON.stringify({ success: true, user_id: targetUser.id, email: targetUser.email }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_role") {
      const { member_id, role } = params;
      if (role === "owner") {
        return new Response(JSON.stringify({ error: "Cannot assign owner role" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await adminClient
        .from("workspace_members")
        .update({ role })
        .eq("id", member_id)
        .eq("workspace_id", workspace_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "remove_member") {
      const { member_id } = params;
      // Don't allow removing owner
      const { data: member } = await adminClient
        .from("workspace_members")
        .select("role")
        .eq("id", member_id)
        .single();
      if (member?.role === "owner") {
        return new Response(JSON.stringify({ error: "Cannot remove workspace owner" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await adminClient
        .from("workspace_members")
        .delete()
        .eq("id", member_id)
        .eq("workspace_id", workspace_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "rename_workspace") {
      const { name } = params;
      if (!name?.trim()) {
        return new Response(JSON.stringify({ error: "Name is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Only owner can rename
      if (callerRole !== "owner") {
        return new Response(JSON.stringify({ error: "Only workspace owner can rename" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const { error } = await adminClient
        .from("workspaces")
        .update({ name: name.trim(), slug, updated_at: new Date().toISOString() })
        .eq("id", workspace_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list_members") {
      const { data: members, error } = await adminClient
        .from("workspace_members")
        .select("id, user_id, role, created_at")
        .eq("workspace_id", workspace_id)
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Get emails for each member via admin API
      const { data: { users } } = await adminClient.auth.admin.listUsers();
      const enriched = members?.map((m: any) => {
        const u = users.find((u: any) => u.id === m.user_id);
        return { ...m, email: u?.email || "Unknown" };
      });

      return new Response(JSON.stringify({ members: enriched }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
