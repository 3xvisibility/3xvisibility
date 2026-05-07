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

  const link = document.createElement("a");
  link.href = value;
  link.target = "_top";
  link.rel = "noopener noreferrer";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
}
