# AI Length Control for Template Blocks

Three connected improvements so AI-generated content always fits the template design.

## 1. Per-campaign length setting (with template fallback)
- Add a `max_content_lines` (and optional `max_content_words`) field to the campaign AI settings UI in `CreateCampaignWizard.tsx`.
- Persist it on the campaign record (stored in the existing campaign settings/JSON column — no schema change if a settings jsonb exists; otherwise a small migration adds `max_content_lines int` + `max_content_words int` to `campaigns`).
- In `generate-pages`, resolve length as: campaign setting → template default → computed from original block. Pass it into `generateAiContent`.

## 2. Overflow validation + safe auto-fix
- In `generate-pages` after each AI generation, measure word/line count of the output.
- If it exceeds the allowed limit (original size + 1 line, or the campaign cap):
  - Re-generate once with a stricter "shorten to N words" instruction.
  - If still too long, truncate safely at a sentence/word boundary (never mid-word) and keep design intact.

## 3. Preview step before publishing
- Add a preview panel in the wizard that, for the first sample row, shows generated **title** and **description** side-by-side with the **original template line length** (e.g. "Original: 2 lines / 14 words — Generated: 2 lines / 15 words ✓").
- Flag any field that overflows in red so the user can adjust the limit before publishing.

## Technical notes
- Reuse the word/line counting helper already added to `generateAiContent`.
- The preview calls `generate-pages` in a `dryRun` mode (returns generated text without persisting/publishing).
- No destructive DB changes; a migration is only needed if `campaigns` has no JSON settings column to hold the limits.

Confirm and I'll implement, starting with the backend length resolution + overflow auto-fix, then the wizard setting and preview.