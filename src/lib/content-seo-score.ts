/**
 * Content-based SEO / SEA / GEO scores for editable CMS content.
 *
 * The rules below intentionally prioritize signals that can be improved by
 * rewriting page text while preserving layout and structure.
 */

export interface ContentScoreResult {
  score: number;
  label: "Poor" | "Fair" | "Good" | "Excellent";
  color: string;
  checks: { label: string; passed: boolean; tip: string; weight?: number }[];
}

export type ContentSeoResult = ContentScoreResult;

export interface ContentSeoScoreOptions {
  url?: string;
  description?: string;
  seoTitle?: string;
  seoKeywords?: string[];
  focusKeyword?: string;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function toLabel(score: number): { label: ContentScoreResult["label"]; color: string } {
  if (score >= 85) return { label: "Excellent", color: "text-emerald-600" };
  if (score >= 60) return { label: "Good", color: "text-primary" };
  if (score >= 35) return { label: "Fair", color: "text-amber-600" };
  return { label: "Poor", color: "text-destructive" };
}

function buildScoreResult(points: number, checks: ContentScoreResult["checks"]): ContentScoreResult {
  const totalWeight = Math.max(1, checks.reduce((sum, check) => sum + (check.weight ?? 1), 0));
  const earnedPoints = Math.max(0, Math.min(totalWeight, points));
  const score = clampScore((earnedPoints / totalWeight) * 100);

  return { score, ...toLabel(score), checks };
}

function resolveSeoScoreOptions(
  urlOrOptions?: string | ContentSeoScoreOptions,
  description = ""
): ContentSeoScoreOptions {
  if (typeof urlOrOptions === "string" || typeof urlOrOptions === "undefined") {
    return { url: urlOrOptions, description };
  }

  return {
    ...urlOrOptions,
    description: urlOrOptions.description ?? description,
  };
}

function getLeadingText(value: string, wordCount: number): string {
  const words = value.split(/\s+/).filter(Boolean);
  const windowSize = Math.min(100, Math.max(40, Math.floor(wordCount * 0.12)));
  return words.slice(0, windowSize).join(" ");
}

/** Strip HTML to plain text while keeping rough paragraph boundaries */
function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|li|ul|ol|blockquote|h[1-6])>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ *\n */g, "\n")
    .trim();
}

function normalizeWords(value: string): string[] {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/[-_/]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function normalizePhrase(value: string): string {
  return normalizeWords(value).join(" ");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsPhrase(text: string, phrase: string): boolean {
  const normalizedText = normalizePhrase(text);
  const normalizedPhrase = normalizePhrase(phrase);

  if (!normalizedText || !normalizedPhrase) return false;

  const pattern = new RegExp(`(?:^|\\s)${escapeRegExp(normalizedPhrase).replace(/\s+/g, "\\s+")}(?:$|\\s)`, "i");
  return pattern.test(normalizedText);
}

function countPhraseOccurrences(text: string, phrase: string): number {
  const normalizedText = normalizePhrase(text);
  const normalizedPhrase = normalizePhrase(phrase);

  if (!normalizedText || !normalizedPhrase) return 0;

  const pattern = new RegExp(`(?:^|\\s)${escapeRegExp(normalizedPhrase).replace(/\s+/g, "\\s+")}(?=$|\\s)`, "gi");
  return normalizedText.match(pattern)?.length ?? 0;
}

function extractParagraphs(html: string): string[] {
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|li|blockquote)>/gi, "$&\n\n");

  return withBreaks
    .split(/\n{2,}/)
    .map((chunk) => stripHtml(chunk))
    .filter(Boolean);
}

function extractHeadings(html: string): string[] {
  return Array.from(html.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi)).map(([, , text]) => stripHtml(text));
}

const STOP_WORDS = new Set([
  "the", "a", "an", "in", "on", "at", "to", "for", "of", "and", "or", "is", "are", "was", "were", "be", "been", "being",
  "with", "by", "from", "as", "this", "that", "it", "its", "your", "our", "their", "you",
]);

const GENERIC_MARKETING_WORDS = new Set([
  "best", "top", "today", "now", "pro", "premium", "quality", "official", "new", "easy", "fast",
  "buy", "shop", "order", "get", "discover", "near", "nearby", "local",
]);

function trimCandidateEdges(words: string[]): string[] {
  const candidate = [...words];

  while (candidate.length > 0 && (STOP_WORDS.has(candidate[0]) || GENERIC_MARKETING_WORDS.has(candidate[0]))) {
    candidate.shift();
  }

  while (candidate.length > 0 && (STOP_WORDS.has(candidate[candidate.length - 1]) || GENERIC_MARKETING_WORDS.has(candidate[candidate.length - 1]))) {
    candidate.pop();
  }

  return candidate;
}

function scoreFocusKeywordCandidate(
  phrase: string,
  normalizedTitle: string,
  normalizedContent: string,
  normalizedDescription: string,
  normalizedHeadings: string,
  normalizedSlug: string
): number {
  const words = phrase.split(" ").filter(Boolean);
  const meaningfulWordCount = words.filter((word) => !STOP_WORDS.has(word) && !GENERIC_MARKETING_WORDS.has(word)).length;

  let score = meaningfulWordCount * 3;
  if (words.length >= 3) score += 2;
  if (containsPhrase(normalizedContent, phrase)) score += 8;
  if (containsPhrase(normalizedDescription, phrase)) score += 5;
  if (containsPhrase(normalizedHeadings, phrase)) score += 4;
  if (containsPhrase(normalizedTitle, phrase)) score += 3;
  if (containsPhrase(normalizedSlug, phrase)) score += 2;
  if (words.some((word) => GENERIC_MARKETING_WORDS.has(word))) score -= 2;

  return score;
}

function extractFocusKeyword(title: string, slug = "", content = "", description = "", url?: string): string {
  const normalizedTitle = normalizePhrase(title);
  const normalizedContent = normalizePhrase(content);
  const normalizedDescription = normalizePhrase(description);
  const normalizedHeadings = normalizePhrase(extractHeadings(content).join(" "));
  const normalizedSlug = normalizePhrase(getSlugCandidate(slug, url));
  const sources = [normalizedTitle, normalizedSlug].filter(Boolean);
  const candidateScores = new Map<string, number>();

  for (const source of sources) {
    const words = source.split(" ").filter(Boolean);

    for (let size = Math.min(4, words.length); size >= 2; size -= 1) {
      for (let start = 0; start <= words.length - size; start += 1) {
        const trimmed = trimCandidateEdges(words.slice(start, start + size));
        const phrase = trimmed.join(" ");

        if (!phrase) continue;

        const meaningfulWordCount = trimmed.filter((word) => !STOP_WORDS.has(word) && !GENERIC_MARKETING_WORDS.has(word)).length;
        if (meaningfulWordCount < 2) continue;

        const score = scoreFocusKeywordCandidate(
          phrase,
          normalizedTitle,
          normalizedContent,
          normalizedDescription,
          normalizedHeadings,
          normalizedSlug
        );

        const previousScore = candidateScores.get(phrase) ?? Number.NEGATIVE_INFINITY;
        if (score > previousScore) {
          candidateScores.set(phrase, score);
        }
      }
    }
  }

  const bestCandidate = [...candidateScores.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].split(" ").length - a[0].split(" ").length)
    .at(0)?.[0];

  if (bestCandidate) return bestCandidate;

  const fallbackWords = normalizeWords(title)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word) && !GENERIC_MARKETING_WORDS.has(word));

  return fallbackWords.slice(0, 3).join(" ");
}

function countMatches(text: string, regex: RegExp): number {
  return text.match(regex)?.length ?? 0;
}

function getSlugCandidate(slug: string, url?: string): string {
  if (url) {
    try {
      const parsed = new URL(url);
      return parsed.pathname || slug;
    } catch {
      return slug;
    }
  }

  return slug;
}

// ─── SEO Score (aligned with Yoast / RankMath) ──────────────

export function calculateContentSeoScore(
  title: string,
  content: string,
  slug: string,
  urlOrOptions?: string | ContentSeoScoreOptions,
  description = ""
): ContentScoreResult {
  const options = resolveSeoScoreOptions(urlOrOptions, description);
  const seoTitle = options.seoTitle?.trim() || title;
  const plainText = stripHtml(content);
  const lowerText = plainText.toLowerCase();
  const metaDescription = stripHtml(options.description || "");
  const lowerDescription = metaDescription.toLowerCase();
  const focusKw = options.focusKeyword?.trim()
    || options.seoKeywords?.find((keyword) => normalizePhrase(keyword).length > 0)?.trim()
    || extractFocusKeyword(seoTitle, slug, content, metaDescription, options.url);
  const paragraphs = extractParagraphs(content);
  const headings = extractHeadings(content);
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
  const introText = getLeadingText(plainText, wordCount).toLowerCase();
  const slugCandidate = getSlugCandidate(slug, options.url);
  const checks: ContentScoreResult["checks"] = [];
  let points = 0;
  const transitionWords = /(however|therefore|additionally|moreover|furthermore|also|because|for example|in addition|as a result|first|next|finally|meanwhile|instead)/gi;
  const passiveVoiceMatches = countMatches(lowerText, /\b(am|is|are|was|were|be|been|being)\s+\w+(ed|en)\b/gi);
  const sentenceCount = Math.max(1, plainText.split(/[.!?]+/).filter((sentence) => sentence.trim().length > 0).length);

  const hasTitle = seoTitle.trim().length > 0;
  checks.push({ label: "Page has title", passed: hasTitle, tip: "Add an SEO title" });
  if (hasTitle) points++;

  const titleLen = seoTitle.length;
  const titleOk = titleLen >= 30 && titleLen <= 60;
  checks.push({ label: "Title 30-60 chars", passed: titleOk, tip: titleLen < 30 ? "Title too short — aim for 30-60 chars" : titleLen > 60 ? "Title too long — keep under 60 chars" : "" });
  if (titleOk) points++;

  const kwInTitle = focusKw ? containsPhrase(seoTitle, focusKw) : hasTitle;
  checks.push({ label: "Focus keyword in title", passed: kwInTitle, tip: "Include your main keyword in the page title" });
  if (kwInTitle) points++;

  const metaDescriptionLength = metaDescription.length;
  const metaDescriptionOk = metaDescriptionLength >= 120 && metaDescriptionLength <= 160;
  checks.push({
    label: "Meta description 120-160 chars",
    passed: metaDescriptionOk,
    tip: metaDescriptionLength === 0
      ? "Add a meta description to improve search visibility"
      : metaDescriptionLength < 120
        ? "Meta description too short — aim for 120-160 chars"
        : "Meta description too long — keep it under 160 chars",
  });
  if (metaDescriptionOk) points++;

  const kwInDescription = focusKw ? containsPhrase(lowerDescription, focusKw) : false;
  checks.push({ label: "Keyword in meta description", passed: kwInDescription, tip: "Mention your focus keyword in the meta description" });
  if (kwInDescription) points++;

  const enoughWords = wordCount >= 600;
  checks.push({ label: "600+ words of content", passed: enoughWords, tip: `Only ${wordCount} words — add more content for SEO` });
  if (enoughWords) points++;

  const kwInIntro = focusKw ? containsPhrase(introText, focusKw) : false;
  checks.push({ label: "Keyword in introduction", passed: kwInIntro, tip: "Mention your focus keyword in the opening lines of the content" });
  if (kwInIntro) points++;

  const kwInUrl = focusKw ? containsPhrase(slugCandidate, focusKw) : false;
  checks.push({ label: "Keyword in URL", passed: kwInUrl, tip: "Use the focus keyword in the URL slug" });
  if (kwInUrl) points++;

  let kwDensityOk = false;
  if (focusKw && wordCount > 0) {
    const density = (countPhraseOccurrences(lowerText, focusKw) / wordCount) * 100;
    kwDensityOk = density >= 0.5 && density <= 2.5;
    checks.push({ label: "Keyword density 0.5-2.5%", passed: kwDensityOk, tip: density < 0.5 ? "Use your focus keyword more often" : "Keyword appears too many times — reduce keyword stuffing" });
  } else {
    checks.push({ label: "Keyword density 0.5-2.5%", passed: false, tip: "Add focus keyword throughout content" });
  }
  if (kwDensityOk) points++;

  const hasH1 = /<h1[^>]*>/i.test(content);
  checks.push({ label: "Has H1 heading", passed: hasH1, tip: "Add exactly one H1 heading" });
  if (hasH1) points++;

  const h2h3Count = (content.match(/<h[23][^>]*>/gi) || []).length;
  const hasSubheadings = h2h3Count >= 1;
  checks.push({ label: "Has H2/H3 subheadings", passed: hasSubheadings, tip: "Add subheadings to structure your content" });
  if (hasSubheadings) points++;

  const kwInSubheading = focusKw ? headings.some((heading) => containsPhrase(heading, focusKw)) : false;
  checks.push({ label: "Keyword in subheading", passed: kwInSubheading, tip: "Include focus keyword in at least one H2/H3" });
  if (kwInSubheading) points++;

  // Image alt text with keyword (Rank Math / Yoast check)
  const imgAltMatches = Array.from(content.matchAll(/<img[^>]*alt=["']([^"']*)["'][^>]*>/gi));
  const hasImages = imgAltMatches.length > 0 || /<img[^>]*>/i.test(content);
  const hasImgAltWithKw = focusKw
    ? imgAltMatches.some(([, alt]) => containsPhrase(alt, focusKw))
    : false;
  checks.push({ label: "Image alt text with keyword", passed: hasImgAltWithKw, tip: hasImages ? "Add focus keyword to at least one image alt text" : "Add images with descriptive alt text containing your keyword" });
  if (hasImgAltWithKw) points++;

  // Internal links check
  const allLinks = Array.from(content.matchAll(/<a[^>]*href=["']([^"']*)["'][^>]*>/gi));
  const internalLinks = allLinks.filter(([, href]) => {
    if (!href) return false;
    return href.startsWith("/") || href.startsWith("#") || href.startsWith("./");
  });
  const hasInternalLinks = internalLinks.length >= 1;
  checks.push({ label: "Has internal links", passed: hasInternalLinks, tip: "Add at least one internal link to related content" });
  if (hasInternalLinks) points++;

  // Outbound/external links check
  const externalLinks = allLinks.filter(([, href]) => {
    if (!href) return false;
    return href.startsWith("http://") || href.startsWith("https://");
  });
  const hasExternalLinks = externalLinks.length >= 1;
  checks.push({ label: "Has outbound links", passed: hasExternalLinks, tip: "Add at least one outbound link to a relevant authoritative source" });
  if (hasExternalLinks) points++;

  const longParas = paragraphs.filter((paragraph) => paragraph.split(/\s+/).length > 150).length;
  const readableParas = longParas === 0;
  checks.push({ label: "Short readable paragraphs", passed: readableParas, tip: "Break long paragraphs into smaller ones (< 150 words each)" });
  if (readableParas) points++;

  const enoughTransitions = countMatches(lowerText, transitionWords) >= 2;
  checks.push({ label: "Uses transition words", passed: enoughTransitions, tip: "Add natural transition words like however, additionally, therefore" });
  if (enoughTransitions) points++;

  const activeVoiceOk = passiveVoiceMatches <= Math.max(1, Math.floor(sentenceCount * 0.2));
  checks.push({ label: "Mostly active voice", passed: activeVoiceOk, tip: "Prefer direct, active sentences over passive phrasing" });
  if (activeVoiceOk) points++;

  // Schema markup / JSON-LD check
  const hasSchema = /application\/ld\+json/i.test(content) || /itemscope/i.test(content) || /itemprop/i.test(content);
  checks.push({ label: "Has structured data", passed: hasSchema, tip: "Add JSON-LD schema markup for better search appearance" });
  if (hasSchema) points++;

  return buildScoreResult(points, checks);
}

// ─── SEA Score (Paid Landing Page Quality) ───────────────────

export function calculateContentSeaScore(
  title: string,
  content: string,
  slug: string,
  url?: string
): ContentScoreResult {
  const plainText = stripHtml(content);
  const lowerText = plainText.toLowerCase();
  const headings = extractHeadings(content);
  const paragraphs = extractParagraphs(content);
  const introText = (paragraphs[0] || plainText.slice(0, 300)).toLowerCase();
  const checks: ContentScoreResult["checks"] = [];
  let points = 0;
  const ctaWords = /(buy|get|shop|order|start|book|reserve|request|contact|call|discover|learn more|try|schedule|checkout|add to cart|message us|quote|subscribe|sign up)/i;
  const benefitWords = /(save|fast|easy|simple|reliable|premium|quality|effective|powerful|best|trusted|durable|affordable|results?|boost|improve|grow|increase|protect|comfort|support)/i;
  const trustWords = /(testimonial|review|trusted|guarantee|warranty|secure|certified|proven|since\s+\d{4}|rated|award|recommended|satisfaction|verified)/i;
  const offerWords = /(free|discount|offer|deal|plan|package|price|pricing|quote|estimate|starting at|from only|trial|bundle|save)/i;
  const intentWords = /(call|contact|message|book|reserve|request|checkout|order|buy|subscribe|sign up|speak to)/i;

  const hasCta = ctaWords.test(lowerText) || /<button/i.test(content) || /<a[^>]*>([\s\S]*?)<\/a>/i.test(content);
  checks.push({ label: "Has CTA language", passed: hasCta, tip: "Use clear action phrases like book, buy, request, contact" });
  if (hasCta) points++;

  const hasActionTitle = ctaWords.test(title || "") || offerWords.test(title || "");
  checks.push({ label: "Action words in title", passed: hasActionTitle, tip: "Use action-oriented words in title (buy, get, free...)" });
  if (hasActionTitle) points++;

  const hasBenefitIntro = benefitWords.test(introText);
  checks.push({ label: "Benefit-led introduction", passed: hasBenefitIntro, tip: "Open with value, benefits, or outcome-driven copy" });
  if (hasBenefitIntro) points++;

  const hasTrust = trustWords.test(lowerText);
  checks.push({ label: "Trust signals present", passed: hasTrust, tip: "Add testimonials, reviews, or trust badges" });
  if (hasTrust) points++;

  const hasOfferLanguage = offerWords.test(lowerText) || benefitWords.test(lowerText);
  checks.push({ label: "Offer or value language", passed: hasOfferLanguage, tip: "Mention value, pricing, offer, savings, or outcome" });
  if (hasOfferLanguage) points++;

  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
  const focused = wordCount >= 100 && wordCount <= 1500;
  checks.push({ label: "Focused content (100-1500 words)", passed: focused, tip: wordCount < 100 ? "Content is too thin" : "Landing page is too long — keep it focused" });
  if (focused) points++;

  const scannable = headings.length >= 2 || /<(ul|ol|table)\b/i.test(content);
  checks.push({ label: "Scannable structure", passed: scannable, tip: "Use multiple headings, lists, or tables to make the page easy to scan" });
  if (scannable) points++;

  const hasNextStep = intentWords.test(lowerText);
  checks.push({ label: "Clear next step", passed: hasNextStep, tip: "Tell visitors exactly what to do next" });
  if (hasNextStep) points++;

  const hasUrgencyOrProof = /(today|now|instant|quick|fast|limited|same-day|immediate|\d+\+|\d{1,3}%|top-rated|best-selling)/i.test(lowerText);
  checks.push({ label: "Urgency or proof cues", passed: hasUrgencyOrProof, tip: "Add urgency, social proof, or measurable claims when true" });
  if (hasUrgencyOrProof) points++;

  // Additional SEA quality checks (so total = 10)
  const hasClickableCta = /<a[^>]*href=[^>]*>([\s\S]*?)<\/a>/i.test(content) || /<button[^>]*>/i.test(content);
  checks.push({ label: "Clickable CTA element", passed: hasClickableCta, tip: "Add at least one clickable button or link as a CTA" });
  if (hasClickableCta) points++;

  return buildScoreResult(points, checks);
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
  const headings = extractHeadings(content);
  const paragraphs = extractParagraphs(content);
  const introText = (paragraphs[0] || plainText.slice(0, 300)).toLowerCase();
  const slugSource = getSlugCandidate(slug, url).replace(/^\/+|\/+$/g, "").toLowerCase();
  const checks: ContentScoreResult["checks"] = [];
  let points = 0;
  const geoWords = /(local|nearby|near you|near me|in your area|serving|service area|coverage area|delivery area|regional|community|neighborhood|area|district|county|region|town|city)/i;
  const serviceAreaWords = /(serving|available in|delivery in|coverage across|service area|throughout|across the area|nearby|near you|local service|regional support)/i;
  const communityWords = /(community|neighborhood|locals|local experts|nearby|around you|close by|in the area)/i;
  const availabilityWords = /(open|available|today|same-day|response time|hours|coverage|dispatch|delivery window|visit|call us|contact us)/i;
  const credibilityWords = /(trusted locally|local team|regional team|community trusted|serving customers|area specialists|nearby support)/i;

  const hasGeoTitle = geoWords.test((title || "").toLowerCase()) || geoWords.test(introText);
  checks.push({ label: "Local cue in title or intro", passed: hasGeoTitle, tip: "Use phrases like local, nearby, in your area, or serving the area" });
  if (hasGeoTitle) points++;

  const hasServiceArea = serviceAreaWords.test(lowerText);
  checks.push({ label: "Service area language", passed: hasServiceArea, tip: "Mention coverage, service area, delivery area, or nearby availability" });
  if (hasServiceArea) points++;

  const hasGeoHeading = headings.some((heading) => geoWords.test(heading.toLowerCase()));
  checks.push({ label: "Localized heading present", passed: hasGeoHeading, tip: "Add at least one heading with local or area-specific intent" });
  if (hasGeoHeading) points++;

  const hasCommunityLanguage = communityWords.test(lowerText);
  checks.push({ label: "Community / proximity language", passed: hasCommunityLanguage, tip: "Use phrases like nearby, neighborhood, local team, or community" });
  if (hasCommunityLanguage) points++;

  const hasAvailability = availabilityWords.test(lowerText);
  checks.push({ label: "Availability / coverage cue", passed: hasAvailability, tip: "Mention availability, service hours, response time, or area coverage" });
  if (hasAvailability) points++;

  const geoSlug = slugSource.length > 3 && !/^\d+$/.test(slugSource) && /^[a-z0-9-\/]+$/i.test(slugSource);
  checks.push({ label: "Clean descriptive URL", passed: geoSlug, tip: "Use a readable URL slug with words instead of IDs" });
  if (geoSlug) points++;

  const hasLocalCredibility = credibilityWords.test(lowerText) || /(area specialists|local support|serving customers near you)/i.test(lowerText);
  checks.push({ label: "Local credibility wording", passed: hasLocalCredibility, tip: "Add truthful local credibility phrases like local team or area specialists" });
  if (hasLocalCredibility) points++;

  return buildScoreResult(points, checks);
}
