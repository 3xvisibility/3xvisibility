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

  // Auth errors
  if (lower.includes("jwt") || lower.includes("unauthorized") || msg.includes("401")) {
    return "Your session expired. Please refresh the page and sign in again.";
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
