/**
 * Shared connector types for Deno Edge Functions.
 * Mirror of src/lib/connectors/types.ts adapted for server-side use.
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
  schema_json?: Record<string, unknown>;
  custom_fields?: Record<string, unknown>;
  taxonomies?: Record<string, string[]>;
  /** Elementor-specific metadata for WordPress */
  elementor_meta?: {
    elementor_data?: string;
    elementor_edit_mode?: string;
    page_template?: string;
  };
  /** For product-type publishing */
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

export interface ConnectorConfig {
  base_url: string;
  username?: string;
  password?: string;        // WP app_password
  api_key?: string;          // PrestaShop key
  access_token?: string;     // Shopify admin token
  consumer_key?: string;     // WooCommerce
  consumer_secret?: string;  // WooCommerce
}

export interface CmsConnector {
  readonly type: string;
  createPage(payload: PagePayload): Promise<ConnectorResult>;
  testConnection(): Promise<boolean>;
}
