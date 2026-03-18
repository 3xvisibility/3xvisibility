import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createConnector, type WebsiteRecord } from "../_shared/connectors/factory.ts";
import type { PagePayload } from "../_shared/connectors/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Build a PagePayload from page data + publish type.
 */
function buildPayload(
  page: { title: string; content: string; slug: string; seo_title?: string | null; seo_description?: string | null; seo_keywords?: string[] | null; canonical_url?: string | null },
  publishType: string,
  elementorMeta?: { elementor_data?: string; elementor_edit_mode?: string; page_template?: string },
  extraData?: Record<string, unknown>
): PagePayload {
  const payload: PagePayload = {
    title: page.title,
    content: page.content,
    slug: page.slug,
    status: "publish",
    seo_title: page.seo_title || undefined,
    seo_description: page.seo_description || undefined,
    seo_keywords: page.seo_keywords || undefined,
    canonical_url: page.canonical_url || undefined,
  };

  if (page.seo_description) payload.excerpt = page.seo_description;

  if (elementorMeta?.elementor_data) {
    payload.elementor_meta = {
      elementor_data: elementorMeta.elementor_data,
      elementor_edit_mode: elementorMeta.elementor_edit_mode || "builder",
      page_template: elementorMeta.page_template,
    };
  }

  if (publishType === "product" && extraData) {
    payload.product_data = {
      price: extraData.price ? String(extraData.price) : undefined,
      images: (extraData.images as { src: string }[] | undefined)
        || (extraData.image ? [{ src: String(extraData.image) }] : undefined),
    };
  }

  return payload;
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

    const body = await req.json();
    const { page_ids, publish_type, website_id, pages: directPages } = body;
    const pubType = publish_type || "page";

    // ═══════════════════════════════════════════════════════════
    // Direct publish mode (from TemplateDetectorDialog)
    // ═══════════════════════════════════════════════════════════
    if (directPages && Array.isArray(directPages) && website_id) {
      const { data: website } = await supabase
        .from("websites")
        .select("url, type, credentials")
        .eq("id", website_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!website) {
        return new Response(JSON.stringify({ error: "Website not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const connector = createConnector(website as WebsiteRecord);
      const results: { title: string; status: string; external_url?: string; error?: string }[] = [];

      for (const dp of directPages) {
        try {
          const elementorMeta = dp.elementor_data
            ? { elementor_data: dp.elementor_data, elementor_edit_mode: dp.elementor_edit_mode, page_template: dp.page_template }
            : undefined;

          const payload = buildPayload(
            { title: dp.title, content: dp.content, slug: dp.slug, seo_title: dp.seo_title, seo_description: dp.seo_description },
            pubType,
            elementorMeta
          );

          const result = await connector.createPage(payload);
          results.push({ title: dp.title, status: "published", external_url: result.url });
        } catch (err) {
          results.push({ title: dp.title, status: "failed", error: err instanceof Error ? err.message : "Unknown error" });
        }
      }

      const published = results.filter((r) => r.status === "published").length;
      const failed = results.filter((r) => r.status === "failed").length;
      return new Response(
        JSON.stringify({ success: true, published, failed, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ═══════════════════════════════════════════════════════════
    // Standard mode – publish generated_pages by IDs
    // ═══════════════════════════════════════════════════════════
    if (!page_ids || !Array.isArray(page_ids) || page_ids.length === 0) {
      return new Response(JSON.stringify({ error: "page_ids array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: pages, error: pagesError } = await supabase
      .from("generated_pages")
      .select("*, websites(url, type, credentials)")
      .in("id", page_ids)
      .eq("user_id", user.id);

    if (pagesError || !pages) {
      return new Response(JSON.stringify({ error: "Failed to fetch pages" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { id: string; status: string; external_url?: string; error?: string }[] = [];

    for (const page of pages) {
      // Resolve website if not directly joined
      if (!page.websites) {
        const { data: campaign } = await supabase
          .from("campaigns")
          .select("website_id")
          .eq("id", page.campaign_id)
          .maybeSingle();

        if (campaign?.website_id) {
          const { data: website } = await supabase
            .from("websites")
            .select("url, type, credentials")
            .eq("id", campaign.website_id)
            .maybeSingle();

          if (website) {
            page.websites = website;
            await supabase.from("generated_pages").update({ website_id: campaign.website_id }).eq("id", page.id);
          }
        }
      }

      if (!page.websites) {
        results.push({ id: page.id, status: "failed", error: "No website connected" });
        await supabase.from("generated_pages").update({ status: "failed", error_message: "No website connected to publish to" }).eq("id", page.id);
        continue;
      }

      try {
        const connector = createConnector(page.websites as WebsiteRecord);
        const payload = buildPayload(
          { title: page.title, content: page.content, slug: page.slug, seo_title: page.seo_title, seo_description: page.seo_description, seo_keywords: page.seo_keywords, canonical_url: page.canonical_url },
          pubType
        );

        const result = await connector.createPage(payload);

        await supabase.from("generated_pages").update({
          status: "published",
          external_id: result.external_id,
          external_url: result.url,
          error_message: null,
        }).eq("id", page.id);

        results.push({ id: page.id, status: "published", external_url: result.url });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown publishing error";
        await supabase.from("generated_pages").update({ status: "failed", error_message: errorMsg }).eq("id", page.id);
        results.push({ id: page.id, status: "failed", error: errorMsg });
      }
    }

    const published = results.filter((r) => r.status === "published").length;
    const failed = results.filter((r) => r.status === "failed").length;

    return new Response(
      JSON.stringify({ success: true, published, failed, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
