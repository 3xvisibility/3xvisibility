CREATE TABLE IF NOT EXISTS public.page_assets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hash text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('css','js')),
  content text NOT NULL,
  workspace_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hash, kind)
);

GRANT ALL ON public.page_assets TO service_role;

ALTER TABLE public.page_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages page assets"
  ON public.page_assets FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);