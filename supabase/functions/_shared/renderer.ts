/**
 * US17 — Shared Rendering Engine for Edge Functions
 * Re-exports from the portable renderer module.
 * Duplicated here to avoid import path issues in Deno edge functions.
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
  extraVars?: Record<string, string>;
  website?: { name?: string; url?: string };
  campaignType?: string;
  rowIndex?: number;
  /** BCP-47 / ISO-639-1 language code for locale-aware slugs and titles. */
  locale?: string;
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
  warnings: string[];
}

// ─── Core functions ──────────────────────────────────────────────────

import { slugifyLocale, titleCaseLocale, lowerLocale, upperLocale, truncateByGrapheme } from "./locale-format.ts";

/**
 * Slugify with optional locale awareness. Default behaviour (no locale) is
 * the legacy ASCII slug for backward compatibility.
 */
export function slugify(text: string, locale?: string): string {
  return slugifyLocale(text, locale);
}

export function processSpintax(text: string, deterministic = false): string {
  const MAX_DEPTH = 10;
  let result = text;
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

export function processConditionals(content: string, vars: Record<string, string>): string {
  return content.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)(?:\{\{#else\}\}([\s\S]*?))?\{\{\/if\}\}/gi,
    (_m, varName: string, ifBlock: string, elseBlock?: string) => {
      const value = vars[varName] || vars[varName.toLowerCase()];
      return value && value.trim() ? ifBlock : (elseBlock || "");
    }
  );
}

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

export function applyTransform(value: string, transform: string, locale?: string): string {
  const t = transform.toLowerCase();
  if (t === "uppercase") return upperLocale(value, locale);
  if (t === "lowercase") return lowerLocale(value, locale);
  if (t === "capitalize") return titleCaseLocale(value, locale);
  if (t === "slug") return slugifyLocale(value, locale);
  const extractMatch = t.match(/^extract\((\d+)\)$/);
  if (extractMatch) return value.split(/\s+/).slice(0, parseInt(extractMatch[1])).join(" ");
  const truncMatch = t.match(/^truncate\((\d+)\)$/);
  if (truncMatch) {
    const n = parseInt(truncMatch[1]);
    const truncated = truncateByGrapheme(value, n, locale);
    return truncated.length < value.length ? truncated + "…" : truncated;
  }
  return value;
}

export function replaceVariables(content: string, vars: Record<string, string>, locale?: string): string {
  let result = content.replace(/\{(\w+):(\w+(?:\(\d+\))?)\}/gi, (_m, varName: string, transform: string) => {
    const rawVal = vars[varName] || vars[varName.toLowerCase()] || "";
    return applyTransform(rawVal, transform, locale);
  });
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "gi"), value || "");
  }
  return result;
}

export function resolvePattern(pattern: string, vars: Record<string, string>): string {
  return replaceVariables(pattern, vars);
}

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
  if (schemaType && schemaType !== "WebPage") {
    const resolved: Record<string, any> = { "@context": "https://schema.org", "@type": schemaType };
    for (const [k, v] of Object.entries(schemaConfig)) {
      if (!v || k.startsWith("_")) continue;
      let val = v;
      for (const [vk, vv] of Object.entries(vars)) {
        val = val.replace(new RegExp(`\\{${vk}\\}`, "gi"), vv || "");
      }
      if (k.includes(".")) {
        const parts = k.split(".");
        let obj = resolved;
        for (let i = 0; i < parts.length - 1; i++) { if (!obj[parts[i]]) obj[parts[i]] = {}; obj = obj[parts[i]]; }
        obj[parts[parts.length - 1]] = val;
      } else {
        resolved[k] = val;
      }
    }
    if (!resolved.description) resolved.description = seoDescription;
    if (!resolved.name) resolved.name = pageTitle;
    if (schemaType === "LocalBusiness") {
      const addrFields = ["addressLocality", "addressRegion", "addressCountry", "postalCode"];
      const address: Record<string, string> = {};
      for (const af of addrFields) { if (resolved[af]) { address[af] = resolved[af]; delete resolved[af]; } }
      if (Object.keys(address).length > 0) resolved.address = { "@type": "PostalAddress", ...address };
    }
    if (schemaType === "Product" && resolved.price) {
      resolved.offers = { "@type": "Offer", price: resolved.price, priceCurrency: resolved.currency || "USD" };
      delete resolved.price; delete resolved.currency;
    }
    if (schemaType === "SoftwareApplication" && resolved.offers?.price) {
      resolved.offers["@type"] = "Offer";
      if (!resolved.offers.priceCurrency) resolved.offers.priceCurrency = "USD";
    }
    if (schemaType === "FAQPage" && resolved.question) {
      resolved.mainEntity = [{ "@type": "Question", name: resolved.question, acceptedAnswer: { "@type": "Answer", text: resolved.answer || "" } }];
      delete resolved.question; delete resolved.answer;
    }
    return `<script type="application/ld+json">${JSON.stringify(resolved)}</script>`;
  }
  const r = row || {};
  const geo = geoSettings || {};
  if (campaignType === "geo") {
    const schema: any = { "@context": "https://schema.org", "@type": "LocalBusiness", name: pageTitle, description: seoDescription };
    if ([geo.city, geo.region, geo.country].filter(Boolean).length > 0) {
      schema.address = { "@type": "PostalAddress", addressLocality: geo.city || "", addressRegion: geo.region || "", addressCountry: geo.country || "", postalCode: geo.postcode || "" };
    }
    if (geo.lat && geo.lng) schema.geo = { "@type": "GeoCoordinates", latitude: geo.lat, longitude: geo.lng };
    if (r.phone || r.telephone) schema.telephone = r.phone || r.telephone;
    if (r.email) schema.email = r.email;
    return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
  }
  if (r.question && r.answer) {
    return `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [{ "@type": "Question", name: r.question, acceptedAnswer: { "@type": "Answer", text: r.answer } }] })}</script>`;
  }
  return `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "WebPage", name: pageTitle, description: seoDescription })}</script>`;
}

export function buildOgMeta(opts: { title: string; description: string; url?: string; imageUrl?: string; twitterCard?: string }): string {
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

export function renderPage(template: TemplateConfig, ctx: RenderContext): RenderResult {
  const warnings: string[] = [];
  const locale = ctx.locale || "en";
  const allVars: Record<string, string> = { ...ctx.row, ...ctx.extraVars };
  const schemaConfig = template.schema_config || {};
  let html = processConditionals(template.content, allVars);
  html = processLoops(html, allVars);
  html = replaceVariables(html, allVars, locale);
  html = processSpintax(html);
  const unresolved = html.match(/\{[a-z_]+\}/gi);
  if (unresolved) warnings.push(`Unresolved variables: ${[...new Set(unresolved)].join(", ")}`);
  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  let title = h1Match ? h1Match[1].replace(/<[^>]*>/g, "").trim() : (Object.values(ctx.row).filter(Boolean).slice(0, 2).join(" - ") || `Page ${(ctx.rowIndex ?? 0) + 1}`);
  // Apply locale-aware title casing for the H1-derived title
  title = titleCaseLocale(title, locale);
  const slugPattern = schemaConfig._slugPattern || "";
  let slug = slugPattern
    ? (slugify(resolvePattern(slugPattern, allVars), locale) || slugify(title, locale))
    : (slugify(title, locale) || `page-${(ctx.rowIndex ?? 0) + 1}`);
  const tplTitle = template.seo_title_pattern || "";
  const tplDesc = template.seo_description_pattern || "";
  const seoTitle = tplTitle ? truncateByGrapheme(resolvePattern(tplTitle, allVars), 60, locale) : truncateByGrapheme(title, 60, locale);
  const seoDescription = tplDesc ? truncateByGrapheme(resolvePattern(tplDesc, allVars), 160, locale) : truncateByGrapheme(html.replace(/<[^>]*>/g, ""), 160, locale);
  if (seoTitle.length > 60) warnings.push(`SEO title exceeds 60 chars (${seoTitle.length})`);
  if (seoDescription.length > 160) warnings.push(`SEO description exceeds 160 chars (${seoDescription.length})`);
  if (seoDescription.length < 50 && seoDescription.length > 0) warnings.push(`SEO description too short (${seoDescription.length} chars)`);
  const canonicalPattern = schemaConfig._canonicalUrl || "";
  let canonicalUrl: string | null = canonicalPattern ? resolvePattern(canonicalPattern, { ...allVars, slug }) : (ctx.website?.url ? `${ctx.website.url.replace(/\/+$/, "")}/${slug}` : null);
  const ogTitle = schemaConfig._ogTitle ? resolvePattern(schemaConfig._ogTitle, allVars) : seoTitle;
  const ogDesc = schemaConfig._ogDescription ? resolvePattern(schemaConfig._ogDescription, allVars) : seoDescription;
  const ogImage = schemaConfig._ogImage ? resolvePattern(schemaConfig._ogImage, { ...allVars, slug }) : undefined;
  const twitterCard = schemaConfig._twitterCard || "summary_large_image";
  const ogTags = buildOgMeta({ title: ogTitle, description: ogDesc, url: canonicalUrl || undefined, imageUrl: ogImage, twitterCard });
  const jsonLd = buildJsonLd(template.schema_type || "WebPage", schemaConfig, allVars, title, seoDescription, ctx.campaignType, ctx.extraVars, ctx.row);
  return { html, title, slug, seoTitle, seoDescription, canonicalUrl, ogTags, jsonLd, warnings };
}
