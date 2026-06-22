## Goal
Publish **native Elementor pages** to WordPress using the original Elementor template JSON — never converting to HTML and never fragmenting into generated widgets. Pages land in WordPress fully editable in Elementor, pixel-identical to the source template, with dynamic variables replaced by AI content.

## How it works (data flow)
```text
Elementor JSON template (DB / marketplace)
        │  1. load original _elementor_data JSON
        ▼
Variable resolver  ── walks the JSON tree, replaces {variables}
        │            inside widget settings with AI/row content
        ▼
publish-pages  ── sends elementor_meta.elementor_data (native JSON)
        ▼
WordPressConnector ── POST /wp/v2/pages with
        │            _elementor_data, _elementor_edit_mode=builder,
        │            _elementor_template_type=wp-page, _elementor_version
        ▼
Native, editable Elementor page on the target site
```

## 1. Database — store original Elementor JSON
Add to `public.templates`:
- `elementor_data jsonb` — the original Elementor `content` array (the page structure).
- `template_kind text default 'html'` — `'elementor'` for native JSON templates.
- `elementor_page_template text` — optional WP page template slug (e.g. `elementor_canvas`, `elementor_header_footer`).

Marketplace import (`marketplace-versioning` / template import) carries these fields through so imported Elementor templates keep their JSON.

## 2. Variable replacement in JSON
New util `deepReplaceElementorVariables(json, values)`:
- Recursively walks `elements[].elements[].settings`.
- For every string setting value (titles, editor HTML, button text, image `url`/`alt`, links), replace `{variable}` placeholders using the same spintax/variable resolver already used for HTML.
- Detect Elementor `__dynamic__` settings blocks; where a placeholder maps to AI content, bake the resolved value into the static setting and strip the matching `__dynamic__` entry so the page is self-contained and editable. (Note: true server-side Elementor dynamic tags require ACF/JetEngine on the target site and aren't portable — so AI content is baked into widget settings, which keeps the design and full Elementor editability.)
- Image widgets whose `url` still holds an unresolved/placeholder value get the AI-generated image URL (reusing existing image-fill logic).

## 3. publish-pages — native path
- When the campaign/template `template_kind === 'elementor'`:
  - Load `elementor_data`, run `deepReplaceElementorVariables` per generated row.
  - Pass `elementor_meta.elementor_data = JSON.stringify(resolved)`, `page_template = elementor_page_template`.
  - **Skip** `buildElementorData` / `buildElementorHtmlWidget` / HTML adaptation entirely.
- HTML templates: per your choice, the publish flow now routes everything Elementor-native; remaining HTML templates publish content normally but Elementor wrapping for them is removed (no HTML→widget conversion).

## 4. Marketplace — add Elementor templates
- Extend the marketplace template type with `elementorData` + `kind: 'elementor'`.
- Add a small set of curated Elementor JSON templates and surface them in `TemplateMarketplacePage`.
- Importing one writes `elementor_data` + `template_kind='elementor'` into `templates`.

## 5. UI for pasting/uploading JSON
- In the template creation/edit dialog, add an "Elementor JSON" mode: paste or upload an Elementor export (`.json`). Validate it parses and contains a `content`/`elements` array, store into `elementor_data`, auto-extract `{variables}` found in the JSON into `variables`.

## Technical notes
- Files: `supabase/migrations/*` (schema), `supabase/functions/_shared/elementor-vars.ts` (new resolver, shared), `supabase/functions/publish-pages/index.ts` (native branch), `supabase/functions/_shared/connectors/wordpress.ts` (already supports native `_elementor_data`), template create/edit dialog, `TemplateMarketplacePage`, marketplace data + `marketplace-versioning.ts`.
- The connector already emits the correct Elementor post meta, so no WordPress-side plugin beyond Elementor itself is required.
