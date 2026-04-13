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

function buildConfig(website: WebsiteRecord, creds: Record<string, string>): ConnectorConfig {
  return {
    base_url: website.url,
    username: creds.username,
    password: creds.app_password || creds.jwt_token || creds.password,
    api_key: creds.api_key,
    access_token: creds.admin_api_token || creds.access_token || creds.jwt_token,
    consumer_key: creds.consumer_key,
    consumer_secret: creds.consumer_secret,
  };
}

async function decryptCreds(website: WebsiteRecord): Promise<Record<string, string>> {
  const rawCreds = website.credentials || {};
  try {
    return await decryptCredentials(rawCreds);
  } catch {
    return rawCreds;
  }
}

export async function createConnector(website: WebsiteRecord): Promise<CmsConnector> {
  const creds = await decryptCreds(website);
  const config = buildConfig(website, creds);

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

/**
 * For product updates: if the website has WooCommerce credentials (consumer_key/secret),
 * always use the WooCommerceConnector so products are updated via /wc/v3/products/ API.
 * Falls back to the normal connector if no WC credentials exist.
 */
export async function createProductConnector(website: WebsiteRecord): Promise<CmsConnector> {
  const creds = await decryptCreds(website);
  
  // If WooCommerce credentials exist, use WooCommerce connector for products
  if (creds.consumer_key && creds.consumer_secret) {
    const config = buildConfig(website, creds);
    return new WooCommerceConnector(config);
  }
  
  // Fallback to the default connector
  const config = buildConfig(website, creds);
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
