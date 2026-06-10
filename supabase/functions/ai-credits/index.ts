import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CREDIT_COSTS: Record<string, number> = {
  short_content: 1,
  medium_content: 2,
  full_page: 4,
  seo_optimization: 2,
  rewrite: 1,
  translation: 2,
  social_caption: 1,
  product_description: 2,
  template_scan: 2,
  default: 1,
};

const PLAN_CREDITS: Record<string, number> = {
  free: 10,
  starter: 10,
  pro: 1000,
  agency: 5000,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { supabase: sbCfg } = await import("../_shared/config.ts").then(m => m.edgeConfig);
    const supabase = createClient(sbCfg.url, sbCfg.serviceRoleKey);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const url = new URL(req.url);
    let action = url.searchParams.get("action");

    // Also support action from JSON body (supabase.functions.invoke sends POST with body)
    let bodyData: Record<string, unknown> = {};
    if (req.method === "POST") {
      try {
        bodyData = await req.json();
        if (!action && bodyData.action) action = String(bodyData.action);
      } catch { /* no body */ }
    }
    if (!action) action = "check";

    if (action === "check") {
      // Return current credits
      const { data: credits } = await supabase.from("ai_credits").select("*").eq("user_id", user.id).maybeSingle();

      if (!credits) {
        // Initialize for existing user
        const totalCredits = PLAN_CREDITS.starter;
        const { data: newCredits } = await supabase.from("ai_credits").insert({
          user_id: user.id, plan: "starter", total_credits: totalCredits,
          used_credits: 0, remaining_credits: totalCredits,
        }).select().single();
        return new Response(JSON.stringify({ success: true, credits: newCredits }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Auto-reset if past reset date
      if (new Date() >= new Date(credits.credits_reset_at)) {
        const { data: reset } = await supabase.from("ai_credits").update({
          used_credits: 0, remaining_credits: credits.total_credits,
          credits_reset_at: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("user_id", user.id).select().single();
        return new Response(JSON.stringify({ success: true, credits: reset }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ success: true, credits }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "deduct") {
      const body = bodyData.prompt_type ? bodyData : await req.json().catch(() => ({}));
      const promptType = (body.prompt_type as string) || "default";
      const creditsNeeded = body.credits || CREDIT_COSTS[promptType] || CREDIT_COSTS.default;

      // Use the DB function for atomic deduction
      const { data: result, error: rpcErr } = await supabase.rpc("deduct_ai_credits", {
        p_user_id: user.id,
        p_credits: creditsNeeded,
        p_prompt_type: promptType,
        p_model: body.model || null,
        p_metadata: body.metadata || {},
      });

      if (rpcErr) {
        return new Response(JSON.stringify({ success: false, error: rpcErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (!result.success) {
        return new Response(JSON.stringify({
          success: false,
          error: "insufficient_credits",
          remaining: result.remaining,
          message: "You have no credits left. Please upgrade your plan.",
        }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ success: true, remaining: result.remaining }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "usage") {
      const { data: usage } = await supabase.from("ai_usage_log").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
      return new Response(JSON.stringify({ success: true, usage: usage || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Admin: add credits
    if (action === "add_credits" && req.method === "POST") {
      const body = await req.json();
      const targetUserId = body.user_id;
      const extraCredits = body.credits || 0;

      if (!targetUserId || extraCredits <= 0) {
        return new Response(JSON.stringify({ error: "Invalid params" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: updated, error: updErr } = await supabase.from("ai_credits")
        .update({
          total_credits: supabase.rpc ? undefined : undefined, // handled via raw SQL below
        }).eq("user_id", targetUserId);

      // Use direct SQL via RPC for atomic add
      const { error: addErr } = await supabase.rpc("deduct_ai_credits", {
        p_user_id: targetUserId,
        p_credits: -extraCredits, // negative = add
        p_prompt_type: "admin_add",
        p_model: null,
        p_metadata: { added_by: user.id },
      });

      return new Response(JSON.stringify({ success: !addErr, error: addErr?.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
