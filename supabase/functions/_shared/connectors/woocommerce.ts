import type { CmsConnector, ConnectorConfig, ConnectorResult, ContentItem, PagePayload } from "./types.ts";
import {
  buildSeoMetaDataEntries,
  buildSeoMetaRecord,
  extractSeoFieldsFromMeta,
  metaArrayToRecord,
} from "./seo-meta.ts";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/**
 * Build a clean WooCommerce product short_description.
 * WooCommerce expects this to be a SHORT teaser (the small text under the
 * price/title), NOT the full description nor the full SEO meta. We:
 *   1. Prefer an explicitly provided excerpt (already short)
 *   2. Otherwise fall back to seo_description / first text from content
 *   3. Strip HTML, collapse whitespace, truncate at a word boundary (~160 chars)
 *   4. Wrap in a <p> so WordPress renders it cleanly.
 */
function buildShortDescription(input: {
  excerpt?: string | null;
  seoDescription?: string | null;
  fullContent?: string | null;
}): string | undefined {
  const MAX_LEN = 160;
  const sources: (string | null | undefined)[] = [
    input.excerpt,
    input.seoDescription,
    input.fullContent,
  ];
  let raw = "";
  for (const s of sources) {
    if (typeof s === "string" && s.trim().length > 0) {
      raw = s;
      break;
    }
  }
  if (!raw) return undefined;

  // Strip HTML tags + decode common entities + collapse whitespace.
  const plain = raw
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return undefined;

  let teaser = plain;
  if (teaser.length > MAX_LEN) {
    const cut = teaser.slice(0, MAX_LEN);
    const lastSpace = cut.lastIndexOf(" ");
    teaser = (lastSpace > 80 ? cut.slice(0, lastSpace) : cut).replace(/[,;:\-–—]+$/, "").trim() + "…";
  }
  return `<p>${teaser}</p>`;
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

    const metaData = buildSeoMetaDataEntries(payload);
    // WooCommerce short_description = brief teaser only. Never the full SEO meta
    // or the entire product description, both of which look broken on the storefront.
    const shortDesc = buildShortDescription({
      excerpt: payload.excerpt,
      seoDescription: payload.seo_description,
      fullContent: payload.content,
    });
    if (shortDesc) body.short_description = shortDesc;
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
    const preserveDesign = payload.preserve_design === true;

    if (payload.title || payload.seo_title) body.title = payload.title || payload.seo_title;
    // Preserve existing on-site design when republishing — only metadata flows through.
    if (!preserveDesign && typeof payload.content === "string") {
      body.content = payload.content || "<p></p>";
    }
    if (payload.slug) body.slug = slugify(payload.slug);
    if (payload.status) body.status = payload.status === "publish" ? "publish" : "draft";
    if (payload.excerpt) body.excerpt = payload.excerpt;

    const meta: Record<string, unknown> = buildSeoMetaRecord(payload);
    if (!preserveDesign && payload.elementor_meta?.elementor_data) {
      meta._elementor_data = payload.elementor_meta.elementor_data;
      meta._elementor_edit_mode = payload.elementor_meta.elementor_edit_mode || "builder";
      meta._elementor_template_type = "wp-page";
      meta._elementor_version = "3.0.0";
    }
    if (Object.keys(meta).length > 0) body.meta = meta;
    if (!preserveDesign && payload.elementor_meta?.page_template) body.template = payload.elementor_meta.page_template;

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
    const preserveDesign = payload.preserve_design === true;

    if (payload.title || payload.seo_title) body.name = payload.title || payload.seo_title;
    // Preserve product description/layout on republish — only meta updates.
    if (!preserveDesign && typeof payload.content === "string") body.description = payload.content;
    if (payload.slug || payload.product_data?.handle) {
      body.slug = slugify(payload.product_data?.handle || payload.slug || externalId);
    }
    if (payload.status) body.status = payload.status === "publish" ? "publish" : "draft";
    if (payload.excerpt) body.short_description = payload.excerpt;
    if (!body.short_description && payload.seo_description) body.short_description = payload.seo_description;
    if (payload.product_data?.price) body.regular_price = String(payload.product_data.price);
    if (!preserveDesign && payload.product_data?.images?.length) {
      body.images = payload.product_data.images
        .filter((img) => img.src && !img.src.startsWith("data:"))
        .map((img) => ({ src: img.src, alt: img.alt }));
    }

    const metaData = buildSeoMetaDataEntries(payload);
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
        const url = `${this.baseUrl}/wp-json/wp/v2/pages?per_page=100&page=${page}&_embed&context=edit`;
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
          const meta = item.meta || {};
          const seoFields = extractSeoFieldsFromMeta(meta);
          items.push({
            id: String(item.id),
            title: item.title?.rendered || item.title?.raw || "",
            slug: item.slug || "",
            url: item.link || `${this.baseUrl}/${item.slug}`,
            type: "page",
            status: item.status || "publish",
            content: item.content?.rendered || item.content?.raw || "",
            excerpt: item.excerpt?.rendered || item.excerpt?.raw || "",
            modified: item.modified || "",
            seo_title: seoFields.seo_title,
            seo_description: seoFields.seo_description,
            seo_keywords: seoFields.seo_keywords,
            canonical_url: seoFields.canonical_url,
            raw_meta: meta,
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
        const meta = metaArrayToRecord(Array.isArray(item.meta_data) ? item.meta_data : []);
        const seoFields = extractSeoFieldsFromMeta(meta);
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
          seo_title: seoFields.seo_title,
          seo_description: seoFields.seo_description,
          seo_keywords: seoFields.seo_keywords,
          canonical_url: seoFields.canonical_url,
          raw_meta: meta,
        });
      }

      const totalPages = parseInt(response.headers.get("X-WP-TotalPages") || "1");
      if (page >= totalPages) break;
      page++;
    }

    return items;
  }
}
