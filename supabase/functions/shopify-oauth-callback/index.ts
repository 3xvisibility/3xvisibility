import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

/**
 * Shopify OAuth callback handler.
 * Exchanges the authorization code for an access token using the user's own client credentials.
 * Then saves the website with the token and redirects back to the app.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const shopParam = url.searchParams.get("shop");

  // We'll redirect the user back to the app with status
  const appBase = Deno.env.get("APP_URL") || "https://page-generator-project.lovable.app";
  const redirectError = (msg: string) =>
    Response.redirect(`${appBase}/w/default/websites?shopify_oauth=error&message=${encodeURIComponent(msg)}`, 302);
  const redirectSuccess = (wsSlug: string) =>
    Response.redirect(`${appBase}/w/${wsSlug}/websites?shopify_oauth=success`, 302);

  if (!code || !state) {
    return redirectError("Missing code or state parameter");
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Look up the OAuth state
    const { data: oauthState, error: stateError } = await supabase
      .from("shopify_oauth_states")
      .select("*")
      .eq("state", state)
      .maybeSingle();

    if (stateError || !oauthState) {
      console.error("OAuth state not found:", stateError);
      return redirectError("Invalid or expired OAuth state");
    }

    // Check expiry
    if (new Date(oauthState.expires_at) < new Date()) {
      await supabase.from("shopify_oauth_states").delete().eq("id", oauthState.id);
      return redirectError("OAuth session expired. Please try again.");
    }

    const domain = oauthState.shop_domain;

    // Exchange code for access token
    const tokenRes = await fetch(`https://${domain}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: oauthState.client_id,
        client_secret: oauthState.client_secret,
        code,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Token exchange failed:", errText);
      await supabase.from("shopify_oauth_states").delete().eq("id", oauthState.id);
      return redirectError(`Token exchange failed (${tokenRes.status})`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      await supabase.from("shopify_oauth_states").delete().eq("id", oauthState.id);
      return redirectError("No access token received from Shopify");
    }

    // Save the website connection
    const { error: insertError } = await supabase.from("websites").insert({
      name: oauthState.site_name || domain,
      url: `https://${domain}`,
      type: "shopify",
      status: "connected",
      user_id: oauthState.user_id,
      workspace_id: oauthState.workspace_id,
      language: oauthState.language,
      credentials: {
        admin_api_token: accessToken,
        shop_domain: domain,
        oauth_client_id: oauthState.client_id,
        auth_method: "oauth",
        scopes: tokenData.scope || "",
      },
    });

    if (insertError) {
      console.error("Failed to save website:", insertError);
      await supabase.from("shopify_oauth_states").delete().eq("id", oauthState.id);
      return redirectError("Failed to save connection");
    }

    // Clean up the state
    await supabase.from("shopify_oauth_states").delete().eq("id", oauthState.id);

    // Get workspace slug for redirect
    const { data: ws } = await supabase
      .from("workspaces")
      .select("slug")
      .eq("id", oauthState.workspace_id)
      .maybeSingle();

    return redirectSuccess(ws?.slug || "default");
  } catch (err: any) {
    console.error("shopify-oauth-callback error:", err);
    return redirectError(err.message || "Internal error");
  }
});
