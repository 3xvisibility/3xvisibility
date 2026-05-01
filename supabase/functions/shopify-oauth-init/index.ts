import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Generates a Shopify OAuth authorization URL.
 * Each user provides their own Shopify App Client ID.
 * The client_secret is stored temporarily so the callback can use it.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { shop_domain, client_id, client_secret, workspace_id, site_name, language } = await req.json();

    if (!shop_domain || !client_id || !client_secret || !workspace_id) {
      return new Response(JSON.stringify({ error: "shop_domain, client_id, client_secret, and workspace_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize domain
    const domain = shop_domain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    if (!/\.myshopify\.com$/i.test(domain)) {
      return new Response(JSON.stringify({ error: "Shop domain must end with .myshopify.com" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate a random nonce/state
    const stateBytes = new Uint8Array(24);
    crypto.getRandomValues(stateBytes);
    const state = Array.from(stateBytes).map(b => b.toString(16).padStart(2, "0")).join("");

    // Store the pending OAuth in DB so the callback can retrieve it
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { error: insertError } = await supabase.from("shopify_oauth_states").insert({
      state,
      user_id: user.id,
      workspace_id,
      shop_domain: domain,
      client_id,
      client_secret,
      site_name: site_name || domain,
      language: language || null,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min expiry
    });

    if (insertError) {
      console.error("Failed to store OAuth state:", insertError);
      return new Response(JSON.stringify({ error: "Failed to initiate OAuth" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const scopes = "read_products,write_products,read_inventory,write_inventory,read_content,write_content";
    const callbackUrl = `${supabaseUrl}/functions/v1/shopify-oauth-callback`;
    const authUrl = `https://${domain}/admin/oauth/authorize?client_id=${encodeURIComponent(client_id)}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${state}`;

    return new Response(JSON.stringify({ auth_url: authUrl, state }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("shopify-oauth-init error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
