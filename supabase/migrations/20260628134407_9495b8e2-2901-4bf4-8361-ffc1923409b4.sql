ALTER TABLE public.page_render_checks
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS baseline_source text,
  ADD COLUMN IF NOT EXISTS target_source text,
  ADD COLUMN IF NOT EXISTS threshold numeric NOT NULL DEFAULT 0.98,
  ADD COLUMN IF NOT EXISTS overridden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS baseline_path text,
  ADD COLUMN IF NOT EXISTS target_path text,
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS meta jsonb NOT NULL DEFAULT '{}'::jsonb;