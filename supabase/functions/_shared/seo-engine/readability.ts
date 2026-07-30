/**
 * Readability analysis (Flesch Reading Ease + structural readability).
 * Language-tolerant: syllable estimation falls back to vowel-group counting.
 */

import type { PageSignals } from "./types.ts";

export interface ReadabilityResult {
  /** 0–100 Flesch Reading Ease (higher = easier). */
  fleschReadingEase: number;
  /** US grade level. */
  gradeLevel: number;
  avgWordsPerSentence: number;
  avgSyllablesPerWord: number;
  longSentenceRatio: number;
  longParagraphRatio: number;
  passiveHints: number;
  /** 0–100 normalised readability score used by the engine. */
  score: number;
  label: "Very easy" | "Easy" | "Standard" | "Difficult" | "Very difficult";
}

const PASSIVE = /\b(was|were|is|are|been|being|be)\s+\w+(ed|en)\b/gi;

export function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-zà-ÿ]/g, "");
  if (!w) return 0;
  const groups = w.match(/[aeiouyà-öø-ÿ]+/g);
  let count = groups ? groups.length : 1;
  if (w.length > 3 && /e$/.test(w) && count > 1) count -= 1;
  return Math.max(1, count);
}

export function analyzeReadability(signals: PageSignals): ReadabilityResult {
  const sentences = signals.sentences.length || 1;
  const words = signals.wordCount || 1;
  const syllables = signals.words.reduce((sum, w) => sum + countSyllables(w), 0);

  const avgWordsPerSentence = words / sentences;
  const avgSyllablesPerWord = syllables / words;

  const fleschReadingEase = Math.max(
    0,
    Math.min(100, 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord),
  );
  const gradeLevel = Math.max(
    0,
    0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59,
  );

  const longSentences = signals.sentences.filter((s) => s.split(/\s+/).length > 25).length;
  const longParagraphs = signals.paragraphs.filter((p) => p.split(/\s+/).length > 150).length;
  const passiveHints = (signals.text.match(PASSIVE) || []).length;

  const longSentenceRatio = signals.sentences.length ? longSentences / signals.sentences.length : 0;
  const longParagraphRatio = signals.paragraphs.length ? longParagraphs / signals.paragraphs.length : 0;

  let score = fleschReadingEase;
  score -= longSentenceRatio * 25;
  score -= longParagraphRatio * 15;
  if (words > 100) score -= Math.min(10, (passiveHints / (sentences || 1)) * 40);
  score = Math.max(0, Math.min(100, Math.round(score)));

  const label: ReadabilityResult["label"] =
    fleschReadingEase >= 80
      ? "Very easy"
      : fleschReadingEase >= 60
        ? "Easy"
        : fleschReadingEase >= 45
          ? "Standard"
          : fleschReadingEase >= 30
            ? "Difficult"
            : "Very difficult";

  return {
    fleschReadingEase: Math.round(fleschReadingEase),
    gradeLevel: Math.round(gradeLevel * 10) / 10,
    avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
    avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 100) / 100,
    longSentenceRatio: Math.round(longSentenceRatio * 100) / 100,
    longParagraphRatio: Math.round(longParagraphRatio * 100) / 100,
    passiveHints,
    score,
    label,
  };
}
