/**
 * Validates that a URL is a legitimate Shopify OAuth authorization URL.
 * Must be HTTPS, on a *.myshopify.com domain, at /admin/oauth/authorize.
 */
export function isSafeShopifyAuthUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      /\.myshopify\.com$/i.test(url.hostname) &&
      url.pathname.startsWith("/admin/oauth/authorize")
    );
  } catch {
    return false;
  }
}

export function navigateToShopifyAuth(value: string): void {
  if (!isSafeShopifyAuthUrl(value)) {
    throw new Error("Received an invalid Shopify authorization URL");
  }

  window.top!.location.href = value;
}

export function launchShopifyOAuthInTopWindow(params: {
  shopDomain: string;
  workspaceId: string;
  siteName?: string | null;
  language?: string | null;
}): void {
  const search = new URLSearchParams({
    shop_domain: params.shopDomain,
    workspace_id: params.workspaceId,
  });

  if (params.siteName) search.set("site_name", params.siteName);
  if (params.language) search.set("language", params.language);

  window.top!.location.href = `${window.location.origin}/shopify/oauth-launch?${search.toString()}`;
}
