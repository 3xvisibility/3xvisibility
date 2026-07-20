
CREATE TABLE public.pgp_keyword_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
  language TEXT NOT NULL DEFAULT 'en',
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX pgp_keyword_groups_workspace_idx ON public.pgp_keyword_groups(workspace_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pgp_keyword_groups TO authenticated;
GRANT ALL ON public.pgp_keyword_groups TO service_role;

ALTER TABLE public.pgp_keyword_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view keyword groups"
  ON public.pgp_keyword_groups FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can insert keyword groups"
  ON public.pgp_keyword_groups FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND user_id = auth.uid());

CREATE POLICY "Workspace members can update keyword groups"
  ON public.pgp_keyword_groups FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can delete keyword groups"
  ON public.pgp_keyword_groups FOR DELETE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE TRIGGER pgp_keyword_groups_updated_at
  BEFORE UPDATE ON public.pgp_keyword_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
