# Elementor Template Kit Architecture — Migration Plan

## Goal
Make **native Elementor JSON the master source** for every WordPress template (HTML demoted to preview-only), packaged exactly like Envato/Astra/Kadence starter-template kits. Reuse the existing `elementor_templates` catalog and publishing pipeline — no parallel system, no broken database relationships.

## What already exists (reused, not rebuilt)
- `elementor_templates` table (Elementor JSON, editable fields, default content, limits, structure, preview).
- `htmlToElementor` engine → native **Containers + widgets** (headings, text, image, button, icon-box…), no Sections/Columns, no Pro widgets.
- `extractEditableFields` / `applyEditableContent` → replaces ONLY editable fields, leaves layout/typography/spacing untouched.
- `template-length-budget.ts` → per-field word/char/line budgets + `enforceBudget`.
- `asset-import.ts` (`importHtmlAssets`) → uploads images to WP Media Library, rewrites URLs.
- `visual-diff.ts` + catalog build → similarity scoring with auto-truncate.
- `seed-elementor-templates` / `backfill-elementor-catalog` → conversion entry points.

## What this plan adds/changes

### 1. Template Package schema (DB migration)
Extend `elementor_templates` with the missing package columns so each row is a complete kit:
- `placeholders` (jsonb) — explicit `{{PLACEHOLDER}} → field` map (`PAGE_TITLE`, `HERO_TITLE`, `HERO_DESCRIPTION`, `FEATURE_n_TITLE`, `CTA_TITLE`, `FAQ_QUESTION`…).
- `responsive_rules` (jsonb) — desktop/tablet/mobile settings captured per widget.
- `image_map` (jsonb) — original image URL → role/slot.
- `status` (text, default `active`) and `version` (int, default 1).

Existing columns (`elementor_json`, `editable_fields`, `default_limits`, `template_structure`, `preview_image`, `category`) already cover the rest. Backward compatible — all new columns nullable/defaulted.

### 2. Placeholder system
- Add a placeholder layer in `elementor-fields.ts`: derive a stable `{{NAME}}` token per editable field (by section role + kind) and store it in `placeholders`.
- Publishing replaces **only placeholder tokens**, never the whole tree. Non-placeholder widgets are byte-identical to the stored JSON.

### 3. Conversion / migration pass
- Run `seed-elementor-templates` across the full WordPress library so every HTML template becomes packaged Elementor JSON (Containers only, Free-compatible widgets only: heading, text, image, button, icon-box, testimonial, counter, accordion, gallery, divider, spacer).
- Capture responsive settings + image map + placeholders during seeding.
- Keep `source_template_id` so existing campaign/template relationships stay intact. HTML retained only as preview fallback.

### 4. Publishing engine (tighten existing `publish-pages` + `wordpress.ts`)
Enforce the exact flow, removing any HTML-conversion-at-publish path:
```text
select Elementor template → load JSON from DB → AI content (template-safe)
→ replace placeholders only → upload images to Media Library → swap URLs/IDs
→ write _elementor_data + _elementor_edit_mode + page settings → publish
```
- Fail (not fallback) if no catalog JSON is found.
- Images: no AI generation; upload originals via `importHtmlAssets`, leave missing ones blank.

### 5. Template-Safe AI
Before generating, read each placeholder's original word/char/line count + container width from the stored package, then clamp:
- Hero title: 1 line. Section titles: original visual width. Paragraphs: ±10%. Buttons: ≤4 words. Feature titles: ≤5 words. FAQ: similar length.
- On overflow: auto-rewrite/truncate via `enforceBudget` until it fits.

### 6. Quality validation gate
- Reuse `visual-diff` similarity. Below 98% → rebuild loop (regenerate offending fields) until pass or fail the job with a per-page report.

### 7. Shopify (phase 2, same pattern)
- Mirror the architecture with native **Online Store 2.0 section** JSON as master (analogous catalog + placeholder + media-upload flow). Scoped as a follow-up after WordPress is validated, to avoid destabilizing both at once.

## Technical notes
- DB change is additive only — no column drops, no FK changes; existing campaigns keep working.
- No new tables; the catalog stays the single source.
- Elementor output uses `elType: "container"` exclusively (already enforced in the engine) — verified no Section/Column emission.

## Rollout order
1. Migration: add package columns.
2. Extend seeding to populate placeholders/responsive/image_map/version.
3. Run full library conversion (WordPress).
4. Harden `publish-pages` to placeholder-only + image upload + 98% gate.
5. Validate on 2 templates per category, then enable for all.
6. Shopify 2.0 sections as a separate follow-up.

Approve and I'll start with the migration and the seeding extension.