/**
 * Internal-link suggestion engine.
 *
 * Given the current page and a corpus of other pages on the same site, suggests
 * contextual internal links by matching the page's semantic terms and keywords
 * against candidate titles/keywords, and pinpoints the anchor phrase that
 * already exists in the copy (so the fixer never invents new sentences).
 */

import { tokenize } from "./extract";
import type { PageSignals } from "./types";

export interface InternalLinkSuggestion {
  /** Existing phrase in the copy to turn into the anchor. */
  anchor: string;
  targetSlug: string;
  targetTitle: string;
  /** 0–1 relevance. */
  relevance: number;
  reason: string;
}

function overlap(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  const hits = a.filter((t) => setB.has(t)).length;
  return hits / Math.min(a.length, b.length);
}

export function suggestInternalLinks(
  signals: PageSignals,
  corpus: { title: string; slug: string; keywords?: string[] }[] | null | undefined,
  opts?: { currentSlug?: string; max?: number },
): InternalLinkSuggestion[] {
  if (!corpus?.length) return [];

  const existing = new Set(
    signals.links.filter((l) => l.internal).map((l) => l.href.replace(/^\/+|\/+$/g, "")),
  );
  const lowerText = signals.text.toLowerCase();
  const pageTerms = tokenize(signals.text).slice(0, 800);

  const suggestions: InternalLinkSuggestion[] = [];

  for (const page of corpus) {
    const slug = (page.slug || "").replace(/^\/+|\/+$/g, "");
    if (!slug || slug === (opts?.currentSlug || "").replace(/^\/+|\/+$/g, "")) continue;
    if (existing.has(slug)) continue;

    const candidateTerms = tokenize(`${page.title} ${(page.keywords || []).join(" ")}`);
    const relevance = overlap(candidateTerms, pageTerms);
    if (relevance < 0.15) continue;

    // Find an anchor phrase that already exists in the copy.
    const phrases = [page.title, ...(page.keywords || [])]
      .map((p) => (p || "").trim())
      .filter((p) => p.length > 3);
    const anchor = phrases.find((p) => lowerText.includes(p.toLowerCase()));
    if (!anchor) continue;

    suggestions.push({
      anchor,
      targetSlug: `/${slug}`,
      targetTitle: page.title,
      relevance: Math.round(relevance * 100) / 100,
      reason: `"${anchor}" appears in this page and matches "${page.title}"`,
    });
  }

  return suggestions
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, opts?.max ?? 8);
}

/**
 * Applies link suggestions to HTML by wrapping the FIRST plain-text occurrence
 * of each anchor. Never touches markup inside tags, existing links, headings,
 * scripts or styles — so template design is preserved byte-for-byte elsewhere.
 */
export function applyInternalLinks(html: string, suggestions: InternalLinkSuggestion[]): string {
  let output = html;

  for (const suggestion of suggestions) {
    const escaped = suggestion.anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Match only text that is outside of any tag and not already inside an <a>.
    const pattern = new RegExp(`(>[^<]*?)\\b(${escaped})\\b`, "i");

    // Ranges we must never inject into: existing links, scripts/styles, headings.
    const anchorRanges: [number, number][] = [];
    for (const m of output.matchAll(/<a\b[\s\S]*?<\/a>|<(script|style)\b[\s\S]*?<\/\1>|<h[1-3]\b[\s\S]*?<\/h[1-3]>/gi)) {
      anchorRanges.push([m.index ?? 0, (m.index ?? 0) + m[0].length]);
    }

    const match = pattern.exec(output);
    if (!match || match.index === undefined) continue;
    const at = match.index + match[1].length;
    if (anchorRanges.some(([start, end]) => at >= start && at < end)) continue;

    output =
      output.slice(0, at) +
      `<a href="${suggestion.targetSlug}">${match[2]}</a>` +
      output.slice(at + match[2].length);
    replaced = true;
  }

  return output;
}
