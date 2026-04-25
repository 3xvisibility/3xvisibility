/**
 * Extended SEO analysis — additive scoring covering:
 *   • Content readability (Flesch reading-ease style)
 *   • Heading structure validation (single H1, ordered hierarchy)
 *   • Keyword usage suggestions
 *   • AI / multi-engine readiness (FAQ section, JSON-LD, OG/Twitter, robots)
 *
 * Pure client-side — does not call any API. Designed to NEVER replace the
 * existing scoring; UI surfaces this alongside the original SEO scores.
 */

export interface ExtendedCheck {
  label: string;
  passed: boolean;
  tip?: string;
  /** Optional numeric weight used in the composite score. Defaults to 1. */
  weight?: number;
}

export interface ExtendedAnalysis {
  /** Composite 0–100 score across all extended checks. */
  score: number;
  readability: {
    score: number;          // 0–100 (Flesch reading ease, clamped)
    grade: string;          // e.g. "Easy", "Medium", "Hard"
    sentences: number;
    words: number;
    avgWordsPerSentence: number;
  };
  headings: {
    h1Count: number;
    h2Count: number;
    h3Count: number;
    orderOk: boolean;       // no skipped levels
  };
  keywords: {
    primary: string | null;
    densityPct: number;     // 0–100
    inTitle: boolean;
    inDescription: boolean;
    inH1: boolean;
    suggestions: string[];
  };
  checks: ExtendedCheck[];
}

const STOP_WORDS = new Set([
  "the","a","an","and","or","but","of","in","on","at","to","for","with","by",
  "is","are","was","were","be","been","being","this","that","these","those",
  "it","its","as","from","you","your","we","our","they","their","i","my","me",
  "le","la","les","de","des","du","et","ou","un","une","est","sont","pour",
  "der","die","das","und","oder","ein","eine","ist","sind","von","mit","im",
  "el","los","las","y","o","es","son","para","por","con",
]);

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const cleaned = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
                   .replace(/^y/, "");
  const matches = cleaned.match(/[aeiouy]{1,2}/g);
  return Math.max(1, matches?.length ?? 1);
}

/** Flesch Reading Ease normalised to 0–100. */
function fleschReadingEase(text: string) {
  const sentences = (text.match(/[.!?]+/g) || []).length || 1;
  const wordList = text.split(/\s+/).filter(Boolean);
  const words = wordList.length;
  const syllables = wordList.reduce((sum, w) => sum + countSyllables(w), 0);
  if (words === 0) return { score: 0, sentences, words, syllables, asl: 0, asw: 0 };
  const asl = words / sentences;
  const asw = syllables / words;
  // Standard Flesch formula
  const raw = 206.835 - 1.015 * asl - 84.6 * asw;
  const clamped = Math.max(0, Math.min(100, raw));
  return { score: Math.round(clamped), sentences, words, syllables, asl, asw };
}

function gradeFromReadability(score: number): string {
  if (score >= 70) return "Easy";
  if (score >= 50) return "Medium";
  if (score >= 30) return "Hard";
  return "Very hard";
}

function topKeyword(text: string): { term: string; count: number } | null {
  const counts = new Map<string, number>();
  for (const raw of text.toLowerCase().split(/[^a-z0-9'-]+/)) {
    const w = raw.trim();
    if (!w || w.length < 4 || STOP_WORDS.has(w) || /^\d+$/.test(w)) continue;
    counts.set(w, (counts.get(w) || 0) + 1);
  }
  let best: { term: string; count: number } | null = null;
  for (const [term, count] of counts) {
    if (!best || count > best.count) best = { term, count };
  }
  return best && best.count >= 2 ? best : null;
}

function suggestKeywords(text: string, primary: string | null): string[] {
  const counts = new Map<string, number>();
  for (const raw of text.toLowerCase().split(/[^a-z0-9'-]+/)) {
    const w = raw.trim();
    if (!w || w.length < 5 || STOP_WORDS.has(w) || /^\d+$/.test(w)) continue;
    if (primary && w === primary) continue;
    counts.set(w, (counts.get(w) || 0) + 1);
  }
  return Array.from(counts.entries())
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w]) => w);
}

export interface ExtendedAnalysisInput {
  html: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  /** Existing keywords from the page record, if any. */
  seoKeywords?: string[] | null;
}

export function analyzeExtendedSeo(input: ExtendedAnalysisInput): ExtendedAnalysis {
  const html = input.html || "";
  const text = stripHtml(html);
  const flesch = fleschReadingEase(text);

  // Headings
  const h1s = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi) || [];
  const h2s = html.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi) || [];
  const h3s = html.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi) || [];
  const headingOrder = (html.match(/<h([1-6])\b/gi) || []).map((m) => parseInt(m.replace(/<h/i, ""), 10));
  let orderOk = true;
  let lastLevel = 0;
  for (const lvl of headingOrder) {
    if (lastLevel && lvl - lastLevel > 1) { orderOk = false; break; }
    lastLevel = lvl;
  }

  // Keywords
  const primary = topKeyword(text);
  const primaryTerm = primary?.term || null;
  const totalWords = text.split(/\s+/).filter(Boolean).length || 1;
  const densityPct = primary ? Math.round((primary.count / totalWords) * 1000) / 10 : 0;
  const lowerTitle = (input.seoTitle || "").toLowerCase();
  const lowerDesc = (input.seoDescription || "").toLowerCase();
  const firstH1Text = h1s[0] ? stripHtml(h1s[0]).toLowerCase() : "";
  const inTitle = !!primaryTerm && lowerTitle.includes(primaryTerm);
  const inDescription = !!primaryTerm && lowerDesc.includes(primaryTerm);
  const inH1 = !!primaryTerm && firstH1Text.includes(primaryTerm);
  const suggestions = suggestKeywords(text, primaryTerm);

  // AI / multi-engine signals
  const hasFaq = /<h[1-3][^>]*>\s*(faq|frequently asked questions|questions fr[ée]quentes|h[äa]ufig gestellte|preguntas frecuentes)/i.test(html);
  const hasJsonLd = /<script[^>]+application\/ld\+json/i.test(html);
  const hasOg = /<meta[^>]+property\s*=\s*["']og:/i.test(html);
  const hasTwitter = /<meta[^>]+name\s*=\s*["']twitter:/i.test(html);
  const hasRobots = /<meta[^>]+name\s*=\s*["']robots/i.test(html);
  const hasBingbot = /<meta[^>]+name\s*=\s*["']bingbot/i.test(html);
  const hasLangMeta = /<meta[^>]+(?:http-equiv\s*=\s*["']content-language|property\s*=\s*["']og:locale)/i.test(html);

  const checks: ExtendedCheck[] = [
    { label: "Single H1", passed: h1s.length === 1, tip: h1s.length === 0 ? "Add one H1 heading" : "Keep only one H1 per page", weight: 2 },
    { label: "At least 2 H2 sections", passed: h2s.length >= 2, tip: "Add H2 sections to break up the page", weight: 1 },
    { label: "Heading order (no skipped levels)", passed: orderOk, tip: "Don't jump from H2 to H4 — go H2 → H3 → H4", weight: 1 },
    { label: "Readability ≥ 50 (Flesch)", passed: flesch.score >= 50, tip: "Shorter sentences and simpler words improve readability", weight: 2 },
    { label: "Avg sentence ≤ 22 words", passed: flesch.asl <= 22 && flesch.asl > 0, tip: "Break long sentences", weight: 1 },
    { label: "Primary keyword in title", passed: inTitle, tip: primaryTerm ? `Add "${primaryTerm}" to the SEO title` : "Define a primary keyword", weight: 2 },
    { label: "Primary keyword in meta description", passed: inDescription, tip: primaryTerm ? `Mention "${primaryTerm}" in the description` : "—", weight: 1 },
    { label: "Primary keyword in H1", passed: inH1, tip: primaryTerm ? `Use "${primaryTerm}" in the H1 heading` : "—", weight: 1 },
    { label: "Keyword density 0.5%–3%", passed: densityPct >= 0.5 && densityPct <= 3, tip: densityPct > 3 ? "Reduce repetition (keyword stuffing)" : "Use the keyword a few more times naturally", weight: 1 },
    { label: "FAQ section present", passed: hasFaq, tip: "Add a Frequently Asked Questions section — boosts AI/voice search results", weight: 2 },
    { label: "JSON-LD structured data", passed: hasJsonLd, tip: "Schema markup helps Google, Bing, and AI search", weight: 2 },
    { label: "Open Graph tags", passed: hasOg, tip: "Add og:title / og:description for social sharing", weight: 1 },
    { label: "Twitter Card tags", passed: hasTwitter, tip: "Add twitter:card meta tags", weight: 1 },
    { label: "Robots / multi-engine bots", passed: hasRobots && hasBingbot, tip: "Include robots and bingbot meta tags for cross-engine compatibility", weight: 1 },
    { label: "Language meta", passed: hasLangMeta, tip: "Declare page language (content-language or og:locale)", weight: 1 },
  ];

  const totalWeight = checks.reduce((s, c) => s + (c.weight ?? 1), 0);
  const earned = checks.reduce((s, c) => s + (c.passed ? (c.weight ?? 1) : 0), 0);
  const score = Math.round((earned / totalWeight) * 100);

  return {
    score,
    readability: {
      score: flesch.score,
      grade: gradeFromReadability(flesch.score),
      sentences: flesch.sentences,
      words: flesch.words,
      avgWordsPerSentence: Math.round(flesch.asl * 10) / 10,
    },
    headings: {
      h1Count: h1s.length,
      h2Count: h2s.length,
      h3Count: h3s.length,
      orderOk,
    },
    keywords: {
      primary: primaryTerm,
      densityPct,
      inTitle,
      inDescription,
      inH1,
      suggestions,
    },
    checks,
  };
}
