ALTER TABLE public.generated_pages
  ADD COLUMN IF NOT EXISTS seo_scores jsonb,
  ADD COLUMN IF NOT EXISTS seo_findings jsonb,
  ADD COLUMN IF NOT EXISTS seo_grade text,
  ADD COLUMN IF NOT EXISTS seo_analyzed_at timestamptz;

CREATE INDEX IF NOT EXISTS generated_pages_seo_grade_idx ON public.generated_pages (seo_grade);