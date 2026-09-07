import { describe, it, expect } from "vitest";
import {
  normalizePath,
  isItemActive,
  isGroupActive,
} from "@/lib/sidebar-active";

const BASE = "/w/acme";

const mainNav = [
  { path: "dashboard" },
  { path: "campaigns" },
  { path: "ai-site-builder" },
  { path: "pages" },
  { path: "templates" },
];
const websiteNav = [
  { path: "websites" },
  { path: "website-content" },
  { path: "marketplace" },
  { path: "data" },
];
const seoNav = [
  { path: "pgp-keywords" },
  { path: "pgp-generate" },
  { path: "pgp-terms" },
  { path: "seo-audit" },
  { path: "indexing" },
  { path: "analytics" },
  { path: "performance" },
];

describe("normalizePath", () => {
  it("strips query strings", () => {
    expect(normalizePath("/w/acme/pages?tab=live")).toBe("/w/acme/pages");
  });
  it("strips hashes", () => {
    expect(normalizePath("/w/acme/pages#section")).toBe("/w/acme/pages");
  });
  it("strips trailing slashes", () => {
    expect(normalizePath("/w/acme/pages/")).toBe("/w/acme/pages");
  });
});

describe("isItemActive", () => {
  it("matches an exact route", () => {
    expect(isItemActive(`${BASE}/campaigns`, BASE, { path: "campaigns" })).toBe(true);
  });

  it("matches nested route params", () => {
    expect(isItemActive(`${BASE}/pages/123`, BASE, { path: "pages" })).toBe(true);
    expect(isItemActive(`${BASE}/campaigns/42/edit`, BASE, { path: "campaigns" })).toBe(true);
  });

  it("matches when a query string is present", () => {
    expect(isItemActive(`${BASE}/pages?tab=live`, BASE, { path: "pages" })).toBe(true);
  });

  it("matches when a hash is present", () => {
    expect(isItemActive(`${BASE}/analytics#chart`, BASE, { path: "analytics" })).toBe(true);
  });

  it("does not match a sibling with a shared prefix", () => {
    expect(isItemActive(`${BASE}/pages-archive`, BASE, { path: "pages" })).toBe(false);
  });

  it("treats dashboard as an exact match only", () => {
    expect(isItemActive(`${BASE}/dashboard`, BASE, { path: "dashboard" })).toBe(true);
    expect(isItemActive(`${BASE}/dashboard/settings`, BASE, { path: "dashboard" })).toBe(false);
  });
});

describe("isGroupActive auto-expansion", () => {
  const cases: Array<[string, string, typeof mainNav]> = [
    ["main", `${BASE}/campaigns/42?step=2`, mainNav],
    ["website", `${BASE}/website-content/xyz`, websiteNav],
    ["seo", `${BASE}/analytics?range=30d`, seoNav],
  ];

  it.each(cases)("expands the %s group for its own routes", (_name, path, nav) => {
    expect(isGroupActive(path, BASE, nav)).toBe(true);
  });

  it("keeps other groups collapsed", () => {
    const path = `${BASE}/analytics`;
    expect(isGroupActive(path, BASE, seoNav)).toBe(true);
    expect(isGroupActive(path, BASE, mainNav)).toBe(false);
    expect(isGroupActive(path, BASE, websiteNav)).toBe(false);
  });

  it("does not expand a group for a prefix-colliding sibling route", () => {
    expect(isGroupActive(`${BASE}/pages-archive`, BASE, mainNav)).toBe(false);
  });
});
