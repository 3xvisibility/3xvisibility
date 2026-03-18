import type { CmsConnector, ConnectorConfig, ConnectorResult, ContentItem, PagePayload } from "./types.ts";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export class WordPressConnector implements CmsConnector {
  readonly type = "wordpress";
  private baseUrl: string;
  private headers: HeadersInit;
  private authString: string;

  constructor(config: ConnectorConfig) {
    this.baseUrl = config.base_url.replace(/\/+$/, "");
    this.authString = btoa(`${config.username}:${config.password}`);
    this.headers = {
      "Content-Type": "application/json",
      Authorization: `Basic ${this.authString}`,
    };
  }

  async createPage(payload: PagePayload): Promise<ConnectorResult> {
    const body: Record<string, unknown> = {
      title: payload.title,
      content: payload.content,
      slug: slugify(payload.slug || payload.title),
      status: payload.status === "publish" ? "publish" : "draft",
    };

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

    if (payload.custom_fields) Object.assign(meta, payload.custom_fields);
    if (Object.keys(meta).length > 0) body.meta = meta;

    if (payload.elementor_meta?.page_template) {
      body.template = payload.elementor_meta.page_template;
    }

    const res = await fetch(`${this.baseUrl}/wp-json/wp/v2/pages`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`WordPress API error [${res.status}]: ${err}`);
    }

    const data = await res.json();
    return {
      external_id: String(data.id),
      url: data.link || `${this.baseUrl}/${body.slug}`,
    };
  }

  async updatePage(externalId: string, payload: Partial<PagePayload>): Promise<ConnectorResult> {
    const body: Record<string, unknown> = {};
    if (payload.title) body.title = payload.title;
    if (payload.content) body.content = payload.content;
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
    }
    if (payload.custom_fields) Object.assign(meta, payload.custom_fields);
    if (Object.keys(meta).length > 0) body.meta = meta;
    if (payload.elementor_meta?.page_template) body.template = payload.elementor_meta.page_template;

    const res = await fetch(`${this.baseUrl}/wp-json/wp/v2/pages/${externalId}`, {
      method: "PUT",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`WordPress update error [${res.status}]: ${err}`);
    }

    const data = await res.json();
    return { external_id: String(data.id), url: data.link || `${this.baseUrl}/${data.slug}` };
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

  async listContent(contentType: "pages" | "products"): Promise<ContentItem[]> {
    const items: ContentItem[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const url = `${this.baseUrl}/wp-json/wp/v2/${contentType === "products" ? "product" : "pages"}?per_page=${perPage}&page=${page}&_embed&context=edit`;
      const response = await fetch(url, { headers: { Authorization: `Basic ${this.authString}` } });

      if (!response.ok) {
        if (contentType === "products") { await response.text(); return items; }
        const err = await response.text();
        throw new Error(`WordPress API error [${response.status}]: ${err}`);
      }

      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) break;

      for (const item of data) {
        const meta = item.meta || {};
        items.push({
          id: String(item.id),
          title: item.title?.rendered || item.title?.raw || item.name || "",
          slug: item.slug || "",
          url: item.link || `${this.baseUrl}/${item.slug}`,
          type: contentType === "products" ? "product" : "page",
          status: item.status || "publish",
          content: item.content?.rendered || item.content?.raw || item.description || "",
          excerpt: item.excerpt?.rendered || item.excerpt?.raw || item.short_description || "",
          modified: item.modified || item.date_modified || "",
          elementor_data: meta._elementor_data || undefined,
          elementor_edit_mode: meta._elementor_edit_mode || undefined,
          page_template: item.template || meta._wp_page_template || undefined,
          raw_meta: meta,
        });
      }

      const totalPages = parseInt(response.headers.get("X-WP-TotalPages") || "1");
      if (page >= totalPages) break;
      page++;
    }

    // For pages with missing Elementor data, fetch individually
    for (const item of items) {
      if (!item.elementor_data && item.type === "page") {
        try {
          const singleResp = await fetch(
            `${this.baseUrl}/wp-json/wp/v2/pages/${item.id}?context=edit`,
            { headers: { Authorization: `Basic ${this.authString}` } }
          );
          if (singleResp.ok) {
            const singleData = await singleResp.json();
            const meta = singleData.meta || {};
            if (meta._elementor_data) {
              item.elementor_data = meta._elementor_data;
              item.elementor_edit_mode = meta._elementor_edit_mode || "builder";
            }
            if (singleData.template) item.page_template = singleData.template;
            if (singleData.content?.raw) {
              item.raw_meta = { ...item.raw_meta, _raw_content: singleData.content.raw };
            }
          } else {
            await singleResp.text();
          }
        } catch { /* skip */ }
      }
    }

    return items;
  }
}
