import type { CmsConnector, ConnectorConfig, ConnectorPage, PagePayload } from "./types";
import { adaptHtmlForShopifyTheme } from "./shopify-theme-adapter";

/**
 * Shopify Admin API connector.
 *
 * Publishes pages via Shopify Admin REST API and maps SEO metadata
 * to Shopify metafields.
 */
export class ShopifyConnector implements CmsConnector {
  readonly type = "shopify";
  private shopDomain: string;
  private headers: HeadersInit;

  constructor(config: ConnectorConfig) {
    this.shopDomain = (config.shop_domain || config.base_url).replace(/\/+$/, "").replace(/^https?:\/\//, "");
    this.headers = {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": config.access_token || config.api_key || "",
    };
  }

  private get apiBase() {
    return `https://${this.shopDomain}/admin/api/2024-01`;
  }

  async createPage(payload: PagePayload): Promise<ConnectorPage> {
    const body = { page: this.mapPayload(payload) };
    const res = await fetch(`${this.apiBase}/pages.json`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Shopify createPage failed (${res.status}): ${err}`);
    }
    const data = await res.json();
    return {
      external_id: String(data.page.id),
      url: `https://${this.shopDomain}/pages/${data.page.handle}`,
      title: data.page.title,
      status: data.page.published_at ? "published" : "draft",
    };
  }

  async updatePage(externalId: string, payload: Partial<PagePayload>): Promise<ConnectorPage> {
    const body = { page: { id: externalId, ...this.mapPayload(payload as PagePayload) } };
    const res = await fetch(`${this.apiBase}/pages/${externalId}.json`, {
      method: "PUT",
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Shopify updatePage failed (${res.status}): ${err}`);
    }
    const data = await res.json();
    return {
      external_id: String(data.page.id),
      url: `https://${this.shopDomain}/pages/${data.page.handle}`,
      title: data.page.title,
      status: data.page.published_at ? "published" : "draft",
    };
  }

  async getPage(externalId: string): Promise<ConnectorPage | null> {
    const res = await fetch(`${this.apiBase}/pages/${externalId}.json`, {
      headers: this.headers,
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Shopify getPage failed (${res.status})`);
    const data = await res.json();
    return {
      external_id: String(data.page.id),
      url: `https://${this.shopDomain}/pages/${data.page.handle}`,
      title: data.page.title,
      status: data.page.published_at ? "published" : "draft",
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

  private mapPayload(payload: PagePayload): Record<string, unknown> {
    const page: Record<string, unknown> = {
      title: payload.title,
      body_html: payload.content,
      handle: payload.slug,
      published: payload.status === "publish",
    };

    // Shopify SEO via metafields
    if (payload.seo_title) page.metafields_global_title_tag = payload.seo_title;
    if (payload.seo_description) page.metafields_global_description_tag = payload.seo_description;

    return page;
  }
}
