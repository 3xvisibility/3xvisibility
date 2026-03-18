/**
 * Converts raw backend error messages into user-friendly messages.
 */
export function friendlyError(message: string): string {
  // Placeholder URL detection
  if (message.includes("is a placeholder") || message.includes("example.com") || message.includes("example.org") || message.includes("example.net")) {
    return "This website still has a placeholder URL (example.com). Please go to Settings → Websites and update it to your real domain before continuing.";
  }

  // DNS / connectivity errors
  if (message.includes("Could not connect to") || message.includes("dns error") || message.includes("failed to lookup address")) {
    const domainMatch = message.match(/"([^"]+)"/);
    const domain = domainMatch ? domainMatch[1] : "the website";
    return `Could not reach ${domain}. Please check that the URL is correct and the site is online.`;
  }

  // Generic fetch failures
  if (message.includes("Failed to fetch page:")) {
    return "The page could not be loaded. Please verify the URL is correct and publicly accessible.";
  }

  return message;
}
