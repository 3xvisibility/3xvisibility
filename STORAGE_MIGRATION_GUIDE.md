# STORAGE MIGRATION GUIDE

The `storage` schema is not covered by a `--schema=public` restore, and Supabase
rejects direct SQL writes to `storage.buckets`. Buckets are recreated through
the dashboard/API; **policies** on `storage.objects` are plain SQL.

---

## 1. Buckets in the source project

| Bucket | Public | Purpose | Migrate? |
|--------|:------:|---------|----------|
| `ai-images` | ✅ public | AI-generated images referenced from published pages | **Yes — files too** (live page URLs point here) |
| `page-assets` | ❌ private | inlined CSS/JS/asset payloads per generated page | Yes |
| `render-checks` | ❌ private | publish-fidelity screenshots and render diffs | Optional (regenerated on next check) |
| `database_export_27_08_26` | ❌ private | one-off export snapshot | No — historical artifact |

No file-size limits or MIME restrictions are configured on any bucket.

Create them in the new project (Storage → New bucket) with exactly these names
and public flags. Names must match — they are hardcoded in code paths.

---

## 2. Storage policies (`storage.objects`)

Eight policies exist. Re-apply them with `SUPABASE_SETUP.sql` §G:

**`ai-images`**
- SELECT — public read: `bucket_id = 'ai-images'`
- INSERT — owner folder only: `(storage.foldername(name))[1] = auth.uid()::text`
- UPDATE — same owner-folder check
- DELETE — same owner-folder check

**`render-checks`**
- SELECT / INSERT / UPDATE / DELETE — workspace-scoped:
  `is_workspace_member(auth.uid(), (storage.foldername(name))[1]::uuid)`

> `render-checks` policies depend on `public.is_workspace_member()`, so restore
> the `public` schema **before** applying storage policies.

`page-assets` currently has no client policy — it is written and read only with
the `service_role` key from Edge Functions (`page-asset`, `publish-pages`).

---

## 3. Storage dependencies in code

| Consumer | Bucket | Access |
|----------|--------|--------|
| `src/lib/connectors/page-assets.ts` + publishing UI | `ai-images` | `supabase.storage.from('ai-images')` (client) |
| Edge `ai-generate`, `regenerate-product-image`, `ai-site-builder` | `ai-images` | service role upload + `getPublicUrl` |
| Edge `page-asset`, `publish-pages` | `page-assets` | service role signed URLs |
| Edge `html-fidelity-check`, `visual-validate`, `recheck-editor-readiness` | `render-checks` | service role upload |

Public URLs are derived from `SUPABASE_URL`, so they change shape after the
switch (`https://<NEW_REF>.supabase.co/storage/v1/object/public/ai-images/…`).

---

## 4. Copying the files

```bash
# with supabase CLI (per bucket)
supabase storage cp -r ss://ai-images   ./ai-images   --project-ref <OLD_REF>
supabase storage cp -r ./ai-images   ss://ai-images   --project-ref <NEW_REF>
supabase storage cp -r ss://page-assets ./page-assets --project-ref <OLD_REF>
supabase storage cp -r ./page-assets ss://page-assets --project-ref <NEW_REF>
```

Preserve the folder structure exactly — the first path segment is the
`auth.uid()` (ai-images) or `workspace_id` (render-checks) that the policies
check.

### Rewriting old public URLs

Rows in `generated_pages`, `templates`, `page_versions` and
`marketplace_templates` may embed absolute `…<OLD_REF>.supabase.co/storage/…`
URLs. After the file copy, run a **non-destructive** update on the new project
only (template provided as a comment in `SUPABASE_SETUP.sql` §H — run manually
after you have verified the file copy).

---

## 5. Verification

- [ ] 4 (or 3) buckets exist with matching names and public flags
- [ ] 8 storage policies present: `select count(*) from pg_policies where schemaname='storage';`
- [ ] Anonymous GET on an `ai-images` public URL returns 200
- [ ] Authenticated user can upload to `ai-images/<their-uid>/…` and **cannot** to another uid folder
- [ ] A render check writes to `render-checks/<workspace_id>/…`
- [ ] A published page renders its images from the new project's URLs
