import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { encrypt } from "../_shared/crypto.ts";

const APP_BASE = "https://page-generator-project.lovable.app";

/**
 * Shopify OAuth callback handler — hardened.
 *
 * Security measures:
 * 1. HMAC signature verification using the user's client_secret
 * 2. Shop domain cross-check (Shopify `shop` param vs stored domain)
 * 3. State consumed (deleted) BEFORE token exchange to prevent replay
 * 4. Expiry check on the OAuth state row
 * 5. Timing-safe HMAC comparison
 */

/** Timing-safe comparison for two strings */
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  if (a.length !== b.length) return false;
  const enc = new TextEncoder();
  const keyData = enc.encode("compare-key");
  const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const [sigA, sigB] = await Promise.all([
    crypto.subtle.sign("HMAC", key, enc.encode(a)),
    crypto.subtle.sign("HMAC", key, enc.encode(b)),
  ]);
  const viewA = new Uint8Array(sigA);
  const viewB = new Uint8Array(sigB);
  let result = 0;
  for (let i = 0; i < viewA.length; i++) result |= viewA[i] ^ viewB[i];
  return result === 0;
}

/** Verify the HMAC Shopify sends on the callback URL */
async function verifyShopifyHmac(query: URLSearchParams, clientSecret: string): Promise<boolean> {
  const hmac = query.get("hmac");
  if (!hmac) return false;

  // Build the message from all params except 'hmac' itself, sorted alphabetically
  const entries: [string, string][] = [];
  query.forEach((value, key) => {
    if (key !== "hmac") entries.push([key, value]);
  });
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  const message = entries.map(([k, v]) => `${k}=${v}`).join("&");

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(clientSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");

  return timingSafeEqual(computed, hmac);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const shopParam = url.searchParams.get("shop");

  const appBase = APP_BASE;
  const redirectError = (msg: string, errorCode?: string) => {
    const params = new URLSearchParams({
      shopify_oauth: "error",
      message: msg,
    });
    if (errorCode) params.set("error_code", errorCode);
    return Response.redirect(`${appBase}/shopify/callback?${params.toString()}`, 302);
  };

  // ── 0. Require all three params — reject forged callbacks missing any one ──
  if (!code || !state || !shopParam) {
    return redirectError(
      !code ? "Missing authorization code" : !state ? "Missing state parameter" : "Missing shop parameter",
      "missing_params",
    );
  }

  // Basic format validation — state must be hex, shop must look like a domain
  if (!/^[a-f0-9]{48}$/i.test(state)) {
    return redirectError("Invalid state format", "invalid_state");
  }
  if (!/^[a-z0-9][a-z0-9\-]*\.myshopify\.com$/i.test(shopParam)) {
    return redirectError("Invalid shop domain format", "invalid_shop");
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── 1. Look up & consume the OAuth state atomically ──
    // Select then immediately delete to prevent replay attacks.
    const { data: oauthState, error: stateError } = await supabase
      .from("shopify_oauth_states")
      .select("*")
      .eq("state", state)
      .maybeSingle();

    if (stateError || !oauthState) {
      console.error("OAuth state not found or already consumed:", stateError);
      return redirectError("Invalid or expired OAuth state — it may have already been used", "invalid_state");
    }

    // Delete immediately — single-use token. Even if later steps fail the
    // state cannot be replayed.
    await supabase.from("shopify_oauth_states").delete().eq("id", oauthState.id);

    // ── 2. Expiry check ──
    if (new Date(oauthState.expires_at) < new Date()) {
      return redirectError("OAuth session expired. Please try again.", "expired");
    }

    // ── 3. Shop domain cross-check (mandatory) ──
    const storedDomain = oauthState.shop_domain.toLowerCase();
    const callbackShop = shopParam!.toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    if (callbackShop !== storedDomain) {
      console.error(`Shop domain mismatch: expected ${storedDomain}, got ${callbackShop}`);
      return redirectError("Shop domain mismatch — possible tampering", "domain_mismatch");
    }

    // ── 4. HMAC signature verification ──
    const hmacValid = await verifyShopifyHmac(url.searchParams, oauthState.client_secret);
    if (!hmacValid) {
      console.error("HMAC verification failed for state", state);
      return redirectError("Signature verification failed — request may have been tampered with", "hmac_failed");
    }

    // ── 5. Exchange code for access token ──
    // Resolve canonical shop_domain (lowercase, no protocol/trailing slash)
    const domain = String(oauthState.shop_domain || "")
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "");
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
      return redirectError(`Token exchange failed (${tokenRes.status})`, "token_exchange_failed");
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return redirectError("No access token received from Shopify", "no_token");
    }

    // ── 6. Save or refresh the website row ──
    const websitePayload = {
      name: oauthState.site_name || domain,
      url: `https://${domain}`,
      type: "shopify",
      status: "connected",
      user_id: oauthState.user_id,
      workspace_id: oauthState.workspace_id,
      language: oauthState.language,
      credentials: {
        shop_domain: domain,
        oauth_client_id: oauthState.client_id,
        auth_method: "oauth",
        scopes: tokenData.scope || "",
      },
    };

    const { data: existingWebsite, error: existingWebsiteError } = await supabase
      .from("websites")
      .select("id")
      .eq("workspace_id", oauthState.workspace_id)
      .eq("type", "shopify")
      .eq("url", websitePayload.url)
      .maybeSingle();

    if (existingWebsiteError) {
      console.error("Failed to check existing Shopify website:", existingWebsiteError);
      return redirectError("Failed to save connection");
    }

    let websiteId: string;

    if (existingWebsite?.id) {
      websiteId = existingWebsite.id;
      const { error: updateError } = await supabase
        .from("websites")
        .update(websitePayload)
        .eq("id", existingWebsite.id);
      if (updateError) {
        console.error("Failed to refresh website connection:", updateError);
        return redirectError("Failed to save connection");
      }
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("websites")
        .insert(websitePayload)
        .select("id")
        .single();
      if (insertError || !inserted) {
        console.error("Failed to save website:", insertError);
        return redirectError("Failed to save connection");
      }
      websiteId = inserted.id;
    }

    // ── 7. Upsert into shopify_connections (per-user per-shop token, encrypted) ──
    const encryptedToken = await encrypt(accessToken);
    const { error: connError } = await supabase
      .from("shopify_connections")
      .upsert(
        {
          user_id: oauthState.user_id,
          workspace_id: oauthState.workspace_id,
          website_id: websiteId,
          shop_domain: domain,
          access_token: encryptedToken,
          scopes: tokenData.scope || "",
        },
        { onConflict: "user_id,shop_domain" },
      );

    if (connError) {
      console.error("Failed to save shopify_connections:", connError);
      return redirectError("Failed to save access token");
    }

    // ── 9. Redirect back to the in-app callback page (which toasts + routes to dashboard) ──
    const { data: ws } = await supabase
      .from("workspaces")
      .select("slug")
      .eq("id", oauthState.workspace_id)
      .maybeSingle();

    const successParams = new URLSearchParams({
      shopify_oauth: "success",
      shop: domain,
    });
    if (ws?.slug) successParams.set("workspace", ws.slug);

    return Response.redirect(
      `${appBase}/shopify/callback?${successParams.toString()}`,
      302,
    );
  } catch (err: any) {
    console.error("shopify-oauth-callback error:", err);
    return redirectError(err.message || "Internal error");
  }
});
