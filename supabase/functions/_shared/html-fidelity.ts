// html-fidelity: dependency-free preview ⇄ published HTML/CSS comparison.
//
// The v1 product publishes raw HTML/CSS, so "does the published page look like
// the preview?" can be answered deterministically from markup instead of
// screenshots: everything the preview contains (text, headings, images, links,
// structural skeleton, class tokens and CSS declarations) must also be present
// in the live document. Theme chrome (header/nav/footer the site adds around
// our content) is ignored because we score *coverage of the preview*, not an
// exact equality of both documents.

export interface HtmlSignature {
  text: string[];
  headings: string[];
  images: string[];
  links: string[];
  skeleton: string[];
  classes: string[];
  css: string[];
}

export interface FidelityMismatch {
  kind: "text" | "heading" | "image" | "link" | "structure" | "class" | "css";
  detail: string;
  hint: string;
}

export interface FidelityReport {
  score: number;
  contentScore: number;
  styleScore: number;
  structureScore: number;
  mismatches: FidelityMismatch[];
  counts: Record<string, { expected: number; matched: number }>;
}

const BLOCK_TAGS = new Set([
  "section", "header", "footer", "main", "article", "aside", "nav", "div",
  "h1", "h2", "h3", "h4", "h5", "h6", "p", "ul", "ol", "li", "table", "form",
  "img", "a", "button", "video", "iframe", "figure", "blockquote",
]);

const stripComments = (html: string) => html.replace(/<!--[\s\S]*?-->/g, " ");

const stripTag = (html: string, tag: string) =>
  html.replace(new RegExp(`<${tag}[^>]*>[\\s\\S]*?</${tag}>`, "gi"), " ");

export const normalizeText = (value: string) =>
  value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const normalizeUrl = (value: string) => {
  const clean = value.trim().split("?")[0].split("#")[0];
  const parts = clean.split("/").filter(Boolean);
  return (parts[parts.length - 1] || clean).toLowerCase();
};

const normalizeCssDecl = (decl: string) =>
  decl.replace(/\s+/g, "").replace(/;$/, "").toLowerCase();

/** Collect every `<style>` block plus inline `style="…"` declarations. */
function extractCss(html: string): string[] {
  const out: string[] = [];
  const styleBlocks = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
  for (const block of styleBlocks) {
    const body = block.replace(/<\/?style[^>]*>/gi, "");
    for (const decl of body.split(/[;{}\n]/)) {
      const d = normalizeCssDecl(decl);
      if (d.includes(":") && d.length > 4 && d.length < 160) out.push(d);
    }
  }
  const inline = html.match(/style\s*=\s*"([^"]*)"/gi) || [];
  for (const attr of inline) {
    const body = attr.replace(/^style\s*=\s*"/i, "").replace(/"$/, "");
    for (const decl of body.split(";")) {
      const d = normalizeCssDecl(decl);
      if (d.includes(":") && d.length > 4 && d.length < 160) out.push(d);
    }
  }
  return out;
}

export function extractSignature(rawHtml: string): HtmlSignature {
  const html = stripComments(rawHtml || "");
  const css = extractCss(html);
  const body = stripTag(stripTag(html, "script"), "style");

  const headings: string[] = [];
  for (const m of body.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    const t = normalizeText(m[2].replace(/<[^>]+>/g, " "));
    if (t) headings.push(t);
  }

  const images: string[] = [];
  for (const m of body.matchAll(/<img[^>]+src\s*=\s*["']([^"']+)["']/gi)) {
    const src = normalizeUrl(m[1]);
    if (src && !src.startsWith("data:")) images.push(src);
  }

  const links: string[] = [];
  for (const m of body.matchAll(/<a[^>]+href\s*=\s*["']([^"']+)["']/gi)) {
    const href = m[1].trim();
    if (href && !href.startsWith("#") && !href.startsWith("javascript:")) {
      links.push(normalizeUrl(href));
    }
  }

  const skeleton: string[] = [];
  for (const m of body.matchAll(/<([a-z][a-z0-9]*)\b/gi)) {
    const tag = m[1].toLowerCase();
    if (BLOCK_TAGS.has(tag)) skeleton.push(tag);
  }

  const classes: string[] = [];
  for (const m of body.matchAll(/class\s*=\s*["']([^"']+)["']/gi)) {
    for (const token of m[1].split(/\s+/)) {
      const c = token.trim().toLowerCase();
      if (c && c.length < 60) classes.push(c);
    }
  }

  const text: string[] = [];
  const textOnly = body.replace(/<[^>]+>/g, "\n");
  for (const chunk of textOnly.split("\n")) {
    const t = normalizeText(chunk);
    if (t.length >= 12) text.push(t);
  }

  return { text, headings, images, links, skeleton, classes, css };
}

const uniq = (arr: string[]) => Array.from(new Set(arr));

function coverage(expected: string[], actual: string[]) {
  const want = uniq(expected);
  if (want.length === 0) return { ratio: 1, missing: [] as string[], expected: 0, matched: 0 };
  const have = new Set(actual);
  const missing = want.filter((v) => !have.has(v));
  return {
    ratio: (want.length - missing.length) / want.length,
    missing,
    expected: want.length,
    matched: want.length - missing.length,
  };
}

/** Ordered-skeleton similarity: compares block-tag frequency profiles. */
function skeletonSimilarity(expected: string[], actual: string[]) {
  if (expected.length === 0) return 1;
  const count = (arr: string[]) => {
    const m = new Map<string, number>();
    for (const v of arr) m.set(v, (m.get(v) || 0) + 1);
    return m;
  };
  const a = count(expected);
  const b = count(actual);
  let overlap = 0;
  let total = 0;
  for (const [tag, n] of a) {
    total += n;
    overlap += Math.min(n, b.get(tag) || 0);
  }
  return total === 0 ? 1 : overlap / total;
}

const HINTS: Record<FidelityMismatch["kind"], string> = {
  text: "Body copy was altered or stripped by the site — check theme content filters / republish.",
  heading: "A heading is missing on the live page — the theme may be overriding the page title area.",
  image: "An image did not survive publishing — verify media upload and absolute image URLs.",
  link: "A link is missing or rewritten on the live page.",
  structure: "The live DOM structure differs — the theme wrapper may be stripping sections.",
  class: "CSS class names were stripped — the theme sanitizer is removing attributes.",
  css: "Style rules are missing — inline <style> blocks were stripped, so the page will not look identical.",
};

function push(list: FidelityMismatch[], kind: FidelityMismatch["kind"], missing: string[], max = 6) {
  for (const detail of missing.slice(0, max)) {
    list.push({ kind, detail: detail.slice(0, 160), hint: HINTS[kind] });
  }
  if (missing.length > max) {
    list.push({ kind, detail: `…and ${missing.length - max} more`, hint: HINTS[kind] });
  }
}

/**
 * Compare the preview markup (source of truth) with the fetched published
 * document. Returns a 0–1 fidelity score plus actionable mismatches.
 */
export function compareHtml(previewHtml: string, publishedHtml: string): FidelityReport {
  const a = extractSignature(previewHtml);
  const b = extractSignature(publishedHtml);

  const text = coverage(a.text, b.text);
  const headings = coverage(a.headings, b.headings);
  const images = coverage(a.images, b.images);
  const links = coverage(a.links, b.links);
  const classes = coverage(a.classes, b.classes);
  const css = coverage(a.css, b.css);
  const structure = skeletonSimilarity(a.skeleton, b.skeleton);

  const contentScore =
    0.45 * text.ratio + 0.25 * headings.ratio + 0.2 * images.ratio + 0.1 * links.ratio;
  const styleScore = 0.6 * css.ratio + 0.4 * classes.ratio;
  const structureScore = structure;
  const score = 0.5 * contentScore + 0.3 * styleScore + 0.2 * structureScore;

  const mismatches: FidelityMismatch[] = [];
  push(mismatches, "heading", headings.missing);
  push(mismatches, "text", text.missing);
  push(mismatches, "image", images.missing);
  push(mismatches, "css", css.missing);
  push(mismatches, "class", classes.missing, 4);
  push(mismatches, "link", links.missing, 4);
  if (structure < 0.95) {
    mismatches.unshift({
      kind: "structure",
      detail: `Structural match ${(structure * 100).toFixed(1)}%`,
      hint: HINTS.structure,
    });
  }

  return {
    score: Number(score.toFixed(4)),
    contentScore: Number(contentScore.toFixed(4)),
    styleScore: Number(styleScore.toFixed(4)),
    structureScore: Number(structureScore.toFixed(4)),
    mismatches,
    counts: {
      text: { expected: text.expected, matched: text.matched },
      headings: { expected: headings.expected, matched: headings.matched },
      images: { expected: images.expected, matched: images.matched },
      links: { expected: links.expected, matched: links.matched },
      classes: { expected: classes.expected, matched: classes.matched },
      css: { expected: css.expected, matched: css.matched },
    },
  };
}
