// SEO scoring utility

export interface SeoScoreResult {
  score: number; // 0-100
  label: "Poor" | "Fair" | "Good" | "Excellent";
  color: string; // tailwind class
  checks: { label: string; passed: boolean; tip: string }[];
}

export function calculateSeoScore(
  seoTitle: string | null | undefined,
  seoDescription: string | null | undefined,
  seoKeywords: string[] | null | undefined,
  pageTitle?: string
): SeoScoreResult {
  const title = seoTitle || "";
  const desc = seoDescription || "";
  const keywords = seoKeywords || [];

  const checks: SeoScoreResult["checks"] = [];
  let points = 0;
  const maxPoints = 7;

  // 1. Has SEO title
  const hasTitle = title.length > 0;
  checks.push({ label: "SEO title set", passed: hasTitle, tip: "Add a custom SEO title" });
  if (hasTitle) points++;

  // 2. Title length 30-60
  const titleGoodLength = title.length >= 30 && title.length <= 60;
  checks.push({
    label: "Title length (30-60 chars)",
    passed: titleGoodLength,
    tip: title.length < 30 ? "Title is too short" : title.length > 60 ? "Title is too long" : "",
  });
  if (titleGoodLength) points++;

  // 3. Has meta description
  const hasDesc = desc.length > 0;
  checks.push({ label: "Meta description set", passed: hasDesc, tip: "Add a meta description" });
  if (hasDesc) points++;

  // 4. Description length 120-160
  const descGoodLength = desc.length >= 120 && desc.length <= 160;
  checks.push({
    label: "Description length (120-160)",
    passed: descGoodLength,
    tip: desc.length < 120 ? "Description is too short" : desc.length > 160 ? "Description is too long" : "",
  });
  if (descGoodLength) points++;

  // 5. Has keywords
  const hasKeywords = keywords.length > 0;
  checks.push({ label: "Keywords defined", passed: hasKeywords, tip: "Add SEO keywords" });
  if (hasKeywords) points++;

  // 6. 3+ keywords
  const enoughKeywords = keywords.length >= 3;
  checks.push({ label: "3+ keywords", passed: enoughKeywords, tip: "Add at least 3 keywords" });
  if (enoughKeywords) points++;

  // 7. Title differs from page title
  const titleUnique = hasTitle && pageTitle ? title.toLowerCase() !== pageTitle.toLowerCase() : hasTitle;
  checks.push({ label: "Unique SEO title", passed: titleUnique, tip: "SEO title should differ from page title" });
  if (titleUnique) points++;

  const score = Math.round((points / maxPoints) * 100);

  let label: SeoScoreResult["label"];
  let color: string;
  if (score >= 85) { label = "Excellent"; color = "text-emerald-600"; }
  else if (score >= 60) { label = "Good"; color = "text-primary"; }
  else if (score >= 35) { label = "Fair"; color = "text-amber-600"; }
  else { label = "Poor"; color = "text-destructive"; }

  return { score, label, color, checks };
}
