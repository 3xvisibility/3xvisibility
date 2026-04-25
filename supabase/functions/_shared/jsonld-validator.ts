/**
 * JSON-LD validator — server-side, non-blocking.
 *
 * Goals:
 *   • Parse every <script type="application/ld+json"> block in a page
 *   • Verify each block is valid JSON
 *   • Verify it looks schema.org compliant (@context + @type + recommended
 *     properties for known types)
 *   • Return structured issues — NEVER throw — so generation continues
 *
 * Pure functions, zero deps. Safe to import from Deno edge functions
 * and from Node/browser tests.
 */

export type JsonLdIssueSeverity = "error" | "warning" | "info";

export interface JsonLdIssue {
  /** Index of the JSON-LD block within the page (0-based) */
  block: number;
  severity: JsonLdIssueSeverity;
  /** Stable code for filtering / grouping */
  code: string;
  /** Human-readable description */
  message: string;
  /** Schema.org @type when known */
  type?: string;
}

export interface JsonLdValidationResult {
  /** Total number of <script type="application/ld+json"> blocks found */
  blocks: number;
  /** Number of blocks that parsed as valid JSON */
  valid: number;
  /** Number of blocks that failed to parse */
  invalid: number;
  /** All issues, empty when content is clean */
  issues: JsonLdIssue[];
  /** Schema.org @type values discovered (for analytics) */
  types: string[];
}

// ─── Schema.org expectations ────────────────────────────────────────
//
// We intentionally keep this list focused on the types our generator
// actually emits (see _shared/seo-meta.ts and generate-pages buildJsonLd).
// Adding a type only requires appending to RECOMMENDED_PROPS — the
// validator is data-driven.

const RECOMMENDED_PROPS: Record<string, string[]> = {
  Article: ["headline", "description"],
  NewsArticle: ["headline", "description"],
  BlogPosting: ["headline", "description"],
  Product: ["name"],
  Service: ["name"],
  LocalBusiness: ["name", "address"],
  Organization: ["name"],
  Person: ["name"],
  FAQPage: ["mainEntity"],
  Question: ["name", "acceptedAnswer"],
  WebPage: ["name"],
  BreadcrumbList: ["itemListElement"],
  Event: ["name", "startDate"],
  Recipe: ["name", "recipeIngredient"],
  HowTo: ["name", "step"],
  Review: ["reviewRating", "author"],
};

const KNOWN_TYPES = new Set(Object.keys(RECOMMENDED_PROPS).concat([
  "WebSite", "Thing", "CreativeWork", "ImageObject", "VideoObject",
  "Offer", "Brand", "Answer", "Rating", "AggregateRating", "PostalAddress",
  "GeoCoordinates", "ContactPoint", "OpeningHoursSpecification", "ListItem",
]));

// ─── Helpers ────────────────────────────────────────────────────────

const SCRIPT_RE =
  /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function isSchemaOrgContext(ctx: unknown): boolean {
  if (typeof ctx === "string") {
    return /schema\.org/i.test(ctx);
  }
  if (Array.isArray(ctx)) {
    return ctx.some(isSchemaOrgContext);
  }
  if (ctx && typeof ctx === "object") {
    const v = (ctx as Record<string, unknown>)["@vocab"];
    return typeof v === "string" && /schema\.org/i.test(v);
  }
  return false;
}

function validateNode(
  node: unknown,
  blockIdx: number,
  issues: JsonLdIssue[],
  types: string[],
  isRoot: boolean,
): void {
  if (!node || typeof node !== "object") {
    if (isRoot) {
      issues.push({
        block: blockIdx,
        severity: "error",
        code: "not-object",
        message: "JSON-LD root must be an object or array of objects.",
      });
    }
    return;
  }

  // Handle @graph: validate each contained node individually
  const graph = (node as Record<string, unknown>)["@graph"];
  if (Array.isArray(graph)) {
    for (const child of graph) validateNode(child, blockIdx, issues, types, false);
  }

  const obj = node as Record<string, unknown>;
  const type = obj["@type"];
  const ctx = obj["@context"];

  if (isRoot && !ctx) {
    issues.push({
      block: blockIdx,
      severity: "error",
      code: "missing-context",
      message: "Root JSON-LD object is missing @context.",
    });
  } else if (isRoot && !isSchemaOrgContext(ctx)) {
    issues.push({
      block: blockIdx,
      severity: "warning",
      code: "non-schema-context",
      message: "@context does not reference schema.org.",
    });
  }

  if (type === undefined) {
    if (isRoot && !graph) {
      issues.push({
        block: blockIdx,
        severity: "error",
        code: "missing-type",
        message: "JSON-LD object is missing @type.",
      });
    }
    return;
  }

  for (const t of asArray(type)) {
    if (typeof t !== "string") {
      issues.push({
        block: blockIdx,
        severity: "error",
        code: "type-not-string",
        message: "@type must be a string or array of strings.",
      });
      continue;
    }
    types.push(t);

    if (!KNOWN_TYPES.has(t) && !RECOMMENDED_PROPS[t]) {
      issues.push({
        block: blockIdx,
        severity: "info",
        code: "unknown-type",
        message: `@type "${t}" is not a commonly indexed schema.org type.`,
        type: t,
      });
    }

    const recommended = RECOMMENDED_PROPS[t];
    if (recommended) {
      for (const prop of recommended) {
        const v = obj[prop];
        if (v === undefined || v === null || (typeof v === "string" && !v.trim())) {
          issues.push({
            block: blockIdx,
            severity: "warning",
            code: "missing-recommended",
            message: `Type "${t}" is missing recommended property "${prop}".`,
            type: t,
          });
        }
      }
    }

    // Type-specific deep checks
    if (t === "FAQPage") {
      const main = asArray(obj.mainEntity);
      if (main.length === 0) {
        issues.push({
          block: blockIdx,
          severity: "error",
          code: "faq-empty",
          message: "FAQPage has no mainEntity questions.",
          type: t,
        });
      }
      for (const q of main) validateNode(q, blockIdx, issues, types, false);
    }

    if (t === "Product") {
      const offers = obj.offers;
      if (offers && typeof offers === "object" && !Array.isArray(offers)) {
        const o = offers as Record<string, unknown>;
        if (o.price !== undefined && o.priceCurrency === undefined) {
          issues.push({
            block: blockIdx,
            severity: "warning",
            code: "offer-missing-currency",
            message: "Product offer has price but no priceCurrency.",
            type: t,
          });
        }
      }
    }

    if (t === "Question") {
      const ans = obj.acceptedAnswer;
      if (ans && typeof ans === "object") {
        const a = ans as Record<string, unknown>;
        if (typeof a.text !== "string" || !a.text.trim()) {
          issues.push({
            block: blockIdx,
            severity: "warning",
            code: "answer-empty",
            message: "Question.acceptedAnswer has no text.",
            type: t,
          });
        }
      }
    }
  }
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Validate every JSON-LD block embedded in an HTML string.
 *
 * Never throws. The worst-case return value is `{ blocks: 0, valid: 0,
 * invalid: 0, issues: [], types: [] }` which the caller can treat as
 * "nothing to flag".
 */
export function validateJsonLdInHtml(html: string): JsonLdValidationResult {
  const result: JsonLdValidationResult = {
    blocks: 0,
    valid: 0,
    invalid: 0,
    issues: [],
    types: [],
  };

  if (!html || typeof html !== "string") return result;

  let match: RegExpExecArray | null;
  let idx = 0;
  // Reset regex state because it's defined at module scope with /g.
  SCRIPT_RE.lastIndex = 0;
  while ((match = SCRIPT_RE.exec(html)) !== null) {
    result.blocks++;
    const raw = (match[1] || "").trim();
    if (!raw) {
      result.invalid++;
      result.issues.push({
        block: idx,
        severity: "error",
        code: "empty-block",
        message: "JSON-LD <script> block is empty.",
      });
      idx++;
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      result.invalid++;
      result.issues.push({
        block: idx,
        severity: "error",
        code: "invalid-json",
        message: `JSON-LD block is not valid JSON: ${(e as Error).message}`,
      });
      idx++;
      continue;
    }

    result.valid++;
    for (const node of asArray(parsed)) {
      validateNode(node, idx, result.issues, result.types, true);
    }
    idx++;
  }

  // De-duplicate types for analytics
  result.types = [...new Set(result.types)];
  return result;
}

/**
 * Compress validation result into a compact object suitable for storage
 * on the page record (small enough to keep many of them in JSONB).
 */
export function summarizeValidation(result: JsonLdValidationResult) {
  const errors = result.issues.filter((i) => i.severity === "error");
  const warnings = result.issues.filter((i) => i.severity === "warning");
  return {
    blocks: result.blocks,
    valid: result.valid,
    invalid: result.invalid,
    types: result.types,
    error_count: errors.length,
    warning_count: warnings.length,
    issues: result.issues.slice(0, 20), // cap to keep payload small
  };
}
