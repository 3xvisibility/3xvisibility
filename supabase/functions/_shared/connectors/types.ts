/**
 * Shared connector types for Deno Edge Functions.
 */

export interface PagePayload {
  title: string;
  content: string;
  slug: string;
  status: "draft" | "publish";
  excerpt?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string[];
  canonical_url?: string;
  /**
   * WordPress page template slug (e.g. "elementor_canvas", "elementor_header_footer",
   * "page-templates/full-width.php", or theme-specific). When set, mirrors the
   * template the rest of the site already uses so generated pages inherit the
   * same theme/builder layout.
   */
  page_template?: string;
  schema_json?: Record<string, unknown>;
  custom_fields?: Record<string, unknown>;
  taxonomies?: Record<string, string[]>;
  /**
   * When true (default for republishes of existing CMS pages), the connector MUST
   * NOT touch the live page's body content, Elementor data, builder layout, or
   * page template. Only metadata-level fields (title, slug, SEO title/description/
   * keywords, canonical, excerpt) are updated. This preserves the original site
   * design exactly as the user built it on the CMS, while still allowing AI-driven
   * SEO improvements to flow through.
   */
  preserve_design?: boolean;
  elementor_meta?: {
    elementor_data?: string;
    elementor_edit_mode?: string;
    page_template?: string;
  };
  product_data?: {
    price?: string;
    sku?: string;
    body_html?: string;
    handle?: string;
    images?: { src: string; alt?: string }[];
  };
}

export interface ConnectorResult {
  external_id: string;
  url: string;
}

export interface ContentItem {
  id: string;
  title: string;
  slug: string;
  url: string;
  type: "page" | "product";
  status: string;
  content: string;
  excerpt: string;
  modified: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string[];
  canonical_url?: string;
  elementor_data?: string;
  elementor_edit_mode?: string;
  page_template?: string;
  raw_meta?: Record<string, unknown>;
}

export interface ConnectorConfig {
  base_url: string;
  username?: string;
  password?: string;
  api_key?: string;
  access_token?: string;
  consumer_key?: string;
  consumer_secret?: string;
}

export interface CmsConnector {
  readonly type: string;
  createPage(payload: PagePayload): Promise<ConnectorResult>;
  updatePage(externalId: string, payload: Partial<PagePayload>): Promise<ConnectorResult>;
  testConnection(): Promise<boolean>;
  listContent(contentType: "pages" | "products"): Promise<ContentItem[]>;
}
