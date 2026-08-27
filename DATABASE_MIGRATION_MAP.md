# DATABASE MIGRATION MAP — 3xVisibility

Source: Lovable Cloud Supabase (project ref `qmuxdkxdrxevlnckssuw`)
Target: your own Supabase project
Backup in hand: `xxxvisibilty_260827.backup` (PostgreSQL custom format)

> This document is an **audit map only**. Nothing here modifies the current
> production database or the application. The backup already contains the full
> `public` schema — do **not** recreate tables by hand.

---

## 0. Restore order (high level)

```
1. Create empty target Supabase project
2. Restore roles/extension prerequisites  → see SUPABASE_SETUP.sql (§A)
3. pg_restore the custom backup (schema + data)
4. Apply SUPABASE_SETUP.sql (§B..§F) — only objects pg_restore cannot carry
5. Deploy Edge Functions      → EDGE_FUNCTION_MIGRATION_GUIDE.md
6. Set secrets / env          → ENV_MIGRATION_GUIDE.md
7. Configure Auth             → AUTH_MIGRATION_GUIDE.md
8. Recreate buckets + policies→ STORAGE_MIGRATION_GUIDE.md
9. Switch frontend .env last  → ENV_MIGRATION_GUIDE.md §4
```

Restore command (no drops, no clean):

```bash
pg_restore \
  --no-owner --no-privileges --no-comments \
  --schema=public \
  --dbname "postgresql://postgres:<PW>@db.<NEW_REF>.supabase.co:5432/postgres" \
  xxxvisibilty_260827.backup
```

`--no-owner --no-privileges` avoids referencing Lovable Cloud roles. GRANTs are
re-applied explicitly in `SUPABASE_SETUP.sql` §C.

---

## 1. Every database table used by the application

64 tables in `public`. All have RLS **enabled**.

| # | Table | Used by frontend | Used by Edge Functions |
|---|-------|:---:|:---:|
| 1 | ab_tests | – | – |
| 2 | affiliate_clicks | – | ✅ |
| 3 | affiliate_links | ✅ | ✅ |
| 4 | affiliate_payouts | ✅ | – |
| 5 | affiliate_referrals | ✅ | ✅ |
| 6 | ai_credit_gate_logs | – | ✅ |
| 7 | ai_credits | ✅ | ✅ |
| 8 | ai_credits_usage | – | ✅ |
| 9 | ai_provider_keys | – | ✅ |
| 10 | audit_logs | ✅ | ✅ |
| 11 | campaign_csv_files | ✅ | ✅ |
| 12 | campaign_logs | ✅ | ✅ |
| 13 | campaigns | ✅ | ✅ |
| 14 | contact_submissions | ✅ | – |
| 15 | data_sources | ✅ | – |
| 16 | elementor_templates | ✅ | ✅ |
| 17 | email_send_log | – | ✅ |
| 18 | email_send_state | – | ✅ |
| 19 | email_unsubscribe_tokens | – | ✅ |
| 20 | generated_pages | ✅ | ✅ |
| 21 | generation_jobs | ✅ | ✅ |
| 22 | indexing_requests | ✅ | ✅ |
| 23 | internal_link_settings | ✅ | ✅ |
| 24 | internal_links | ✅ | ✅ |
| 25 | invoices | ✅ | ✅ |
| 26 | locations | ✅ | ✅ |
| 27 | mapping_profiles | ✅ | – |
| 28 | mappings | ✅ | ✅ |
| 29 | marketplace_templates | ✅ | – |
| 30 | notifications | ✅ | ✅ |
| 31 | page_assets | ✅ | ✅ |
| 32 | page_improvements | ✅ | – |
| 33 | page_metrics | ✅ | – |
| 34 | page_render_checks | ✅ | ✅ |
| 35 | page_versions | ✅ | ✅ |
| 36 | pgp_keyword_groups | ✅ | – |
| 37 | pgp_keywords | ✅ | – |
| 38 | profiles | ✅ | ✅ |
| 39 | referral_reward_settings | ✅ | ✅ |
| 40 | seo_apply_verifications | ✅ | – |
| 41 | shared_templates | ✅ | – |
| 42 | shopify_connections | via safe view | ✅ |
| 43 | shopify_field_mappings | ✅ | ✅ |
| 44 | shopify_oauth_states | – | ✅ |
| 45 | shopify_sync_events | – | ✅ |
| 46 | site_index_events | ✅ | ✅ |
| 47 | sitemaps | ✅ | ✅ |
| 48 | store_generations | – | – |
| 49 | subscriptions | ✅ | ✅ |
| 50 | suppressed_emails | – | ✅ |
| 51 | system_settings | – | ✅ |
| 52 | template_backfill_items | ✅ | ✅ |
| 53 | template_backfill_page_items | ✅ | ✅ |
| 54 | template_backfill_runs | ✅ | ✅ |
| 55 | template_ratings | ✅ | – |
| 56 | template_versions | ✅ | – |
| 57 | templates | ✅ | ✅ |
| 58 | user_ai_access | – | ✅ |
| 59 | user_roles | – | ✅ |
| 60 | webhook_endpoints | ✅ | ✅ |
| 61 | websites | ✅ | ✅ |
| 62 | workspace_invitations | – | ✅ |
| 63 | workspace_members | ✅ | ✅ |
| 64 | workspaces | ✅ | ✅ |

### 1a. Views (must exist — frontend depends on them)

| View | Consumer |
|------|----------|
| `shopify_connections_safe` | frontend (`shopify_connections` secret columns are revoked from clients) |
| `user_page_counts` | Edge Functions (usage/limits) |

### 1b. Referenced but optional

`app_config` (edge `_shared/config.ts` runtime overrides) and `ai_usage_log` are
read with graceful failure. If they are absent in the backup they can stay absent.

---

## 2. Frontend-required tables

Everything marked ✅ in column "Used by frontend" above, plus the view
`shopify_connections_safe`. Frontend access is exclusively through PostgREST, so
each of these needs both a **GRANT** and a matching **RLS policy** in the target.

## 3. Edge-Function-required tables

Everything marked ✅ in "Used by Edge Functions". These are accessed with the
`service_role` key and bypass RLS, but still require `GRANT ALL … TO service_role`.

---

## 4. Every RPC function called from code

| RPC | Called from |
|-----|-------------|
| `deduct_ai_credits` | Edge Functions (all AI calls) |
| `get_campaign_csv_window` | frontend (CSV preview paging) |
| `get_location_meta` | frontend (location selectors) |
| `get_workspace_role` | frontend + edge |
| `has_role` | frontend + edge (admin gating) |
| `is_workspace_member` | frontend + edge + storage policies |
| `log_security_event` | frontend (audit) |
| `next_invoice_number` | edge (stripe-webhook / invoices) |
| `enqueue_email`, `read_email_batch`, `delete_email`, `move_to_dlq` | edge (email queue via pgmq) |

All RPCs must be **EXECUTE-granted** — see `SUPABASE_SETUP.sql` §D.

## 5. Every database function

`pg_restore` recreates all `public` functions. Full list (excluding the
`pg_trgm` C-functions, which come from the extension, not the backup):

`campaign_limit_for_plan`, `can_access_realtime_topic`,
`clamp_elementor_container_width`, `current_verified_email`,
`deduct_ai_credits`, `delete_email`, `enforce_campaign_limit`,
`enforce_template_limit`, `enqueue_email`, `get_campaign_csv_window`,
`get_location_meta`, `get_shopify_access_token`, `get_template_rating_stats`,
`get_workspace_role`, `handle_new_user`, `handle_new_user_workspace`,
`has_role`, `is_workspace_member`, `log_security_event`, `move_to_dlq`,
`next_invoice_number`, `read_email_batch`, `template_limit_for_plan`,
`update_updated_at_column`, `validate_workspace_id`.

Extension-provided (recreate the extension, not the functions):
`pg_trgm` → `similarity`, `show_trgm`, `word_similarity*`, `gtrgm_*`, `gin_*`.

## 6. Every trigger

### 6a. `auth.users` triggers — **NOT in the backup** (auth schema excluded)

| Trigger | Function |
|---------|----------|
| `on_auth_user_created` | `handle_new_user()` — seeds profiles, subscriptions, user_roles |
| `on_auth_user_created_workspace` | `handle_new_user_workspace()` — seeds workspace + owner membership |

➡ Recreated in `SUPABASE_SETUP.sql` §E. Without these, **new signups break**.

### 6b. `public` triggers (restored by pg_restore)

- `validate_workspace_id()` BEFORE INSERT/UPDATE on: ab_tests, audit_logs,
  campaign_csv_files, campaign_logs, campaigns, data_sources, generated_pages,
  generation_jobs, indexing_requests, internal_link_settings, internal_links,
  mappings, page_metrics, page_render_checks, shopify_field_mappings, sitemaps,
  store_generations, templates, webhook_endpoints, websites.
- `update_updated_at_column()` BEFORE UPDATE on: ai_credits, campaigns,
  contact_submissions, elementor_templates, invoices, marketplace_templates,
  page_render_checks, pgp_keyword_groups, pgp_keywords, profiles,
  referral_reward_settings, shopify_connections, shopify_field_mappings,
  subscriptions, system_settings, template_backfill_items,
  template_backfill_page_items, template_backfill_runs, templates,
  user_ai_access, websites.
- `enforce_campaign_limit()` on campaigns INSERT.
- `enforce_template_limit()` on templates INSERT.
- `clamp_elementor_container_width()` on workspaces INSERT/UPDATE.

## 7. Every RLS policy

**179 policies across 64 tables**, all restored by `pg_restore`. Per-table counts
(command coverage in brackets):

```
ab_tests 4 [D,I,S,U]            affiliate_clicks 1 [S]
affiliate_links 4 [D,I,S,U]     affiliate_payouts 2 [I,S]
affiliate_referrals 1 [S]       ai_credit_gate_logs 1 [S]
ai_credits 1 [S]                ai_credits_usage 1 [S]
ai_provider_keys 1 [ALL]        audit_logs 2 [I,S]
campaign_csv_files 3 [D,I,S]    campaign_logs 2 [I,S]
campaigns 4 [D,I,S,U]           contact_submissions 4 [D,I,S,U]
data_sources 1 [ALL]            elementor_templates 1 [S]
email_send_log 4 [I,S,S,U]      email_send_state 1 [ALL]
email_unsubscribe_tokens 3      generated_pages 4 [D,I,S,U]
generation_jobs 1 [ALL]         indexing_requests 4 [D,I,S,U]
internal_link_settings 1 [ALL]  internal_links 1 [ALL]
invoices 3 [S,S,U]              locations 1 [S]
mapping_profiles 4              mappings 1 [ALL]
marketplace_templates 4         notifications 4
page_assets 1 [ALL]             page_improvements 2 [I,S]
page_metrics 3 [I,S,U]          page_render_checks 1 [ALL]
page_versions 3 [D,I,S]         pgp_keyword_groups 4
pgp_keywords 4                  profiles 5
referral_reward_settings 4      seo_apply_verifications 2
shared_templates 7              shopify_connections 4
shopify_field_mappings 4        shopify_oauth_states 1 [ALL]
shopify_sync_events 2 [D,S]     site_index_events 3
sitemaps 4                      store_generations 4
subscriptions 1 [S]             suppressed_emails 3
system_settings 3 [I,S,U]       template_backfill_items 2
template_backfill_page_items 2  template_backfill_runs 2
template_ratings 4              template_versions 3
templates 4                     user_ai_access 2
user_roles 4                    webhook_endpoints 4
websites 4                      workspace_invitations 7
workspace_members 4             workspaces 3
```

**Verify after restore:**

```sql
select count(*) from pg_policies where schemaname='public';   -- expect 179
select tablename from pg_tables t where schemaname='public'
  and not (select relrowsecurity from pg_class c
           where c.oid = format('%I.%I',t.schemaname,t.tablename)::regclass);
-- expect 0 rows
```

## 8–9. Storage buckets and policies

See `STORAGE_MIGRATION_GUIDE.md` (buckets and `storage.objects` policies are
**not** in a `--schema=public` backup).

## 10. Edge Functions

See `EDGE_FUNCTION_MIGRATION_GUIDE.md` (78 functions + `_shared`).

## 11–13. Env / Auth / Storage dependencies

See `ENV_MIGRATION_GUIDE.md`, `AUTH_MIGRATION_GUIDE.md`,
`STORAGE_MIGRATION_GUIDE.md`.

## 14. Hardcoded Supabase URL / project ID

| Location | Value | Action |
|----------|-------|--------|
| `.env` → `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PROJECT_ID` | current ref | replace at cut-over (last step) |
| `supabase/config.toml` → `project_id` | legacy ref `djknwurjbaltbbchfoss` | set to your new ref before `supabase functions deploy` |
| `supabase/functions/_shared/email-templates/_layout.tsx` | project-ref asset URL | update to new ref |
| `supabase/functions/_shared/transactional-email-templates/_layout.tsx` | project-ref asset URL | update to new ref |
| `src/pages/MigrateToSupabasePage.tsx` | ref shown as documentation text | informational only |

Everything else resolves through `src/lib/config.ts` (frontend) and
`supabase/functions/_shared/config.ts` (edge) — no other hardcoding.

## 15. Lovable Cloud dependencies

See `LOVEABLE_CLOUD_DEPENDENCIES.md`.

---

## Extensions required in the target project

`pg_trgm` (schema `public`), `pgcrypto`, `uuid-ossp`, `pg_net` (schema
`extensions`), `pg_cron`, `pgmq`, `supabase_vault`. Enable **before**
`pg_restore` — see `SUPABASE_SETUP.sql` §A.

## Enums

`app_role`, `campaign_status`, `campaign_type`, `generation_job_status`,
`indexing_status`, `page_status`, `website_status`, `website_type`,
`workspace_role` — all restored by `pg_restore`.

## Realtime publication (NOT in the backup)

`supabase_realtime` must include: `ai_credits`, `campaigns`, `generated_pages`,
`generation_jobs`, `indexing_requests`, `notifications`, `store_generations`.
Re-added in `SUPABASE_SETUP.sql` §F. Seven frontend modules subscribe to these
channels; without the publication, live progress bars silently stop updating.

## pgmq queues (NOT in a public-schema backup)

`q_auth_emails`, `q_transactional_emails` and their `*_dlq` counterparts.
Recreated in `SUPABASE_SETUP.sql` §B.

---

## Post-restore verification checklist

- [ ] 64 tables in `public`, RLS on all of them
- [ ] 179 policies
- [ ] 2 views present (`shopify_connections_safe`, `user_page_counts`)
- [ ] 9 enums present
- [ ] 25 project functions present
- [ ] 2 `auth.users` triggers created manually
- [ ] 4 pgmq queues present
- [ ] realtime publication has the 7 tables
- [ ] `select * from shopify_connections_safe limit 1` works as `authenticated`
- [ ] a test signup creates rows in profiles + subscriptions + user_roles + workspaces
