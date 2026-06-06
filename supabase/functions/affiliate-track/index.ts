import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fallback credits granted to the referrer when a referred signup is verified
// (used only if no row exists in referral_reward_settings)
const DEFAULT_REWARD_CREDITS = 50;
// Commission amount recorded on the referral (informational / payouts)
const REWARD_COMMISSION = 5;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sanitizeCode(raw: string): string {
  return String(raw)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 40);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    // ---- Public: record a click on a referral link ----
    if (action === "click") {
      const code = sanitizeCode(body.code || "");
      if (!code) return json({ success: false, error: "missing_code" }, 400);

      const { data: link } = await admin
        .from("affiliate_links")
        .select("id,total_clicks,is_active")
        .eq("code", code)
        .maybeSingle();

      if (!link || !link.is_active) return json({ success: true, tracked: false });

      await admin.from("affiliate_clicks").insert({
        affiliate_link_id: link.id,
        referrer: body.referrer || null,
        user_agent: body.user_agent || null,
      });

      await admin
        .from("affiliate_links")
        .update({ total_clicks: (link.total_clicks || 0) + 1, updated_at: new Date().toISOString() })
        .eq("id", link.id);

      return json({ success: true, tracked: true });
    }

    // All remaining actions require an authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ success: false, error: "unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !user) return json({ success: false, error: "unauthorized" }, 401);

    // ---- Attribute a verified signup to a referral link & reward the referrer ----
    if (action === "attribute") {
      const code = sanitizeCode(body.code || "");
      if (!code) return json({ success: false, error: "missing_code" }, 400);

      const { data: link } = await admin
        .from("affiliate_links")
        .select("id,user_id,total_conversions,total_earned,total_credited")
        .eq("code", code)
        .maybeSingle();

      // No such link, or self-referral → ignore silently
      if (!link || link.user_id === user.id) return json({ success: true, attributed: false });

      // Idempotency: only one attribution per referred user
      const { data: existing } = await admin
        .from("affiliate_referrals")
        .select("id")
        .eq("affiliate_link_id", link.id)
        .eq("referred_user_id", user.id)
        .maybeSingle();
      if (existing) return json({ success: true, attributed: false, reason: "already_attributed" });

      const now = new Date().toISOString();
      await admin.from("affiliate_referrals").insert({
        affiliate_link_id: link.id,
        referred_user_id: user.id,
        status: "verified",
        commission_amount: REWARD_COMMISSION,
        converted_at: now,
      });

      await admin
        .from("affiliate_links")
        .update({
          total_conversions: (link.total_conversions || 0) + 1,
          total_earned: Number(link.total_earned || 0) + REWARD_COMMISSION,
          total_credited: Number(link.total_credited || 0) + REWARD_CREDITS,
          updated_at: now,
        })
        .eq("id", link.id);

      // Reward the referrer with AI credits
      await admin.from("ai_credits").upsert({ user_id: link.user_id }, { onConflict: "user_id", ignoreDuplicates: true });
      const { data: credits } = await admin
        .from("ai_credits")
        .select("total_credits,remaining_credits")
        .eq("user_id", link.user_id)
        .maybeSingle();
      if (credits) {
        await admin
          .from("ai_credits")
          .update({
            total_credits: (credits.total_credits || 0) + REWARD_CREDITS,
            remaining_credits: (credits.remaining_credits || 0) + REWARD_CREDITS,
            updated_at: now,
          })
          .eq("user_id", link.user_id);
      }

      return json({ success: true, attributed: true, reward: REWARD_CREDITS });
    }

    // ---- Set a custom code / regenerate the referral link ----
    if (action === "set_code" || action === "regenerate") {
      let code: string;
      if (action === "regenerate") {
        code = `ref-${user.id.substring(0, 6)}-${Math.random().toString(36).substring(2, 8)}`;
      } else {
        code = sanitizeCode(body.code || "");
        if (code.length < 3) return json({ success: false, error: "code_too_short" }, 400);
      }

      // Ensure the user owns a link
      const { data: ownLink } = await admin
        .from("affiliate_links")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!ownLink) return json({ success: false, error: "no_link" }, 404);

      // Uniqueness check across all links
      const { data: taken } = await admin
        .from("affiliate_links")
        .select("id")
        .eq("code", code)
        .maybeSingle();
      if (taken && taken.id !== ownLink.id) return json({ success: false, error: "code_taken" }, 409);

      await admin
        .from("affiliate_links")
        .update({ code, updated_at: new Date().toISOString() })
        .eq("id", ownLink.id);

      return json({ success: true, code });
    }

    return json({ success: false, error: "invalid_action" }, 400);
  } catch (err) {
    return json({ success: false, error: (err as Error).message }, 500);
  }
});
