import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createConnector } from "../_shared/connectors/factory.ts";
import type { WebsiteRecord } from "../_shared/connectors/factory.ts";

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

    const { url, type, credentials } = await req.json();

    if (!url || !type) {
      return new Response(JSON.stringify({ error: "url and type are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const website: WebsiteRecord = { url, type, credentials: credentials || {} };
    console.log(`[test-connection] type=${type} url=${url} cred_keys=${Object.keys(credentials || {}).join(",")}`);
    if (type === "shopify") {
      const token = credentials?.admin_api_token || credentials?.access_token || "";
      console.log(`[test-connection] shopify domain=${url} token_len=${token.length} token_prefix=${token.substring(0, 8)}...`);
    }
    const connector = await createConnector(website);
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

    return new Response(
      JSON.stringify({ success: true, message: `${type} connection successful` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Connection test failed" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
