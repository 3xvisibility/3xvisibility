## Goal
Extend the boxed content-width system with five capabilities across the Templates and Generated Pages screens, plus the shared editor.

## 1. Conflict validation & warnings (shared)
New helper `src/lib/box-settings-validation.ts`:
- Rules per breakpoint: `gutter >= 0`, `gutter*2 <= width - 200` (content must keep ≥200px), width within 320–1920, tablet/mobile widths (when set) not larger than desktop.
- Returns `{ errors, warnings }`. Errors block Save/Apply/Publish; warnings show but allow.
- Used by the single editor and the bulk dialog. Save button disabled on any error; a warning banner lists issues before publishing.

## 2. Tri-device side-by-side live preview
Rework the preview in `ContainerWidthControl.tsx` (and reuse in the bulk dialog) to render **three simulated canvases at once** (desktop 1440 / tablet 834 / mobile 390), each showing the boxed content at that breakpoint's width + gutter, with full-width section backgrounds. Replaces the current single-device toggle.

## 3. "Copy from template" (page-level)
- Add optional `campaignId` prop to `ContainerWidthControl`.
- When present (page context), show a **Copy from template** button that resolves campaign → `template_id`, fetches the template's `container_width*/gutter_*` values, and populates the form fields (user reviews, then Saves).
- `GeneratedPagesPage` passes `campaignId={widthPage.campaign_id}`.

## 4. Bulk apply to multiple templates/pages
New `src/components/settings/BulkBoxSettingsDialog.tsx`:
- Same responsive form + validation + tri-device preview.
- Props: `table: "templates" | "generated_pages"`, `ids: string[]`.
- On Apply, updates all rows with the chosen `container_width`, tablet/mobile widths, and three gutters.
- Wired into existing selection toolbars:
  - `GeneratedPagesPage` bulk bar → "Content width…" button.
  - `TemplatesPage` bulk bar → "Content width…" button. Also add a per-template row action opening the single `ContainerWidthControl` (`table="templates"`) so templates get an individual editor too.

## 5. Republish updated templates after reboxing
- Extend `rebox-all-templates` to return the list of successfully reboxed template ids.
- In `TemplatesPage` rebox flow, after success, offer **"Republish affected pages"** (confirm dialog). When chosen: query `generated_pages` joined via `campaigns.template_id` for those templates with `status = 'published'`, then invoke `publish-pages` (retry/republish path) for those page ids — reusing the existing responsive boxing already applied at publish time.

## Technical notes
- DB columns already exist (`container_width`, `container_width_tablet`, `container_width_mobile`, `gutter_desktop/tablet/mobile`) on both `templates` and `generated_pages`; no migration needed.
- Engine (`enforceBoxedContentWidth`) already accepts the responsive options object; publish/reconvert/rebox already thread it — no engine change required.
- Validation clamps mirror server clamps (width 320–1920, gutter 0–200).
- No new secrets or schema changes.

## Files
- add `src/lib/box-settings-validation.ts`
- add `src/components/settings/BulkBoxSettingsDialog.tsx`
- edit `src/components/settings/ContainerWidthControl.tsx` (tri-device preview, copy-from-template, validation)
- edit `src/pages/GeneratedPagesPage.tsx` (pass campaignId, bulk button)
- edit `src/pages/TemplatesPage.tsx` (per-template editor, bulk button, republish-after-rebox)
- edit `supabase/functions/rebox-all-templates/index.ts` (return reboxed ids)
