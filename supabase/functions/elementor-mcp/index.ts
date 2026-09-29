import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) return json({ error: "Server misconfigured" }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const token = authHeader.slice(7);

  const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: userData, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !userData.user) return json({ error: "Invalid token" }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const action = String(body.action || "");
  const websiteId = String(body.website_id || "");

  if (!websiteId) return json({ error: "website_id is required" }, 400);

  const { data: siteRow, error: siteErr } = await sb
    .from("websites")
    .select("id, url, connector_api_key, username, password, access_token, user_id, workspace_id")
    .eq("id", websiteId)
    .maybeSingle();

  if (siteErr || !siteRow) return json({ error: "Website not found" }, 404);
  if (siteRow.user_id !== userData.user.id) {
    const { data: member } = await sb
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", siteRow.workspace_id)
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (!member) return json({ error: "Forbidden" }, 403);
  }

  const baseUrl = String(siteRow.url || "").replace(/\/+$/, "");
  const apiKey = String(siteRow.connector_api_key || "");
  const restBase = `${baseUrl}/wp-json/pgp/v1`;

  async function pgpCall<T>(path: string, method: string, callBody?: unknown): Promise<T> {
    const url = new URL(`${restBase}${path}`);
    if (apiKey) url.searchParams.set("connector_key", apiKey);
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers["X-PGP-Key"] = apiKey;
      headers["X-3XV-Key"] = apiKey;
      headers["Authorization"] = `Bearer ${apiKey}`;
    }
    const payload = callBody && typeof callBody === "object"
      ? { ...(callBody as Record<string, unknown>), connector_key: apiKey }
      : callBody;
    const res = await fetch(url.toString(), {
      method,
      headers,
      body: payload !== undefined ? JSON.stringify(payload) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`PGP ${method} ${path} failed (${res.status}): ${text.slice(0, 300)}`);
    }
    return (await res.json()) as T;
  }

  try {
    if (action === "test-connection") {
      const info = await pgpCall<{ ok: boolean; plugin?: string; version?: string; elementor_active?: boolean }>("/ping", "GET");
      return json({ success: true, info });
    }

    if (action === "list-pages") {
      const page = Number(body.page || 1);
      const perPage = Math.min(Number(body.per_page || 20), 100);
      const pages = await pgpCall<unknown[]>(`/pages?per_page=${perPage}&page=${page}&context=edit`, "GET");
      return json({ success: true, pages });
    }

    if (action === "get-page") {
      const postId = String(body.post_id || "");
      if (!postId) return json({ error: "post_id required" }, 400);
      const pageData = await pgpCall<unknown>(`/pages/${postId}?context=edit`, "GET");
      return json({ success: true, page: pageData });
    }

    if (action === "create-page") {
      const title = String(body.title || "Untitled");
      const slug = String(body.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `page-${Date.now()}`);
      const status = body.status === "publish" ? "publish" : "draft";
      const elementorData = body.elementor_data ? String(body.elementor_data) : undefined;
      const elementorCss = body.elementor_css ? String(body.elementor_css) : undefined;
      const content = body.content ? String(body.content) : "";
      const seoTitle = body.seo_title ? String(body.seo_title) : title;
      const seoDesc = body.seo_description ? String(body.seo_description) : "";
      const template = body.page_template ? String(body.page_template) : "elementor_header_footer";

      const payload: Record<string, unknown> = {
        title,
        slug,
        status,
        save_as_template: true,
        page_template: template,
        meta: {
          _yoast_wpseo_title: seoTitle,
          _yoast_wpseo_metadesc: seoDesc,
        },
      };
      if (elementorData) {
        payload.elementor_data = elementorData;
        payload.exact_render = false;
      } else if (content) {
        payload.content = content;
      }
      if (elementorCss) payload.elementor_css = elementorCss;
      if (body.global_colors) payload.global_colors = body.global_colors;
      if (body.global_typography) payload.global_typography = body.global_typography;

      const result = await pgpCall<{ ok: boolean; post_id: number; url: string }>("/publish/elementor", "POST", payload);
      return json({ success: true, post_id: result.post_id, url: result.url });
    }

    if (action === "update-page") {
      const postId = String(body.post_id || "");
      if (!postId) return json({ error: "post_id required" }, 400);
      const payload: Record<string, unknown> = { post_id: postId };
      if (body.title) payload.title = String(body.title);
      if (body.slug) payload.slug = String(body.slug);
      if (body.status) payload.status = String(body.status);
      if (body.elementor_data) payload.elementor_data = String(body.elementor_data);
      if (body.elementor_css) payload.elementor_css = String(body.elementor_css);
      if (body.content) payload.content = String(body.content);
      if (body.seo_title || body.seo_description) {
        payload.meta = {};
        if (body.seo_title) (payload.meta as Record<string, string>)._yoast_wpseo_title = String(body.seo_title);
        if (body.seo_description) (payload.meta as Record<string, string>)._yoast_wpseo_metadesc = String(body.seo_description);
      }
      const result = await pgpCall<{ ok: boolean; post_id: number; url: string }>("/publish/elementor", "POST", payload);
      return json({ success: true, post_id: result.post_id, url: result.url });
    }

    if (action === "delete-page") {
      const postId = String(body.post_id || "");
      if (!postId) return json({ error: "post_id required" }, 400);
      await pgpCall(`/pages/${postId}`, "DELETE");
      return json({ success: true });
    }

    if (action === "list-templates") {
      const templates = await pgpCall<unknown[]>("/templates?per_page=100", "GET");
      return json({ success: true, templates });
    }

    if (action === "get-globals") {
      const globals = await pgpCall<unknown>("/globals", "GET");
      return json({ success: true, globals });
    }

    if (action === "update-seo") {
      const postId = String(body.post_id || "");
      if (!postId) return json({ error: "post_id required" }, 400);
      const meta: Record<string, string> = {};
      if (body.seo_title) meta._yoast_wpseo_title = String(body.seo_title);
      if (body.seo_description) meta._yoast_wpseo_metadesc = String(body.seo_description);
      if (body.canonical_url) meta._yoast_wpseo_canonical = String(body.canonical_url);
      if (Object.keys(meta).length === 0) return json({ error: "No SEO fields provided" }, 400);
      await pgpCall(`/pages/${postId}`, "POST", { post_id: postId, meta });
      return json({ success: true });
    }

    if (action === "upload-media") {
      const mediaUrl = String(body.media_url || "");
      const altText = String(body.alt_text || "");
      if (!mediaUrl) return json({ error: "media_url required" }, 400);
      const result = await pgpCall<{ id: number; url: string }>("/media", "POST", { url: mediaUrl, alt: altText });
      return json({ success: true, media_id: result.id, media_url: result.url });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
});
