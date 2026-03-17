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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Find campaigns that are queued and whose scheduled_at has arrived
    const now = new Date().toISOString();
    const { data: dueCampaigns, error } = await supabase
      .from("campaigns")
      .select("id, user_id, name, scheduled_at")
      .eq("status", "queued")
      .not("scheduled_at", "is", null)
      .lte("scheduled_at", now)
      .limit(10);

    if (error) {
      console.error("Error fetching due campaigns:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!dueCampaigns || dueCampaigns.length === 0) {
      return new Response(JSON.stringify({ triggered: 0, message: "No campaigns due" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { campaign_id: string; name: string; success: boolean; error?: string }[] = [];

    for (const campaign of dueCampaigns) {
      try {
        // Clear scheduled_at so it won't be picked up again
        await supabase
          .from("campaigns")
          .update({ scheduled_at: null, status: "processing" })
          .eq("id", campaign.id);

        // Invoke generate-pages with the service role (no user JWT needed)
        // We call the function URL directly with the user's anon key + service auth
        const fnUrl = `${supabaseUrl}/functions/v1/generate-pages`;
        const response = await fetch(fnUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${anonKey}`,
            // Pass user context via a custom service-level approach:
            // generate-pages validates auth, so we use service key instead
            "x-service-role-key": serviceKey,
          },
          body: JSON.stringify({ campaign_id: campaign.id }),
        });

        const body = await response.text();

        if (!response.ok) {
          console.error(`Failed to trigger campaign ${campaign.id}:`, body);
          // Revert status on failure
          await supabase
            .from("campaigns")
            .update({ status: "failed" })
            .eq("id", campaign.id);
          results.push({ campaign_id: campaign.id, name: campaign.name, success: false, error: body });
        } else {
          console.log(`Triggered campaign ${campaign.id} (${campaign.name})`);
          results.push({ campaign_id: campaign.id, name: campaign.name, success: true });
        }
      } catch (err: any) {
        console.error(`Error triggering campaign ${campaign.id}:`, err.message);
        await supabase
          .from("campaigns")
          .update({ status: "failed" })
          .eq("id", campaign.id);
        results.push({ campaign_id: campaign.id, name: campaign.name, success: false, error: err.message });
      }
    }

    return new Response(JSON.stringify({
      triggered: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Scheduled runner error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
