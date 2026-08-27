-- =============================================================================
-- SUPABASE_SETUP.sql — 3xVisibility
--
-- RUN ON THE **NEW / TARGET** SUPABASE PROJECT ONLY.
-- Never run this against the current Lovable Cloud production project.
--
-- Scope: ONLY objects that a `pg_restore` of xxxvisibilty_260827.backup
-- cannot safely bring over. Tables, columns, indexes, enums, RLS policies on
-- public tables, public functions and public triggers all come from the
-- backup and are deliberately NOT recreated here.
--
-- This file contains NO DROP statements and NO destructive operations.
-- Every statement is idempotent (IF NOT EXISTS / OR REPLACE / guarded DO).
-- =============================================================================


-- =============================================================================
-- SECTION A — EXTENSIONS  (run BEFORE pg_restore)
-- =============================================================================

create schema if not exists extensions;

create extension if not exists pg_trgm        with schema public;
create extension if not exists pgcrypto       with schema extensions;
create extension if not exists "uuid-ossp"    with schema extensions;
create extension if not exists pg_net         with schema extensions;
create extension if not exists pg_stat_statements with schema extensions;
create extension if not exists pg_cron;
create extension if not exists pgmq;
-- supabase_vault is enabled by Supabase automatically.


-- =============================================================================
-- SECTION B — PGMQ QUEUES  (run AFTER pg_restore)
-- Queue tables live in the `pgmq` schema and are not in a public-schema backup.
-- =============================================================================

do $$
begin
  perform pgmq.create('q_auth_emails');
exception when others then null;
end $$;

do $$
begin
  perform pgmq.create('q_auth_emails_dlq');
exception when others then null;
end $$;

do $$
begin
  perform pgmq.create('q_transactional_emails');
exception when others then null;
end $$;

do $$
begin
  perform pgmq.create('q_transactional_emails_dlq');
exception when others then null;
end $$;


-- =============================================================================
-- SECTION C — DATA API GRANTS  (run AFTER pg_restore)
-- pg_restore was run with --no-privileges, so PostgREST roles have no access
-- until these are applied. RLS still governs row visibility.
-- =============================================================================

grant usage on schema public to anon, authenticated, service_role;

-- Baseline: full CRUD for signed-in users, everything for the service role.
do $$
declare t text;
begin
  foreach t in array array[
    'ab_tests','affiliate_clicks','affiliate_links','affiliate_payouts',
    'affiliate_referrals','ai_credit_gate_logs','ai_credits','ai_credits_usage',
    'ai_provider_keys','audit_logs','campaign_csv_files','campaign_logs',
    'campaigns','contact_submissions','data_sources','elementor_templates',
    'email_send_log','email_send_state','email_unsubscribe_tokens',
    'generated_pages','generation_jobs','indexing_requests',
    'internal_link_settings','internal_links','invoices','locations',
    'mapping_profiles','mappings','marketplace_templates','notifications',
    'page_assets','page_improvements','page_metrics','page_render_checks',
    'page_versions','pgp_keyword_groups','pgp_keywords','profiles',
    'referral_reward_settings','seo_apply_verifications','shared_templates',
    'shopify_connections','shopify_field_mappings','shopify_oauth_states',
    'shopify_sync_events','site_index_events','sitemaps','store_generations',
    'subscriptions','suppressed_emails','system_settings',
    'template_backfill_items','template_backfill_page_items',
    'template_backfill_runs','template_ratings','template_versions','templates',
    'user_ai_access','user_roles','webhook_endpoints','websites',
    'workspace_invitations','workspace_members','workspaces'
  ]
  loop
    if to_regclass('public.'||quote_ident(t)) is not null then
      execute format('grant select, insert, update, delete on public.%I to authenticated', t);
      execute format('grant all on public.%I to service_role', t);
    end if;
  end loop;
end $$;

-- Publicly readable reference data (anon).
do $$
declare t text;
begin
  foreach t in array array['locations','elementor_templates','marketplace_templates','shared_templates']
  loop
    if to_regclass('public.'||quote_ident(t)) is not null then
      execute format('grant select on public.%I to anon', t);
    end if;
  end loop;
end $$;

-- Public write surfaces used by unauthenticated flows.
do $$
begin
  if to_regclass('public.contact_submissions') is not null then
    grant insert on public.contact_submissions to anon;
  end if;
  if to_regclass('public.affiliate_clicks') is not null then
    grant insert on public.affiliate_clicks to anon;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- C.1 SENSITIVE COLUMN HARDENING
-- Clients must never read these columns. Re-apply the column-level model:
-- revoke table-wide SELECT, then grant SELECT on the non-secret columns only.
-- Mirrors scripts/security/sensitive-fields.mjs and the security regression test.
-- -----------------------------------------------------------------------------

do $$
declare
  r record;
  cols text;
  spec jsonb := jsonb_build_object(
    'shopify_connections', jsonb_build_array('access_token'),
    'subscriptions',       jsonb_build_array('stripe_customer_id','stripe_subscription_id'),
    'webhook_endpoints',   jsonb_build_array('secret'),
    'websites',            jsonb_build_array('credentials','google_service_account')
  );
  k text;
begin
  for k in select jsonb_object_keys(spec) loop
    if to_regclass('public.'||quote_ident(k)) is null then continue; end if;

    execute format('revoke select on public.%I from anon, authenticated', k);

    select string_agg(quote_ident(column_name), ', ')
      into cols
      from information_schema.columns
     where table_schema = 'public'
       and table_name = k
       and column_name not in (
         select jsonb_array_elements_text(spec -> k)
       );

    if cols is not null then
      execute format('grant select (%s) on public.%I to authenticated', cols, k);
    end if;
  end loop;
end $$;

-- Safe views the frontend reads instead of the hardened base tables.
do $$
begin
  if to_regclass('public.shopify_connections_safe') is not null then
    grant select on public.shopify_connections_safe to authenticated;
  end if;
  if to_regclass('public.user_page_counts') is not null then
    grant select on public.user_page_counts to authenticated, service_role;
  end if;
end $$;


-- =============================================================================
-- SECTION D — FUNCTION EXECUTE GRANTS  (run AFTER pg_restore)
-- RPCs called from the browser must be executable by authenticated (and anon
-- where the flow is public).
-- =============================================================================

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'deduct_ai_credits','get_campaign_csv_window','get_location_meta',
        'get_workspace_role','has_role','is_workspace_member',
        'log_security_event','next_invoice_number','enqueue_email',
        'read_email_batch','delete_email','move_to_dlq',
        'get_shopify_access_token','get_template_rating_stats',
        'can_access_realtime_topic','current_verified_email',
        'campaign_limit_for_plan','template_limit_for_plan'
      )
  loop
    execute format('grant execute on function %s to authenticated, service_role', f.sig);
    if f.proname in ('get_location_meta','get_template_rating_stats') then
      execute format('grant execute on function %s to anon', f.sig);
    end if;
  end loop;
end $$;

-- Server-only helpers: keep them off the client.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname='public'
      and p.proname in ('deduct_ai_credits','get_shopify_access_token',
                        'enqueue_email','read_email_batch','delete_email','move_to_dlq')
  loop
    execute format('revoke execute on function %s from anon', f.sig);
  end loop;
end $$;


-- =============================================================================
-- SECTION E — AUTH TRIGGERS  (run AFTER pg_restore, AFTER any auth data load)
-- The `auth` schema is not part of a public-schema backup, so these two
-- triggers must be recreated or every new signup lands with no profile,
-- no role and no workspace.
-- The functions themselves come from the backup (public schema).
-- =============================================================================

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'on_auth_user_created'
  ) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'on_auth_user_created_workspace'
  ) then
    create trigger on_auth_user_created_workspace
      after insert on auth.users
      for each row execute function public.handle_new_user_workspace();
  end if;
end $$;


-- =============================================================================
-- SECTION F — REALTIME PUBLICATION  (run AFTER pg_restore)
-- Seven tables drive live progress bars, job status and notifications.
-- Publication membership is not carried by a public-schema backup.
-- =============================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'ai_credits','campaigns','generated_pages','generation_jobs',
    'indexing_requests','notifications','store_generations'
  ]
  loop
    if to_regclass('public.'||quote_ident(t)) is not null
       and not exists (
         select 1 from pg_publication_tables
         where pubname='supabase_realtime' and schemaname='public' and tablename=t
       )
    then
      execute format('alter publication supabase_realtime add table public.%I', t);
      execute format('alter table public.%I replica identity full', t);
    end if;
  end loop;
end $$;


-- =============================================================================
-- SECTION G — STORAGE POLICIES  (run AFTER buckets are created in the dashboard)
-- Buckets themselves must be created via the Supabase UI/API:
--   ai-images (public), page-assets (private), render-checks (private)
-- Depends on public.is_workspace_member(), so run after the public restore.
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_policies
                 where schemaname='storage' and tablename='objects'
                   and policyname='Public read access for AI images') then
    create policy "Public read access for AI images"
      on storage.objects for select
      using (bucket_id = 'ai-images');
  end if;

  if not exists (select 1 from pg_policies
                 where schemaname='storage' and tablename='objects'
                   and policyname='Users upload AI images to own folder') then
    create policy "Users upload AI images to own folder"
      on storage.objects for insert to authenticated
      with check (bucket_id = 'ai-images'
                  and (storage.foldername(name))[1] = auth.uid()::text);
  end if;

  if not exists (select 1 from pg_policies
                 where schemaname='storage' and tablename='objects'
                   and policyname='Users update own AI images') then
    create policy "Users update own AI images"
      on storage.objects for update to authenticated
      using (bucket_id = 'ai-images'
             and (storage.foldername(name))[1] = auth.uid()::text);
  end if;

  if not exists (select 1 from pg_policies
                 where schemaname='storage' and tablename='objects'
                   and policyname='Users delete own AI images') then
    create policy "Users delete own AI images"
      on storage.objects for delete to authenticated
      using (bucket_id = 'ai-images'
             and (storage.foldername(name))[1] = auth.uid()::text);
  end if;

  if not exists (select 1 from pg_policies
                 where schemaname='storage' and tablename='objects'
                   and policyname='Workspace members read render-checks') then
    create policy "Workspace members read render-checks"
      on storage.objects for select to authenticated
      using (bucket_id = 'render-checks'
             and public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid));
  end if;

  if not exists (select 1 from pg_policies
                 where schemaname='storage' and tablename='objects'
                   and policyname='Workspace members write render-checks') then
    create policy "Workspace members write render-checks"
      on storage.objects for insert to authenticated
      with check (bucket_id = 'render-checks'
                  and public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid));
  end if;

  if not exists (select 1 from pg_policies
                 where schemaname='storage' and tablename='objects'
                   and policyname='Workspace members update render-checks') then
    create policy "Workspace members update render-checks"
      on storage.objects for update to authenticated
      using (bucket_id = 'render-checks'
             and public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid));
  end if;

  if not exists (select 1 from pg_policies
                 where schemaname='storage' and tablename='objects'
                   and policyname='Workspace members delete render-checks') then
    create policy "Workspace members delete render-checks"
      on storage.objects for delete to authenticated
      using (bucket_id = 'render-checks'
             and public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid));
  end if;
end $$;


-- =============================================================================
-- SECTION H — STORAGE URL REWRITE  (OPTIONAL, COMMENTED OUT ON PURPOSE)
-- Run only after you have verified every storage file was copied across.
-- Review affected rows first; these are content-mutating updates.
-- =============================================================================

-- select count(*) from public.generated_pages
--  where html_content like '%<OLD_REF>.supabase.co/storage/%';
--
-- update public.generated_pages
--    set html_content = replace(html_content,
--        'https://<OLD_REF>.supabase.co/storage/',
--        'https://<NEW_REF>.supabase.co/storage/')
--  where html_content like '%<OLD_REF>.supabase.co/storage/%';
--
-- Repeat for: public.templates, public.page_versions, public.marketplace_templates


-- =============================================================================
-- SECTION I — VERIFICATION  (read-only)
-- =============================================================================

-- Tables + RLS
select count(*) as public_tables from pg_tables where schemaname = 'public';           -- expect 64
select count(*) as policies      from pg_policies where schemaname = 'public';         -- expect 179
select tablename as rls_disabled
  from pg_tables t
 where schemaname = 'public'
   and not (select relrowsecurity from pg_class c
            where c.oid = format('%I.%I', t.schemaname, t.tablename)::regclass);       -- expect 0 rows

-- Views, enums, functions
select table_name from information_schema.views where table_schema = 'public';         -- expect 2
select typname from pg_type t join pg_namespace n on n.oid = t.typnamespace
 where nspname = 'public' and typtype = 'e';                                           -- expect 9

-- Auth triggers
select tgname from pg_trigger
 where tgname in ('on_auth_user_created','on_auth_user_created_workspace');            -- expect 2

-- Realtime
select tablename from pg_publication_tables where pubname = 'supabase_realtime';       -- expect 7

-- Storage
select count(*) as storage_policies from pg_policies where schemaname = 'storage';     -- expect 8
select id, public from storage.buckets order by id;

-- Sensitive columns must NOT be client-readable (expect 0 rows)
select table_name, column_name, grantee
  from information_schema.column_privileges
 where table_schema = 'public'
   and grantee in ('anon','authenticated')
   and privilege_type = 'SELECT'
   and (table_name, column_name) in (
     ('shopify_connections','access_token'),
     ('subscriptions','stripe_customer_id'),
     ('subscriptions','stripe_subscription_id'),
     ('webhook_endpoints','secret'),
     ('websites','credentials'),
     ('websites','google_service_account')
   );
