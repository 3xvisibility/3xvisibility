import { describe, it, expect } from "vitest";
import { calculateUnifiedSeoScore } from "@/lib/unified-seo-score";

const goodContent = `
<h1>Emergency Plumber in Austin — Fast 24/7 Service</h1>
<p>Looking for an emergency plumber in Austin? Our licensed team responds fast, day or night. However, we also handle scheduled repairs, drain cleaning and water-heater installs.</p>
<h2>Why choose our Austin plumbers</h2>
<p>We are a trusted, certified plumbing company serving Austin since 2005. Additionally, every visit is backed by a satisfaction guarantee.</p>
<h2>Our plumbing services</h2>
<h3>Drain cleaning</h3>
<p>Our emergency plumber in Austin clears clogged drains quickly. Therefore you avoid costly water damage.</p>
<p>Read our <a href="/services/water-heaters">water heater guide</a> and see reviews on <a href="https://example.com/reviews">our partner site</a>.</p>
<img src="/team.jpg" alt="Emergency plumber in Austin at work" width="800" height="600" loading="lazy" />
<script type="application/ld+json">{"@context":"https://schema.org","@type":"LocalBusiness"}</script>
${"<p>We provide dependable, affordable plumbing across the whole metro area with expert technicians.</p>".repeat(30)}
`;

describe("calculateUnifiedSeoScore", () => {
  it("returns a 0-100 score with all factor groups", () => {
    const r = calculateUnifiedSeoScore({
      title: "Emergency Plumber in Austin — Fast 24/7 Service",
      seoDescription:
        "Need an emergency plumber in Austin? Licensed, fast 24/7 response for repairs, drains and water heaters. Call now for guaranteed same-day service today.",
      content: goodContent,
      slug: "emergency-plumber-austin",
      seoKeywords: ["emergency plumber in austin"],
      canonicalUrl: "https://example.com/emergency-plumber-austin",
    });
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    const keys = r.factors.map((f) => f.key).sort();
    expect(keys).toContain("title");
    expect(keys).toContain("performance");
    expect(keys).toContain("entityCoverage");
    expect(r.factors).toHaveLength(11);
  });

  it("caps the score at 89 when a critical factor fails (gate)", () => {
    const r = calculateUnifiedSeoScore({
      title: "Home",
      seoDescription: "",
      content: "<p>Short.</p>",
      slug: "home",
    });
    expect(r.gatePassed).toBe(false);
    expect(r.criticalFailures.length).toBeGreaterThan(0);
    expect(r.score).toBeLessThanOrEqual(89);
  });

  it("rewards a fully-optimized page above a thin one", () => {
    const good = calculateUnifiedSeoScore({
      title: "Emergency Plumber in Austin — Fast 24/7 Service",
      seoDescription:
        "Need an emergency plumber in Austin? Licensed, fast 24/7 response for repairs, drains and water heaters. Call now for guaranteed same-day service today.",
      content: goodContent,
      slug: "emergency-plumber-austin",
      seoKeywords: ["emergency plumber in austin"],
      canonicalUrl: "https://example.com/emergency-plumber-austin",
      performance: { lcp: 2.0, cls: 0.05, inp: 150, ttfb: 400, pageWeightKb: 900 },
      targetEntities: ["Austin"],
    });
    const thin = calculateUnifiedSeoScore({
      title: "Page",
      content: "<p>hello</p>",
      slug: "p",
    });
    expect(good.score).toBeGreaterThan(thin.score);
  });

  it("produces critical-first recommendations", () => {
    const r = calculateUnifiedSeoScore({
      title: "x",
      content: "<p>y</p>",
      slug: "x",
    });
    expect(r.recommendations.length).toBeGreaterThan(0);
    // first recommendation should be from a critical factor when one fails
    expect(r.recommendations[0].critical).toBe(true);
  });
});
