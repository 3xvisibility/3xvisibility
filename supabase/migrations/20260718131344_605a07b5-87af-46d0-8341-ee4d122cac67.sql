
-- Add WITH CHECK to workspace-scoped UPDATE policies to prevent workspace_id reassignment
DROP POLICY "Members can update workspace campaigns" ON public.campaigns;
CREATE POLICY "Members can update workspace campaigns" ON public.campaigns FOR UPDATE USING (is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

DROP POLICY "Members can update workspace pages" ON public.generated_pages;
CREATE POLICY "Members can update workspace pages" ON public.generated_pages FOR UPDATE USING (is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

DROP POLICY "Members can update workspace indexing requests" ON public.indexing_requests;
CREATE POLICY "Members can update workspace indexing requests" ON public.indexing_requests FOR UPDATE USING (is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

DROP POLICY "Members can update workspace mapping profiles" ON public.mapping_profiles;
CREATE POLICY "Members can update workspace mapping profiles" ON public.mapping_profiles FOR UPDATE USING (is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

DROP POLICY "Members can update workspace shopify connections" ON public.shopify_connections;
CREATE POLICY "Members can update workspace shopify connections" ON public.shopify_connections FOR UPDATE USING (is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

DROP POLICY "Members can update workspace shopify mappings" ON public.shopify_field_mappings;
CREATE POLICY "Members can update workspace shopify mappings" ON public.shopify_field_mappings FOR UPDATE USING (is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

DROP POLICY "Members can update workspace sitemaps" ON public.sitemaps;
CREATE POLICY "Members can update workspace sitemaps" ON public.sitemaps FOR UPDATE USING (is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

DROP POLICY "Members can update workspace store generations" ON public.store_generations;
CREATE POLICY "Members can update workspace store generations" ON public.store_generations FOR UPDATE USING (is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

DROP POLICY "Members can update workspace templates" ON public.templates;
CREATE POLICY "Members can update workspace templates" ON public.templates FOR UPDATE USING (is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

DROP POLICY "Members can update workspace webhooks" ON public.webhook_endpoints;
CREATE POLICY "Members can update workspace webhooks" ON public.webhook_endpoints FOR UPDATE USING (is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

DROP POLICY "Members can update workspace websites" ON public.websites;
CREATE POLICY "Members can update workspace websites" ON public.websites FOR UPDATE USING (is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

DROP POLICY "Admins can update marketplace templates" ON public.marketplace_templates;
CREATE POLICY "Admins can update marketplace templates" ON public.marketplace_templates FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY "Users can update own shared templates" ON public.shared_templates;
CREATE POLICY "Users can update own shared templates" ON public.shared_templates FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
