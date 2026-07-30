/**
 * Built-in analyzers + the plug-in registry.
 *
 * To extend the platform with a new SEO capability, write an `Analyzer` and
 * call `registerAnalyzer()` — every module (Generate, Website Content, Audit,
 * Analytics, Competitor, AI Visibility) picks it up automatically.
 */

import { analyzeAiVisibility } from "./ai-visibility.ts";
import { analyzeEntities, analyzeKeywords } from "./keywords.ts";
import { suggestInternalLinks } from "./internal-links.ts";
import { analyzeReadability } from "./readability.ts";
import type { Analyzer, AnalyzerResult, PageSignals, SeoEngineInput, SeoFinding } from "./types.ts";

const pass = (id: string, category: SeoFinding["category"], label: string): SeoFinding => ({
  id,
  category,
  severity: "pass",
  label,
});

// ── Title ───────────────────────────────────────────────────────────────────

const titleAnalyzer: Analyzer = {
  key: "title",
  label: "Title",
  run(signals, input) {
    const title = (input.seoTitle || signals.meta.title || input.title || "").trim();
    const findings: SeoFinding[] = [];
    let score = 0;

    if (!title) {
      findings.push({
        id: "title.missing",
        category: "title",
        severity: "critical",
        label: "Missing SEO title",
        tip: "Add a 30–60 character title containing the focus keyword.",
        fixable: true,
      });
    } else {
      score = 40;
      if (title.length >= 30 && title.length <= 60) {
        score += 30;
        findings.push(pass("title.length", "title", `Title length is ideal (${title.length} chars)`));
      } else {
        findings.push({
          id: "title.length",
          category: "title",
          severity: title.length < 20 || title.length > 70 ? "critical" : "warning",
          label: `Title is ${title.length} characters`,
          tip: "Aim for 30–60 characters so it isn't truncated in search results.",
          data: { title, length: title.length },
          fixable: true,
        });
      }

      const focus = (input.focusKeyword || input.seoKeywords?.[0] || "").toLowerCase();
      if (focus) {
        if (title.toLowerCase().includes(focus)) {
          score += 30;
          findings.push(pass("title.keyword", "title", "Focus keyword present in title"));
        } else {
          findings.push({
            id: "title.keyword",
            category: "title",
            severity: "critical",
            label: "Focus keyword missing from title",
            tip: `Include "${focus}" within the first 20 characters of the title.`,
            data: { focus },
            fixable: true,
          });
        }
      } else {
        score += 20;
      }
    }

    return { findings, scores: { seo: undefined }, details: { title, titleScore: score } };
  },
};

// ── Meta description ────────────────────────────────────────────────────────

const descriptionAnalyzer: Analyzer = {
  key: "description",
  label: "Meta description",
  run(signals, input) {
    const description = (input.seoDescription || signals.meta.description || "").trim();
    const findings: SeoFinding[] = [];

    if (!description) {
      findings.push({
        id: "description.missing",
        category: "description",
        severity: "critical",
        label: "Missing meta description",
        tip: "Write a 120–158 character description with the focus keyword and a call to action.",
        fixable: true,
      });
    } else {
      if (description.length < 120 || description.length > 158) {
        findings.push({
          id: "description.length",
          category: "description",
          severity: "warning",
          label: `Meta description is ${description.length} characters`,
          tip: "Aim for 120–158 characters.",
          data: { length: description.length },
          fixable: true,
        });
      } else {
        findings.push(pass("description.length", "description", "Meta description length is ideal"));
      }

      const focus = (input.focusKeyword || input.seoKeywords?.[0] || "").toLowerCase();
      if (focus && !description.toLowerCase().includes(focus)) {
        findings.push({
          id: "description.keyword",
          category: "description",
          severity: "warning",
          label: "Focus keyword missing from meta description",
          tip: `Mention "${focus}" naturally in the description.`,
          fixable: true,
        });
      }
    }

    return { findings, details: { description } };
  },
};

// ── Headings ────────────────────────────────────────────────────────────────

const headingsAnalyzer: Analyzer = {
  key: "headings",
  label: "Headings",
  run(signals) {
    const findings: SeoFinding[] = [];
    const h1 = signals.headings.filter((h) => h.level === 1);
    const h2 = signals.headings.filter((h) => h.level === 2);
    const h3 = signals.headings.filter((h) => h.level === 3);

    if (h1.length === 0) {
      findings.push({
        id: "headings.no-h1",
        category: "headings",
        severity: "critical",
        label: "No H1 found",
        tip: "Every page needs exactly one H1 containing the primary keyword.",
        fixable: true,
      });
    } else if (h1.length > 1) {
      findings.push({
        id: "headings.multiple-h1",
        category: "headings",
        severity: "warning",
        label: `${h1.length} H1 tags found`,
        tip: "Keep a single H1 and demote the rest to H2.",
        data: { headings: h1.map((h) => h.text) },
      });
    } else {
      findings.push(pass("headings.h1", "headings", "Exactly one H1"));
    }

    if (h2.length < 2) {
      findings.push({
        id: "headings.thin-h2",
        category: "headings",
        severity: "warning",
        label: `Only ${h2.length} H2 section(s)`,
        tip: "Use at least 3 H2 sections so the page is scannable and extractable.",
        fixable: true,
      });
    } else {
      findings.push(pass("headings.h2", "headings", `${h2.length} H2 sections`));
    }

    // Hierarchy jumps (H2 → H4)
    let previous = 0;
    for (const heading of signals.headings) {
      if (previous && heading.level > previous + 1) {
        findings.push({
          id: "headings.skipped-level",
          category: "headings",
          severity: "info",
          label: `Heading level skipped (H${previous} → H${heading.level})`,
          tip: "Keep the outline sequential: H1 → H2 → H3 → H4.",
          data: { heading: heading.text },
        });
        break;
      }
      previous = heading.level;
    }

    return {
      findings,
      details: { outline: signals.headings, h1Count: h1.length, h2Count: h2.length, h3Count: h3.length },
    };
  },
};

// ── Content ─────────────────────────────────────────────────────────────────

const contentAnalyzer: Analyzer = {
  key: "content",
  label: "Content",
  run(signals) {
    const findings: SeoFinding[] = [];
    const words = signals.wordCount;

    if (words < 300) {
      findings.push({
        id: "content.thin",
        category: "content",
        severity: "critical",
        label: `Thin content (${words} words)`,
        tip: "Aim for at least 600 words of unique, useful copy.",
        data: { words },
        fixable: true,
      });
    } else if (words < 600) {
      findings.push({
        id: "content.short",
        category: "content",
        severity: "warning",
        label: `Content is short (${words} words)`,
        tip: "Expand to 600+ words with sections that answer real user questions.",
        data: { words },
        fixable: true,
      });
    } else {
      findings.push(pass("content.length", "content", `${words} words of content`));
    }

    const score = words >= 900 ? 100 : words >= 600 ? 85 : words >= 300 ? 55 : 25;
    return { findings, scores: { content: score }, details: { wordCount: words } };
  },
};

// ── Keywords ────────────────────────────────────────────────────────────────

const keywordsAnalyzer: Analyzer = {
  key: "keywords",
  label: "Keywords",
  run(signals, input) {
    const analysis = analyzeKeywords(signals, {
      focusKeyword: input.focusKeyword,
      keywords: input.seoKeywords,
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
      slug: input.slug,
    });
    const findings: SeoFinding[] = [];

    if (!analysis.primary) {
      findings.push({
        id: "keywords.none",
        category: "keywords",
        severity: "warning",
        label: "No focus keyword set",
        tip: "Assign a primary keyword so the engine can optimise placement and density.",
        fixable: true,
      });
    } else {
      const { primary, densityStatus } = analysis;
      if (densityStatus === "missing" || densityStatus === "thin") {
        findings.push({
          id: "keywords.density-low",
          category: "keywords",
          severity: densityStatus === "missing" ? "critical" : "warning",
          label: `Keyword density is ${primary.density}%`,
          tip: `Mention "${primary.keyword}" naturally a few more times (target 0.8–2.5%).`,
          data: { keyword: primary.keyword, density: primary.density },
          fixable: true,
        });
      } else if (densityStatus === "stuffed") {
        findings.push({
          id: "keywords.density-high",
          category: "keywords",
          severity: "warning",
          label: `Keyword stuffing risk (${primary.density}%)`,
          tip: "Replace some exact repeats with semantic variations.",
          fixable: true,
        });
      } else {
        findings.push(pass("keywords.density", "keywords", `Keyword density is healthy (${primary.density}%)`));
      }

      if (!primary.inFirstParagraph) {
        findings.push({
          id: "keywords.intro",
          category: "keywords",
          severity: "warning",
          label: "Focus keyword missing from the intro",
          tip: "Mention the keyword in the first 100 words.",
          fixable: true,
        });
      }
      if (!primary.inSubheadings) {
        findings.push({
          id: "keywords.subheadings",
          category: "keywords",
          severity: "info",
          label: "Focus keyword missing from subheadings",
          tip: "Use the keyword (or a close variant) in at least one H2.",
          fixable: true,
        });
      }
    }

    return {
      findings,
      scores: { keywords: analysis.score },
      details: { keywordAnalysis: analysis },
    };
  },
};

// ── Readability ─────────────────────────────────────────────────────────────

const readabilityAnalyzer: Analyzer = {
  key: "readability",
  label: "Readability",
  run(signals) {
    const result = analyzeReadability(signals);
    const findings: SeoFinding[] = [];

    if (result.score < 55) {
      findings.push({
        id: "readability.hard",
        category: "readability",
        severity: result.score < 35 ? "critical" : "warning",
        label: `Hard to read (${result.label}, score ${result.score})`,
        tip: "Shorten sentences to under 25 words and split long paragraphs.",
        data: { ...result },
        fixable: true,
      });
    } else {
      findings.push(pass("readability.ok", "readability", `Readability is good (${result.label})`));
    }

    if (result.longParagraphRatio > 0.25) {
      findings.push({
        id: "readability.long-paragraphs",
        category: "readability",
        severity: "info",
        label: "Several very long paragraphs",
        tip: "Keep paragraphs under 150 words — better for users and AI extraction.",
        fixable: true,
      });
    }

    return { findings, scores: { readability: result.score }, details: { readability: result } };
  },
};

// ── Images ──────────────────────────────────────────────────────────────────

const imagesAnalyzer: Analyzer = {
  key: "images",
  label: "Images",
  run(signals) {
    const findings: SeoFinding[] = [];
    const total = signals.images.length;
    const missingAlt = signals.images.filter((i) => !i.hasAlt);
    const noLazy = signals.images.filter((i) => i.loading !== "lazy");
    const noDimensions = signals.images.filter((i) => !i.width || !i.height);

    if (total === 0) {
      findings.push({
        id: "images.none",
        category: "images",
        severity: "warning",
        label: "No images on the page",
        tip: "Add at least one relevant image with descriptive alt text.",
      });
    } else if (missingAlt.length) {
      findings.push({
        id: "images.missing-alt",
        category: "images",
        severity: "critical",
        label: `${missingAlt.length} of ${total} images missing alt text`,
        tip: "Add descriptive alt text including the keyword where natural.",
        data: { sources: missingAlt.map((i) => i.src).slice(0, 20) },
        fixable: true,
      });
    } else {
      findings.push(pass("images.alt", "images", "All images have alt text"));
    }

    if (total > 2 && noLazy.length > 1) {
      findings.push({
        id: "images.lazy",
        category: "images",
        severity: "info",
        label: `${noLazy.length} images are not lazy-loaded`,
        tip: 'Add loading="lazy" to below-the-fold images to improve LCP.',
        fixable: true,
      });
    }
    if (total > 0 && noDimensions.length) {
      findings.push({
        id: "images.dimensions",
        category: "images",
        severity: "info",
        label: `${noDimensions.length} images missing width/height`,
        tip: "Set explicit dimensions to avoid layout shift (CLS).",
        fixable: true,
      });
    }

    const score = total === 0 ? 40 : Math.round(((total - missingAlt.length) / total) * 100);
    return { findings, details: { imageCount: total, missingAlt: missingAlt.length, imageScore: score } };
  },
};

// ── Links ───────────────────────────────────────────────────────────────────

const linksAnalyzer: Analyzer = {
  key: "links",
  label: "Links",
  run(signals, input) {
    const findings: SeoFinding[] = [];
    const internal = signals.links.filter((l) => l.internal);
    const external = signals.links.filter((l) => !l.internal);
    const generic = signals.links.filter((l) => /^(click here|read more|here|link|more)$/i.test(l.text.trim()));

    if (internal.length < 3) {
      findings.push({
        id: "links.few-internal",
        category: "links",
        severity: internal.length === 0 ? "critical" : "warning",
        label: `Only ${internal.length} internal link(s)`,
        tip: "Add 3–8 contextual internal links to related pages.",
        fixable: true,
      });
    } else {
      findings.push(pass("links.internal", "links", `${internal.length} internal links`));
    }

    if (external.length === 0) {
      findings.push({
        id: "links.no-external",
        category: "links",
        severity: "info",
        label: "No outbound citations",
        tip: "Link to one authoritative source — it raises trust for AI citations.",
      });
    }

    if (generic.length) {
      findings.push({
        id: "links.generic-anchor",
        category: "links",
        severity: "info",
        label: `${generic.length} generic anchor text link(s)`,
        tip: 'Replace "click here" style anchors with descriptive text.',
        fixable: true,
      });
    }

    const suggestions = suggestInternalLinks(signals, input.corpus, { currentSlug: input.slug });
    if (suggestions.length) {
      findings.push({
        id: "links.suggestions",
        category: "links",
        severity: "info",
        label: `${suggestions.length} internal link opportunities found`,
        tip: "Apply the suggested contextual links.",
        data: { suggestions },
        fixable: true,
      });
    }

    return {
      findings,
      details: {
        internalLinks: internal.length,
        externalLinks: external.length,
        linkSuggestions: suggestions,
      },
    };
  },
};

// ── Schema ──────────────────────────────────────────────────────────────────

const schemaAnalyzer: Analyzer = {
  key: "schema",
  label: "Structured data",
  run(signals) {
    const findings: SeoFinding[] = [];
    if (!signals.jsonLd.length) {
      findings.push({
        id: "schema.missing",
        category: "schema",
        severity: "critical",
        label: "No JSON-LD structured data",
        tip: "Add schema (WebPage/Article/LocalBusiness + FAQPage) so search and AI engines understand the page.",
        fixable: true,
      });
    } else {
      findings.push(pass("schema.present", "schema", `${signals.jsonLd.length} JSON-LD block(s)`));
      const invalid = signals.jsonLd.filter((s) => !s["@context"] || !s["@type"]);
      if (invalid.length) {
        findings.push({
          id: "schema.incomplete",
          category: "schema",
          severity: "warning",
          label: `${invalid.length} schema block(s) missing @context or @type`,
          fixable: true,
        });
      }
    }
    return { findings };
  },
};

// ── Social (OG / Twitter) ───────────────────────────────────────────────────

const socialAnalyzer: Analyzer = {
  key: "social",
  label: "Social previews",
  run(signals) {
    const findings: SeoFinding[] = [];
    const { og, twitter } = signals.meta;

    const missingOg = ["title", "description", "type", "url"].filter((k) => !og[k]);
    if (missingOg.length) {
      findings.push({
        id: "social.og",
        category: "social",
        severity: "warning",
        label: `Open Graph incomplete (missing ${missingOg.join(", ")})`,
        tip: "Add og:title, og:description, og:type, og:url and og:image.",
        data: { missing: missingOg },
        fixable: true,
      });
    } else {
      findings.push(pass("social.og", "social", "Open Graph tags present"));
    }

    if (!og.image) {
      findings.push({
        id: "social.og-image",
        category: "social",
        severity: "info",
        label: "No og:image",
        tip: "Add a 1200×630 preview image.",
        fixable: true,
      });
    }

    if (!twitter.card) {
      findings.push({
        id: "social.twitter",
        category: "social",
        severity: "info",
        label: "No Twitter Card tags",
        tip: "Add twitter:card, twitter:title and twitter:description.",
        fixable: true,
      });
    } else {
      findings.push(pass("social.twitter", "social", "Twitter Card present"));
    }

    return { findings };
  },
};

// ── Technical ───────────────────────────────────────────────────────────────

const technicalAnalyzer: Analyzer = {
  key: "technical",
  label: "Technical",
  run(signals, input) {
    const findings: SeoFinding[] = [];
    const canonical = input.canonicalUrl || signals.meta.canonical;

    if (!canonical) {
      findings.push({
        id: "technical.canonical",
        category: "technical",
        severity: "warning",
        label: "No canonical URL",
        tip: "Add a self-referencing canonical to avoid duplicate-content dilution.",
        fixable: true,
      });
    } else {
      findings.push(pass("technical.canonical", "technical", "Canonical URL set"));
    }

    if (/noindex/i.test(signals.meta.robots || "")) {
      findings.push({
        id: "technical.noindex",
        category: "technical",
        severity: "critical",
        label: "Page is set to noindex",
        tip: "Remove the noindex directive if this page should rank.",
      });
    }

    const slug = input.slug || "";
    if (slug) {
      if (slug.length > 60) {
        findings.push({
          id: "technical.slug-long",
          category: "technical",
          severity: "info",
          label: "Slug is very long",
          tip: "Keep slugs under ~60 characters with 3–5 meaningful words.",
          fixable: true,
        });
      }
      if (/[A-Z_ ]|%20/.test(slug)) {
        findings.push({
          id: "technical.slug-format",
          category: "technical",
          severity: "warning",
          label: "Slug should be lowercase and hyphenated",
          fixable: true,
        });
      }
    }

    const technicalScore =
      (canonical ? 40 : 0) +
      (/noindex/i.test(signals.meta.robots || "") ? 0 : 30) +
      (slug && !/[A-Z_ ]/.test(slug) ? 30 : 10);

    return { findings, scores: { technical: Math.min(100, technicalScore) } };
  },
};

// ── Conversion (CTA / FAQ / PAA) ────────────────────────────────────────────

const conversionAnalyzer: Analyzer = {
  key: "conversion",
  label: "Conversion & answers",
  run(signals) {
    const findings: SeoFinding[] = [];

    if (!signals.hasCta) {
      findings.push({
        id: "conversion.no-cta",
        category: "conversion",
        severity: "warning",
        label: "No clear call to action",
        tip: "Add a specific CTA (Get a free quote, Book a call, Order now) above and below the fold.",
        fixable: true,
      });
    } else {
      findings.push(pass("conversion.cta", "conversion", "Call to action present"));
    }

    if (!signals.hasFaqBlock) {
      findings.push({
        id: "conversion.no-faq",
        category: "conversion",
        severity: "warning",
        label: "No FAQ section",
        tip: "Add 4–6 FAQs (People Also Ask style) with FAQPage schema.",
        fixable: true,
      });
    } else {
      findings.push(pass("conversion.faq", "conversion", "FAQ section detected"));
    }

    return { findings };
  },
};

// ── Entities ────────────────────────────────────────────────────────────────

const entitiesAnalyzer: Analyzer = {
  key: "entities",
  label: "Entities",
  run(signals, input) {
    const coverage = analyzeEntities(signals, input.targetEntities);
    const findings: SeoFinding[] = [];

    if (coverage.missing.length) {
      findings.push({
        id: "entities.missing",
        category: "entities",
        severity: coverage.score < 50 ? "warning" : "info",
        label: `${coverage.missing.length} target entities not covered`,
        tip: `Mention: ${coverage.missing.slice(0, 6).join(", ")}`,
        data: { missing: coverage.missing },
        fixable: true,
      });
    } else if (input.targetEntities?.length) {
      findings.push(pass("entities.covered", "entities", "All target entities covered"));
    }

    return { findings, scores: { entityCoverage: coverage.score }, details: { entities: coverage } };
  },
};

// ── Performance ─────────────────────────────────────────────────────────────

const performanceAnalyzer: Analyzer = {
  key: "performance",
  label: "Performance",
  run(signals, input) {
    const findings: SeoFinding[] = [];
    const field = input.field;
    const inlineKb = Math.round((signals.inlineCssBytes + signals.inlineJsBytes) / 1024);

    if (!field) {
      if (inlineKb > 250) {
        findings.push({
          id: "performance.inline-weight",
          category: "performance",
          severity: "warning",
          label: `${inlineKb} KB of inline CSS/JS`,
          tip: "Trim unused CSS/JS — large inline blocks delay first paint.",
          fixable: true,
        });
      }
      return { findings, scores: { performance: undefined }, details: { inlineKb } };
    }

    let score = 100;
    const check = (
      id: string,
      label: string,
      value: number | undefined,
      good: number,
      poor: number,
      tip: string,
    ) => {
      if (value === undefined) return;
      if (value > poor) {
        score -= 25;
        findings.push({ id, category: "performance", severity: "critical", label: `${label}: ${value}`, tip });
      } else if (value > good) {
        score -= 10;
        findings.push({ id, category: "performance", severity: "warning", label: `${label}: ${value}`, tip });
      } else {
        findings.push(pass(id, "performance", `${label}: ${value} (good)`));
      }
    };

    check("performance.lcp", "LCP (s)", field.lcp, 2.5, 4, "Optimise the hero image and reduce render-blocking CSS.");
    check("performance.cls", "CLS", field.cls, 0.1, 0.25, "Set width/height on images and reserve space for embeds.");
    check("performance.inp", "INP (ms)", field.inp, 200, 500, "Reduce long JavaScript tasks.");
    check("performance.ttfb", "TTFB (ms)", field.ttfb, 800, 1800, "Enable caching/CDN on the origin.");

    if (field.unusedCssKb && field.unusedCssKb > 50) {
      score -= 8;
      findings.push({
        id: "performance.unused-css",
        category: "performance",
        severity: "warning",
        label: `${field.unusedCssKb} KB unused CSS`,
        tip: "Ship only the CSS the page uses (critical CSS + defer the rest).",
        fixable: true,
      });
    }
    if (field.unusedJsKb && field.unusedJsKb > 50) {
      score -= 8;
      findings.push({
        id: "performance.unused-js",
        category: "performance",
        severity: "warning",
        label: `${field.unusedJsKb} KB unused JavaScript`,
        tip: "Remove or defer unused scripts.",
        fixable: true,
      });
    }
    if (field.renderBlockingCount && field.renderBlockingCount > 0) {
      score -= 8;
      findings.push({
        id: "performance.render-blocking",
        category: "performance",
        severity: "warning",
        label: `${field.renderBlockingCount} render-blocking resources`,
        tip: "Inline critical CSS and defer the rest.",
        fixable: true,
      });
    }

    return { findings, scores: { performance: Math.max(0, score) }, details: { inlineKb, field } };
  },
};

// ── AI visibility ───────────────────────────────────────────────────────────

const aiVisibilityAnalyzer: Analyzer = {
  key: "ai-visibility",
  label: "AI visibility",
  run(signals, input) {
    const entities = analyzeEntities(signals, input.targetEntities);
    const result = analyzeAiVisibility(signals, { entityCoverageScore: entities.score });
    const findings: SeoFinding[] = result.recommendations.map((tip, index) => ({
      id: `ai-visibility.rec-${index}`,
      category: "ai-visibility" as const,
      severity: result.aiVisibility < 50 ? ("warning" as const) : ("info" as const),
      label: tip,
      fixable: true,
    }));

    if (!findings.length) {
      findings.push(pass("ai-visibility.ok", "ai-visibility", "Page is AI-search ready"));
    }

    return {
      findings,
      scores: {
        aiVisibility: result.aiVisibility,
        geo: result.geo,
        citationReadiness: result.citationReadiness,
        structuredData: result.structuredData,
      },
      details: { aiVisibility: result },
    };
  },
};

// ── Mobile ──────────────────────────────────────────────────────────────────

const mobileAnalyzer: Analyzer = {
  key: "mobile",
  label: "Mobile",
  run(signals, input) {
    const html = input.html || "";
    const findings: SeoFinding[] = [];
    let score = 100;

    if (!/name\s*=\s*["']viewport["']/i.test(html)) {
      score -= 35;
      findings.push({
        id: "mobile.viewport",
        category: "technical",
        severity: "critical",
        label: "No responsive viewport meta tag",
        tip: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.',
        fixable: true,
      });
    }
    const fixedWidths = (html.match(/width\s*:\s*\d{4,}px/gi) || []).length;
    if (fixedWidths) {
      score -= 20;
      findings.push({
        id: "mobile.fixed-width",
        category: "technical",
        severity: "warning",
        label: `${fixedWidths} fixed widths over 999px`,
        tip: "Use max-width and relative units so the layout adapts on phones.",
      });
    }
    if (!/@media[^{]*max-width/i.test(html) && signals.inlineCssBytes > 2000) {
      score -= 15;
      findings.push({
        id: "mobile.no-media-queries",
        category: "technical",
        severity: "warning",
        label: "No responsive breakpoints found",
        tip: "Add @media queries for tablet and mobile.",
      });
    }
    const tinyFonts = (html.match(/font-size\s*:\s*(?:[0-9]|1[01])px/gi) || []).length;
    if (tinyFonts > 2) {
      score -= 10;
      findings.push({
        id: "mobile.small-text",
        category: "technical",
        severity: "info",
        label: "Very small font sizes detected",
        tip: "Keep body text at 16px or larger on mobile.",
      });
    }

    return { findings, scores: { mobile: Math.max(0, score) } };
  },
};

// ── Registry ────────────────────────────────────────────────────────────────

const BUILT_IN: Analyzer[] = [
  titleAnalyzer,
  descriptionAnalyzer,
  headingsAnalyzer,
  contentAnalyzer,
  keywordsAnalyzer,
  readabilityAnalyzer,
  imagesAnalyzer,
  linksAnalyzer,
  schemaAnalyzer,
  socialAnalyzer,
  technicalAnalyzer,
  conversionAnalyzer,
  entitiesAnalyzer,
  performanceAnalyzer,
  aiVisibilityAnalyzer,
  mobileAnalyzer,
];

const registry = new Map<string, Analyzer>(BUILT_IN.map((a) => [a.key, a]));

/** Register (or replace) an analyzer. Future modules plug in here. */
export function registerAnalyzer(analyzer: Analyzer): void {
  registry.set(analyzer.key, analyzer);
}

export function getAnalyzers(): Analyzer[] {
  return [...registry.values()];
}

export function runAnalyzers(signals: PageSignals, input: SeoEngineInput): AnalyzerResult[] {
  return getAnalyzers().map((analyzer) => {
    try {
      return analyzer.run(signals, input);
    } catch (error) {
      return {
        findings: [
          {
            id: `${analyzer.key}.error`,
            category: "technical" as const,
            severity: "info" as const,
            label: `${analyzer.label} analyzer failed`,
            tip: error instanceof Error ? error.message : String(error),
          },
        ],
      };
    }
  });
}
