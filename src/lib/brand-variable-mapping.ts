/**
 * Brand / company / website name variable mapping.
 *
 * Lets the user control which template variable names should resolve to their
 * own brand name, and whether that name is applied to the SEO title suffix,
 * page slug, and meta description when seeding SEO defaults.
 *
 * Persisted in localStorage so it follows the user across templates without a
 * backend round-trip.
 */

export interface BrandVariableMapping {
  /** Variable names (lowercase_snake_case) that resolve to the brand name. */
  keys: string[];
  /** Apply the brand name to the SEO title suffix. */
  applyToTitle: boolean;
  /** Apply the brand name to the page slug. */
  applyToSlug: boolean;
  /** Apply the brand name to the meta description. */
  applyToDescription: boolean;
}

export const DEFAULT_BRAND_KEYS = [
  "company_name",
  "brand_name",
  "firm_name",
  "business_name",
  "restaurant_name",
  "clinic_name",
  "product_name",
  "site_name",
  "website_name",
  "agency_name",
  "store_name",
];

export const DEFAULT_BRAND_MAPPING: BrandVariableMapping = {
  keys: DEFAULT_BRAND_KEYS,
  applyToTitle: true,
  applyToSlug: true,
  applyToDescription: true,
};

const STORAGE_KEY = "brand-variable-mapping";

/** Normalize a raw variable name into lowercase_snake_case. */
export function normalizeBrandKey(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function loadBrandMapping(): BrandVariableMapping {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_BRAND_MAPPING };
    const parsed = JSON.parse(raw) as Partial<BrandVariableMapping>;
    return {
      keys: Array.isArray(parsed.keys) && parsed.keys.length > 0 ? parsed.keys : DEFAULT_BRAND_KEYS,
      applyToTitle: parsed.applyToTitle !== false,
      applyToSlug: parsed.applyToSlug !== false,
      applyToDescription: parsed.applyToDescription !== false,
    };
  } catch {
    return { ...DEFAULT_BRAND_MAPPING };
  }
}

export function saveBrandMapping(mapping: BrandVariableMapping): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mapping));
    // Notify same-tab listeners (storage event only fires across tabs).
    window.dispatchEvent(new CustomEvent("brand-mapping-changed"));
  } catch {
    /* ignore quota / unavailable storage */
  }
}
