// Visual diff helpers for the Visual Fidelity Rendering & Diff Service.
//
// These run inside the Deno edge runtime *after* screenshots + DOM snapshots
// have been produced by an external render worker. They are pure TS (no DOM,
// no native deps) so they execute anywhere.

export interface DomBox {
  /** Element role/tag, e.g. "h1", "p", "img", "button". */
  tag: string;
  /** Bounding box in CSS px relative to the page. */
  x: number;
  y: number;
  width: number;
  height: number;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  background?: string;
  text?: string;
}

export interface DiffRegion {
  tag: string;
  /** What differs: "spacing" | "width" | "font-family" | "font-size" | "color" | "missing". */
  kind: string;
  expected: string;
  actual: string;
  /** Severity 0..1 (1 = worst). */
  severity: number;
}

export interface SimilarityResult {
  score: number;
  pixelScore: number;
  structuralScore: number;
  diffRegions: DiffRegion[];
}

/* --------------------------- pixel similarity ---------------------------- */

/**
 * Compute a pixel mismatch ratio between two equal-length RGBA buffers.
 * Returns a similarity score in [0,1] (1 = identical). Channels that differ by
 * less than `threshold` (0..255) are treated as a match to absorb anti-aliasing.
 */
export function pixelSimilarity(a: Uint8Array, b: Uint8Array, threshold = 24): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  const pixels = Math.floor(a.length / 4);
  let mismatched = 0;
  for (let i = 0; i < a.length; i += 4) {
    const dr = Math.abs(a[i] - b[i]);
    const dg = Math.abs(a[i + 1] - b[i + 1]);
    const db = Math.abs(a[i + 2] - b[i + 2]);
    if (dr > threshold || dg > threshold || db > threshold) mismatched++;
  }
  return pixels === 0 ? 0 : 1 - mismatched / pixels;
}

/* ------------------------- structural similarity ------------------------- */

const approx = (a = 0, b = 0, tol = 0.04, abs = 4): boolean => {
  const diff = Math.abs(a - b);
  return diff <= abs || diff <= Math.max(a, b) * tol;
};

const norm = (s?: string): string => (s || "").toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Align two DOM snapshots by document order and tag, then flag mismatches in
 * spacing/width/typography/color. Returns a structural score and the worst
 * offending regions (sorted by severity).
 */
export function structuralDiff(template: DomBox[], published: DomBox[]): {
  score: number;
  regions: DiffRegion[];
} {
  const regions: DiffRegion[] = [];
  const n = Math.max(template.length, published.length);
  if (n === 0) return { score: 1, regions };

  let checks = 0;
  let fails = 0;

  for (let i = 0; i < template.length; i++) {
    const t = template[i];
    const p = published[i];
    if (!p) {
      regions.push({ tag: t.tag, kind: "missing", expected: t.tag, actual: "(absent)", severity: 1 });
      checks++; fails++;
      continue;
    }

    // Width / layout.
    checks++;
    if (!approx(t.width, p.width, 0.05, 6)) {
      fails++;
      regions.push({ tag: t.tag, kind: "width", expected: `${Math.round(t.width)}px`, actual: `${Math.round(p.width)}px`, severity: 0.8 });
    }

    // Vertical position (spacing).
    checks++;
    if (!approx(t.y, p.y, 0.06, 8)) {
      fails++;
      regions.push({ tag: t.tag, kind: "spacing", expected: `y=${Math.round(t.y)}`, actual: `y=${Math.round(p.y)}`, severity: 0.6 });
    }

    // Typography.
    if (t.fontFamily || p.fontFamily) {
      checks++;
      if (norm(t.fontFamily) !== norm(p.fontFamily)) {
        fails++;
        regions.push({ tag: t.tag, kind: "font-family", expected: t.fontFamily || "", actual: p.fontFamily || "", severity: 0.7 });
      }
    }
    if (t.fontSize || p.fontSize) {
      checks++;
      if (!approx(t.fontSize, p.fontSize, 0.02, 1)) {
        fails++;
        regions.push({ tag: t.tag, kind: "font-size", expected: `${t.fontSize}px`, actual: `${p.fontSize}px`, severity: 0.5 });
      }
    }
    if (t.color || p.color) {
      checks++;
      if (norm(t.color) !== norm(p.color)) {
        fails++;
        regions.push({ tag: t.tag, kind: "color", expected: t.color || "", actual: p.color || "", severity: 0.4 });
      }
    }
  }

  const score = checks === 0 ? 1 : 1 - fails / checks;
  regions.sort((a, b) => b.severity - a.severity);
  return { score, regions: regions.slice(0, 25) };
}

/* ----------------------------- combined ---------------------------------- */

/** Combine pixel + structural scores (default 70/30 weighting). */
export function combineSimilarity(
  pixelScore: number,
  structuralScore: number,
  regions: DiffRegion[],
  pixelWeight = 0.7,
): SimilarityResult {
  const score = pixelScore * pixelWeight + structuralScore * (1 - pixelWeight);
  return { score, pixelScore, structuralScore, diffRegions: regions };
}

/**
 * Turn diff regions into corrective hints fed back into the rebuild step so the
 * next attempt fixes the worst mismatches first.
 */
export function buildRebuildHints(regions: DiffRegion[]): string {
  if (regions.length === 0) return "";
  const lines = regions.slice(0, 12).map(
    (r) => `- <${r.tag}> ${r.kind}: template expects "${r.expected}" but page shows "${r.actual}"`,
  );
  return `Fix these visual mismatches so the page matches the template:\n${lines.join("\n")}`;
}
