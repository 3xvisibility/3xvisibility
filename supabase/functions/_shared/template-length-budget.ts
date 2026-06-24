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
  if (words <= 1) return { minWords: 1, maxWords: 1 };
  if (words <= 3) return { minWords: Math.max(1, words - 1), maxWords: words + 1 };
  if (words <= 8) return { minWords: Math.max(2, words - 2), maxWords: words + 2 };
  return { minWords: Math.max(3, Math.round(words * 0.85)), maxWords: words + 3 };
}

function charCapForValue(value: string, maxWords: number): number {
  const originalChars = stripHtml(value).length;
  const words = stripHtml(value).split(/\s+/).filter(Boolean);
  const avgWordLength = words.length > 0 ? originalChars / words.length : 7;
  const tinyTolerance = Math.ceil(avgWordLength * Math.min(3, Math.max(0, maxWords - words.length)));
  return Math.max(8, originalChars + tinyTolerance);
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
  return out;
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

export function inferInlineBudgetForHtmlToken(content: string, token: string): LengthBudget | null {
  if (!content || !token) return null;
  const index = content.indexOf(token);
  if (index < 0) return null;

  const before = content.slice(0, index);
  const tagMatch = before.match(/<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>(?:[^<]*)$/);
  const tag = (tagMatch?.[1] || "p").toLowerCase();
  const { maxWords, maxChars } = budgetForTag(tag);

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
  return out;
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
    out[k] = typeof v === "string" ? enforceBudget(v, budget[k]) : v;
  }
  return out;
}
