import type { CmsConnector, ConnectorConfig, ConnectorPage, PagePayload } from "./types";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export class PrestaShopConnector implements CmsConnector {
  readonly type = "prestashop";
  private baseUrl: string;
  private auth: string;

  constructor(config: ConnectorConfig) {
    this.baseUrl = config.base_url.replace(/\/+$/, "");
    if (!config.api_key) throw new Error("PrestaShop API key not configured");
    this.auth = btoa(`${config.api_key}:`);
  }

  private async getDefaultLangId(): Promise<string> {
    try {
      const res = await fetch(
        `${this.baseUrl}/api/languages?output_format=JSON&filter[active]=1&limit=1`,
        { headers: { Authorization: `Basic ${this.auth}` } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.languages?.length > 0) return String(data.languages[0].id);
      }
    } catch { /* default */ }
    return "1";
  }

  async createPage(payload: PagePayload): Promise<ConnectorPage> {
    const langId = await this.getDefaultLangId();
    const linkRewrite = slugify(payload.slug || payload.title);
    const metaTitle = payload.seo_title || payload.title;
    const metaDesc = payload.seo_description || "";

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <cms>
    <id_cms_category>1</id_cms_category>
    <active>1</active>
    <indexation>1</indexation>
    <meta_title><language id="${langId}"><![CDATA[${metaTitle}]]></language></meta_title>
    <meta_description><language id="${langId}"><![CDATA[${metaDesc}]]></language></meta_description>
    <meta_keywords><language id="${langId}"><![CDATA[${(payload.seo_keywords || []).join(", ")}]]></language></meta_keywords>
    <link_rewrite><language id="${langId}"><![CDATA[${linkRewrite}]]></language></link_rewrite>
    <content><language id="${langId}"><![CDATA[${payload.content}]]></language></content>
  </cms>
</prestashop>`;

    const res = await fetch(`${this.baseUrl}/api/cms`, {
      method: "POST",
      headers: { Authorization: `Basic ${this.auth}`, "Content-Type": "application/xml" },
      body: xml,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`PrestaShop API error [${res.status}]: ${err}`);
    }

    const text = await res.text();
    const idMatch = text.match(/<id>(?:<!\[CDATA\[)?(\d+)(?:\]\]>)?<\/id>/);
    const pageId = idMatch ? idMatch[1] : "unknown";

    return {
      external_id: pageId,
      url: `${this.baseUrl}/content/${pageId}-${linkRewrite}`,
      title: payload.title,
      status: "published",
    };
  }

  async updatePage(externalId: string, payload: Partial<PagePayload>): Promise<ConnectorPage> {
    // PrestaShop update requires PUT with full XML; simplified for now
    throw new Error("PrestaShop updatePage not yet implemented");
  }

  async getPage(externalId: string): Promise<ConnectorPage | null> {
    const res = await fetch(
      `${this.baseUrl}/api/cms/${externalId}?output_format=JSON`,
      { headers: { Authorization: `Basic ${this.auth}` } }
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`PrestaShop getPage failed (${res.status})`);
    const data = await res.json();
    return {
      external_id: String(data.cms?.id || externalId),
      url: `${this.baseUrl}/content/${externalId}`,
      title: "",
      status: data.cms?.active === "1" ? "published" : "draft",
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const res = await fetch(
        `${this.baseUrl}/api/languages?output_format=JSON&limit=1`,
        { headers: { Authorization: `Basic ${this.auth}` } }
      );
      return res.ok;
    } catch {
      return false;
    }
  }
}
