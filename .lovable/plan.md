# Keyword Groups → Campaign flow

Goal: user builds everything (template + variables + terms + language) once in **Keywords**, saves it as a named **Keyword Group**. In **Campaigns** they just pick the group, add Locations + Business Info, and generate.

## 1. New "Keyword Group" bundle

Extend the existing `pgp_keywords` model into a **group bundle** (or add a sibling table `pgp_keyword_groups`) that stores:

- `name` (user-given, shown in sidebar list)
- `template_id` (FK to `templates`)
- `language` (single language for the whole group)
- `variables[]` — each with `{ name, terms[] }` covering every non-geo / non-business variable in the template
- `workspace_id`, `created_at`, `updated_at`

Locations, city/state/country, brand_name, phone, email, company etc. are **explicitly excluded** — those live only on the Campaign side.

```text
Keyword Group
 ├─ Template  (chosen once, latest on top)
 ├─ Language  (one dropdown, applies to all terms)
 └─ Variables
     ├─ {service_type}  → [plumbing, roofing, ...]
     ├─ {quality}       → [premium, affordable, ...]
     └─ ... (auto-extracted from template, geo/business skipped)
```

## 2. Rework the Keywords page into a wizard

`src/pages/PgpKeywordsPage.tsx` becomes a 3-step "Create Keyword Group" flow:

1. **Pick template** — dropdown of workspace templates ordered `updated_at DESC` (latest first), with preview.
2. **Language + Variables** — one language dropdown at top; auto-extract variables from template HTML; hide geo/business ones; for each remaining variable show a terms editor with AI-generate-terms button that honors the chosen language.
3. **Name & Save** — text field for group name, "Save Keyword Group" button.

Existing standalone-keyword UI stays reachable, but the primary CTA becomes **"New Keyword Group"**.

## 3. Sidebar submenu

Under the **Keywords** entry in `src/lib/sidebar-nav.ts` / `AppSidebar.tsx`, add a nested list of saved Keyword Groups (by `name`). Clicking one opens it in edit mode of the wizard.

## 4. Campaign wizard changes

`src/components/campaigns/CreateCampaignWizard.tsx`:

- Replace the "Choose template" step with **"Choose Keyword Group"** (dropdown of the current workspace's groups).
- On selection, prefill: template, language, variables & terms — all read-only in the wizard.
- Remaining steps stay: **Locations** → **Business Info** → **Review & Generate**.
- Row assembly reuses `src/lib/campaign-row-merge.ts` — group provides `keywordRow`, Locations override geo, Business Info overlays.

Handoff `sessionStorage` key already used by `PgpGeneratePage` is repurposed to pass `{ keywordGroupId }` instead of `{ templateId }`.

## 5. Data + safeguards

- Migration: `pgp_keyword_groups` table with `GRANT` + RLS scoped to `workspace_id` via `is_workspace_member`.
- Geo/business variables list is centralized (`GEO_VAR_NAMES` + a new `BUSINESS_VAR_NAMES`) so the Keywords wizard hides them and the Campaign wizard knows to demand them.
- Existing placeholder-geo safeguard and per-row source trace continue to work unchanged.

## Technical notes

- Files touched: `PgpKeywordsPage.tsx` (rewrite), `CreateCampaignWizard.tsx` (template step → group step), `sidebar-nav.ts` + `AppSidebar.tsx` (submenu), `campaign-row-merge.ts` (add `BUSINESS_VAR_NAMES`), new `src/lib/keyword-groups.ts` helpers, new migration.
- No changes needed to `generated_pages`, publishing, or SEO scoring — the group just becomes the single source of "template + keywords + language" upstream.
- Backwards compatibility: existing standalone `pgp_keywords` rows keep working; Campaign wizard still accepts a raw template if no group is chosen (fallback path behind a "Use raw template instead" link).

Approve and I'll implement in this order: migration → Keywords wizard → sidebar submenu → Campaign wizard swap → tests.