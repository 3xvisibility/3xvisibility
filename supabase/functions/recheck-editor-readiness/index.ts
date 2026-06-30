import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createConnector, type WebsiteRecord } from "../_shared/connectors/factory.ts";
import { PgpConnector } from "../_shared/connectors/pgp-connector.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Re-run the post-publish "Edit with Elementor" readiness check for a single
 * already-published WordPress page, on demand, without republishing it.
 * Stores the fresh result on `generated_pages.editor_readiness` and returns it.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const pageId = body?.page_id as string | undefined;
    if (!pageId) return json({ error: "page_id is required" }, 400);

    // Load the page and confirm the caller owns it (or is a platform admin).
    const { data: page } = await supabase
      .from("generated_pages")
      .select("id, user_id, website_id, external_id, status")
      .eq("id", pageId)
      .maybeSingle();
    if (!page) return json({ error: "Page not found" }, 404);

    if (page.user_id !== user.id) {
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!roleRow) return json({ error: "Forbidden" }, 403);
    }

    if (!page.external_id) {
      return json({ error: "This page has not been published to WordPress yet." }, 400);
    }
    if (!page.website_id) {
      return json({ error: "This page is not linked to a website." }, 400);
    }

    const { data: website } = await supabase
      .from("websites")
      .select("id, url, type, credentials, workspace_id")
      .eq("id", page.website_id)
      .maybeSingle();
    if (!website) return json({ error: "Website not found" }, 404);
    if (website.type !== "wordpress") {
      return json({ error: "Editor readiness re-check is only available for WordPress (Elementor) pages." }, 400);
    }

    const connector = await createConnector(website as WebsiteRecord);
    if (!(connector instanceof PgpConnector)) {
      return json({ error: "WordPress connector is not available for this site." }, 400);
    }

    const readiness = await connector.recheckEditorReadiness(page.external_id);

    await supabase
      .from("generated_pages")
      .update({ editor_readiness: readiness })
      .eq("id", page.id);

    return json({ success: true, editor_readiness: readiness });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Re-check failed";
    return json({ error: message }, 500);
  }
});
