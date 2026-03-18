import type { CmsConnector, ConnectorConfig, ConnectorPage, PagePayload } from "./types";

/**
 * WordPress REST API connector.
 *
 * Publishes pages via /wp-json/wp/v2/pages and maps SEO metadata
 * to Yoast SEO fields when available.
 */
export class WordPressConnector implements CmsConnector {
  readonly type = "wordpress";
  private baseUrl: string;
  private headers: HeadersInit;

  constructor(config: ConnectorConfig) {
    this.baseUrl = config.base_url.replace(/\/+$/, "");
    const credentials = btoa(`${config.username}:${config.password}`);
    this.headers = {
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials}`,
    };
  }

  async createPage(payload: PagePayload): Promise<ConnectorPage> {
    const body = this.mapPayload(payload);
    const res = await fetch(`${this.baseUrl}/wp-json/wp/v2/pages`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`WordPress createPage failed (${res.status}): ${err}`);
    }
    const data = await res.json();
    return {
      external_id: String(data.id),
      url: data.link,
      title: data.title?.rendered ?? payload.title,
      status: data.status,
    };
  }

  async updatePage(externalId: string, payload: Partial<PagePayload>): Promise<ConnectorPage> {
    const body = this.mapPayload(payload as PagePayload);
    const res = await fetch(`${this.baseUrl}/wp-json/wp/v2/pages/${externalId}`, {
      method: "PUT",
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`WordPress updatePage failed (${res.status}): ${err}`);
    }
    const data = await res.json();
    return {
      external_id: String(data.id),
      url: data.link,
      title: data.title?.rendered ?? "",
      status: data.status,
    };
  }

  async getPage(externalId: string): Promise<ConnectorPage | null> {
    const res = await fetch(`${this.baseUrl}/wp-json/wp/v2/pages/${externalId}`, {
      headers: this.headers,
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`WordPress getPage failed (${res.status})`);
    const data = await res.json();
    return {
      external_id: String(data.id),
      url: data.link,
      title: data.title?.rendered ?? "",
      status: data.status,
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/wp-json/wp/v2/pages?per_page=1`, {
        headers: this.headers,
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  private mapPayload(payload: PagePayload): Record<string, unknown> {
    const body: Record<string, unknown> = {
      title: payload.title,
      content: payload.content,
      slug: payload.slug,
      status: payload.status,
    };
    if (payload.excerpt) body.excerpt = payload.excerpt;

    // Yoast SEO meta fields
    const meta: Record<string, unknown> = {};
    if (payload.seo_title) meta._yoast_wpseo_title = payload.seo_title;
    if (payload.seo_description) meta._yoast_wpseo_metadesc = payload.seo_description;
    if (payload.canonical_url) meta._yoast_wpseo_canonical = payload.canonical_url;
    if (Object.keys(meta).length > 0) body.meta = meta;

    if (payload.custom_fields) {
      body.meta = { ...(body.meta as Record<string, unknown>), ...payload.custom_fields };
    }

    return body;
  }
}
