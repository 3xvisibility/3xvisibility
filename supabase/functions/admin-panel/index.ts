import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      const { data: campaigns } = await serviceClient.from("campaigns").select("*");
      const { data: generatedPages } = await serviceClient.from("generated_pages").select("id, status, campaign_id, created_at");
      const { data: subscriptions } = await serviceClient.from("subscriptions").select("*");
      const { data: websites } = await serviceClient.from("websites").select("id, user_id, type, status");

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
