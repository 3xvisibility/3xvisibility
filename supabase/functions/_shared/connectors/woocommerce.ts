import type { CmsConnector, ConnectorConfig, ConnectorResult, ContentItem, PagePayload } from "./types.ts";

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

  private get authQuery() {
    return `consumer_key=${encodeURIComponent(this.consumerKey)}&consumer_secret=${encodeURIComponent(this.consumerSecret)}`;
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

    const res = await fetch(
      `${this.baseUrl}/wp-json/wc/v3/products?${this.authQuery}`,
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
      const res = await fetch(
        `${this.baseUrl}/wp-json/wc/v3/system_status?${this.authQuery}`
      );
      return res.ok;
    } catch {
      return false;
    }
  }

  async updatePage(externalId: string, payload: Partial<PagePayload>): Promise<ConnectorResult> {
    if (payload.product_data) return this.updateProduct(externalId, payload);

    const auth = btoa(`${this.consumerKey}:${this.consumerSecret}`);
    const body: Record<string, unknown> = {};

    if (payload.title || payload.seo_title) body.title = payload.title || payload.seo_title;
    if (typeof payload.content === "string") body.content = payload.content || "<p></p>";
    if (payload.slug) body.slug = slugify(payload.slug);
    if (payload.status) body.status = payload.status === "publish" ? "publish" : "draft";
    if (payload.excerpt) body.excerpt = payload.excerpt;

    const meta: Record<string, unknown> = {};
    if (payload.seo_title) meta._yoast_wpseo_title = payload.seo_title;
    if (payload.seo_description) meta._yoast_wpseo_metadesc = payload.seo_description;
    if (payload.seo_keywords?.length) meta._yoast_wpseo_focuskw = payload.seo_keywords[0];
    if (payload.canonical_url) meta._yoast_wpseo_canonical = payload.canonical_url;
    if (payload.elementor_meta?.elementor_data) {
      meta._elementor_data = payload.elementor_meta.elementor_data;
      meta._elementor_edit_mode = payload.elementor_meta.elementor_edit_mode || "builder";
      meta._elementor_template_type = "wp-page";
      meta._elementor_version = "3.0.0";
    }
    if (Object.keys(meta).length > 0) body.meta = meta;
    if (payload.elementor_meta?.page_template) body.template = payload.elementor_meta.page_template;

    const res = await fetch(`${this.baseUrl}/wp-json/wp/v2/pages/${externalId}`, {
      method: "PUT",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`WooCommerce page update error [${res.status}]: ${err}`);
    }

    const data = await res.json();
    return {
      external_id: String(data.id),
      url: data.link || `${this.baseUrl}/${data.slug}`,
    };
  }

  private async updateProduct(externalId: string, payload: Partial<PagePayload>): Promise<ConnectorResult> {
    const body: Record<string, unknown> = {};

    if (payload.title || payload.seo_title) body.name = payload.title || payload.seo_title;
    if (typeof payload.content === "string") body.description = payload.content;
    if (payload.slug || payload.product_data?.handle) {
      body.slug = slugify(payload.product_data?.handle || payload.slug || externalId);
    }
    if (payload.status) body.status = payload.status === "publish" ? "publish" : "draft";
    if (payload.excerpt) body.short_description = payload.excerpt;
    if (!body.short_description && payload.seo_description) body.short_description = payload.seo_description;
    if (payload.product_data?.price) body.regular_price = String(payload.product_data.price);
    if (payload.product_data?.images?.length) {
      body.images = payload.product_data.images
        .filter((img) => img.src && !img.src.startsWith("data:"))
        .map((img) => ({ src: img.src, alt: img.alt }));
    }

    const metaData: { key: string; value: string }[] = [];
    if (payload.seo_title) metaData.push({ key: "_yoast_wpseo_title", value: payload.seo_title });
    if (payload.seo_description) metaData.push({ key: "_yoast_wpseo_metadesc", value: payload.seo_description });
    if (payload.seo_keywords?.length) metaData.push({ key: "_yoast_wpseo_focuskw", value: payload.seo_keywords[0] });
    if (metaData.length > 0) body.meta_data = metaData;

    const res = await fetch(`${this.baseUrl}/wp-json/wc/v3/products/${externalId}?${this.authQuery}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`WooCommerce product update error [${res.status}]: ${err}`);
    }

    const data = await res.json();
    return {
      external_id: String(data.id),
      url: data.permalink || `${this.baseUrl}/product/${data.slug || externalId}`,
    };
  }

  async listContent(contentType: "pages" | "products"): Promise<ContentItem[]> {
    if (contentType === "pages") {
      // WooCommerce doesn't have its own pages — fall back to WP REST API with consumer creds as basic auth
      const auth = btoa(`${this.consumerKey}:${this.consumerSecret}`);
      const items: ContentItem[] = [];
      let page = 1;

      while (true) {
        const url = `${this.baseUrl}/wp-json/wp/v2/pages?per_page=100&page=${page}&_embed`;
        let response: Response;
        try {
          response = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
        } catch {
          return items;
        }

        if (!response.ok) { await response.text(); return items; }

        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) break;

        for (const item of data) {
          items.push({
            id: String(item.id),
            title: item.title?.rendered || "",
            slug: item.slug || "",
            url: item.link || `${this.baseUrl}/${item.slug}`,
            type: "page",
            status: item.status || "publish",
            content: item.content?.rendered || "",
            excerpt: item.excerpt?.rendered || "",
            modified: item.modified || "",
          });
        }

        const totalPages = parseInt(response.headers.get("X-WP-TotalPages") || "1");
        if (page >= totalPages) break;
        page++;
      }

      return items;
    }

    // Products via WooCommerce REST API
    const items: ContentItem[] = [];
    let page = 1;

    while (true) {
      const url = `${this.baseUrl}/wp-json/wc/v3/products?per_page=100&page=${page}&${this.authQuery}`;
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
          url: item.permalink || `${this.baseUrl}/product/${item.slug}`,
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
}
