/**
 * Content-based SEO / SEA / GEO scores aligned with popular WordPress SEO plugins
 * (Yoast SEO, RankMath, All in One SEO).
 *
 * Scoring criteria mirror the checks these plugins perform so that a 90+ score
 * here translates to a green / good score in those plugins.
 */

export interface ContentScoreResult {
  score: number;
  label: "Poor" | "Fair" | "Good" | "Excellent";
  color: string;
  checks: { label: string; passed: boolean; tip: string; weight?: number }[];
}

export type ContentSeoResult = ContentScoreResult;

function toLabel(score: number): { label: ContentScoreResult["label"]; color: string } {
  if (score >= 85) return { label: "Excellent", color: "text-emerald-600" };
  if (score >= 60) return { label: "Good", color: "text-primary" };
  if (score >= 35) return { label: "Fair", color: "text-amber-600" };
  return { label: "Poor", color: "text-destructive" };
}

/** Strip HTML to plain text */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** Extract a rough focus keyword from the title (first meaningful phrase) */
function extractFocusKeyword(title: string): string {
  if (!title) return "";
  // Remove common stop words to find the core keyword
  const stops = new Set(["the", "a", "an", "in", "on", "at", "to", "for", "of", "and", "or", "is", "are", "was", "were", "be", "been", "being", "with", "by", "from", "as", "this", "that", "it", "its"]);
  const words = title.toLowerCase().replace(/[^a-z0-9\s]/gi, "").split(/\s+/).filter(w => w.length > 2 && !stops.has(w));
  // Return up to 3 words as focus keyword
  return words.slice(0, 3).join(" ");
}

// ─── SEO Score (aligned with Yoast / RankMath) ──────────────

export function calculateContentSeoScore(
  title: string,
  content: string,
  slug: string,
  url?: string
): ContentScoreResult {
  const plainText = stripHtml(content);
  const lowerText = plainText.toLowerCase();
  const lowerContent = content.toLowerCase();
  const focusKw = extractFocusKeyword(title);
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
  const checks: ContentScoreResult["checks"] = [];
  let points = 0;
  const maxPoints = 14;

  // 1. Has title (Yoast: SEO title)
  const hasTitle = (title || "").trim().length > 0;
  checks.push({ label: "Page has title", passed: hasTitle, tip: "Add a page title" });
  if (hasTitle) points++;

  // 2. Title length 30-60 chars (Yoast green zone)
  const titleLen = (title || "").length;
  const titleOk = titleLen >= 30 && titleLen <= 60;
  checks.push({ label: "Title 30-60 chars", passed: titleOk, tip: titleLen < 30 ? "Title too short — aim for 30-60 chars" : titleLen > 60 ? "Title too long — keep under 60 chars" : "" });
  if (titleOk) points++;

  // 3. Focus keyword in title (RankMath / Yoast primary check)
  const kwInTitle = focusKw ? (title || "").toLowerCase().includes(focusKw) : hasTitle;
  checks.push({ label: "Focus keyword in title", passed: kwInTitle, tip: "Include your main keyword in the page title" });
  if (kwInTitle) points++;

  // 4. Content length 300+ words (Yoast minimum, RankMath wants 600+)
  const enoughWords = wordCount >= 300;
  checks.push({ label: "300+ words of content", passed: enoughWords, tip: `Only ${wordCount} words — add more content for SEO` });
  if (enoughWords) points++;

  // 5. Focus keyword in first 10% of content (Yoast / RankMath)
  const first10pct = lowerText.slice(0, Math.max(100, Math.floor(lowerText.length * 0.1)));
  const kwInIntro = focusKw ? first10pct.includes(focusKw) : false;
  checks.push({ label: "Keyword in introduction", passed: kwInIntro, tip: "Mention your focus keyword in the first paragraph" });
  if (kwInIntro) points++;

  // 6. Keyword density 0.5-2.5% (RankMath)
  let kwDensityOk = false;
  if (focusKw && wordCount > 0) {
    const kwRegex = new RegExp(focusKw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const kwMatches = lowerText.match(kwRegex) || [];
    const density = (kwMatches.length / wordCount) * 100;
    kwDensityOk = density >= 0.5 && density <= 2.5;
    checks.push({ label: "Keyword density 0.5-2.5%", passed: kwDensityOk, tip: density < 0.5 ? "Use your focus keyword more often" : "Keyword appears too many times — reduce keyword stuffing" });
  } else {
    checks.push({ label: "Keyword density 0.5-2.5%", passed: false, tip: "Add focus keyword throughout content" });
  }
  if (kwDensityOk) points++;

  // 7. Has H1 heading (Yoast)
  const hasH1 = /<h1[^>]*>/i.test(content);
  checks.push({ label: "Has H1 heading", passed: hasH1, tip: "Add exactly one H1 heading" });
  if (hasH1) points++;

  // 8. Has subheadings H2/H3 (Yoast readability / RankMath)
  const h2h3Count = (content.match(/<h[23][^>]*>/gi) || []).length;
  const hasSubheadings = h2h3Count >= 1;
  checks.push({ label: "Has H2/H3 subheadings", passed: hasSubheadings, tip: "Add subheadings to structure your content" });
  if (hasSubheadings) points++;

  // 9. Focus keyword in subheading (RankMath)
  let kwInSubheading = false;
  if (focusKw) {
    const headingMatches = content.match(/<h[2-6][^>]*>.*?<\/h[2-6]>/gi) || [];
    kwInSubheading = headingMatches.some(h => h.toLowerCase().includes(focusKw));
  }
  checks.push({ label: "Keyword in subheading", passed: kwInSubheading, tip: "Include focus keyword in at least one H2/H3" });
  if (kwInSubheading) points++;

  // 10. Images with alt text (Yoast / RankMath)
  const imgMatch = content.match(/<img[^>]*>/gi) || [];
  const hasImages = imgMatch.length > 0;
  const hasAlt = imgMatch.some(tag => /alt="[^"]+"/i.test(tag));
  checks.push({ label: "Images with alt text", passed: hasImages && hasAlt, tip: "Add images with descriptive alt attributes" });
  if (hasImages && hasAlt) points++;

  // 11. Internal/external links (Yoast / RankMath)
  const hasLinks = /<a[^>]*href/i.test(content);
  checks.push({ label: "Contains links", passed: hasLinks, tip: "Add internal or external links" });
  if (hasLinks) points++;

  // 12. Descriptive URL slug with keyword (RankMath / Yoast)
  const slugClean = (slug || "").replace(/^\/+|\/+$/g, "").toLowerCase();
  const slugOk = slugClean.length > 3 && !/^\d+$/.test(slugClean);
  const kwInSlug = focusKw ? slugClean.includes(focusKw.split(" ")[0]) : slugOk;
  checks.push({ label: "Keyword in URL slug", passed: kwInSlug, tip: "Include focus keyword in the URL" });
  if (kwInSlug) points++;

  // 13. Short paragraphs / readability (Yoast readability)
  const paragraphs = plainText.split(/\n{2,}|<\/p>/i).filter(p => p.trim().length > 0);
  const longParas = paragraphs.filter(p => p.split(/\s+/).length > 150).length;
  const readableParas = longParas === 0;
  checks.push({ label: "Short readable paragraphs", passed: readableParas, tip: "Break long paragraphs into smaller ones (< 150 words each)" });
  if (readableParas) points++;

  // 14. Meta description or excerpt presence (inferred from content quality)
  const hasMetaContent = plainText.length > 50;
  checks.push({ label: "Sufficient content for meta", passed: hasMetaContent, tip: "Add enough content for search engines to generate a snippet" });
  if (hasMetaContent) points++;

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
  const plainText = stripHtml(content);
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
  const trustPatterns = /(testimonial|review|rating|stars?|trust|guarantee|certified|secure|ssl|badge|award|★|⭐)/i;
  const hasTrust = trustPatterns.test(lowerText) || trustPatterns.test(lowerContent);
  checks.push({ label: "Trust signals present", passed: hasTrust, tip: "Add testimonials, reviews, or trust badges" });
  if (hasTrust) points++;

  // 5. Has pricing or offer information
  const hasPricing = /(price|pricing|\$|€|£|¥|cost|plan|package|offer|discount|%\s*off)/i.test(lowerText);
  checks.push({ label: "Pricing / offer info", passed: hasPricing, tip: "Include pricing or special offer details" });
  if (hasPricing) points++;

  // 6. Focused content (not too long — ideal landing: 100-1500 words)
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
  const focused = wordCount >= 100 && wordCount <= 1500;
  checks.push({ label: "Focused content (100-1500 words)", passed: focused, tip: wordCount < 100 ? "Content is too thin" : "Landing page is too long — keep it focused" });
  if (focused) points++;

  // 7. Has images or media
  const hasMedia = /<img/i.test(content) || /<video/i.test(content) || /iframe/i.test(content);
  checks.push({ label: "Has images / media", passed: hasMedia, tip: "Add visuals to improve engagement" });
  if (hasMedia) points++;

  // 8. UTM-friendly slug
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
  const plainText = stripHtml(content);
  const lowerText = plainText.toLowerCase();
  const lowerContent = content.toLowerCase();
  const checks: ContentScoreResult["checks"] = [];
  let points = 0;
  const maxPoints = 8;

  const geoTitleWords = /(city|town|region|area|county|district|near|local|in\s+[A-Z])/;
  const hasGeoTitle = geoTitleWords.test(title || "") || /[A-Z][a-z]+\s*(,\s*[A-Z]{2})?/.test(title || "");
  checks.push({ label: "Location in title", passed: hasGeoTitle, tip: "Include city/region name in the title" });
  if (hasGeoTitle) points++;

  const addressPattern = /(\d+\s+[A-Za-z]+\s+(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|way|ct|court|pl|place))/i;
  const hasAddress = addressPattern.test(plainText);
  checks.push({ label: "Has street address", passed: hasAddress, tip: "Add a physical address" });
  if (hasAddress) points++;

  const phonePattern = /(\+?[\d\s\-().]{7,15})/;
  const hasPhone = phonePattern.test(plainText) && /(phone|tel|call|contact)/i.test(lowerText);
  checks.push({ label: "Has phone number", passed: hasPhone, tip: "Add a contact phone number" });
  if (hasPhone) points++;

  const hasMap = /google\.com\/maps|maps\.google|<iframe[^>]*map/i.test(lowerContent) || /(map|direction|navigate|locate)/i.test(lowerText);
  checks.push({ label: "Map / directions reference", passed: hasMap, tip: "Embed a map or add directions" });
  if (hasMap) points++;

  const hasLocalSchema = /(LocalBusiness|PostalAddress|GeoCoordinates|latitude|longitude|addressLocality|addressRegion)/i.test(content);
  checks.push({ label: "Local schema markup", passed: hasLocalSchema, tip: "Add LocalBusiness or GeoCoordinates structured data" });
  if (hasLocalSchema) points++;

  const hasHours = /(hour|schedule|open|close|mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday|am|pm)/i.test(lowerText) && /(open|hour|schedule)/i.test(lowerText);
  checks.push({ label: "Opening hours mentioned", passed: hasHours, tip: "Add business opening hours" });
  if (hasHours) points++;

  const slugClean = (slug || "").replace(/^\/+|\/+$/g, "").toLowerCase();
  const geoSlug = slugClean.length > 3 && !/^\d+$/.test(slugClean);
  checks.push({ label: "Descriptive geo URL", passed: geoSlug, tip: "Include location in the URL (e.g. /plumber-paris)" });
  if (geoSlug) points++;

  const geoKeywords = /(near me|nearby|in the area|serving|service area|located|neighborhood|community|zip\s*code|postal)/i;
  const hasGeoKeywords = geoKeywords.test(lowerText);
  checks.push({ label: "Geo-specific keywords", passed: hasGeoKeywords, tip: 'Add phrases like "near me", "serving [area]", etc.' });
  if (hasGeoKeywords) points++;

  const score = Math.round((points / maxPoints) * 100);
  return { score, ...toLabel(score), checks };
}
