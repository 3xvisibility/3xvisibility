export type { CmsConnector, ConnectorConfig, ConnectorPage, PagePayload } from "./types";
export { WordPressConnector } from "./wordpress";
export { ShopifyConnector } from "./shopify";

import type { CmsConnector, ConnectorConfig } from "./types";
import { WordPressConnector } from "./wordpress";
import { ShopifyConnector } from "./shopify";

/**
 * Factory function to create the appropriate connector based on site type.
 * Extend this to add PrestaShop, WooCommerce, etc.
 */
export function createConnector(type: string, config: ConnectorConfig): CmsConnector {
  switch (type) {
    case "wordpress":
    case "woocommerce":
      return new WordPressConnector(config);
    case "shopify":
      return new ShopifyConnector(config);
    default:
      throw new Error(`Unsupported connector type: ${type}`);
  }
}
