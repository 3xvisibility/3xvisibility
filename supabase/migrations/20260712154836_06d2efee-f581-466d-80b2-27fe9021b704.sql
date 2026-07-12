ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS design_mode text NOT NULL DEFAULT 'fresh';

ALTER TABLE public.campaigns
  ADD CONSTRAINT campaigns_design_mode_check
  CHECK (design_mode IN ('replicate', 'fresh'));