/**
 * Connector factory – creates the right CmsConnector from a website record.
 */
import type { CmsConnector, ConnectorConfig } from "./types.ts";
import { WordPressConnector } from "./wordpress.ts";
import { ShopifyConnector } from "./shopify.ts";
import { PrestaShopConnector } from "./prestashop.ts";
import { WooCommerceConnector } from "./woocommerce.ts";

export interface WebsiteRecord {
  url: string;
  type: string;
  credentials: Record<string, string> | null;
}

export function createConnector(website: WebsiteRecord): CmsConnector {
  const creds = website.credentials || {};
  const config: ConnectorConfig = {
    base_url: website.url,
    username: creds.username,
    password: creds.app_password || creds.password,
    api_key: creds.api_key,
    access_token: creds.admin_api_token || creds.access_token,
    consumer_key: creds.consumer_key,
    consumer_secret: creds.consumer_secret,
  };

  switch (website.type) {
    case "wordpress":
      return new WordPressConnector(config);
    case "shopify":
      return new ShopifyConnector(config);
    case "prestashop":
      return new PrestaShopConnector(config);
    case "woocommerce":
      return new WooCommerceConnector(config);
    default:
      throw new Error(`Unsupported website type: ${website.type}`);
  }
}
