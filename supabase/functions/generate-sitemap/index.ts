import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

type PageRow = {
  slug: string;
  created_at: string;
  status: string;
  external_url: string | null;
  canonical_url: string | null;
};

function pageUrl(baseUrl: string, page: PageRow): string {
  const explicit = page.external_url || page.canonical_url;
  if (explicit && /^https?:\/\//i.test(explicit)) return explicit;
  return `${baseUrl.replace(/\/$/, "")}/${String(page.slug || "").replace(/^\//, "")}`;
}

function buildSitemapXml(baseUrl: string, pages: PageRow[]): { xml: string; urls: string[] } {
  const urls: string[] = [];
  const entries = pages.map((p) => {
    const loc = pageUrl(baseUrl, p);
    urls.push(loc);
    const lastmod = new Date(p.created_at).toISOString().split("T")[0];
    const priority = p.status === "published" ? "0.8" : "0.5";
    return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;
  return { xml, urls };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const website_id: string | undefined = body?.website_id;
    const campaign_id: string | null = body?.campaign_id ?? null;
    const publishedOnly: boolean = body?.published_only !== false;

    if (!website_id) return json({ error: "website_id is required" }, 400);

    const { data: website } = await supabase
      .from("websites")
      .select("id, url, name, workspace_id")
      .eq("id", website_id)
      .maybeSingle();

    if (!website) return json({ error: "Website not found" }, 404);

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", website.workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) return json({ error: "Not authorized for this website" }, 403);

    if (campaign_id) {
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("id, workspace_id")
        .eq("id", campaign_id)
        .maybeSingle();
      if (!campaign || campaign.workspace_id !== website.workspace_id) {
        return json({ error: "Campaign not found for this website" }, 404);
      }
    }

    let query = supabase
      .from("generated_pages")
      .select("slug, created_at, status, external_url, canonical_url")
      .eq("website_id", website_id)
      .order("created_at", { ascending: true });

    if (campaign_id) query = query.eq("campaign_id", campaign_id);

    const { data: pages, error: pagesError } = await query;
    if (pagesError) return json({ error: "Failed to fetch pages" }, 500);

    const validPages = ((pages || []) as PageRow[]).filter((p) =>
      publishedOnly ? p.status === "published" : p.status !== "failed"
    );

    const { xml, urls } = buildSitemapXml(website.url, validPages);
    const sitemapUrl = `${String(website.url).replace(/\/$/, "")}/sitemap.xml`;
    const nowIso = new Date().toISOString();

    let existingQuery = supabase.from("sitemaps").select("id").eq("website_id", website_id);
    existingQuery = campaign_id
      ? existingQuery.eq("campaign_id", campaign_id)
      : existingQuery.is("campaign_id", null);
    const { data: existing } = await existingQuery.maybeSingle();

    const payload = {
      content: xml,
      page_count: validPages.length,
      sitemap_url: sitemapUrl,
      last_generated_at: nowIso,
      updated_at: nowIso,
    };

    let sitemapId = existing?.id as string | undefined;
    if (existing) {
      await supabase.from("sitemaps").update(payload).eq("id", existing.id);
    } else {
      const { data: inserted } = await supabase
        .from("sitemaps")
        .insert({
          website_id,
          campaign_id,
          user_id: user.id,
          workspace_id: website.workspace_id,
          ...payload,
        })
        .select("id")
        .maybeSingle();
      sitemapId = inserted?.id;
    }

    await supabase.from("site_index_events").insert({
      workspace_id: website.workspace_id,
      user_id: user.id,
      website_id,
      campaign_id,
      kind: "sitemap",
      status: validPages.length > 0 ? "success" : "partial",
      url_count: validPages.length,
      message: validPages.length > 0
        ? `Sitemap generated with ${validPages.length} URL(s).`
        : "Sitemap generated but no eligible pages were found.",
      details: { sitemap_url: sitemapUrl, published_only: publishedOnly, sample_urls: urls.slice(0, 20) },
    });

    return json({
      success: true,
      sitemap_id: sitemapId,
      page_count: validPages.length,
      sitemap_url: sitemapUrl,
      urls,
      xml,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return json({ error: message }, 500);
  }
});
