import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ENDPOINTS = [
  "https://api.indexnow.org/indexnow",
  "https://www.bing.com/indexnow",
];

function makeKey(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const website_id: string | undefined = body?.website_id;
    const campaign_id: string | null = body?.campaign_id ?? null;
    if (!website_id) return json({ error: "website_id is required" }, 400);

    const { data: website } = await supabase
      .from("websites")
      .select("id, url, workspace_id")
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

    // Load the matching sitemap record (per website + campaign scope)
    let smQuery = supabase
      .from("sitemaps")
      .select("id, content, indexnow_key, sitemap_url")
      .eq("website_id", website_id);
    smQuery = campaign_id ? smQuery.eq("campaign_id", campaign_id) : smQuery.is("campaign_id", null);
    const { data: sitemap } = await smQuery.maybeSingle();

    if (!sitemap) {
      return json({ error: "No sitemap found. Generate the sitemap first." }, 400);
    }

    const urls: string[] = Array.isArray(body?.urls) && body.urls.length
      ? body.urls.filter((u: unknown) => typeof u === "string" && /^https?:\/\//i.test(u))
      : Array.from(String(sitemap.content || "").matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) =>
        m[1].replace(/&amp;/g, "&")
      );

    if (!urls.length) return json({ error: "No URLs available to submit." }, 400);

    const host = new URL(website.url).host;
    const key = sitemap.indexnow_key || makeKey();
    const keyLocation = `${String(website.url).replace(/\/$/, "")}/${key}.txt`;

    const batch = urls.slice(0, 10000);
    const results: Array<{ endpoint: string; status: number; body: string }> = [];

    for (const endpoint of ENDPOINTS) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({ host, key, keyLocation, urlList: batch }),
        });
        const text = await res.text();
        results.push({ endpoint, status: res.status, body: text.slice(0, 500) });
      } catch (e) {
        results.push({
          endpoint,
          status: 0,
          body: e instanceof Error ? e.message : "Network error",
        });
      }
    }

    const okCount = results.filter((r) => r.status >= 200 && r.status < 300).length;
    const status = okCount === results.length ? "success" : okCount > 0 ? "partial" : "failed";
    const nowIso = new Date().toISOString();

    await supabase
      .from("sitemaps")
      .update({
        indexnow_key: key,
        last_ping_at: nowIso,
        last_ping_result: { status, key_location: keyLocation, url_count: batch.length, results },
        updated_at: nowIso,
      })
      .eq("id", sitemap.id);

    await supabase.from("site_index_events").insert({
      workspace_id: website.workspace_id,
      user_id: user.id,
      website_id,
      campaign_id,
      kind: "indexnow",
      status,
      url_count: batch.length,
      message: status === "success"
        ? `Submitted ${batch.length} URL(s) to IndexNow.`
        : status === "partial"
        ? `Partially submitted ${batch.length} URL(s); some endpoints failed.`
        : "IndexNow submission failed on all endpoints.",
      details: { key_location: keyLocation, host, results, sample_urls: batch.slice(0, 20) },
    });

    return json({
      success: status !== "failed",
      status,
      url_count: batch.length,
      key,
      key_location: keyLocation,
      key_file_content: key,
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return json({ error: message }, 500);
  }
});
