import type { CmsConnector, ConnectorConfig, ConnectorResult, ContentItem, PagePayload } from "./types.ts";

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
      body_html: payload.content,
      handle: slugify(payload.slug || payload.title),
      published: payload.status === "publish",
    };

    if (payload.seo_title) pageBody.metafields_global_title_tag = payload.seo_title;
    if (payload.seo_description) pageBody.metafields_global_description_tag = payload.seo_description;

    const res = await fetch(`${this.apiBase}/pages.json`, {
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
    const productBody: Record<string, unknown> = {
      title: payload.title,
      body_html: payload.content,
      handle: slugify(pd.handle || payload.slug || payload.title),
      status: "active",
    };

    if (pd.price) productBody.variants = [{ price: String(pd.price) }];
    if (pd.images?.length) {
      productBody.images = pd.images
        .filter((img) => img.src && !img.src.startsWith("data:"))
        .map((img) => ({ src: img.src, alt: img.alt }));
    }
    if (payload.seo_title) productBody.metafields_global_title_tag = payload.seo_title;
    if (payload.seo_description) productBody.metafields_global_description_tag = payload.seo_description;

    const res = await fetch(`${this.apiBase}/products.json`, {
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
    try {
      const res = await fetch(`${this.apiBase}/shop.json`, { headers: this.headers });
      return res.ok;
    } catch {
      return false;
    }
  }

  async updatePage(externalId: string, payload: Partial<PagePayload>): Promise<ConnectorResult> {
    if (payload.product_data) return this.updateProduct(externalId, payload);

    const body: Record<string, unknown> = {};
    if (payload.title) body.title = payload.title;
    if (payload.content) body.body_html = payload.content;
    if (payload.slug) body.handle = slugify(payload.slug);
    if (payload.status) body.published = payload.status === "publish";
    if (payload.seo_title) body.metafields_global_title_tag = payload.seo_title;
    if (payload.seo_description) body.metafields_global_description_tag = payload.seo_description;

    const res = await fetch(`${this.apiBase}/pages/${externalId}.json`, {
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
    if (payload.title) body.title = payload.title;
    if (payload.content) body.body_html = payload.content;
    if (payload.product_data?.handle || payload.slug) body.handle = slugify(payload.product_data?.handle || payload.slug || "");
    if (payload.product_data?.price) body.variants = [{ price: String(payload.product_data.price) }];
    if (payload.product_data?.images?.length) {
      body.images = payload.product_data.images
        .filter((img) => img.src && !img.src.startsWith("data:"))
        .map((img) => ({ src: img.src, alt: img.alt }));
    }
    if (payload.seo_title) body.metafields_global_title_tag = payload.seo_title;
    if (payload.seo_description) body.metafields_global_description_tag = payload.seo_description;

    const res = await fetch(`${this.apiBase}/products/${externalId}.json`, {
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
      const response = await fetch(url, { headers: this.headers });

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
