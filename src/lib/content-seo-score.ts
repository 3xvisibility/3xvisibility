/**
 * Lightweight content-based SEO / SEA / GEO scores for pages fetched from external CMS
 * (where we only have title, content, slug — no explicit SEO metadata).
 */

export interface ContentScoreResult {
  score: number;
  label: "Poor" | "Fair" | "Good" | "Excellent";
  color: string;
  checks: { label: string; passed: boolean; tip: string }[];
}

// Re-export legacy alias
export type ContentSeoResult = ContentScoreResult;

function toLabel(score: number): { label: ContentScoreResult["label"]; color: string } {
  if (score >= 85) return { label: "Excellent", color: "text-emerald-600" };
  if (score >= 60) return { label: "Good", color: "text-primary" };
  if (score >= 35) return { label: "Fair", color: "text-amber-600" };
  return { label: "Poor", color: "text-destructive" };
}

// ─── SEO Score ───────────────────────────────────────────────

export function calculateContentSeoScore(
  title: string,
  content: string,
  slug: string,
  url?: string
): ContentScoreResult {
  const plainText = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const checks: ContentScoreResult["checks"] = [];
  let points = 0;
  const maxPoints = 8;

  const hasTitle = (title || "").trim().length > 0;
  checks.push({ label: "Page has title", passed: hasTitle, tip: "Add a page title" });
  if (hasTitle) points++;

  const titleLen = (title || "").length;
  const titleOk = titleLen >= 20 && titleLen <= 70;
  checks.push({ label: "Title length (20-70 chars)", passed: titleOk, tip: titleLen < 20 ? "Title is too short" : titleLen > 70 ? "Title is too long" : "" });
  if (titleOk) points++;

  const hasContent = plainText.length > 100;
  checks.push({ label: "Content > 100 chars", passed: hasContent, tip: "Add more content" });
  if (hasContent) points++;

  const hasHeadings = /<h[1-6][^>]*>/i.test(content);
  checks.push({ label: "Has headings (H1-H6)", passed: hasHeadings, tip: "Add heading tags" });
  if (hasHeadings) points++;

  const imgMatch = content.match(/<img[^>]*>/gi) || [];
  const hasImages = imgMatch.length > 0;
  const hasAlt = imgMatch.some((tag) => /alt="[^"]+"/i.test(tag));
  checks.push({ label: "Images with alt text", passed: hasImages && hasAlt, tip: "Add images with alt attributes" });
  if (hasImages && hasAlt) points++;

  const hasLinks = /<a[^>]*href/i.test(content);
  checks.push({ label: "Contains links", passed: hasLinks, tip: "Add internal/external links" });
  if (hasLinks) points++;

  const slugClean = (slug || "").replace(/^\/+|\/+$/g, "");
  const slugOk = slugClean.length > 3 && !/^\d+$/.test(slugClean);
  checks.push({ label: "Descriptive URL slug", passed: slugOk, tip: "Use keyword-rich URL slugs" });
  if (slugOk) points++;

  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
  const enoughWords = wordCount >= 300;
  checks.push({ label: "300+ words of content", passed: enoughWords, tip: `Only ${wordCount} words found` });
  if (enoughWords) points++;

  const score = Math.round((points / maxPoints) * 100);
  return { score, ...toLabel(score), checks };
}

// ─── SEA Score (Paid Landing Page Quality) ───────────────────

export function calculateContentSeaScore(
  title: string,
  content: string,
  slug: string,
  url?: string
): ContentScoreResult {
  const plainText = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const lowerContent = content.toLowerCase();
  const lowerText = plainText.toLowerCase();
  const checks: ContentScoreResult["checks"] = [];
  let points = 0;
  const maxPoints = 8;

  // 1. Has a clear CTA (button or action link)
  const ctaPatterns = /(<button|<a[^>]*class[^>]*(btn|button|cta)|type="submit"|<input[^>]*type="submit")/i;
  const hasCta = ctaPatterns.test(content);
  checks.push({ label: "Has CTA button/link", passed: hasCta, tip: "Add a clear call-to-action button" });
  if (hasCta) points++;

  // 2. Has form elements (lead capture)
  const hasForm = /<form/i.test(content) || /<input[^>]*type="(email|tel|text)"/i.test(content);
  checks.push({ label: "Has form / lead capture", passed: hasForm, tip: "Add a form to capture leads" });
  if (hasForm) points++;

  // 3. Has action words in title
  const actionWords = /(buy|get|order|sign up|subscribe|download|free|save|discount|offer|deal|try|start|book|reserve|request|claim)/i;
  const hasActionTitle = actionWords.test(title || "");
  checks.push({ label: "Action words in title", passed: hasActionTitle, tip: "Use action-oriented words in title (buy, get, free...)" });
  if (hasActionTitle) points++;

  // 4. Has trust signals (reviews, testimonials, badges)
  const trustPatterns = /(testimonial|review|rating|stars?|trust|guarantee|certified|secure|ssl|badge|award|\\★|⭐)/i;
  const hasTrust = trustPatterns.test(lowerText) || trustPatterns.test(lowerContent);
  checks.push({ label: "Trust signals present", passed: hasTrust, tip: "Add testimonials, reviews, or trust badges" });
  if (hasTrust) points++;

  // 5. Has pricing or offer information
  const hasPricing = /(price|pricing|\$|€|£|¥|cost|plan|package|offer|discount|%\s*off)/i.test(lowerText);
  checks.push({ label: "Pricing / offer info", passed: hasPricing, tip: "Include pricing or special offer details" });
  if (hasPricing) points++;

  // 6. Focused content (not too long — ideal landing: 300-1500 words)
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
  const focused = wordCount >= 100 && wordCount <= 1500;
  checks.push({ label: "Focused content (100-1500 words)", passed: focused, tip: wordCount < 100 ? "Content is too thin" : "Landing page is too long — keep it focused" });
  if (focused) points++;

  // 7. Has images or media
  const hasMedia = /<img/i.test(content) || /<video/i.test(content) || /iframe/i.test(content);
  checks.push({ label: "Has images / media", passed: hasMedia, tip: "Add visuals to improve engagement" });
  if (hasMedia) points++;

  // 8. UTM-friendly slug (no special chars, descriptive)
  const slugClean = (slug || "").replace(/^\/+|\/+$/g, "");
  const utmFriendly = slugClean.length > 2 && /^[a-z0-9-]+$/i.test(slugClean);
  checks.push({ label: "UTM-friendly clean URL", passed: utmFriendly, tip: "Use a clean, descriptive URL slug" });
  if (utmFriendly) points++;

  const score = Math.round((points / maxPoints) * 100);
  return { score, ...toLabel(score), checks };
}

// ─── GEO Score (Local / Geographic Page Quality) ─────────────

export function calculateContentGeoScore(
  title: string,
  content: string,
  slug: string,
  url?: string
): ContentScoreResult {
  const plainText = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const lowerText = plainText.toLowerCase();
  const lowerContent = content.toLowerCase();
  const checks: ContentScoreResult["checks"] = [];
  let points = 0;
  const maxPoints = 8;

  // 1. Has location/city in title
  // We check for capitalized proper nouns pattern or common geo terms
  const geoTitleWords = /(city|town|region|area|county|district|near|local|in\s+[A-Z])/;
  const hasGeoTitle = geoTitleWords.test(title || "") || /[A-Z][a-z]+\s*(,\s*[A-Z]{2})?/.test(title || "");
  checks.push({ label: "Location in title", passed: hasGeoTitle, tip: "Include city/region name in the title" });
  if (hasGeoTitle) points++;

  // 2. Has address pattern
  const addressPattern = /(\d+\s+[A-Za-z]+\s+(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|way|ct|court|pl|place))/i;
  const hasAddress = addressPattern.test(plainText);
  checks.push({ label: "Has street address", passed: hasAddress, tip: "Add a physical address" });
  if (hasAddress) points++;

  // 3. Has phone number
  const phonePattern = /(\+?[\d\s\-().]{7,15})/;
  const hasPhone = phonePattern.test(plainText) && /(phone|tel|call|contact)/i.test(lowerText);
  checks.push({ label: "Has phone number", passed: hasPhone, tip: "Add a contact phone number" });
  if (hasPhone) points++;

  // 4. Has map embed or map reference
  const hasMap = /google\.com\/maps|maps\.google|<iframe[^>]*map/i.test(lowerContent) || /(map|direction|navigate|locate)/i.test(lowerText);
  checks.push({ label: "Map / directions reference", passed: hasMap, tip: "Embed a map or add directions" });
  if (hasMap) points++;

  // 5. Has local schema markup (LocalBusiness, Place, etc.)
  const hasLocalSchema = /(LocalBusiness|PostalAddress|GeoCoordinates|latitude|longitude|addressLocality|addressRegion)/i.test(content);
  checks.push({ label: "Local schema markup", passed: hasLocalSchema, tip: "Add LocalBusiness or GeoCoordinates structured data" });
  if (hasLocalSchema) points++;

  // 6. Has opening hours
  const hasHours = /(hour|schedule|open|close|mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday|am|pm)/i.test(lowerText) && /(open|hour|schedule)/i.test(lowerText);
  checks.push({ label: "Opening hours mentioned", passed: hasHours, tip: "Add business opening hours" });
  if (hasHours) points++;

  // 7. Location in URL slug
  const slugClean = (slug || "").replace(/^\/+|\/+$/g, "").toLowerCase();
  const geoSlug = slugClean.length > 3 && !/^\d+$/.test(slugClean);
  checks.push({ label: "Descriptive geo URL", passed: geoSlug, tip: "Include location in the URL (e.g. /plumber-paris)" });
  if (geoSlug) points++;

  // 8. Has service area / geo keywords
  const geoKeywords = /(near me|nearby|in the area|serving|service area|located|neighborhood|community|zip\s*code|postal)/i;
  const hasGeoKeywords = geoKeywords.test(lowerText);
  checks.push({ label: "Geo-specific keywords", passed: hasGeoKeywords, tip: 'Add phrases like "near me", "serving [area]", etc.' });
  if (hasGeoKeywords) points++;

  const score = Math.round((points / maxPoints) * 100);
  return { score, ...toLabel(score), checks };
}
