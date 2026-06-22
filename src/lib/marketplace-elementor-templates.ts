// WordPress Elementor Templates group.
//
// This is a TEST-MODE rollout: instead of converting the entire library, we
// pick the best 2 templates per category and expose them as native
// Elementor-compatible templates. At publish time the WordPress connector runs
// these through the HTML → Elementor engine (see connectors/elementor-engine.ts),
// producing a fully editable Elementor page.

import { COMMUNITY_TEMPLATES, type MarketplaceTemplate } from "@/lib/marketplace-templates";
import { htmlToElementor, type ElementorElement } from "@/lib/connectors/elementor-engine";

export const ELEMENTOR_CATEGORY = "WordPress Elementor Templates";
export const ELEMENTOR_BADGE = "Elementor Compatible";

/** How many templates to convert per source category during the test rollout. */
const PER_CATEGORY = 2;

/** Rank templates so the "best" ones are chosen first. */
function score(t: MarketplaceTemplate): number {
  return (t.rating || 0) * 100 + (t.downloads || 0) / 100 + (t.variables?.length || 0);
}

/**
 * Select the best 2 templates per source category and clone them into the
 * "WordPress Elementor Templates" group with an "Elementor Compatible" badge.
 * Shopify templates are excluded — Shopify keeps the HTML publishing system.
 */
function buildElementorTemplates(): MarketplaceTemplate[] {
  const byCategory = new Map<string, MarketplaceTemplate[]>();
  for (const t of COMMUNITY_TEMPLATES) {
    if (t.platform === "shopify" || t.category === "shopify") continue;
    const list = byCategory.get(t.category) ?? [];
    list.push(t);
    byCategory.set(t.category, list);
  }

  const out: MarketplaceTemplate[] = [];
  for (const [, list] of byCategory) {
    const best = [...list].sort((a, b) => score(b) - score(a)).slice(0, PER_CATEGORY);
    for (const t of best) {
      out.push({
        ...t,
        id: `elementor-${t.id}`,
        name: `${t.name} (Elementor)`,
        category: ELEMENTOR_CATEGORY,
        platform: "wordpress",
        elementorCompatible: true,
        badge: ELEMENTOR_BADGE,
        tags: Array.from(new Set([...(t.tags || []), "elementor"])),
      });
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
