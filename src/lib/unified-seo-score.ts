/**
 * Unified SEO Score Engine — the shared "brain" every SEO tool reads from.
 *
 * This composes the existing pure analysers (content score + extended analysis)
 * into ONE weighted 100-point score across the factor groups the platform cares
 * about:
 *
 *   Title · Meta Description · Headings · Content · Keyword Coverage ·
 *   Readability · Images · Internal Links · Schema · Performance · Entity Coverage
 *
 * Design rules:
 *  - Pure & synchronous. No network, no side effects. Safe to run anywhere
 *    (page list, editor, audit, publish pre-flight, dashboards).
 *  - Every tool should consume THIS result instead of hand-rolling its own
 *    scoring, so numbers stay consistent across the app.
 *  - "90+ only if every important factor passes": critical factor groups gate
 *    the final score. If any critical group is below its pass threshold, the
 *    final score is capped at 89 no matter how good everything else is.
 */

import {
  calculateContentSeoScore,
  type ContentScoreResult,
} from "./content-seo-score";
import { analyzeExtendedSeo, type ExtendedAnalysis } from "./seo-extended-analysis";

// ── Types ────────────────────────────────────────────────────────────────────

export type SeoFactorKey =
  | "title"
  | "description"
  | "headings"
  | "content"
  | "keywords"
  | "readability"
  | "images"
  | "internalLinks"
  | "schema"
  | "performance"
  | "entityCoverage";

export interface SeoFactorCheck {
  label: string;
  passed: boolean;
  tip?: string;
}

export interface SeoFactorResult {
  key: SeoFactorKey;
  label: string;
  /** 0–100 sub-score for this factor group. */
  score: number;
  /** Relative weight in the composite. */
  weight: number;
  /** Critical factors gate the 90+ tier. */
  critical: boolean;
  /** A critical factor "passes" when score >= passThreshold. */
  passThreshold: number;
  passed: boolean;
  checks: SeoFactorCheck[];
}

export interface SeoScoreLabel {
  label: "Poor" | "Fair" | "Good" | "Excellent";
  color: string;
  /** Letter grade A–F for compact UI badges. */
  grade: "A" | "B" | "C" | "D" | "F";
}

export interface UnifiedSeoResult extends SeoScoreLabel {
  /** Final gated 0–100 score. */
  score: number;
  /** Weighted score before the critical-factor gate was applied. */
  rawScore: number;
  /** True when no critical factor is failing (i.e. the 90+ tier is reachable). */
  gatePassed: boolean;
  factors: SeoFactorResult[];
  /** Critical factor groups currently failing — the highest-priority fixes. */
  criticalFailures: SeoFactorResult[];
  /** Flat, ranked list of concrete fixes across all factors. */
  recommendations: { factor: SeoFactorKey; label: string; tip: string; critical: boolean }[];
}

/** Optional real-world signals that can't be derived from HTML alone. */
export interface PerformanceSignals {
  /** Largest Contentful Paint (seconds). Good ≤ 2.5. */
  lcp?: number;
  /** Cumulative Layout Shift. Good ≤ 0.1. */
  cls?: number;
  /** Interaction to Next Paint (ms). Good ≤ 200. */
  inp?: number;
  /** Time To First Byte (ms). Good ≤ 800. */
  ttfb?: number;
  /** Total page weight (KB). Good ≤ 1500. */
  pageWeightKb?: number;
}

export interface UnifiedSeoInput {
  title: string;
  content: string;
  slug: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string[] | null;
  focusKeyword?: string | null;
  canonicalUrl?: string | null;
  url?: string | null;
  /** Named entities the page should cover (brand, locations, services, people…). */
  targetEntities?: string[] | null;
  /** Optional performance signals; when omitted, the perf factor is neutral. */
  performance?: PerformanceSignals | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function labelFor(score: number): SeoScoreLabel {
  if (score >= 90) return { label: "Excellent", color: "text-emerald-600", grade: "A" };
  if (score >= 75) return { label: "Good", color: "text-primary", grade: "B" };
  if (score >= 60) return { label: "Good", color: "text-primary", grade: "C" };
  if (score >= 40) return { label: "Fair", color: "text-amber-600", grade: "D" };
  return { label: "Poor", color: "text-destructive", grade: "F" };
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ratioScore(passed: number, total: number): number {
  if (total <= 0) return 0;
  return clamp((passed / total) * 100);
}

/** Pick the checks (by label substring) that belong to a factor from the content score. */
function pickChecks(
  result: ContentScoreResult,
  labels: string[],
): { checks: SeoFactorCheck[]; score: number } {
  const matched = result.checks.filter((c) =>
    labels.some((l) => c.label.toLowerCase().includes(l.toLowerCase())),
  );
  const checks = matched.map((c) => ({ label: c.label, passed: c.passed, tip: c.tip }));
  const passed = matched.filter((c) => c.passed).length;
  return { checks, score: ratioScore(passed, matched.length || 1) };
}

// ── Factor builders ──────────────────────────────────────────────────────────

function buildImagesFactor(content: string, focusKw: string): SeoFactorResult {
  const imgs = Array.from(content.matchAll(/<img\b[^>]*>/gi)).map((m) => m[0]);
  const checks: SeoFactorCheck[] = [];
  if (imgs.length === 0) {
    checks.push({ label: "Has images", passed: false, tip: "Add relevant images with descriptive alt text" });
    return factor("images", "Image SEO", ratioScore(0, 1), 1, false, 60, checks);
  }
  const withAlt = imgs.filter((t) => /alt=["'][^"']+["']/i.test(t));
  const withDims = imgs.filter((t) => /width=/.test(t) && /height=/.test(t));
  const lazy = imgs.filter((t) => /loading=["']lazy["']/i.test(t));
  const altWithKw = focusKw
    ? imgs.some((t) => {
        const m = t.match(/alt=["']([^"']*)["']/i);
        return m ? m[1].toLowerCase().includes(focusKw.toLowerCase()) : false;
      })
    : true;

  checks.push({ label: "All images have alt text", passed: withAlt.length === imgs.length, tip: "Add alt text to every image" });
  checks.push({ label: "Alt text uses focus keyword", passed: altWithKw, tip: "Include the focus keyword in at least one alt text" });
  checks.push({ label: "Images have width & height", passed: withDims.length === imgs.length, tip: "Set width/height to prevent layout shift (CLS)" });
  checks.push({ label: "Below-fold images lazy-load", passed: lazy.length > 0, tip: 'Add loading="lazy" to non-hero images' });

  return factor("images", "Image SEO", ratioScore(checks.filter((c) => c.passed).length, checks.length), 1, false, 60, checks);
}

function buildPerformanceFactor(perf?: PerformanceSignals | null): SeoFactorResult {
  const checks: SeoFactorCheck[] = [];
  if (!perf || Object.keys(perf).length === 0) {
    // Neutral: unknown performance shouldn't punish or reward. Score 70 = "unmeasured".
    checks.push({ label: "Performance measured", passed: false, tip: "Run a performance analysis to score Core Web Vitals" });
    return factor("performance", "Performance", 70, 1, false, 60, checks);
  }
  const add = (label: string, ok: boolean | undefined, tip: string) => {
    if (ok === undefined) return;
    checks.push({ label, passed: ok, tip });
  };
  add("LCP ≤ 2.5s", perf.lcp === undefined ? undefined : perf.lcp <= 2.5, "Optimize the largest element / hero image");
  add("CLS ≤ 0.1", perf.cls === undefined ? undefined : perf.cls <= 0.1, "Set image dimensions and reserve ad/embization space");
  add("INP ≤ 200ms", perf.inp === undefined ? undefined : perf.inp <= 200, "Reduce main-thread JS work");
  add("TTFB ≤ 800ms", perf.ttfb === undefined ? undefined : perf.ttfb <= 800, "Improve server response / caching");
  add("Page weight ≤ 1.5MB", perf.pageWeightKb === undefined ? undefined : perf.pageWeightKb <= 1500, "Compress images and trim unused CSS/JS");
  const total = checks.length || 1;
  return factor("performance", "Performance", ratioScore(checks.filter((c) => c.passed).length, total), 1, false, 60, checks);
}

function buildEntityFactor(content: string, entities: string[]): SeoFactorResult {
  const checks: SeoFactorCheck[] = [];
  if (!entities.length) {
    checks.push({ label: "Entity targets defined", passed: false, tip: "Define target entities (brand, locations, services) to measure coverage" });
    return factor("entityCoverage", "Entity Coverage", 70, 1, false, 50, checks);
  }
  const text = stripHtml(content).toLowerCase();
  const covered = entities.filter((e) => e.trim() && text.includes(e.trim().toLowerCase()));
  for (const e of entities) {
    checks.push({ label: `Mentions "${e}"`, passed: text.includes(e.trim().toLowerCase()), tip: `Reference "${e}" naturally in the content` });
  }
  return factor("entityCoverage", "Entity Coverage", ratioScore(covered.length, entities.length), 1, false, 60, checks);
}

function factor(
  key: SeoFactorKey,
  label: string,
  score: number,
  weight: number,
  critical: boolean,
  passThreshold: number,
  checks: SeoFactorCheck[],
): SeoFactorResult {
  return {
    key,
    label,
    score: clamp(score),
    weight,
    critical,
    passThreshold,
    passed: clamp(score) >= passThreshold,
    checks,
  };
}

// ── Main engine ──────────────────────────────────────────────────────────────

export function calculateUnifiedSeoScore(input: UnifiedSeoInput): UnifiedSeoResult {
  const content = input.content || "";
  const seoTitle = input.seoTitle?.trim() || input.title || "";
  const seoKeywords = input.seoKeywords ?? [];
  const focusKw =
    input.focusKeyword?.trim() ||
    seoKeywords.find((k) => k.trim())?.trim() ||
    "";

  // Reuse the battle-tested content analyser.
  const content_ = calculateContentSeoScore(input.title, content, input.slug, {
    url: input.url ?? undefined,
    description: input.seoDescription ?? "",
    seoTitle,
    seoKeywords,
    focusKeyword: focusKw || undefined,
  });
  const extended: ExtendedAnalysis = analyzeExtendedSeo({
    html: content,
    seoTitle,
    seoDescription: input.seoDescription ?? null,
    seoKeywords,
  });

  // Group content-score checks into factor buckets.
  const titleBucket = pickChecks(content_, ["title"]);
  const descBucket = pickChecks(content_, ["meta description", "description"]);
  const headingBucket = pickChecks(content_, ["h1", "subheading", "heading"]);
  const contentBucket = pickChecks(content_, ["words", "keyword density", "keyword in", "paragraph"]);
  const keywordBucket = pickChecks(content_, ["focus keyword", "keyword in", "density"]);
  const linkBucket = pickChecks(content_, ["internal links", "outbound links"]);
  const schemaBucket = pickChecks(content_, ["structured data", "schema"]);

  const canonicalCheck: SeoFactorCheck = {
    label: "Canonical URL set",
    passed: !!input.canonicalUrl,
    tip: "Set a canonical URL to avoid duplicate-content issues",
  };

  const factors: SeoFactorResult[] = [
    factor("title", "Title", titleBucket.score, 1.5, true, 60, titleBucket.checks),
    factor("description", "Meta Description", descBucket.score, 1.5, true, 60, descBucket.checks),
    factor(
      "headings",
      "Headings",
      clamp((headingBucket.score + (extended.headings.orderOk ? 100 : 50)) / 2),
      1.25,
      true,
      60,
      [
        ...headingBucket.checks,
        { label: "Single H1", passed: extended.headings.h1Count === 1, tip: "Use exactly one H1 per page" },
        { label: "No skipped heading levels", passed: extended.headings.orderOk, tip: "Go H2 → H3 → H4 without skipping" },
      ],
    ),
    factor("content", "Content", contentBucket.score, 1.5, true, 55, contentBucket.checks),
    factor("keywords", "Keyword Coverage", keywordBucket.score, 1.5, true, 55, keywordBucket.checks),
    factor("readability", "Readability", extended.readability.score, 1, false, 50, [
      { label: `Readability grade: ${extended.readability.grade}`, passed: extended.readability.score >= 50, tip: "Shorter sentences and simpler words improve readability" },
      { label: "Avg sentence ≤ 22 words", passed: extended.readability.avgWordsPerSentence <= 22 && extended.readability.avgWordsPerSentence > 0, tip: "Break up long sentences" },
    ]),
    buildImagesFactor(content, focusKw),
    factor("internalLinks", "Internal Links", linkBucket.score, 1, false, 50, linkBucket.checks),
    factor(
      "schema",
      "Structured Data",
      clamp((schemaBucket.score + (canonicalCheck.passed ? 100 : 0)) / 2),
      1,
      false,
      50,
      [...schemaBucket.checks, canonicalCheck],
    ),
    buildPerformanceFactor(input.performance),
    buildEntityFactor(content, (input.targetEntities ?? []).filter(Boolean)),
  ];

  // Weighted composite.
  const totalWeight = factors.reduce((s, f) => s + f.weight, 0) || 1;
  const rawScore = clamp(factors.reduce((s, f) => s + f.score * f.weight, 0) / totalWeight);

  // Critical-factor gate: 90+ requires every critical factor to pass.
  const criticalFailures = factors.filter((f) => f.critical && !f.passed);
  const gatePassed = criticalFailures.length === 0;
  const score = gatePassed ? rawScore : Math.min(rawScore, 89);

  // Flatten failing checks into ranked recommendations (critical first).
  const recommendations = factors
    .flatMap((f) =>
      f.checks
        .filter((c) => !c.passed && c.tip)
        .map((c) => ({ factor: f.key, label: c.label, tip: c.tip as string, critical: f.critical })),
    )
    .sort((a, b) => Number(b.critical) - Number(a.critical));

  return {
    score,
    rawScore,
    gatePassed,
    ...labelFor(score),
    factors,
    criticalFailures,
    recommendations,
  };
}
