import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface WebsiteCredentials {
  username?: string;
  app_password?: string;
  admin_api_token?: string;
  api_key?: string;
  consumer_key?: string;
  consumer_secret?: string;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// ── WooCommerce ──
async function publishProductToWooCommerce(
  siteUrl: string,
  credentials: WebsiteCredentials,
  product: any,
  categoryMap: Record<string, string>
): Promise<{ name: string; external_id: string; external_url: string }> {
  const baseUrl = siteUrl.replace(/\/$/, "");
  const { consumer_key, consumer_secret } = credentials;
  if (!consumer_key || !consumer_secret) throw new Error("WooCommerce credentials not configured");

  const payload: Record<string, any> = {
    name: product.name,
    type: "simple",
    description: product.description || "",
    short_description: product.seo_description || "",
    slug: slugify(product.name),
    status: "publish",
    regular_price: String(product.price || "0"),
  };

  if (product.image && !product.image.startsWith("data:")) {
    payload.images = [{ src: product.image }];
  }

  // Map to WooCommerce category if exists
  if (product.category && categoryMap[product.category]) {
    payload.categories = [{ id: parseInt(categoryMap[product.category]) }];
  }

  if (product.seo_title) {
    payload.meta_data = [{ key: "_yoast_wpseo_title", value: product.seo_title }];
  }
  if (product.seo_description) {
    payload.meta_data = [
      ...(payload.meta_data || []),
      { key: "_yoast_wpseo_metadesc", value: product.seo_description },
    ];
  }

  const url = `${baseUrl}/wp-json/wc/v3/products?consumer_key=${consumer_key}&consumer_secret=${consumer_secret}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`WooCommerce error [${resp.status}]: ${err}`);
  }

  const data = await resp.json();
  return { name: product.name, external_id: String(data.id), external_url: data.permalink || `${baseUrl}/product/${data.slug}` };
}

async function createWooCategoryIfNeeded(
  siteUrl: string,
  credentials: WebsiteCredentials,
  categoryName: string
): Promise<string> {
  const baseUrl = siteUrl.replace(/\/$/, "");
  const { consumer_key, consumer_secret } = credentials;

  // Check if exists
  const searchUrl = `${baseUrl}/wp-json/wc/v3/products/categories?consumer_key=${consumer_key}&consumer_secret=${consumer_secret}&search=${encodeURIComponent(categoryName)}`;
  const searchResp = await fetch(searchUrl);
  if (searchResp.ok) {
    const cats = await searchResp.json();
    const match = cats.find((c: any) => c.name.toLowerCase() === categoryName.toLowerCase());
    if (match) return String(match.id);
  }

  // Create
  const createUrl = `${baseUrl}/wp-json/wc/v3/products/categories?consumer_key=${consumer_key}&consumer_secret=${consumer_secret}`;
  const resp = await fetch(createUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: categoryName, slug: slugify(categoryName) }),
  });
  if (!resp.ok) throw new Error(`Failed to create WooCommerce category: ${categoryName}`);
  const data = await resp.json();
  return String(data.id);
}

// ── Shopify ──
async function publishProductToShopify(
  siteUrl: string,
  credentials: WebsiteCredentials,
  product: any
): Promise<{ name: string; external_id: string; external_url: string }> {
  const shopDomain = siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const apiUrl = `https://${shopDomain}/admin/api/2024-01/products.json`;

  const payload: Record<string, any> = {
    title: product.name,
    body_html: product.description || "",
    handle: slugify(product.name),
    status: "active",
    product_type: product.category || "",
    variants: [{ price: String(product.price || "0") }],
  };

  if (product.image && !product.image.startsWith("data:")) {
    payload.images = [{ src: product.image }];
  }
  if (product.seo_title) payload.metafields_global_title_tag = product.seo_title;
  if (product.seo_description) payload.metafields_global_description_tag = product.seo_description;

  const resp = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": credentials.admin_api_token!,
    },
    body: JSON.stringify({ product: payload }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Shopify error [${resp.status}]: ${err}`);
  }

  const data = await resp.json();
  return {
    name: product.name,
    external_id: String(data.product.id),
    external_url: `https://${shopDomain}/products/${data.product.handle}`,
  };
}

// ── PrestaShop ──
async function publishProductToPrestaShop(
  siteUrl: string,
  credentials: WebsiteCredentials,
  product: any
): Promise<{ name: string; external_id: string; external_url: string }> {
  const baseUrl = siteUrl.replace(/\/$/, "");
  const apiKey = credentials.api_key;
  if (!apiKey) throw new Error("PrestaShop API key not configured");

  const auth = btoa(`${apiKey}:`);
  const linkRewrite = slugify(product.name);
  const price = String(product.price || "0.000000");

  let langId = "1";
  try {
    const langResp = await fetch(`${baseUrl}/api/languages?output_format=JSON&filter[active]=1&limit=1`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (langResp.ok) {
      const langData = await langResp.json();
      if (langData.languages?.length > 0) langId = String(langData.languages[0].id);
    }
  } catch { /* default */ }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <product>
    <price>${price}</price>
    <active>1</active>
    <state>1</state>
    <id_tax_rules_group>1</id_tax_rules_group>
    <id_category_default>2</id_category_default>
    <meta_title><language id="${langId}"><![CDATA[${product.seo_title || product.name}]]></language></meta_title>
    <meta_description><language id="${langId}"><![CDATA[${product.seo_description || ""}]]></language></meta_description>
    <name><language id="${langId}"><![CDATA[${product.name}]]></language></name>
    <description><language id="${langId}"><![CDATA[${product.description || ""}]]></language></description>
    <description_short><language id="${langId}"><![CDATA[${product.seo_description || ""}]]></language></description_short>
    <link_rewrite><language id="${langId}"><![CDATA[${linkRewrite}]]></language></link_rewrite>
  </product>
</prestashop>`;

  const resp = await fetch(`${baseUrl}/api/products`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/xml" },
    body: xml,
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`PrestaShop error [${resp.status}]: ${err}`);
  }

  const text = await resp.text();
  const idMatch = text.match(/<id>(?:<!\[CDATA\[)?(\d+)(?:\]\]>)?<\/id>/);
  const productId = idMatch ? idMatch[1] : "unknown";

  return {
    name: product.name,
    external_id: productId,
    external_url: `${baseUrl}/${productId}-${linkRewrite}.html`,
  };
}

// ── Main handler ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { generation_id } = await req.json();

    // Fetch the generation
    const { data: gen, error: genErr } = await supabase
      .from("store_generations")
      .select("*")
      .eq("id", generation_id)
      .eq("user_id", user.id)
      .single();

    if (genErr || !gen) {
      return new Response(JSON.stringify({ error: "Generation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!gen.website_id) {
      return new Response(JSON.stringify({ error: "No website selected for this generation. Edit the generation and select a target website." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch website
    const { data: website, error: webErr } = await supabase
      .from("websites")
      .select("*")
      .eq("id", gen.website_id)
      .eq("user_id", user.id)
      .single();

    if (webErr || !website) {
      return new Response(JSON.stringify({ error: "Website not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const credentials = (website.credentials || {}) as WebsiteCredentials;
    const products = (gen.products || []) as any[];
    const categories = (gen.categories || []) as any[];

    if (products.length === 0) {
      return new Response(JSON.stringify({ error: "No products to publish" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update status
    await supabase.from("store_generations").update({ status: "publishing" }).eq("id", generation_id);

    let published = 0;
    let failed = 0;
    const results: { name: string; status: string; url?: string; error?: string }[] = [];

    // Create categories first for WooCommerce
    const categoryMap: Record<string, string> = {};
    if (website.type === "woocommerce") {
      for (const cat of categories) {
        try {
          const catId = await createWooCategoryIfNeeded(website.url, credentials, cat.name);
          categoryMap[cat.name] = catId;
        } catch (e) {
          console.error(`Failed to create category ${cat.name}:`, e);
        }
      }
    }

    // Publish products
    for (const product of products) {
      try {
        let result: { name: string; external_id: string; external_url: string };

        switch (website.type) {
          case "woocommerce":
          case "wordpress":
            result = await publishProductToWooCommerce(website.url, credentials, product, categoryMap);
            break;
          case "shopify":
            result = await publishProductToShopify(website.url, credentials, product);
            break;
          case "prestashop":
            result = await publishProductToPrestaShop(website.url, credentials, product);
            break;
          default:
            throw new Error(`Unsupported platform: ${website.type}`);
        }

        results.push({ name: result.name, status: "published", url: result.external_url });
        published++;
      } catch (e: any) {
        results.push({ name: product.name, status: "failed", error: e.message });
        failed++;
      }
    }

    // Update generation status
    const finalStatus = failed === products.length ? "publish_failed" : "published";
    await supabase.from("store_generations").update({
      status: finalStatus,
      error_message: failed > 0 ? `${failed} of ${products.length} products failed to publish` : null,
    }).eq("id", generation_id);

    return new Response(JSON.stringify({ published, failed, total: products.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("publish-store error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
