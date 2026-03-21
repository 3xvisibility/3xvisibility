/**
 * Connector factory – creates the right CmsConnector from a website record.
 */
import type { CmsConnector, ConnectorConfig } from "./types.ts";
import { WordPressConnector } from "./wordpress.ts";
import { ShopifyConnector } from "./shopify.ts";
import { PrestaShopConnector } from "./prestashop.ts";
import { WooCommerceConnector } from "./woocommerce.ts";
import { decryptCredentials } from "../crypto.ts";

export interface WebsiteRecord {
  url: string;
  type: string;
  credentials: Record<string, string> | null;
}

export async function createConnector(website: WebsiteRecord): Promise<CmsConnector> {
  const rawCreds = website.credentials || {};

  // Try decrypting – falls back to plaintext for legacy unencrypted values
  let creds: Record<string, string>;
  try {
    creds = await decryptCredentials(rawCreds);
  } catch {
    creds = rawCreds;
  }

  const config: ConnectorConfig = {
    base_url: website.url,
    username: creds.username,
    password: creds.app_password || creds.jwt_token || creds.password,
    api_key: creds.api_key,
    access_token: creds.admin_api_token || creds.access_token || creds.jwt_token,
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
