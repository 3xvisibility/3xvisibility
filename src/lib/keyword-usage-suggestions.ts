/**
 * Keyword usage suggestions
 *
 * Given a primary keyword (typically sourced from the CSV row that produced the
 * page, falling back to the template's seo_title_pattern / first H1) and the
 * rendered page content, propose:
 *
 *   - additions: high-value related/long-tail keywords missing from the content
 *   - removals: stuffed, off-topic, or filler "keywords" currently declared in
 *               page.seo_keywords that hurt relevance
 *   - notes: short human-readable explanations
 *
 * Pure, dependency-free, browser-safe. No AI calls.
 */

const STOPWORDS = new Set([
  "the","a","an","and","or","but","of","in","on","at","to","for","with","by","from","as","is","are","was","were","be","been","being",
  "this","that","these","those","it","its","you","your","we","our","they","their","i","my","me","he","she","him","her","them",
  "do","does","did","done","have","has","had","will","would","can","could","should","may","might","must","shall",
  "not","no","yes","if","then","than","so","very","just","only","also","more","most","some","any","all","each","every",
  "what","when","where","why","how","which","who","whom","whose","there","here","about","into","over","under","up","down","out","off",
  "page","content","text","website","site","online","click","read","learn","find","get","make","best","top","new","good","great",
]);

const FILLER_KEYWORDS = new Set([
  "best","top","new","good","great","quality","cheap","affordable","amazing","awesome","ultimate",
  "click here","read more","learn more","welcome","home","page","website","blog post","article",
]);

function stripHtml(html: string): string {
  return (html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&amp;|&quot;|&#39;|&lt;|&gt;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function bigrams(tokens: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    if (STOPWORDS.has(tokens[i]) || STOPWORDS.has(tokens[i + 1])) continue;
    out.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return out;
}

function frequency(items: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const it of items) map.set(it, (map.get(it) || 0) + 1);
  return map;
}

function densityPct(matches: number, totalWords: number): number {
  if (!totalWords) return 0;
  return Math.round((matches / totalWords) * 1000) / 10; // one decimal
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  const n = needle.toLowerCase().trim();
  const h = haystack.toLowerCase();
  if (!n) return 0;
  let count = 0;
  let idx = 0;
  while ((idx = h.indexOf(n, idx)) !== -1) {
    count++;
    idx += n.length;
  }
  return count;
}

export interface KeywordSuggestion {
  keyword: string;
  reason: string;
  /** rough usefulness score 0..100 */
  score: number;
}

export interface KeywordUsageAnalysis {
  primary: string;
  primaryDensity: number;        // % of total content words
  primaryOccurrences: number;
  totalWords: number;
  inTitle: boolean;
  inSeoTitle: boolean;
  inSeoDescription: boolean;
  inFirstParagraph: boolean;
  inHeadings: boolean;
  recommendedAdditions: KeywordSuggestion[];
  recommendedRemovals: KeywordSuggestion[];
  notes: string[];
}

export interface AnalyzeKeywordUsageInput {
  /** Primary keyword from CSV row (preferred) or fallback derived elsewhere. */
  primaryKeyword?: string | null;
  /** Optional template content — used to surface placeholder vars worth filling. */
  templateContent?: string | null;
  /** Page-level inputs */
  pageTitle?: string | null;
  pageContent: string;          // rendered HTML or plain text
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string[] | null;
  /** Optional extra row context (other CSV columns). Helps recommend related kws. */
  csvRow?: Record<string, unknown> | null;
}

const TARGET_DENSITY_MIN = 0.6;   // %
const TARGET_DENSITY_MAX = 2.5;   // %

export function analyzeKeywordUsage(input: AnalyzeKeywordUsageInput): KeywordUsageAnalysis | null {
  const primaryRaw = (input.primaryKeyword || "").trim();
  const text = stripHtml(input.pageContent || "");
  const lowerText = text.toLowerCase();
  const tokens = tokenize(text);
  const totalWords = tokens.length;

  // Without a primary keyword we can't anchor recommendations; bail gracefully.
  if (!primaryRaw || totalWords === 0) return null;

  const primary = primaryRaw.toLowerCase();
  const primaryOccurrences = countOccurrences(text, primary);
  const primaryDensity = densityPct(primaryOccurrences, totalWords);

  // Placement checks
  const inTitle = (input.pageTitle || "").toLowerCase().includes(primary);
  const inSeoTitle = (input.seoTitle || "").toLowerCase().includes(primary);
  const inSeoDescription = (input.seoDescription || "").toLowerCase().includes(primary);
  const firstPara = lowerText.split(/\.\s/)[0] || "";
  const inFirstParagraph = firstPara.includes(primary);
  const headingMatches = (input.pageContent || "").match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi) || [];
  const inHeadings = headingMatches.some((h) => stripHtml(h).toLowerCase().includes(primary));

  // ── Build candidate additions ──
  const additions: KeywordSuggestion[] = [];
  const seenAdditions = new Set<string>();
  const declared = new Set((input.seoKeywords || []).map((k) => k.toLowerCase().trim()).filter(Boolean));

  const pushAddition = (kw: string, reason: string, score: number) => {
    const k = kw.toLowerCase().trim();
    if (!k || k === primary) return;
    if (seenAdditions.has(k)) return;
    seenAdditions.add(k);
    additions.push({ keyword: kw, reason, score });
  };

  // 1. CSV-row derived candidates (city, service, brand, category, location, etc.)
  if (input.csvRow) {
    const interestingKeys = Object.keys(input.csvRow).filter((k) =>
      /city|town|state|region|country|area|location|service|category|brand|product|niche|industry|type|specialty/i.test(k),
    );
    for (const key of interestingKeys) {
      const val = String((input.csvRow as any)[key] ?? "").trim();
      if (!val || val.length > 60) continue;
      const compoundCandidates = [val, `${primaryRaw} ${val}`, `${val} ${primaryRaw}`];
      for (const c of compoundCandidates) {
        const present = lowerText.includes(c.toLowerCase());
        if (!present) {
          pushAddition(c, `Build relevance: combine primary keyword with "${val}" from your CSV.`, 80);
        }
      }
    }
  }

  // 2. Template placeholders that aren't yet woven into the rendered text.
  if (input.templateContent) {
    const placeholders = Array.from(input.templateContent.matchAll(/\{([a-z_][a-z0-9_]*)\}/gi))
      .map((m) => m[1].toLowerCase());
    const uniquePlaceholders = [...new Set(placeholders)].filter((p) => !["page_title","title","slug","content"].includes(p));
    for (const p of uniquePlaceholders.slice(0, 6)) {
      const value = String((input.csvRow as any)?.[p] ?? "").trim();
      if (value && value.length <= 60 && !lowerText.includes(value.toLowerCase())) {
        pushAddition(value, `Template variable {${p}} is unused in the rendered content.`, 65);
      }
    }
  }

  // 3. Frequent body bigrams that feel topical and aren't yet declared.
  const bigramFreq = frequency(bigrams(tokens));
  const sortedBigrams = [...bigramFreq.entries()]
    .filter(([phrase, count]) => count >= 2 && phrase !== primary && !declared.has(phrase))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  for (const [phrase, count] of sortedBigrams) {
    pushAddition(phrase, `Repeated ${count}× in content — consider adding to your keyword list.`, 50);
  }

  // 4. Long-tail variant of the primary keyword.
  if (!declared.has(`${primary} near me`) && !lowerText.includes(`${primary} near me`)) {
    pushAddition(`${primaryRaw} near me`, "Common local long-tail variant — strong for GEO/SEA.", 45);
  }

  // ── Build candidate removals ──
  const removals: KeywordSuggestion[] = [];
  const seenRemovals = new Set<string>();
  const pushRemoval = (kw: string, reason: string, score: number) => {
    const k = kw.toLowerCase().trim();
    if (!k || seenRemovals.has(k)) return;
    seenRemovals.add(k);
    removals.push({ keyword: kw, reason, score });
  };

  for (const kw of input.seoKeywords || []) {
    const trimmed = kw.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();

    // Filler
    if (FILLER_KEYWORDS.has(lower) || lower.length < 3) {
      pushRemoval(trimmed, "Generic filler — search engines de-weight it.", 90);
      continue;
    }
    // Off-topic: not present in content at all and not related to primary
    const inContent = lowerText.includes(lower);
    const sharesToken = lower.split(/\s+/).some((t) => primary.includes(t) || tokens.includes(t));
    if (!inContent && !sharesToken) {
      pushRemoval(trimmed, "Not used in content and unrelated to primary keyword.", 75);
      continue;
    }
    // Stuffed: density extremely high
    const occ = countOccurrences(text, lower);
    const dens = densityPct(occ, totalWords);
    if (dens > 4) {
      pushRemoval(trimmed, `Over-used (${dens}% density) — risks keyword stuffing penalty.`, 70);
    }
  }

  // ── Notes ──
  const notes: string[] = [];
  if (primaryOccurrences === 0) {
    notes.push(`Primary keyword "${primaryRaw}" is not present in the rendered content.`);
  } else if (primaryDensity < TARGET_DENSITY_MIN) {
    notes.push(`Primary keyword density is ${primaryDensity}% — aim for ${TARGET_DENSITY_MIN}-${TARGET_DENSITY_MAX}%.`);
  } else if (primaryDensity > TARGET_DENSITY_MAX) {
    notes.push(`Primary keyword density is ${primaryDensity}% — likely over-used. Reduce repetitions.`);
  }
  if (!inTitle && !inSeoTitle) notes.push("Add the primary keyword to the page title or SEO title.");
  if (!inSeoDescription) notes.push("Add the primary keyword to the meta description.");
  if (!inFirstParagraph) notes.push("Mention the primary keyword in the first paragraph.");
  if (!inHeadings) notes.push("Add the primary keyword to at least one H1/H2/H3 heading.");

  // Sort recommendations by usefulness
  additions.sort((a, b) => b.score - a.score);
  removals.sort((a, b) => b.score - a.score);

  return {
    primary: primaryRaw,
    primaryDensity,
    primaryOccurrences,
    totalWords,
    inTitle,
    inSeoTitle,
    inSeoDescription,
    inFirstParagraph,
    inHeadings,
    recommendedAdditions: additions.slice(0, 8),
    recommendedRemovals: removals.slice(0, 6),
    notes,
  };
}

/**
 * Resolve the most likely primary keyword for a page, using:
 *   1. Explicit CSV column (`primary_keyword`, `keyword`, `focus_keyword`, etc.)
 *   2. The first word/phrase from the page title
 */
export function resolvePrimaryKeyword(
  csvRow?: Record<string, unknown> | null,
  pageTitle?: string | null,
): string | null {
  const KEYWORD_COLUMNS = ["primary_keyword", "focus_keyword", "keyword", "main_keyword", "seo_keyword"];
  if (csvRow) {
    for (const col of KEYWORD_COLUMNS) {
      const found = Object.keys(csvRow).find((k) => k.toLowerCase() === col);
      if (found) {
        const val = String((csvRow as any)[found] ?? "").trim();
        if (val) return val;
      }
    }
  }
  const t = (pageTitle || "").trim();
  if (!t) return null;
  // Take the first ~4 words before a separator as the implied focus phrase.
  const head = t.split(/[|\-–·•:]/)[0].trim();
  const words = head.split(/\s+/).slice(0, 4).join(" ");
  return words || null;
}
