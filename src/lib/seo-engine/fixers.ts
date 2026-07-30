/**
 * One-click fixers for the shared SEO Engine.
 *
 * Every fixer is deterministic (no AI, no network) so it can run inside the
 * publish pipeline without slowing it down or changing what the user reviewed.
 *
 * Hard rules — these mirror the project's Design Preservation Rule:
 *  - NEVER change layout markup: no wrapper edits, no class/id changes, no
 *    reordering, no `<style>` rewriting.
 *  - Only additive/attribute-level edits: head meta, JSON-LD, `alt`,
 *    `loading`, `decoding`, and anchor wrapping of existing plain text.
 */

import { extractSignals } from "./extract";
import { applyInternalLinks, suggestInternalLinks } from "./internal-links";
import type { PageSignals, SeoEngineInput } from "./types";

export type FixKey =
  | "meta.title"
  | "meta.description"
  | "meta.canonical"
  | "meta.social"
  | "schema"
  | "images.alt"
  | "images.lazy"
  | "links.internal";

export interface SeoFixOptions {
  /** Restrict which fixers run. Defaults to all. */
  only?: FixKey[];
  /** Absolute site origin, e.g. "https://example.com" — used for canonical/og:url. */
  siteUrl?: string | null;
  /** Business/site name used in Organization schema and og:site_name. */
  siteName?: string | null;
  /** Page path used for canonical when no canonical URL is stored. */
  path?: string | null;
  /** Maximum internal links to inject. */
  maxInternalLinks?: number;
}

export interface SeoFixResult {
  /** Page HTML after attribute-level, layout-safe edits. */
  html: string;
  /** Column-level patches for the page record / publish payload. */
  patch: {
    seo_title?: string;
    seo_description?: string;
    canonical_url?: string;
  };
  /** JSON-LD blocks that should be emitted with the page. */
  schema: Record<string, unknown>[];
  /** Open Graph / Twitter tags to publish alongside the page. */
  social: Record<string, string>;
  /** Human-readable list of what changed. */
  applied: string[];
  /** Fix keys that ran and produced a change. */
  appliedKeys: FixKey[];
}

const CLAMP = (value: string, max: number) =>
  value.length <= max ? value : `${value.slice(0, max - 1).replace(/[\s,;:.-]+$/, "")}…`;

function shouldRun(key: FixKey, only?: FixKey[]) {
  return !only || only.includes(key);
}

function firstSentence(signals: PageSignals): string {
  const sentence = signals.sentences.find((s) => s.trim().split(/\s+/).length >= 8);
  return (sentence || signals.paragraphs[0] || signals.text || "").trim();
}

function titleCase(value: string) {
  return value.replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

function joinUrl(base: string, path: string) {
  const cleanBase = base.replace(/\/+$/, "");
  const cleanPath = `/${(path || "").replace(/^\/+/, "")}`;
  return cleanPath === "/" ? `${cleanBase}/` : `${cleanBase}${cleanPath}`;
}

/** Derive descriptive alt text for an image from its filename and page context. */
function altFromSrc(src: string, fallback: string): string {
  const file = (src.split("?")[0].split("/").pop() || "").replace(/\.[a-z0-9]+$/i, "");
  const words = file
    .replace(/[-_]+/g, " ")
    .replace(/\b\d{3,}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (words.length >= 4 && /[a-z]{3}/i.test(words)) return titleCase(words);
  return fallback;
}

/**
 * Apply deterministic, layout-safe SEO fixes to a page.
 *
 * Returns new HTML plus the metadata/schema the publisher should send. The
 * input HTML is never mutated in place.
 */
export function applySeoFixes(input: SeoEngineInput, options: SeoFixOptions = {}): SeoFixResult {
  const applied: string[] = [];
  const appliedKeys: FixKey[] = [];
  const patch: SeoFixResult["patch"] = {};
  const social: Record<string, string> = {};
  const schema: Record<string, unknown>[] = [];

  let html = input.html || "";
  let signals = extractSignals(html, { url: input.url });

  const focus = (input.focusKeyword || input.seoKeywords?.[0] || "").trim();
  const pageTitle =
    (input.seoTitle || input.title || signals.meta.title || signals.headings[0]?.text || "").trim();
  const siteName = (options.siteName || "").trim();

  const mark = (key: FixKey, message: string) => {
    appliedKeys.push(key);
    applied.push(message);
  };

  // ── Title ────────────────────────────────────────────────────────────────
  if (shouldRun("meta.title", options.only)) {
    const current = (input.seoTitle || "").trim();
    const needsTitle =
      !current ||
      current.length < 30 ||
      current.length > 60 ||
      (!!focus && !current.toLowerCase().includes(focus.toLowerCase()));

    if (needsTitle) {
      let next = current || pageTitle || focus;
      if (focus && !next.toLowerCase().includes(focus.toLowerCase())) {
        next = next ? `${titleCase(focus)} — ${next}` : titleCase(focus);
      }
      if (next.length < 30 && siteName && !next.toLowerCase().includes(siteName.toLowerCase())) {
        next = `${next} | ${siteName}`;
      }
      next = CLAMP(next.replace(/\s+/g, " ").trim(), 60);
      if (next && next !== current) {
        patch.seo_title = next;
        mark("meta.title", `SEO title set to "${next}"`);
      }
    }
  }

  // ── Description ──────────────────────────────────────────────────────────
  if (shouldRun("meta.description", options.only)) {
    const current = (input.seoDescription || "").trim();
    const needsDescription =
      !current ||
      current.length < 120 ||
      current.length > 158 ||
      (!!focus && !current.toLowerCase().includes(focus.toLowerCase()));

    if (needsDescription) {
      let next = current;
      if (next.length < 120) {
        const filler = firstSentence(signals);
        next = [next, filler].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
      }
      if (focus && next && !next.toLowerCase().includes(focus.toLowerCase())) {
        next = `${titleCase(focus)}: ${next}`;
      }
      next = CLAMP(next.trim(), 158);
      if (next && next.length >= 60 && next !== current) {
        patch.seo_description = next;
        mark("meta.description", "Meta description rewritten to the ideal length");
      }
    }
  }

  const effectiveTitle = patch.seo_title || input.seoTitle || pageTitle;
  const effectiveDescription = patch.seo_description || input.seoDescription || "";

  // ── Canonical ────────────────────────────────────────────────────────────
  let canonical = (input.canonicalUrl || signals.meta.canonical || "").trim();
  if (shouldRun("meta.canonical", options.only) && !canonical && options.siteUrl) {
    canonical = joinUrl(options.siteUrl, options.path ?? input.slug ?? "");
    patch.canonical_url = canonical;
    mark("meta.canonical", `Canonical URL set to ${canonical}`);
  }

  // ── Social tags ──────────────────────────────────────────────────────────
  if (shouldRun("meta.social", options.only)) {
    const og = signals.meta.og;
    if (!og.title && effectiveTitle) social["og:title"] = effectiveTitle;
    if (!og.description && effectiveDescription) social["og:description"] = effectiveDescription;
    if (!og.type) social["og:type"] = "website";
    if (!og.url && canonical) social["og:url"] = canonical;
    if (!og.site_name && siteName) social["og:site_name"] = siteName;
    if (!signals.meta.twitter.card) {
      social["twitter:card"] = og.image ? "summary_large_image" : "summary";
      if (effectiveTitle) social["twitter:title"] = effectiveTitle;
      if (effectiveDescription) social["twitter:description"] = effectiveDescription;
    }
    if (Object.keys(social).length) {
      mark("meta.social", `${Object.keys(social).length} social preview tags added`);
    }
  }

  // ── Structured data ──────────────────────────────────────────────────────
  if (shouldRun("schema", options.only)) {
    const existingTypes = new Set(
      signals.jsonLd
        .map((block) => String(block["@type"] ?? "").toLowerCase())
        .filter(Boolean),
    );

    if (!existingTypes.has("webpage") && !existingTypes.has("article")) {
      schema.push({
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: effectiveTitle || undefined,
        description: effectiveDescription || undefined,
        url: canonical || undefined,
        inLanguage: input.language || signals.lang || undefined,
        ...(focus ? { keywords: [focus, ...(input.seoKeywords ?? [])].slice(0, 10).join(", ") } : {}),
      });
    }

    if (siteName && !existingTypes.has("organization") && !existingTypes.has("localbusiness")) {
      schema.push({
        "@context": "https://schema.org",
        "@type": "Organization",
        name: siteName,
        url: options.siteUrl || canonical || undefined,
      });
    }

    // FAQ schema from an existing FAQ block — question headings + next paragraph.
    if (!existingTypes.has("faqpage")) {
      const faqs: { q: string; a: string }[] = [];
      signals.headings.forEach((heading, index) => {
        if (heading.level < 2 || faqs.length >= 8) return;
        const isQuestion =
          /\?$/.test(heading.text) ||
          /^(what|why|how|when|where|who|which|can|does|do|is|are)\b/i.test(heading.text);
        if (!isQuestion) return;
        const answer = signals.paragraphs.find(
          (p) => signals.text.indexOf(p) > signals.text.indexOf(heading.text) && p.length > 40,
        );
        if (answer) faqs.push({ q: heading.text, a: CLAMP(answer, 500) });
        void index;
      });

      if (faqs.length >= 2) {
        schema.push({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.q,
            acceptedAnswer: { "@type": "Answer", text: faq.a },
          })),
        });
      }
    }

    if (schema.length) {
      const types = schema.map((s) => s["@type"]).join(", ");
      mark("schema", `Structured data added (${types})`);
    }
  }

  // ── Images: alt text + lazy loading (attribute-only edits) ───────────────
  if (shouldRun("images.alt", options.only) || shouldRun("images.lazy", options.only)) {
    let altFixes = 0;
    let lazyFixes = 0;
    let imageIndex = 0;
    const contextAlt = (effectiveTitle || focus || "Page image").trim();

    html = html.replace(/<img\b[^>]*>/gi, (tag) => {
      const index = imageIndex++;
      let next = tag;

      if (shouldRun("images.alt", options.only)) {
        const altMatch = next.match(/\salt\s*=\s*(["'])(.*?)\1/i);
        if (!altMatch || !altMatch[2].trim()) {
          const srcMatch = next.match(/\ssrc\s*=\s*(["'])(.*?)\1/i);
          const alt = altFromSrc(srcMatch?.[2] ?? "", contextAlt)
            .replace(/"/g, "'")
            .slice(0, 120);
          next = altMatch
            ? next.replace(altMatch[0], ` alt="${alt}"`)
            : next.replace(/<img\b/i, `<img alt="${alt}"`);
          altFixes++;
        }
      }

      // Never lazy-load the first (likely LCP) image.
      if (shouldRun("images.lazy", options.only) && index > 0 && !/\sloading\s*=/i.test(next)) {
        next = next.replace(/<img\b/i, `<img loading="lazy" decoding="async"`);
        lazyFixes++;
      }

      return next;
    });

    if (altFixes) mark("images.alt", `${altFixes} image alt attributes added`);
    if (lazyFixes) mark("images.lazy", `${lazyFixes} images set to lazy-load`);
  }

  // ── Internal links ───────────────────────────────────────────────────────
  if (shouldRun("links.internal", options.only) && input.corpus?.length) {
    signals = extractSignals(html, { url: input.url });
    const existingInternal = signals.links.filter((l) => l.internal).length;
    const budget = Math.max(0, (options.maxInternalLinks ?? 5) - existingInternal);

    if (budget > 0) {
      const suggestions = suggestInternalLinks(signals, input.corpus, {
        currentSlug: input.slug,
        max: budget,
      });
      if (suggestions.length) {
        const next = applyInternalLinks(html, suggestions);
        if (next !== html) {
          html = next;
          mark("links.internal", `${suggestions.length} contextual internal links added`);
        }
      }
    }
  }

  return { html, patch, schema, social, applied, appliedKeys };
}

/**
 * Render fix output as head-safe HTML tags (JSON-LD + social meta).
 * Used by publishers that inject a head block rather than platform meta fields.
 */
export function renderFixHeadTags(result: SeoFixResult, canonicalUrl?: string | null): string {
  const parts: string[] = [];

  if (canonicalUrl || result.patch.canonical_url) {
    parts.push(`<link rel="canonical" href="${canonicalUrl || result.patch.canonical_url}" />`);
  }
  for (const [key, value] of Object.entries(result.social)) {
    const attr = key.startsWith("og:") ? "property" : "name";
    parts.push(`<meta ${attr}="${key}" content="${String(value).replace(/"/g, "&quot;")}" />`);
  }
  for (const block of result.schema) {
    parts.push(`<script type="application/ld+json">${JSON.stringify(block)}</script>`);
  }

  return parts.join("\n");
}
