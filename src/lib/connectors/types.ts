/**
 * Connector Abstraction Layer
 *
 * Shared interface for all CMS connectors (WordPress, Shopify, PrestaShop, WooCommerce).
 * Each connector implements this interface so the generation engine can publish
 * pages uniformly regardless of the target platform.
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
  /** For product-type publishing */
  product_data?: {
    price?: string;
    sku?: string;
    body_html?: string;
    handle?: string;
    images?: { src: string; alt?: string }[];
  };
}

export interface ConnectorPage {
  external_id: string;
  url: string;
  title: string;
  status: string;
}

export interface ConnectorConfig {
  base_url: string;
  auth_method?: string;
  username?: string;
  password?: string;
  api_key?: string;
  api_secret?: string;
  access_token?: string;
  shop_domain?: string;
}

export interface CmsConnector {
  readonly type: string;

  /** Create a new page/product on the target CMS */
  createPage(payload: PagePayload): Promise<ConnectorPage>;

  /** Update an existing page/product by its external ID */
  updatePage(externalId: string, payload: Partial<PagePayload>): Promise<ConnectorPage>;

  /** Retrieve a page/product by its external ID */
  getPage(externalId: string): Promise<ConnectorPage | null>;

  /** Test the connection and return true if valid */
  testConnection(): Promise<boolean>;
}
