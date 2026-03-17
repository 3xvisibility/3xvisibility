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
  api_key?: string; // PrestaShop
  consumer_key?: string; // WooCommerce
  consumer_secret?: string; // WooCommerce
}

interface SeoData {
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string[] | null;
}

function buildOgMetaTags(
  title: string,
  description: string,
  url?: string,
  imageUrl?: string
): string {
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const tags = [
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${escape(title)}">`,
    `<meta property="og:description" content="${escape(description)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escape(title)}">`,
    `<meta name="twitter:description" content="${escape(description)}">`,
  ];
  if (url) tags.push(`<meta property="og:url" content="${escape(url)}">`);
  if (imageUrl) {
    tags.push(`<meta property="og:image" content="${escape(imageUrl)}">`);
    tags.push(`<meta name="twitter:image" content="${escape(imageUrl)}">`);
  }
  return tags.join("\n");
}

async function publishToWordPress(
  siteUrl: string,
  credentials: WebsiteCredentials,
  title: string,
  content: string,
  slug: string,
  seo: SeoData
): Promise<{ external_id: string; external_url: string }> {
  const apiUrl = `${siteUrl.replace(/\/$/, "")}/wp-json/wp/v2/pages`;
  const auth = btoa(`${credentials.username}:${credentials.app_password}`);

  // Build the page body with SEO meta injected via Yoast/RankMath compatible excerpt + meta
  const pageBody: Record<string, any> = {
    title,
    content,
    slug,
    status: "publish",
  };

  // WordPress REST API supports excerpt which many SEO plugins use
  if (seo.seo_description) {
    pageBody.excerpt = seo.seo_description;
  }

  // Add Yoast SEO metadata if the plugin is active (fields are silently ignored if not)
  if (seo.seo_title || seo.seo_description) {
    pageBody.meta = {
      ...(seo.seo_title ? { _yoast_wpseo_title: seo.seo_title } : {}),
      ...(seo.seo_description ? { _yoast_wpseo_metadesc: seo.seo_description } : {}),
      ...(seo.seo_keywords?.length ? { _yoast_wpseo_focuskw: seo.seo_keywords[0] } : {}),
    };
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify(pageBody),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`WordPress API error [${response.status}]: ${errorBody}`);
  }

  const data = await response.json();
  return {
    external_id: String(data.id),
    external_url: data.link || `${siteUrl}/${slug}`,
  };
}

async function publishToShopify(
  siteUrl: string,
  credentials: WebsiteCredentials,
  title: string,
  content: string,
  seo: SeoData
): Promise<{ external_id: string; external_url: string }> {
  const shopDomain = siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const apiUrl = `https://${shopDomain}/admin/api/2024-01/pages.json`;

  const pagePayload: Record<string, any> = {
    title,
    body_html: content,
    published: true,
  };

  if (seo.seo_title) {
    pagePayload.metafields_global_title_tag = seo.seo_title;
  }
  if (seo.seo_description) {
    pagePayload.metafields_global_description_tag = seo.seo_description;
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": credentials.admin_api_token!,
    },
    body: JSON.stringify({ page: pagePayload }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Shopify API error [${response.status}]: ${errorBody}`);
  }

  const data = await response.json();
  return {
    external_id: String(data.page.id),
    external_url: `https://${shopDomain}/pages/${data.page.handle}`,
  };
}

async function publishProductToShopify(
  siteUrl: string,
  credentials: WebsiteCredentials,
  title: string,
  content: string,
  slug: string,
  seo: SeoData,
  extraData?: Record<string, any>
): Promise<{ external_id: string; external_url: string }> {
  const shopDomain = siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const apiUrl = `https://${shopDomain}/admin/api/2024-01/products.json`;

  const productPayload: Record<string, any> = {
    title,
    body_html: content,
    handle: slugify(slug || title),
    status: "active",
  };

  if (extraData?.price) {
    productPayload.variants = [{ price: String(extraData.price) }];
  }
  if (extraData?.images || extraData?.image) {
    const imgs = extraData.images || (extraData.image ? [extraData.image] : []);
    productPayload.images = imgs.filter((src: string) => src && !src.startsWith("data:")).map((src: string) => ({ src }));
  }
  if (seo.seo_title) {
    productPayload.metafields_global_title_tag = seo.seo_title;
  }
  if (seo.seo_description) {
    productPayload.metafields_global_description_tag = seo.seo_description;
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": credentials.admin_api_token!,
    },
    body: JSON.stringify({ product: productPayload }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Shopify Product API error [${response.status}]: ${errorBody}`);
  }

  const data = await response.json();
  return {
    external_id: String(data.product.id),
    external_url: `https://${shopDomain}/products/${data.product.handle}`,
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function publishToPrestaShop(
  siteUrl: string,
  credentials: WebsiteCredentials,
  title: string,
  content: string,
  slug: string,
  seo: SeoData
): Promise<{ external_id: string; external_url: string }> {
  const baseUrl = siteUrl.replace(/\/$/, "");
  const apiKey = credentials.api_key;
  if (!apiKey) throw new Error("PrestaShop API key not configured");

  const auth = btoa(`${apiKey}:`);
  const linkRewrite = slugify(slug || title);
  const metaTitle = seo.seo_title || title;
  const metaDescription = seo.seo_description || "";

  // PrestaShop Webservice XML for CMS page creation
  // We need to first get the default language ID
  let langId = "1"; // Default
  try {
    const langResp = await fetch(`${baseUrl}/api/languages?output_format=JSON&filter[active]=1&limit=1`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (langResp.ok) {
      const langData = await langResp.json();
      if (langData.languages?.length > 0) {
        langId = String(langData.languages[0].id);
      }
    }
  } catch { /* use default lang */ }

  // Get the first CMS category (usually id=1 "Home")
  let cmsCategoryId = "1";

  // Build XML payload for PrestaShop Webservice
  const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <cms>
    <id_cms_category>${cmsCategoryId}</id_cms_category>
    <active>1</active>
    <indexation>1</indexation>
    <meta_title>
      <language id="${langId}"><![CDATA[${metaTitle}]]></language>
    </meta_title>
    <meta_description>
      <language id="${langId}"><![CDATA[${metaDescription}]]></language>
    </meta_description>
    <meta_keywords>
      <language id="${langId}"><![CDATA[${(seo.seo_keywords || []).join(", ")}]]></language>
    </meta_keywords>
    <link_rewrite>
      <language id="${langId}"><![CDATA[${linkRewrite}]]></language>
    </link_rewrite>
    <content>
      <language id="${langId}"><![CDATA[${content}]]></language>
    </content>
  </cms>
</prestashop>`;

  const response = await fetch(`${baseUrl}/api/cms`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/xml",
    },
    body: xmlPayload,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`PrestaShop API error [${response.status}]: ${errorBody}`);
  }

  const responseText = await response.text();
  // Extract ID from response XML
  const idMatch = responseText.match(/<id>(?:<!\[CDATA\[)?(\d+)(?:\]\]>)?<\/id>/);
  const pageId = idMatch ? idMatch[1] : "unknown";

  return {
    external_id: pageId,
    external_url: `${baseUrl}/content/${pageId}-${linkRewrite}`,
  };
}

async function publishProductToPrestaShop(
  siteUrl: string,
  credentials: WebsiteCredentials,
  title: string,
  content: string,
  slug: string,
  seo: SeoData,
  extraData?: Record<string, any>
): Promise<{ external_id: string; external_url: string }> {
  const baseUrl = siteUrl.replace(/\/$/, "");
  const apiKey = credentials.api_key;
  if (!apiKey) throw new Error("PrestaShop API key not configured");

  const auth = btoa(`${apiKey}:`);
  const linkRewrite = slugify(slug || title);
  const metaTitle = seo.seo_title || title;
  const metaDescription = seo.seo_description || "";
  const price = extraData?.price || "0.000000";

  let langId = "1";
  try {
    const langResp = await fetch(`${baseUrl}/api/languages?output_format=JSON&filter[active]=1&limit=1`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (langResp.ok) {
      const langData = await langResp.json();
      if (langData.languages?.length > 0) {
        langId = String(langData.languages[0].id);
      }
    }
  } catch { /* use default lang */ }

  const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <product>
    <price>${price}</price>
    <active>1</active>
    <state>1</state>
    <id_tax_rules_group>1</id_tax_rules_group>
    <id_category_default>2</id_category_default>
    <meta_title>
      <language id="${langId}"><![CDATA[${metaTitle}]]></language>
    </meta_title>
    <meta_description>
      <language id="${langId}"><![CDATA[${metaDescription}]]></language>
    </meta_description>
    <name>
      <language id="${langId}"><![CDATA[${title}]]></language>
    </name>
    <description>
      <language id="${langId}"><![CDATA[${content}]]></language>
    </description>
    <description_short>
      <language id="${langId}"><![CDATA[${metaDescription}]]></language>
    </description_short>
    <link_rewrite>
      <language id="${langId}"><![CDATA[${linkRewrite}]]></language>
    </link_rewrite>
  </product>
</prestashop>`;

  const response = await fetch(`${baseUrl}/api/products`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/xml",
    },
    body: xmlPayload,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`PrestaShop Product API error [${response.status}]: ${errorBody}`);
  }

  const responseText = await response.text();
  const idMatch = responseText.match(/<id>(?:<!\[CDATA\[)?(\d+)(?:\]\]>)?<\/id>/);
  const productId = idMatch ? idMatch[1] : "unknown";

  return {
    external_id: productId,
    external_url: `${baseUrl}/${productId}-${linkRewrite}.html`,
  };
}

async function publishToWooCommerce(
  siteUrl: string,
  credentials: WebsiteCredentials,
  title: string,
  content: string,
  slug: string,
  seo: SeoData,
  extraData?: Record<string, any>
): Promise<{ external_id: string; external_url: string }> {
  const baseUrl = siteUrl.replace(/\/$/, "");
  const { consumer_key, consumer_secret } = credentials;
  if (!consumer_key || !consumer_secret) {
    throw new Error("WooCommerce credentials not configured");
  }

  const productSlug = slugify(slug || title);

  const productPayload: Record<string, any> = {
    name: title,
    type: "simple",
    description: content,
    slug: productSlug,
    status: "publish",
  };

  if (extraData?.price) {
    productPayload.regular_price = String(extraData.price);
  }
  if (extraData?.images || extraData?.image) {
    const imgs = extraData.images || (extraData.image ? [extraData.image] : []);
    productPayload.images = imgs.filter((src: string) => src && !src.startsWith("data:")).map((src: string) => ({ src }));
  }

  if (seo.seo_title) {
    productPayload.meta_data = [
      ...(productPayload.meta_data || []),
      { key: "_yoast_wpseo_title", value: seo.seo_title },
    ];
  }
  if (seo.seo_description) {
    productPayload.short_description = seo.seo_description;
    productPayload.meta_data = [
      ...(productPayload.meta_data || []),
      { key: "_yoast_wpseo_metadesc", value: seo.seo_description },
    ];
  }

  const apiUrl = `${baseUrl}/wp-json/wc/v3/products?consumer_key=${encodeURIComponent(consumer_key)}&consumer_secret=${encodeURIComponent(consumer_secret)}`;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(productPayload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`WooCommerce API error [${response.status}]: ${errorBody}`);
  }

  const data = await response.json();
  return {
    external_id: String(data.id),
    external_url: data.permalink || `${baseUrl}/product/${productSlug}`,
  };
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

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { page_ids, publish_type } = await req.json();
    const pubType = publish_type || "page"; // "page" or "product"
    if (!page_ids || !Array.isArray(page_ids) || page_ids.length === 0) {
      return new Response(JSON.stringify({ error: "page_ids array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: pages, error: pagesError } = await supabase
      .from("generated_pages")
      .select("*, websites(url, type, credentials)")
      .in("id", page_ids)
      .eq("user_id", user.id);

    if (pagesError || !pages) {
      return new Response(JSON.stringify({ error: "Failed to fetch pages" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { id: string; status: string; external_url?: string; error?: string }[] = [];

    for (const page of pages) {
      if (!page.websites) {
        const { data: campaign } = await supabase
          .from("campaigns")
          .select("website_id")
          .eq("id", page.campaign_id)
          .maybeSingle();

        if (campaign?.website_id) {
          const { data: website } = await supabase
            .from("websites")
            .select("url, type, credentials")
            .eq("id", campaign.website_id)
            .maybeSingle();

          if (website) {
            page.websites = website;
            await supabase
              .from("generated_pages")
              .update({ website_id: campaign.website_id })
              .eq("id", page.id);
          }
        }
      }

      if (!page.websites) {
        results.push({ id: page.id, status: "failed", error: "No website connected" });
        await supabase
          .from("generated_pages")
          .update({ status: "failed", error_message: "No website connected to publish to" })
          .eq("id", page.id);
        continue;
      }

      const website = page.websites as { url: string; type: string; credentials: WebsiteCredentials };
      const seo: SeoData = {
        seo_title: page.seo_title,
        seo_description: page.seo_description,
        seo_keywords: page.seo_keywords,
      };

      try {
        let result: { external_id: string; external_url: string };

        if (website.type === "wordpress") {
          result = await publishToWordPress(
            website.url, website.credentials, page.title, page.content, page.slug, seo
          );
        } else if (website.type === "shopify") {
          if (pubType === "product") {
            result = await publishProductToShopify(
              website.url, website.credentials, page.title, page.content, page.slug, seo
            );
          } else {
            result = await publishToShopify(
              website.url, website.credentials, page.title, page.content, seo
            );
          }
        } else if (website.type === "prestashop") {
          if (pubType === "product") {
            result = await publishProductToPrestaShop(
              website.url, website.credentials, page.title, page.content, page.slug, seo
            );
          } else {
            result = await publishToPrestaShop(
              website.url, website.credentials, page.title, page.content, page.slug, seo
            );
          }
        } else if (website.type === "woocommerce") {
          result = await publishToWooCommerce(
            website.url, website.credentials, page.title, page.content, page.slug, seo
          );
        } else {
          throw new Error(`Unsupported website type: ${website.type}`);
        }

        await supabase
          .from("generated_pages")
          .update({
            status: "published",
            external_id: result.external_id,
            external_url: result.external_url,
            error_message: null,
          })
          .eq("id", page.id);

        results.push({ id: page.id, status: "published", external_url: result.external_url });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown publishing error";
        await supabase
          .from("generated_pages")
          .update({ status: "failed", error_message: errorMsg })
          .eq("id", page.id);

        results.push({ id: page.id, status: "failed", error: errorMsg });
      }
    }

    const published = results.filter((r) => r.status === "published").length;
    const failed = results.filter((r) => r.status === "failed").length;

    return new Response(
      JSON.stringify({ success: true, published, failed, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
