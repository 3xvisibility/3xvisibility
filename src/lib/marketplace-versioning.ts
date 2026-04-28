// Template versioning utilities — used to pin marketplace template snapshots
// to the exact version that was imported, even after the marketplace template
// is later updated.
//
// Strategy:
//  • Each marketplace template gets a deterministic version string derived
//    from its content + variables + SEO patterns. Whenever a maintainer
//    edits the template in `marketplace-templates.ts`, the hash changes
//    automatically — no manual version bumping needed.
//  • On import we copy the current marketplace content into a `templates`
//    row and stamp it with `source_marketplace_id` + `source_version`.
//  • Existing snapshots are NEVER mutated, so every campaign that already
//    references a template id keeps using the exact bytes it was created
//    with. To pick up a newer version the user must explicitly re-import,
//    which creates a NEW snapshot row and leaves the old one intact.

import type { MarketplaceTemplate } from "@/lib/marketplace-templates";

// Lightweight, fast, deterministic 32-bit FNV-1a hash. Plenty of entropy
// for distinguishing template revisions and produces a stable short string
// across browsers and Node — no Web Crypto required.
function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/**
 * Compute the canonical version string for a marketplace template.
 * Two templates with identical content + variables + SEO patterns produce
 * the same version, regardless of cosmetic field reordering.
 */
export function computeMarketplaceVersion(tpl: Pick<
  MarketplaceTemplate,
  "id" | "content" | "variables" | "seo_title_pattern" | "seo_description_pattern" | "schema_type"
>): string {
  const payload = JSON.stringify({
    id: tpl.id,
    content: tpl.content || "",
    variables: [...(tpl.variables || [])].sort(),
    seo_title: tpl.seo_title_pattern || "",
    seo_desc: tpl.seo_description_pattern || "",
    schema: tpl.schema_type || "WebPage",
  });
  return `v1.${fnv1a(payload)}`;
}

export interface VersionedTemplateRow {
  source_marketplace_id?: string | null;
  source_version?: string | null;
  source_imported_at?: string | null;
}

export type MarketplaceUpdateState =
  | { kind: "not-marketplace" }
  | { kind: "missing-source"; latestVersion: string }
  | { kind: "up-to-date"; version: string }
  | { kind: "update-available"; current: string; latest: string };

/**
 * Compare a stored template snapshot against the current marketplace catalog
 * to decide whether a newer version is available.
 */
export function getMarketplaceUpdateState(
  row: VersionedTemplateRow,
  marketplaceCatalog: MarketplaceTemplate[],
): MarketplaceUpdateState {
  if (!row.source_marketplace_id) return { kind: "not-marketplace" };
  const source = marketplaceCatalog.find(t => t.id === row.source_marketplace_id);
  if (!source) {
    // Source no longer exists in the catalog — treat as up-to-date so we
    // don't nag users about templates that were removed upstream.
    return { kind: "up-to-date", version: row.source_version || "unknown" };
  }
  const latest = computeMarketplaceVersion(source);
  if (!row.source_version) return { kind: "missing-source", latestVersion: latest };
  if (row.source_version === latest) return { kind: "up-to-date", version: latest };
  return { kind: "update-available", current: row.source_version, latest };
}
