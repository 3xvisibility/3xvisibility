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

    const { campaign_id } = await req.json();
    if (!campaign_id) {
      return new Response(JSON.stringify({ error: "campaign_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership
    const { data: campaign, error: campaignErr } = await supabase
      .from("campaigns")
      .select("id, csv_data, template_id, templates(variables)")
      .eq("id", campaign_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (campaignErr || !campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get link settings
    const { data: settings } = await supabase
      .from("internal_link_settings")
      .select("*")
      .eq("campaign_id", campaign_id)
      .maybeSingle();

    if (!settings || !settings.enabled) {
      return new Response(JSON.stringify({ error: "Internal linking is not enabled for this campaign" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all pages for this campaign
    const { data: pages, error: pagesErr } = await supabase
      .from("generated_pages")
      .select("id, title, slug, content, campaign_id")
      .eq("campaign_id", campaign_id)
      .neq("status", "failed");

    if (pagesErr || !pages || pages.length < 2) {
      return new Response(JSON.stringify({ error: "Need at least 2 pages to create internal links", count: pages?.length || 0 }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse CSV data to get variable values per row for smart grouping
    const csvRows = (campaign.csv_data || []) as Record<string, string>[];
    const templateVars = ((campaign.templates as any)?.variables || []) as string[];
    const cleanVars = templateVars.map((v: string) => v.replace(/[{}]/g, ""));

    // Build a map of page slug -> row data for grouping
    const pageRowMap = new Map<string, Record<string, string>>();
    for (const row of csvRows) {
      // Reconstruct what slug would be for this row
      const values = Object.values(row).filter(Boolean);
      const titleGuess = values.slice(0, 2).join(" - ");
      const slugGuess = titleGuess.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      pageRowMap.set(slugGuess, row);
    }

    // Match pages to their CSV rows by slug similarity
    const pageData = pages.map((page) => {
      // Try exact match first, then find best match
      let rowData = pageRowMap.get(page.slug);
      if (!rowData) {
        for (const [slug, data] of pageRowMap.entries()) {
          if (page.slug.includes(slug) || slug.includes(page.slug)) {
            rowData = data;
            break;
          }
        }
      }
      return { ...page, rowData: rowData || {} };
    });

    // Smart linking: group by the grouping variable if set
    const groupingVar = settings.grouping_variable;
    const maxLinks = settings.max_links_per_page;

    // Delete existing links for this campaign
    await supabase
      .from("internal_links")
      .delete()
      .eq("campaign_id", campaign_id);

    const linksToInsert: {
      source_page_id: string;
      target_page_id: string;
      campaign_id: string;
      anchor_text: string;
    }[] = [];

    for (const sourcePage of pageData) {
      // Find related pages
      let candidates = pageData.filter((p) => p.id !== sourcePage.id);

      // If grouping variable is set, prioritize pages sharing other variables
      if (groupingVar && sourcePage.rowData[groupingVar]) {
        const sourceGroupVal = sourcePage.rowData[groupingVar];
        // Sort: pages with same grouping value first (different other vars)
        candidates.sort((a, b) => {
          const aMatch = a.rowData[groupingVar] === sourceGroupVal ? 0 : 1;
          const bMatch = b.rowData[groupingVar] === sourceGroupVal ? 0 : 1;
          return aMatch - bMatch;
        });
      }

      // Limit to max links
      const linkedPages = candidates.slice(0, maxLinks);

      for (const targetPage of linkedPages) {
        // Build anchor text from format
        let anchor = settings.anchor_format;
        // Replace {title} with target page title
        anchor = anchor.replace(/\{title\}/gi, targetPage.title);
        // Replace other variables from target row data
        for (const [key, value] of Object.entries(targetPage.rowData)) {
          anchor = anchor.replace(new RegExp(`\\{${key}\\}`, "gi"), value || "");
        }

        linksToInsert.push({
          source_page_id: sourcePage.id,
          target_page_id: targetPage.id,
          campaign_id,
          anchor_text: anchor,
        });
      }
    }

    // Batch insert in chunks of 500
    let inserted = 0;
    for (let i = 0; i < linksToInsert.length; i += 500) {
      const chunk = linksToInsert.slice(i, i + 500);
      const { error: insertErr } = await supabase
        .from("internal_links")
        .insert(chunk);
      if (insertErr) {
        console.error("Insert error:", insertErr);
      } else {
        inserted += chunk.length;
      }
    }

    // Now inject link sections into page content
    let updatedPages = 0;
    for (const sourcePage of pageData) {
      const pageLinks = linksToInsert.filter((l) => l.source_page_id === sourcePage.id);
      if (pageLinks.length === 0) continue;

      // Build link section HTML
      const linkItems = pageLinks.map((link) => {
        const targetPage = pageData.find((p) => p.id === link.target_page_id);
        if (!targetPage) return "";
        return `  <li><a href="/${targetPage.slug}">${link.anchor_text}</a></li>`;
      }).filter(Boolean).join("\n");

      const linkSection = `\n<section class="internal-links">\n<h2>${settings.section_title}</h2>\n<ul>\n${linkItems}\n</ul>\n</section>`;

      // Remove any existing internal links section, then append
      let updatedContent = sourcePage.content.replace(
        /<section class="internal-links">[\s\S]*?<\/section>/g,
        ""
      ).trim();
      updatedContent += linkSection;

      const { error: updateErr } = await supabase
        .from("generated_pages")
        .update({ content: updatedContent })
        .eq("id", sourcePage.id);

      if (!updateErr) updatedPages++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        links_created: inserted,
        pages_updated: updatedPages,
        total_pages: pages.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("build-internal-links error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
