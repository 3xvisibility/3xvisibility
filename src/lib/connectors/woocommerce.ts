import type { CmsConnector, ConnectorConfig, ConnectorPage, PagePayload } from "./types";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export class WooCommerceConnector implements CmsConnector {
  readonly type = "woocommerce";
  private baseUrl: string;
  private consumerKey: string;
  private consumerSecret: string;

  constructor(config: ConnectorConfig) {
    this.baseUrl = config.base_url.replace(/\/+$/, "");
    if (!config.api_key || !config.api_secret) {
      throw new Error("WooCommerce consumer_key / consumer_secret not configured");
    }
    this.consumerKey = config.api_key;
    this.consumerSecret = config.api_secret;
  }

  private authParams(): string {
    return `consumer_key=${encodeURIComponent(this.consumerKey)}&consumer_secret=${encodeURIComponent(this.consumerSecret)}`;
  }

  async createPage(payload: PagePayload): Promise<ConnectorPage> {
    const productSlug = slugify(payload.slug || payload.title);
    const body: Record<string, unknown> = {
      name: payload.title,
      type: "simple",
      description: payload.content,
      slug: productSlug,
      status: "publish",
    };

    if (payload.product_data?.price) body.regular_price = String(payload.product_data.price);
    if (payload.product_data?.images?.length) {
      body.images = payload.product_data.images
        .filter((img) => img.src && !img.src.startsWith("data:"))
        .map((img) => ({ src: img.src, alt: img.alt }));
    }

    const metaData: { key: string; value: string }[] = [];
    if (payload.seo_title) metaData.push({ key: "_yoast_wpseo_title", value: payload.seo_title });
    if (payload.seo_description) {
      body.short_description = payload.seo_description;
      metaData.push({ key: "_yoast_wpseo_metadesc", value: payload.seo_description });
    }
    if (metaData.length > 0) body.meta_data = metaData;

    const res = await fetch(
      `${this.baseUrl}/wp-json/wc/v3/products?${this.authParams()}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`WooCommerce API error [${res.status}]: ${err}`);
    }

    const data = await res.json();
    return {
      external_id: String(data.id),
      url: data.permalink || `${this.baseUrl}/product/${productSlug}`,
      title: data.name || payload.title,
      status: data.status || "publish",
    };
  }

  async updatePage(externalId: string, payload: Partial<PagePayload>): Promise<ConnectorPage> {
    const body: Record<string, unknown> = {};
    if (payload.title) body.name = payload.title;
    if (payload.content) body.description = payload.content;
    if (payload.slug) body.slug = slugify(payload.slug);

    const res = await fetch(
      `${this.baseUrl}/wp-json/wc/v3/products/${externalId}?${this.authParams()}`,
      { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`WooCommerce updatePage failed (${res.status}): ${err}`);
    }

    const data = await res.json();
    return {
      external_id: String(data.id),
      url: data.permalink || "",
      title: data.name || "",
      status: data.status || "publish",
    };
  }

  async getPage(externalId: string): Promise<ConnectorPage | null> {
    const res = await fetch(
      `${this.baseUrl}/wp-json/wc/v3/products/${externalId}?${this.authParams()}`
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`WooCommerce getPage failed (${res.status})`);
    const data = await res.json();
    return {
      external_id: String(data.id),
      url: data.permalink || "",
      title: data.name || "",
      status: data.status || "publish",
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const res = await fetch(
        `${this.baseUrl}/wp-json/wc/v3/system_status?${this.authParams()}`
      );
      return res.ok;
    } catch {
      return false;
    }
  }
}
