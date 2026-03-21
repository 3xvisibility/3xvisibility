
-- Mapping profiles for save & reuse across campaigns
CREATE TABLE public.mapping_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  mappings jsonb NOT NULL DEFAULT '[]',
  transforms jsonb NOT NULL DEFAULT '{}',
  campaign_type text NOT NULL DEFAULT 'seo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mapping_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace mapping profiles"
  ON public.mapping_profiles FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can insert workspace mapping profiles"
  ON public.mapping_profiles FOR INSERT TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = user_id);

CREATE POLICY "Members can update workspace mapping profiles"
  ON public.mapping_profiles FOR UPDATE TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can delete workspace mapping profiles"
  ON public.mapping_profiles FOR DELETE TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));
