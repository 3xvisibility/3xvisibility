import type { CmsConnector, ConnectorConfig, ConnectorResult, PagePayload } from "./types.ts";

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
    if (!config.consumer_key || !config.consumer_secret) {
      throw new Error("WooCommerce credentials not configured");
    }
    this.consumerKey = config.consumer_key;
    this.consumerSecret = config.consumer_secret;
  }

  async createPage(payload: PagePayload): Promise<ConnectorResult> {
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

    const ck = encodeURIComponent(this.consumerKey);
    const cs = encodeURIComponent(this.consumerSecret);
    const res = await fetch(
      `${this.baseUrl}/wp-json/wc/v3/products?consumer_key=${ck}&consumer_secret=${cs}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`WooCommerce API error [${res.status}]: ${err}`);
    }

    const data = await res.json();
    return {
      external_id: String(data.id),
      url: data.permalink || `${this.baseUrl}/product/${productSlug}`,
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const ck = encodeURIComponent(this.consumerKey);
      const cs = encodeURIComponent(this.consumerSecret);
      const res = await fetch(
        `${this.baseUrl}/wp-json/wc/v3/system_status?consumer_key=${ck}&consumer_secret=${cs}`
      );
      return res.ok;
    } catch {
      return false;
    }
  }
}
