CREATE TABLE public.page_render_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  generated_page_id UUID,
  template_id UUID,
  score NUMERIC,
  pixel_score NUMERIC,
  structural_score NUMERIC,
  diff_regions JSONB NOT NULL DEFAULT '[]'::jsonb,
  attempt INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  template_screenshot_url TEXT,
  published_screenshot_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_render_checks TO authenticated;
GRANT ALL ON public.page_render_checks TO service_role;

ALTER TABLE public.page_render_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members manage render checks"
ON public.page_render_checks FOR ALL
TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id))
WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE TRIGGER update_page_render_checks_updated_at
BEFORE UPDATE ON public.page_render_checks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER validate_page_render_checks_workspace
BEFORE INSERT OR UPDATE ON public.page_render_checks
FOR EACH ROW EXECUTE FUNCTION public.validate_workspace_id();

CREATE INDEX idx_page_render_checks_workspace ON public.page_render_checks (workspace_id);
CREATE INDEX idx_page_render_checks_page ON public.page_render_checks (generated_page_id);