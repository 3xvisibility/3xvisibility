// On-demand "Re-sync template globals" job.
//
// Re-applies the template palette + typography into each connected WordPress
// site's active Elementor kit (Site Settings > Global Colors / Global Fonts)
// WITHOUT republishing any page. Use it any time to push the current template
// globals back onto already-published sites.
//
// Flow:
//   1. Collect the caller's `published` pages (optionally scoped to a workspace
//      or a single website).
//   2. Group pages by website; for each website gather the distinct templates
//      used (generated_pages.campaign_id -> campaigns.template_id ->
//      templates.elementor_data / content).
//   3. Extract the most-used colors + font families across those templates.
//   4. Build a connector for the website; if it's the 3xVisibility companion
//      (PgpConnector), POST the aggregated globals to /site-actions/apply-globals
//      which writes them into the active Elementor kit and regenerates the
//      global CSS.
//
// Returns per-website results so the UI can report what was synced.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createConnector, type WebsiteRecord } from "../_shared/connectors/factory.ts";
import { PgpConnector } from "../_shared/connectors/pgp-connector.ts";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Normalize a color to lowercase 6-digit hex, or "" when not a hex color. */
function normHex(value: unknown): string {
  const v = String(value ?? "").trim().toLowerCase();
  const m = v.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (!m) return "";
  let hex = m[1];
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  return "#" + hex;
}

const GENERIC_FONTS = new Set([
  "inherit", "initial", "unset", "sans-serif", "serif", "monospace",
  "cursive", "fantasy", "system-ui", "ui-sans-serif", "ui-serif",
]);

/** Normalize a font-family token (strip quotes / generic families). */
function normFont(value: unknown): string {
  let v = String(value ?? "").trim().replace(/^["']|["']$/g, "").trim();
  if (!v || v.length > 60) return "";
  if (GENERIC_FONTS.has(v.toLowerCase())) return "";
  return v;
}

/** Walk an Elementor JSON tree collecting baked colors + font families. */
function collectFromElementor(
  nodes: unknown,
  colors: Map<string, number>,
  fonts: Map<string, number>,
): void {
  if (!Array.isArray(nodes)) return;
  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;
    const n = node as Record<string, unknown>;
    const settings = n.settings as Record<string, unknown> | undefined;
    if (settings && typeof settings === "object") {
      for (const [key, value] of Object.entries(settings)) {
        if (typeof value !== "string" || !value) continue;
        if (key.includes("color") || key.includes("background")) {
          const hex = normHex(value);
          if (hex) colors.set(hex, (colors.get(hex) ?? 0) + 1);
        }
        if (key.includes("font_family")) {
          const fam = normFont(value);
          if (fam) fonts.set(fam, (fonts.get(fam) ?? 0) + 1);
        }
      }
    }
    if (Array.isArray(n.elements)) collectFromElementor(n.elements, colors, fonts);
  }
}

/** Extract colors + font families from raw CSS/HTML text as a fallback. */
function collectFromText(
  text: string,
  colors: Map<string, number>,
  fonts: Map<string, number>,
): void {
  if (!text) return;
  const hexMatches = text.match(/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g) ?? [];
  for (const raw of hexMatches) {
    const hex = normHex(raw);
    if (hex) colors.set(hex, (colors.get(hex) ?? 0) + 1);
  }
  const fontMatches = text.matchAll(/font-family\s*:\s*([^;{}]+)/gi);
  for (const m of fontMatches) {
    const first = (m[1] || "").split(",")[0];
    const fam = normFont(first);
    if (fam) fonts.set(fam, (fonts.get(fam) ?? 0) + 1);
  }
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
    const websiteFilter = (body?.website_id as string | undefined) || null;

    const { data: adminRole } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    const isAdmin = Boolean(adminRole);

    if (workspaceId && !isAdmin) {
      const { data: member } = await supabase
        .from("workspace_members")
        .select("user_id")
        .eq("user_id", user.id)
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (!member) return json({ error: "Forbidden" }, 403);
    }

    // Collect the caller's published pages.
    let query = supabase
      .from("generated_pages")
      .select("id, website_id, campaign_id, workspace_id")
      .eq("user_id", user.id)
      .eq("status", "published");
    if (workspaceId) query = query.eq("workspace_id", workspaceId);
    if (websiteFilter) query = query.eq("website_id", websiteFilter);
    const { data: pages, error: pagesErr } = await query;
    if (pagesErr) throw new Error(`generated_pages.select: ${pagesErr.message}`);

    const rows = (pages || []) as Array<{ id: string; website_id: string | null; campaign_id: string | null }>;
    if (rows.length === 0) {
      return json({ ok: true, websites: 0, results: [], message: "No published pages found to re-sync." });
    }

    // Group campaign ids by website.
    const byWebsite = new Map<string, Set<string>>();
    for (const r of rows) {
      if (!r.website_id) continue;
      const set = byWebsite.get(r.website_id) ?? new Set<string>();
      if (r.campaign_id) set.add(r.campaign_id);
      byWebsite.set(r.website_id, set);
    }
    if (byWebsite.size === 0) {
      return json({ ok: true, websites: 0, results: [], message: "No connected WordPress website found for these pages." });
    }

    const results: Array<{ website_id: string; url?: string; ok: boolean; colors: number; fonts: number; message: string }> = [];

    for (const [websiteId, campaignIds] of byWebsite.entries()) {
      // Load + authorize the website.
      const { data: website } = await supabase
        .from("websites")
        .select("id, url, type, credentials, workspace_id, user_id")
        .eq("id", websiteId)
        .maybeSingle();
      if (!website) {
        results.push({ website_id: websiteId, ok: false, colors: 0, fonts: 0, message: "Website not found." });
        continue;
      }
      let allowed = isAdmin || website.user_id === user.id;
      if (!allowed && website.workspace_id) {
        const { data: member } = await supabase
          .from("workspace_members")
          .select("user_id")
          .eq("workspace_id", website.workspace_id)
          .eq("user_id", user.id)
          .maybeSingle();
        allowed = Boolean(member);
      }
      if (!allowed) {
        results.push({ website_id: websiteId, url: website.url, ok: false, colors: 0, fonts: 0, message: "Forbidden." });
        continue;
      }
      if (website.type !== "wordpress") {
        results.push({ website_id: websiteId, url: website.url, ok: false, colors: 0, fonts: 0, message: "Not a WordPress site." });
        continue;
      }

      // Resolve template ids used by this site's campaigns.
      const campaignList = [...campaignIds];
      const templateIds = new Set<string>();
      if (campaignList.length > 0) {
        const { data: campaigns } = await supabase
          .from("campaigns")
          .select("id, template_id")
          .in("id", campaignList);
        for (const c of (campaigns || []) as Array<{ template_id: string | null }>) {
          if (c.template_id) templateIds.add(c.template_id);
        }
      }

      const colors = new Map<string, number>();
      const fonts = new Map<string, number>();

      if (templateIds.size > 0) {
        const { data: templates } = await supabase
          .from("templates")
          .select("id, elementor_data, content")
          .in("id", [...templateIds]);
        for (const t of (templates || []) as Array<{ elementor_data: unknown; content: string | null }>) {
          if (Array.isArray(t.elementor_data)) collectFromElementor(t.elementor_data, colors, fonts);
          if (typeof t.content === "string" && t.content) collectFromText(t.content, colors, fonts);
        }
      }

      if (colors.size === 0 && fonts.size === 0) {
        results.push({ website_id: websiteId, url: website.url, ok: false, colors: 0, fonts: 0, message: "No template globals found to sync." });
        continue;
      }

      const topColors = [...colors.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([value], i) => ({ id: `tpl_c${i + 1}`, title: `Template Color ${i + 1}`, value }));
      const topFonts = [...fonts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([family], i) => ({ id: `tpl_f${i + 1}`, title: `Template Font ${i + 1}`, family }));

      try {
        const connector = await createConnector(website as WebsiteRecord);
        if (!(connector instanceof PgpConnector)) {
          results.push({
            website_id: websiteId,
            url: website.url,
            ok: false,
            colors: 0,
            fonts: 0,
            message: "Requires the 3xVisibility companion plugin + connector API key.",
          });
          continue;
        }
        const applied = await connector.applyGlobals({
          global_colors: topColors,
          global_typography: topFonts,
        });
        results.push({
          website_id: websiteId,
          url: website.url,
          ok: applied.ok,
          colors: topColors.length,
          fonts: topFonts.length,
          message: applied.ok
            ? `Synced ${topColors.length} color(s) + ${topFonts.length} font(s) into Site Settings.`
            : "Site did not confirm the global update.",
        });
      } catch (e) {
        results.push({
          website_id: websiteId,
          url: website.url,
          ok: false,
          colors: 0,
          fonts: 0,
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }

    const okCount = results.filter((r) => r.ok).length;
    return json({
      ok: okCount > 0,
      websites: results.length,
      synced: okCount,
      results,
      message: `Re-synced template globals on ${okCount}/${results.length} website(s).`,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
