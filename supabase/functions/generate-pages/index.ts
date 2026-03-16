import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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

    // Verify the user from their JWT
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

    const { campaign_id } = await req.json();
    if (!campaign_id) {
      return new Response(JSON.stringify({ error: "campaign_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch campaign with template
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*, templates(content, variables)")
      .eq("id", campaign_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (campaignError || !campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!campaign.templates) {
      return new Response(JSON.stringify({ error: "No template assigned to this campaign" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const csvRows = (campaign.csv_data || []) as Record<string, string>[];
    if (csvRows.length === 0) {
      return new Response(JSON.stringify({ error: "No CSV data in this campaign" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark campaign as processing
    await supabase
      .from("campaigns")
      .update({ status: "processing", processed_rows: 0 })
      .eq("id", campaign_id);

    const templateContent = campaign.templates.content as string;
    const generatedPages: {
      campaign_id: string;
      user_id: string;
      website_id: string | null;
      title: string;
      slug: string;
      content: string;
      status: string;
    }[] = [];

    let processedCount = 0;

    for (const row of csvRows) {
      try {
        // Replace all {variable} placeholders with CSV values
        let pageContent = templateContent;
        let pageTitle = "";

        for (const [key, value] of Object.entries(row)) {
          const regex = new RegExp(`\\{${key}\\}`, "gi");
          pageContent = pageContent.replace(regex, value || "");
        }

        // Extract title from first <h1> or generate from row values
        const h1Match = pageContent.match(/<h1[^>]*>(.*?)<\/h1>/i);
        if (h1Match) {
          pageTitle = h1Match[1].replace(/<[^>]*>/g, "").trim();
        } else {
          // Use first two CSV values as title
          const values = Object.values(row).filter(Boolean);
          pageTitle = values.slice(0, 2).join(" - ") || `Page ${processedCount + 1}`;
        }

        const slug = slugify(pageTitle) || `page-${processedCount + 1}`;

        generatedPages.push({
          campaign_id,
          user_id: user.id,
          website_id: campaign.website_id,
          title: pageTitle,
          slug,
          content: pageContent,
          status: "pending",
        });

        processedCount++;
      } catch {
        // Skip malformed rows, continue processing
        processedCount++;
      }
    }

    // Batch insert generated pages
    if (generatedPages.length > 0) {
      const { error: insertError } = await supabase
        .from("generated_pages")
        .insert(generatedPages);

      if (insertError) {
        await supabase
          .from("campaigns")
          .update({ status: "failed" })
          .eq("id", campaign_id);

        return new Response(JSON.stringify({ error: "Failed to store generated pages", details: insertError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Mark campaign as completed
    await supabase
      .from("campaigns")
      .update({
        status: "completed",
        processed_rows: generatedPages.length,
      })
      .eq("id", campaign_id);

    return new Response(
      JSON.stringify({
        success: true,
        generated: generatedPages.length,
        total: csvRows.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
