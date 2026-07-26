ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS ai_provider_design text,
  ADD COLUMN IF NOT EXISTS ai_provider_content text;