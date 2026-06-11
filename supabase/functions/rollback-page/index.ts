import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createConnector, createProductConnector, type WebsiteRecord } from "../_shared/connectors/factory.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const { website_id, page_external_id, version_id } = body;

    if (!version_id && (!website_id || !page_external_id)) {
      return new Response(
        JSON.stringify({ error: "Provide version_id, or website_id and page_external_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Find the snapshot to restore: explicit version, or latest known-good for the page.
    let versionQuery = supabase.from("page_versions").select("*");
    if (version_id) {
      versionQuery = versionQuery.eq("id", version_id);
    } else {
      versionQuery = versionQuery
        .eq("website_id", website_id)
        .eq("external_id", page_external_id)
        .order("created_at", { ascending: false })
        .limit(1);
    }

    const { data: versions, error: versionError } = await versionQuery;
    if (versionError) throw versionError;
    const snapshot = Array.isArray(versions) ? versions[0] : versions;

    if (!snapshot) {
      return new Response(
        JSON.stringify({ error: "No saved version found for this page" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const targetWebsiteId = snapshot.website_id || website_id;
    const targetExternalId = snapshot.external_id || page_external_id;

    // Fetch the website for the CMS push
    const { data: website } = await supabase
      .from("websites")
      .select("id, url, type, credentials, workspace_id")
      .eq("id", targetWebsiteId)
      .maybeSingle();

    if (!website) {
      return new Response(JSON.stringify({ error: "Website not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let pushResult: { external_id?: string; url?: string } | null = null;
    let pushError: string | null = null;

    if (targetExternalId) {
      try {
        const isProductContent = snapshot.page_type === "product";
        const connector = isProductContent
          ? await createProductConnector(website as WebsiteRecord)
          : await createConnector(website as WebsiteRecord);

        // Restore the original body content + design — do NOT preserve current (broken) layout.
        const updatePayload: Record<string, any> = {
          title: snapshot.title || undefined,
          slug: snapshot.slug || undefined,
          status: "publish",
        };
        if (typeof snapshot.content === "string") updatePayload.content = snapshot.content;
        if (isProductContent) updatePayload.product_data = { handle: snapshot.slug || undefined };
        if (snapshot.seo_title) updatePayload.seo_title = snapshot.seo_title;
        if (snapshot.seo_description) {
          updatePayload.seo_description = snapshot.seo_description;
          updatePayload.excerpt = snapshot.seo_description;
        }
        if (Array.isArray(snapshot.seo_keywords) && snapshot.seo_keywords.length > 0) {
          updatePayload.seo_keywords = snapshot.seo_keywords;
        }

        pushResult = await connector.updatePage(targetExternalId, updatePayload);
        console.log("[ROLLBACK] Restored page on CMS:", pushResult);
      } catch (pushErr: any) {
        pushError = pushErr?.message || "CMS rollback failed";
        console.error("[ROLLBACK] CMS push failed:", pushErr);
      }
    }

    if (pushError) {
      return new Response(JSON.stringify({ error: pushError }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sync the restored content back into generated_pages tracking.
    const { data: existingPage } = await supabase
      .from("generated_pages")
      .select("id")
      .eq("website_id", targetWebsiteId)
      .eq("external_id", targetExternalId || "")
      .eq("user_id", user.id)
      .maybeSingle();

    const pageRecord: Record<string, any> = {
      title: snapshot.title,
      content: snapshot.content,
      slug: snapshot.slug || "",
      seo_title: snapshot.seo_title || null,
      seo_description: snapshot.seo_description || null,
      seo_keywords: Array.isArray(snapshot.seo_keywords) && snapshot.seo_keywords.length > 0 ? snapshot.seo_keywords : null,
      user_id: user.id,
      website_id: targetWebsiteId,
      workspace_id: snapshot.workspace_id || website?.workspace_id || null,
      status: pushResult ? "published" : "generated",
      external_id: targetExternalId || null,
      external_url: pushResult?.url || null,
    };

    if (existingPage) {
      await supabase.from("generated_pages").update(pageRecord).eq("id", existingPage.id);
    } else {
      await supabase.from("generated_pages").insert(pageRecord);
    }

    // Audit log
    try {
      const wsId = snapshot.workspace_id || website?.workspace_id || null;
      if (wsId) {
        await supabase.from("audit_logs").insert({
          workspace_id: wsId,
          user_id: user.id,
          action: "page_rollback",
          entity_type: snapshot.page_type || "page",
          entity_id: targetExternalId || snapshot.slug,
          details: {
            title: snapshot.title,
            version_id: snapshot.id,
            restored_at: new Date().toISOString(),
          },
        });
      }
    } catch (_) { /* best-effort */ }

    return new Response(
      JSON.stringify({
        success: true,
        restored_version_id: snapshot.id,
        url: pushResult?.url || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[ROLLBACK] Error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Rollback failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
