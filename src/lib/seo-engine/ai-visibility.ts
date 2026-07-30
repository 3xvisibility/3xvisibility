/**
 * AI Visibility / GEO (Generative Engine Optimization) analysis.
 *
 * Estimates how ready a page is to be read, quoted and cited by AI search
 * engines (AI Overviews, ChatGPT Search, Perplexity, Copilot).
 *
 * Signals that matter for generative engines:
 *  - Structured data (entity grounding)
 *  - Direct question → answer blocks (extractable passages)
 *  - Factual density: numbers, dates, named entities, definitions
 *  - Citation readiness: sources, author/organisation, freshness
 *  - Clear heading hierarchy and self-contained paragraphs
 */

import type { PageSignals } from "./types";

export interface AiVisibilityResult {
  aiVisibility: number;
  geo: number;
  entityCoverage: number;
  citationReadiness: number;
  structuredData: number;
  signals: {
    hasFaqSchema: boolean;
    hasOrganizationSchema: boolean;
    hasArticleOrProductSchema: boolean;
    hasBreadcrumbs: boolean;
    questionHeadings: number;
    answerParagraphs: number;
    statCount: number;
    hasAuthorOrOrg: boolean;
    hasOutboundCitations: boolean;
    hasDates: boolean;
    selfContainedRatio: number;
  };
  recommendations: string[];
}

function typesOf(jsonLd: Record<string, unknown>[]): string[] {
  const out: string[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    const type = record["@type"];
    if (typeof type === "string") out.push(type);
    else if (Array.isArray(type)) out.push(...type.filter((t): t is string => typeof t === "string"));
    for (const value of Object.values(record)) {
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === "object") walk(value);
    }
  };
  jsonLd.forEach(walk);
  return out;
}

export function analyzeAiVisibility(
  signals: PageSignals,
  opts?: { entityCoverageScore?: number },
): AiVisibilityResult {
  const types = typesOf(signals.jsonLd).map((t) => t.toLowerCase());

  const hasFaqSchema = types.includes("faqpage") || types.includes("qapage");
  const hasOrganizationSchema =
    types.includes("organization") || types.includes("localbusiness") || types.includes("person");
  const hasArticleOrProductSchema = types.some((t) =>
    ["article", "blogposting", "newsarticle", "product", "service", "webpage", "howto"].includes(t),
  );
  const hasBreadcrumbs = types.includes("breadcrumblist");

  const questionHeadings = signals.headings.filter(
    (h) => /\?$/.test(h.text) || /^(what|why|how|when|where|who|which|can|does|is|are)\b/i.test(h.text),
  ).length;

  // Paragraphs that directly answer in the first sentence and stand alone.
  const answerParagraphs = signals.paragraphs.filter((p) => {
    const words = p.split(/\s+/).length;
    return words >= 25 && words <= 120;
  }).length;

  const statCount = (signals.text.match(/\b\d+([.,]\d+)?\s?(%|percent|€|\$|£|kg|km|hrs?|hours?|days?|years?|\+)/gi) || [])
    .length;
  const hasDates = /\b(19|20)\d{2}\b/.test(signals.text);
  const hasAuthorOrOrg =
    hasOrganizationSchema ||
    /\b(author|written by|par|von|reviewed by|about us|our team)\b/i.test(signals.text);
  const hasOutboundCitations = signals.links.some((l) => !l.internal && !l.nofollow);
  const selfContainedRatio = signals.paragraphs.length
    ? answerParagraphs / signals.paragraphs.length
    : 0;

  // ── structured data score ────────────────────────────────────────────────
  let structuredData = 0;
  if (signals.jsonLd.length) structuredData += 30;
  if (hasArticleOrProductSchema) structuredData += 25;
  if (hasOrganizationSchema) structuredData += 20;
  if (hasFaqSchema) structuredData += 15;
  if (hasBreadcrumbs) structuredData += 10;
  structuredData = Math.min(100, structuredData);

  // ── citation readiness ───────────────────────────────────────────────────
  let citationReadiness = 20;
  if (hasAuthorOrOrg) citationReadiness += 20;
  if (hasOutboundCitations) citationReadiness += 20;
  if (statCount >= 3) citationReadiness += 20;
  else if (statCount >= 1) citationReadiness += 10;
  if (hasDates) citationReadiness += 10;
  if (signals.wordCount >= 600) citationReadiness += 10;
  citationReadiness = Math.min(100, citationReadiness);

  // ── GEO (extractability by generative engines) ───────────────────────────
  let geo = 0;
  geo += Math.min(30, questionHeadings * 8);
  geo += Math.min(25, Math.round(selfContainedRatio * 50));
  geo += hasFaqSchema ? 20 : signals.hasFaqBlock ? 10 : 0;
  geo += signals.headings.some((h) => h.level === 1) ? 10 : 0;
  geo += signals.headings.filter((h) => h.level === 2).length >= 3 ? 15 : 5;
  geo = Math.min(100, geo);

  const entityCoverage = opts?.entityCoverageScore ?? 50;

  const aiVisibility = Math.round(
    geo * 0.3 + structuredData * 0.25 + citationReadiness * 0.25 + entityCoverage * 0.2,
  );

  const recommendations: string[] = [];
  if (!hasFaqSchema) recommendations.push("Add FAQPage structured data with 3–6 real questions.");
  if (!hasOrganizationSchema)
    recommendations.push("Add Organization / LocalBusiness schema so AI engines can ground the entity.");
  if (questionHeadings < 3)
    recommendations.push("Use question-form H2/H3 headings — generative engines extract those passages.");
  if (statCount < 3)
    recommendations.push("Add concrete figures (prices, timeframes, percentages) — AI answers prefer citable facts.");
  if (!hasOutboundCitations)
    recommendations.push("Cite at least one authoritative external source to raise citation trust.");
  if (selfContainedRatio < 0.3)
    recommendations.push("Rewrite paragraphs to answer in the first sentence and stand alone (25–120 words).");
  if (!hasBreadcrumbs) recommendations.push("Add BreadcrumbList schema to clarify site context.");

  return {
    aiVisibility,
    geo,
    entityCoverage,
    citationReadiness,
    structuredData,
    signals: {
      hasFaqSchema,
      hasOrganizationSchema,
      hasArticleOrProductSchema,
      hasBreadcrumbs,
      questionHeadings,
      answerParagraphs,
      statCount,
      hasAuthorOrOrg,
      hasOutboundCitations,
      hasDates,
      selfContainedRatio: Math.round(selfContainedRatio * 100) / 100,
    },
    recommendations,
  };
}
