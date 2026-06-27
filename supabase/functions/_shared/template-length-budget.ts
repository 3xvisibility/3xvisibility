// Template-Aware Content Generation: length budgets.
//
// Derives per-variable length constraints from a template's *original* sample
// content (the defaultValues that ship with each template) so AI-generated
// content fits the existing layout. Enforces a hard cap at the original length
// plus a tiny 2-3 word tolerance ("design integrity > content length").

export interface LengthBudget {
  /** Original word count of the sample value. */
  words: number;
  /** Allowed word range [min, max]. */
  minWords: number;
  maxWords: number;
  /** Character limits: floor, recommended target, and hard cap. */
  minChars: number;
  recommendedChars: number;
  maxChars: number;
}

export type BudgetMap = Record<string, LengthBudget>;

// ============================================================================
// Hard per-field caps (provider-independent). Derived from the field's *role*,
// detected by its variable name. The final budget is the STRICTER of these caps
// and the original-length (±10%) budget, so every AI provider converges to the
// same template-safe lengths.
// ============================================================================

export interface FieldCap {
  maxChars?: number;
  maxWords?: number;
  /** numeric only (counters) */
  numeric?: boolean;
  /** must stay on a single line */
  singleLine?: boolean;
}

/** Returns a hard cap based on a field's name, or null if no rule matches. */
export function capForFieldName(name: string): FieldCap | null {
  const n = name.toLowerCase();
  if (/(counter|count|number|stat|metric|years?|percent)/.test(n)) return { numeric: true };
  if (/(button|btn|cta_label|cta_button|link_text|action)/.test(n)) return { maxWords: 4, singleLine: true };
  if (/(hero).*(title|heading|head)|(title|heading).*(hero)/.test(n)) return { maxChars: 35, singleLine: true };
  if (/(feature).*(title|name|head)/.test(n)) return { maxWords: 5, singleLine: true };
  if (/(faq).*(question|q)\b|question/.test(n)) return { singleLine: true };
  if (/(cta).*(title|heading|head)/.test(n)) return { maxChars: 45, singleLine: true };
  if (/(small|sub).*(title|heading|head)|tagline|eyebrow|label/.test(n)) return { maxChars: 30, singleLine: true };
  if (/(section).*(title|heading|head)|^heading|_heading$|(^|_)title($|_)/.test(n)) return { maxChars: 45, singleLine: true };
  return null;
}

/** Merge a hard FieldCap into an existing LengthBudget, keeping the stricter side. */
function applyCap(b: LengthBudget, cap: FieldCap): LengthBudget {
  const out = { ...b };
  if (cap.maxChars != null) {
    out.maxChars = Math.min(out.maxChars, cap.maxChars);
    out.recommendedChars = Math.min(out.recommendedChars, cap.maxChars);
    out.minChars = Math.min(out.minChars, out.maxChars);
  }
  if (cap.maxWords != null) {
    out.maxWords = Math.min(out.maxWords, cap.maxWords);
    out.minWords = Math.min(out.minWords, out.maxWords);
  }
  if (cap.singleLine) {
    out.maxWords = Math.min(out.maxWords, Math.max(out.words, out.minWords));
  }
  return out;
}

/** Apply name-based hard caps across an entire budget map. */
export function applyFieldCaps(budget: BudgetMap): BudgetMap {
  const out: BudgetMap = {};
  for (const [k, b] of Object.entries(budget)) {
    const cap = capForFieldName(k);
    out[k] = cap ? applyCap(b, cap) : b;
  }
  return out;
}

const stripHtml = (s: string): string => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export function countWords(s: string): number {
  const t = stripHtml(s);
  return t ? t.split(/\s+/).length : 0;
}

/**
 * Build an allowed word range around the original. Design integrity is strict:
 * generated text may never exceed the original word count by more than 3 words,
 * regardless of field size, so the template layout never breaks.
 */
function rangeForWords(words: number): { minWords: number; maxWords: number } {
  // Strict: generated text must fit the SAME word count as the template.
  // The max NEVER exceeds the original word count, so the layout/design is
  // preserved exactly and long descriptions can't break the hero/section.
  if (words <= 1) return { minWords: 1, maxWords: 1 };
  if (words <= 8) return { minWords: Math.max(1, words - 1), maxWords: words };
  return { minWords: Math.max(3, Math.round(words * 0.85)), maxWords: words };
}

function charCapForValue(value: string, _maxWords: number): number {
  // Hard cap at the original character length — no tolerance. Generated content
  // must occupy the same footprint as the template sample.
  const originalChars = stripHtml(value).length;
  return Math.max(8, originalChars);
}

/**
 * Compute a length budget per variable from the template's sample values.
 * Keys are bare variable names (no braces).
 */
export function analyzeTemplateBudget(defaultValues?: Record<string, string>): BudgetMap {
  const out: BudgetMap = {};
  if (!defaultValues) return out;
  for (const [rawKey, value] of Object.entries(defaultValues)) {
    if (typeof value !== "string" || !value.trim()) continue;
    const key = rawKey.replace(/^\{|\}$/g, "");
    const words = countWords(value);
    const { minWords, maxWords } = rangeForWords(words);
    const originalChars = stripHtml(value).length;
    out[key] = {
      words,
      minWords,
      maxWords,
      minChars: Math.max(1, Math.floor(originalChars * 0.8)),
      recommendedChars: originalChars,
      maxChars: charCapForValue(value, maxWords),
    };
  }
  return applyFieldCaps(out);
}

/**
 * Fallback analyzer: when a template ships no sample values, derive a per-variable
 * budget from the template HTML by inspecting the element that encloses each
 * `{variable}` placeholder. Headings, buttons, paragraphs etc. each get a
 * sensible word/char budget so generated content keeps the original proportions.
 */
function budgetForTag(tag: string): { maxWords: number; maxChars: number } {
  switch (tag) {
    case "h1": return { maxWords: 8, maxChars: 58 };
    case "h2": return { maxWords: 7, maxChars: 52 };
    case "h3": return { maxWords: 6, maxChars: 46 };
    case "h4":
    case "h5":
    case "h6": return { maxWords: 5, maxChars: 40 };
    case "button":
    case "a": return { maxWords: 4, maxChars: 28 };
    case "li": return { maxWords: 12, maxChars: 90 };
    case "span":
    case "strong":
    case "em": return { maxWords: 6, maxChars: 46 };
    case "p":
    case "div": return { maxWords: 18, maxChars: 140 };
    default: return { maxWords: 14, maxChars: 110 };
  }
}

/**
 * Detect whether a placeholder sits inside a hero/banner-type section.
 * Hero copy is the most design-constrained area: an over-long description
 * pushes the layout apart, so we clamp it harder than a generic paragraph.
 */
function isInHeroContext(before: string): boolean {
  // Look only at the nearest ~600 chars of opening markup before the token.
  const scope = before.slice(-600).toLowerCase();
  return /\b(hero|banner|jumbotron|masthead|page-header|cover|intro-section)\b/.test(scope);
}

export function inferInlineBudgetForHtmlToken(content: string, token: string): LengthBudget | null {
  if (!content || !token) return null;
  const index = content.indexOf(token);
  if (index < 0) return null;

  const before = content.slice(0, index);
  const tagMatch = before.match(/<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>(?:[^<]*)$/);
  const tag = (tagMatch?.[1] || "p").toLowerCase();
  let { maxWords, maxChars } = budgetForTag(tag);

  // Hero/banner description: allow a fuller paragraph but never more than
  // ~5 lines, so the section height stays close to the template.
  if (isInHeroContext(before) && (tag === "p" || tag === "div" || tag === "span")) {
    maxWords = Math.min(Math.max(maxWords, 45), 45); // up to ~5 lines
    maxChars = Math.min(Math.max(maxChars, 320), 320);
  }

  return {
    words: maxWords,
    minWords: 1,
    maxWords,
    minChars: 1,
    recommendedChars: Math.max(8, Math.round(maxChars * 0.85)),
    maxChars,
  };
}

export function analyzeTemplateContentBudget(content?: string): BudgetMap {
  const out: BudgetMap = {};
  if (!content || typeof content !== "string") return out;
  const tokenRe = /\{([a-zA-Z0-9_.-]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(content)) !== null) {
    const key = m[1].replace(/^\{|\}$/g, "");
    if (out[key]) continue;
    const inferred = inferInlineBudgetForHtmlToken(content, m[0]);
    if (inferred) out[key] = inferred;
  }
  return applyFieldCaps(out);
}

/** Human-readable per-field hints injected into the generation prompt. */

export function buildBudgetPromptHints(budget: BudgetMap): string {
  const lines = Object.entries(budget).map(
    ([k, b]) => `- ${k}: ${b.minWords}-${b.maxWords} words; characters min ${b.minChars}, recommended ~${b.recommendedChars}, max ${b.maxChars}`,
  );
  if (lines.length === 0) return "";
  return `Strict length limits per field — generated text MUST fit the template layout. Match the original template word count; never exceed the listed max words/chars:\n${lines.join("\n")}`;
}

/**
 * Design protection: shorten a value to its budget at a word boundary, never
 * exceeding maxChars. Preserves meaning by keeping the leading words.
 */
export function enforceBudget(value: string, budget?: LengthBudget): string {
  if (!budget) return value;
  let text = value.trim();

  // Word cap.
  const words = text.split(/\s+/);
  if (words.length > budget.maxWords) {
    text = words.slice(0, budget.maxWords).join(" ");
  }

  // Hard character cap (120%).
  if (text.length > budget.maxChars) {
    const clipped = text.slice(0, budget.maxChars);
    const lastSpace = clipped.lastIndexOf(" ");
    text = (lastSpace > budget.maxChars * 0.6 ? clipped.slice(0, lastSpace) : clipped).trim();
  }

  return text.replace(/[\s,;:.\-]+$/, "").trim() || value.trim();
}

/** Apply budgets to every field of a generated row. */
export function enforceRowBudget(row: Record<string, string>, budget: BudgetMap): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    if (typeof v !== "string") { out[k] = v; continue; }
    const cap = capForFieldName(k);
    // Counters: keep digits/symbols only, drop prose.
    if (cap?.numeric) {
      const num = (stripHtml(v).match(/[\d.,%+\-]+/g)?.[0]) ?? stripHtml(v).trim();
      out[k] = num || v;
      continue;
    }
    out[k] = enforceBudget(v, budget[k]);
  }
  return out;
}
