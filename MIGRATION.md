# Migration Guide — Lovable Cloud → Your Own Supabase

Ei guide ta follow korle tomar full project (structure + data + functions + secrets)
tomar **own Supabase project** e correctly transfer hobe. CSV import single-handedly
enough noy — structure (SQL migrations) age chalate hobe, tarpor data.

---

## ⚠️ Important: keno CSV import alone kaj kore na

CSV te sudhu row data thake. Ei gula CSV te **ase na**:
- Primary keys, foreign keys, default values
- RLS policies (data unprotected hoye jabe)
- Database functions & triggers
- Enums / custom types
- Table create order (FK violation error hoy)

Tai order ei rokom: **(1) SQL migrations → (2) CSV data → (3) storage → (4) functions → (5) secrets**.

---

## Step 0 — New Supabase project

1. https://supabase.com → New project (region + strong DB password rakho).
2. Project ready hole `Project URL` + `anon key` + `service_role key` note koro.
3. CLI install: `npm i -g supabase` (ba `npx supabase`).

---

## Step 1 — Structure (SQL migrations) — SOBCHEYE JORURI

Ei project e **129 migration file** ache `supabase/migrations/` folder e.
Egula run korle sob table, enum, RLS policy, function, trigger tairi hoye jabe.

### Option A — Supabase CLI (recommended)

```bash
# project root e
supabase login
supabase link --project-ref <YOUR_NEW_PROJECT_REF>
supabase db push
```

`db push` migration folder er sob file **timestamp order e** apply korbe (correct order automatically).

### Option B — Manual (CLI use korte na parle)

`supabase/migrations/` folder er file gula **filename order e** (purono theke notun,
timestamp ascending) SQL Editor e ekta ekta kore copy-paste kore run koro.
Order ulta korle FK error hobe.

> Tip: file gula already timestamp diye named (`20260318...` age, `20260626...` pore),
> tai naam onujayi upor theke niche run korlei hobe.

---

## Step 2 — Data (CSV import)

Structure hoye gele Cloud theke export kora CSV import koro.
**Parent table age, child (FK) table pore** — noile foreign key error.

Recommended import order (dependency onujayi):

1. `profiles`, `workspaces`, `user_roles`
2. `workspace_members`, `workspace_invitations`
3. `subscriptions`, `ai_credits`, `ai_credits_usage`, `user_ai_access`
4. `websites`, `shopify_connections`, `data_sources`
5. `templates`, `template_versions`, `template_ratings`, `shared_templates`, `marketplace_templates`, `elementor_templates`
6. `campaigns`, `campaign_csv_files`, `campaign_logs`
7. `generated_pages`, `page_versions`, `page_metrics`, `page_improvements`, `generation_jobs`
8. `locations`, `pgp_keywords`, `mappings`, `mapping_profiles`, `internal_links`, `internal_link_settings`
9. baki table gula (logs, notifications, affiliate_*, indexing_requests, sitemaps, ityadi)

Import korar somoy:
- CSV te **id** column ke **Primary key** hishebe tick koro (tomar screenshot e eita missing chilo).
- Existing/duplicate table thakle age purata clear koro (`TRUNCATE ... CASCADE`), noile duplicate.

Full table list (58): ab_tests, affiliate_clicks, affiliate_links, affiliate_payouts,
affiliate_referrals, ai_credit_gate_logs, ai_credits, ai_credits_usage, audit_logs,
campaign_csv_files, campaign_logs, campaigns, contact_submissions, data_sources,
elementor_templates, email_send_log, email_send_state, email_unsubscribe_tokens,
generated_pages, generation_jobs, indexing_requests, internal_link_settings,
internal_links, locations, mapping_profiles, mappings, marketplace_templates,
notifications, page_improvements, page_metrics, page_render_checks, page_versions,
pgp_keywords, profiles, referral_reward_settings, shared_templates, shopify_connections,
shopify_field_mappings, shopify_oauth_states, shopify_sync_events, sitemaps,
store_generations, subscriptions, suppressed_emails, system_settings,
template_backfill_items, template_backfill_page_items, template_backfill_runs,
template_ratings, template_versions, templates, user_ai_access, user_roles,
webhook_endpoints, websites, workspace_invitations, workspace_members, workspaces.

---

## Step 3 — Storage buckets

1 ta bucket ache:

| Bucket | Public |
|--------|--------|
| `ai-images` | ✅ public |

New project e: Storage → New bucket → name `ai-images` → Public on.
(Ba Step 1 er migration ei automatically create hoye jay — INSERT INTO storage.buckets ache.)
Purono file gula lagle Cloud storage theke download kore new bucket e upload koro.

---

## Step 4 — Edge Functions (70+ functions)

Sob function `supabase/functions/` e ache. CLI diye deploy:

```bash
supabase functions deploy --project-ref <YOUR_NEW_PROJECT_REF>
```

`supabase/config.toml` er `verify_jwt` settings gula also copy hobe (already file e ache).

---

## Step 5 — Secrets (function env vars)

Function gula ei secret gula use kore. New project e set koro:
`supabase secrets set KEY=value` (ba Dashboard → Edge Functions → Secrets).

**Auto-provided by Supabase (set korte hobe na):**
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

**Tomake nijer set korte hobe:**
- `LOVABLE_API_KEY` — Lovable AI Gateway (nijer own account hole notun key lagbe; Cloud chara ei feature nijer key/provider diye replace korte hote pare)
- `AI_PROVIDER` — active AI provider (e.g. `lovable`, `openai`, `gemini`, `groq`, `deepseek`)
- `OPENAI_API_KEY` / `GEMINI_API_KEY` / `GROQ_API_KEY` / `DEEPSEEK_API_KEY` — je provider use korbe
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — billing
- `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET` — Shopify OAuth
- `RENDER_SERVICE_URL`, `RENDER_SERVICE_KEY` — render service (thakle)
- `SCREENSHOTONE_ACCESS_KEY` — screenshot service (thakle)
- `LOVABLE_SEND_URL` — email send (thakle)

> Note: `SUPABASE_SERVICE_ROLE_KEY` ar DB password Lovable Cloud e accessible na — new
> own project e egula tomar Supabase dashboard theke pabe.

---

## Step 6 — Frontend `.env` update

New app project e `.env` update koro:

```
VITE_SUPABASE_URL="https://<YOUR_NEW_REF>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<YOUR_NEW_ANON_KEY>"
VITE_SUPABASE_PROJECT_ID="<YOUR_NEW_REF>"
```

Client automatically ei env use kore (`src/integrations/supabase/client.ts`).

---

## Step 7 — Auth settings

Supabase dashboard → Authentication e set koro (migration e ase na):
- Site URL + redirect URLs (tomar domain)
- Email templates (chaile)
- Google/social provider enable + client id/secret

---

## Final checklist

- [ ] Migrations pushed (`supabase db push`) — sob table + RLS ache
- [ ] CSV data imported in correct order, id = primary key
- [ ] `ai-images` bucket exists
- [ ] Edge functions deployed
- [ ] Secrets set
- [ ] Frontend `.env` new project e point kore
- [ ] Auth URLs + providers configured
- [ ] Login kore ekta test page generate kore verify korlam

---

## "Future update auto hobe" — ki way ache

- **Ei Lovable project e** kaj korle change gula **Lovable Cloud** e jay, tomar own
  Supabase te noy. Duita alada backend.
- Own Supabase te future update auto pete hole: **new Lovable project (Cloud disabled)**
  + **GitHub** + **own Supabase** connect kore kaj koro. Tokhon prottek change GitHub e
  push hobe ar migration/function gula tomar own Supabase te apply korte parba
  (`supabase db push` / `functions deploy`, chaile GitHub Action diye auto).
