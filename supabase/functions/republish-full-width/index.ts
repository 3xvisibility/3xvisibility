// Auto-republish job: convert every previously published page to the new
// FULL-WIDTH default.
//
// The publishing engine now defaults to full width (boxing disabled) unless a
// workspace/template/page explicitly configures a boxed content width. This job:
//   1. Finds all `published` pages owned by the caller (optionally scoped to a
//      workspace).
//   2. Clears any per-page boxed width override (container_width* / gutter_*) so
//      each page inherits the new full-width default.
//   3. Re-invokes `publish-pages` with the collected page ids. `publish-pages`
//      already batches + self-chains internally, so this simply hands off the
//      full id list per website.
//
// Returns per-website counts so the UI can show what was queued.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const workspaceId = (body?.workspace_id as string | undefined) || null;

    // If workspace-scoped, verify membership (owner or admin bypasses).
    if (workspaceId) {
      const { data: member } = await supabase
        .from("workspace_members")
        .select("user_id")
        .eq("user_id", user.id)
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (!member) {
        const { data: adminRole } = await supabase
          .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
        if (!adminRole) return json({ error: "Forbidden" }, 403);
      }
    }

    // Collect all currently-published pages owned by the caller.
    let query = supabase
      .from("generated_pages")
      .select("id, website_id, workspace_id")
      .eq("user_id", user.id)
      .eq("status", "published");
    if (workspaceId) query = query.eq("workspace_id", workspaceId);
    const { data: pages, error: pagesErr } = await query;
    if (pagesErr) throw new Error(`generated_pages.select: ${pagesErr.message}`);

    const rows = (pages || []) as Array<{ id: string; website_id: string | null }>;
    if (rows.length === 0) {
      return json({ ok: true, total: 0, queued: 0, websites: 0, message: "No published pages to republish." });
    }

    const allIds = rows.map((r) => r.id);

    // Clear any per-page boxed overrides so every page inherits the new
    // full-width default. Nulling these columns means "inherit".
    const { error: clearErr } = await supabase
      .from("generated_pages")
      .update({
        container_width: null,
        container_width_tablet: null,
        container_width_mobile: null,
        gutter_desktop: null,
        gutter_tablet: null,
        gutter_mobile: null,
      })
      .in("id", allIds);
    if (clearErr) throw new Error(`generated_pages.update: ${clearErr.message}`);

    // Group page ids by website so publish-pages resolves the right connector.
    const byWebsite = new Map<string, string[]>();
    for (const r of rows) {
      const key = r.website_id || "__none__";
      const list = byWebsite.get(key) || [];
      list.push(r.id);
      byWebsite.set(key, list);
    }

    // Fire publish-pages per website group. publish-pages batches + self-chains
    // internally, so we hand off the full id list and return immediately.
    const groups: Array<{ website_id: string | null; count: number }> = [];
    for (const [websiteKey, ids] of byWebsite.entries()) {
      const websiteId = websiteKey === "__none__" ? null : websiteKey;
      groups.push({ website_id: websiteId, count: ids.length });
      fetch(`${supabaseUrl}/functions/v1/publish-pages`, {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          page_ids: ids,
          publish_type: "update",
          website_id: websiteId,
          elementor_mode: "native",
        }),
      }).catch((e) => console.error("publish-pages dispatch failed:", e));
    }

    return json({
      ok: true,
      total: rows.length,
      queued: allIds.length,
      websites: groups.length,
      groups,
      message: `Re-publishing ${allIds.length} page(s) across ${groups.length} website(s) at full width.`,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
