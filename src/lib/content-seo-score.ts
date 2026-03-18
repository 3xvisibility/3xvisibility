/**
 * Lightweight content-based SEO score for pages fetched from external CMS
 * (where we only have title, content, slug — no explicit SEO metadata).
 */

export interface ContentSeoResult {
  score: number;
  label: "Poor" | "Fair" | "Good" | "Excellent";
  color: string;
  checks: { label: string; passed: boolean; tip: string }[];
}

export function calculateContentSeoScore(
  title: string,
  content: string,
  slug: string,
  url?: string
): ContentSeoResult {
  const plainText = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const checks: ContentSeoResult["checks"] = [];
  let points = 0;
  const maxPoints = 8;

  // 1. Has a title
  const hasTitle = (title || "").trim().length > 0;
  checks.push({ label: "Page has title", passed: hasTitle, tip: "Add a page title" });
  if (hasTitle) points++;

  // 2. Title length 20-70
  const titleLen = (title || "").length;
  const titleOk = titleLen >= 20 && titleLen <= 70;
  checks.push({
    label: "Title length (20-70 chars)",
    passed: titleOk,
    tip: titleLen < 20 ? "Title is too short" : titleLen > 70 ? "Title is too long" : "",
  });
  if (titleOk) points++;

  // 3. Has meaningful content (>100 chars)
  const hasContent = plainText.length > 100;
  checks.push({ label: "Content > 100 chars", passed: hasContent, tip: "Add more content" });
  if (hasContent) points++;

  // 4. Has headings
  const hasHeadings = /<h[1-6][^>]*>/i.test(content);
  checks.push({ label: "Has headings (H1-H6)", passed: hasHeadings, tip: "Add heading tags" });
  if (hasHeadings) points++;

  // 5. Has images with alt text
  const imgMatch = content.match(/<img[^>]*>/gi) || [];
  const hasImages = imgMatch.length > 0;
  const hasAlt = imgMatch.some((tag) => /alt="[^"]+"/i.test(tag));
  checks.push({ label: "Images with alt text", passed: hasImages && hasAlt, tip: "Add images with alt attributes" });
  if (hasImages && hasAlt) points++;

  // 6. Has internal links
  const hasLinks = /<a[^>]*href/i.test(content);
  checks.push({ label: "Contains links", passed: hasLinks, tip: "Add internal/external links" });
  if (hasLinks) points++;

  // 7. Slug is descriptive (not just numbers/ids)
  const slugClean = (slug || "").replace(/^\/+|\/+$/g, "");
  const slugOk = slugClean.length > 3 && !/^\d+$/.test(slugClean);
  checks.push({ label: "Descriptive URL slug", passed: slugOk, tip: "Use keyword-rich URL slugs" });
  if (slugOk) points++;

  // 8. Content word count > 300
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
  const enoughWords = wordCount >= 300;
  checks.push({ label: "300+ words of content", passed: enoughWords, tip: `Only ${wordCount} words found` });
  if (enoughWords) points++;

  const score = Math.round((points / maxPoints) * 100);

  let label: ContentSeoResult["label"];
  let color: string;
  if (score >= 85) { label = "Excellent"; color = "text-emerald-600"; }
  else if (score >= 60) { label = "Good"; color = "text-primary"; }
  else if (score >= 35) { label = "Fair"; color = "text-amber-600"; }
  else { label = "Poor"; color = "text-destructive"; }

  return { score, label, color, checks };
}
