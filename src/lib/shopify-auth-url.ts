/**
 * Shopify OAuth redirect helpers.
 *
 * The key challenge: inside the Lovable preview the app runs in a
 * cross-origin iframe, so `window.top.location.href = …` throws a
 * DOMException.  We try `window.top` first (works in production where
 * there is no iframe), then fall back to `window.location.href`.
 */

/** Validates that a URL is a legitimate Shopify OAuth authorization URL. */
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

/**
 * Navigate the **top-level** browser window to a Shopify OAuth URL.
 * Falls back to current-frame navigation when cross-origin blocks
 * access to `window.top`.
 */
export function navigateToShopifyAuth(value: string): void {
  if (!isSafeShopifyAuthUrl(value)) {
    throw new Error("Received an invalid Shopify authorization URL");
  }
  allowEphemeralSessionNavigationOnce();
  safeTopRedirect(value);
}

/**
 * Kick off the Shopify OAuth flow by navigating to our first-party
 * launcher page (`/shopify/oauth-launch`).  That page calls the
 * edge function and then redirects to Shopify.
 */
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

  const target = `${window.location.origin}/shopify/oauth-launch?${search.toString()}`;
  allowEphemeralSessionNavigationOnce();
  safeTopRedirect(target);
}

/* ------------------------------------------------------------------ */
/*  Internal helper                                                    */
/* ------------------------------------------------------------------ */

/**
 * Try `window.top.location.href` first.  If it throws (cross-origin
 * iframe), fall back to `window.location.href` which still triggers a
 * full navigation in the current frame.
 */
function safeTopRedirect(url: string): void {
  try {
    // In production (no iframe) this succeeds immediately.
    // In Lovable preview it will throw a DOMException.
    if (window.top && window.top !== window) {
      window.top.location.href = url;
      return;
    }
  } catch {
    // Cross-origin — fall through
  }
  // Either same window or cross-origin blocked: navigate current frame.
  window.location.href = url;
}

function allowEphemeralSessionNavigationOnce(): void {
  try {
    localStorage.setItem("allowEphemeralSessionNavigationOnce", "shopify-oauth");
  } catch {
    // Ignore storage failures; OAuth can still proceed for persistent sessions.
  }
}
