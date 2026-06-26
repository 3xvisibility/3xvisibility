# 3-Format Templates: Elementor / Gutenberg / Shopify

Goal: Each marketplace template can be used in 3 formats. The user picks a format on the template card AND inside the campaign wizard. On publish, the page is built in the chosen format so WordPress pages look exactly like the template (images go into the WP Media Library; Shopify uses its own system). Gutenberg structure is wired now, full block conversion filled in later.

## 1. Data model (frontend)
- Add `export type TemplateFormat = "elementor" | "gutenberg" | "shopify";` in `src/lib/marketplace-templates.ts`.
- Add a helper `availableFormats(t)` returning the formats a template supports. By the request, every template supports all three: `["elementor", "gutenberg", "shopify"]` (Shopify-native templates keep `shopify` as default).
- Add `defaultFormat(t)`: `shopify` if `platform === "shopify"`, else `elementor`.

## 2. Marketplace card + preview (`TemplateMarketplacePage.tsx`)
- On each card and in the preview dialog, render a small 3-way format pill group (Elementor / Gutenberg / Shopify) with the resolved default pre-selected.
- Track `selectedFormat` per template in component state (`Record<templateId, TemplateFormat>`).
- "Use template" passes the chosen format through to the campaign-create flow (URL/query param or context the wizard already reads when launched from marketplace).
- Gutenberg pill shows a small "Beta" badge.

## 3. Campaign wizard (format step)
- In the wizard (template-selection / mapping area), add a "Publish format" selector (Elementor / Gutenberg / Shopify) seeded from the format chosen in the marketplace, still editable here ("dui jaygatei").
- Persist the choice on the campaign: new column `publish_format text` (migration), default `'elementor'`.

## 4. Format-aware conversion engine
- New module `src/lib/connectors/format-engine.ts` (frontend) + mirror in `supabase/functions/_shared/connectors/`:
  - `elementor`: existing `htmlToElementor` / `buildElementorMeta` path (unchanged).
  - `gutenberg`: new `htmlToGutenberg(html)` — STRUCTURE NOW: wrap template HTML in a single `core/html` block as a safe baseline so pages still publish correctly; leave TODO hooks + a block-mapping table to fill in real native blocks later.
  - `shopify`: existing Shopify connector path.

## 5. WordPress publishing (`_shared/connectors/wordpress.ts` + `publish-pages`)
- Read `publish_format` from the campaign/payload.
- `elementor` → current native Elementor flow (force `elementor_canvas`, import images to Media Library).
- `gutenberg` → set post `content` to Gutenberg block markup from `htmlToGutenberg`, do NOT write `_elementor_*` meta, use the theme/full-width template; still run `importHtmlAssets` so every template image lands in the WP Media Library and renders from there.
- Keep the existing template-only image rule (no AI/stock images; missing images stay blank).

## 6. Shopify publishing
- Unchanged — when format is `shopify`, route through the existing Shopify connector/product system.

## 7. Validation
- Typecheck. Manually verify: marketplace card shows 3 pills, choice flows into wizard, campaign saves `publish_format`, and the WordPress connector branches on format without breaking the current Elementor path.

```text
Template ──pick format──> Elementor ─┐
                          Gutenberg ─┼─> publish-pages ─> WP (media library) / Shopify
                          Shopify   ─┘
```

## Technical notes
- DB: `ALTER TABLE public.campaigns ADD COLUMN publish_format text NOT NULL DEFAULT 'elementor';`
- No new RLS needed (column on existing table).
- Gutenberg engine ships as a working `core/html` fallback now; native block mapping is a later iteration (per your "structure now, fill later").
- Images always uploaded to WP Media Library via existing `importHtmlAssets` / `importElementorImages` so the published page renders images from WordPress, matching the template.
