import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "get-stats") {
      const { data: authUsers, error: usersError } = await serviceClient.auth.admin.listUsers({ perPage: 1000 });
      if (usersError) throw usersError;

      const { data: profiles } = await serviceClient.from("profiles").select("*");
      const { data: rolesData } = await serviceClient.from("user_roles").select("user_id, role");
      const { data: campaigns } = await serviceClient.from("campaigns").select("*");
      const { data: generatedPages } = await serviceClient.from("generated_pages").select("id, status, campaign_id, created_at, title, user_id");
      const { data: subscriptions } = await serviceClient.from("subscriptions").select("*");
      const { data: websites } = await serviceClient.from("websites").select("id, user_id, type, status");

      // Build activity feed from recent events
      const activity: { type: string; message: string; timestamp: string; user_email?: string }[] = [];

      // Recent signups (last 50)
      const sortedUsers = [...(authUsers?.users || [])].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 50);
      for (const u of sortedUsers) {
        activity.push({ type: "signup", message: `New user signed up`, timestamp: u.created_at, user_email: u.email });
      }

      // Recent campaigns (last 50)
      const sortedCampaigns = [...(campaigns || [])].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 50);
      for (const c of sortedCampaigns) {
        const cUser = authUsers?.users?.find((u: any) => u.id === c.user_id);
        activity.push({ type: "campaign", message: `Campaign "${c.name}" created (${c.status})`, timestamp: c.created_at, user_email: cUser?.email });
      }

      // Recent pages (last 50)
      const sortedPages = [...(generatedPages || [])].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 50);
      for (const p of sortedPages) {
        const pUser = authUsers?.users?.find((u: any) => u.id === p.user_id);
        activity.push({ type: "page", message: `Page "${p.title}" generated (${p.status})`, timestamp: p.created_at, user_email: pUser?.email });
      }

      // Sort all activity by timestamp descending, take top 100
      activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const recentActivity = activity.slice(0, 100);
      const users = (authUsers?.users || []).map((u: any) => {
        const profile = profiles?.find((p: any) => p.user_id === u.id);
        const sub = subscriptions?.find((s: any) => s.user_id === u.id);
        const userCampaigns = campaigns?.filter((c: any) => c.user_id === u.id) || [];
        const userPages = generatedPages?.filter((p: any) =>
          userCampaigns.some((c: any) => c.id === p.campaign_id)
        ) || [];
        const userWebsites = websites?.filter((w: any) => w.user_id === u.id) || [];

        return {
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          full_name: profile?.full_name || null,
          company: profile?.company || null,
          plan: sub?.plan || "free",
          pages_used: sub?.pages_used || 0,
          pages_limit: sub?.pages_limit || 0,
          subscription_id: sub?.id || null,
          campaigns_count: userCampaigns.length,
          pages_count: userPages.length,
          websites_count: userWebsites.length,
        };
      });

      const totalPages = generatedPages?.length || 0;
      const publishedPages = generatedPages?.filter((p: any) => p.status === "published").length || 0;
      const failedPages = generatedPages?.filter((p: any) => p.status === "failed").length || 0;
      const activeCampaigns = campaigns?.filter((c: any) => c.status === "processing" || c.status === "queued").length || 0;
      const completedCampaigns = campaigns?.filter((c: any) => c.status === "completed").length || 0;

      return new Response(
        JSON.stringify({
          users,
          campaigns: campaigns || [],
          subscriptions: subscriptions || [],
          activity: recentActivity,
          overview: {
            total_users: users.length,
            total_campaigns: campaigns?.length || 0,
            active_campaigns: activeCampaigns,
            completed_campaigns: completedCampaigns,
            total_pages: totalPages,
            published_pages: publishedPages,
            failed_pages: failedPages,
            total_websites: websites?.length || 0,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get-ai-stats") {
      const { data: logs } = await serviceClient
        .from("ai_credit_gate_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      const { data: authUsers } = await serviceClient.auth.admin.listUsers({ perPage: 1000 });
      const userMap = new Map((authUsers?.users || []).map((u: any) => [u.id, u.email]));

      const enriched = (logs || []).map((l: any) => ({
        ...l,
        user_email: l.user_id ? userMap.get(l.user_id) || null : null,
      }));

      // Aggregate by status & reason
      const byStatus: Record<string, number> = {};
      const byReason: Record<string, number> = {};
      const byPromptType: Record<string, number> = {};
      for (const l of enriched) {
        byStatus[l.status] = (byStatus[l.status] || 0) + 1;
        if (l.reason) byReason[l.reason] = (byReason[l.reason] || 0) + 1;
        if (l.prompt_type) byPromptType[l.prompt_type] = (byPromptType[l.prompt_type] || 0) + 1;
      }

      return new Response(
        JSON.stringify({ logs: enriched, byStatus, byReason, byPromptType, total: enriched.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "ban-user") {
      const { target_user_id, banned, reason } = body;
      if (!target_user_id) return new Response(JSON.stringify({ error: "target_user_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (target_user_id === user.id) return new Response(JSON.stringify({ error: "Cannot ban yourself" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const isBan = banned !== false;
      const { error } = await serviceClient.from("profiles").update({
        is_banned: isBan,
        banned_at: isBan ? new Date().toISOString() : null,
        banned_reason: isBan ? (reason || null) : null,
      }).eq("user_id", target_user_id);
      if (error) throw error;
      // Also revoke active sessions when banning
      if (isBan) {
        try { await serviceClient.auth.admin.signOut(target_user_id, "global" as any); } catch { /* best-effort */ }
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete-user") {
      const { target_user_id } = body;
      if (!target_user_id) return new Response(JSON.stringify({ error: "target_user_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (target_user_id === user.id) return new Response(JSON.stringify({ error: "Cannot delete yourself" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { error } = await serviceClient.auth.admin.deleteUser(target_user_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "set-role") {
      const { target_user_id, role } = body;
      if (!target_user_id || !role) return new Response(JSON.stringify({ error: "target_user_id and role required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const allowed = ["admin", "moderator", "user"];
      if (!allowed.includes(role)) return new Response(JSON.stringify({ error: "Invalid role" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (target_user_id === user.id && role !== "admin") {
        return new Response(JSON.stringify({ error: "Cannot demote yourself" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      // Remove all existing roles, then insert new one (single active role per user)
      await serviceClient.from("user_roles").delete().eq("user_id", target_user_id);
      const { error } = await serviceClient.from("user_roles").insert({ user_id: target_user_id, role });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "get-user-roles") {
      const { data: roles, error } = await serviceClient.from("user_roles").select("user_id, role");
      if (error) throw error;
      return new Response(JSON.stringify({ roles: roles || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "update-subscription") {
      const { subscription_id, user_id, plan, pages_limit, pages_used } = body;

      if (subscription_id) {
        // Update existing subscription
        const updates: Record<string, any> = {};
        if (plan !== undefined) updates.plan = plan;
        if (pages_limit !== undefined) updates.pages_limit = pages_limit;
        if (pages_used !== undefined) updates.pages_used = pages_used;
        updates.updated_at = new Date().toISOString();

        const { error } = await serviceClient
          .from("subscriptions")
          .update(updates)
          .eq("id", subscription_id);

        if (error) throw error;
      } else if (user_id) {
        // Create new subscription for user
        const { error } = await serviceClient.from("subscriptions").insert({
          user_id,
          plan: plan || "starter",
          pages_limit: pages_limit ?? 100,
          pages_used: pages_used ?? 0,
        });
        if (error) throw error;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
