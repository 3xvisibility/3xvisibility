ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS elementor_data jsonb,
  ADD COLUMN IF NOT EXISTS template_kind text NOT NULL DEFAULT 'html',
  ADD COLUMN IF NOT EXISTS elementor_page_template text;