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
   * WordPress page template slug (e.g. "page-templates/full-width.php", or
   * theme-specific). When set, mirrors the template the rest of the site already
   * uses so generated pages inherit the same theme layout.
   */
  page_template?: string;
  /**
   * Shopify-specific: alternate page template suffix (e.g. "landing", "contact").
   * When set, Shopify will render the page with templates/page.<suffix>.liquid|json
   * instead of the default page template. Ignored by non-Shopify connectors.
   */
  shopify_page_template_suffix?: string;
  schema_json?: Record<string, unknown>;
  /**
   * Pre-built Elementor `_elementor_data` JSON string. When set (resolved from the
   * stored `elementor_templates` catalog with editable content already applied),
   * the WordPress connector uses it verbatim instead of converting HTML, so the
   * published page matches the stored template design 1:1.
   */
  elementor_data?: string;
  /**
   * Desired publish format for WordPress pages: "elementor" (native Elementor,
   * default), "gutenberg" (native block editor), or "shopify" (routed to the
   * Shopify connector). Controls how `content` is converted at publish time.
   */
  publish_format?: "elementor" | "gutenberg" | "shopify";
  custom_fields?: Record<string, unknown>;
  taxonomies?: Record<string, string[]>;
  /**
   * When true (default for republishes of existing CMS pages), the connector MUST
   * NOT touch the live page's body content, builder layout, or page template. Only
   * metadata-level fields (title, slug, SEO title/description/keywords, canonical,
   * excerpt) are updated. This preserves the original site design exactly as the
   * user built it on the CMS, while still allowing AI-driven SEO improvements to
   * flow through.
   */
  preserve_design?: boolean;
  /**
   * Shopify Online Store 2.0 section kit. When set, the Shopify connector
   * publishes the page as a NATIVE section template (writes sections/<id>.liquid
   * + templates/page.<suffix>.json to the live theme) so the design renders 1:1
   * and stays editable in the theme customizer. Falls back to body_html when the
   * theme is not writable (missing write_themes scope).
   */
  shopify_section_kit?: {
    sectionId: string;
    sectionLiquid: string;
    template: Record<string, unknown>;
    suffix: string;
  };
  product_data?: {
    price?: string;
    sku?: string;
    body_html?: string;
    handle?: string;
    images?: { src: string; alt?: string }[];
    /** Optional vendor / brand mapped from a Shopify field mapping */
    vendor?: string;
    /** Optional Shopify product type taxonomy value */
    product_type?: string;
    /** Comma-separated tags string OR array */
    tags?: string | string[];
    /** Status override: active | draft | archived */
    product_status?: "active" | "draft" | "archived";
    /** Per-variant fields applied to the default/first variant */
    variant?: {
      option1?: string;
      option2?: string;
      option3?: string;
      compare_at_price?: string;
      inventory_quantity?: number;
      weight?: number;
      weight_unit?: "g" | "kg" | "oz" | "lb";
      barcode?: string;
    };
    /** Shopify metafields to attach on create/update */
    metafields?: { namespace: string; key: string; type: string; value: string }[];
    /**
     * Shopify-specific: alternate product template suffix (e.g. "custom").
     * When set, Shopify will render the product with templates/product.<suffix>.
     */
    template_suffix?: string;
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
