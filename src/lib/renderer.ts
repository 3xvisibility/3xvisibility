/**
 * US17 — Backend Rendering Engine (portable module)
 *
 * Transforms a CSV row + template into:
 *   - HTML body (with variable substitution, conditionals, loops, spintax)
 *   - SEO meta tags (title, description, keywords, OG, Twitter)
 *   - JSON-LD structured data
 *   - Normalized slug
 *
 * This module is pure functions with no external dependencies so it can be
 * used both in the Edge Function (Deno) and in Vitest unit tests.
 */

// ─── Types ───────────────────────────────────────────────────────────

export interface TemplateConfig {
  content: string;
  seo_title_pattern?: string;
  seo_description_pattern?: string;
  schema_type?: string;
  schema_config?: Record<string, string>;
}

export interface RenderContext {
  row: Record<string, string>;
  /** Extra variables (geo settings, custom values, etc.) */
  extraVars?: Record<string, string>;
  /** Website info for canonical / brand */
  website?: { name?: string; url?: string };
  /** Campaign type for default JSON-LD behaviour */
  campaignType?: string;
  /** Row index for fallback naming */
  rowIndex?: number;
}

export interface RenderResult {
  html: string;
  title: string;
  slug: string;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string | null;
  ogTags: string;
  jsonLd: string;
  /** Any per-row warnings/errors */
  warnings: string[];
}

// ─── Slug normalisation ──────────────────────────────────────────────

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── Spintax ─────────────────────────────────────────────────────────

export function processBlockSpinning(text: string, deterministic = false): string {
  let counter = 0;
  // Block spinning: [spin]block1||block2||block3[/spin]
  return text.replace(/\[spin\]([\s\S]*?)\[\/spin\]/gi, (_m, inner: string) => {
    const blocks = inner.split("||").map(b => b.trim());
    if (blocks.length <= 1) return blocks[0] || "";
    const idx = deterministic ? counter++ % blocks.length : Math.floor(Math.random() * blocks.length);
    return blocks[idx];
  });
}

export function processSpintax(text: string, deterministic = false): string {
  // First process block-level spinning
  let result = processBlockSpinning(text, deterministic);

  const MAX_DEPTH = 10;
  let counter = 0;
  for (let depth = 0; depth < MAX_DEPTH; depth++) {
    const regex = /\{([^{}]*?\|[^{}]*?)\}/g;
    if (!regex.test(result)) break;
    result = result.replace(regex, (_m, group: string) => {
      const options = group.split("|");
      const idx = deterministic ? counter++ % options.length : Math.floor(Math.random() * options.length);
      return options[idx];
    });
  }
  return result;
}

// ─── Conditionals: {{#if var}}...{{#else}}...{{/if}} ─────────────────

export function processConditionals(content: string, vars: Record<string, string>): string {
  return content.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)(?:\{\{#else\}\}([\s\S]*?))?\{\{\/if\}\}/gi,
    (_m, varName: string, ifBlock: string, elseBlock?: string) => {
      const value = vars[varName] || vars[varName.toLowerCase()];
      return value && value.trim() ? ifBlock : (elseBlock || "");
    }
  );
}

// ─── Loops: {{#each items}}...{{/each}} ──────────────────────────────

export function processLoops(content: string, vars: Record<string, string>): string {
  return content.replace(
    /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/gi,
    (_m, varName: string, loopBlock: string) => {
      const value = vars[varName] || vars[varName.toLowerCase()];
      if (!value) return "";
      const items = value.split(",").map(s => s.trim()).filter(Boolean);
      return items
        .map((item, index) =>
          loopBlock
            .replace(/\{\{this\}\}/gi, item)
            .replace(/\{\{@index\}\}/gi, String(index))
            .replace(/\{\{@number\}\}/gi, String(index + 1))
        )
        .join("\n");
    }
  );
}

// ─── Variable transforms: {var:transform} ────────────────────────────

export function applyTransform(value: string, transform: string): string {
  const t = transform.toLowerCase();
  if (t === "uppercase") return value.toUpperCase();
  if (t === "lowercase") return value.toLowerCase();
  if (t === "capitalize")
    return value
      .split(" ")
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  if (t === "slug") return slugify(value);

  const extractMatch = t.match(/^extract\((\d+)\)$/);
  if (extractMatch) {
    const n = parseInt(extractMatch[1]);
    return value.split(/\s+/).slice(0, n).join(" ");
  }

  const truncMatch = t.match(/^truncate\((\d+)\)$/);
  if (truncMatch) {
    const n = parseInt(truncMatch[1]);
    return value.length > n ? value.slice(0, n) + "…" : value;
  }

  return value;
}

// ─── Variable replacement ────────────────────────────────────────────

export function replaceVariables(content: string, vars: Record<string, string>): string {
  // First pass: transforms {var:transform}
  let result = content.replace(/\{(\w+):(\w+(?:\(\d+\))?)\}/gi, (_m, varName: string, transform: string) => {
    const rawVal = vars[varName] || vars[varName.toLowerCase()] || "";
    return applyTransform(rawVal, transform);
  });

  // Second pass: plain {var}
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "gi"), value || "");
  }

  return result;
}

// ─── Resolve a pattern string (SEO title/desc, OG, slug) ─────────────

export function resolvePattern(pattern: string, vars: Record<string, string>): string {
  return replaceVariables(pattern, vars);
}

// ─── Build JSON-LD ───────────────────────────────────────────────────

export function buildJsonLd(
  schemaType: string,
  schemaConfig: Record<string, string>,
  vars: Record<string, string>,
  pageTitle: string,
  seoDescription: string,
  campaignType?: string,
  geoSettings?: Record<string, string>,
  row?: Record<string, string>
): string {
  // If template has a custom schema type, use it
  if (schemaType && schemaType !== "WebPage") {
    const resolved: Record<string, any> = {
      "@context": "https://schema.org",
      "@type": schemaType,
    };
    for (const [k, v] of Object.entries(schemaConfig)) {
      if (!v || k.startsWith("_")) continue; // skip internal _-prefixed keys
      let val = v;
      for (const [vk, vv] of Object.entries(vars)) {
        val = val.replace(new RegExp(`\\{${vk}\\}`, "gi"), vv || "");
      }
      // Handle nested keys like "offers.price" → nested object
      if (k.includes(".")) {
        const parts = k.split(".");
        let obj = resolved;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!obj[parts[i]]) obj[parts[i]] = {};
          obj = obj[parts[i]];
        }
        obj[parts[parts.length - 1]] = val;
      } else {
        resolved[k] = val;
      }
    }
    if (!resolved.description) resolved.description = seoDescription;
    if (!resolved.name) resolved.name = pageTitle;

    // Nest address for LocalBusiness
    if (schemaType === "LocalBusiness") {
      const addrFields = ["addressLocality", "addressRegion", "addressCountry", "postalCode"];
      const address: Record<string, string> = {};
      for (const af of addrFields) {
        if (resolved[af]) {
          address[af] = resolved[af];
          delete resolved[af];
        }
      }
      if (Object.keys(address).length > 0) {
        resolved.address = { "@type": "PostalAddress", ...address };
      }
    }

    // Product offers
    if (schemaType === "Product" && resolved.price) {
      resolved.offers = {
        "@type": "Offer",
        price: resolved.price,
        priceCurrency: resolved.currency || "USD",
      };
      delete resolved.price;
      delete resolved.currency;
    }

    // SoftwareApplication offers
    if (schemaType === "SoftwareApplication" && resolved.offers?.price) {
      resolved.offers["@type"] = "Offer";
      if (!resolved.offers.priceCurrency) resolved.offers.priceCurrency = "USD";
    }

    // FAQ
    if (schemaType === "FAQPage" && resolved.question) {
      resolved.mainEntity = [{
        "@type": "Question",
        name: resolved.question,
        acceptedAnswer: { "@type": "Answer", text: resolved.answer || "" },
      }];
      delete resolved.question;
      delete resolved.answer;
    }

    return `<script type="application/ld+json">${JSON.stringify(resolved)}</script>`;
  }

  // Fallback: auto-detect from campaign type & row data
  const r = row || {};
  const geo = geoSettings || {};

  if (campaignType === "geo") {
    const schema: any = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: pageTitle,
      description: seoDescription,
    };
    const addressParts = [geo.city, geo.region, geo.country].filter(Boolean);
    if (addressParts.length > 0) {
      schema.address = {
        "@type": "PostalAddress",
        addressLocality: geo.city || "",
        addressRegion: geo.region || "",
        addressCountry: geo.country || "",
        postalCode: geo.postcode || "",
      };
    }
    if (geo.lat && geo.lng) {
      schema.geo = { "@type": "GeoCoordinates", latitude: geo.lat, longitude: geo.lng };
    }
    if (r.phone || r.telephone) schema.telephone = r.phone || r.telephone;
    if (r.email) schema.email = r.email;
    return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
  }

  if (r.question && r.answer) {
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [{
        "@type": "Question",
        name: r.question,
        acceptedAnswer: { "@type": "Answer", text: r.answer },
      }],
    };
    return `<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>`;
  }

  const webSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: pageTitle,
    description: seoDescription,
  };
  return `<script type="application/ld+json">${JSON.stringify(webSchema)}</script>`;
}

// ─── Build OG / Twitter meta tags ────────────────────────────────────

export function buildOgMeta(opts: {
  title: string;
  description: string;
  url?: string;
  imageUrl?: string;
  twitterCard?: string;
}): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const tags = [
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${esc(opts.title)}">`,
    `<meta property="og:description" content="${esc(opts.description)}">`,
    `<meta name="twitter:card" content="${esc(opts.twitterCard || "summary_large_image")}">`,
    `<meta name="twitter:title" content="${esc(opts.title)}">`,
    `<meta name="twitter:description" content="${esc(opts.description)}">`,
  ];
  if (opts.url) tags.push(`<meta property="og:url" content="${esc(opts.url)}">`);
  if (opts.imageUrl) {
    tags.push(`<meta property="og:image" content="${esc(opts.imageUrl)}">`);
    tags.push(`<meta name="twitter:image" content="${esc(opts.imageUrl)}">`);
  }
  return tags.join("\n");
}

// ─── Main render function ────────────────────────────────────────────

export function renderPage(template: TemplateConfig, ctx: RenderContext): RenderResult {
  const warnings: string[] = [];
  const allVars: Record<string, string> = { ...ctx.row, ...ctx.extraVars };
  const schemaConfig = template.schema_config || {};

  // 1) Process conditionals & loops
  let html = processConditionals(template.content, allVars);
  html = processLoops(html, allVars);

  // 2) Replace variables (with transforms)
  html = replaceVariables(html, allVars);

  // 3) Process spintax
  html = processSpintax(html);

  // 4) Warn about unresolved placeholders
  const unresolved = html.match(/\{[a-z_]+\}/gi);
  if (unresolved) {
    const unique = [...new Set(unresolved)];
    warnings.push(`Unresolved variables: ${unique.join(", ")}`);
  }

  // 5) Extract title from <h1> or row values
  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  let title: string;
  if (h1Match) {
    title = h1Match[1].replace(/<[^>]*>/g, "").trim();
  } else {
    const vals = Object.values(ctx.row).filter(Boolean);
    title = vals.slice(0, 2).join(" - ") || `Page ${(ctx.rowIndex ?? 0) + 1}`;
  }

  // 6) Build slug from template slug pattern or title
  const slugPattern = schemaConfig._slugPattern || "";
  let slug: string;
  if (slugPattern) {
    slug = slugify(resolvePattern(slugPattern, allVars)) || slugify(title);
  } else {
    slug = slugify(title) || `page-${(ctx.rowIndex ?? 0) + 1}`;
  }

  // 7) SEO title & description
  const tplTitle = template.seo_title_pattern || "";
  const tplDesc = template.seo_description_pattern || "";
  let seoTitle = tplTitle ? resolvePattern(tplTitle, allVars).slice(0, 60) : title.slice(0, 60);
  let seoDescription = tplDesc
    ? resolvePattern(tplDesc, allVars).slice(0, 160)
    : html.replace(/<[^>]*>/g, "").slice(0, 160);

  // Length warnings
  if (seoTitle.length > 60) warnings.push(`SEO title exceeds 60 chars (${seoTitle.length})`);
  if (seoDescription.length > 160) warnings.push(`SEO description exceeds 160 chars (${seoDescription.length})`);
  if (seoDescription.length < 50 && seoDescription.length > 0) warnings.push(`SEO description too short (${seoDescription.length} chars)`);

  // 8) Canonical URL
  const canonicalPattern = schemaConfig._canonicalUrl || "";
  let canonicalUrl: string | null = null;
  if (canonicalPattern) {
    canonicalUrl = resolvePattern(canonicalPattern, { ...allVars, slug });
  } else if (ctx.website?.url) {
    canonicalUrl = `${ctx.website.url.replace(/\/+$/, "")}/${slug}`;
  }

  // 9) OG / Twitter meta
  const ogTitle = schemaConfig._ogTitle
    ? resolvePattern(schemaConfig._ogTitle, allVars)
    : seoTitle;
  const ogDesc = schemaConfig._ogDescription
    ? resolvePattern(schemaConfig._ogDescription, allVars)
    : seoDescription;
  const ogImage = schemaConfig._ogImage
    ? resolvePattern(schemaConfig._ogImage, { ...allVars, slug })
    : undefined;
  const twitterCard = schemaConfig._twitterCard || "summary_large_image";

  const ogTags = buildOgMeta({
    title: ogTitle,
    description: ogDesc,
    url: canonicalUrl || undefined,
    imageUrl: ogImage,
    twitterCard,
  });

  // 10) JSON-LD
  const jsonLd = buildJsonLd(
    template.schema_type || "WebPage",
    schemaConfig,
    allVars,
    title,
    seoDescription,
    ctx.campaignType,
    ctx.extraVars,
    ctx.row
  );

  return {
    html,
    title,
    slug,
    seoTitle,
    seoDescription,
    canonicalUrl,
    ogTags,
    jsonLd,
    warnings,
  };
}
