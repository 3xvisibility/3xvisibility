
-- A/B tests table for comparing template variants
CREATE TABLE public.ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
  variant_a_content TEXT NOT NULL,
  variant_b_content TEXT NOT NULL,
  variant_a_label TEXT NOT NULL DEFAULT 'Variant A',
  variant_b_label TEXT NOT NULL DEFAULT 'Variant B',
  variant_a_pages INTEGER NOT NULL DEFAULT 0,
  variant_b_pages INTEGER NOT NULL DEFAULT 0,
  variant_a_published INTEGER NOT NULL DEFAULT 0,
  variant_b_published INTEGER NOT NULL DEFAULT 0,
  variant_a_failed INTEGER NOT NULL DEFAULT 0,
  variant_b_failed INTEGER NOT NULL DEFAULT 0,
  winner TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace ab_tests"
  ON public.ab_tests FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can insert workspace ab_tests"
  ON public.ab_tests FOR INSERT TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = user_id);

CREATE POLICY "Members can update workspace ab_tests"
  ON public.ab_tests FOR UPDATE TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can delete workspace ab_tests"
  ON public.ab_tests FOR DELETE TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));
