/**
 * Comprehensive SEO audit that produces actionable recommendations per page.
 */

export interface AuditItem {
  category: "critical" | "warning" | "info" | "passed";
  label: string;
  recommendation: string;
}

export interface AuditResult {
  overallScore: number;
  items: AuditItem[];
}

export function auditPage(page: {
  title: string;
  content: string;
  slug: string;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string[] | null;
}): AuditResult {
  const items: AuditItem[] = [];
  const plain = page.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const wordCount = plain.split(/\s+/).filter(Boolean).length;

  // Title checks
  const title = page.seo_title || page.title || "";
  if (!title) {
    items.push({ category: "critical", label: "Missing title", recommendation: "Add a page title — it's the most important on-page SEO element." });
  } else {
    if (title.length < 20) items.push({ category: "warning", label: "Title too short", recommendation: `Title is ${title.length} chars. Aim for 30-60 characters.` });
    else if (title.length > 70) items.push({ category: "warning", label: "Title too long", recommendation: `Title is ${title.length} chars. Keep under 60 for full SERP display.` });
    else items.push({ category: "passed", label: "Title length OK", recommendation: "" });
  }

  // Meta description
  const desc = page.seo_description || "";
  if (!desc) {
    items.push({ category: "warning", label: "Missing meta description", recommendation: "Add a meta description (120-160 chars) to improve CTR in search results." });
  } else {
    if (desc.length < 70) items.push({ category: "info", label: "Short meta description", recommendation: "Expand your meta description to 120-160 characters." });
    else if (desc.length > 170) items.push({ category: "info", label: "Long meta description", recommendation: "Trim to under 160 chars to avoid truncation." });
    else items.push({ category: "passed", label: "Meta description OK", recommendation: "" });
  }

  // Keywords
  if (!page.seo_keywords?.length) {
    items.push({ category: "info", label: "No keywords set", recommendation: "Add target keywords to track ranking and relevance." });
  } else {
    const kwInTitle = page.seo_keywords.some((k) => title.toLowerCase().includes(k.toLowerCase()));
    if (!kwInTitle) items.push({ category: "warning", label: "Keyword missing from title", recommendation: "Include your primary keyword in the page title." });
    else items.push({ category: "passed", label: "Keyword in title", recommendation: "" });
  }

  // Content length
  if (wordCount < 100) items.push({ category: "critical", label: "Thin content", recommendation: `Only ${wordCount} words. Add substantial content (300+ words recommended).` });
  else if (wordCount < 300) items.push({ category: "warning", label: "Short content", recommendation: `${wordCount} words. Aim for 300+ words for better ranking potential.` });
  else items.push({ category: "passed", label: `Content length OK (${wordCount} words)`, recommendation: "" });

  // Headings
  const h1Count = (page.content.match(/<h1[^>]*>/gi) || []).length;
  const hasSubheadings = /<h[2-6][^>]*>/i.test(page.content);
  if (h1Count === 0) items.push({ category: "warning", label: "No H1 heading", recommendation: "Add exactly one H1 heading to define the main topic." });
  else if (h1Count > 1) items.push({ category: "info", label: "Multiple H1 headings", recommendation: `Found ${h1Count} H1 tags. Use only one H1 per page.` });
  else items.push({ category: "passed", label: "Single H1 present", recommendation: "" });

  if (!hasSubheadings && wordCount > 200) {
    items.push({ category: "warning", label: "No subheadings", recommendation: "Break content into sections with H2/H3 headings for readability." });
  }

  // Images
  const imgs = page.content.match(/<img[^>]*>/gi) || [];
  if (imgs.length === 0 && wordCount > 150) {
    items.push({ category: "info", label: "No images", recommendation: "Add relevant images to improve engagement and visual appeal." });
  } else if (imgs.length > 0) {
    const missingAlt = imgs.filter((tag) => !/alt="[^"]+"/i.test(tag)).length;
    if (missingAlt > 0) items.push({ category: "warning", label: `${missingAlt} image(s) missing alt text`, recommendation: "Add descriptive alt text to all images for accessibility and SEO." });
    else items.push({ category: "passed", label: "All images have alt text", recommendation: "" });
  }

  // Internal links
  const links = page.content.match(/<a[^>]*href/gi) || [];
  if (links.length === 0) {
    items.push({ category: "info", label: "No links", recommendation: "Add internal and external links to improve navigation and authority." });
  } else {
    items.push({ category: "passed", label: `${links.length} link(s) found`, recommendation: "" });
  }

  // URL slug
  const slug = (page.slug || "").replace(/^\/+|\/+$/g, "");
  if (slug.length < 3) items.push({ category: "warning", label: "Short URL slug", recommendation: "Use a descriptive, keyword-rich URL slug." });
  else if (/[A-Z]/.test(slug)) items.push({ category: "info", label: "Uppercase in URL", recommendation: "Use lowercase URLs for consistency." });
  else items.push({ category: "passed", label: "URL slug OK", recommendation: "" });

  // Calculate score
  const weights = { critical: 20, warning: 10, info: 3, passed: 0 };
  const maxPenalty = items.length * 15;
  const penalty = items.reduce((sum, i) => sum + weights[i.category], 0);
  const score = Math.max(0, Math.min(100, Math.round(100 - (penalty / Math.max(maxPenalty, 1)) * 100)));

  return { overallScore: score, items };
}
