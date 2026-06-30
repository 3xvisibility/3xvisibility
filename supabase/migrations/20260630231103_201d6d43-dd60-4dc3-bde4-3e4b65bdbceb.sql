CREATE TABLE public.template_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  version_number integer NOT NULL DEFAULT 1,
  name text NOT NULL,
  content text NOT NULL DEFAULT '',
  elementor_data jsonb,
  seo_title_pattern text DEFAULT '',
  seo_description_pattern text DEFAULT '',
  schema_type text DEFAULT 'WebPage',
  schema_config jsonb DEFAULT '{}'::jsonb,
  template_kind text DEFAULT 'html',
  variables text[] DEFAULT '{}'::text[],
  change_summary text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_versions TO authenticated;
GRANT ALL ON public.template_versions TO service_role;

ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view template versions"
  ON public.template_versions FOR SELECT
  TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can insert template versions"
  ON public.template_versions FOR INSERT
  TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = user_id);

CREATE POLICY "Members can delete template versions"
  ON public.template_versions FOR DELETE
  TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE INDEX idx_template_versions_lookup ON public.template_versions (template_id, version_number DESC);
CREATE INDEX idx_template_versions_workspace ON public.template_versions (workspace_id);