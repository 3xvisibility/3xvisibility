CREATE TABLE public.page_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workspace_id UUID,
  website_id UUID,
  external_id TEXT,
  page_id UUID,
  page_type TEXT,
  title TEXT,
  content TEXT,
  slug TEXT,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT[],
  source TEXT NOT NULL DEFAULT 'pre_optimize',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_versions TO authenticated;
GRANT ALL ON public.page_versions TO service_role;

ALTER TABLE public.page_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view page versions"
ON public.page_versions FOR SELECT TO authenticated
USING (workspace_id IS NULL AND user_id = auth.uid() OR public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can insert their own page versions"
ON public.page_versions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own page versions"
ON public.page_versions FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.is_workspace_member(auth.uid(), workspace_id));

CREATE INDEX idx_page_versions_lookup ON public.page_versions (website_id, external_id, created_at DESC);
CREATE INDEX idx_page_versions_workspace ON public.page_versions (workspace_id);