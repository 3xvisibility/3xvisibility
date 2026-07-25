import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createConnector, type WebsiteRecord } from "../_shared/connectors/factory.ts";
import { PgpConnector } from "../_shared/connectors/pgp-connector.ts";
import { decryptCredentials } from "../_shared/crypto.ts";

/**
 * Probe `/wp-json/xxxv/v1/assets-status` on a connected WordPress site to see
 * whether the "3xVisibility HTML Assets" companion plugin is installed and
 * active. Without it WordPress strips <style>/<link>/<script> from published
 * page content and the design breaks.
 */
async function checkHtmlAssetsPlugin(
  siteUrl: string,
  creds: Record<string, string>,
): Promise<Record<string, unknown>> {
  const base = String(siteUrl || "").replace(/\/+$/, "");
  const endpoint = `${base}/wp-json/xxxv/v1/assets-status`;
  const username = creds.username || "";
  const password = creds.app_password || creds.password || creds.jwt_token || "";

  const headers: Record<string, string> = { Accept: "application/json" };
  if (username && password) {
    headers.Authorization = `Basic ${btoa(`${username}:${password}`)}`;
  } else if (creds.jwt_token) {
    headers.Authorization = `Bearer ${creds.jwt_token}`;
  }

  let res: Response;
  try {
    res = await fetch(endpoint, { headers });
  } catch (e) {
    return {
      installed: false,
      status: "unreachable",
      message: `Could not reach ${base}: ${(e as Error).message}`,
    };
  }

  const text = await res.text();
  let payload: Record<string, unknown> | null = null;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = null;
  }

  if (res.ok && payload && payload.plugin === "3xvisibility-html-assets") {
    return {
      installed: true,
      status: "installed",
      version: payload.version ?? null,
      unfiltered_html: payload.unfiltered_html ?? null,
      settings: payload.settings ?? null,
      message: `HTML Assets plugin v${payload.version ?? "?"} is active.`,
    };
  }

  const code = payload?.code as string | undefined;
  if (res.status === 404 || code === "rest_no_route" || code === "rest_no_route_found") {
    return {
      installed: false,
      status: "missing",
      message:
        "The HTML Assets plugin is not installed or not activated on this site. Published pages will lose their CSS/JS.",
    };
  }
  if (res.status === 401 || res.status === 403) {
    return {
      installed: false,
      status: "unauthorized",
      message:
        "WordPress rejected the credentials while checking the plugin. Reconnect the site with a valid Application Password.",
    };
  }
  return {
    installed: false,
    status: "unknown",
    message: `Plugin check returned HTTP ${res.status}. ${text.slice(0, 180)}`,
  };
}

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

type Action =
  | "list"
  | "assets_status"
  | "assign_menu"
  | "activate_theme"
  | "set_page_template";

/**
 * Control WordPress structure (nav menus, active theme, page templates) on a
 * connected site through the 3xVisibility WordPress Connector "AI Action"
 * endpoints. Read action `list` returns menus + locations, themes and
 * page-templates in one round-trip; the write actions mutate a single setting.
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
    const websiteId = body?.website_id as string | undefined;
    const action = (body?.action as Action) || "list";
    if (!websiteId) return json({ error: "website_id is required" }, 400);

    const { data: website } = await supabase
      .from("websites")
      .select("id, url, type, credentials, workspace_id, user_id")
      .eq("id", websiteId)
      .maybeSingle();
    if (!website) return json({ error: "Website not found" }, 404);

    // Authorization: caller must own the site, belong to its workspace, or be admin.
    let allowed = website.user_id === user.id;
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
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      allowed = Boolean(roleRow);
    }
    if (!allowed) return json({ error: "Forbidden" }, 403);

    if (website.type !== "wordpress") {
      return json({ error: "Site actions are only available for WordPress sites." }, 400);
    }

    const connector = await createConnector(website as WebsiteRecord);
    if (!(connector instanceof PgpConnector)) {
      return json({
        error:
          "Menu, theme and template actions require the 3xVisibility companion plugin. Install/activate it on your WordPress site and reconnect with a connector API key to enable these actions.",
      }, 400);
    }


    switch (action) {
      case "list": {
        const [menus, themes, templates] = await Promise.all([
          connector.listMenus(),
          connector.listThemes(),
          connector.listPageTemplates(),
        ]);
        return json({ success: true, menus, themes, templates });
      }
      case "assign_menu": {
        const location = String(body?.location || "");
        const menuId = Number(body?.menu_id) || 0;
        if (!location) return json({ error: "location is required" }, 400);
        const result = await connector.assignMenu(location, menuId);
        return json({ success: true, result });
      }
      case "activate_theme": {
        const stylesheet = String(body?.stylesheet || "");
        if (!stylesheet) return json({ error: "stylesheet is required" }, 400);
        const result = await connector.activateTheme(stylesheet);
        return json({ success: true, result });
      }
      case "set_page_template": {
        const postId = Number(body?.post_id) || 0;
        const template = String(body?.template || "");
        if (!postId) return json({ error: "post_id is required" }, 400);
        if (!template) return json({ error: "template is required" }, 400);
        const result = await connector.setPageTemplate(postId, template);
        return json({ success: true, result });
      }
      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Site action failed";
    return json({ error: message }, 500);
  }
});
