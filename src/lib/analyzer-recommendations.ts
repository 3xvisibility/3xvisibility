import type { AnalyzerReport, AnalyzerCheckStatus } from "@/lib/analyzer-pdf";

export interface PageRecommendation {
  id: string;
  /** Template / page type name shown to the user. */
  template: string;
  /** Short pitch of what this page does for the site. */
  purpose: string;
  /** Example page titles the generator would produce. */
  examples: string[];
  /** How many pages we suggest generating. */
  suggestedPages: number;
  /** Analyzer check labels this template addresses. */
  fixes: string[];
  priority: "high" | "medium" | "low";
}

interface Blueprint {
  id: string;
  template: string;
  purpose: string;
  examples: (brand: string) => string[];
  /** Analyzer check ids that make this template relevant. */
  triggers: string[];
  pagesFor: (weight: number) => number;
}

const BLUEPRINTS: Blueprint[] = [
  {
    id: "faq",
    template: "FAQ / Answer hub",
    purpose:
      "Question-led pages with FAQ schema so AI assistants and featured snippets can quote you directly.",
    examples: (b) => [`How much does ${b} cost?`, `Is ${b} right for my business?`],
    triggers: ["answers", "schema", "headings"],
    pagesFor: (w) => 3 + w,
  },
  {
    id: "service",
    template: "Service / solution pages",
    purpose:
      "One in-depth page per service with a single keyword-rich H1, structured H2s and internal links.",
    examples: (b) => [`${b} — core service overview`, `Pricing & packages`],
    triggers: ["h1", "headings", "content", "links", "title"],
    pagesFor: (w) => 4 + w * 2,
  },
  {
    id: "location",
    template: "Local landing pages",
    purpose:
      "City- and region-specific pages built from your location database to capture near-me searches.",
    examples: (b) => [`${b} in London`, `${b} in Manchester`],
    triggers: ["content", "links", "entity"],
    pagesFor: (w) => 5 + w * 3,
  },
  {
    id: "comparison",
    template: "Comparison & alternatives",
    purpose:
      "Head-to-head pages that win high-intent queries and give LLMs a clear picture of your positioning.",
    examples: (b) => [`${b} vs. alternatives`, `Best ${b} alternatives`],
    triggers: ["entity", "content", "description"],
    pagesFor: (w) => 2 + w,
  },
  {
    id: "guide",
    template: "Long-form guides",
    purpose:
      "800+ word pillar guides that lift thin-content scores and give internal links somewhere to point.",
    examples: (b) => [`The complete guide to ${b}`, `Getting started checklist`],
    triggers: ["content", "headings", "links"],
    pagesFor: (w) => 2 + w,
  },
  {
    id: "hub",
    template: "Category hub + sitemap page",
    purpose:
      "A crawlable hub that links every page together, then publishes an XML sitemap and pings IndexNow.",
    examples: (b) => [`All ${b} resources`, `Site index`],
    triggers: ["sitemap", "robots", "links", "canonical"],
    pagesFor: () => 1,
  },
  {
    id: "brand",
    template: "Brand / About entity page",
    purpose:
      "An Organization-schema page that makes your brand a recognised entity for AI search engines.",
    examples: (b) => [`About ${b}`, `Why teams choose ${b}`],
    triggers: ["entity", "schema", "og", "title"],
    pagesFor: () => 2,
  },
];

const WEIGHT: Record<AnalyzerCheckStatus, number> = { good: 0, warn: 1, bad: 2 };

/**
 * Turns analyzer findings into a prioritised list of page templates to generate.
 * Pure presentation logic — no network calls.
 */
export function recommendTemplates(report: AnalyzerReport): PageRecommendation[] {
  const checks = report.categories.flatMap((c) => c.checks);
  const byId = new Map(checks.map((c) => [c.id, c]));
  const brand = report.host.replace(/^www\./, "").split(".")[0];
  const brandLabel = brand.charAt(0).toUpperCase() + brand.slice(1);

  const recs = BLUEPRINTS.map((bp) => {
    const hits = bp.triggers
      .map((id) => byId.get(id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c) && c!.status !== "good");
    const weight = hits.reduce((s, c) => s + WEIGHT[c.status], 0);
    if (!hits.length) return null;
    return {
      id: bp.id,
      template: bp.template,
      purpose: bp.purpose,
      examples: bp.examples(brandLabel),
      suggestedPages: bp.pagesFor(Math.min(weight, 4)),
      fixes: hits.map((c) => c.label),
      priority: weight >= 4 ? "high" : weight >= 2 ? "medium" : "low",
      weight,
    } satisfies PageRecommendation & { weight: number };
  }).filter((r): r is PageRecommendation & { weight: number } => r !== null);

  return recs
    .sort((a, b) => b.weight - a.weight || b.suggestedPages - a.suggestedPages)
    .map(({ weight: _weight, ...rest }) => rest);
}

export function totalSuggestedPages(recs: PageRecommendation[]): number {
  return recs.reduce((s, r) => s + r.suggestedPages, 0);
}
