
-- Upgrade key tables to workspace-scoped RLS policies for proper multi-tenancy

-- CAMPAIGNS: Replace user-scoped with workspace-scoped
DROP POLICY IF EXISTS "Users can view own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can insert own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can update own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can delete own campaigns" ON public.campaigns;

CREATE POLICY "Members can view workspace campaigns" ON public.campaigns
  FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can insert workspace campaigns" ON public.campaigns
  FOR INSERT WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = user_id);
CREATE POLICY "Members can update workspace campaigns" ON public.campaigns
  FOR UPDATE USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can delete workspace campaigns" ON public.campaigns
  FOR DELETE USING (is_workspace_member(auth.uid(), workspace_id));

-- TEMPLATES: Replace user-scoped with workspace-scoped
DROP POLICY IF EXISTS "Users can view own templates" ON public.templates;
DROP POLICY IF EXISTS "Users can insert own templates" ON public.templates;
DROP POLICY IF EXISTS "Users can update own templates" ON public.templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON public.templates;

CREATE POLICY "Members can view workspace templates" ON public.templates
  FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can insert workspace templates" ON public.templates
  FOR INSERT WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = user_id);
CREATE POLICY "Members can update workspace templates" ON public.templates
  FOR UPDATE USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can delete workspace templates" ON public.templates
  FOR DELETE USING (is_workspace_member(auth.uid(), workspace_id));

-- GENERATED_PAGES: Replace user-scoped with workspace-scoped
DROP POLICY IF EXISTS "Users can view own pages" ON public.generated_pages;
DROP POLICY IF EXISTS "Users can insert own pages" ON public.generated_pages;
DROP POLICY IF EXISTS "Users can update own pages" ON public.generated_pages;
DROP POLICY IF EXISTS "Users can delete own pages" ON public.generated_pages;

CREATE POLICY "Members can view workspace pages" ON public.generated_pages
  FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can insert workspace pages" ON public.generated_pages
  FOR INSERT WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = user_id);
CREATE POLICY "Members can update workspace pages" ON public.generated_pages
  FOR UPDATE USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can delete workspace pages" ON public.generated_pages
  FOR DELETE USING (is_workspace_member(auth.uid(), workspace_id));

-- WEBSITES: Replace user-scoped with workspace-scoped
DROP POLICY IF EXISTS "Users can view own websites" ON public.websites;
DROP POLICY IF EXISTS "Users can insert own websites" ON public.websites;
DROP POLICY IF EXISTS "Users can update own websites" ON public.websites;
DROP POLICY IF EXISTS "Users can delete own websites" ON public.websites;

CREATE POLICY "Members can view workspace websites" ON public.websites
  FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can insert workspace websites" ON public.websites
  FOR INSERT WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = user_id);
CREATE POLICY "Members can update workspace websites" ON public.websites
  FOR UPDATE USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can delete workspace websites" ON public.websites
  FOR DELETE USING (is_workspace_member(auth.uid(), workspace_id));

-- CAMPAIGN_LOGS: Replace user-scoped with workspace-scoped
DROP POLICY IF EXISTS "Users can view own campaign logs" ON public.campaign_logs;
DROP POLICY IF EXISTS "Service can insert campaign logs" ON public.campaign_logs;

CREATE POLICY "Members can view workspace campaign logs" ON public.campaign_logs
  FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can insert workspace campaign logs" ON public.campaign_logs
  FOR INSERT WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = user_id);

-- SUBSCRIPTIONS: Scope to workspace
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;

CREATE POLICY "Members can view workspace subscription" ON public.subscriptions
  FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id));
