
ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS source_marketplace_id text,
  ADD COLUMN IF NOT EXISTS source_version text,
  ADD COLUMN IF NOT EXISTS source_imported_at timestamptz;

CREATE INDEX IF NOT EXISTS templates_source_marketplace_id_idx
  ON public.templates (source_marketplace_id)
  WHERE source_marketplace_id IS NOT NULL;
