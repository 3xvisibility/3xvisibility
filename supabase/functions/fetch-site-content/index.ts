import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ContentItem {
  id: string;
  title: string;
  slug: string;
  url: string;
  type: "page" | "product";
  status: string;
  content: string;
  excerpt: string;
  modified: string;
  // Elementor / page-builder meta for design preservation
  elementor_data?: string;
  elementor_edit_mode?: string;
  page_template?: string;
  raw_meta?: Record<string, any>;
}

async function fetchWordPressContent(
  baseUrl: string,
  credentials: { username: string; app_password: string },
  contentType: "pages" | "products"
): Promise<ContentItem[]> {
  const auth = btoa(`${credentials.username}:${credentials.app_password}`);
  const items: ContentItem[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const endpoint = contentType === "products"
      ? `${baseUrl}/wp-json/wc/v3/products?per_page=${perPage}&page=${page}`
      : `${baseUrl}/wp-json/wp/v2/${contentType}?per_page=${perPage}&page=${page}&_embed&context=edit`;

    const headers: Record<string, string> = contentType === "products"
      ? {}
      : { Authorization: `Basic ${auth}` };

    let url = endpoint;
    if (contentType === "products") {
      url = `${baseUrl}/wp-json/wp/v2/product?per_page=${perPage}&page=${page}&_embed`;
      headers["Authorization"] = `Basic ${auth}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      if (contentType === "products") return [];
      const err = await response.text();
      throw new Error(`WordPress API error [${response.status}]: ${err}`);
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) break;

    for (const item of data) {
      const meta = item.meta || {};
      items.push({
        id: String(item.id),
        title: item.title?.rendered || item.title?.raw || item.name || "",
        slug: item.slug || "",
        url: item.link || `${baseUrl}/${item.slug}`,
        type: contentType === "products" ? "product" : "page",
        status: item.status || "publish",
        content: item.content?.rendered || item.content?.raw || item.description || "",
        excerpt: item.excerpt?.rendered || item.excerpt?.raw || item.short_description || "",
        modified: item.modified || item.date_modified || "",
        // Capture Elementor data for design preservation
        elementor_data: meta._elementor_data || undefined,
        elementor_edit_mode: meta._elementor_edit_mode || undefined,
        page_template: item.template || meta._wp_page_template || undefined,
        raw_meta: meta,
      });
    }

    const totalPages = parseInt(response.headers.get("X-WP-TotalPages") || "1");
    if (page >= totalPages) break;
    page++;
  }

  // For pages with Elementor edit mode but missing _elementor_data, try fetching individually
  for (const item of items) {
    if (!item.elementor_data && item.type === "page") {
      try {
        const singleResp = await fetch(
          `${baseUrl}/wp-json/wp/v2/pages/${item.id}?context=edit`,
          { headers: { Authorization: `Basic ${auth}` } }
        );
        if (singleResp.ok) {
          const singleData = await singleResp.json();
          const meta = singleData.meta || {};
          if (meta._elementor_data) {
            item.elementor_data = meta._elementor_data;
            item.elementor_edit_mode = meta._elementor_edit_mode || "builder";
          }
          if (singleData.template) {
            item.page_template = singleData.template;
          }
          // Also get raw content (not rendered) for better template building
          if (singleData.content?.raw) {
            item.raw_meta = { ...item.raw_meta, _raw_content: singleData.content.raw };
          }
        }
      } catch { /* skip individual fetch errors */ }
    }
  }

  return items;
}

async function fetchShopifyContent(
  baseUrl: string,
  credentials: { admin_api_token: string },
  contentType: "pages" | "products"
): Promise<ContentItem[]> {
  const shopDomain = baseUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const items: ContentItem[] = [];
  let url = contentType === "products"
    ? `https://${shopDomain}/admin/api/2024-01/products.json?limit=250`
    : `https://${shopDomain}/admin/api/2024-01/pages.json?limit=250`;

  while (url) {
    const response = await fetch(url, {
      headers: { "X-Shopify-Access-Token": credentials.admin_api_token },
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Shopify API error [${response.status}]: ${err}`);
    }

    const data = await response.json();
    const list = contentType === "products" ? data.products : data.pages;

    for (const item of list || []) {
      items.push({
        id: String(item.id),
        title: item.title || "",
        slug: item.handle || "",
        url: contentType === "products"
          ? `https://${shopDomain}/products/${item.handle}`
          : `https://${shopDomain}/pages/${item.handle}`,
        type: contentType === "products" ? "product" : "page",
        status: item.published_at ? "published" : "draft",
        content: item.body_html || "",
        excerpt: contentType === "products" ? (item.body_html || "").replace(/<[^>]*>/g, "").slice(0, 200) : "",
        modified: item.updated_at || "",
      });
    }

    const linkHeader = response.headers.get("Link");
    const nextMatch = linkHeader?.match(/<([^>]+)>;\s*rel="next"/);
    url = nextMatch ? nextMatch[1] : "";
  }

  return items;
}

async function fetchPrestaShopContent(
  baseUrl: string,
  credentials: { api_key: string },
  contentType: "pages" | "products"
): Promise<ContentItem[]> {
  const auth = btoa(`${credentials.api_key}:`);
  const resource = contentType === "products" ? "products" : "cms";
  const items: ContentItem[] = [];

  const listResp = await fetch(
    `${baseUrl}/api/${resource}?output_format=JSON&display=full`,
    { headers: { Authorization: `Basic ${auth}` } }
  );

  if (!listResp.ok) {
    if (contentType === "products") return [];
    const err = await listResp.text();
    throw new Error(`PrestaShop API error [${listResp.status}]: ${err}`);
  }

  const data = await listResp.json();
  const list = contentType === "products" ? data.products : data.cms;

  for (const item of list || []) {
    const name = contentType === "products"
      ? (item.name?.[0]?.value || item.name || "")
      : (item.meta_title?.[0]?.value || item.meta_title || "");
    const content = contentType === "products"
      ? (item.description?.[0]?.value || item.description || "")
      : (item.content?.[0]?.value || item.content || "");

    items.push({
      id: String(item.id),
      title: name,
      slug: item.link_rewrite?.[0]?.value || item.link_rewrite || String(item.id),
      url: `${baseUrl}/${item.link_rewrite?.[0]?.value || item.id}`,
      type: contentType === "products" ? "product" : "page",
      status: item.active === "1" || item.active === 1 ? "published" : "draft",
      content,
      excerpt: content.replace(/<[^>]*>/g, "").slice(0, 200),
      modified: item.date_upd || "",
    });
  }

  return items;
}

async function fetchWooCommerceProducts(
  baseUrl: string,
  credentials: { consumer_key: string; consumer_secret: string }
): Promise<ContentItem[]> {
  const items: ContentItem[] = [];
  let page = 1;

  while (true) {
    const url = `${baseUrl}/wp-json/wc/v3/products?per_page=100&page=${page}&consumer_key=${encodeURIComponent(credentials.consumer_key)}&consumer_secret=${encodeURIComponent(credentials.consumer_secret)}`;
    const response = await fetch(url);

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`WooCommerce API error [${response.status}]: ${err}`);
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) break;

    for (const item of data) {
      items.push({
        id: String(item.id),
        title: item.name || "",
        slug: item.slug || "",
        url: item.permalink || `${baseUrl}/product/${item.slug}`,
        type: "product",
        status: item.status || "publish",
        content: item.description || "",
        excerpt: item.short_description || "",
        modified: item.date_modified || "",
      });
    }

    const totalPages = parseInt(response.headers.get("X-WP-TotalPages") || "1");
    if (page >= totalPages) break;
    page++;
  }

  return items;
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

    const { website_id, content_type } = await req.json();
    if (!website_id) {
      return new Response(JSON.stringify({ error: "website_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: website, error: wsError } = await supabase
      .from("websites")
      .select("*")
      .eq("id", website_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (wsError || !website) {
      return new Response(JSON.stringify({ error: "Website not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = website.url.replace(/\/$/, "");
    const credentials = website.credentials as any;
    const type = content_type || "pages";
    let items: ContentItem[] = [];

    if (website.type === "wordpress") {
      items = await fetchWordPressContent(baseUrl, credentials, type);
    } else if (website.type === "shopify") {
      items = await fetchShopifyContent(baseUrl, credentials, type);
    } else if (website.type === "prestashop") {
      items = await fetchPrestaShopContent(baseUrl, credentials, type);
    } else if (website.type === "woocommerce") {
      if (type === "products") {
        items = await fetchWooCommerceProducts(baseUrl, credentials);
      } else {
        const wpCreds = { username: credentials.consumer_key, app_password: credentials.consumer_secret };
        try {
          items = await fetchWordPressContent(baseUrl, wpCreds, "pages");
        } catch {
          items = [];
        }
      }
    }

    console.log(`Fetched ${items.length} ${type} from ${website.name}`);

    return new Response(
      JSON.stringify({ success: true, items, total: items.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("fetch-site-content error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Failed to fetch site content" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
