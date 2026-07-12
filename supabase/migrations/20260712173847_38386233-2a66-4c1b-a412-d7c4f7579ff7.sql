ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS keyword_source text,
  ADD COLUMN IF NOT EXISTS keyword_source_details jsonb;

ALTER TABLE public.generated_pages
  ADD COLUMN IF NOT EXISTS keyword_source text,
  ADD COLUMN IF NOT EXISTS keyword_source_details jsonb;