import { describe, it, expect } from "vitest";
import {
  slugify,
  processSpintax,
  processConditionals,
  processLoops,
  applyTransform,
  replaceVariables,
  resolvePattern,
  buildJsonLd,
  buildOgMeta,
  renderPage,
} from "@/lib/renderer";

// ─── slugify ─────────────────────────────────────────────────────────

describe("slugify", () => {
  it("converts to lowercase with hyphens", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });
  it("removes accents", () => {
    expect(slugify("café résumé")).toBe("cafe-resume");
  });
  it("strips special chars", () => {
    expect(slugify("Test! @#$ Slug")).toBe("test-slug");
  });
  it("trims leading/trailing hyphens", () => {
    expect(slugify("--hello--")).toBe("hello");
  });
  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });
});

// ─── processSpintax ──────────────────────────────────────────────────

describe("processSpintax", () => {
  it("picks deterministic option", () => {
    const result = processSpintax("{hello|world}", true);
    expect(["hello", "world"]).toContain(result);
  });
  it("handles nested spintax", () => {
    const result = processSpintax("{a {b|c}|d}", true);
    expect(result).toBeTruthy();
    expect(result).not.toContain("{");
  });
  it("leaves non-spintax braces untouched", () => {
    expect(processSpintax("{variable}")).toBe("{variable}");
  });
});

// ─── processConditionals ─────────────────────────────────────────────

describe("processConditionals", () => {
  it("renders if-block when variable is truthy", () => {
    const result = processConditionals(
      "{{#if city}}In {city}{{/if}}",
      { city: "Paris" }
    );
    expect(result).toBe("In {city}");
  });
  it("renders else-block when variable is empty", () => {
    const result = processConditionals(
      "{{#if city}}In city{{#else}}No city{{/if}}",
      { city: "" }
    );
    expect(result).toBe("No city");
  });
  it("renders else-block when variable is missing", () => {
    const result = processConditionals(
      "{{#if phone}}Call us{{#else}}Email us{{/if}}",
      {}
    );
    expect(result).toBe("Email us");
  });
});

// ─── processLoops ────────────────────────────────────────────────────

describe("processLoops", () => {
  it("expands comma-separated list", () => {
    const result = processLoops(
      "{{#each services}}<li>{{this}}</li>{{/each}}",
      { services: "Web,Mobile,Cloud" }
    );
    expect(result).toContain("<li>Web</li>");
    expect(result).toContain("<li>Mobile</li>");
    expect(result).toContain("<li>Cloud</li>");
  });
  it("provides @index and @number", () => {
    const result = processLoops(
      "{{#each items}}{{@number}}.{{this}} {{/each}}",
      { items: "A,B" }
    );
    expect(result).toContain("1.A");
    expect(result).toContain("2.B");
  });
  it("returns empty for missing variable", () => {
    const result = processLoops("{{#each missing}}x{{/each}}", {});
    expect(result).toBe("");
  });
});

// ─── applyTransform ──────────────────────────────────────────────────

describe("applyTransform", () => {
  it("uppercase", () => expect(applyTransform("hello", "uppercase")).toBe("HELLO"));
  it("lowercase", () => expect(applyTransform("HELLO", "lowercase")).toBe("hello"));
  it("capitalize", () => expect(applyTransform("hello world", "capitalize")).toBe("Hello World"));
  it("slug", () => expect(applyTransform("Hello World!", "slug")).toBe("hello-world"));
  it("truncate(5)", () => expect(applyTransform("Hello World", "truncate(5)")).toBe("Hello…"));
  it("extract(2)", () => expect(applyTransform("one two three", "extract(2)")).toBe("one two"));
  it("unknown transform returns value", () => expect(applyTransform("val", "unknown")).toBe("val"));
});

// ─── replaceVariables ────────────────────────────────────────────────

describe("replaceVariables", () => {
  it("replaces plain variables", () => {
    expect(replaceVariables("Hello {name}!", { name: "World" })).toBe("Hello World!");
  });
  it("replaces variables with transforms", () => {
    expect(replaceVariables("{city:uppercase} rocks", { city: "paris" })).toBe("PARIS rocks");
  });
  it("case insensitive matching", () => {
    expect(replaceVariables("{City} and {CITY}", { city: "Paris" })).toBe("Paris and Paris");
  });
  it("handles missing variables gracefully", () => {
    expect(replaceVariables("Hi {name}", {})).toBe("Hi ");
  });
});

// ─── resolvePattern ──────────────────────────────────────────────────

describe("resolvePattern", () => {
  it("resolves SEO title pattern", () => {
    const result = resolvePattern("{keyword} in {city} | Brand", {
      keyword: "Plumber",
      city: "London",
    });
    expect(result).toBe("Plumber in London | Brand");
  });
});

// ─── buildJsonLd ─────────────────────────────────────────────────────

describe("buildJsonLd", () => {
  it("builds WebPage schema by default", () => {
    const ld = buildJsonLd("WebPage", {}, {}, "My Page", "Description");
    const parsed = JSON.parse(ld.replace(/<[^>]*>/g, ""));
    expect(parsed["@type"]).toBe("WebPage");
    expect(parsed.name).toBe("My Page");
  });

  it("builds LocalBusiness with nested address", () => {
    const ld = buildJsonLd(
      "LocalBusiness",
      { name: "Acme", addressLocality: "Paris", addressCountry: "France" },
      {},
      "Acme",
      "Business desc"
    );
    const parsed = JSON.parse(ld.replace(/<[^>]*>/g, ""));
    expect(parsed["@type"]).toBe("LocalBusiness");
    expect(parsed.address?.addressLocality).toBe("Paris");
  });

  it("builds Product with offers", () => {
    const ld = buildJsonLd(
      "Product",
      { name: "Widget", price: "29.99", currency: "EUR" },
      {},
      "Widget",
      "A widget"
    );
    const parsed = JSON.parse(ld.replace(/<[^>]*>/g, ""));
    expect(parsed.offers?.price).toBe("29.99");
    expect(parsed.offers?.priceCurrency).toBe("EUR");
  });

  it("builds SoftwareApplication with nested offers", () => {
    const ld = buildJsonLd(
      "SoftwareApplication",
      { name: "MyApp", "offers.price": "9.99", "offers.priceCurrency": "USD" },
      {},
      "MyApp",
      "An app"
    );
    const parsed = JSON.parse(ld.replace(/<[^>]*>/g, ""));
    expect(parsed["@type"]).toBe("SoftwareApplication");
    expect(parsed.offers?.price).toBe("9.99");
  });

  it("skips internal _-prefixed keys", () => {
    const ld = buildJsonLd(
      "LocalBusiness",
      { name: "Biz", _slugPattern: "test", _ogTitle: "og" },
      {},
      "Biz",
      "desc"
    );
    const parsed = JSON.parse(ld.replace(/<[^>]*>/g, ""));
    expect(parsed._slugPattern).toBeUndefined();
    expect(parsed._ogTitle).toBeUndefined();
  });

  it("auto-detects FAQ from row data", () => {
    const ld = buildJsonLd("WebPage", {}, {}, "FAQ", "desc", "seo", {}, {
      question: "What?",
      answer: "That.",
    });
    const parsed = JSON.parse(ld.replace(/<[^>]*>/g, ""));
    expect(parsed["@type"]).toBe("FAQPage");
  });
});

// ─── buildOgMeta ─────────────────────────────────────────────────────

describe("buildOgMeta", () => {
  it("includes all required tags", () => {
    const result = buildOgMeta({
      title: "Test",
      description: "Desc",
      url: "https://example.com",
      imageUrl: "https://example.com/img.jpg",
      twitterCard: "summary",
    });
    expect(result).toContain('og:title');
    expect(result).toContain('og:description');
    expect(result).toContain('og:url');
    expect(result).toContain('og:image');
    expect(result).toContain('twitter:card');
    expect(result).toContain('content="summary"');
  });
  it("escapes special chars", () => {
    const result = buildOgMeta({ title: 'He said "hi" & <bye>', description: "ok" });
    expect(result).toContain("&amp;");
    expect(result).toContain("&quot;");
    expect(result).toContain("&lt;");
  });
});

// ─── renderPage (integration) ────────────────────────────────────────

describe("renderPage", () => {
  it("produces complete render result", () => {
    const result = renderPage(
      {
        content: "<h1>{keyword} in {city}</h1><p>Best {keyword} services.</p>",
        seo_title_pattern: "{keyword} in {city} | Brand",
        seo_description_pattern: "Find the best {keyword} in {city}.",
        schema_type: "LocalBusiness",
        schema_config: {
          name: "{keyword}",
          addressLocality: "{city}",
          _slugPattern: "{keyword}-{city}",
          _canonicalUrl: "https://example.com/{slug}",
          _ogTitle: "{keyword} — {city}",
          _twitterCard: "summary_large_image",
        },
      },
      {
        row: { keyword: "Plumber", city: "London" },
        campaignType: "geo",
        rowIndex: 0,
      }
    );

    expect(result.title).toBe("Plumber in London");
    expect(result.slug).toBe("plumber-london");
    expect(result.seoTitle).toBe("Plumber in London | Brand");
    expect(result.seoDescription).toBe("Find the best Plumber in London.");
    expect(result.canonicalUrl).toBe("https://example.com/plumber-london");
    expect(result.html).toContain("Best Plumber services");
    expect(result.ogTags).toContain("Plumber — London");
    expect(result.jsonLd).toContain('"@type":"LocalBusiness"');
    expect(result.warnings).toHaveLength(0);
  });

  it("warns about unresolved variables", () => {
    const result = renderPage(
      { content: "<p>{missing_var} text</p>" },
      { row: {}, rowIndex: 0 }
    );
    expect(result.warnings.some(w => w.includes("Unresolved"))).toBe(true);
  });

  it("handles conditionals and loops in full render", () => {
    const result = renderPage(
      {
        content:
          "{{#if phone}}<p>Call {phone}</p>{{#else}}<p>Email us</p>{{/if}}" +
          "{{#each services}}<li>{{this}}</li>{{/each}}",
      },
      {
        row: { phone: "123", services: "A,B,C" },
        rowIndex: 0,
      }
    );
    expect(result.html).toContain("Call 123");
    expect(result.html).not.toContain("Email us");
    expect(result.html).toContain("<li>A</li>");
    expect(result.html).toContain("<li>B</li>");
  });
});
