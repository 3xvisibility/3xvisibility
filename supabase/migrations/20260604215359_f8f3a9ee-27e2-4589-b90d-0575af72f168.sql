
-- campaigns
DROP POLICY "Members can view workspace campaigns" ON public.campaigns;
CREATE POLICY "Members can view workspace campaigns" ON public.campaigns FOR SELECT TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));
DROP POLICY "Members can insert workspace campaigns" ON public.campaigns;
CREATE POLICY "Members can insert workspace campaigns" ON public.campaigns FOR INSERT TO authenticated WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND (auth.uid() = user_id));
DROP POLICY "Members can update workspace campaigns" ON public.campaigns;
CREATE POLICY "Members can update workspace campaigns" ON public.campaigns FOR UPDATE TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));
DROP POLICY "Members can delete workspace campaigns" ON public.campaigns;
CREATE POLICY "Members can delete workspace campaigns" ON public.campaigns FOR DELETE TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));

-- generated_pages
DROP POLICY "Members can view workspace pages" ON public.generated_pages;
CREATE POLICY "Members can view workspace pages" ON public.generated_pages FOR SELECT TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));
DROP POLICY "Members can insert workspace pages" ON public.generated_pages;
CREATE POLICY "Members can insert workspace pages" ON public.generated_pages FOR INSERT TO authenticated WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND (auth.uid() = user_id));
DROP POLICY "Members can update workspace pages" ON public.generated_pages;
CREATE POLICY "Members can update workspace pages" ON public.generated_pages FOR UPDATE TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));
DROP POLICY "Members can delete workspace pages" ON public.generated_pages;
CREATE POLICY "Members can delete workspace pages" ON public.generated_pages FOR DELETE TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));

-- campaign_logs
DROP POLICY "Members can view workspace campaign logs" ON public.campaign_logs;
CREATE POLICY "Members can view workspace campaign logs" ON public.campaign_logs FOR SELECT TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));
DROP POLICY "Members can insert workspace campaign logs" ON public.campaign_logs;
CREATE POLICY "Members can insert workspace campaign logs" ON public.campaign_logs FOR INSERT TO authenticated WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND (auth.uid() = user_id));

-- websites
DROP POLICY "Members can view workspace websites" ON public.websites;
CREATE POLICY "Members can view workspace websites" ON public.websites FOR SELECT TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));
DROP POLICY "Members can insert workspace websites" ON public.websites;
CREATE POLICY "Members can insert workspace websites" ON public.websites FOR INSERT TO authenticated WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND (auth.uid() = user_id));
DROP POLICY "Members can update workspace websites" ON public.websites;
CREATE POLICY "Members can update workspace websites" ON public.websites FOR UPDATE TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));
DROP POLICY "Members can delete workspace websites" ON public.websites;
CREATE POLICY "Members can delete workspace websites" ON public.websites FOR DELETE TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));

-- templates
DROP POLICY "Members can view workspace templates" ON public.templates;
CREATE POLICY "Members can view workspace templates" ON public.templates FOR SELECT TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));
DROP POLICY "Members can insert workspace templates" ON public.templates;
CREATE POLICY "Members can insert workspace templates" ON public.templates FOR INSERT TO authenticated WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND (auth.uid() = user_id));
DROP POLICY "Members can update workspace templates" ON public.templates;
CREATE POLICY "Members can update workspace templates" ON public.templates FOR UPDATE TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));
DROP POLICY "Members can delete workspace templates" ON public.templates;
CREATE POLICY "Members can delete workspace templates" ON public.templates FOR DELETE TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));

-- subscriptions
DROP POLICY "Members can view workspace subscription" ON public.subscriptions;
CREATE POLICY "Members can view workspace subscription" ON public.subscriptions FOR SELECT TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));
