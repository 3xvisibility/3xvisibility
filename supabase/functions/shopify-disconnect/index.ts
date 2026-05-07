import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Disconnects a Shopify store:
 * 1. Reads the access token from shopify_connections
 * 2. Revokes the token via Shopify's REST API
 * 3. Deletes the shopify_connections row
 * 4. Marks the website as "disconnected" and clears credentials
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

    // Verify user
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

    const { website_id } = await req.json();
    if (!website_id) {
      return new Response(JSON.stringify({ error: "website_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the website and verify ownership via workspace membership
    const { data: site, error: siteError } = await supabase
      .from("websites")
      .select("*")
      .eq("id", website_id)
      .eq("type", "shopify")
      .maybeSingle();

    if (siteError || !site) {
      return new Response(JSON.stringify({ error: "Shopify site not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is workspace member
    const { data: isMember } = await supabase.rpc("is_workspace_member", {
      _user_id: user.id,
      _workspace_id: site.workspace_id,
    });
    if (!isMember) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up access token from shopify_connections
    const shopDomain = (site.credentials as Record<string, string> | null)?.shop_domain
      || site.url?.replace(/^https?:\/\//, "").replace(/\/+$/, "");

    let revokeSuccess = false;

    const { data: conn } = await supabase
      .from("shopify_connections")
      .select("id, access_token")
      .eq("website_id", website_id)
      .maybeSingle();

    if (conn?.access_token && shopDomain) {
      try {
        const revokeRes = await fetch(
          `https://${shopDomain}/admin/api_permissions/current.json`,
          {
            method: "DELETE",
            headers: {
              "X-Shopify-Access-Token": conn.access_token,
              "Content-Type": "application/json",
            },
          },
        );
        revokeSuccess = revokeRes.ok || revokeRes.status === 204;
        if (!revokeSuccess) {
          const errText = await revokeRes.text();
          console.warn(`Token revocation returned ${revokeRes.status}: ${errText}`);
        }
      } catch (err) {
        console.warn("Could not revoke token:", err);
      }
    }

    // Delete the shopify_connections row
    if (conn?.id) {
      await supabase.from("shopify_connections").delete().eq("id", conn.id);
    }

    // Mark website as disconnected and clear credentials
    const { error: updateError } = await supabase
      .from("websites")
      .update({ status: "disconnected", credentials: {} })
      .eq("id", website_id);

    if (updateError) {
      console.error("Failed to update website:", updateError);
      return new Response(JSON.stringify({ error: "Failed to update website status" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        token_revoked: revokeSuccess,
        message: revokeSuccess
          ? "Store disconnected and access token revoked."
          : "Store disconnected. Token revocation was skipped or failed.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("shopify-disconnect error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
