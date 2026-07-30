/**
 * Shared SEO Engine — types & plug-in contract.
 *
 * Every module in the platform (Generate, Website Content, Audit, Marketplace,
 * Performance, Competitor, AI Visibility…) reads from this engine instead of
 * hand-rolling its own checks. New capabilities plug in by registering an
 * `Analyzer` — no consumer needs to change.
 *
 * Hard rules:
 *  - Pure & synchronous. No network, no DOM, no side effects.
 *  - Never mutates or rewrites template markup. Analysis only.
 */

export type FindingSeverity = "critical" | "warning" | "info" | "pass";

export type FindingCategory =
  | "title"
  | "description"
  | "headings"
  | "content"
  | "keywords"
  | "readability"
  | "images"
  | "links"
  | "schema"
  | "social"
  | "technical"
  | "entities"
  | "conversion"
  | "performance"
  | "ai-visibility";

/** A single actionable result produced by an analyzer. */
export interface SeoFinding {
  /** Stable id, unique per analyzer, e.g. "images.missing-alt". */
  id: string;
  category: FindingCategory;
  severity: FindingSeverity;
  /** Short human label. */
  label: string;
  /** What to do about it. */
  tip?: string;
  /** Machine-readable payload the one-click fixer can act on. */
  data?: Record<string, unknown>;
  /**
   * When true a deterministic or AI fixer exists for this finding, so the UI
   * can offer a one-click fix.
   */
  fixable?: boolean;
}

/** Extracted, framework-agnostic signals for one page. */
export interface PageSignals {
  /** Visible text with markup removed. */
  text: string;
  words: string[];
  wordCount: number;
  sentences: string[];
  paragraphs: string[];
  headings: { level: 1 | 2 | 3 | 4 | 5 | 6; text: string }[];
  images: { src: string; alt: string; hasAlt: boolean; loading?: string; width?: string; height?: string }[];
  links: { href: string; text: string; internal: boolean; nofollow: boolean }[];
  jsonLd: Record<string, unknown>[];
  meta: {
    title?: string;
    description?: string;
    canonical?: string;
    robots?: string;
    og: Record<string, string>;
    twitter: Record<string, string>;
  };
  /** Rough inline byte weight of style/script blocks (used by perf hints). */
  inlineCssBytes: number;
  inlineJsBytes: number;
  hasFaqBlock: boolean;
  hasCta: boolean;
  lang?: string;
}

/** Real-world signals that can't be derived from HTML. */
export interface FieldSignals {
  lcp?: number;
  cls?: number;
  inp?: number;
  ttfb?: number;
  pageWeightKb?: number;
  unusedCssKb?: number;
  unusedJsKb?: number;
  renderBlockingCount?: number;
}

export interface SeoEngineInput {
  /** Full page HTML (template output, live page, or competitor fetch). */
  html: string;
  /** Page title as stored by the app (falls back to <title> / first H1). */
  title?: string;
  slug?: string;
  url?: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string[] | null;
  focusKeyword?: string | null;
  canonicalUrl?: string | null;
  /** Entities the page is expected to cover (brand, services, locations…). */
  targetEntities?: string[] | null;
  /** Other pages on the same site, used for internal-link suggestions. */
  corpus?: { title: string; slug: string; keywords?: string[] }[] | null;
  /** Field data from PageSpeed Insights / RUM. */
  field?: FieldSignals | null;
  language?: string;
}

/** Scores every module can display consistently. */
export interface EngineScores {
  /** Composite 0–100 SEO score (gated — see unified-seo-score). */
  seo: number;
  content: number;
  readability: number;
  keywords: number;
  entityCoverage: number;
  structuredData: number;
  technical: number;
  performance: number | null;
  /** Generative-engine / AI-search readiness. */
  aiVisibility: number;
  geo: number;
  citationReadiness: number;
  mobile: number;
}

export interface AnalyzerResult {
  findings: SeoFinding[];
  /** Optional partial score contributions, merged into EngineScores. */
  scores?: Partial<EngineScores>;
  /** Free-form data surfaced to the UI (e.g. keyword table, link suggestions). */
  details?: Record<string, unknown>;
}

/** Plug-in contract. Register with `registerAnalyzer` to extend the engine. */
export interface Analyzer {
  key: string;
  label: string;
  run(signals: PageSignals, input: SeoEngineInput): AnalyzerResult;
}

export interface SeoEngineReport {
  signals: PageSignals;
  scores: EngineScores;
  findings: SeoFinding[];
  /** Findings a one-click fixer can resolve. */
  fixable: SeoFinding[];
  details: Record<string, unknown>;
  grade: "A" | "B" | "C" | "D" | "F";
}
