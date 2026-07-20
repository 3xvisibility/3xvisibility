import { describe, it, expect } from "vitest";
import {
  mergeRow,
  unfilledVariables,
  isPlaceholderGeoValue,
  GEO_KEYS,
} from "@/lib/campaign-row-merge";
import { calculateUnifiedSeoScore } from "@/lib/unified-seo-score";

describe("campaign row merge — Locations override keyword-group geo keys", () => {
  it("overrides ALL geo keys when a real location is attached", () => {
    const keywordRow = {
      city: "New York",
      state: "New York",
      country: "USA",
      region: "Northeast",
      zip: "10001",
      cities: "New York",
      service_type: "plumbing",
      quality: "affordable",
    };
    const merged = mergeRow({
      keywordRow,
      location: { city: "Dhaka", state: "Dhaka Division", country: "Bangladesh", zip: "1207" },
    });
    expect(merged.city).toBe("Dhaka");
    expect(merged.cities).toBe("Dhaka");
    expect(merged.state).toBe("Dhaka Division");
    expect(merged.country).toBe("Bangladesh");
    expect(merged.region).toBe("Dhaka Division"); // falls back from state
    expect(merged.zip).toBe("1207");
    expect(merged.zipcode).toBe("1207");
    // Non-geo variables preserved
    expect(merged.service_type).toBe("plumbing");
    expect(merged.quality).toBe("affordable");
  });

  it("wipes placeholder defaults when NO location is attached (so AI-fill can run)", () => {
    const keywordRow = {
      city: "New York",
      country: "USA",
      state: "California",
      service_type: "plumbing",
    };
    const merged = mergeRow({ keywordRow, location: null });
    // Placeholders stripped → empty so downstream AI-fill kicks in
    expect(merged.city).toBeUndefined();
    expect(merged.country).toBeUndefined();
    expect(merged.state).toBeUndefined();
    // Real content preserved
    expect(merged.service_type).toBe("plumbing");
  });

  it("preserves real (non-placeholder) geo values from the keyword row when no location attached", () => {
    const keywordRow = {
      city: "Sylhet",
      country: "Bangladesh",
      service_type: "electrician",
    };
    const merged = mergeRow({ keywordRow, location: null });
    expect(merged.city).toBe("Sylhet");
    expect(merged.country).toBe("Bangladesh");
  });

  it("business info overlays but does not overwrite injected location", () => {
    const merged = mergeRow({
      keywordRow: { service_type: "plumbing" },
      location: { city: "Chittagong", country: "Bangladesh" },
      businessInfo: { brand_name: "AquaFix", phone: "+880-1111", city: "IGNORED" },
    });
    expect(merged.city).toBe("Chittagong"); // location wins over businessInfo.city
    expect(merged.brand_name).toBe("AquaFix");
    expect(merged.phone).toBe("+880-1111");
  });

  it("recognises the full placeholder set", () => {
    for (const v of ["USA", " new york ", "LA", "Los Angeles", "Canada", "London"]) {
      expect(isPlaceholderGeoValue(v)).toBe(true);
    }
    expect(isPlaceholderGeoValue("Dhaka")).toBe(false);
    expect(isPlaceholderGeoValue("Sylhet")).toBe(false);
  });

  it("all GEO_KEYS are wiped when a location is attached even if injected doesn't set every key", () => {
    const keywordRow: Record<string, string> = {};
    for (const k of GEO_KEYS) keywordRow[k] = "New York";
    const merged = mergeRow({
      keywordRow,
      location: { city: "Dhaka" }, // only city set
    });
    // city/cities/location come from injected
    expect(merged.city).toBe("Dhaka");
    // other geo keys must not carry the stale "New York" placeholder
    expect(merged.state).toBeUndefined();
    expect(merged.country).toBeUndefined();
    expect(merged.region).toBeUndefined();
    expect(merged.zip).toBeUndefined();
  });
});

describe("empty variables are flagged for AI-fill", () => {
  it("reports variables that remain empty after merge", () => {
    const merged = mergeRow({
      keywordRow: { service_type: "plumbing" },
      location: { city: "Dhaka", country: "Bangladesh" },
    });
    const unfilled = unfilledVariables(
      ["service_type", "quality", "brand_name", "city", "country"],
      merged,
    );
    expect(unfilled).toEqual(["quality", "brand_name"]);
  });

  it("returns empty list when every template variable is filled", () => {
    const merged = mergeRow({
      keywordRow: { service_type: "plumbing", quality: "affordable" },
      location: { city: "Dhaka", country: "Bangladesh" },
      businessInfo: { brand_name: "AquaFix" },
    });
    expect(unfilledVariables(["service_type", "quality", "brand_name", "city"], merged)).toEqual([]);
  });
});

/**
 * Simulates the SeoAnalysisDialog "Fix all issues" regression guard: an AI-fill
 * pass must never reduce the overall unified score or any factor sub-score.
 * We compare a page BEFORE AI-fill (empty variables leave gaps) against
 * AFTER AI-fill (variables resolved to real content).
 */
describe("AI-fill regression guard — unified score never decreases", () => {
  const focus = "plumber dhaka";

  const buildPage = (row: Record<string, string>) => {
    const service = row.service_type || "services";
    const city = row.city || "your area";
    const brand = row.brand_name || "our team";
    return {
      title: `Best ${service} in ${city} | ${brand}`,
      seoTitle: `Best ${service} in ${city} | ${brand}`,
      seoDescription: `Looking for reliable ${service} in ${city}? ${brand} delivers fast, licensed ${service} across ${city} with upfront pricing and same-day booking.`,
      slug: `${service}-${city}`.toLowerCase().replace(/\s+/g, "-"),
      content: `
        <h1>Trusted ${service} in ${city}</h1>
        <p>${brand} provides expert ${service} throughout ${city}. Our licensed team handles emergency ${service}, installations, and repairs across ${city} neighbourhoods.</p>
        <h2>Why choose ${brand} for ${service} in ${city}?</h2>
        <ul>
          <li>Same-day ${service} response in ${city}</li>
          <li>Upfront pricing on every ${service} job</li>
          <li>Licensed ${service} professionals</li>
        </ul>
        <h2>Book ${service} in ${city} today</h2>
        <p>Call ${brand} for immediate ${service} help in ${city}.</p>
        <img src="/${service}.jpg" alt="${service} in ${city}" />
        <a href="/services/${service}">More about ${service}</a>
      `,
      seoKeywords: [service, city, `${service} ${city}`, brand],
      focusKeyword: focus,
      targetEntities: [brand, city, service],
    };
  };

  it("filled page's unified score is >= empty-variable page (no overall regression)", () => {
    const empty = buildPage({}); // variables not resolved → generic copy
    const filled = buildPage({
      service_type: "plumber",
      city: "Dhaka",
      brand_name: "AquaFix",
    });

    const before = calculateUnifiedSeoScore(empty);
    const after = calculateUnifiedSeoScore(filled);

    expect(after.score).toBeGreaterThanOrEqual(before.score);

    // Critical factors (the ones the wizard gates on) must not regress.
    for (const fAfter of after.factors.filter((f) => f.critical)) {
      const fBefore = before.factors.find((f) => f.key === fAfter.key)!;
      expect(fAfter.score, `critical factor ${fAfter.key} regressed`).toBeGreaterThanOrEqual(
        fBefore.score,
      );
    }
  });

  it("guard helper aborts when the overall unified score would drop", () => {
    // Reusable guard mirroring SeoAnalysisDialog.handleFixAndRepublish:
    // reject the rewrite if the overall unified score decreases.
    const shouldKeepChange = (
      beforeR: ReturnType<typeof calculateUnifiedSeoScore>,
      afterR: ReturnType<typeof calculateUnifiedSeoScore>,
    ) => afterR.score >= beforeR.score;

    const strong = calculateUnifiedSeoScore(buildPage({
      service_type: "plumber", city: "Dhaka", brand_name: "AquaFix",
    }));
    const weak = calculateUnifiedSeoScore({
      title: "x", seoTitle: "x", seoDescription: "", slug: "x", content: "<p>x</p>",
      seoKeywords: [], focusKeyword: focus,
    });

    // "AI-fill" that makes things worse overall must be rejected.
    expect(shouldKeepChange(strong, weak)).toBe(false);
    // Improving pass must be accepted.
    expect(shouldKeepChange(weak, strong)).toBe(true);
  });
});

