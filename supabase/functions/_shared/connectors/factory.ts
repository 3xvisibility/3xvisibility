/**
 * Connector factory – creates the right CmsConnector from a website record.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import type { CmsConnector, ConnectorConfig } from "./types.ts";
import { WordPressConnector } from "./wordpress.ts";
import { ShopifyConnector } from "./shopify.ts";
import { PrestaShopConnector } from "./prestashop.ts";
import { WooCommerceConnector } from "./woocommerce.ts";
import { decrypt, decryptCredentials } from "../crypto.ts";

export interface WebsiteRecord {
  id?: string;
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

/**
 * For Shopify: prefer the OAuth token stored in `shopify_connections`,
 * fall back to legacy `websites.credentials.admin_api_token`.
 * Also resolves the canonical shop_domain from the connection if available.
 */
async function resolveShopifyConfig(
  website: WebsiteRecord,
  creds: Record<string, string>,
): Promise<ConnectorConfig> {
  const config = buildConfig(website, creds);

  if (!website.id) return config;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return config;

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: conn } = await admin
      .from("shopify_connections")
      .select("access_token, shop_domain")
      .eq("website_id", website.id)
      .maybeSingle();

    if (conn?.access_token) {
      let token = conn.access_token as string;
      try {
        token = await decrypt(token);
      } catch {
        // legacy plain token
      }
      config.access_token = token;
    }
    if (conn?.shop_domain) {
      // Use canonical shop domain from the OAuth connection
      config.base_url = `https://${conn.shop_domain}`;
    }
  } catch (e) {
    console.warn("[connector-factory] shopify_connections lookup failed:", (e as Error).message);
  }

  return config;
}

export async function createConnector(website: WebsiteRecord): Promise<CmsConnector> {
  const creds = await decryptCreds(website);

  switch (website.type) {
    case "wordpress":
      return new WordPressConnector(buildConfig(website, creds));
    case "shopify": {
      const config = await resolveShopifyConfig(website, creds);
      return new ShopifyConnector(config);
    }
    case "prestashop":
      return new PrestaShopConnector(buildConfig(website, creds));
    case "woocommerce":
      return new WooCommerceConnector(buildConfig(website, creds));
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
    return new WooCommerceConnector(buildConfig(website, creds));
  }

  switch (website.type) {
    case "wordpress":
      return new WordPressConnector(buildConfig(website, creds));
    case "shopify": {
      const config = await resolveShopifyConfig(website, creds);
      return new ShopifyConnector(config);
    }
    case "prestashop":
      return new PrestaShopConnector(buildConfig(website, creds));
    case "woocommerce":
      return new WooCommerceConnector(buildConfig(website, creds));
    default:
      throw new Error(`Unsupported website type: ${website.type}`);
  }
}
