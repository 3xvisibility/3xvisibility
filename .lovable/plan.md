# Template-Aware Elementor Generation Engine

The goal: every published Elementor page looks identical to the source template, with new SEO content that fits the original design. Several pieces already exist (length budgets in `template-length-budget.ts`, Elementor conversion in `elementor-engine.ts`, visual regression in `ElementorTestPage`). This plan unifies them into one enforced pipeline and adds the missing DB storage + hard limits.

## Part A — Store Elementor templates in the database
Add an `elementor_templates` table so publishing reads stored JSON instead of converting HTML at publish time.

Columns: `category`, `preview_image`, `elementor_json` (jsonb), `template_structure` (jsonb), `editable_fields` (jsonb), `default_content` (jsonb), `default_limits` (jsonb).

A one-time conversion routine runs every HTML marketplace template through the existing `templateToElementor`, extracts editable fields + per-field limits, and upserts rows. Publishing then loads a row, replaces only editable fields, and pushes the JSON — no HTML conversion on publish.

## Part B — Field-level editable metadata + hard limits
Extend the budget analyzer to emit, per editable field:
- widget type (heading / text / button / icon-box / counter / faq / testimonial)
- original text, char/word/line count, container width
- a hard max derived from BOTH the original length (±10%) AND the fixed caps below (whichever is smaller)

Fixed caps:
```
Hero title        35 chars
Section heading   45 chars
Small heading     30 chars
Button            4 words
Feature title     5 words
Description       ±10% of original
FAQ question      1 line
CTA               1 line
Counter           numeric only
```

## Part C — Provider-independent enforcement
All AI generation routes through the same post-processing in the edge functions (`ai-generate-rows`, `generate-pages`): after any provider returns content, `enforceRowBudget` clamps every field to its hard limit and the prompt is seeded with the per-field limits. This makes Gemini/OpenAI/Claude output converge to the same lengths.

## Part D — Visual validation gate before publish
Reuse `compareVisualRegression`. Before a page publishes, generated content is rendered against the template signature; if similarity < 98% (overflow / wrapping / extra lines), the offending fields are regenerated with a stricter limit, retrying up to N times, then truncated at a safe boundary as a final fallback.

## Scope decisions I need from you
This is multiple days of work. To deliver value fast I propose phasing it. Which first?

1. **DB-stored Elementor templates** (Part A) — biggest architectural change, guarantees identical pages.
2. **Hard per-field limits + provider-independent clamping** (Parts B/C) — directly fixes "AI too long / providers differ".
3. **Visual validation gate** (Part D) — automated reject+regenerate loop.

## Technical notes
- New migration for `elementor_templates` with workspace-agnostic read (marketplace templates are global) + service_role write.
- Conversion script lives in an edge function (`seed-elementor-templates`) so it runs server-side once.
- `template-length-budget.ts` is shared between functions — add a `FIELD_CAPS` map and merge with the ±10% original-length rule there so client and server agree.
