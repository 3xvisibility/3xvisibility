DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ab_tests','campaigns','generated_pages','indexing_requests','mapping_profiles','page_metrics','shopify_connections','shopify_field_mappings','sitemaps','store_generations','templates','webhook_endpoints','websites'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', (SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t AND cmd='UPDATE' AND 'public'=ANY(roles) LIMIT 1), t);
    EXECUTE format('CREATE POLICY "Members can update workspace rows" ON public.%I FOR UPDATE TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id))', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Users can update own shared templates" ON public.shared_templates;
CREATE POLICY "Users can update own shared templates" ON public.shared_templates FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update marketplace templates" ON public.marketplace_templates;
CREATE POLICY "Admins can update marketplace templates" ON public.marketplace_templates FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update workspace members" ON public.workspace_members;
CREATE POLICY "Admins can update workspace members" ON public.workspace_members FOR UPDATE TO authenticated
USING (public.get_workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['owner'::workspace_role,'admin'::workspace_role]))
WITH CHECK ((public.get_workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['owner'::workspace_role,'admin'::workspace_role])) AND ((role <> 'owner'::workspace_role) OR (public.get_workspace_role(auth.uid(), workspace_id) = 'owner'::workspace_role)));