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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { url, type, credentials } = await req.json();

    if (!url || !type) {
      return new Response(JSON.stringify({ error: "url and type are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = url.replace(/\/$/, "");

    if (type === "wordpress") {
      const auth = btoa(`${credentials.username}:${credentials.app_password}`);
      const response = await fetch(`${baseUrl}/wp-json/wp/v2/pages?per_page=1`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`WordPress connection failed [${response.status}]: ${err}`);
      }
      return new Response(JSON.stringify({ success: true, message: "WordPress connection successful" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "shopify") {
      const shopDomain = baseUrl.replace(/^https?:\/\//, "");
      const response = await fetch(`https://${shopDomain}/admin/api/2024-01/shop.json`, {
        headers: { "X-Shopify-Access-Token": credentials.admin_api_token },
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Shopify connection failed [${response.status}]: ${err}`);
      }
      return new Response(JSON.stringify({ success: true, message: "Shopify connection successful" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "prestashop") {
      const apiKey = credentials.api_key;
      if (!apiKey) {
        throw new Error("PrestaShop API key is required");
      }
      // PrestaShop Webservice uses Basic Auth with API key as username and empty password
      const auth = btoa(`${apiKey}:`);
      const response = await fetch(`${baseUrl}/api/cms?output_format=JSON&limit=1`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      if (!response.ok) {
        const err = await response.text();
        if (response.status === 401) {
          throw new Error("PrestaShop authentication failed. Check your API key and ensure the Webservice is enabled.");
        }
        throw new Error(`PrestaShop connection failed [${response.status}]: ${err}`);
      }
      return new Response(JSON.stringify({ success: true, message: "PrestaShop connection successful" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unsupported website type: ${type}`);
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Connection test failed" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
