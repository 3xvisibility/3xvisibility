/**
 * Keyword & entity analysis.
 *
 * Produces keyword density, placement coverage, semantic n-gram terms and
 * entity coverage — the inputs the Keywords, Terms, Generate and Audit modules
 * all share.
 */

import { tokenize } from "./extract";
import type { PageSignals } from "./types";

const STOPWORDS = new Set(
  (
    "a an the and or but if then than that this these those of in on at to for from by with without about as is are was were be been being it its his her their our your my we you they he she i not no do does did doing have has had having will would can could should may might must so such very more most other some any each own same too only just also into over under again further once here there when where why how all both few nor own s t don now" +
    " le la les des de du un une et ou mais dans sur pour par avec sans est sont être avoir plus ce cette ces au aux qui que quoi dont" +
    " el los las una unos unas y o pero en para por con sin es son ser haber más este esta estos estas que" +
    " der die das ein eine und oder aber in auf für von mit ohne ist sind sein haben mehr dieser diese dieses"
  ).split(/\s+/),
);

export interface KeywordStat {
  keyword: string;
  count: number;
  /** Percentage of total words. */
  density: number;
  inTitle: boolean;
  inDescription: boolean;
  inH1: boolean;
  inSubheadings: boolean;
  inFirstParagraph: boolean;
  inUrl: boolean;
  inImageAlt: boolean;
  /** 0–100 placement coverage. */
  placementScore: number;
}

export interface KeywordAnalysis {
  primary: KeywordStat | null;
  keywords: KeywordStat[];
  /** Auto-discovered semantic terms (1–3 grams) ranked by weighted frequency. */
  semanticTerms: { term: string; count: number; weight: number }[];
  /** Density health for the primary keyword. */
  densityStatus: "missing" | "thin" | "optimal" | "stuffed";
  score: number;
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (haystack.match(new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}([^\\p{L}\\p{N}]|$)`, "giu")) || []).length;
}

export function extractSemanticTerms(signals: PageSignals, limit = 30) {
  const counts = new Map<string, number>();
  const headingTerms = new Set(
    signals.headings.flatMap((h) => tokenize(h.text)).filter((w) => !STOPWORDS.has(w)),
  );

  const add = (term: string, weight: number) => {
    counts.set(term, (counts.get(term) ?? 0) + weight);
  };

  const words = signals.words;
  for (let i = 0; i < words.length; i++) {
    const w1 = words[i];
    if (w1.length > 2 && !STOPWORDS.has(w1)) add(w1, 1);
    if (i + 1 < words.length) {
      const w2 = words[i + 1];
      if (!STOPWORDS.has(w1) && !STOPWORDS.has(w2) && w1.length > 2 && w2.length > 2) {
        add(`${w1} ${w2}`, 1.6);
      }
    }
    if (i + 2 < words.length) {
      const [a, b, c] = [words[i], words[i + 1], words[i + 2]];
      if (!STOPWORDS.has(a) && !STOPWORDS.has(c) && a.length > 2 && c.length > 2) {
        add(`${a} ${b} ${c}`, 1.8);
      }
    }
  }

  return [...counts.entries()]
    .map(([term, weight]) => ({
      term,
      count: Math.round(weight),
      weight: weight * (term.split(" ").some((t) => headingTerms.has(t)) ? 1.5 : 1),
    }))
    .filter((t) => t.count >= 2)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit);
}

export function analyzeKeywords(
  signals: PageSignals,
  opts: {
    focusKeyword?: string | null;
    keywords?: string[] | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    slug?: string | null;
  },
): KeywordAnalysis {
  const text = signals.text.toLowerCase();
  const title = (opts.seoTitle || signals.meta.title || "").toLowerCase();
  const description = (opts.seoDescription || signals.meta.description || "").toLowerCase();
  const h1 = signals.headings.filter((h) => h.level === 1).map((h) => h.text.toLowerCase()).join(" ");
  const subs = signals.headings.filter((h) => h.level >= 2).map((h) => h.text.toLowerCase()).join(" ");
  const firstParagraph = (signals.paragraphs[0] || signals.text.slice(0, 400)).toLowerCase();
  const slug = (opts.slug || "").toLowerCase().replace(/-/g, " ");
  const alts = signals.images.map((i) => i.alt.toLowerCase()).join(" ");

  const list = [
    ...(opts.focusKeyword ? [opts.focusKeyword] : []),
    ...(opts.keywords || []),
  ]
    .map((k) => (k || "").trim().toLowerCase())
    .filter(Boolean);

  const unique = [...new Set(list)];

  const stats: KeywordStat[] = unique.map((keyword) => {
    const count = countOccurrences(text, keyword);
    const flags = {
      inTitle: countOccurrences(title, keyword) > 0,
      inDescription: countOccurrences(description, keyword) > 0,
      inH1: countOccurrences(h1, keyword) > 0,
      inSubheadings: countOccurrences(subs, keyword) > 0,
      inFirstParagraph: countOccurrences(firstParagraph, keyword) > 0,
      inUrl: countOccurrences(slug, keyword) > 0,
      inImageAlt: countOccurrences(alts, keyword) > 0,
    };
    const passed = Object.values(flags).filter(Boolean).length;
    return {
      keyword,
      count,
      density: signals.wordCount ? Math.round((count / signals.wordCount) * 10000) / 100 : 0,
      ...flags,
      placementScore: Math.round((passed / 7) * 100),
    };
  });

  const primary = stats[0] ?? null;
  const densityStatus: KeywordAnalysis["densityStatus"] = !primary || primary.count === 0
    ? "missing"
    : primary.density < 0.4
      ? "thin"
      : primary.density > 3.5
        ? "stuffed"
        : "optimal";

  let score = 0;
  if (primary) {
    score = primary.placementScore * 0.7;
    score += densityStatus === "optimal" ? 30 : densityStatus === "thin" ? 12 : densityStatus === "stuffed" ? 6 : 0;
  }

  return {
    primary,
    keywords: stats,
    semanticTerms: extractSemanticTerms(signals),
    densityStatus,
    score: Math.max(0, Math.min(100, Math.round(score))),
  };
}

export interface EntityCoverage {
  covered: string[];
  missing: string[];
  /** Entities detected in the copy that were not in the target list. */
  discovered: string[];
  score: number;
}

/** Capitalised / proper-noun style entity detection + coverage vs a target list. */
export function analyzeEntities(signals: PageSignals, targets?: string[] | null): EntityCoverage {
  const text = signals.text;
  const lower = text.toLowerCase();

  const discovered = [
    ...new Set(
      (text.match(/\b[A-ZÀ-Ý][\p{L}]+(?:\s+[A-ZÀ-Ý][\p{L}]+){0,2}\b/gu) || [])
        .map((e) => e.trim())
        .filter((e) => e.length > 3 && !STOPWORDS.has(e.toLowerCase())),
    ),
  ].slice(0, 40);

  const list = (targets || []).map((t) => (t || "").trim()).filter(Boolean);
  const covered = list.filter((t) => lower.includes(t.toLowerCase()));
  const missing = list.filter((t) => !lower.includes(t.toLowerCase()));

  const score = list.length
    ? Math.round((covered.length / list.length) * 100)
    : discovered.length >= 8
      ? 80
      : discovered.length >= 4
        ? 60
        : 35;

  return { covered, missing, discovered, score };
}
