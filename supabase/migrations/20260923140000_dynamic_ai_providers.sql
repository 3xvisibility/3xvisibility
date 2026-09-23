ALTER TABLE public.ai_provider_keys ADD COLUMN IF NOT EXISTS base_url TEXT;
ALTER TABLE public.ai_provider_keys ADD COLUMN IF NOT EXISTS provider_name TEXT;
ALTER TABLE public.ai_provider_keys ADD COLUMN IF NOT EXISTS models JSONB DEFAULT '[]'::jsonb;

UPDATE public.ai_provider_keys SET provider_name = provider WHERE provider_name IS NULL;