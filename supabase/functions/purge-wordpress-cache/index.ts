// Purge WordPress / CDN cache via known plugin REST endpoints.
// Used after Force republish to force the live site to serve fresh content.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { decryptCredentials } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PurgeAttempt {
  plugin: string;
  endpoint: string;
  method: string;
  status: number | null;
  ok: boolean;
  detail?: string;
}

// Known cache-clear endpoints exposed by popular WP cache plugins.
// We try each; a 404 just means the plugin isn't installed (safe to ignore).
function buildTargets(baseUrl: string, pageUrl?: string): Array<{ plugin: string; path: string; method: string; body?: unknown }> {
  const targets: Array<{ plugin: string; path: string; method: string; body?: unknown }> = [
    { plugin: "WP Rocket", path: "/wp-json/wp-rocket/v1/cache", method: "DELETE" },
    { plugin: "WP Rocket (legacy)", path: "/wp-json/wp-rocket/v1/purge", method: "POST" },
    { plugin: "LiteSpeed Cache", path: "/wp-json/litespeed/v1/purge_all", method: "POST" },
    { plugin: "LiteSpeed Cache (v3)", path: "/wp-json/litespeed/v3/purge", method: "POST", body: { type: "all" } },
    { plugin: "W3 Total Cache", path: "/wp-json/w3-total-cache/v1/flush/all", method: "POST" },
    { plugin: "WP Super Cache", path: "/wp-json/wp-super-cache/v1/cache", method: "DELETE" },
    { plugin: "SG Optimizer (SiteGround)", path: "/wp-json/sg-cachepress/v1/purge-cache", method: "POST" },
    { plugin: "Cloudflare (official plugin)", path: "/wp-json/cloudflare/v1/purge_cache", method: "POST", body: { purge_everything: true } },
    { plugin: "WP Fastest Cache", path: "/wp-json/wpfc/v1/clear-all-cache", method: "POST" },
    { plugin: "Autoptimize", path: "/wp-json/autoptimize/v1/clear-cache", method: "POST" },
    { plugin: "Breeze (Cloudways)", path: "/wp-json/breeze/v1/purge/all", method: "POST" },
    { plugin: "Kinsta MU", path: "/wp-json/kinsta/v1/cache/clear", method: "POST" },
    { plugin: "Nginx Helper", path: "/wp-json/nginx-helper/v1/purge/all", method: "POST" },
    // Elementor CSS regen: forces per-page CSS to be re-generated.
    { plugin: "Elementor CSS regen", path: "/wp-json/elementor/v1/globals/regenerate-css", method: "POST" },
  ];
  if (pageUrl) {
    targets.push({ plugin: "WP Rocket (single URL)", path: `/wp-json/wp-rocket/v1/cache?url=${encodeURIComponent(pageUrl)}`, method: "DELETE" });
  }
  return targets;
}

async function tryPurge(
  baseUrl: string,
  authHeader: string,
  target: { plugin: string; path: string; method: string; body?: unknown },
): Promise<PurgeAttempt> {
  const url = `${baseUrl.replace(/\/+$/, "")}${target.path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, {
      method: target.method,
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: target.body ? JSON.stringify(target.body) : undefined,
      signal: controller.signal,
    });
    let detail: string | undefined;
    if (!res.ok) {
      try {
        const txt = await res.text();
        detail = txt.slice(0, 200);
      } catch { /* ignore */ }
    }
    return {
      plugin: target.plugin,
      endpoint: target.path,
      method: target.method,
      status: res.status,
      ok: res.ok,
      detail,
    };
  } catch (err) {
    return {
      plugin: target.plugin,
      endpoint: target.path,
      method: target.method,
      status: null,
      ok: false,
      detail: (err as Error).message,
    };
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { website_id, page_url } = await req.json();
    if (!website_id) {
      return new Response(JSON.stringify({ error: "website_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: website } = await supabase
      .from("websites")
      .select("id, url, type, credentials, workspace_id")
      .eq("id", website_id)
      .maybeSingle();

    if (!website) {
      return new Response(JSON.stringify({ error: "Website not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (website.type !== "wordpress") {
      return new Response(JSON.stringify({ error: `Cache purge is only supported for WordPress sites (got ${website.type}).` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let creds: Record<string, string> = {};
    try {
      creds = await decryptCredentials(website.credentials || {});
    } catch {
      creds = (website.credentials || {}) as Record<string, string>;
    }
    const username = creds.username;
    const password = creds.app_password || creds.jwt_token || creds.password;
    if (!username || !password) {
      return new Response(JSON.stringify({ error: "Missing WordPress username or Application Password on this site." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authValue = `Basic ${btoa(`${username}:${password}`)}`;

    const targets = buildTargets(website.url, page_url);
    const attempts: PurgeAttempt[] = [];
    for (const t of targets) {
      attempts.push(await tryPurge(website.url, authValue, t));
    }

    const succeeded = attempts.filter((a) => a.ok);
    const detected = attempts.filter((a) => a.status !== null && a.status !== 404);

    return new Response(JSON.stringify({
      success: succeeded.length > 0,
      purged_plugins: succeeded.map((a) => a.plugin),
      detected_plugins: detected.map((a) => a.plugin),
      total_attempts: attempts.length,
      attempts,
      note: succeeded.length === 0
        ? "No cache plugin responded successfully. If a CDN like Cloudflare sits in front of your site, purge it manually from that provider's dashboard."
        : undefined,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
