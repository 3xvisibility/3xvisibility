
-- =============================================
-- US5: Enforce workspace-scoped data isolation
-- =============================================

-- 1) indexing_requests: switch from user_id to workspace-scoped
DROP POLICY IF EXISTS "Users can view own indexing requests" ON public.indexing_requests;
DROP POLICY IF EXISTS "Users can insert own indexing requests" ON public.indexing_requests;
DROP POLICY IF EXISTS "Users can update own indexing requests" ON public.indexing_requests;
DROP POLICY IF EXISTS "Users can delete own indexing requests" ON public.indexing_requests;

CREATE POLICY "Members can view workspace indexing requests"
  ON public.indexing_requests FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can insert workspace indexing requests"
  ON public.indexing_requests FOR INSERT TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = user_id);

CREATE POLICY "Members can update workspace indexing requests"
  ON public.indexing_requests FOR UPDATE TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can delete workspace indexing requests"
  ON public.indexing_requests FOR DELETE TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

-- 2) store_generations: switch from user_id to workspace-scoped
DROP POLICY IF EXISTS "Users can view own store generations" ON public.store_generations;
DROP POLICY IF EXISTS "Users can insert own store generations" ON public.store_generations;
DROP POLICY IF EXISTS "Users can update own store generations" ON public.store_generations;
DROP POLICY IF EXISTS "Users can delete own store generations" ON public.store_generations;

CREATE POLICY "Members can view workspace store generations"
  ON public.store_generations FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can insert workspace store generations"
  ON public.store_generations FOR INSERT TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = user_id);

CREATE POLICY "Members can update workspace store generations"
  ON public.store_generations FOR UPDATE TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can delete workspace store generations"
  ON public.store_generations FOR DELETE TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

-- 3) sitemaps: switch from user_id to workspace-scoped
DROP POLICY IF EXISTS "Users can view own sitemaps" ON public.sitemaps;
DROP POLICY IF EXISTS "Users can insert own sitemaps" ON public.sitemaps;
DROP POLICY IF EXISTS "Users can update own sitemaps" ON public.sitemaps;
DROP POLICY IF EXISTS "Users can delete own sitemaps" ON public.sitemaps;

CREATE POLICY "Members can view workspace sitemaps"
  ON public.sitemaps FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can insert workspace sitemaps"
  ON public.sitemaps FOR INSERT TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = user_id);

CREATE POLICY "Members can update workspace sitemaps"
  ON public.sitemaps FOR UPDATE TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can delete workspace sitemaps"
  ON public.sitemaps FOR DELETE TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

-- 4) internal_links: switch from campaign-subquery to workspace-scoped
DROP POLICY IF EXISTS "Users view own internal links" ON public.internal_links;

CREATE POLICY "Members can manage workspace internal links"
  ON public.internal_links FOR ALL TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

-- 5) internal_link_settings: switch from user_id to workspace-scoped
DROP POLICY IF EXISTS "Users manage own internal link settings" ON public.internal_link_settings;

CREATE POLICY "Members can manage workspace internal link settings"
  ON public.internal_link_settings FOR ALL TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

-- 6) Make workspace_id NOT NULL on all tenant-scoped tables (where it was nullable)
-- First set any NULL workspace_ids to a placeholder (these rows would be inaccessible anyway)
-- Then add NOT NULL constraints via validation triggers

-- Create a validation trigger function for workspace_id
CREATE OR REPLACE FUNCTION public.validate_workspace_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.workspace_id IS NULL THEN
    RAISE EXCEPTION 'workspace_id is required for tenant isolation';
  END IF;
  RETURN NEW;
END;
$$;

-- Apply trigger to all tenant-scoped tables
CREATE TRIGGER enforce_workspace_id_indexing_requests
  BEFORE INSERT OR UPDATE ON public.indexing_requests
  FOR EACH ROW EXECUTE FUNCTION validate_workspace_id();

CREATE TRIGGER enforce_workspace_id_store_generations
  BEFORE INSERT OR UPDATE ON public.store_generations
  FOR EACH ROW EXECUTE FUNCTION validate_workspace_id();

CREATE TRIGGER enforce_workspace_id_sitemaps
  BEFORE INSERT OR UPDATE ON public.sitemaps
  FOR EACH ROW EXECUTE FUNCTION validate_workspace_id();

CREATE TRIGGER enforce_workspace_id_internal_links
  BEFORE INSERT OR UPDATE ON public.internal_links
  FOR EACH ROW EXECUTE FUNCTION validate_workspace_id();

CREATE TRIGGER enforce_workspace_id_internal_link_settings
  BEFORE INSERT OR UPDATE ON public.internal_link_settings
  FOR EACH ROW EXECUTE FUNCTION validate_workspace_id();

CREATE TRIGGER enforce_workspace_id_campaigns
  BEFORE INSERT OR UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION validate_workspace_id();

CREATE TRIGGER enforce_workspace_id_templates
  BEFORE INSERT OR UPDATE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION validate_workspace_id();

CREATE TRIGGER enforce_workspace_id_websites
  BEFORE INSERT OR UPDATE ON public.websites
  FOR EACH ROW EXECUTE FUNCTION validate_workspace_id();

CREATE TRIGGER enforce_workspace_id_generated_pages
  BEFORE INSERT OR UPDATE ON public.generated_pages
  FOR EACH ROW EXECUTE FUNCTION validate_workspace_id();

CREATE TRIGGER enforce_workspace_id_data_sources
  BEFORE INSERT OR UPDATE ON public.data_sources
  FOR EACH ROW EXECUTE FUNCTION validate_workspace_id();

CREATE TRIGGER enforce_workspace_id_mappings
  BEFORE INSERT OR UPDATE ON public.mappings
  FOR EACH ROW EXECUTE FUNCTION validate_workspace_id();

CREATE TRIGGER enforce_workspace_id_generation_jobs
  BEFORE INSERT OR UPDATE ON public.generation_jobs
  FOR EACH ROW EXECUTE FUNCTION validate_workspace_id();

CREATE TRIGGER enforce_workspace_id_ab_tests
  BEFORE INSERT OR UPDATE ON public.ab_tests
  FOR EACH ROW EXECUTE FUNCTION validate_workspace_id();

CREATE TRIGGER enforce_workspace_id_campaign_logs
  BEFORE INSERT OR UPDATE ON public.campaign_logs
  FOR EACH ROW EXECUTE FUNCTION validate_workspace_id();

CREATE TRIGGER enforce_workspace_id_page_metrics
  BEFORE INSERT OR UPDATE ON public.page_metrics
  FOR EACH ROW EXECUTE FUNCTION validate_workspace_id();

CREATE TRIGGER enforce_workspace_id_webhook_endpoints
  BEFORE INSERT OR UPDATE ON public.webhook_endpoints
  FOR EACH ROW EXECUTE FUNCTION validate_workspace_id();

CREATE TRIGGER enforce_workspace_id_audit_logs
  BEFORE INSERT OR UPDATE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION validate_workspace_id();

CREATE TRIGGER enforce_workspace_id_campaign_csv_files
  BEFORE INSERT OR UPDATE ON public.campaign_csv_files
  FOR EACH ROW EXECUTE FUNCTION validate_workspace_id();
