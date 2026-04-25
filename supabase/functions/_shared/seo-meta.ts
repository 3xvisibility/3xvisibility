/**
 * Extended SEO helpers — additive on top of existing OG/JSON-LD output.
 *
 * Goals:
 *   • Multi-search-engine compatibility (Bing / DuckDuckGo / Yahoo) without
 *     touching Google-targeted tags that already work.
 *   • AI-friendly content cues (Perplexity / SearchGPT / Gemini) via clean
 *     headings and an auto-generated FAQ section + FAQPage JSON-LD.
 *   • Additional JSON-LD types (Article, Service, Product) when no template
 *     schema is configured — never overrides existing template schema.
 *
 * Pure functions — easy to call from edge functions and to unit-test.
 */

const escAttr = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

// ─── Multi-engine meta ──────────────────────────────────────────────

/**
 * Returns extra <meta> tags geared toward search engines beyond Google
 * (Bing, DuckDuckGo, Yahoo). All major engines also honor `robots`, but
 * Bingbot and Slurp specifically read their dedicated directives.
 *
 * Existing meta tags (description, og:*, twitter:*) are preserved by the
 * caller — these are appended after them.
 */
export function buildMultiEngineMeta(opts: {
  title: string;
  description: string;
  language?: string | null;        // e.g. "en", "fr", "fr-FR"
  siteName?: string | null;        // website.name
  canonicalUrl?: string | null;
  publishedAt?: string;            // ISO date
  modifiedAt?: string;             // ISO date
  keywords?: string[] | null;
}): string {
  const tags: string[] = [];

  // Charset + viewport are typically already in the host theme — we keep them
  // out of here so we don't duplicate. Add only universally-safe directives.
  tags.push(`<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">`);
  tags.push(`<meta name="googlebot" content="index, follow">`);
  tags.push(`<meta name="bingbot" content="index, follow">`);          // Bing/Yahoo
  tags.push(`<meta name="slurp" content="index, follow">`);             // legacy Yahoo
  tags.push(`<meta name="duckduckbot" content="index, follow">`);

  // Reinforce description for engines that ignore og:description.
  if (opts.description) {
    tags.push(`<meta name="description" content="${escAttr(opts.description)}">`);
  }
  if (opts.keywords && opts.keywords.length > 0) {
    // Bing still reads keywords as a weak signal; harmless for others.
    tags.push(`<meta name="keywords" content="${escAttr(opts.keywords.join(", "))}">`);
  }

  // Language hints for non-Google engines.
  if (opts.language) {
    const lang = opts.language.replace(/_/g, "-");
    tags.push(`<meta http-equiv="content-language" content="${escAttr(lang)}">`);
    tags.push(`<meta property="og:locale" content="${escAttr(lang.includes("-") ? lang.replace("-", "_") : lang)}">`);
  }

  if (opts.siteName) {
    tags.push(`<meta property="og:site_name" content="${escAttr(opts.siteName)}">`);
  }

  if (opts.publishedAt) {
    tags.push(`<meta property="article:published_time" content="${escAttr(opts.publishedAt)}">`);
  }
  if (opts.modifiedAt) {
    tags.push(`<meta property="article:modified_time" content="${escAttr(opts.modifiedAt)}">`);
  }

  // Mobile / PWA-friendly hints — improves Bing mobile-friendly ranking.
  tags.push(`<meta name="format-detection" content="telephone=yes">`);
  tags.push(`<meta name="referrer" content="strict-origin-when-cross-origin">`);

  return `<!-- Multi-Engine SEO -->\n${tags.join("\n")}`;
}

// ─── AI-friendly enhancements ───────────────────────────────────────

/**
 * If the page already contains an FAQ section we leave it alone. Otherwise
 * we derive Q&A pairs from the row data using common conventions:
 *
 *   • row.question / row.answer            (single pair)
 *   • row.faq_q1, row.faq_a1, faq_q2, …    (numbered pairs)
 *   • row.faqs in the form  "Q|A;;Q|A"     (delimited list)
 *
 * Returns both an HTML snippet (or "") and the JSON-LD FAQPage payload (or null).
 * Caller decides whether to append.
 */
export function buildAutoFaq(
  htmlSoFar: string,
  row: Record<string, string>,
): { html: string; jsonLd: string | null } {
  // Skip if author already wrote an FAQ block.
  if (/<h[1-3][^>]*>\s*(faq|frequently asked questions|questions fr[ée]quentes|h[äa]ufig gestellte|preguntas frecuentes)/i.test(htmlSoFar)) {
    return { html: "", jsonLd: null };
  }

  const pairs: { q: string; a: string }[] = [];

  if (row.question && row.answer) {
    pairs.push({ q: row.question, a: row.answer });
  }

  for (let i = 1; i <= 10; i++) {
    const q = row[`faq_q${i}`] || row[`question_${i}`] || row[`q${i}`];
    const a = row[`faq_a${i}`] || row[`answer_${i}`] || row[`a${i}`];
    if (q && a) pairs.push({ q, a });
  }

  const bulk = row.faqs || row.faq_list;
  if (bulk) {
    for (const chunk of bulk.split(/;;|\n/).map((s) => s.trim()).filter(Boolean)) {
      const [q, a] = chunk.split("|").map((s) => s?.trim());
      if (q && a) pairs.push({ q, a });
    }
  }

  if (pairs.length === 0) return { html: "", jsonLd: null };

  const escHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const itemsHtml = pairs
    .map(
      (p) =>
        `  <details class="pgp-faq-item">\n    <summary>${escHtml(p.q)}</summary>\n    <p>${escHtml(p.a)}</p>\n  </details>`,
    )
    .join("\n");

  const html = `\n<!-- AI-friendly FAQ (auto-generated) -->\n<section class="pgp-faq" aria-label="Frequently Asked Questions">\n  <h2>Frequently Asked Questions</h2>\n${itemsHtml}\n</section>`;

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: pairs.map((p) => ({
      "@type": "Question",
      name: p.q,
      acceptedAnswer: { "@type": "Answer", text: p.a },
    })),
  });

  return {
    html,
    jsonLd: `<script type="application/ld+json">${jsonLd}</script>`,
  };
}

// ─── Extra JSON-LD types ────────────────────────────────────────────

/**
 * Returns an additional JSON-LD <script> tag (or "") to complement the
 * primary one. Never replaces the primary schema; it's *added* so engines
 * still see the original tag.
 *
 * Heuristics:
 *   • campaignType "geo"  → already emits LocalBusiness; we add Service when
 *                           a service name is available (row.service / row.title).
 *   • Article-shaped row  → row.author or row.published_at present.
 *   • Product-shaped row  → row.price or row.sku present (only if no template
 *                           schema_type was set, which the caller checks).
 */
export function buildExtraJsonLd(
  campaignType: string | undefined,
  pageTitle: string,
  seoDescription: string,
  canonicalUrl: string | null,
  row: Record<string, string>,
): string {
  const out: string[] = [];

  // Article — useful for blog/news-style content
  if (row.author || row.published_at || row.publish_date) {
    const article: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: pageTitle,
      description: seoDescription,
    };
    if (row.author) article.author = { "@type": "Person", name: row.author };
    if (row.published_at || row.publish_date) {
      article.datePublished = row.published_at || row.publish_date;
    }
    if (row.modified_at || row.updated_at) {
      article.dateModified = row.modified_at || row.updated_at;
    }
    if (canonicalUrl) article.mainEntityOfPage = canonicalUrl;
    if (row.image || row.image_url) article.image = row.image || row.image_url;
    out.push(`<script type="application/ld+json">${JSON.stringify(article)}</script>`);
  }

  // Product — only when explicitly product-shaped and template didn't already
  // request Product schema.
  if (row.price || row.sku) {
    const product: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: pageTitle,
      description: seoDescription,
    };
    if (row.sku) product.sku = row.sku;
    if (row.brand) product.brand = { "@type": "Brand", name: row.brand };
    if (row.image || row.image_url) product.image = row.image || row.image_url;
    if (row.price) {
      product.offers = {
        "@type": "Offer",
        price: row.price,
        priceCurrency: row.currency || "USD",
        availability: row.availability || "https://schema.org/InStock",
      };
    }
    out.push(`<script type="application/ld+json">${JSON.stringify(product)}</script>`);
  }

  // Service — adds context to GEO/local pages
  if (campaignType === "geo" && (row.service || row.service_name)) {
    const service: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Service",
      name: row.service || row.service_name,
      description: seoDescription,
    };
    if (row.service_area || row.city) {
      service.areaServed = row.service_area || row.city;
    }
    if (row.provider || row.business_name) {
      service.provider = { "@type": "Organization", name: row.provider || row.business_name };
    }
    out.push(`<script type="application/ld+json">${JSON.stringify(service)}</script>`);
  }

  return out.length > 0 ? `<!-- Additional JSON-LD -->\n${out.join("\n")}` : "";
}
