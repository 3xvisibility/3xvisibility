CREATE TABLE IF NOT EXISTS public.ai_provider_keys (
  provider TEXT PRIMARY KEY,
  api_key TEXT,
  default_model TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.ai_provider_keys TO service_role;

ALTER TABLE public.ai_provider_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No direct client access to ai provider keys" ON public.ai_provider_keys;
CREATE POLICY "No direct client access to ai provider keys"
ON public.ai_provider_keys FOR ALL TO authenticated
USING (false) WITH CHECK (false);