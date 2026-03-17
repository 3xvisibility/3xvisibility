import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildSitemapXml(
  baseUrl: string,
  pages: { slug: string; created_at: string; status: string }[]
): string {
  const urlEntries = pages
    .filter((p) => p.status !== "failed")
    .map((p) => {
      const loc = `${baseUrl.replace(/\/$/, "")}/${p.slug}`;
      const lastmod = new Date(p.created_at).toISOString().split("T")[0];
      const priority = p.status === "published" ? "0.8" : "0.5";
      return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
    });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries.join("\n")}
</urlset>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
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

    const { website_id } = await req.json();

    if (!website_id) {
      return new Response(JSON.stringify({ error: "website_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify website ownership
    const { data: website, error: webError } = await supabase
      .from("websites")
      .select("id, url, name")
      .eq("id", website_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (webError || !website) {
      return new Response(JSON.stringify({ error: "Website not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all generated pages for this website
    const { data: pages, error: pagesError } = await supabase
      .from("generated_pages")
      .select("slug, created_at, status")
      .eq("website_id", website_id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (pagesError) {
      return new Response(JSON.stringify({ error: "Failed to fetch pages" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validPages = (pages || []).filter((p) => p.status !== "failed");
    const sitemapXml = buildSitemapXml(website.url, validPages);

    // Upsert sitemap record
    const { data: existing } = await supabase
      .from("sitemaps")
      .select("id")
      .eq("website_id", website_id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("sitemaps")
        .update({
          content: sitemapXml,
          page_count: validPages.length,
          last_generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("sitemaps").insert({
        website_id,
        user_id: user.id,
        content: sitemapXml,
        page_count: validPages.length,
        last_generated_at: new Date().toISOString(),
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        page_count: validPages.length,
        sitemap_url: `${website.url.replace(/\/$/, "")}/sitemap.xml`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
