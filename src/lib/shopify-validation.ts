/**
 * Frontend validators for Shopify credentials.
 * Returns inline warning messages so users see guidance before
 * triggering a test-connection request.
 */

export function validateShopifyDomain(raw: string): string | null {
  const value = (raw || "").trim();
  if (!value) return "Enter your shop domain (e.g. my-store.myshopify.com)";

  if (/^https?:\/\//i.test(value)) {
    return "Enter the domain only — no https:// or http:// needed";
  }
  if (value.includes("/")) {
    return "Enter the domain only — do not include any path or slash";
  }
  if (value.includes(" ")) {
    return "Domain cannot contain spaces";
  }
  if (!/\.myshopify\.com$/i.test(value)) {
    return "Domain must end with .myshopify.com (not a custom domain)";
  }
  // Shopify subdomains: lowercase letters, numbers, hyphens, 3-60 chars
  const subdomain = value.replace(/\.myshopify\.com$/i, "");
  if (!/^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/i.test(subdomain)) {
    return "Invalid domain format. Use only letters, numbers, and hyphens (-)";
  }
  return null;
}

export function validateShopifyToken(raw: string): string | null {
  const value = (raw || "").trim();
  if (!value) return "Enter the Admin API access token";

  if (/\s/.test(value)) {
    return "Token cannot contain spaces or newlines";
  }
  if (value.length < 20) {
    return "Token looks too short — did you copy the full token?";
  }
  // Accept tokens from BOTH sources:
  //  - Shopify Admin custom apps  -> shpat_...
  //  - Shopify Partners dashboard (custom distribution / public apps) -> shpua_..., shpca_..., shppa_...
  //  - Some legacy / private apps just expose a 32-char hex secret
  const knownPrefix = /^(shpat_|shpua_|shpca_|shppa_|shpss_)/i.test(value);
  const looksLikeHexSecret = /^[a-f0-9]{32,64}$/i.test(value);
  if (!knownPrefix && !looksLikeHexSecret) {
    return "This does not look like a valid Shopify Admin API token. Paste the token from your Admin custom app or your Partners developer dashboard app.";
  }
  return null;
}
