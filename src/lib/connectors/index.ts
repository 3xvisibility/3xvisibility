export type { CmsConnector, ConnectorConfig, ConnectorPage, PagePayload } from "./types";
export { WordPressConnector } from "./wordpress";
export { ShopifyConnector } from "./shopify";
export { PrestaShopConnector } from "./prestashop";
export { WooCommerceConnector } from "./woocommerce";

import type { CmsConnector, ConnectorConfig } from "./types";
import { WordPressConnector } from "./wordpress";
import { ShopifyConnector } from "./shopify";
import { PrestaShopConnector } from "./prestashop";
import { WooCommerceConnector } from "./woocommerce";

/**
 * Factory function to create the appropriate connector based on site type.
 */
export function createConnector(type: string, config: ConnectorConfig): CmsConnector {
  switch (type) {
    case "wordpress":
      return new WordPressConnector(config);
    case "shopify":
      return new ShopifyConnector(config);
    case "prestashop":
      return new PrestaShopConnector(config);
    case "woocommerce":
      return new WooCommerceConnector(config);
    default:
      throw new Error(`Unsupported connector type: ${type}`);
  }
}
