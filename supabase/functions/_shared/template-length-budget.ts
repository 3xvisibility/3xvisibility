// Template-Aware Content Generation: length budgets.
//
// Derives per-variable length constraints from a template's *original* sample
// content (the defaultValues that ship with each template) so AI-generated
// content fits the existing layout. Enforces a hard cap of 120% of the original
// length ("design integrity > content length").

export interface LengthBudget {
  /** Original word count of the sample value. */
  words: number;
  /** Allowed word range [min, max]. */
  minWords: number;
  maxWords: number;
  /** Hard character cap = 120% of original length (design protection). */
  maxChars: number;
}

export type BudgetMap = Record<string, LengthBudget>;

const stripHtml = (s: string): string => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export function countWords(s: string): number {
  const t = stripHtml(s);
  return t ? t.split(/\s+/).length : 0;
}

/** Build an allowed word range around the original, scaled to field size. */
function rangeForWords(words: number): { minWords: number; maxWords: number } {
  if (words <= 2) return { minWords: 1, maxWords: words + 2 };
  if (words <= 4) return { minWords: Math.max(2, words - 1), maxWords: words + 2 };
  if (words <= 8) return { minWords: Math.max(3, words - 2), maxWords: words + 3 };
  if (words <= 20) return { minWords: Math.max(8, Math.round(words * 0.75)), maxWords: Math.round(words * 1.2) };
  return { minWords: Math.round(words * 0.8), maxWords: Math.round(words * 1.2) };
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
      maxChars: Math.max(8, Math.ceil(originalChars * 1.2)),
    };
  }
  return out;
}

/** Human-readable per-field hints injected into the generation prompt. */
export function buildBudgetPromptHints(budget: BudgetMap): string {
  const lines = Object.entries(budget).map(
    ([k, b]) => `- ${k}: ${b.minWords}-${b.maxWords} words (max ${b.maxChars} characters)`,
  );
  if (lines.length === 0) return "";
  return `Strict length limits per field — generated text MUST fit the template layout. Never exceed 120% of the original length:\n${lines.join("\n")}`;
}

/**
 * Design protection: shorten a value to its budget at a word boundary, never
 * exceeding maxChars (120% cap). Preserves meaning by keeping the leading words.
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
