/**
 * Lightweight duplicate content detection using trigram similarity.
 * Compares pages pairwise and flags pairs above a similarity threshold.
 */

function extractTrigrams(text: string): Set<string> {
  const clean = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
  const trigrams = new Set<string>();
  for (let i = 0; i <= clean.length - 3; i++) {
    trigrams.add(clean.substring(i, i + 3));
  }
  return trigrams;
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  const smaller = a.size <= b.size ? a : b;
  const larger = a.size > b.size ? a : b;
  for (const item of smaller) {
    if (larger.has(item)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union > 0 ? intersection / union : 0;
}

export interface DuplicatePair {
  pageAId: string;
  pageATitle: string;
  pageBId: string;
  pageBTitle: string;
  similarity: number; // 0-100
}

export interface PageInput {
  id: string;
  title: string;
  content: string;
}

/**
 * Detect duplicate content pairs. Returns pairs with similarity >= threshold.
 * For performance, limits to first 200 pages and uses sampling for large sets.
 */
export function detectDuplicates(
  pages: PageInput[],
  threshold: number = 70
): DuplicatePair[] {
  const limit = Math.min(pages.length, 200);
  const subset = pages.slice(0, limit);

  // Pre-compute trigrams
  const trigrams = subset.map((p) => ({
    ...p,
    trigrams: extractTrigrams(p.content),
  }));

  const pairs: DuplicatePair[] = [];

  for (let i = 0; i < trigrams.length; i++) {
    for (let j = i + 1; j < trigrams.length; j++) {
      const sim = jaccardSimilarity(trigrams[i].trigrams, trigrams[j].trigrams);
      const pct = Math.round(sim * 100);
      if (pct >= threshold) {
        pairs.push({
          pageAId: trigrams[i].id,
          pageATitle: trigrams[i].title,
          pageBId: trigrams[j].id,
          pageBTitle: trigrams[j].title,
          similarity: pct,
        });
      }
    }
  }

  return pairs.sort((a, b) => b.similarity - a.similarity);
}
