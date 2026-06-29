# Page Generator Pro — Final Publishing Architecture

## Done in this turn
- **Page Generator Pro Connector** plugin built and packaged (`public/page-generator-pro-connector.zip`).
  - Secure REST namespace `pgp/v1` with `X-PGP-Key` auth (timing-safe).
  - Endpoints: `ping`, `site-info`, `detect` (Elementor/Gutenberg/theme/global colors/typography/breakpoints/container width), `media` (upload + de-dup), `publish/elementor` (native `_elementor_data` + per-page CSS regen + Canvas template), `publish/gutenberg`, `regenerate-css`, `clear-cache`, self-updater, admin settings screen.
- Landing page download card now points to the new plugin.

## Architecture target
```text
SaaS (edge functions)  ->  PGP Connector plugin  ->  Elementor / Gutenberg
```
HTML publishing is removed as a primary path; Elementor JSON is the master template.

## Remaining work (phased)

### Phase 1 — SaaS → Plugin transport
- Add a `connector` connection mode on `websites` (store base URL + API key alongside existing WP creds).
- New shared module `supabase/functions/_shared/connectors/pgp-connector.ts`: typed client for every `pgp/v1` endpoint.
- `publish-pages` / `generate-pages`: when a site has the connector, route through it; keep raw WP REST only as an explicit legacy fallback.

### Phase 2 — Elementor JSON master templates
- `elementor_templates` table already stores Elementor JSON. Backfill: convert remaining HTML marketplace templates to Free-widget Elementor JSON (Containers + Heading/Text/Image/Button/Icon Box/Counter/Accordion/Gallery/Divider/Spacer/Testimonial/Icon List/Video only — no Pro widgets).
- Each template row carries: Elementor JSON, preview image, placeholder map, per-widget character limits, responsive rules, metadata.
- One Container per visual section (never one parent wrapper).

### Phase 3 — Template-driven AI length engine
- Before generation, read template, inspect each editable widget, compute char/word/width budgets (extend existing `template-length-budget.ts`).
- Enforce: hero title 1 line, feature title ≤5 words, buttons ≤4 words, paragraphs ±10%, FAQ same size. Auto-rewrite on overflow.

### Phase 4 — Image system
- No AI images. Upload original template images via `pgp/v1/media`, swap to returned attachment IDs in the Elementor JSON before publish. No broken URLs.

### Phase 5 — Publish flow + visual gate
- Replace placeholders only → upload images → swap attachment IDs → plugin saves meta → plugin regenerates CSS → clears cache → publish.
- Visual validation compares original template vs generated page; rebuild automatically below 98% before publishing.

### Phase 6 — Shopify
- Replace HTML templates with Online Store 2.0 sections; publish native sections respecting the active theme.

## Notes
- Elementor Free only, no Pro widgets.
- Scope locked to WordPress + Shopify; no unrelated feature work until complete.
