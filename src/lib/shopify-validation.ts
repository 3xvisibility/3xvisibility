/**
 * Frontend validators for Shopify credentials.
 * Returns Bengali warning messages so users see inline guidance before
 * triggering a test-connection request.
 */

export function validateShopifyDomain(raw: string): string | null {
  const value = (raw || "").trim();
  if (!value) return "শপ ডোমেইন দিন (যেমন: my-store.myshopify.com)";

  if (/^https?:\/\//i.test(value)) {
    return "শুধু ডোমেইন লিখুন, https:// বা http:// দরকার নেই";
  }
  if (value.includes("/")) {
    return "শুধু ডোমেইন লিখুন, কোনো path / slash যোগ করবেন না";
  }
  if (value.includes(" ")) {
    return "ডোমেইনে কোনো স্পেস থাকা যাবে না";
  }
  if (!/\.myshopify\.com$/i.test(value)) {
    return "ডোমেইনটি অবশ্যই .myshopify.com দিয়ে শেষ হতে হবে (custom domain নয়)";
  }
  // Shopify subdomains: lowercase letters, numbers, hyphens, 3-60 chars
  const subdomain = value.replace(/\.myshopify\.com$/i, "");
  if (!/^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/i.test(subdomain)) {
    return "ডোমেইন ফরম্যাট ঠিক নেই। শুধু অক্ষর, সংখ্যা এবং হাইফেন (-) ব্যবহার করুন";
  }
  return null;
}

export function validateShopifyToken(raw: string): string | null {
  const value = (raw || "").trim();
  if (!value) return "Admin API access token দিন";

  if (!value.startsWith("shpat_")) {
    return "টোকেনটি অবশ্যই shpat_ দিয়ে শুরু হতে হবে (Admin API access token)";
  }
  if (value.length < 20) {
    return "টোকেন অনেক ছোট মনে হচ্ছে — সম্পূর্ণ টোকেন কপি করেছেন কি?";
  }
  if (/\s/.test(value)) {
    return "টোকেনে কোনো স্পেস বা নতুন লাইন থাকা যাবে না";
  }
  return null;
}
