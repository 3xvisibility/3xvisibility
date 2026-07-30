/**
 * Shared SEO Engine — public entry point.
 *
 * Usage from any module:
 *
 *   import { runSeoEngine } from "@/lib/seo-engine";
 *
 *   const report = runSeoEngine({ html, seoTitle, seoDescription, focusKeyword });
 *   report.scores.seo;        // composite score
 *   report.fixable;           // one-click fixable findings
 *
 * Pure and synchronous — safe in the browser, in tests and in edge functions.
 */

import { getAnalyzers, registerAnalyzer, runAnalyzers } from "./analyzers.ts";
import { extractSignals } from "./extract.ts";
import type { EngineScores, SeoEngineInput, SeoEngineReport, SeoFinding } from "./types.ts";

export * from "./types.ts";
export { extractSignals, stripHtml, tokenize } from "./extract.ts";
export { analyzeReadability } from "./readability.ts";
export { analyzeKeywords, analyzeEntities, extractSemanticTerms } from "./keywords.ts";
export { suggestInternalLinks, applyInternalLinks } from "./internal-links.ts";
export type { InternalLinkSuggestion } from "./internal-links.ts";
export { analyzeAiVisibility } from "./ai-visibility.ts";
export { registerAnalyzer, getAnalyzers };

const DEFAULT_SCORES: EngineScores = {
  seo: 0,
  content: 50,
  readability: 50,
  keywords: 50,
  entityCoverage: 50,
  structuredData: 0,
  technical: 50,
  performance: null,
  aiVisibility: 0,
  geo: 0,
  citationReadiness: 0,
  mobile: 100,
};

const SEVERITY_PENALTY: Record<SeoFinding["severity"], number> = {
  critical: 9,
  warning: 4,
  info: 1,
  pass: 0,
};

function gradeFor(score: number): SeoEngineReport["grade"] {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 65) return "C";
  if (score >= 50) return "D";
  return "F";
}

export function runSeoEngine(input: SeoEngineInput): SeoEngineReport {
  const signals = extractSignals(input.html || "", { url: input.url });
  const results = runAnalyzers(signals, input);

  const scores: EngineScores = { ...DEFAULT_SCORES };
  const findings: SeoFinding[] = [];
  const details: Record<string, unknown> = {};

  for (const result of results) {
    findings.push(...result.findings);
    if (result.details) Object.assign(details, result.details);
    for (const [key, value] of Object.entries(result.scores ?? {})) {
      if (value === undefined) continue;
      (scores as unknown as Record<string, unknown>)[key] = value;
    }
  }

  // Composite SEO score: start from the pillars, then subtract issue penalties.
  const pillars =
    scores.content * 0.2 +
    scores.keywords * 0.25 +
    scores.readability * 0.15 +
    scores.technical * 0.2 +
    scores.structuredData * 0.1 +
    scores.entityCoverage * 0.1;

  const penalty = findings.reduce((total, finding) => total + SEVERITY_PENALTY[finding.severity], 0);
  scores.seo = Math.max(0, Math.min(100, Math.round(pillars - penalty * 0.6)));

  for (const key of Object.keys(scores) as (keyof EngineScores)[]) {
    const value = scores[key];
    if (typeof value === "number") {
      (scores as unknown as Record<string, number>)[key] = Math.max(0, Math.min(100, Math.round(value)));
    }
  }

  return {
    signals,
    scores,
    findings,
    fixable: findings.filter((f) => f.fixable && f.severity !== "pass"),
    details,
    grade: gradeFor(scores.seo),
  };
}
