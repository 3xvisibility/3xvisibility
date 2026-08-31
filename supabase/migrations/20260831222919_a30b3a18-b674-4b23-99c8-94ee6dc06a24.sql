-- E-invoicing (Factur-X) compliance tracking on invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS einvoicing_status text NOT NULL DEFAULT 'not_configured',
  ADD COLUMN IF NOT EXISTS einvoicing_pa text,
  ADD COLUMN IF NOT EXISTS einvoicing_url text,
  ADD COLUMN IF NOT EXISTS einvoicing_format text DEFAULT 'factur-x',
  ADD COLUMN IF NOT EXISTS einvoicing_transmitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS einvoicing_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.invoices.einvoicing_status IS 'Compliance status of the structured e-invoice: not_configured, pending, transmitted, delivered, rejected.';

-- E-invoicing admin configuration on system_settings
ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS einvoicing_config jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.system_settings.einvoicing_config IS 'French e-invoicing PA connector config: provider, enabled, webhook_url.';

-- Backfill existing invoices so the legacy rows read as not_configured
UPDATE public.invoices SET einvoicing_status = 'not_configured' WHERE einvoicing_status IS NULL;