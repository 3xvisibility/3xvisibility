import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createHmac } from "node:crypto";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { event, campaign_id, workspace_id, payload } = await req.json();

    if (!event || !workspace_id) {
      return new Response(JSON.stringify({ error: "Missing event or workspace_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find active webhook endpoints for this workspace that subscribe to this event
    const { data: endpoints, error } = await supabase
      .from("webhook_endpoints")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("is_active", true)
      .contains("events", [event]);

    if (error) {
      console.error("Error fetching webhooks:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!endpoints || endpoints.length === 0) {
      return new Response(JSON.stringify({ fired: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = JSON.stringify({
      event,
      campaign_id,
      timestamp: new Date().toISOString(),
      data: payload || {},
    });

    const results: { url: string; status: number; success: boolean }[] = [];

    for (const ep of endpoints) {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "X-Webhook-Event": event,
        };

        // Sign payload if secret is set
        if (ep.secret) {
          const signature = createHmac("sha256", ep.secret).update(body).digest("hex");
          headers["X-Webhook-Signature"] = `sha256=${signature}`;
        }

        const res = await fetch(ep.url, {
          method: "POST",
          headers,
          body,
          signal: AbortSignal.timeout(10000),
        });

        // Update last triggered info
        await supabase
          .from("webhook_endpoints")
          .update({
            last_triggered_at: new Date().toISOString(),
            last_status_code: res.status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", ep.id);

        results.push({ url: ep.url, status: res.status, success: res.ok });
      } catch (err: any) {
        console.error(`Webhook delivery failed for ${ep.url}:`, err.message);
        await supabase
          .from("webhook_endpoints")
          .update({
            last_triggered_at: new Date().toISOString(),
            last_status_code: 0,
            updated_at: new Date().toISOString(),
          })
          .eq("id", ep.id);
        results.push({ url: ep.url, status: 0, success: false });
      }
    }

    return new Response(JSON.stringify({ fired: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("fire-webhooks error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
