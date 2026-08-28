-- 0. Realtime tables need a replica identity before rows can be removed
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT table_name FROM information_schema.tables
           WHERE table_schema='public' AND table_type='BASE TABLE'
  LOOP
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', r.table_name);
  END LOOP;
END $$;

-- 1. Remove exact duplicate rows created by repeated restores (keep one physical row per id)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT t.table_name FROM information_schema.tables t
    WHERE t.table_schema='public' AND t.table_type='BASE TABLE'
      AND EXISTS (SELECT 1 FROM information_schema.columns c
                  WHERE c.table_schema='public' AND c.table_name=t.table_name AND c.column_name='id')
  LOOP
    EXECUTE format(
      'DELETE FROM public.%I a USING public.%I b WHERE a.ctid > b.ctid AND a.id = b.id', r.table_name, r.table_name);
  END LOOP;
END $$;

-- 2. Collapse ai_credits to one row per user (keep the row that carries real usage)
DELETE FROM public.ai_credits a
USING public.ai_credits b
WHERE a.user_id = b.user_id
  AND a.id <> b.id
  AND (a.used_credits, a.created_at, a.id) <
      (b.used_credits, b.created_at, b.id);

-- 3. Primary keys
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT t.table_name FROM information_schema.tables t
    WHERE t.table_schema='public' AND t.table_type='BASE TABLE'
      AND EXISTS (SELECT 1 FROM information_schema.columns c
                  WHERE c.table_schema='public' AND c.table_name=t.table_name AND c.column_name='id')
      AND NOT EXISTS (SELECT 1 FROM pg_constraint pc
                      JOIN pg_class cl ON cl.oid=pc.conrelid
                      JOIN pg_namespace n ON n.oid=cl.relnamespace
                      WHERE n.nspname='public' AND cl.relname=t.table_name AND pc.contype='p')
  LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN id SET NOT NULL', r.table_name);
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I PRIMARY KEY (id)', r.table_name, r.table_name||'_pkey');
  END LOOP;
END $$;

ALTER TABLE public.ai_provider_keys ADD CONSTRAINT ai_provider_keys_pkey PRIMARY KEY (provider);

-- 3b. Restore default replica identity now that primary keys exist
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT table_name FROM information_schema.tables
           WHERE table_schema='public' AND table_type='BASE TABLE'
  LOOP
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY DEFAULT', r.table_name);
  END LOOP;
END $$;

-- 4. Uniqueness rules the application upserts depend on
CREATE UNIQUE INDEX IF NOT EXISTS ai_credits_user_id_key ON public.ai_credits(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_key ON public.profiles(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_id_key ON public.subscriptions(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS user_ai_access_user_id_key ON public.user_ai_access(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_id_role_key ON public.user_roles(user_id, role);
CREATE UNIQUE INDEX IF NOT EXISTS workspace_members_ws_user_key ON public.workspace_members(workspace_id, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS elementor_templates_source_key ON public.elementor_templates(source_template_id);
CREATE UNIQUE INDEX IF NOT EXISTS page_assets_hash_kind_key ON public.page_assets(hash, kind);
CREATE UNIQUE INDEX IF NOT EXISTS shopify_connections_user_shop_key ON public.shopify_connections(user_id, shop_domain);
CREATE UNIQUE INDEX IF NOT EXISTS email_unsubscribe_tokens_email_key ON public.email_unsubscribe_tokens(lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS suppressed_emails_email_key ON public.suppressed_emails(lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS workspaces_slug_key ON public.workspaces(slug);

-- 5. Foreign keys (NOT VALID: existing rows are accepted, nothing is deleted now)
DO $$
DECLARE
  m text[][] := ARRAY[
    ARRAY['workspace_id','workspaces'],
    ARRAY['campaign_id','campaigns'],
    ARRAY['website_id','websites'],
    ARRAY['template_id','templates'],
    ARRAY['source_template_id','templates'],
    ARRAY['page_id','generated_pages'],
    ARRAY['shared_template_id','shared_templates'],
    ARRAY['group_id','pgp_keyword_groups'],
    ARRAY['keyword_group_id','pgp_keyword_groups'],
    ARRAY['run_id','template_backfill_runs'],
    ARRAY['job_id','generation_jobs'],
    ARRAY['affiliate_link_id','affiliate_links'],
    ARRAY['invoice_id','invoices'],
    ARRAY['data_source_id','data_sources'],
    ARRAY['sitemap_id','sitemaps'],
    ARRAY['ab_test_id','ab_tests'],
    ARRAY['version_id','template_versions']
  ];
  i int; col text; tgt text; r record; cname text; act text;
BEGIN
  FOR i IN 1..array_length(m,1) LOOP
    col := m[i][1]; tgt := m[i][2];
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=tgt) THEN
      CONTINUE;
    END IF;
    FOR r IN
      SELECT c.table_name, c.is_nullable
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_schema='public' AND t.table_name=c.table_name AND t.table_type='BASE TABLE'
      WHERE c.table_schema='public' AND c.column_name=col AND c.data_type='uuid' AND c.table_name <> tgt
    LOOP
      cname := left(r.table_name||'_'||col||'_fkey', 63);
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname=cname) THEN CONTINUE; END IF;
      act := CASE WHEN r.is_nullable='YES' THEN 'SET NULL' ELSE 'CASCADE' END;
      BEGIN
        EXECUTE format(
          'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.%I(id) ON DELETE %s NOT VALID',
          r.table_name, cname, col, tgt, act);
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'skip fk %.% -> %: %', r.table_name, col, tgt, SQLERRM;
      END;
    END LOOP;
  END LOOP;
END $$;

-- 6. Lookup indexes on foreign-key / filter columns
DO $$
DECLARE r record; iname text;
BEGIN
  FOR r IN
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema='public' AND t.table_name=c.table_name AND t.table_type='BASE TABLE'
    WHERE c.table_schema='public'
      AND (c.column_name LIKE '%\_id' OR c.column_name IN ('slug','status','created_at'))
      AND c.column_name <> 'id'
  LOOP
    iname := left('idx_'||r.table_name||'_'||r.column_name, 63);
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname=iname) THEN CONTINUE; END IF;
    BEGIN
      EXECUTE format('CREATE INDEX %I ON public.%I (%I)', iname, r.table_name, r.column_name);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'skip index %.%: %', r.table_name, r.column_name, SQLERRM;
    END;
  END LOOP;
END $$;
