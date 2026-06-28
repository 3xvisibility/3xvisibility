# Native WordPress & Shopify Generation Redesign

Goal: published pages look and behave like they were hand-built in Elementor Free / Gutenberg / Shopify OS 2.0 — fully editable, no HTML-widget dumping, no broken CSS/images. WordPress first, Shopify after parity is proven.

## Architecture (builder-agnostic)

```text
Template (rendered HTML + field map)
        │
        ▼
[1] Site Context Reader  ──►  theme, plugins, Elementor ver, Gutenberg,
        │                     global colors, global fonts, container width,
        │                     breakpoints
        ▼
[2] Style Extractor ──► per-element computed color/spacing/typography/width
        │
        ▼
[3] Builder Adapter (interface)
        ├── ElementorAdapter   (Priority 1)
        ├── GutenbergAdapter   (Priority 2)
        └── future: Bricks / Divi / Breakdance / Kadence / Beaver / Shopify
        │
        ▼  native widget/block tree, styles baked + mapped to site tokens
[4] AI Content Fill ──► length-budget locked per editable field
        │
        ▼
[5] Visual Validation Gate (structural + render) ──► <98% → regenerate
        │
        ▼
[6] Publish ──► upload images to Media Library, rewrite src, write _elementor_data / blocks
```

A shared `BuilderAdapter` interface (`build(tree, ctx, styles) -> NativePayload`) makes every builder pluggable. Elementor and Gutenberg implement it now; the others are stubs registered in a `builders` map.

## Phase 1 — WordPress site context reader (foundation)
New `_shared/connectors/wp-site-context.ts` + edge endpoint reuse in `test-connection`/publish:
- `GET /wp-json` → active theme, plugins, REST namespaces (detect `elementor/v1`, Gutenberg).
- `GET /wp-json/elementor/v1/globals` (or kit post meta) → global colors + fonts; fallback to defaults.
- Detect container width / breakpoints from the Elementor kit settings; fallback to theme.json (`/wp-json/wp/v2/global-styles`) for block themes.
- Persist the resolved context on `websites` (new `site_context jsonb`) so generation reuses it without re-fetching.

## Phase 2 — Style extractor + native fidelity engine
- New `_shared/connectors/style-extract.ts`: from the template HTML/inline CSS, derive per-section/per-widget color, background, font family/size/weight, padding, margin, alignment, width.
- Rework `elementor-engine.ts` to (a) emit native Containers/widgets it already supports, and (b) **bake** extracted styles into each widget's Elementor style settings (`title_color`, `typography_*`, `_padding`, `_margin`, `align`, `_element_width`, container `background_*`, `width`, `content_width`).
- "Both, in order": first map to the site's **global tokens** (`__globals__` color/typography refs) where a token matches; otherwise write the literal per-widget value. This keeps pages editable and theme-consistent while preserving the template look.
- Remove the HTML-embed widget path entirely (`buildEmbeddedElementorData`, single-HTML mode) and the raw-HTML fallback in `publish-pages`.

## Phase 3 — AI content locked to template
- Keep `template-length-budget.ts` as the single source of truth; ensure every adapter passes each editable field's original text + word/char/line + widget/container width into the budget before AI fill, and clamps output. No new behavior, just wired through the new field map.

## Phase 4 — Visual validation gate (both)
- Structural gate now: extend `visual-diff.ts` usage to compare original field map vs generated tree (typography, spacing, widths, widget order, image presence) → structural score.
- Render gate: add a `render-page` edge function that drives a headless screenshot of the original template URL and the published/preview WP page, stores both in the `render-checks` bucket, computes pixel + DOM-box similarity via existing `visual-diff.ts`, records to `page_render_checks`.
- Combined gate: `min(structural, pixel) >= 0.98` to pass; below → regenerate (max retries) then surface a clear report. Wire into `generate-pages` publish loop.

## Phase 5 — Assets
- Confirm/extend the WordPress connector media upload: every template image (from `image_map`) uploaded to Media Library once per site, cached by hash, `<img>`/widget `image.url` rewritten to the returned media URL+id. Fail the publish (not silently) if an image can't upload.

## Phase 6 — Gutenberg parity
- Apply the same adapter contract to `gutenberg-engine.ts`: native blocks with style attributes mapped to theme.json tokens; same length budget + validation gate.

## Phase 7 — Shopify (after WP parity)
- Reuse `shopify-section-kit.ts`: read active theme settings (OS 2.0), map styles to theme settings/section schema, upload images to Shopify Files, same length budget + validation gate.

## Technical notes
- New table column: `websites.site_context jsonb`; new helper RPC not required.
- New edge function: `render-page` (screenshots). It cannot run in Deno edge directly — it will call a headless-render provider; if no provider key is set, the gate falls back to structural-only and flags "render skipped" rather than blocking.
- `elementor_templates` already stores master JSON; generation will store the styled native tree there per template version.
- Touch points: `elementor-engine.ts`, `gutenberg-engine.ts`, `elementor-catalog.ts`, `elementor-package.ts`, `wordpress.ts`, `publish-pages/index.ts`, `generate-pages/index.ts`, new `wp-site-context.ts`, `style-extract.ts`, `render-page` function.

## Open dependency
The render-based 98% gate needs a headless screenshot provider (e.g. a screenshot API key). If you don't want to add one, I'll ship the structural gate as the enforced gate and keep render scoring as best-effort. Tell me which and I'll proceed; Phase 1–3 don't depend on it.