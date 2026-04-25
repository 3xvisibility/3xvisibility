import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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

    // === Auto-reset stuck campaigns (processing > 30 min with no active job) ===
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: stuckCampaigns } = await supabase
      .from("campaigns")
      .select("id, name, generation_started_at")
      .eq("status", "processing")
      .lt("updated_at", thirtyMinAgo);

    let resetCount = 0;
    if (stuckCampaigns && stuckCampaigns.length > 0) {
      for (const sc of stuckCampaigns) {
        // Check if there's an active generation job
        const { data: activeJobs } = await supabase
          .from("generation_jobs")
          .select("id")
          .eq("campaign_id", sc.id)
          .in("status", ["running", "pending"])
          .limit(1);

        if (!activeJobs || activeJobs.length === 0) {
          await supabase
            .from("campaigns")
            .update({ status: "draft", is_paused: false, updated_at: new Date().toISOString() })
            .eq("id", sc.id);
          console.log(`Auto-reset stuck campaign: ${sc.id} (${sc.name})`);
          resetCount++;
        }
      }
    }

    if (!dueCampaigns || dueCampaigns.length === 0) {
      return new Response(JSON.stringify({ triggered: 0, reset_stuck: resetCount, message: "No campaigns due" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { campaign_id: string; name: string; success: boolean; error?: string }[] = [];

    for (const campaign of dueCampaigns) {
      try {
        // Check for recurring schedule
        const { data: fullCampaign } = await supabase
          .from("campaigns")
          .select("recurring_schedule")
          .eq("id", campaign.id)
          .single();

        const recurring = fullCampaign?.recurring_schedule as { interval?: string; end_date?: string | null; enabled?: boolean } | null;

        if (recurring && recurring.enabled) {
          // Calculate next run date
          const intervalMap: Record<string, number> = {
            daily: 1, weekly: 7, biweekly: 14, monthly: 30,
          };
          const days = intervalMap[recurring.interval || "weekly"] || 7;
          const nextRun = new Date(Date.now() + days * 86400000);

          // Check if end_date has passed
          const pastEnd = recurring.end_date && new Date(recurring.end_date) < nextRun;

          if (pastEnd) {
            // Disable recurring, clear schedule
            await supabase
              .from("campaigns")
              .update({ scheduled_at: null, status: "processing", recurring_schedule: { ...recurring, enabled: false } })
              .eq("id", campaign.id);
          } else {
            // Schedule next run, set current to processing
            await supabase
              .from("campaigns")
              .update({ scheduled_at: nextRun.toISOString(), status: "processing" })
              .eq("id", campaign.id);
          }
        } else {
          // Non-recurring: clear scheduled_at
          await supabase
            .from("campaigns")
            .update({ scheduled_at: null, status: "processing" })
            .eq("id", campaign.id);
        }

        // Invoke generate-pages
        const fnUrl = `${supabaseUrl}/functions/v1/generate-pages`;
        const response = await fetch(fnUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${anonKey}`,
            "x-service-role-key": serviceKey,
          },
          body: JSON.stringify({ campaign_id: campaign.id }),
        });

        const body = await response.text();

        if (!response.ok) {
          console.error(`Failed to trigger campaign ${campaign.id}:`, body);
          await supabase
            .from("campaigns")
            .update({ status: "failed" })
            .eq("id", campaign.id);
          results.push({ campaign_id: campaign.id, name: campaign.name, success: false, error: body });
        } else {
          console.log(`Triggered campaign ${campaign.id} (${campaign.name})${recurring?.enabled ? ` [recurring: ${recurring.interval}]` : ""}`);
          
          // For recurring campaigns, re-queue after generation completes
          if (recurring?.enabled) {
            // The campaign was already set to "processing" with a future scheduled_at
            // After completion, the generate-pages function will set status back to "queued"
            // if scheduled_at is set in the future
          }
          
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
      reset_stuck: resetCount,
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
