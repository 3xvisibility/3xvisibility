// WordPress Elementor Templates group.
//
// This is a TEST-MODE rollout: instead of converting the entire library, we
// pick 2 templates per category and expose them as native Elementor-compatible
// templates. At publish time the WordPress connector runs these through the
// HTML → Elementor engine (see connectors/elementor-engine.ts), producing a
// fully editable Elementor page.
//
// By default the "best" 2 per category are auto-selected, but the user can
// override the exact picks from the Elementor Test page (see selectionOverride).

import { COMMUNITY_TEMPLATES, type MarketplaceTemplate } from "@/lib/marketplace-templates";
import { htmlToElementor, type ElementorElement } from "@/lib/connectors/elementor-engine";

export const ELEMENTOR_CATEGORY = "WordPress Elementor Templates";
export const ELEMENTOR_BADGE = "Elementor Compatible";

/** How many templates to convert per source category during the test rollout. */
export const PER_CATEGORY = 2;

/** Rank templates so the "best" ones are chosen first. */
function score(t: MarketplaceTemplate): number {
  return (t.rating || 0) * 100 + (t.downloads || 0) / 100 + (t.variables?.length || 0);
}

/** Source templates eligible for conversion, grouped by category (Shopify excluded). */
export function getElementorCandidates(): Map<string, MarketplaceTemplate[]> {
  const byCategory = new Map<string, MarketplaceTemplate[]>();
  for (const t of COMMUNITY_TEMPLATES) {
    if (t.platform === "shopify" || t.category === "shopify") continue;
    const list = byCategory.get(t.category) ?? [];
    list.push(t);
    byCategory.set(t.category, list);
  }
  // Sort each category by score (best first) for a sensible default order.
  for (const [, list] of byCategory) list.sort((a, b) => score(b) - score(a));
  return byCategory;
}

/** Default picks: the best 2 source-template IDs per category. */
export function defaultSelection(): string[] {
  const ids: string[] = [];
  for (const [, list] of getElementorCandidates()) {
    ids.push(...list.slice(0, PER_CATEGORY).map((t) => t.id));
  }
  return ids;
}

function toElementorTemplate(t: MarketplaceTemplate): MarketplaceTemplate {
  return {
    ...t,
    id: `elementor-${t.id}`,
    name: `${t.name} (Elementor)`,
    category: ELEMENTOR_CATEGORY,
    platform: "wordpress",
    elementorCompatible: true,
    badge: ELEMENTOR_BADGE,
    tags: Array.from(new Set([...(t.tags || []), "elementor"])),
  };
}

/**
 * Build Elementor templates from a list of selected source-template IDs.
 * Falls back to the default best-2-per-category selection when none provided.
 */
export function buildElementorTemplates(selectedSourceIds?: string[]): MarketplaceTemplate[] {
  const ids = selectedSourceIds?.length ? new Set(selectedSourceIds) : new Set(defaultSelection());
  const out: MarketplaceTemplate[] = [];
  for (const [, list] of getElementorCandidates()) {
    for (const t of list) {
      if (ids.has(t.id)) out.push(toElementorTemplate(t));
    }
  }
  return out;
}

export const ELEMENTOR_TEMPLATES: MarketplaceTemplate[] = buildElementorTemplates();

export const isElementorTemplate = (t?: Pick<MarketplaceTemplate, "elementorCompatible" | "category">): boolean =>
  !!t && (t.elementorCompatible === true || t.category === ELEMENTOR_CATEGORY);

/** Convert a template's HTML (with variables already resolved) to Elementor JSON. */
export function templateToElementor(html: string): ElementorElement[] {
  return htmlToElementor(html);
}
