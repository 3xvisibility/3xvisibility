import type { CmsConnector, ConnectorConfig, ConnectorResult, ContentItem, PagePayload } from "./types.ts";
import { adaptHtmlForShopifyTheme } from "./shopify-theme-adapter.ts";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** Retry-aware fetch for Shopify API rate limits (HTTP 429). */
async function shopifyFetch(
  url: string,
  init: RequestInit,
  maxRetries = 3,
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, init);
    if (res.status === 429) {
      const retryAfter = parseFloat(res.headers.get("Retry-After") || "2");
      const delay = Math.min(retryAfter * 1000, 10_000);
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }
    return res;
  }
  throw new Error("Shopify API rate limit exceeded after retries");
}

export class ShopifyConnector implements CmsConnector {
  readonly type = "shopify";
  private shopDomain: string;
  private headers: HeadersInit;

  constructor(config: ConnectorConfig) {
    this.shopDomain = config.base_url.replace(/\/+$/, "").replace(/^https?:\/\//, "");
    this.headers = {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": config.access_token || "",
    };
  }

  private get apiBase() {
    return `https://${this.shopDomain}/admin/api/2024-01`;
  }

  async createPage(payload: PagePayload): Promise<ConnectorResult> {
    if (payload.product_data) return this.createProduct(payload);

    const pageBody: Record<string, unknown> = {
      title: payload.title,
      body_html: adaptHtmlForShopifyTheme(payload.content || "", "page"),
      handle: slugify(payload.slug || payload.title),
      published: payload.status === "publish",
    };

    if (payload.shopify_page_template_suffix && payload.shopify_page_template_suffix.trim()) {
      pageBody.template_suffix = payload.shopify_page_template_suffix.trim();
    }

    if (payload.seo_title) pageBody.metafields_global_title_tag = payload.seo_title;
    if (payload.seo_description) pageBody.metafields_global_description_tag = payload.seo_description;

    const res = await shopifyFetch(`${this.apiBase}/pages.json`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ page: pageBody }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Shopify Pages API error [${res.status}]: ${err}`);
    }

    const data = await res.json();
    return {
      external_id: String(data.page.id),
      url: `https://${this.shopDomain}/pages/${data.page.handle}`,
    };
  }

  private async createProduct(payload: PagePayload): Promise<ConnectorResult> {
    const pd = payload.product_data!;
    const rawProductHtml = pd.body_html || payload.content || "";
    const productBody: Record<string, unknown> = {
      title: payload.title,
      body_html: adaptHtmlForShopifyTheme(rawProductHtml, "product"),
      handle: slugify(pd.handle || payload.slug || payload.title),
      status: pd.product_status || "active",
    };

    if (pd.template_suffix && pd.template_suffix.trim()) {
      productBody.template_suffix = pd.template_suffix.trim();
    }
    if (pd.vendor) productBody.vendor = pd.vendor;
    if (pd.product_type) productBody.product_type = pd.product_type;
    if (pd.tags) productBody.tags = Array.isArray(pd.tags) ? pd.tags.join(", ") : pd.tags;

    // Build default variant with price + sku + variant-level fields
    const v: Record<string, unknown> = {};
    if (pd.price) v.price = String(pd.price);
    if (pd.sku) v.sku = pd.sku;
    if (pd.variant?.option1) v.option1 = pd.variant.option1;
    if (pd.variant?.option2) v.option2 = pd.variant.option2;
    if (pd.variant?.option3) v.option3 = pd.variant.option3;
    if (pd.variant?.compare_at_price) v.compare_at_price = String(pd.variant.compare_at_price);
    if (pd.variant?.inventory_quantity != null) v.inventory_quantity = pd.variant.inventory_quantity;
    if (pd.variant?.weight != null) v.weight = pd.variant.weight;
    if (pd.variant?.weight_unit) v.weight_unit = pd.variant.weight_unit;
    if (pd.variant?.barcode) v.barcode = pd.variant.barcode;
    if (Object.keys(v).length) productBody.variants = [v];

    if (pd.images?.length) {
      productBody.images = pd.images
        .filter((img) => img.src && !img.src.startsWith("data:"))
        .map((img) => ({ src: img.src, alt: img.alt }));
    }
    if (payload.seo_title) productBody.metafields_global_title_tag = payload.seo_title;
    if (payload.seo_description) productBody.metafields_global_description_tag = payload.seo_description;

    // Custom metafields
    if (pd.metafields?.length) {
      productBody.metafields = pd.metafields
        .filter((m) => m.namespace && m.key)
        .map((m) => ({ namespace: m.namespace, key: m.key, type: m.type || "single_line_text_field", value: m.value ?? "" }));
    }

    const res = await shopifyFetch(`${this.apiBase}/products.json`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ product: productBody }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Shopify Products API error [${res.status}]: ${err}`);
    }

    const data = await res.json();
    return {
      external_id: String(data.product.id),
      url: `https://${this.shopDomain}/products/${data.product.handle}`,
    };
  }

  async testConnection(): Promise<boolean> {
    if (!this.shopDomain) {
      throw new Error("Shopify shop domain is missing. Provide your *.myshopify.com URL.");
    }
    if (!/\.myshopify\.com$/i.test(this.shopDomain)) {
      throw new Error(
        `Invalid Shopify shop domain "${this.shopDomain}". It must end with .myshopify.com (e.g. my-store.myshopify.com).`,
      );
    }
    const headersObj = this.headers as Record<string, string>;
    if (!headersObj["X-Shopify-Access-Token"]) {
      throw new Error("Shopify Admin API access token is missing. Paste your shpat_... token.");
    }

    const res = await shopifyFetch(`${this.apiBase}/shop.json`, { headers: this.headers });
    if (res.ok) return true;

    const body = await res.text().catch(() => "");
    let detail = body;
    try {
      const json = JSON.parse(body);
      detail = json.errors ? JSON.stringify(json.errors) : body;
    } catch { /* keep raw body */ }

    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `Shopify rejected the access token (HTTP ${res.status}). Make sure the custom app is installed and the token has read_content / read_products scopes. Detail: ${detail}`,
      );
    }
    if (res.status === 404) {
      throw new Error(
        `Shopify shop not found at https://${this.shopDomain} (HTTP 404). Double-check the *.myshopify.com domain.`,
      );
    }
    throw new Error(`Shopify connection failed (HTTP ${res.status}): ${detail}`);
  }

  async updatePage(externalId: string, payload: Partial<PagePayload>): Promise<ConnectorResult> {
    if (payload.product_data) return this.updateProduct(externalId, payload);

    const body: Record<string, unknown> = {};
    const preserveDesign = payload.preserve_design === true;

    if (payload.title) body.title = payload.title;
    // Preserve existing on-site design when republishing — only metadata flows through.
    if (!preserveDesign && payload.content) body.body_html = payload.content;
    if (payload.slug) body.handle = slugify(payload.slug);
    if (payload.status) body.published = payload.status === "publish";
    if (payload.seo_title) body.metafields_global_title_tag = payload.seo_title;
    if (payload.seo_description) body.metafields_global_description_tag = payload.seo_description;

    const res = await shopifyFetch(`${this.apiBase}/pages/${externalId}.json`, {
      method: "PUT",
      headers: this.headers,
      body: JSON.stringify({ page: body }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Shopify Pages update error [${res.status}]: ${err}`);
    }

    const data = await res.json();
    return {
      external_id: String(data.page.id),
      url: `https://${this.shopDomain}/pages/${data.page.handle}`,
    };
  }

  private async updateProduct(externalId: string, payload: Partial<PagePayload>): Promise<ConnectorResult> {
    const body: Record<string, unknown> = {};
    const preserveDesign = payload.preserve_design === true;

    if (payload.title) body.title = payload.title;
    if (!preserveDesign && (payload.product_data?.body_html || payload.content)) {
      body.body_html = payload.product_data?.body_html || payload.content;
    }
    if (payload.product_data?.handle || payload.slug) body.handle = slugify(payload.product_data?.handle || payload.slug || "");
    if (payload.product_data?.vendor) body.vendor = payload.product_data.vendor;
    if (payload.product_data?.product_type) body.product_type = payload.product_data.product_type;
    if (payload.product_data?.tags) {
      body.tags = Array.isArray(payload.product_data.tags) ? payload.product_data.tags.join(", ") : payload.product_data.tags;
    }
    if (payload.product_data?.product_status) body.status = payload.product_data.product_status;

    const v: Record<string, unknown> = {};
    if (payload.product_data?.price) v.price = String(payload.product_data.price);
    if (payload.product_data?.sku) v.sku = payload.product_data.sku;
    if (payload.product_data?.variant?.compare_at_price) v.compare_at_price = String(payload.product_data.variant.compare_at_price);
    if (payload.product_data?.variant?.inventory_quantity != null) v.inventory_quantity = payload.product_data.variant.inventory_quantity;
    if (payload.product_data?.variant?.weight != null) v.weight = payload.product_data.variant.weight;
    if (payload.product_data?.variant?.weight_unit) v.weight_unit = payload.product_data.variant.weight_unit;
    if (payload.product_data?.variant?.barcode) v.barcode = payload.product_data.variant.barcode;
    if (Object.keys(v).length) body.variants = [v];

    if (!preserveDesign && payload.product_data?.images?.length) {
      body.images = payload.product_data.images
        .filter((img) => img.src && !img.src.startsWith("data:"))
        .map((img) => ({ src: img.src, alt: img.alt }));
    }
    if (payload.seo_title) body.metafields_global_title_tag = payload.seo_title;
    if (payload.seo_description) body.metafields_global_description_tag = payload.seo_description;
    if (payload.product_data?.metafields?.length) {
      body.metafields = payload.product_data.metafields
        .filter((m) => m.namespace && m.key)
        .map((m) => ({ namespace: m.namespace, key: m.key, type: m.type || "single_line_text_field", value: m.value ?? "" }));
    }

    const res = await shopifyFetch(`${this.apiBase}/products/${externalId}.json`, {
      method: "PUT",
      headers: this.headers,
      body: JSON.stringify({ product: body }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Shopify Products update error [${res.status}]: ${err}`);
    }

    const data = await res.json();
    return {
      external_id: String(data.product.id),
      url: `https://${this.shopDomain}/products/${data.product.handle}`,
    };
  }

  async listContent(contentType: "pages" | "products"): Promise<ContentItem[]> {
    const items: ContentItem[] = [];
    let url = contentType === "products"
      ? `${this.apiBase}/products.json?limit=250`
      : `${this.apiBase}/pages.json?limit=250`;

    while (url) {
      const response = await shopifyFetch(url, { headers: this.headers } as RequestInit);

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
            ? `https://${this.shopDomain}/products/${item.handle}`
            : `https://${this.shopDomain}/pages/${item.handle}`,
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
}
