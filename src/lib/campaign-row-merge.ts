/**
 * Pure helpers extracted from the PGP Generate wizard so the merge/finalize
 * behaviour can be regression-tested without rendering the whole page.
 *
 * Contract (must stay in sync with src/pages/PgpGeneratePage.tsx `finalize`):
 *  1. Locations attached in Step 3 always win over keyword-group geo values.
 *  2. When NO locations are attached, placeholder-only geo values
 *     (USA / New York / LA / etc.) are stripped so downstream AI-fill can
 *     replace them instead of publishing fake data.
 *  3. Business Info overlays on top and never clobbers real locations.
 *  4. Non-geo variables are preserved verbatim from the keyword row.
 *  5. Missing (empty) non-geo variables are reported so the caller can hand
 *     them off to AI-fill.
 */

export const GEO_VAR_NAMES = [
  "city", "cities", "state", "states",
  "country", "countries", "zip", "zipcode",
  "region", "county", "location", "locations", "area",
] as const;

export const GEO_KEYS = [
  "city", "cities", "state", "states",
  "country", "countries", "region",
  "zip", "zipcode", "location", "locations", "area",
] as const;

export const PLACEHOLDER_GEO_VALUES = new Set<string>([
  "new york", "new york city", "nyc",
  "los angeles", "la", "san francisco", "sf",
  "chicago", "boston", "seattle", "miami", "dallas", "houston", "austin",
  "canada", "united states", "usa", "u.s.a", "u.s.", "america",
  "united kingdom", "uk", "england", "london",
  "california", "texas", "florida",
  "example city", "example state", "example country",
  "your city", "your state", "your country",
]);

/**
 * Business / contact variables. These are NEVER part of a Keyword Group —
 * they are collected in the Campaign wizard's "Business Info" step.
 */
export const BUSINESS_VAR_NAMES = [
  "company_name", "company", "business_name",
  "brand_name", "brand",
  "phone", "phone_number", "telephone", "mobile",
  "email", "email_address",
  "address", "street", "postcode",
  "website", "url", "site_url",
  "owner", "author", "contact", "contact_name",
] as const;

export const isGeoVariable = (name: string): boolean =>
  GEO_VAR_NAMES.includes(name.trim().toLowerCase() as (typeof GEO_VAR_NAMES)[number]);

export const isBusinessVariable = (name: string): boolean =>
  (BUSINESS_VAR_NAMES as readonly string[]).includes(name.trim().toLowerCase());

export const isPlaceholderGeoValue = (v: unknown): boolean =>
  typeof v === "string" && PLACEHOLDER_GEO_VALUES.has(v.trim().toLowerCase());

export interface LocationRow {
  city?: string; state?: string; country?: string;
  region?: string; zip?: string;
}

export interface BusinessInfo {
  [key: string]: string | undefined;
}

export interface MergeOptions {
  keywordRow: Record<string, string>;
  location?: LocationRow | null;
  businessInfo?: BusinessInfo;
  brandName?: string;
}

/** Build the injected values for a single row (locations + business info). */
export function buildInjected(opts: {
  location?: LocationRow | null;
  businessInfo?: BusinessInfo;
}): Record<string, string> {
  const inject: Record<string, string> = {};
  const bi = opts.businessInfo ?? {};
  for (const [k, v] of Object.entries(bi)) {
    const val = (v ?? "").toString().trim();
    if (val) inject[k] = val;
  }
  const loc = opts.location;
  if (loc) {
    const city = (loc.city || "").toString().trim();
    const state = (loc.state || loc.region || "").toString().trim();
    const country = (loc.country || "").toString().trim();
    const region = (loc.region || loc.state || "").toString().trim();
    const zip = (loc.zip || "").toString().trim();
    if (city) { inject.city = city; inject.cities = city; inject.location = city; }
    if (state) { inject.state = state; inject.states = state; }
    if (country) { inject.country = country; inject.countries = country; }
    if (region) { inject.region = region; }
    if (zip) { inject.zip = zip; inject.zipcode = zip; }
  }
  return inject;
}

/**
 * Merge a keyword row with an attached location + business info, following
 * the wizard's finalize() contract.
 */
export function mergeRow(opts: MergeOptions): Record<string, string> {
  const { keywordRow, location, businessInfo, brandName } = opts;
  const hasLocation = !!location && Object.values(location).some((v) => (v ?? "").toString().trim());
  const base: Record<string, string> = { ...keywordRow };

  if (hasLocation) {
    // Real location attached → wipe every geo key so injected wins.
    for (const k of GEO_KEYS) delete base[k];
  } else {
    // No location → strip placeholder defaults so AI-fill can replace them.
    for (const k of GEO_KEYS) {
      if (isPlaceholderGeoValue(base[k])) delete base[k];
    }
  }

  const injected = buildInjected({ location, businessInfo });
  const merged: Record<string, string> = { ...base, ...injected };
  if (brandName && !merged.brand_name) merged.brand_name = brandName;
  return merged;
}

/**
 * List variable names present in the template that are empty after the merge —
 * these are the fields that must be handed off to AI-fill.
 */
export function unfilledVariables(
  templateVars: string[],
  merged: Record<string, string>,
): string[] {
  return templateVars.filter((v) => !(merged[v] ?? "").toString().trim());
}
