ALTER TABLE public.generated_pages
  ADD COLUMN IF NOT EXISTS editor_readiness jsonb;