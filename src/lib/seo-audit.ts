/**
 * Comprehensive SEO audit that produces actionable recommendations per page.
 * Labels/recommendations are returned as i18n keys (+ vars) so the UI can translate them.
 */

export interface AuditItem {
  category: "critical" | "warning" | "info" | "passed";
  labelKey: string;
  recKey?: string;
  vars?: Record<string, string | number>;
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
    items.push({ category: "critical", labelKey: "audit.missingTitle", recKey: "audit.missingTitleRec" });
  } else {
    if (title.length < 20) items.push({ category: "warning", labelKey: "audit.titleShort", recKey: "audit.titleShortRec", vars: { len: title.length } });
    else if (title.length > 70) items.push({ category: "warning", labelKey: "audit.titleLong", recKey: "audit.titleLongRec", vars: { len: title.length } });
    else items.push({ category: "passed", labelKey: "audit.titleOk" });
  }

  // Meta description
  const desc = page.seo_description || "";
  if (!desc) {
    items.push({ category: "warning", labelKey: "audit.missingMeta", recKey: "audit.missingMetaRec" });
  } else {
    if (desc.length < 70) items.push({ category: "info", labelKey: "audit.shortMeta", recKey: "audit.shortMetaRec" });
    else if (desc.length > 170) items.push({ category: "info", labelKey: "audit.longMeta", recKey: "audit.longMetaRec" });
    else items.push({ category: "passed", labelKey: "audit.metaOk" });
  }

  // Keywords
  if (!page.seo_keywords?.length) {
    items.push({ category: "info", labelKey: "audit.noKeywords", recKey: "audit.noKeywordsRec" });
  } else {
    const kwInTitle = page.seo_keywords.some((k) => title.toLowerCase().includes(k.toLowerCase()));
    if (!kwInTitle) items.push({ category: "warning", labelKey: "audit.keywordMissingTitle", recKey: "audit.keywordMissingTitleRec" });
    else items.push({ category: "passed", labelKey: "audit.keywordInTitle" });
  }

  // Content length
  if (wordCount < 100) items.push({ category: "critical", labelKey: "audit.thinContent", recKey: "audit.thinContentRec", vars: { words: wordCount } });
  else if (wordCount < 300) items.push({ category: "warning", labelKey: "audit.shortContent", recKey: "audit.shortContentRec", vars: { words: wordCount } });
  else items.push({ category: "passed", labelKey: "audit.contentOk", vars: { words: wordCount } });

  // Headings
  const h1Count = (page.content.match(/<h1[^>]*>/gi) || []).length;
  const hasSubheadings = /<h[2-6][^>]*>/i.test(page.content);
  if (h1Count === 0) items.push({ category: "warning", labelKey: "audit.noH1", recKey: "audit.noH1Rec" });
  else if (h1Count > 1) items.push({ category: "info", labelKey: "audit.multipleH1", recKey: "audit.multipleH1Rec", vars: { count: h1Count } });
  else items.push({ category: "passed", labelKey: "audit.singleH1" });

  if (!hasSubheadings && wordCount > 200) {
    items.push({ category: "warning", labelKey: "audit.noSubheadings", recKey: "audit.noSubheadingsRec" });
  }

  // Images
  const imgs = page.content.match(/<img[^>]*>/gi) || [];
  if (imgs.length === 0 && wordCount > 150) {
    items.push({ category: "info", labelKey: "audit.noImages", recKey: "audit.noImagesRec" });
  } else if (imgs.length > 0) {
    const missingAlt = imgs.filter((tag) => !/alt="[^"]+"/i.test(tag)).length;
    if (missingAlt > 0) items.push({ category: "warning", labelKey: "audit.missingAlt", recKey: "audit.missingAltRec", vars: { count: missingAlt } });
    else items.push({ category: "passed", labelKey: "audit.allAlt" });
  }

  // Internal links
  const links = page.content.match(/<a[^>]*href/gi) || [];
  if (links.length === 0) {
    items.push({ category: "info", labelKey: "audit.noLinks", recKey: "audit.noLinksRec" });
  } else {
    items.push({ category: "passed", labelKey: "audit.linksFound", vars: { count: links.length } });
  }

  // URL slug
  const slug = (page.slug || "").replace(/^\/+|\/+$/g, "");
  if (slug.length < 3) items.push({ category: "warning", labelKey: "audit.shortSlug", recKey: "audit.shortSlugRec" });
  else if (/[A-Z]/.test(slug)) items.push({ category: "info", labelKey: "audit.uppercaseUrl", recKey: "audit.uppercaseUrlRec" });
  else items.push({ category: "passed", labelKey: "audit.slugOk" });

  // Calculate score
  const weights = { critical: 20, warning: 10, info: 3, passed: 0 };
  const maxPenalty = items.length * 15;
  const penalty = items.reduce((sum, i) => sum + weights[i.category], 0);
  const score = Math.max(0, Math.min(100, Math.round(100 - (penalty / Math.max(maxPenalty, 1)) * 100)));

  return { overallScore: score, items };
}
