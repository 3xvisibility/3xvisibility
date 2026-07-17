import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createConnector } from "../_shared/connectors/factory.ts";
import type { WebsiteRecord } from "../_shared/connectors/factory.ts";

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function cleanCredentials(credentials: unknown): Record<string, string> {
  if (!credentials || typeof credentials !== "object" || Array.isArray(credentials)) return {};

  return Object.fromEntries(
    Object.entries(credentials as Record<string, unknown>)
      .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
      .map(([key, value]) => [key, String(value).trim()]),
  );
}

function hasWordPressConnectorKey(credentials: Record<string, string>) {
  return Boolean(
    credentials.pgp_connector_key ||
      credentials.connector_api_key ||
      credentials.pgp_connector_api_key ||
      credentials.wordpress_connector_key ||
      credentials.xxxv_connector_key ||
      credentials.xxxv_connector_api_key,
  );
}

function validateWordPressCredentials(credentials: Record<string, string>): string | null {
  if (hasWordPressConnectorKey(credentials)) return null;

  if (credentials.auth_method === "jwt") {
    return credentials.jwt_token || credentials.access_token
      ? null
      : "Enter a WordPress JWT token, or add the 3xVisibility Connector Key.";
  }

  if (!credentials.username || !credentials.app_password) {
    return "Enter the WordPress username and Application Password, or add the 3xVisibility Connector Key.";
  }

  return null;
}

async function resolveSavedWebsite(
  serviceClient: ReturnType<typeof createClient>,
  userClient: ReturnType<typeof createClient>,
  websiteId: string,
): Promise<WebsiteRecord> {
  const { data: visibleSite, error: visibilityError } = await userClient
    .from("websites")
    .select("id")
    .eq("id", websiteId)
    .maybeSingle();

  if (visibilityError || !visibleSite) {
    throw new Error("Website not found or you do not have access to it.");
  }

  const { data: site, error: siteError } = await serviceClient
    .from("websites")
    .select("id, url, type, credentials")
    .eq("id", websiteId)
    .maybeSingle();

  if (siteError || !site) {
    throw new Error("Website credentials could not be loaded. Reconnect the site and try again.");
  }

  return {
    id: site.id,
    url: site.url,
    type: site.type,
    credentials: cleanCredentials(site.credentials),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const { website_id } = body;
    let { url, type } = body;
    let credentials = cleanCredentials(body.credentials);

    let website: WebsiteRecord;
    if (website_id) {
      website = await resolveSavedWebsite(serviceClient, userClient, String(website_id));
      url = website.url;
      type = website.type;
      credentials = website.credentials || {};
    } else {
      website = { url, type, credentials };
    }

    if (!url || !type) {
      return jsonResponse({ success: false, error: "url and type are required" });
    }

    if (type === "wordpress") {
      const credentialError = validateWordPressCredentials(credentials);
      if (credentialError) {
        return jsonResponse({ success: false, error: credentialError });
      }
    }

    console.log(`[test-connection] type=${type} url=${url} cred_keys=${Object.keys(credentials || {}).join(",")}`);
    if (type === "shopify") {
      const token = credentials?.admin_api_token || credentials?.access_token || "";
      console.log(`[test-connection] shopify domain=${url} token_present=${token.length > 0}`);
    }
    const connector = await createConnector(website);
    const preflight = (connector as { preflight?: () => Promise<unknown> }).preflight;
    if (type === "wordpress" && typeof preflight === "function") {
      const info = await preflight.call(connector);
      return jsonResponse({ success: true, message: "3xVisibility WordPress Connector is ready", connector: info });
    }
    let ok = false;
    try {
      ok = await connector.testConnection();
    } catch (innerErr: any) {
      console.error(`[test-connection] ${type} threw:`, innerErr?.message || innerErr);
      throw new Error(innerErr?.message || `${type} connection test failed`);
    }

    if (!ok) {
      throw new Error(`${type} connection test failed (no detail returned by provider)`);
    }

    return jsonResponse({ success: true, message: `${type} connection successful` });
  } catch (err: any) {
    return jsonResponse({ success: false, error: err.message || "Connection test failed" });
  }
});
