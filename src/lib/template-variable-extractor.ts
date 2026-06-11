import { filterDesignVars } from "@/lib/design-vars-filter";

export interface ExtractedTemplateVariable {
  name: string;
  original: string;
  values: string[];
}

const GENERIC_TEXT = /^(read more|learn more|contact us|get started|submit|next|previous|home|about|services|blog|news|events|menu|search|login|sign up|cancel|save)$/i;

function stripTags(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
}

function normalizeName(value: string, fallback: string) {
  const cleaned = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_")
    .slice(0, 42);
  return cleaned || fallback;
}

function preserveBlocks(html: string) {
  const blocks: string[] = [];
  const safe = html.replace(/<(style|script|svg)[\s\S]*?<\/\1>/gi, (match) => {
    const token = `__PGP_KEEP_BLOCK_${blocks.length}__`;
    blocks.push(match);
    return token;
  });
  return {
    safe,
    restore: (value: string) => value.replace(/__PGP_KEEP_BLOCK_(\d+)__/g, (_, idx) => blocks[Number(idx)] || ""),
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build a regex that tolerates whitespace/newline/entity differences between the
 * normalized `original` text (what the extractor stored) and the raw HTML.
 * Each run of whitespace in the original becomes `(?:\s|&nbsp;|<[^>]+>)+` so that
 * collapsed spacing, line breaks, &nbsp; and simple inline tags still match.
 */
function buildFlexibleMatcher(original: string): RegExp | null {
  const trimmed = original.trim();
  if (!trimmed) return null;
  const pattern = trimmed
    .split(/\s+/)
    .map(escapeRegExp)
    .join("(?:\\s|&nbsp;|&#160;|<[^>]+>)+");
  try {
    return new RegExp(pattern, "g");
  } catch {
    return null;
  }
}

function replaceLiteralOutsidePreservedBlocks(html: string, original: string, replacement: string) {
  if (!original.trim() || original === replacement) return html;
  const { safe, restore } = preserveBlocks(html);

  // Fast path: exact literal match.
  if (safe.includes(original)) {
    return restore(safe.split(original).join(replacement));
  }

  // Fallback: whitespace/entity/inline-tag tolerant match so normalized text
  // still maps onto the raw HTML it was extracted from.
  const matcher = buildFlexibleMatcher(original);
  if (!matcher) return html;
  let replaced = false;
  const next = safe.replace(matcher, () => {
    replaced = true;
    return replacement;
  });
  return replaced ? restore(next) : html;
}

export function applyTemplateVariables(html: string, variables: ExtractedTemplateVariable[]) {
  return [...variables]
    .filter((v) => v.original && v.name)
    .sort((a, b) => b.original.length - a.original.length)
    .reduce((next, v) => replaceLiteralOutsidePreservedBlocks(next, v.original, `{${v.name}}`), html);
}

export function autoExtractTemplateVariables(html: string, pageTitle = "", preferredNames: string[] = []): ExtractedTemplateVariable[] {
  const vars: ExtractedTemplateVariable[] = [];
  const seenOriginal = new Set<string>();
  const usedNames = new Set<string>();

  const add = (name: string, original: string) => {
    const text = stripTags(original);
    if (!text || text.length < 3 || text.length > 180) return;
    if (/^https?:\/\//i.test(text) || /\{[a-zA-Z_][a-zA-Z0-9_]*\}/.test(text)) return;
    if (GENERIC_TEXT.test(text)) return;
    if (seenOriginal.has(text.toLowerCase())) return;
    let cleanName = normalizeName(name, `field_${vars.length + 1}`);
    if (filterDesignVars([cleanName]).length === 0) cleanName = `field_${vars.length + 1}`;
    let uniqueName = cleanName;
    let suffix = 2;
    while (usedNames.has(uniqueName)) uniqueName = `${cleanName}_${suffix++}`;
    seenOriginal.add(text.toLowerCase());
    usedNames.add(uniqueName);
    vars.push({ name: uniqueName, original: text, values: [text] });
  };

  const titleText = stripTags(pageTitle);
  if (titleText && html.includes(titleText)) add("page_title", titleText);

  const companyMatch = titleText.match(/(?:from|by|at|for)\s+([A-Z][\w& .'-]{2,60})$/i);
  if (companyMatch && html.includes(companyMatch[1])) add("company_name", companyMatch[1]);

  for (const keyword of preferredNames) {
    const clean = normalizeName(keyword, "keyword");
    const candidate = stripTags(keyword);
    if (candidate && html.includes(candidate)) add(clean, candidate);
  }

  const textBlockRe = /<(h1|h2|h3|h4|p|li|figcaption|blockquote|span|a)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  const counters: Record<string, number> = {};
  while ((match = textBlockRe.exec(html)) && vars.length < 14) {
    const tag = match[1].toLowerCase();
    const text = stripTags(match[3]);
    if (!text || text.length < 4 || text.length > 160) continue;
    if (GENERIC_TEXT.test(text)) continue;
    counters[tag] = (counters[tag] || 0) + 1;
    const base = tag === "h1" ? "headline" : tag === "h2" ? "section_title" : tag === "h3" || tag === "h4" ? "card_title" : tag === "p" ? "description" : "text";
    add(counters[tag] === 1 ? base : `${base}_${counters[tag]}`, text);
  }

  return vars;
}