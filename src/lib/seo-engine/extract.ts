/**
 * HTML → PageSignals extraction. Regex-based so it runs identically in the
 * browser, in Deno edge functions and in tests (no DOM dependency).
 */

import type { PageSignals } from "./types";

const STRIP_BLOCKS = /<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi;

export function decodeEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(Number(d)));
}

export function stripHtml(html: string): string {
  return decodeEntities(html.replace(STRIP_BLOCKS, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function attr(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  if (!m) return undefined;
  return decodeEntities(m[2] ?? m[3] ?? m[4] ?? "").trim();
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []).filter(Boolean);
}

const CTA_PATTERNS =
  /\b(get (a )?(free )?(quote|started|in touch)|contact us|call (us|now)|book (a|now|your)|request (a|your)|buy now|order now|schedule|sign up|subscribe|start (free|now)|hire us|apply now|learn more|demander|contactez|réserver|jetzt|kontakt|contáctenos|reservar)\b/i;

const FAQ_PATTERNS = /(faq|frequently asked|questions? fréquentes|preguntas frecuentes|häufige fragen)/i;

export function extractSignals(html: string, opts?: { url?: string }): PageSignals {
  const source = html ?? "";

  // ── meta ─────────────────────────────────────────────────────────────────
  const og: Record<string, string> = {};
  const twitter: Record<string, string> = {};
  let description: string | undefined;
  let robots: string | undefined;

  for (const tag of source.match(/<meta\b[^>]*>/gi) ?? []) {
    const property = (attr(tag, "property") || "").toLowerCase();
    const name = (attr(tag, "name") || "").toLowerCase();
    const content = attr(tag, "content") ?? "";
    if (property.startsWith("og:")) og[property.slice(3)] = content;
    else if (name.startsWith("og:")) og[name.slice(3)] = content;
    else if (name.startsWith("twitter:")) twitter[name.slice(8)] = content;
    else if (property.startsWith("twitter:")) twitter[property.slice(8)] = content;
    else if (name === "description") description = content;
    else if (name === "robots") robots = content;
  }

  const titleTag = source.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const canonicalTag = (source.match(/<link\b[^>]*>/gi) ?? []).find(
    (t) => (attr(t, "rel") || "").toLowerCase() === "canonical",
  );
  const langTag = source.match(/<html\b[^>]*\blang\s*=\s*["']([^"']+)/i);

  // ── headings ─────────────────────────────────────────────────────────────
  const headings: PageSignals["headings"] = [];
  for (const m of source.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    const text = stripHtml(m[2]);
    if (text) headings.push({ level: Number(m[1]) as 1, text });
  }

  // ── images ───────────────────────────────────────────────────────────────
  const images: PageSignals["images"] = (source.match(/<img\b[^>]*>/gi) ?? []).map((tag) => {
    const alt = attr(tag, "alt");
    return {
      src: attr(tag, "src") || attr(tag, "data-src") || "",
      alt: alt ?? "",
      hasAlt: typeof alt === "string" && alt.trim().length > 0,
      loading: attr(tag, "loading"),
      width: attr(tag, "width"),
      height: attr(tag, "height"),
    };
  });

  // ── links ────────────────────────────────────────────────────────────────
  let host = "";
  try {
    if (opts?.url) host = new URL(opts.url).host;
  } catch {
    /* ignore */
  }
  const links: PageSignals["links"] = [];
  for (const m of source.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const tag = `<a ${m[1]}>`;
    const href = attr(tag, "href") || "";
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) continue;
    let internal = href.startsWith("/") || href.startsWith(".") || (!/^[a-z]+:/i.test(href));
    if (!internal && host) {
      try {
        internal = new URL(href).host === host;
      } catch {
        /* ignore */
      }
    }
    links.push({
      href,
      text: stripHtml(m[2]),
      internal,
      nofollow: /nofollow/i.test(attr(tag, "rel") || ""),
    });
  }

  // ── JSON-LD ──────────────────────────────────────────────────────────────
  const jsonLd: Record<string, unknown>[] = [];
  for (const m of source.matchAll(
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const parsed = JSON.parse(m[1].trim());
      if (Array.isArray(parsed)) jsonLd.push(...parsed.filter((x) => x && typeof x === "object"));
      else if (parsed && typeof parsed === "object") jsonLd.push(parsed);
    } catch {
      /* malformed JSON-LD is reported by the schema analyzer */
    }
  }

  // ── text ─────────────────────────────────────────────────────────────────
  const bodyMatch = source.match(/<body\b[^>]*>([\s\S]*)<\/body>/i);
  const text = stripHtml(bodyMatch ? bodyMatch[1] : source);
  const words = tokenize(text);
  const paragraphs = (source.match(/<p\b[^>]*>([\s\S]*?)<\/p>/gi) ?? [])
    .map((p) => stripHtml(p))
    .filter((p) => p.length > 0);

  const inlineCssBytes = (source.match(/<style\b[^>]*>([\s\S]*?)<\/style>/gi) ?? []).reduce(
    (sum, block) => sum + block.length,
    0,
  );
  const inlineJsBytes = (source.match(/<script\b(?![^>]*ld\+json)[^>]*>([\s\S]*?)<\/script>/gi) ?? []).reduce(
    (sum, block) => sum + block.length,
    0,
  );

  return {
    text,
    words,
    wordCount: words.length,
    sentences: splitSentences(text),
    paragraphs,
    headings,
    images,
    links,
    jsonLd,
    meta: {
      title: titleTag ? stripHtml(titleTag[1]) : undefined,
      description,
      canonical: canonicalTag ? attr(canonicalTag, "href") : undefined,
      robots,
      og,
      twitter,
    },
    inlineCssBytes,
    inlineJsBytes,
    hasFaqBlock:
      FAQ_PATTERNS.test(source) ||
      headings.some((h) => /\?$/.test(h.text)) ||
      jsonLd.some((s) => String((s as { "@type"?: unknown })["@type"] ?? "").includes("FAQPage")),
    hasCta: CTA_PATTERNS.test(text) || links.some((l) => CTA_PATTERNS.test(l.text)),
    lang: langTag ? langTag[1] : undefined,
  };
}
