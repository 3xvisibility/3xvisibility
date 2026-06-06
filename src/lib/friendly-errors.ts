/**
 * Converts raw backend error messages into user-friendly messages.
 */
export function friendlyError(message: string): string {
  const msg = String(message || "");
  const lower = msg.toLowerCase();

  // AI credits / payment required
  if (msg.includes("402") || lower.includes("credits exhausted") || lower.includes("ai credits") || lower.includes("payment required")) {
    return "Your AI credits have run out. Please top up in Settings → Cloud & AI balance, then try again.";
  }

  // Rate limit
  if (msg.includes("429") || lower.includes("rate limit") || lower.includes("too many requests")) {
    return "You've made too many requests. Please wait a moment and try again.";
  }

  // Placeholder URL detection
  if (msg.includes("is a placeholder") || msg.includes("example.com") || msg.includes("example.org") || msg.includes("example.net")) {
    return "This website still has a placeholder URL (example.com). Please go to Settings → Websites and update it to your real domain before continuing.";
  }

  // DNS / connectivity errors
  if (msg.includes("Could not connect to") || lower.includes("dns error") || lower.includes("failed to lookup address") || lower.includes("getaddrinfo")) {
    const domainMatch = msg.match(/"([^"]+)"/);
    const domain = domainMatch ? domainMatch[1] : "the website";
    return `Could not reach ${domain}. Please check that the URL is correct and the site is online.`;
  }

  // SSL / SNI
  if (lower.includes("unrecognisedname") || lower.includes("ssl") || lower.includes("certificate")) {
    return "Could not establish a secure connection to the site. The server's SSL certificate may be misconfigured.";
  }

  // Subscription / plan limit — needs upgrade
  if (
    lower.includes("page limit") ||
    lower.includes("subscription") ||
    lower.includes("plan limit") ||
    lower.includes("upgrade required") ||
    lower.includes("quota exceeded") ||
    lower.includes("limit reached") ||
    lower.includes("exceeds plan") ||
    lower.includes("plan exceeded") ||
    lower.includes("pages limit")
  ) {
    return "You've hit your plan limit. Upgrade to a higher plan to unlock more pages and features.";
  }

  // Forbidden — authenticated but lacking permission (check before 401 so 403 wins)
  if (
    msg.includes("403") ||
    lower.includes("forbidden") ||
    lower.includes("permission denied") ||
    lower.includes("not allowed") ||
    lower.includes("insufficient") ||
    lower.includes("admin access required") ||
    lower.includes("requires admin") ||
    lower.includes("admin only") ||
    lower.includes("not an admin") ||
    lower.includes("need admin") ||
    lower.includes("workspace admin")
  ) {
    const needsAdmin =
      lower.includes("admin") || lower.includes("administrator") || lower.includes("workspace owner");
    return needsAdmin
      ? "Access denied — this area is admin-only. Only a workspace owner or admin can use this feature. If you need access, ask your workspace admin to upgrade your role."
      : "You don't have permission to do this. This action needs a higher access level. If you think this is a mistake, contact your workspace owner.";
  }

  // Unauthorized — missing/expired token, not signed in
  if (
    msg.includes("401") ||
    lower.includes("jwt") ||
    lower.includes("unauthorized") ||
    lower.includes("no authorization header") ||
    lower.includes("missing authorization") ||
    lower.includes("invalid token") ||
    lower.includes("token expired") ||
    lower.includes("not authenticated") ||
    lower.includes("auth session missing")
  ) {
    return "You're not signed in (or your session expired). Please refresh the page and sign in again to continue.";
  }

  // Generic fetch failures
  if (msg.includes("Failed to fetch page:") || lower.includes("failed to fetch")) {
    return "The page could not be loaded. Please verify the URL is correct and publicly accessible.";
  }

  // Network
  if (lower.includes("network error") || lower.includes("networkerror")) {
    return "Network error. Please check your internet connection and try again.";
  }

  return msg || "Something went wrong. Please try again.";
}

/**
 * Checks if an error is an AI credit exhaustion error.
 */
export function isCreditError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err || "")).toLowerCase();
  return msg.includes("402") || msg.includes("credits exhausted") || msg.includes("ai credits") || msg.includes("payment required");
}

/**
 * Checks if an error is an Unauthorized (401) error — missing/expired token, not signed in.
 */
export function isUnauthorizedError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err || "")).toLowerCase();
  return (
    msg.includes("401") ||
    msg.includes("jwt") ||
    msg.includes("unauthorized") ||
    msg.includes("no authorization header") ||
    msg.includes("missing authorization") ||
    msg.includes("invalid token") ||
    msg.includes("token expired") ||
    msg.includes("not authenticated") ||
    msg.includes("auth session missing")
  );
}

/**
 * Checks if an error is a Forbidden (403) error — authenticated but lacking permission.
 */
export function isForbiddenError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err || "")).toLowerCase();
  return (
    msg.includes("403") ||
    msg.includes("forbidden") ||
    msg.includes("permission denied") ||
    msg.includes("not allowed") ||
    msg.includes("insufficient") ||
    msg.includes("admin access required") ||
    msg.includes("requires admin") ||
    msg.includes("admin only") ||
    msg.includes("not an admin") ||
    msg.includes("need admin") ||
    msg.includes("workspace admin")
  );
}
