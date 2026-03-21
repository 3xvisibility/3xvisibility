/**
 * US24 — Extensible SEO Rules Engine
 *
 * A pluggable system for validating generated page SEO quality.
 * Rules can be added/removed dynamically and are evaluated per-page.
 */

export interface SeoRuleContext {
  title: string;
  slug: string;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string | null;
  content: string;
  jsonLd: string;
  /** All titles in the current campaign (for uniqueness checks) */
  campaignTitles?: string[];
  /** All slugs in the current campaign (for uniqueness checks) */
  campaignSlugs?: string[];
}

export interface SeoRuleResult {
  id: string;
  label: string;
  passed: boolean;
  severity: "error" | "warning" | "info";
  tip: string;
}

export interface SeoRule {
  id: string;
  label: string;
  severity: "error" | "warning" | "info";
  /** Return true if the rule passes */
  check: (ctx: SeoRuleContext) => boolean;
  tip: string;
}

// ─── Built-in rules ────────────────────────────────────────────

const builtInRules: SeoRule[] = [
  {
    id: "has-title",
    label: "Page has a title",
    severity: "error",
    check: (ctx) => (ctx.title || "").trim().length > 0,
    tip: "Every page must have a title.",
  },
  {
    id: "title-length",
    label: "SEO title ≤ 60 chars",
    severity: "warning",
    check: (ctx) => (ctx.seoTitle || "").length <= 60,
    tip: "Keep SEO titles under 60 characters for search results.",
  },
  {
    id: "desc-length",
    label: "Meta description 50–160 chars",
    severity: "warning",
    check: (ctx) => {
      const len = (ctx.seoDescription || "").length;
      return len >= 50 && len <= 160;
    },
    tip: "Meta descriptions should be 50–160 characters.",
  },
  {
    id: "slug-clean",
    label: "Clean slug (lowercase, no accents)",
    severity: "error",
    check: (ctx) => /^[a-z0-9][a-z0-9\-/]*[a-z0-9]$/.test(ctx.slug) || ctx.slug.length <= 2,
    tip: "Slugs must be lowercase with hyphens only.",
  },
  {
    id: "has-canonical",
    label: "Canonical URL set",
    severity: "warning",
    check: (ctx) => !!ctx.canonicalUrl,
    tip: "Set a canonical URL to prevent duplicate content issues.",
  },
  {
    id: "has-json-ld",
    label: "JSON-LD structured data present",
    severity: "info",
    check: (ctx) => ctx.jsonLd.includes("application/ld+json"),
    tip: "Add structured data for rich search results.",
  },
  {
    id: "has-h1",
    label: "Contains H1 heading",
    severity: "warning",
    check: (ctx) => /<h1[^>]*>/i.test(ctx.content),
    tip: "Each page should have exactly one H1 heading.",
  },
  {
    id: "unique-title",
    label: "Unique title within campaign",
    severity: "error",
    check: (ctx) => {
      if (!ctx.campaignTitles) return true;
      const count = ctx.campaignTitles.filter(
        (t) => t.toLowerCase() === ctx.title.toLowerCase()
      ).length;
      return count <= 1;
    },
    tip: "Duplicate titles hurt SEO. Ensure each page has a unique title.",
  },
  {
    id: "unique-slug",
    label: "Unique slug within campaign",
    severity: "error",
    check: (ctx) => {
      if (!ctx.campaignSlugs) return true;
      const count = ctx.campaignSlugs.filter(
        (s) => s.toLowerCase() === ctx.slug.toLowerCase()
      ).length;
      return count <= 1;
    },
    tip: "Duplicate slugs cause URL conflicts. Ensure each page has a unique slug.",
  },
  {
    id: "content-length",
    label: "Content has 100+ characters",
    severity: "warning",
    check: (ctx) => {
      const plain = ctx.content.replace(/<[^>]*>/g, "").trim();
      return plain.length >= 100;
    },
    tip: "Thin content performs poorly in search results.",
  },
];

// ─── Registry ──────────────────────────────────────────────────

let customRules: SeoRule[] = [];

/** Register a custom SEO rule */
export function registerSeoRule(rule: SeoRule): void {
  customRules.push(rule);
}

/** Remove a custom SEO rule by ID */
export function unregisterSeoRule(id: string): void {
  customRules = customRules.filter((r) => r.id !== id);
}

/** Get all active rules (built-in + custom) */
export function getAllRules(): SeoRule[] {
  return [...builtInRules, ...customRules];
}

/** Validate a page against all SEO rules */
export function validateSeoRules(ctx: SeoRuleContext): SeoRuleResult[] {
  return getAllRules().map((rule) => ({
    id: rule.id,
    label: rule.label,
    passed: rule.check(ctx),
    severity: rule.severity,
    tip: rule.tip,
  }));
}

/** Quick pass/fail summary */
export function getSeoRuleSummary(results: SeoRuleResult[]) {
  const errors = results.filter((r) => !r.passed && r.severity === "error");
  const warnings = results.filter((r) => !r.passed && r.severity === "warning");
  const passed = results.filter((r) => r.passed);
  return { errors, warnings, passed, total: results.length };
}
