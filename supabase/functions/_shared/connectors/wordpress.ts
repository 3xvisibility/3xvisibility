import type { CmsConnector, ConnectorConfig, ConnectorResult, PagePayload } from "./types.ts";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

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

  async createPage(payload: PagePayload): Promise<ConnectorResult> {
    const body: Record<string, unknown> = {
      title: payload.title,
      content: payload.content,
      slug: slugify(payload.slug || payload.title),
      status: payload.status === "publish" ? "publish" : "draft",
    };

    if (payload.excerpt) body.excerpt = payload.excerpt;

    // Yoast SEO + Elementor meta
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
}
