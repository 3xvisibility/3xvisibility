import type { CmsConnector, ConnectorConfig, ConnectorResult, ContentItem, PagePayload } from "./types.ts";

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
      } else {
        await res.text();
      }
    } catch { /* default */ }
    return "1";
  }

  async createPage(payload: PagePayload): Promise<ConnectorResult> {
    if (payload.product_data) return this.createProduct(payload);

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
    };
  }

  private async createProduct(payload: PagePayload): Promise<ConnectorResult> {
    const langId = await this.getDefaultLangId();
    const linkRewrite = slugify(payload.slug || payload.title);
    const metaTitle = payload.seo_title || payload.title;
    const metaDesc = payload.seo_description || "";
    const price = payload.product_data?.price || "0.000000";

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <product>
    <price>${price}</price>
    <active>1</active>
    <state>1</state>
    <id_tax_rules_group>1</id_tax_rules_group>
    <id_category_default>2</id_category_default>
    <meta_title><language id="${langId}"><![CDATA[${metaTitle}]]></language></meta_title>
    <meta_description><language id="${langId}"><![CDATA[${metaDesc}]]></language></meta_description>
    <name><language id="${langId}"><![CDATA[${payload.title}]]></language></name>
    <description><language id="${langId}"><![CDATA[${payload.content}]]></language></description>
    <description_short><language id="${langId}"><![CDATA[${metaDesc}]]></language></description_short>
    <link_rewrite><language id="${langId}"><![CDATA[${linkRewrite}]]></language></link_rewrite>
  </product>
</prestashop>`;

    const res = await fetch(`${this.baseUrl}/api/products`, {
      method: "POST",
      headers: { Authorization: `Basic ${this.auth}`, "Content-Type": "application/xml" },
      body: xml,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`PrestaShop Product API error [${res.status}]: ${err}`);
    }

    const text = await res.text();
    const idMatch = text.match(/<id>(?:<!\[CDATA\[)?(\d+)(?:\]\]>)?<\/id>/);
    const productId = idMatch ? idMatch[1] : "unknown";

    return {
      external_id: productId,
      url: `${this.baseUrl}/${productId}-${linkRewrite}.html`,
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/languages?output_format=JSON&limit=1`, {
        headers: { Authorization: `Basic ${this.auth}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async listContent(contentType: "pages" | "products"): Promise<ContentItem[]> {
    const resource = contentType === "products" ? "products" : "cms";
    const listResp = await fetch(
      `${this.baseUrl}/api/${resource}?output_format=JSON&display=full`,
      { headers: { Authorization: `Basic ${this.auth}` } }
    );

    if (!listResp.ok) {
      if (contentType === "products") { await listResp.text(); return []; }
      const err = await listResp.text();
      throw new Error(`PrestaShop API error [${listResp.status}]: ${err}`);
    }

    const data = await listResp.json();
    const list = contentType === "products" ? data.products : data.cms;
    const items: ContentItem[] = [];

    for (const item of list || []) {
      const name = contentType === "products"
        ? (item.name?.[0]?.value || item.name || "")
        : (item.meta_title?.[0]?.value || item.meta_title || "");
      const content = contentType === "products"
        ? (item.description?.[0]?.value || item.description || "")
        : (item.content?.[0]?.value || item.content || "");

      items.push({
        id: String(item.id),
        title: name,
        slug: item.link_rewrite?.[0]?.value || item.link_rewrite || String(item.id),
        url: `${this.baseUrl}/${item.link_rewrite?.[0]?.value || item.id}`,
        type: contentType === "products" ? "product" : "page",
        status: item.active === "1" || item.active === 1 ? "published" : "draft",
        content,
        excerpt: content.replace(/<[^>]*>/g, "").slice(0, 200),
        modified: item.date_upd || "",
      });
    }

    return items;
  }
}
