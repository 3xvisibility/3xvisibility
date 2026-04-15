export type QualityCategory = "seo" | "sea" | "geo";

export interface SeoQualityInput {
  title?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string[] | null;
  slug?: string | null;
  url?: string | null;
  content?: string | null;
}

export interface QualityCheck {
  id: string;
  category: QualityCategory;
  label: string;
  passed: boolean;
  tip: string;
  critical?: boolean;
}

export interface SeoQualityReport {
  primaryKeyword: string;
  seoScore: number;
  seaScore: number;
  geoScore: number;
  checks: QualityCheck[];
}

const STOP_WORDS = new Set([
  "the", "a", "an", "in", "on", "at", "to", "for", "of", "and", "or", "is", "are", "was", "were", "be", "been", "being",
  "with", "by", "from", "as", "this", "that", "it", "its", "your", "our", "their", "you",
]);

const GENERIC_MARKETING_WORDS = new Set([
  "best", "top", "today", "now", "pro", "premium", "quality", "official", "new", "easy", "fast",
  "buy", "shop", "order", "get", "discover", "near", "nearby", "local",
]);

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreCategory(checks: QualityCheck[], category: QualityCategory) {
  const scoped = checks.filter((check) => check.category === category);
  if (scoped.length === 0) return 0;
  const passed = scoped.filter((check) => check.passed).length;
  return clampScore((passed / scoped.length) * 100);
}

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

export function normalizePhrase(value: string): string {
  return normalizeWords(value).join(" ");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function containsPhrase(text: string, phrase: string): boolean {
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

function countMatches(text: string, regex: RegExp): number {
  return text.match(regex)?.length ?? 0;
}

function getSlugCandidate(slug?: string | null, url?: string | null): string {
  if (url) {
    try {
      const parsed = new URL(url);
      return parsed.pathname || slug || "";
    } catch {
      return slug || "";
    }
  }

  return slug || "";
}

function getLeadingText(value: string, wordCount: number): string {
  const words = value.split(/\s+/).filter(Boolean);
  const windowSize = Math.min(120, Math.max(50, Math.floor(wordCount * 0.14)));
  return words.slice(0, windowSize).join(" ");
}

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
  normalizedSlug: string,
) {
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

export function normalizeKeywordArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    const keywords = value.flatMap((entry) => normalizeKeywordArray(entry));
    return keywords.length > 0 ? [...new Set(keywords)] : [];
  }

  if (typeof value === "string") {
    const keywords = value
      .split(/[\n,|]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);

    return keywords.length > 0 ? [...new Set(keywords)] : [];
  }

  return [];
}

export function ensurePrimaryKeywordFirst(primaryKeyword: string | undefined, keywords: unknown): string[] {
  const combined = [primaryKeyword, ...normalizeKeywordArray(keywords)]
    .map((keyword) => (typeof keyword === "string" ? keyword.trim() : ""))
    .filter(Boolean);

  const seen = new Set<string>();
  const unique: string[] = [];

  for (const keyword of combined) {
    const normalized = normalizePhrase(keyword);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(keyword);
  }

  return unique;
}

export function trimTextAtWordBoundary(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;

  const sliced = normalized.slice(0, maxLength + 1);
  const trimmed = sliced.replace(/\s+\S*$/, "").trim();
  return (trimmed || normalized.slice(0, maxLength)).trim();
}

export function derivePrimaryKeyword(input: SeoQualityInput): string {
  const explicitKeyword = ensurePrimaryKeywordFirst(undefined, input.seoKeywords)[0];
  if (explicitKeyword) return explicitKeyword;

  const normalizedTitle = normalizePhrase(input.seoTitle || input.title || "");
  const normalizedContent = normalizePhrase(input.content || "");
  const normalizedDescription = normalizePhrase(input.seoDescription || "");
  const normalizedHeadings = normalizePhrase(extractHeadings(input.content || "").join(" "));
  const normalizedSlug = normalizePhrase(getSlugCandidate(input.slug, input.url));
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
          normalizedSlug,
        );

        const previous = candidateScores.get(phrase) ?? Number.NEGATIVE_INFINITY;
        if (score > previous) {
          candidateScores.set(phrase, score);
        }
      }
    }
  }

  const sortedCandidates = [...candidateScores.entries()].sort(
    (a, b) => b[1] - a[1] || b[0].split(" ").length - a[0].split(" ").length,
  );

  if (sortedCandidates[0]?.[0]) return sortedCandidates[0][0];

  const fallbackWords = normalizeWords(input.seoTitle || input.title || "")
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word) && !GENERIC_MARKETING_WORDS.has(word));

  return fallbackWords.slice(0, 3).join(" ");
}

export function analyzeSeoQuality(input: SeoQualityInput): SeoQualityReport {
  const seoTitle = (input.seoTitle || input.title || "").trim();
  const description = stripHtml(input.seoDescription || "");
  const content = input.content || "";
  const plainText = stripHtml(content);
  const lowerText = plainText.toLowerCase();
  const lowerDescription = description.toLowerCase();
  const headings = extractHeadings(content);
  const paragraphs = extractParagraphs(content);
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
  const introText = getLeadingText(plainText, wordCount).toLowerCase();
  const slugCandidate = getSlugCandidate(input.slug, input.url);
  const primaryKeyword = derivePrimaryKeyword(input);
  const normalizedTitle = normalizePhrase(seoTitle);
  const normalizedKeyword = normalizePhrase(primaryKeyword);
  const titleKeywordPosition = normalizedKeyword ? normalizedTitle.indexOf(normalizedKeyword) : -1;
  const passiveVoiceMatches = countMatches(lowerText, /\b(am|is|are|was|were|be|been|being)\s+\w+(ed|en)\b/gi);
  const sentenceCount = Math.max(1, plainText.split(/[.!?]+/).filter((sentence) => sentence.trim().length > 0).length);
  const transitionWords = /(however|therefore|additionally|moreover|furthermore|also|because|for example|in addition|as a result|first|next|finally|meanwhile|instead)/gi;
  const ctaWords = /(buy|get|shop|order|start|book|reserve|request|contact|call|discover|learn more|try|schedule|checkout|add to cart|message us|quote|subscribe|sign up)/i;
  const benefitWords = /(save|fast|easy|simple|reliable|premium|quality|effective|powerful|best|trusted|durable|affordable|results?|boost|improve|grow|increase|protect|comfort|support)/i;
  const trustWords = /(testimonial|review|trusted|guarantee|warranty|secure|certified|proven|since\s+\d{4}|rated|award|recommended|satisfaction|verified)/i;
  const offerWords = /(free|discount|offer|deal|plan|package|price|pricing|quote|estimate|starting at|from only|trial|bundle|save)/i;
  const intentWords = /(call|contact|message|book|reserve|request|checkout|order|buy|subscribe|sign up|speak to)/i;
  const geoWords = /(local|nearby|near you|near me|in your area|serving|service area|coverage area|delivery area|regional|community|neighborhood|area|district|county|region|town|city)/i;
  const serviceAreaWords = /(serving|available in|delivery in|coverage across|service area|throughout|across the area|nearby|near you|local service|regional support)/i;
  const communityWords = /(community|neighborhood|locals|local experts|nearby|around you|close by|in the area)/i;
  const availabilityWords = /(open|available|today|same-day|response time|hours|coverage|dispatch|delivery window|visit|call us|contact us)/i;
  const credibilityWords = /(trusted locally|local team|regional team|community trusted|serving customers|area specialists|nearby support)/i;
  const checks: QualityCheck[] = [];

  const keywordDensity = primaryKeyword && wordCount > 0
    ? (countPhraseOccurrences(lowerText, primaryKeyword) / wordCount) * 100
    : 0;

  checks.push(
    {
      id: "seo_title_length",
      category: "seo",
      label: "SEO title is 30-60 chars",
      passed: seoTitle.length >= 30 && seoTitle.length <= 60,
      tip: "Keep the SEO title between 30 and 60 characters.",
      critical: true,
    },
    {
      id: "seo_keyword_title",
      category: "seo",
      label: "Primary keyword appears in title",
      passed: primaryKeyword ? containsPhrase(seoTitle, primaryKeyword) : false,
      tip: `Put the exact focus keyword "${primaryKeyword}" in the SEO title.`,
      critical: true,
    },
    {
      id: "seo_keyword_title_early",
      category: "seo",
      label: "Primary keyword is near the start of title",
      passed: titleKeywordPosition >= 0 && titleKeywordPosition <= 18,
      tip: "Move the exact focus keyword closer to the beginning of the SEO title.",
      critical: true,
    },
    {
      id: "seo_description_length",
      category: "seo",
      label: "Meta description is 120-156 chars",
      passed: description.length >= 120 && description.length <= 156,
      tip: "Keep the meta description between 120 and 156 characters.",
      critical: true,
    },
    {
      id: "seo_keyword_description",
      category: "seo",
      label: "Primary keyword appears in meta description",
      passed: primaryKeyword ? containsPhrase(lowerDescription, primaryKeyword) : false,
      tip: `Include the exact focus keyword "${primaryKeyword}" in the meta description.`,
      critical: true,
    },
    {
      id: "seo_content_length",
      category: "seo",
      label: "Content has 650+ words",
      passed: wordCount >= 650,
      tip: "Expand the body copy to at least 650 words for stronger SEO coverage.",
      critical: true,
    },
    {
      id: "seo_keyword_intro",
      category: "seo",
      label: "Primary keyword appears in introduction",
      passed: primaryKeyword ? containsPhrase(introText, primaryKeyword) : false,
      tip: `Mention the exact focus keyword "${primaryKeyword}" in the opening section.`,
      critical: true,
    },
    {
      id: "seo_keyword_url",
      category: "seo",
      label: "Primary keyword aligns with URL",
      passed: primaryKeyword ? containsPhrase(slugCandidate, primaryKeyword) : false,
      tip: "Keep the URL slug aligned with the focus keyword.",
      critical: true,
    },
    {
      id: "seo_keyword_density",
      category: "seo",
      label: "Keyword density stays in the green zone",
      passed: keywordDensity >= 0.5 && keywordDensity <= 2.5,
      tip: keywordDensity < 0.5
        ? `Use the focus keyword "${primaryKeyword}" more naturally throughout the content.`
        : "Reduce keyword stuffing so the focus keyword appears naturally.",
      critical: true,
    },
    {
      id: "seo_has_h1",
      category: "seo",
      label: "Content contains an H1",
      passed: /<h1[^>]*>/i.test(content),
      tip: "Make sure the page contains one H1 heading.",
      critical: true,
    },
    {
      id: "seo_has_subheadings",
      category: "seo",
      label: "Content uses H2/H3 subheadings",
      passed: (content.match(/<h[23][^>]*>/gi) || []).length >= 1,
      tip: "Add scannable H2/H3 subheadings.",
    },
    {
      id: "seo_keyword_subheading",
      category: "seo",
      label: "Primary keyword appears in a subheading",
      passed: primaryKeyword ? headings.some((heading) => containsPhrase(heading, primaryKeyword)) : false,
      tip: `Use the exact focus keyword "${primaryKeyword}" in at least one H2 or H3.`,
      critical: true,
    },
    {
      id: "seo_readable_paragraphs",
      category: "seo",
      label: "Paragraphs stay readable",
      passed: paragraphs.filter((paragraph) => paragraph.split(/\s+/).length > 130).length === 0,
      tip: "Break long paragraphs into shorter chunks.",
    },
    {
      id: "seo_transition_words",
      category: "seo",
      label: "Uses transition words",
      passed: countMatches(lowerText, transitionWords) >= 2,
      tip: "Add natural transition words like however, additionally, or therefore.",
    },
    {
      id: "seo_active_voice",
      category: "seo",
      label: "Mostly active voice",
      passed: passiveVoiceMatches <= Math.max(1, Math.floor(sentenceCount * 0.2)),
      tip: "Prefer direct active voice over passive constructions.",
    },
    {
      id: "sea_cta_language",
      category: "sea",
      label: "CTA language appears in copy",
      passed: ctaWords.test(lowerText) || /<button/i.test(content) || /<a[^>]*>([\s\S]*?)<\/a>/i.test(content),
      tip: "Use stronger call-to-action wording such as contact, order, book, or buy.",
      critical: true,
    },
    {
      id: "sea_action_title",
      category: "sea",
      label: "Title contains action or offer wording",
      passed: ctaWords.test(seoTitle) || offerWords.test(seoTitle),
      tip: "Add an action or offer cue to the SEO title.",
      critical: true,
    },
    {
      id: "sea_benefit_intro",
      category: "sea",
      label: "Introduction is benefit-led",
      passed: benefitWords.test(introText),
      tip: "Lead the first paragraph with a benefit or outcome.",
      critical: true,
    },
    {
      id: "sea_trust_signals",
      category: "sea",
      label: "Trust signals are present",
      passed: trustWords.test(lowerText),
      tip: "Add truthful trust language like trusted, verified, proven, or guarantee.",
      critical: true,
    },
    {
      id: "sea_offer_language",
      category: "sea",
      label: "Offer or value language appears",
      passed: offerWords.test(lowerText) || benefitWords.test(lowerText),
      tip: "Use value or offer language such as pricing, free quote, package, or save.",
      critical: true,
    },
    {
      id: "sea_focused_length",
      category: "sea",
      label: "Content length stays landing-page friendly",
      passed: wordCount >= 150 && wordCount <= 1800,
      tip: "Keep landing-page copy focused and substantial.",
    },
    {
      id: "sea_scannable",
      category: "sea",
      label: "Content is scannable",
      passed: headings.length >= 2 || /<(ul|ol|table)\b/i.test(content),
      tip: "Use headings, lists, or tables for quick scanning.",
    },
    {
      id: "sea_next_step",
      category: "sea",
      label: "Clear next step appears",
      passed: intentWords.test(lowerText),
      tip: "Tell visitors exactly what to do next.",
      critical: true,
    },
    {
      id: "sea_urgency_or_proof",
      category: "sea",
      label: "Urgency or proof cue appears",
      passed: /(today|now|instant|quick|fast|limited|same-day|immediate|\d+\+|\d{1,3}%|top-rated|best-selling)/i.test(lowerText),
      tip: "Add truthful urgency or proof cues such as today, fast, top-rated, or measurable proof.",
    },
    {
      id: "geo_local_cue",
      category: "geo",
      label: "Local cue appears in title or intro",
      passed: geoWords.test(seoTitle.toLowerCase()) || geoWords.test(introText),
      tip: "Add a natural local cue such as local, nearby, community, or serving the area.",
      critical: true,
    },
    {
      id: "geo_service_area",
      category: "geo",
      label: "Service-area language appears",
      passed: serviceAreaWords.test(lowerText),
      tip: "Mention service area, coverage, nearby delivery, or availability in the area.",
      critical: true,
    },
    {
      id: "geo_heading",
      category: "geo",
      label: "Localized heading exists",
      passed: headings.some((heading) => geoWords.test(heading.toLowerCase())),
      tip: "Use local-intent wording in at least one heading.",
      critical: true,
    },
    {
      id: "geo_community",
      category: "geo",
      label: "Community or proximity language appears",
      passed: communityWords.test(lowerText),
      tip: "Use community, neighborhood, nearby, or local-expert language.",
      critical: true,
    },
    {
      id: "geo_availability",
      category: "geo",
      label: "Availability cue appears",
      passed: availabilityWords.test(lowerText),
      tip: "Mention availability, hours, response time, same-day service, or contact timing.",
      critical: true,
    },
    {
      id: "geo_clean_url",
      category: "geo",
      label: "URL is clean and descriptive",
      passed: (() => {
        const slugSource = slugCandidate.replace(/^\/+|\/+$/g, "").toLowerCase();
        return slugSource.length > 3 && !/^\d+$/.test(slugSource) && /^[a-z0-9-\/]+$/i.test(slugSource);
      })(),
      tip: "Use a readable descriptive URL slug.",
    },
    {
      id: "geo_local_credibility",
      category: "geo",
      label: "Local credibility wording appears",
      passed: credibilityWords.test(lowerText) || /(area specialists|local support|serving customers near you)/i.test(lowerText),
      tip: "Add truthful local credibility wording like local team or area specialists.",
      critical: true,
    },
  );

  return {
    primaryKeyword,
    seoScore: scoreCategory(checks, "seo"),
    seaScore: scoreCategory(checks, "sea"),
    geoScore: scoreCategory(checks, "geo"),
    checks,
  };
}

export function needsQualityRepair(
  report: SeoQualityReport,
  thresholds: { seo: number; sea: number; geo: number } = { seo: 84, sea: 78, geo: 78 },
) {
  return report.seoScore < thresholds.seo
    || report.seaScore < thresholds.sea
    || report.geoScore < thresholds.geo
    || report.checks.some((check) => check.critical && !check.passed);
}

export function buildQualityRepairChecklist(checks: QualityCheck[]): string {
  return checks
    .filter((check) => !check.passed)
    .sort((a, b) => Number(Boolean(b.critical)) - Number(Boolean(a.critical)))
    .map((check) => `- [${check.category.toUpperCase()}] ${check.tip}`)
    .join("\n");
}