import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { decrypt, decryptCredentials } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function shopifyFetch(url: string, init: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    const res = await fetch(url, init);
    if (res.status === 429) {
      const delay = Math.min(parseFloat(res.headers.get("Retry-After") || "2") * 1000, 10000);
      await new Promise(r => setTimeout(r, delay));
      continue;
    }
    return res;
  }
  throw new Error("Shopify rate limit exceeded after retries");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const { action, website_id } = body;

    if (!website_id || !action) return json({ error: "website_id and action are required" }, 400);

    // Fetch website with credentials
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: website, error: wsError } = await supabase
      .from("websites")
      .select("*")
      .eq("id", website_id)
      .eq("user_id", user.id)
      .eq("type", "shopify")
      .maybeSingle();

    if (wsError || !website) return json({ error: "Shopify website not found" }, 404);

    // ---- DB-only actions (no Shopify token needed) ----
    if (action === "get_sync_events") {
      const limit = body.sync_limit || 20;
      const { data: events, error: evErr } = await supabase
        .from("shopify_sync_events")
        .select("*")
        .eq("website_id", website_id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (evErr) return json({ error: evErr.message }, 500);
      return json({ events: events || [] });
    }

    // Read token from shopify_connections (preferred) or fall back to legacy credentials
    const wsCreds = (website.credentials || {}) as Record<string, string>;
    const domain = wsCreds?.shop_domain || website.url.replace(/^https?:\/\//, "").replace(/\/+$/, "");

    let token: string | undefined;
    const { data: conn } = await supabase
      .from("shopify_connections")
      .select("access_token")
      .eq("website_id", website_id)
      .maybeSingle();
    if (conn?.access_token) {
      try {
        token = await decrypt(conn.access_token);
      } catch {
        // May be a legacy unencrypted value
        token = conn.access_token;
      }
    } else {
      // Legacy fallback — decrypt from websites.credentials
      try {
        const decrypted = await decryptCredentials(wsCreds);
        token = decrypted?.admin_api_token;
      } catch { /* no legacy token */ }
    }

    if (!token) {
      if (action === "list_products") {
        return json({
          products: [],
          next_page_info: null,
          total: 0,
          setup_required: true,
          message: "Reconnect this Shopify store with OAuth to load products.",
        });
      }
      return json({ error: "Reconnect this Shopify store with OAuth before using Shopify products." }, 400);
    }

    const apiBase = `https://${domain}/admin/api/2024-01`;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    };

    // ---- LIST PRODUCTS ----
    if (action === "list_products") {
      const limit = body.limit || 50;
      const pageInfo = body.page_info || "";
      let url = `${apiBase}/products.json?limit=${limit}`;
      if (pageInfo) url = `${apiBase}/products.json?limit=${limit}&page_info=${pageInfo}`;

      const res = await shopifyFetch(url, { headers });
      if (!res.ok) {
        const err = await res.text();
        return json({ error: `Shopify API error (${res.status}): ${err}` }, res.status);
      }

      const data = await res.json();
      const linkHeader = res.headers.get("Link");
      const nextMatch = linkHeader?.match(/<[^>]+page_info=([^&>]+)[^>]*>;\s*rel="next"/);
      const nextPageInfo = nextMatch ? nextMatch[1] : null;

      return json({
        products: data.products,
        next_page_info: nextPageInfo,
        total: data.products?.length || 0,
      });
    }

    // ---- GET PRODUCT ----
    if (action === "get_product") {
      const { product_id } = body;
      if (!product_id) return json({ error: "product_id required" }, 400);

      const res = await shopifyFetch(`${apiBase}/products/${product_id}.json`, { headers });
      if (!res.ok) {
        const err = await res.text();
        return json({ error: `Shopify API error (${res.status}): ${err}` }, res.status);
      }

      const data = await res.json();
      return json({ product: data.product });
    }

    // ---- GET PRODUCT METAFIELDS (SEO) ----
    if (action === "get_product_metafields") {
      const { product_ids } = body; // array of product IDs
      if (!Array.isArray(product_ids) || !product_ids.length) return json({ error: "product_ids array required" }, 400);

      const results: Record<string, { seo_title: string; seo_description: string }> = {};

      for (const pid of product_ids) {
        try {
          const res = await shopifyFetch(
            `${apiBase}/products/${pid}/metafields.json?namespace=global`,
            { headers },
          );
          let seoTitle = "";
          let seoDesc = "";

          if (res.ok) {
            const data = await res.json();
            const mfs = data.metafields || [];
            for (const mf of mfs) {
              if (mf.key === "title_tag") seoTitle = mf.value || "";
              if (mf.key === "description_tag") seoDesc = mf.value || "";
            }
          }
          results[String(pid)] = { seo_title: seoTitle, seo_description: seoDesc };
        } catch {
          results[String(pid)] = { seo_title: "", seo_description: "" };
        }
      }

      return json({ metafields: results });
    }

    // ---- UPDATE PRODUCT ----
    if (action === "update_product") {
      const { product_id, updates } = body;
      if (!product_id || !updates) return json({ error: "product_id and updates required" }, 400);

      const productBody: Record<string, unknown> = {};
      if (updates.title !== undefined) productBody.title = updates.title;
      if (updates.body_html !== undefined) productBody.body_html = updates.body_html;
      if (updates.vendor !== undefined) productBody.vendor = updates.vendor;
      if (updates.product_type !== undefined) productBody.product_type = updates.product_type;
      if (updates.tags !== undefined) productBody.tags = Array.isArray(updates.tags) ? updates.tags.join(", ") : updates.tags;
      if (updates.status !== undefined) productBody.status = updates.status;
      if (updates.handle !== undefined) productBody.handle = updates.handle;

      // SEO metafields
      if (updates.seo_title !== undefined) productBody.metafields_global_title_tag = updates.seo_title;
      if (updates.seo_description !== undefined) productBody.metafields_global_description_tag = updates.seo_description;

      const res = await shopifyFetch(`${apiBase}/products/${product_id}.json`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ product: productBody }),
      });

      if (!res.ok) {
        const err = await res.text();
        return json({ error: `Shopify update error (${res.status}): ${err}` }, res.status);
      }

      const data = await res.json();
      return json({ product: data.product });
    }

    // ---- BULK SEO UPDATE ----
    if (action === "bulk_seo_update") {
      const { products } = body; // Array of { product_id, seo_title, seo_description }
      if (!Array.isArray(products) || !products.length) return json({ error: "products array required" }, 400);

      const results: Array<{ product_id: string; success: boolean; error?: string }> = [];

      for (const p of products) {
        try {
          const seoBody: Record<string, unknown> = {};
          if (p.seo_title) seoBody.metafields_global_title_tag = p.seo_title;
          if (p.seo_description) seoBody.metafields_global_description_tag = p.seo_description;

          const res = await shopifyFetch(`${apiBase}/products/${p.product_id}.json`, {
            method: "PUT",
            headers,
            body: JSON.stringify({ product: seoBody }),
          });

          if (!res.ok) {
            const err = await res.text();
            results.push({ product_id: p.product_id, success: false, error: `${res.status}: ${err}` });
          } else {
            results.push({ product_id: p.product_id, success: true });
          }
        } catch (e: any) {
          results.push({ product_id: p.product_id, success: false, error: e.message });
        }
      }

      const successCount = results.filter(r => r.success).length;
      return json({ results, success_count: successCount, total: results.length });
    }

    // ---- REGISTER WEBHOOKS ----
    if (action === "register_webhooks") {
      const webhookUrl = `${supabaseUrl}/functions/v1/shopify-webhooks`;
      const topics = ["products/create", "products/update", "products/delete"];
      const results: Array<{ topic: string; success: boolean; error?: string }> = [];

      for (const topic of topics) {
        try {
          const res = await shopifyFetch(`${apiBase}/webhooks.json`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              webhook: { topic, address: webhookUrl, format: "json" },
            }),
          });
          if (res.ok) {
            results.push({ topic, success: true });
          } else {
            const err = await res.text();
            // 422 usually means already registered
            if (res.status === 422) {
              results.push({ topic, success: true, error: "already registered" });
            } else {
              results.push({ topic, success: false, error: `${res.status}: ${err}` });
            }
          }
        } catch (e: any) {
          results.push({ topic, success: false, error: e.message });
        }
      }

      return json({ results, registered: results.filter(r => r.success).length });
    }

    // ---- LIST WEBHOOKS ----
    if (action === "list_webhooks") {
      const res = await shopifyFetch(`${apiBase}/webhooks.json`, { headers });
      if (!res.ok) {
        const err = await res.text();
        return json({ error: `Shopify API error (${res.status}): ${err}` }, res.status);
      }
      const data = await res.json();
      return json({ webhooks: data.webhooks || [] });
    }


    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err: any) {
    console.error("shopify-products error:", err);
    return json({ error: err.message || "Internal error" }, 500);
  }
});
