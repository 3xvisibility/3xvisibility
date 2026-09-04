ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS pdf_storage_path text,
  ADD COLUMN IF NOT EXISTS pdf_signed_url text,
  ADD COLUMN IF NOT EXISTS pdf_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS pdf_sent_to text;