
-- Table to track improvement history per page
CREATE TABLE public.page_improvements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.generated_pages(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  field TEXT NOT NULL,
  score_before INTEGER,
  score_after INTEGER,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.page_improvements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace improvements"
  ON public.page_improvements FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can insert workspace improvements"
  ON public.page_improvements FOR INSERT TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = user_id);

CREATE INDEX idx_page_improvements_page ON public.page_improvements(page_id);
CREATE INDEX idx_page_improvements_workspace ON public.page_improvements(workspace_id);
