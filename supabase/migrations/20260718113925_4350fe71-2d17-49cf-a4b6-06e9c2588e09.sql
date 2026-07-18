
CREATE TABLE public.seo_apply_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  website_id UUID,
  page_id TEXT NOT NULL,
  page_slug TEXT,
  page_url TEXT,
  page_type TEXT,
  expected JSONB NOT NULL DEFAULT '{}'::jsonb,
  live JSONB NOT NULL DEFAULT '{}'::jsonb,
  matches JSONB NOT NULL DEFAULT '{}'::jsonb,
  attempts INTEGER NOT NULL DEFAULT 0,
  verified_all BOOLEAN NOT NULL DEFAULT false,
  force_republish BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_seo_apply_verifications_page ON public.seo_apply_verifications (workspace_id, page_id, created_at DESC);
CREATE INDEX idx_seo_apply_verifications_website ON public.seo_apply_verifications (website_id, created_at DESC);

GRANT SELECT, INSERT ON public.seo_apply_verifications TO authenticated;
GRANT ALL ON public.seo_apply_verifications TO service_role;

ALTER TABLE public.seo_apply_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view verifications"
  ON public.seo_apply_verifications FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can insert verifications"
  ON public.seo_apply_verifications FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_workspace_member(auth.uid(), workspace_id)
  );
