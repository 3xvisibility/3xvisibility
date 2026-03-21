import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    const { website_id, content_type } = await req.json();
    if (!website_id) {
      return new Response(JSON.stringify({ error: "website_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: website, error: wsError } = await supabase
      .from("websites")
      .select("*")
      .eq("id", website_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (wsError || !website) {
      return new Response(JSON.stringify({ error: "Website not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = website.url.replace(/\/$/, "");

    const type = content_type || "pages";

    try {
      const record: WebsiteRecord = {
        url: baseUrl,
        type: website.type,
        credentials: website.credentials as Record<string, string> | null,
      };
      const connector = createConnector(record);
      const items = await connector.listContent(type);

      console.log(`Fetched ${items.length} ${type} from ${website.name}`);

      return new Response(
        JSON.stringify({ success: true, items, total: items.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (fetchErr: any) {
      const msg = fetchErr?.message || "";
      if (msg.includes("dns error") || msg.includes("failed to lookup address")) {
        return new Response(
          JSON.stringify({ error: `Could not connect to "${hostname}". Please verify the website URL is correct and the site is online.` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw fetchErr;
    }
  } catch (err: any) {
    console.error("fetch-site-content error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Failed to fetch site content" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
